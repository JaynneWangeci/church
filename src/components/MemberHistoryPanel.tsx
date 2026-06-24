import { Search, Users, Medal, Church } from "lucide-react";

interface MemberHistoryPanelProps {
  result: any;
  name: string;
  onClose: () => void;
  adminRole?: string;
}

export default function MemberHistoryPanel({ result, name, onClose }: MemberHistoryPanelProps) {
  const h = result;

  if (!h) return null;

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

        {/* Member profiles */}
        {h.members?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {h.members.map((m: any) => (
              <span key={m.id} className="rounded-full bg-nobuk-muted px-3 py-1 text-xs font-medium text-nobuk">
                {m.name} &middot; {m.council.replace(/_/g, " ")}{m.gender ? ` · ${m.gender}` : ""}{!m.is_active ? " (inactive)" : ""}
              </span>
            ))}
          </div>
        )}

        {/* All donations — including pending/failed */}
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
