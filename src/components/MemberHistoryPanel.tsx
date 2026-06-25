import { useState } from "react";
import { Search, Users, Medal, Church, Pencil, X, Check } from "lucide-react";

const COUNCIL_LABELS: Record<string, string> = {
  maranatha_fellowship: "Maranatha",
  bethlehem_fellowship: "Bethlehem",
  jerusalem_fellowship: "Jerusalem",
  aefeso_fellowship: "Aefeso",
  galilee_fellowship: "Galilee",
  bethel_fellowship: "Bethel",
  berea_fellowship: "Berea",
  judea_fellowship: "Judea",
  general_member: "General",
};

const COUNCIL_SLUGS = Object.keys(COUNCIL_LABELS);

interface MemberHistoryPanelProps {
  result: any;
  name: string;
  onClose: () => void;
  adminRole?: string;
  token?: string;
  onRefresh?: () => void;
}

export default function MemberHistoryPanel({ result, name, onClose, adminRole, token, onRefresh }: MemberHistoryPanelProps) {
  const h = result;
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCouncil, setEditCouncil] = useState("");
  const [editGender, setEditGender] = useState("");
  const [saving, setSaving] = useState(false);

  if (!h) return null;

  const isAdmin = adminRole === "admin" || adminRole === "super_admin";

  function startEdit(m: any) {
    setEditingMember(m.id);
    setEditName(m.name);
    setEditCouncil(m.council);
    setEditGender(m.gender || "");
  }

  async function saveEdit(id: string) {
    if (!token) return;
    setSaving(true);
    try {
      const body: any = { name: editName, council: editCouncil };
      if (editGender) body.gender = editGender;
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditingMember(null);
        onRefresh?.();
      }
    } catch {}
    setSaving(false);
  }

  return (
    <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-nobuk" />
          <h3 className="text-sm font-bold text-ink">Full History: {name}</h3>
        </div>
        <button onClick={onClose} className="text-xs text-muted hover:text-ink">&times; Close</button>
      </div>

      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-lg border border-gray-100 bg-cream p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Total Donated</p>
            <p className="text-lg font-bold text-green-700 tabular-nums">KES {h.summary.total_donated.toLocaleString("en-KE")}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-cream p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Donations</p>
            <p className="text-lg font-bold text-ink tabular-nums">{h.summary.completed_donations} ok &middot; {h.summary.failed_donations} failed &middot; {h.summary.pending_donations} pending</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-cream p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Total Pledged</p>
            <p className="text-lg font-bold text-nobuk tabular-nums">KES {h.summary.total_pledged.toLocaleString("en-KE")}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-cream p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Pledge Paid</p>
            <p className="text-lg font-bold text-emerald-600 tabular-nums">KES {h.summary.total_paid.toLocaleString("en-KE")}</p>
          </div>
        </div>

        {/* Member profiles — inline editable */}
        {h.members?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {h.members.map((m: any) => (
              <div key={m.id} className="group relative">
                {editingMember === m.id ? (
                  <div className="rounded-xl border border-nobuk/30 bg-blue-50 p-3 space-y-2 min-w-[240px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-nobuk">Edit Member</span>
                      <div className="flex gap-1">
                        <button onClick={() => setEditingMember(null)} className="rounded p-0.5 text-muted hover:text-red-600"><X size={14} /></button>
                        <button onClick={() => saveEdit(m.id)} disabled={saving} className="rounded p-0.5 text-nobuk hover:text-green-700 disabled:opacity-40">
                          {saving ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-nobuk border-t-transparent" /> : <Check size={14} />}
                        </button>
                      </div>
                    </div>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:border-nobuk" />
                    <select value={editCouncil} onChange={e => setEditCouncil(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-nobuk">
                      {COUNCIL_SLUGS.map(s => <option key={s} value={s}>{COUNCIL_LABELS[s] || s.replace(/_/g, " ")}</option>)}
                    </select>
                    <div className="flex gap-2">
                      {["male", "female"].map(g => (
                        <label key={g} className="flex cursor-pointer items-center gap-1 text-xs text-muted">
                          <input type="radio" name="gender" value={g} checked={editGender === g} onChange={() => setEditGender(g)} className="accent-nobuk" />
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </label>
                      ))}
                      <label className="flex cursor-pointer items-center gap-1 text-xs text-muted">
                        <input type="radio" name="gender" value="" checked={editGender === ""} onChange={() => setEditGender("")} className="accent-nobuk" />
                        None
                      </label>
                    </div>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-nobuk-muted px-3 py-1 text-xs font-medium text-nobuk">
                    {m.name} &middot; {COUNCIL_LABELS[m.council] || m.council?.replace(/_/g, " ")}{m.gender ? ` · ${m.gender}` : ""}{!m.is_active ? " (inactive)" : ""}
                    {isAdmin && (
                      <button onClick={() => startEdit(m)} className="ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-nobuk/20">
                        <Pencil size={10} />
                      </button>
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* All donations */}
        {h.donations?.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">
              All Transactions ({h.donations.length}) — <span className="text-green-600">{h.summary.completed_donations} completed</span> &middot; <span className="text-red-600">{h.summary.failed_donations} failed</span> &middot; <span className="text-amber-600">{h.summary.pending_donations} pending/attempted</span>
            </p>
            <div className="max-h-[300px] overflow-y-auto rounded-lg border border-gray-100">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-100">
                    <th className="px-2 py-1.5 font-bold text-muted">Date & Time</th>
                    <th className="px-2 py-1.5 font-bold text-muted">Amount</th>
                    <th className="px-2 py-1.5 font-bold text-muted">Status</th>
                    <th className="px-2 py-1.5 font-bold text-muted">Method</th>
                    <th className="px-2 py-1.5 font-bold text-muted">Receipt</th>
                    <th className="px-2 py-1.5 font-bold text-muted">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {h.donations.map((d: any) => (
                    <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-cream">
                      <td className="px-2 py-1.5 tabular-nums text-muted whitespace-nowrap">
                        {new Date(d.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-2 py-1.5 tabular-nums font-bold text-ink">KES {Number(d.amount).toLocaleString("en-KE")}</td>
                      <td className="px-2 py-1.5">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${
                          d.status === "completed" ? "bg-green-100 text-green-700" :
                          d.status === "failed" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>{d.status}</span>
                      </td>
                      <td className="px-2 py-1.5 capitalize text-muted">{d.method}</td>
                      <td className="px-2 py-1.5 text-muted font-mono">{d.receipt_number || "—"}</td>
                      <td className="px-2 py-1.5 text-muted">{d.phone || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All pledges */}
        {h.pledges?.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">
              Pledges ({h.pledges.length})
            </p>
            <div className="max-h-[250px] overflow-y-auto rounded-lg border border-gray-100">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-100">
                    <th className="px-2 py-1.5 font-bold text-muted">Date</th>
                    <th className="px-2 py-1.5 font-bold text-muted">Amount</th>
                    <th className="px-2 py-1.5 font-bold text-muted">Paid</th>
                    <th className="px-2 py-1.5 font-bold text-muted">Remaining</th>
                    <th className="px-2 py-1.5 font-bold text-muted">Status</th>
                    <th className="px-2 py-1.5 font-bold text-muted">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {h.pledges.map((p: any) => (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-cream">
                      <td className="px-2 py-1.5 tabular-nums text-muted whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-2 py-1.5 tabular-nums font-bold text-ink">KES {Number(p.amount).toLocaleString("en-KE")}</td>
                      <td className="px-2 py-1.5 tabular-nums text-emerald-700 font-semibold">KES {Number(p.paid).toLocaleString("en-KE")}</td>
                      <td className="px-2 py-1.5 tabular-nums text-amber-700 font-semibold">KES {Number(p.remaining).toLocaleString("en-KE")}</td>
                      <td className="px-2 py-1.5 capitalize text-muted">{p.status}</td>
                      <td className="px-2 py-1.5 text-muted">{p.phone || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!h.donations?.length && !h.pledges?.length && (
          <p className="py-4 text-center text-sm text-muted">No records found for this name.</p>
        )}
      </div>
    </div>
  );
}
