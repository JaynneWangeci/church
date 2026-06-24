import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, requireAdminOrAbove, logAudit, maskSensitiveData } from "../lib/admin.js";

export const donationsRouter = Router();

// Resolve donor_name to a church_member_id via case-insensitive name match.
// Returns null if no match found.
async function resolveMemberId(db: any, name: string | null): Promise<string | null> {
  if (!name || name.trim().length < 2) return null;
  const { data } = await db
    .from("church_members")
    .select("id")
    .eq("is_active", true)
    .ilike("name", name.trim());
  return data?.[0]?.id || null;
}

donationsRouter.get("/", async (req, res) => {
  try {
    const db = requireService();
    const { campaign_id, status, limit, offset } = req.query;
    let query = db.from("donations").select("*").order("created_at", { ascending: false });

    if (campaign_id) query = query.eq("campaign_id", campaign_id);
    if (status) query = query.eq("status", status);
    if (limit) query = query.limit(Number(limit));
    if (offset) query = query.range(Number(offset), Number(offset) + 49);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    let donations = data || [];

    if (!admin) {
      donations = donations
        .filter((d: any) => d.status === "completed")
        .map((d: any) => {
          const { phone, checkout_request_id, ...rest } = d;
          return rest;
        });
    } else if (admin.role === "viewer") {
      donations = donations
        .filter((d: any) => d.status === "completed")
        .map((d: any) => maskSensitiveData(d));
    } else if (admin.role === "admin") {
      donations = donations.map((d: any) => maskSensitiveData(d));
    }

    res.json({ donations });
  } catch (err) {
    console.error("donations error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

donationsRouter.post("/", async (req, res) => {
  try {
    const db = requireService();
    const { campaign_id, donor_name, amount, phone, honored_member_id, church_member_id, message, honour_known_as, idempotency_key } = req.body;

    if (!campaign_id || !amount || !phone) {
      return res.status(400).json({ error: "campaign_id, amount, and phone required" });
    }

    if (amount < 10) return res.status(400).json({ error: "Minimum donation is KES 10" });

    // Idempotency: if key provided, check for existing donation
    if (idempotency_key) {
      const { data: existing } = await db
        .from("donations")
        .select("*")
        .eq("idempotency_key", idempotency_key)
        .maybeSingle();

      if (existing) {
        return res.status(200).json({ donation: existing, idempotent: true });
      }
    }

    const normalizedPhone = phone.replace(/^0+/, "254").replace(/^\+/, "");

    // Auto-resolve church_member_id if not provided
    let resolvedMemberId = church_member_id || null;
    if (!resolvedMemberId) {
      resolvedMemberId = await resolveMemberId(db, donor_name);
    }

    const insertData: Record<string, unknown> = {
      campaign_id,
      donor_name: donor_name || null,
      amount: Number(amount),
      method: "mpesa",
      status: "pending",
      phone: normalizedPhone,
      honored_member_id: honored_member_id || null,
      church_member_id: resolvedMemberId,
      message: message || null,
      honour_known_as: honour_known_as || null,
    };
    if (idempotency_key) insertData.idempotency_key = idempotency_key;

    const { data, error } = await db
      .from("donations")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // If unique constraint violation on idempotency_key, try fetching existing
      if (idempotency_key && error.message?.includes("idempotency_key")) {
        const { data: existing } = await db
          .from("donations")
          .select("*")
          .eq("idempotency_key", idempotency_key)
          .maybeSingle();
        if (existing) return res.status(200).json({ donation: existing, idempotent: true });
      }
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json({ donation: data });
  } catch (err) {
    console.error("donation create error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

donationsRouter.get("/lookup/phone/:phone", async (req, res) => {
  try {
    const db = requireService();
    const phone = req.params.phone.replace(/\D/g, "");
    const normalized = phone.startsWith("0") ? "254" + phone.slice(1) : phone.startsWith("254") ? phone : "254" + phone;

    const { data } = await db
      .from("donations")
      .select("donor_name")
      .eq("phone", normalized)
      .not("donor_name", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);

    const name = data?.[0]?.donor_name || null;
    res.json({ name });
  } catch {
    res.json({ name: null });
  }
});

donationsRouter.patch("/:id/status", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { status, receipt_number } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });

    const { data, error } = await db
      .from("donations")
      .update({ status, receipt_number: receipt_number || null })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "update_donation",
      resourceType: "donation",
      resourceId: data.id,
      details: { status },
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    res.json({ donation: data });
  } catch (err) {
    console.error("donation status error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
