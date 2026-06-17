import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

function generateReceiptNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `CHURCH-${y}${m}${d}-${seq}`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const checkoutRequestID =
    body?.Body?.stkCallback?.CheckoutRequestID ||
    body?.CheckoutRequestID;

  const resultCode = body?.Body?.stkCallback?.ResultCode;
  const resultDesc = body?.Body?.stkCallback?.ResultDesc;

  if (!checkoutRequestID) {
    return NextResponse.json({ error: "Missing CheckoutRequestID" }, { status: 400 });
  }

  const { data: donation } = await supabaseService
    .from("donations")
    .select("id, status")
    .eq("checkout_request_id", checkoutRequestID)
    .single();

  if (!donation) {
    const { data: pendingDonation } = await supabaseService
      .from("donations")
      .select("id, status")
      .is("checkout_request_id", null)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!pendingDonation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 });
    }

    await supabaseService
      .from("donations")
      .update({ checkout_request_id: checkoutRequestID })
      .eq("id", pendingDonation.id);

    if (resultCode !== 0) {
      await supabaseService
        .from("donations")
        .update({ status: "failed" })
        .eq("id", pendingDonation.id);

      return NextResponse.json({ message: "Payment failed", resultDesc });
    }

    const receipt = generateReceiptNumber();

    const { data: updated } = await supabaseService
      .from("donations")
      .update({
        status: "completed",
        receipt_number: receipt,
      })
      .eq("id", pendingDonation.id)
      .select()
      .single();

    if (updated) {
      await supabaseService.rpc("increment_campaign_raised", {
        campaign_id: updated.campaign_id,
        amount: updated.amount,
      });
    }

    return NextResponse.json({
      message: "Payment processed",
      receipt_number: receipt,
    });
  }

  if (donation.status !== "pending") {
    return NextResponse.json({ message: "Already processed" });
  }

  if (resultCode !== 0) {
    await supabaseService
      .from("donations")
      .update({ status: "failed" })
      .eq("id", donation.id);

    return NextResponse.json({ message: "Payment failed", resultDesc });
  }

  const receipt = generateReceiptNumber();

  const { data: updated } = await supabaseService
    .from("donations")
    .update({
      status: "completed",
      receipt_number: receipt,
    })
    .eq("id", donation.id)
    .select()
    .single();

  if (updated) {
    await supabaseService.rpc("increment_campaign_raised", {
      campaign_id: updated.campaign_id,
      amount: updated.amount,
    });
  }

  return NextResponse.json({
    message: "Payment processed",
    receipt_number: receipt,
  });
}
