import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, Users, DollarSign, Clock, AlertCircle,
  Download, LogOut, RefreshCw, Shield, UserPlus, Trash2, Medal, Church, Settings, BarChart3, FileSpreadsheet, Search, ScanSearch, ArrowUpRight, ArrowDownRight, PieChart, Target, Save,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePie, Pie, Cell, Legend,
} from "recharts";
import type { DashboardStats, AdminUser, ChurchMember, CommitteeMember, Council } from "../types";
import { fetchCouncils, getCouncilLabel, clearCouncilCache } from "../lib/councils";
import * as pdfjs from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "members" | "admins" | "analytics" | "council" | "pledges" | "fellowshipreports" | "sitecontent">("overview");
  const [churchMembers, setChurchMembers] = useState<ChurchMember[]>([]);
  const [newName, setNewName] = useState("");
  const [newCouncil, setNewCouncil] = useState("maranatha_fellowship");
  const [newGender, setNewGender] = useState("");
  const [memberError, setMemberError] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [bulkCouncil, setBulkCouncil] = useState("maranatha_fellowship");
  const [bulkGender, setBulkGender] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkResult, setBulkResult] = useState("");
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberCouncil, setEditMemberCouncil] = useState("");
  const [editMemberGender, setEditMemberGender] = useState("");
  const [memberCouncilFilter, setMemberCouncilFilter] = useState("");
  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("admin");
  const [adminError, setAdminError] = useState("");
  const [editingAdmin, setEditingAdmin] = useState<AdminUserRecord | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwError, setPwError] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [deduping, setDeduping] = useState(false);
  const [dedupResult, setDedupResult] = useState("");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [analyticsRange, setAnalyticsRange] = useState<"7d" | "30d" | "90d" | "1y" | "all">("30d");
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [newComName, setNewComName] = useState("");
  const [newComRole, setNewComRole] = useState("");
  const [newComCouncil, setNewComCouncil] = useState("maranatha_fellowship");
  const [newComOrder, setNewComOrder] = useState("0");
  const [comError, setComError] = useState("");
  const [councils, setCouncils] = useState<Council[]>([]);
  const [editingCouncil, setEditingCouncil] = useState<Council | null>(null);
  const [editCouncilName, setEditCouncilName] = useState("");
  const [newCouncilSlug, setNewCouncilSlug] = useState("");
  const [newCouncilName, setNewCouncilName] = useState("");
  const [councilMgmtError, setCouncilMgmtError] = useState("");
  const [councilMgmtMsg, setCouncilMgmtMsg] = useState("");
  const [harambeeDate, setHarambeeDate] = useState("2026-09-27");
  const [harambeeDays, setHarambeeDays] = useState(0);
  const [editingHarambeeDate, setEditingHarambeeDate] = useState(false);
  const [editHarambeeDateVal, setEditHarambeeDateVal] = useState("");
  const [editingCom, setEditingCom] = useState<CommitteeMember | null>(null);
  const [editComName, setEditComName] = useState("");
  const [editComRole, setEditComRole] = useState("");
  const [editComCouncil, setEditComCouncil] = useState("");
  const [editComOrder, setEditComOrder] = useState("0");
  const [exporting, setExporting] = useState<string | null>(null);
  const [pledges, setPledges] = useState<any[]>([]);
  const [fellowshipReport, setFellowshipReport] = useState<any>(null);
  const [editingPledge, setEditingPledge] = useState<string | null>(null);
  const [editPledgeAmount, setEditPledgeAmount] = useState("");
  const [payingPledge, setPayingPledge] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payReceipt, setPayReceipt] = useState("");

  const token = localStorage.getItem("token");

  const checkAuth = useCallback(async () => {
    if (!token) { navigate("/admin/login"); return; }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { navigate("/admin/login"); return; }
      const data = await res.json();
      setAdmin(data.admin);
    } catch { navigate("/admin/login"); }
  }, [token, navigate]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchLogs = useCallback(async () => {
    if (admin?.role !== "super_admin") return;
    try {
      const res = await fetch("/api/admin/audit-logs?limit=20");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch { /* silent */ }
  }, [admin?.role]);

  const fetchAdmins = useCallback(async () => {
    if (admin?.role !== "super_admin") return;
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.users || []);
      }
    } catch { /* silent */ }
  }, [admin?.role, token]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDashboardData(await res.json());
    } catch { /* silent */ }
  }, [token]);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/members");
      if (res.ok) {
        const data = await res.json();
        setChurchMembers(data.members || []);
      }
    } catch { /* silent */ }
  }, []);

  const fetchCommittee = useCallback(async () => {
    try {
      const res = await fetch("/api/committee");
      if (res.ok) {
        const data = await res.json();
        setCommitteeMembers(data.members || []);
      }
    } catch { /* silent */ }
  }, []);

  const fetchPledges = useCallback(async () => {
    try {
      const res = await fetch("/api/pledges");
      if (res.ok) {
        const data = await res.json();
        setPledges(data.pledges || []);
      }
    } catch { /* silent */ }
  }, []);

  const fetchFellowshipReport = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/fellowship-report", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFellowshipReport(data);
      }
    } catch { /* silent */ }
  }, []);

  const loadCouncils = useCallback(async () => {
    const data = await fetchCouncils();
    if (data.length) setCouncils(data);
  }, []);

  const loadHarambee = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/harambee");
      if (res.ok) {
        const data = await res.json();
        setHarambeeDate(data.date);
        setHarambeeDays(data.days_remaining);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => {
    if (!admin) return;
    setLoading(false);
    fetchStats();
    fetchLogs();
    fetchMembers();
    fetchAdmins();
    fetchAnalytics();
    fetchCommittee();
    fetchPledges();
    fetchFellowshipReport();
    loadCouncils();
    loadHarambee();
  }, [admin, fetchStats, fetchLogs, fetchMembers, fetchAdmins, fetchAnalytics, fetchCommittee, fetchPledges, fetchFellowshipReport, loadCouncils, loadHarambee]);

  // Live audit log polling
  useEffect(() => {
    if (admin?.role !== "super_admin") return;
    fetchLogs();
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [admin?.role, fetchLogs]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) { setMemberError("Kindly provide the member's name"); return; }
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim().replace(/^\d+[\.\)]?\s*(?:[A-Za-z]\s+)?/, "").replace(/\.+$/, ""), council: newCouncil, gender: newGender || undefined }),
      });
      if (!res.ok) { const d = await res.json(); setMemberError(d.error || "Something went wrong. Please try again."); return; }
      setNewName("");
      setMemberError("");
      fetchMembers();
    } catch { setMemberError("A connection issue occurred. Please try again."); }
  }

  async function handleBulkAdd() {
    const lines = bulkNames.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { setBulkError("Please paste at least one name to add"); return; }
    setBulkError(""); setBulkResult("");

    const parsed = lines.map(parseLine).filter(Boolean) as { name: string; council: string }[];
    if (!parsed.length) { setBulkError("We couldn't identify any names. Use 'Name - Council' or 'Name, Council' format."); return; }

    const existing = new Map(churchMembers.map(m => [m.name.toLowerCase().trim(), m]));
    const toAdd: { name: string; council: string }[] = [];
    const duplicates: string[] = [];

    for (const entry of parsed) {
      if (existing.has(entry.name.toLowerCase())) {
        const dup = existing.get(entry.name.toLowerCase())!;
        duplicates.push(`${entry.name} (already in ${councilLabels[dup.council] || dup.council})`);
      } else {
        toAdd.push(entry);
      }
    }

    toAdd.sort((a, b) => a.name.localeCompare(b.name));

    if (!toAdd.length) {
      setBulkError("All these names are already in our church registry.");
      return;
    }

    const addedNames = new Set<string>();
    const serverDups: string[] = [];
    let added = 0;
    for (const { name, council } of toAdd) {
      try {
        const res = await fetch("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name, council, gender: bulkGender || undefined }),
        });
        if (res.ok) { added++; addedNames.add(name); continue; }
        if (res.status === 409) serverDups.push(`${name} (already in DB)`);
      } catch {}
    }

    const allDups = [...duplicates, ...serverDups];
    const keptLines = parsed.filter(e => !addedNames.has(e.name));
    let msg = `${added} member${added !== 1 ? 's' : ''} added.`;
    if (allDups.length) {
      msg += `\n${allDups.length} duplicate${allDups.length !== 1 ? 's' : ''} skipped:\n${allDups.join('\n')}`;
    }
    setBulkResult(msg);
    setBulkNames(keptLines.length ? keptLines.map(e => e.name).join('\n') : "");
    if (added > 0) fetchMembers();
  }

  function toggleMember(id: string) {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const visible = churchMembers.filter(m => {
      if (memberCouncilFilter && m.council !== memberCouncilFilter) return false;
      if (memberSearch && !m.name.toLowerCase().includes(memberSearch.toLowerCase())) return false;
      return true;
    });
    const allSelected = visible.every(m => selectedMembers.has(m.id));
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (allSelected) {
        visible.forEach(m => next.delete(m.id));
      } else {
        visible.forEach(m => next.add(m.id));
      }
      return next;
    });
  }

  async function deleteMember(id: string) {
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchMembers();
    } catch {}
  }

  async function handleBulkDelete() {
    if (selectedMembers.size === 0) return;
    if (!confirm(`Remove ${selectedMembers.size} member${selectedMembers.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/members/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: Array.from(selectedMembers) }),
      });
      if (res.ok) {
        setSelectedMembers(new Set());
        fetchMembers();
      }
    } catch {}
  }

  async function handleDedup() {
    if (!confirm("Find and remove duplicate member names? This cannot be undone.")) return;
    setDeduping(true);
    setDedupResult("");
    try {
      const res = await fetch("/api/members/dedup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDedupResult(data.message || "Done.");
      if (data.deduped > 0) fetchMembers();
    } catch { setDedupResult("Something went wrong. Please try again."); }
    finally { setDeduping(false); }
  }

  async function handleUpdateMember(id: string) {
    if (!editMemberName.trim()) return;
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editMemberName.trim(), council: editMemberCouncil, gender: editMemberGender || null }),
      });
      if (res.ok) { setEditingMember(null); fetchMembers(); }
    } catch {}
  }

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/admin/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-nobuk border-t-transparent" />
      </div>
    );
  }

  if (!admin) return null;

  const progress = stats ? Math.min(Math.round((stats.raised / stats.goal) * 100), 100) : 0;

  const statCards = [
    { icon: TrendingUp, label: "Total Raised", value: stats ? `KES ${stats.total_raised.toLocaleString()}` : "—" },
    { icon: Users, label: "Total Donors", value: stats?.total_donors?.toLocaleString() || "0" },
    { icon: DollarSign, label: "Average Gift", value: stats ? `KES ${stats.avg_gift.toLocaleString()}` : "—" },
    { icon: Clock, label: "Pending", value: stats?.pending_count?.toString() || "0" },
  ];

  const groupedMembers = churchMembers.reduce((acc, m) => {
    (acc[m.council] = acc[m.council] || []).push(m);
    return acc;
  }, {} as Record<string, ChurchMember[]>);

  const councilLabels: Record<string, string> = {};
  for (const c of councils) councilLabels[c.slug] = c.name;
  if (!councils.length) {
    councilLabels.maranatha_fellowship = "Maranatha Fellowship";
    councilLabels.bethlehem_fellowship = "Bethlehem Fellowship";
    councilLabels.jerusalem_fellowship = "Jerusalem Fellowship";
    councilLabels.aefeso_fellowship = "Aefeso Fellowship";
    councilLabels.general_member = "General Member";
  }

  const labelToCouncil: Record<string, string> = {};
  for (const c of councils) labelToCouncil[c.name.toLowerCase()] = c.slug;
  if (!councils.length) {
    labelToCouncil['maranatha fellowship'] = 'maranatha_fellowship';
    labelToCouncil['bethlehem fellowship'] = 'bethlehem_fellowship';
    labelToCouncil['jerusalem fellowship'] = 'jerusalem_fellowship';
    labelToCouncil['aefeso fellowship'] = 'aefeso_fellowship';
    labelToCouncil['general member'] = 'general_member';
  }

  function parseLine(line: string): { name: string; council: string } | null {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const cleaned = trimmed.replace(/^\d+[\.\)]?\s*(?:[A-Za-z]\s+)?/, "").replace(/\.+$/, "");
    if (!cleaned) return null;
    const match = cleaned.match(/^(.+?)\s*[,|]\s*(.+)$/) || cleaned.match(/^(.+?)\s*-\s*(.+)$/);
    if (match) {
      const name = match[1].trim();
      const councilLabel = match[2].trim().toLowerCase();
      const council = labelToCouncil[councilLabel];
      if (name && council) return { name, council };
    }
    return { name: cleaned, council: bulkCouncil };
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-nobuk">Admin Dashboard</h1>
            <p className="text-xs text-muted">{admin.name} &middot; {admin.role.replace("_", " ")}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { fetchStats(); fetchLogs(); fetchMembers(); fetchAdmins(); fetchAnalytics(); fetchCommittee(); loadCouncils(); loadHarambee(); }} className="rounded-lg p-2 text-muted transition hover:bg-cream" title="Refresh">
              <RefreshCw size={16} />
            </button>
            <a href="/" className="text-sm text-muted underline underline-offset-2 hover:text-nobuk">View Site</a>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-muted transition hover:bg-cream">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Tab navigation */}
        <div className="mb-6 flex flex-wrap gap-4 border-b border-gray-200">
          <button
            onClick={() => setTab("overview")}
            className={`pb-3 text-sm font-bold transition border-b-2 ${
              tab === "overview" ? "border-nobuk text-nobuk" : "border-transparent text-muted hover:text-nobuk"
            }`}
          >
            Overview
          </button>
          {(admin.role === "admin" || admin.role === "super_admin") && (
            <button
              onClick={() => setTab("members")}
              className={`pb-3 text-sm font-bold transition border-b-2 ${
                tab === "members" ? "border-nobuk text-nobuk" : "border-transparent text-muted hover:text-nobuk"
              }`}
            >
              Church Members ({churchMembers.length})
            </button>
          )}
          {admin.role === "super_admin" && (
            <button
              onClick={() => setTab("admins")}
              className={`pb-3 text-sm font-bold transition border-b-2 ${
                tab === "admins" ? "border-nobuk text-nobuk" : "border-transparent text-muted hover:text-nobuk"
              }`}
            >
              Admins ({admins.length})
            </button>
          )}
          {(admin.role === "admin" || admin.role === "super_admin") && (
            <button
              onClick={() => setTab("council")}
              className={`pb-3 text-sm font-bold transition border-b-2 ${
                tab === "council" ? "border-nobuk text-nobuk" : "border-transparent text-muted hover:text-nobuk"
              }`}
            >
              <Users size={14} className="inline mr-1" />
              Fellowship ({committeeMembers.length})
            </button>
          )}
          {(admin.role === "admin" || admin.role === "super_admin") && (
            <button
              onClick={() => setTab("pledges")}
              className={`pb-3 text-sm font-bold transition border-b-2 ${
                tab === "pledges" ? "border-nobuk text-nobuk" : "border-transparent text-muted hover:text-nobuk"
              }`}
            >
              <Target size={14} className="inline mr-1" />
              Pledges ({pledges.length})
            </button>
          )}
          {(admin.role === "admin" || admin.role === "super_admin") && (
            <button
              onClick={() => { setTab("fellowshipreports"); fetchFellowshipReport(); }}
              className={`pb-3 text-sm font-bold transition border-b-2 ${
                tab === "fellowshipreports" ? "border-nobuk text-nobuk" : "border-transparent text-muted hover:text-nobuk"
              }`}
            >
              <Users size={14} className="inline mr-1" />
              Fellowship Reports
            </button>
          )}
          <button
            onClick={() => setTab("analytics")}
            className={`pb-3 text-sm font-bold transition border-b-2 ${
              tab === "analytics" ? "border-nobuk text-nobuk" : "border-transparent text-muted hover:text-nobuk"
            }`}
          >
            <BarChart3 size={14} className="inline mr-1" />
            Analytics
          </button>
          {(admin.role === "admin" || admin.role === "super_admin") && (
            <button
              onClick={() => setTab("sitecontent")}
              className={`pb-3 text-sm font-bold transition border-b-2 ${
                tab === "sitecontent" ? "border-nobuk text-nobuk" : "border-transparent text-muted hover:text-nobuk"
              }`}
            >
              <Settings size={14} className="inline mr-1" />
              Site Content
            </button>
          )}
        </div>

        {tab === "overview" && (
          <>
            <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Fundraising Progress</p>
                  <p className="mt-1 text-2xl font-bold text-ink">
                    KES {stats?.raised?.toLocaleString() || "0"}
                    <span className="text-base font-normal text-muted"> / KES {(stats?.goal || 0).toLocaleString()}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-nobuk">{progress}%</p>
                  {harambeeDays > 0 && (
                    <p className="mt-1 text-xs font-bold text-amber-600">{harambeeDays} days remaining</p>
                  )}
                </div>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-nobuk-muted">
                <div className="h-full rounded-full bg-nobuk transition-all duration-1000" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-nobuk-muted">
                      <Icon size={17} className="text-nobuk" />
                    </div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">{s.label}</p>
                    <p className="mt-1 text-xl font-bold text-ink">{s.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="mb-8 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink">Fellowship Statistics</h2>
                <span className="text-xs text-muted">{stats?.fellowship_stats?.length || 0} fellowships</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 font-bold text-muted">Fellowship</th>
                      <th className="pb-2 font-bold text-muted text-right">Members</th>
                      <th className="pb-2 font-bold text-muted text-right">Donations</th>
                      <th className="pb-2 font-bold text-muted text-right">Total Amount</th>
                      <th className="pb-2 font-bold text-muted text-right">Avg / Member</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.fellowship_stats?.map((f, i) => (
                      <tr key={f.council} className={i < (stats?.fellowship_stats?.length || 0) - 1 ? "border-b border-gray-50" : ""}>
                        <td className="py-2.5 font-medium text-ink capitalize">{f.council.replace(/_/g, " ")}</td>
                        <td className="py-2.5 text-right tabular-nums text-ink">{f.member_count}</td>
                        <td className="py-2.5 text-right tabular-nums text-ink">{f.donation_count}</td>
                        <td className="py-2.5 text-right tabular-nums font-bold text-nobuk">KES {f.total_amount.toLocaleString("en-KE")}</td>
                        <td className="py-2.5 text-right tabular-nums text-muted">KES {f.avg_per_member.toLocaleString("en-KE")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-ink">Recent Donations</h2>
                  <button onClick={async () => {
                    setExporting("xlsx");
                    try {
                      const res = await fetch("/api/contributions/export/xlsx", { headers: { Authorization: `Bearer ${token}` } });
                      if (!res.ok) return;
                      const blob = await res.blob();
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `harambee-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    } catch {}
                    setExporting(null);
                  }} disabled={exporting === "xlsx"} className="flex items-center gap-1 text-xs text-muted hover:text-nobuk disabled:opacity-40">
                    <Download size={12} /> {exporting === "xlsx" ? "..." : "Export XLSX"}
                  </button>
                </div>
                {stats?.recent_donations?.length ? (
                  <div className="space-y-2">
                    {stats.recent_donations.slice(0, 10).map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between rounded-lg bg-cream px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{d.donor_name || "Anonymous"}</p>
                          <p className="text-xs text-muted">{d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}</p>
                          {d.receipt_number && <p className="text-[10px] font-mono text-muted">{d.receipt_number}</p>}
                          {d.phone && <p className="text-[10px] text-muted">{d.phone}</p>}
                        </div>
                        <div className="ml-3 text-right shrink-0">
                          <p className="text-sm font-bold text-ink tabular-nums">KES {Number(d.amount || 0).toLocaleString()}</p>
                          <span className={`text-xs font-semibold ${
                            d.status === "completed" ? "text-green-600" :
                            d.status === "pending" ? "text-amber-600" :
                            "text-red-600"
                          }`}>
                            {(d.status || "unknown").replace("_", " ")}
                          </span>
                          {d.status === "completed" && d.phone && (
                            <button onClick={async () => { await fetch(`/api/mpesa/resend-whatsapp/${d.id}`, { method: "POST" }); }}
                              className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 hover:bg-blue-200">
                              WA
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted">No donations yet</p>}
              </div>

              {admin.role === "super_admin" && (
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Shield size={16} className="text-nobuk" />
                    <h2 className="text-sm font-bold text-ink">Audit Log</h2>
                  </div>
                  {logs.length ? (
                    <div className="space-y-1.5">
                      {(logs as { id: string; action: string; admin_name: string; created_at: string }[]).map((log) => (
                        <div key={log.id} className="flex items-center justify-between rounded-lg bg-cream px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">{log.admin_name}</p>
                            <p className="truncate text-xs text-muted">{log.action.replace(/_/g, " ")}</p>
                          </div>
                          <p className="ml-2 shrink-0 text-xs text-muted">{new Date(log.created_at).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted">No audit logs yet</p>}
                </div>
              )}

              {admin.role !== "super_admin" && (
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertCircle size={16} className="text-nobuk" />
                    <h2 className="text-sm font-bold text-ink">Data Isolation</h2>
                  </div>
                  <p className="text-sm text-muted">
                    Your {admin.role} role restricts you to{" "}
                    {admin.role === "viewer" ? "viewing completed donations only" : "viewing and managing committee members"}.
                    Contact super admin for elevated access.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "members" && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Add member form */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-1">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Add Single Member</h2>
              </div>
              <form onSubmit={addMember} className="space-y-4">
                {memberError && (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{memberError}</div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Fellowship</label>
                  <select value={newCouncil} onChange={(e) => setNewCouncil(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk">
                    {(councils.length ? councils : []).map(c => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Gender</label>
                  <select value={newGender} onChange={(e) => setNewGender(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk">
                    <option value="">Not set</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <button type="submit"
                  className="w-full rounded-lg bg-nobuk py-2.5 text-sm font-bold text-white hover:bg-nobuk-light">
                  Add Member
                </button>
              </form>
            </div>

            {/* Bulk add */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-1">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Bulk Add Members</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Upload PDF with names</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setBulkError("");
                        const buffer = await file.arrayBuffer();
                        const pdf = await pdfjs.getDocument(buffer).promise;
                        const lines: string[] = [];
                        for (let i = 1; i <= pdf.numPages; i++) {
                          const page = await pdf.getPage(i);
                          const content = await page.getTextContent();
                          let lastY = 0;
                          let line = "";
                          for (const item of content.items) {
                            const ty = (item as any).transform?.[5] ?? 0;
                            if (lastY && Math.abs(ty - lastY) > 5) {
                              if (line.trim()) lines.push(line.trim());
                              line = item.str;
                            } else {
                              line += (line ? " " : "") + item.str;
                            }
                            lastY = ty;
                          }
                          if (line.trim()) lines.push(line.trim());
                        }
                        const seen = new Set<string>();
                        const deduped: string[] = [];
                        for (const line of lines) {
                          const sep = line.match(/^([^,|\-]+?)\s*[,|\-]\s*(.+)$/);
                          const name = sep ? sep[1].trim() : line;
                          const nameKey = name.toLowerCase();
                          if (nameKey && !seen.has(nameKey)) {
                            seen.add(nameKey);
                            deduped.push(line);
                          }
                        }
                        setBulkNames(deduped.join("\n"));
                      } catch (err: any) {
                        setBulkError("Failed to read PDF: " + (err?.message || "Invalid file"));
                      }
                      e.target.value = "";
                    }}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk file:mr-3 file:rounded file:border-0 file:bg-nobuk file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-nobuk-light"
                  />
                  <p className="mt-1 text-[10px] text-muted">PDF with one name per line or comma-separated</p>
                  <button onClick={() => { const a = document.createElement("a"); a.href = "/api/members/template"; a.download = "member-template.pdf"; a.click(); }}
                    className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-nobuk hover:underline">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    Download template PDF
                  </button>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Or paste names</label>
                  <textarea value={bulkNames} onChange={(e) => setBulkNames(e.target.value)} rows={5} placeholder={"John Kamau - Maranatha Fellowship\nMary Wambui - Bethlehem Fellowship\nPeter Njoroge\n\nOne per line — optionally add \" - FellowshipName\" or \", FellowshipName\""}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk resize-vertical placeholder:text-muted/50" />
                  <p className="mt-1 text-[10px] text-muted">{bulkNames.trim() ? (bulkNames.trim().split('\n').filter(n => n.trim()).length + " names") : "Paste names above"}</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Fellowship for all</label>
                  <select value={bulkCouncil} onChange={(e) => setBulkCouncil(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk">
                    {(councils.length ? councils : []).map(c => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Gender for all</label>
                  <select value={bulkGender} onChange={(e) => setBulkGender(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk">
                    <option value="">Not set</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                {bulkError && (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{bulkError}</div>
                )}
                {bulkResult && (
                  <div className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-700">{bulkResult}</div>
                )}
                <button onClick={handleBulkAdd} disabled={!bulkNames.trim()}
                  className="w-full rounded-lg bg-nobuk py-2.5 text-sm font-bold text-white hover:bg-nobuk-light disabled:opacity-40">
                  Add {bulkNames.trim() ? bulkNames.trim().split('\n').filter(n => n.trim()).length : 0} Members
                </button>
              </div>
            </div>

            {/* Members list */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-3">
              <div className="mb-4 flex items-center gap-2">
                <Users size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Church Members</h2>
                <button onClick={handleDedup} disabled={deduping}
                  className="ml-auto flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-cream transition disabled:opacity-40">
                  <ScanSearch size={14} /> {deduping ? "Scanning..." : "Find Duplicates"}
                </button>
                <span className="text-xs text-muted">{churchMembers.length} total</span>
              </div>
              {dedupResult && (
                <div className="mb-3 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-700">{dedupResult}</div>
              )}
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-cream py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-nobuk"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
                      <input type="checkbox" checked={churchMembers.length > 0 && churchMembers.filter(m => {
                    if (memberCouncilFilter && m.council !== memberCouncilFilter) return false;
                    if (memberSearch && !m.name.toLowerCase().includes(memberSearch.toLowerCase())) return false;
                    return true;
                  }).every(m => selectedMembers.has(m.id))}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-nobuk focus:ring-nobuk" />
                  All
                </label>
                <select value={memberCouncilFilter} onChange={e => { setMemberCouncilFilter(e.target.value); setSelectedMembers(new Set()); }}
                  className="rounded-lg border border-gray-200 bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-nobuk">
                  <option value="">All Fellowships</option>
                  {councils.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
                {selectedMembers.size > 0 && (
                  <button onClick={handleBulkDelete}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 transition">
                    <Trash2 size={14} /> Delete {selectedMembers.size} selected
                  </button>
                )}
                {memberCouncilFilter && selectedMembers.size === 0 && (
                  <button onClick={async () => {
                    const ids = churchMembers.filter(m => m.council === memberCouncilFilter).map(m => m.id);
                    if (!ids.length) return;
                    if (!confirm(`Delete all ${ids.length} members from this fellowship? This cannot be undone.`)) return;
                    const r = await fetch("/api/members/bulk-delete", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ ids }),
                    });
                    if (r.ok) fetchMembers();
                  }}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 transition">
                    <Trash2 size={14} /> Delete All {memberCouncilFilter.replace(/_/g, " ")} Members
                  </button>
                )}
              </div>
              {churchMembers.length ? (
                <div className="space-y-4">
                  {Object.entries(groupedMembers).map(([council, councilMembers]) => {
                    if (memberCouncilFilter && council !== memberCouncilFilter) return null;
                    const filteredCouncil = memberSearch
                      ? councilMembers.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()))
                      : councilMembers;
                    if (filteredCouncil.length === 0) return null;
                    return (
                      <div key={council}>
                        <div className="mb-2 flex items-center gap-2">
                          <Church size={14} className="text-muted" />
                          <h3 className="text-xs font-bold text-muted uppercase tracking-wider">{councilLabels[council] || council}</h3>
                          <span className="text-[10px] text-muted">{filteredCouncil.length} members</span>
                        </div>
                        <div className="space-y-1">
                          {filteredCouncil.map((m, i) => {
                            const isEditing = editingMember === m.id;
                            return (
                              <div key={m.id} className="rounded-lg bg-cream px-3 py-2">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <input type="text" value={editMemberName}
                                      onChange={e => setEditMemberName(e.target.value)}
                                      className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-ink outline-none focus:border-nobuk" />
                                    <select value={editMemberCouncil}
                                      onChange={e => setEditMemberCouncil(e.target.value)}
                                      className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-ink outline-none focus:border-nobuk">
                                      {councils.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                                    </select>
                                    <select value={editMemberGender}
                                      onChange={e => setEditMemberGender(e.target.value)}
                                      className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-ink outline-none focus:border-nobuk">
                                      <option value="">Gender</option>
                                      <option value="male">Male</option>
                                      <option value="female">Female</option>
                                    </select>
                                    <button onClick={() => handleUpdateMember(m.id)}
                                      className="rounded-md bg-nobuk px-2.5 py-1.5 text-xs font-bold text-white hover:bg-nobuk-light">Save</button>
                                    <button onClick={() => setEditingMember(null)}
                                      className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-bold text-muted hover:bg-gray-100">Cancel</button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <span className="w-5 shrink-0 text-center text-xs font-bold text-muted">{i + 1}.</span>
                                      <input type="checkbox" checked={selectedMembers.has(m.id)}
                                        onChange={() => toggleMember(m.id)}
                                        className="h-4 w-4 shrink-0 rounded border-gray-300 text-nobuk focus:ring-nobuk" />
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nobuk-muted text-xs font-bold text-nobuk">
                                        {m.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-ink truncate">{m.name}</p>
                                      </div>
                                      {m.gender && (
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${m.gender === "male" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                                          {m.gender === "male" ? "M" : "F"}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button onClick={() => { setEditingMember(m.id); setEditMemberName(m.name); setEditMemberCouncil(m.council); setEditMemberGender(m.gender || ""); }}
                                        className="rounded-lg p-1.5 text-muted transition hover:bg-blue-50 hover:text-blue-600" title="Edit">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                      </button>
                                      <button onClick={() => deleteMember(m.id)}
                                        className="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600" title="Delete">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                      })}
                  </div>
              ) : (
                <p className="text-sm text-muted">No members yet. Add your first church member above.</p>
              )}
            </div>
          </div>
        )}

        {tab === "admins" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-nobuk" />
                  <h2 className="text-sm font-bold text-ink">Admin Users</h2>
                </div>
                <button
                  onClick={() => setShowAddAdmin(!showAddAdmin)}
                  className="flex items-center gap-1 rounded-lg bg-nobuk px-3 py-1.5 text-xs font-semibold text-white hover:bg-nobuk-light"
                >
                  <UserPlus size={14} /> Add Admin
                </button>
              </div>

              {showAddAdmin && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-cream p-4">
                  <h3 className="mb-3 text-sm font-bold text-ink">New Admin</h3>
                  {adminError && (
                    <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{adminError}</div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">Name</label>
                      <input type="text" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">Email</label>
                      <input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="admin@church.org"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">Password</label>
                      <input type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="Min 6 chars"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">Role</label>
                      <select value={newAdminRole} onChange={(e) => setNewAdminRole(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk">
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!newAdminName || !newAdminEmail || !newAdminPassword) { setAdminError("Please fill in all fields"); return; }
                      setAdminError("");
                      try {
                        const res = await fetch("/api/admin/admins", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ name: newAdminName, email: newAdminEmail, password: newAdminPassword, role: newAdminRole }),
                        });
                        if (!res.ok) { const d = await res.json(); setAdminError(d.error || "Something went wrong. Please try again."); return; }
                        setNewAdminName(""); setNewAdminEmail(""); setNewAdminPassword(""); setNewAdminRole("admin");
                        setShowAddAdmin(false);
                        fetchAdmins();
                      } catch { setAdminError("A connection issue occurred. Please try again."); }
                    }}
                    className="mt-3 rounded-lg bg-nobuk px-4 py-2 text-xs font-semibold text-white hover:bg-nobuk-light"
                  >
                    Create Admin
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {admins.map((a) => (
                  <div key={a.id} className="rounded-lg border border-gray-100 bg-cream px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-ink">{a.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            a.role === "super_admin"
                              ? "bg-purple-100 text-purple-700"
                              : a.role === "admin"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                          }`}>
                            {a.role.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs text-muted">{a.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingAdmin(editingAdmin?.id === a.id ? null : a);
                            setEditEmail(a.email);
                            setEditName(a.name);
                            setEditRole(a.role);
                          }}
                          className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-white hover:text-nobuk"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete admin "${a.name}"?`)) return;
                            try {
                              await fetch(`/api/admin/users/${a.id}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              fetchAdmins();
                            } catch {}
                          }}
                          className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {editingAdmin?.id === a.id && (
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <div className="grid gap-3 sm:grid-cols-4">
                          <div>
                            <label className="mb-1 block text-xs font-bold text-muted">Name</label>
                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-bold text-muted">Email</label>
                            <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-bold text-muted">Role</label>
                            <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk">
                              <option value="super_admin">Super Admin</option>
                              <option value="admin">Admin</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </div>
                          <div className="flex items-end gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/users/${a.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ name: editName, email: editEmail, role: editRole }),
                                  });
                                  if (res.ok) { setEditingAdmin(null); fetchAdmins(); }
                                } catch {}
                              }}
                              className="rounded-lg bg-nobuk px-3 py-2 text-xs font-semibold text-white hover:bg-nobuk-light"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingAdmin(null)}
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-muted hover:bg-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {admins.length === 0 && (
                  <p className="text-sm text-muted">No admin users found.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Settings size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Change My Password</h2>
              </div>
              {pwError && (
                <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{pwError}</div>
              )}
              {!showChangePw ? (
                <button
                  onClick={() => setShowChangePw(true)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-muted hover:bg-cream"
                >
                  Change Password
                </button>
              ) : (
                <div className="flex gap-3">
                  <input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)}
                    placeholder="Current password"
                    className="w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                  <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)}
                    placeholder="New password (min 6)"
                    className="w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                  <button
                    onClick={async () => {
                      if (!pwCurrent || !pwNew) { setPwError("Please enter both current and new password"); return; }
                      if (pwNew.length < 6) { setPwError("Password must be at least 6 characters"); return; }
                      setPwError("");
                      try {
                        const res = await fetch(`/api/admin/users/${admin!.id}/password`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
                        });
                        if (!res.ok) { const d = await res.json(); setPwError(d.error || "Something went wrong. Please try again."); return; }
                        setPwCurrent(""); setPwNew(""); setShowChangePw(false);
                      } catch { setPwError("A connection issue occurred. Please try again."); }
                    }}
                    className="rounded-lg bg-nobuk px-4 py-2 text-xs font-semibold text-white hover:bg-nobuk-light"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => { setShowChangePw(false); setPwError(""); }}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-muted hover:bg-cream"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "council" && (
          <>
          {/* Manage Councils section */}
          <div className="mb-8 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Manage Fellowships</h2>
              </div>
                <span className="text-xs text-muted">Rename, add, or delete fellowships</span>
            </div>
            {councilMgmtMsg && (
              <div className="mb-3 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-700">{councilMgmtMsg}</div>
            )}
            {councilMgmtError && (
              <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{councilMgmtError}</div>
            )}
            {/* Current councils list */}
            <div className="mb-4 space-y-2">
              {(councils.length ? councils : []).map((c) => (
                <div key={c.slug} className="rounded-lg border border-gray-100 bg-cream px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{c.name}</p>
                      <p className="text-xs text-muted">Slug: {c.slug}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingCouncil(editingCouncil?.slug === c.slug ? null : c);
                          setEditCouncilName(c.name);
                        }}
                        className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-white hover:text-nobuk"
                      >
                        Rename
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete "${c.name}"? Members using this fellowship must be reassigned first.`)) return;
                          setCouncilMgmtError(""); setCouncilMgmtMsg("");
                          try {
                            const res = await fetch(`/api/councils/${c.slug}`, {
                              method: "DELETE",
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            const data = await res.json();
                            if (!res.ok) { setCouncilMgmtError(data.error || "Failed to delete"); return; }
                            setCouncilMgmtMsg(`"${c.name}" deleted.`);
                            clearCouncilCache();
                            loadCouncils();
                            fetchCommittee();
                            fetchMembers();
                          } catch { setCouncilMgmtError("Connection issue"); }
                        }}
                        className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {editingCouncil?.slug === c.slug && (
                    <div className="mt-3 border-t border-gray-200 pt-3 flex items-end gap-3">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-bold text-muted">New Name</label>
                        <input type="text" value={editCouncilName} onChange={(e) => setEditCouncilName(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                      </div>
                      <button
                        onClick={async () => {
                          if (!editCouncilName.trim()) return;
                          setCouncilMgmtError(""); setCouncilMgmtMsg("");
                          try {
                            const res = await fetch(`/api/councils/${c.slug}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ name: editCouncilName.trim() }),
                            });
                            const data = await res.json();
                            if (!res.ok) { setCouncilMgmtError(data.error || "Failed to rename"); return; }
                            setCouncilMgmtMsg(`Renamed to "${data.council.name}".`);
                            setEditingCouncil(null);
                            clearCouncilCache();
                            loadCouncils();
                          } catch { setCouncilMgmtError("Connection issue"); }
                        }}
                        className="rounded-lg bg-nobuk px-3 py-2 text-xs font-semibold text-white hover:bg-nobuk-light"
                      >
                        Save
                      </button>
                      <button onClick={() => setEditingCouncil(null)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-muted hover:bg-white">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Harambee event date */}
            <div className="mb-4 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-ink uppercase tracking-wider">Harambee Event Date</p>
                  <p className="mt-1 text-sm text-muted">
                    {harambeeDate} {harambeeDays > 0 ? `· ${harambeeDays} days remaining` : harambeeDays === 0 ? "· Today!" : "· Passed"}
                  </p>
                </div>
                {!editingHarambeeDate ? (
                  <button onClick={() => { setEditingHarambeeDate(true); setEditHarambeeDateVal(harambeeDate); }}
                    className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-white hover:text-nobuk">
                    Change Date
                  </button>
                ) : (
                  <div className="flex items-end gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">New date</label>
                      <input type="date" value={editHarambeeDateVal} onChange={(e) => setEditHarambeeDateVal(e.target.value)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                    </div>
                    <button onClick={async () => {
                      if (!editHarambeeDateVal) return;
                      try {
                        const res = await fetch("/api/settings", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ harambee_date: editHarambeeDateVal }),
                        });
                        if (res.ok) {
                          setHarambeeDate(editHarambeeDateVal);
                          setEditingHarambeeDate(false);
                          loadHarambee();
                        }
                      } catch {}
                    }}
                      className="rounded-lg bg-nobuk px-3 py-2 text-xs font-semibold text-white hover:bg-nobuk-light">
                      Save
                    </button>
                    <button onClick={() => setEditingHarambeeDate(false)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-muted hover:bg-white">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Add new council */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="mb-3 text-xs font-bold text-ink uppercase tracking-wider">Add New Fellowship</h3>
              <div className="flex items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Slug (auto-generated)</label>
                  <input type="text" value={newCouncilSlug} onChange={(e) => setNewCouncilSlug(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z_]/g, ""))}
                    placeholder="e.g. galileo"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Display Name</label>
                  <input type="text" value={newCouncilName} onChange={(e) => setNewCouncilName(e.target.value)}
                    placeholder="e.g. Galileo"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                </div>
                <button
                  onClick={async () => {
                    if (!newCouncilSlug.trim() || !newCouncilName.trim()) { setCouncilMgmtError("Slug and name are required"); return; }
                    setCouncilMgmtError(""); setCouncilMgmtMsg("");
                    try {
                      const res = await fetch("/api/councils", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ slug: newCouncilSlug.trim(), name: newCouncilName.trim() }),
                      });
                      const data = await res.json();
                      if (!res.ok) { setCouncilMgmtError(data.error || "Failed to add"); return; }
                      setNewCouncilSlug(""); setNewCouncilName("");
                      setCouncilMgmtMsg(`Council "${data.council.name}" added.`);
                      clearCouncilCache();
                      loadCouncils();
                    } catch { setCouncilMgmtError("Connection issue"); }
                  }}
                  className="rounded-lg bg-nobuk px-4 py-2 text-xs font-semibold text-white hover:bg-nobuk-light"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Add committee member form */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-1">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Add Fellowship Member</h2>
              </div>
              <div className="space-y-4">
                {comError && (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{comError}</div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Name</label>
                  <input type="text" value={newComName} onChange={(e) => setNewComName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Role</label>
                  <input type="text" value={newComRole} onChange={(e) => setNewComRole(e.target.value)}
                    placeholder="e.g. Chairman"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Fellowship</label>
                  <select value={newComCouncil} onChange={(e) => setNewComCouncil(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk">
                    {(councils.length ? councils : []).map(c => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Display Order</label>
                  <input type="number" value={newComOrder} onChange={(e) => setNewComOrder(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                </div>
                <button
                  onClick={async () => {
                    if (!newComName.trim() || !newComRole.trim()) { setComError("Name and role are required"); return; }
                    setComError("");
                    try {
                      const res = await fetch("/api/committee", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ name: newComName.trim(), role: newComRole.trim(), council: newComCouncil, order: parseInt(newComOrder) || 0 }),
                      });
                      if (!res.ok) { const d = await res.json(); setComError(d.error || "Failed to add"); return; }
                      setNewComName(""); setNewComRole(""); setNewComCouncil("maranatha_fellowship"); setNewComOrder("0");
                      fetchCommittee();
                    } catch { setComError("Connection issue"); }
                  }}
                  className="w-full rounded-lg bg-nobuk py-2.5 text-sm font-bold text-white hover:bg-nobuk-light">
                  Add Council Member
                </button>
              </div>
            </div>

            {/* Committee members list */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <Users size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Fellowship Leadership</h2>
                <span className="text-xs text-muted">{committeeMembers.length} total</span>
              </div>
              {committeeMembers.length ? (
                <div className="space-y-4">
                  {(["maranatha_fellowship", "bethlehem_fellowship", "jerusalem_fellowship", "aefeso_fellowship", "general_member"] as const).map((council) => {
                    const filtered = committeeMembers.filter(m => m.council === council).sort((a, b) => a.order - b.order);
                    if (filtered.length === 0) return null;
                    return (
                      <div key={council}>
                        <div className="mb-2 flex items-center gap-2">
                          <Church size={14} className="text-muted" />
                          <h3 className="text-xs font-bold text-muted uppercase tracking-wider">{councilLabels[council]}</h3>
                          <span className="text-[10px] text-muted">{filtered.length}</span>
                        </div>
                        <div className="space-y-1">
                          {filtered.map((m) => (
                            <div key={m.id} className="rounded-lg border border-gray-100 bg-cream px-4 py-3">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-nobuk-muted text-xs font-bold text-nobuk">
                                      {m.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-ink">{m.name}</p>
                                      <p className="text-xs text-muted">{m.role} {m.order > 0 && `· #${m.order}`}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-2 shrink-0">
                                  <button
                                    onClick={() => {
                                      setEditingCom(editingCom?.id === m.id ? null : m);
                                      setEditComName(m.name);
                                      setEditComRole(m.role);
                                      setEditComCouncil(m.council);
                                      setEditComOrder(String(m.order));
                                    }}
                                    className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-white hover:text-nobuk"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Remove "${m.name}" from council?`)) return;
                                      try {
                                        await fetch(`/api/committee/${m.id}`, {
                                          method: "DELETE",
                                          headers: { Authorization: `Bearer ${token}` },
                                        });
                                        fetchCommittee();
                                      } catch {}
                                    }}
                                    className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              {editingCom?.id === m.id && (
                                <div className="mt-3 border-t border-gray-200 pt-3">
                                  <div className="grid gap-3 sm:grid-cols-5">
                                    <div>
                                      <label className="mb-1 block text-xs font-bold text-muted">Name</label>
                                      <input type="text" value={editComName} onChange={(e) => setEditComName(e.target.value)}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-bold text-muted">Role</label>
                                      <input type="text" value={editComRole} onChange={(e) => setEditComRole(e.target.value)}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-bold text-muted">Fellowship</label>
                                      <select value={editComCouncil} onChange={(e) => setEditComCouncil(e.target.value)}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk">
                                        <option value="maranatha_fellowship">Maranatha Fellowship</option>
                                        <option value="bethlehem_fellowship">Bethlehem Fellowship</option>
                                        <option value="jerusalem_fellowship">Jerusalem Fellowship</option>
                                        <option value="aefeso_fellowship">Aefeso Fellowship</option>
                                        <option value="general_member">General Member</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-bold text-muted">Order</label>
                                      <input type="number" value={editComOrder} onChange={(e) => setEditComOrder(e.target.value)}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                                    </div>
                                    <div className="flex items-end gap-2">
                                      <button
                                        onClick={async () => {
                                          try {
                                            const res = await fetch(`/api/committee/${m.id}`, {
                                              method: "PATCH",
                                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                              body: JSON.stringify({ name: editComName, role: editComRole, council: editComCouncil, order: parseInt(editComOrder) || 0 }),
                                            });
                                            if (res.ok) { setEditingCom(null); fetchCommittee(); }
                                          } catch {}
                                        }}
                                        className="rounded-lg bg-nobuk px-3 py-2 text-xs font-semibold text-white hover:bg-nobuk-light"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingCom(null)}
                                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-muted hover:bg-white"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted">No council members yet. Add your first member above.</p>
              )}
            </div>
          </div>
          </>
        )}

        {tab === "pledges" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink">Pledges by Fellowship ({pledges.length} total)</h2>
                <button onClick={() => { setPledges([]); fetchPledges(); }}
                  className="flex items-center gap-1 text-xs font-semibold text-nobuk hover:underline">
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              {(() => {
                const memberLookup = new Map<string, { council: string; name: string }>();
                for (const m of churchMembers) memberLookup.set(m.name.toLowerCase().trim(), { council: m.council, name: m.name });

                const pledgesWithCouncil = pledges.map(p => {
                  const key = p.donor_name.toLowerCase().trim();
                  const match = memberLookup.get(key);
                  return { ...p, council: match ? match.council : 'general_member' };
                });

                const grouped: Record<string, typeof pledgesWithCouncil> = {};
                for (const p of pledgesWithCouncil) {
                  if (!grouped[p.council]) grouped[p.council] = [];
                  grouped[p.council].push(p);
                }

                const councilOrder = [...new Set([...(councils.map(c => c.slug)), ...Object.keys(grouped)])].filter(c => grouped[c]?.length);

                const councilColors: Record<string, string> = {
                  maranatha_fellowship: 'bg-blue-100 text-blue-700',
                  bethlehem_fellowship: 'bg-pink-100 text-pink-700',
                  jerusalem_fellowship: 'bg-indigo-100 text-indigo-700',
                  aefeso_fellowship: 'bg-amber-100 text-amber-700',
                  general_member: 'bg-gray-100 text-gray-600',
                };

                return (<>
                  {councilOrder.map(council => {
                    const councilPledges = grouped[council];
                    const totalAmount = councilPledges.reduce((s, p) => s + Number(p.amount), 0);
                    const totalPaid = councilPledges.reduce((s, p) => s + Number(p.paid), 0);
                    const totalRemaining = councilPledges.reduce((s, p) => s + Number(p.remaining), 0);
                    const fulfilled = councilPledges.filter(p => p.status === "fulfilled").length;
                    const label = council === 'general_member' ? 'General Member' : council.replace(/_/g, ' ');
                    return (
                      <details key={council} className="group" open>
                        <summary className="flex cursor-pointer items-center gap-3 rounded-lg bg-cream px-4 py-3 transition hover:bg-nobuk-muted">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold text-ink capitalize">{label}</span>
                            <span className="ml-2 text-xs text-muted">{councilPledges.length} pledges</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs tabular-nums">
                            <span className="text-muted">KES {totalAmount.toLocaleString("en-KE")}</span>
                            <span className="text-green-700 font-medium">KES {totalPaid.toLocaleString("en-KE")}</span>
                            <span className="text-amber-dark font-medium">KES {totalRemaining.toLocaleString("en-KE")}</span>
                            <span className="text-green-600">{fulfilled}/{councilPledges.length} done</span>
                          </div>
                        </summary>
                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 text-xs text-muted">
                                <th className="pb-2 pr-3 font-semibold">Donor & Fellowship</th>
                                <th className="pb-2 pr-3 font-semibold">Amount</th>
                                <th className="pb-2 pr-3 font-semibold">Paid</th>
                                <th className="pb-2 pr-3 font-semibold">Remaining</th>
                                <th className="pb-2 pr-3 font-semibold">Status</th>
                                <th className="pb-2 pr-3 font-semibold">Date</th>
                                <th className="pb-2 font-semibold">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {councilPledges.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50/50">
                                  <td className="py-2 pr-3">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-medium text-nobuk">{p.donor_name}</span>
                                      <span className={`inline-block w-fit rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${councilColors[p.council] || 'bg-gray-100 text-gray-600'}`}>
                                        {p.council === 'general_member' ? 'General Member' : p.council.replace(/_/g, ' ')}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2 pr-3">
                                    {editingPledge === p.id ? (
                                      <input type="number" value={editPledgeAmount} onChange={e => setEditPledgeAmount(e.target.value)}
                                        className="w-24 rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-nobuk" />
                                    ) : (
                                      <span className="font-mono">KES {Number(p.amount).toLocaleString()}</span>
                                    )}
                                  </td>
                                  <td className="py-2 pr-3 font-mono text-green-700">KES {Number(p.paid).toLocaleString()}</td>
                                  <td className="py-2 pr-3 font-mono text-amber-dark">KES {Number(p.remaining).toLocaleString()}</td>
                                  <td className="py-2 pr-3">
                                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      p.status === "fulfilled" ? "bg-green-100 text-green-800" :
                                      p.status === "active" ? "bg-blue-100 text-blue-800" :
                                      "bg-gray-100 text-gray-600"
                                    }`}>{p.status}</span>
                                  </td>
                                  <td className="py-2 pr-3 text-xs text-muted">{new Date(p.created_at).toLocaleDateString()}</td>
                                  <td className="py-2">
                                    <div className="flex items-center gap-1">
                                      {editingPledge === p.id ? (
                                        <>
                                          <button onClick={async () => {
                                            try {
                                              const token = localStorage.getItem("token");
                                              const res = await fetch(`/api/pledges/${p.id}`, {
                                                method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                                body: JSON.stringify({ amount: Number(editPledgeAmount) }),
                                              });
                                              if (res.ok) { setEditingPledge(null); fetchPledges(); }
                                            } catch {}
                                          }} className="rounded bg-nobuk px-2 py-1 text-[10px] font-bold text-white hover:bg-nobuk-light">Save</button>
                                          <button onClick={() => setEditingPledge(null)}
                                            className="rounded bg-gray-100 px-2 py-1 text-[10px] font-bold text-muted hover:bg-gray-200">Cancel</button>
                                        </>
                                      ) : payingPledge === p.id ? (
                                        <>
                                          <input type="number" placeholder="Amount" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                                            className="w-20 rounded border border-gray-200 px-1.5 py-1 text-xs outline-none focus:border-nobuk" />
                                          <input type="text" placeholder="Receipt" value={payReceipt} onChange={e => setPayReceipt(e.target.value)}
                                            className="w-20 rounded border border-gray-200 px-1.5 py-1 text-xs outline-none focus:border-nobuk" />
                                          <button onClick={async () => {
                                            try {
                                              const token = localStorage.getItem("token");
                                              const res = await fetch(`/api/pledges/${p.id}/pay`, {
                                                method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                                body: JSON.stringify({ amount: Number(payAmount), receipt_number: payReceipt }),
                                              });
                                              if (res.ok) { setPayingPledge(null); setPayAmount(""); setPayReceipt(""); fetchPledges(); }
                                            } catch {}
                                          }} disabled={!payAmount} className="rounded bg-green-700 px-2 py-1 text-[10px] font-bold text-white hover:bg-green-800 disabled:opacity-40">Pay</button>
                                          <button onClick={() => { setPayingPledge(null); setPayAmount(""); setPayReceipt(""); }}
                                            className="rounded bg-gray-100 px-2 py-1 text-[10px] font-bold text-muted hover:bg-gray-200">Cancel</button>
                                        </>
                                      ) : (
                                        <>
                                          <button onClick={() => { setEditingPledge(p.id); setEditPledgeAmount(String(p.amount)); }}
                                            className="rounded bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-200">Edit</button>
                                          {p.status !== "fulfilled" && (
                                            <button onClick={() => setPayingPledge(p.id)}
                                              className="rounded bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700 hover:bg-green-200">Pay</button>
                                          )}

                                          <button onClick={async () => {
                                            if (!confirm("Delete this pledge?")) return;
                                            try {
                                              const token = localStorage.getItem("token");
                                              const res = await fetch(`/api/pledges/${p.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                                              if (res.ok) fetchPledges();
                                            } catch {}
                                          }} className="rounded bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-200">Delete</button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    );
                  })}
                </>);
              })()}
            </div>
          </div>
        )}

        {tab === "fellowshipreports" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-bold text-ink">Fellowship Reports</h2>
                <div className="flex items-center gap-2">
                  <button onClick={async () => {
                    setExporting("frxlsx");
                    try {
                      const res = await fetch("/api/contributions/export/xlsx", { headers: { Authorization: `Bearer ${token}` } });
                      if (!res.ok) return;
                      const blob = await res.blob();
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `fellowship-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    } catch {}
                    setExporting(null);
                  }} disabled={exporting === "frxlsx"} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-muted hover:bg-cream disabled:opacity-40">
                    <Download size={12} /> {exporting === "frxlsx" ? "..." : "Export"}
                  </button>
                  <button onClick={() => fetchFellowshipReport()}
                    className="flex items-center gap-1 text-xs font-semibold text-nobuk hover:underline">
                    <RefreshCw size={12} /> Refresh
                  </button>
                </div>
              </div>

              {!fellowshipReport && (
                <div className="flex items-center justify-center py-10 text-sm text-muted">Loading fellowship data…</div>
              )}

              {fellowshipReport && (
                <>
                  {/* Summary cards */}
                  <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {(() => {
                      const r = fellowshipReport.report || [];
                      const totalMembers = r.reduce((s: number, f: any) => s + f.member_count, 0);
                      const totalDonations = r.reduce((s: number, f: any) => s + f.donation.total, 0);
                      const totalPledgePaid = r.reduce((s: number, f: any) => s + f.pledge.paid, 0);
                      const totalPledgeTotal = r.reduce((s: number, f: any) => s + f.pledge.total, 0);
                      return (
                        <>
                          <div className="rounded-lg border border-gray-100 bg-cream p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Fellowships</p>
                            <p className="mt-1 text-xl font-bold text-ink tabular-nums">{r.length}</p>
                          </div>
                          <div className="rounded-lg border border-gray-100 bg-cream p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Members</p>
                            <p className="mt-1 text-xl font-bold text-ink tabular-nums">{totalMembers}</p>
                          </div>
                          <div className="rounded-lg border border-gray-100 bg-cream p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Total Donations</p>
                            <p className="mt-1 text-xl font-bold text-green-700 tabular-nums">KES {totalDonations.toLocaleString("en-KE")}</p>
                          </div>
                          <div className="rounded-lg border border-gray-100 bg-cream p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Pledge Fulfillment</p>
                            <p className="mt-1 text-xl font-bold text-nobuk tabular-nums">
                              KES {totalPledgePaid.toLocaleString("en-KE")}
                              <span className="text-sm font-normal text-muted"> / KES {totalPledgeTotal.toLocaleString("en-KE")}</span>
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Per-fellowship detail cards */}
                  <div className="space-y-4">
                    {fellowshipReport.report?.map((f: any) => {
                      const label = f.council === 'general_member' ? 'General Member' : f.council.replace(/_/g, ' ');
                      const pledgePct = f.pledge.total > 0 ? (f.pledge.paid / f.pledge.total) * 100 : 0;
                      return (
                        <details key={f.council} className="group rounded-lg border border-gray-100 bg-white" open>
                          <summary className="flex cursor-pointer flex-col gap-1 rounded-lg bg-cream px-4 py-3 transition hover:bg-nobuk-muted md:flex-row md:items-center md:justify-between">
                            <div className="flex items-baseline gap-2 min-w-0">
                              <span className="text-sm font-bold text-ink capitalize shrink-0">{label}</span>
                              <span className="whitespace-nowrap text-xs text-muted">{f.member_count} members · {f.pledge.count} pledges</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
                              <span className="text-muted whitespace-nowrap">Donations: KES {f.donation.total.toLocaleString("en-KE")}</span>
                              <span className="text-green-700 font-medium whitespace-nowrap">Pledged: KES {f.pledge.paid.toLocaleString("en-KE")}</span>
                              <span className="text-amber-dark font-medium whitespace-nowrap">Rate: {f.pledge.fulfillment_rate}%</span>
                            </div>
                          </summary>

                          <div className="p-4">
                            {/* Pledge progress bar */}
                            {f.pledge.total > 0 && (
                              <div className="mb-4">
                                <div className="mb-1 flex items-center justify-between text-xs">
                                  <span className="font-semibold text-ink">Pledge Fulfillment</span>
                                  <span className="text-muted tabular-nums">{f.pledge.fulfilled}/{f.pledge.count} fulfilled · {pledgePct.toFixed(1)}%</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                                  <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${Math.min(pledgePct, 100)}%` }} />
                                </div>
                              </div>
                            )}

                            {/* Stats grid */}
                            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                              <div className="rounded-lg border border-gray-50 bg-gray-50/50 p-2.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Donations</p>
                                <p className="text-sm font-bold text-ink tabular-nums">KES {f.donation.total.toLocaleString("en-KE")}</p>
                                <p className="text-[10px] text-muted tabular-nums">{f.donation.count} gifts · avg KES {f.donation.avg_gift.toLocaleString("en-KE")}</p>
                              </div>
                              <div className="rounded-lg border border-gray-50 bg-gray-50/50 p-2.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Recent 30d</p>
                                <p className="text-sm font-bold text-ink tabular-nums">KES {f.donation.recent_30d_total.toLocaleString("en-KE")}</p>
                                <p className="text-[10px] text-muted tabular-nums">{f.donation.recent_30d_count} donations</p>
                              </div>
                              <div className="rounded-lg border border-gray-50 bg-gray-50/50 p-2.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Pledges</p>
                                <p className="text-sm font-bold text-ink tabular-nums">KES {f.pledge.total.toLocaleString("en-KE")}</p>
                                <p className="text-[10px] text-muted tabular-nums">Outstanding: KES {f.pledge.remaining.toLocaleString("en-KE")}</p>
                              </div>
                              <div className="rounded-lg border border-gray-50 bg-gray-50/50 p-2.5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Fulfillment Rate</p>
                                <p className={`text-sm font-bold tabular-nums ${pledgePct >= 100 ? 'text-green-700' : pledgePct >= 50 ? 'text-amber-dark' : 'text-red-600'}`}>
                                  {f.pledge.fulfillment_rate}%
                                </p>
                                <p className="text-[10px] text-muted tabular-nums">{f.pledge.active} active · {f.pledge.fulfilled} done</p>
                              </div>
                            </div>

                            {/* Two-column layout for top donors + methods */}
                            <div className="grid gap-4 md:grid-cols-2">
                              {/* Top donors */}
                              <div>
                                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">Top Donors</p>
                                {f.donation.top_donors?.length > 0 ? (
                                  <div className="space-y-1">
                                    {f.donation.top_donors.map((d: any, i: number) => {
                                      return (
                                        <div key={d.name} className="flex items-center gap-1.5">
                                          <span className="w-5 shrink-0 text-[10px] font-bold text-muted">{i + 1}.</span>
                                          <span className="min-w-0 flex-1 truncate text-xs text-ink">{d.name}</span>
                                          <span className="shrink-0 text-xs font-semibold text-ink tabular-nums">KES {d.total.toLocaleString("en-KE")}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted italic">No donation data</p>
                                )}
                              </div>

                              {/* Payment methods */}
                              <div>
                                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">Payment Methods</p>
                                {f.donation.method_breakdown?.length > 0 ? (
                                  <div className="space-y-1">
                                    {f.donation.method_breakdown.map((m: any) => {
                                      const maxM = f.donation.method_breakdown[0]?.total || 1;
                                      const mbw = (m.total / maxM) * 100;
                                      return (
                                        <div key={m.method} className="flex items-center gap-2">
                                          <span className="w-20 truncate text-xs font-medium text-ink">{m.method}</span>
                                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                                            <div className="h-full rounded-full bg-amber" style={{ width: `${mbw}%` }} />
                                          </div>
                                          <span className="text-xs font-semibold text-ink tabular-nums">KES {m.total.toLocaleString("en-KE")}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted italic">No data</p>
                                )}
                              </div>
                            </div>


                          </div>
                        </details>
                      );
                    })}
                  </div>


                </>
              )}
            </div>
          </div>
        )}

        {tab === "analytics" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              {/* Header */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-nobuk" />
                  <h2 className="text-base font-bold text-ink">Analytics Dashboard</h2>
                </div>
                <div className="flex items-center gap-2">
                  {/* Time range filter */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    {(["7d", "30d", "90d", "1y", "all"] as const).map(r => (
                      <button key={r} onClick={() => setAnalyticsRange(r)}
                        className={`px-2.5 py-1.5 text-[11px] font-semibold transition ${
                          analyticsRange === r ? "bg-nobuk text-white" : "text-muted hover:bg-cream"
                        }`}>
                        {r === "all" ? "All" : r}
                      </button>
                    ))}
                  </div>
                  <button onClick={async () => {
                    setExporting("xlsx");
                    try {
                      const res = await fetch("/api/contributions/export/xlsx", { headers: { Authorization: `Bearer ${token}` } });
                      if (!res.ok) return;
                      const blob = await res.blob();
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `harambee-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    } catch {}
                    setExporting(null);
                  }} disabled={exporting === "xlsx"}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-cream disabled:opacity-40">
                    <FileSpreadsheet size={14} /> {exporting === "xlsx" ? "..." : "Excel Report"}
                  </button>
                </div>
              </div>

              {dashboardData ? (
                <>
                  {/* ── KPI Cards ── */}
                  <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      { label: "Total Raised", value: `KES ${dashboardData.kpis.total_raised.toLocaleString("en-KE")}`, change: dashboardData.kpis.period_change, icon: TrendingUp, color: "bg-blue-600" },
                      { label: "Total Donations", value: dashboardData.kpis.total_donations.toLocaleString(), change: dashboardData.kpis.count_change, icon: DollarSign, color: "bg-emerald-600" },
                      { label: "Average Gift", value: `KES ${dashboardData.kpis.avg_gift.toLocaleString("en-KE")}`, icon: Users, color: "bg-violet-600" },
                      { label: "Pledge Fulfillment", value: `${dashboardData.pledges.fulfillment_rate}%`, subtitle: `${dashboardData.pledges.fulfilled}/${dashboardData.pledges.active + dashboardData.pledges.fulfilled} fulfilled`, icon: Target, color: "bg-amber-600" },
                      { label: "Days Remaining", value: dashboardData.harambee ? `${dashboardData.harambee.days_remaining} days` : "—", subtitle: dashboardData.harambee?.passed ? "Event passed" : `Until ${dashboardData.harambee?.date || "27 Sep 2026"}`, icon: Clock, color: "bg-rose-600" },
                    ].map((k) => {
                      const Icon = k.icon;
                      return (
                        <div key={k.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${k.color} bg-opacity-15`}>
                              <Icon size={17} className="text-white" />
                            </div>
                            {(k.change !== undefined) && (
                              <span className={`flex items-center gap-0.5 text-xs font-bold tabular-nums ${
                                k.change >= 0 ? "text-emerald-600" : "text-red-500"
                              }`}>
                                {k.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {Math.abs(k.change)}%
                              </span>
                            )}
                          </div>
                          <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted">{k.label}</p>
                          <p className="mt-0.5 text-lg font-bold text-ink">{k.value}</p>
                          {k.subtitle && <p className="text-[10px] text-muted">{k.subtitle}</p>}
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Revenue Chart (daily) ── */}
                  <div className="mb-6 rounded-lg border border-gray-100 bg-white p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-ink">Revenue Trend</h3>
                      <div className="flex gap-3 text-[10px] text-muted">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Daily</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Weekly avg</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={dashboardData.trends.daily.slice(-(analyticsRange === "7d" ? 7 : analyticsRange === "30d" ? 30 : analyticsRange === "90d" ? 90 : analyticsRange === "1y" ? 365 : undefined))}>
                        <defs>
                          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} stroke="#9CA3AF" />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                          formatter={(value: number) => [`KES ${value.toLocaleString("en-KE")}`, "Revenue"]}
                          labelFormatter={label => new Date(label).toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })}
                        />
                        <Area type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* ── Charts grid ── */}
                  <div className="mb-6 grid gap-6 lg:grid-cols-2">

                    {/* Council Breakdown */}
                    <div className="rounded-lg border border-gray-100 bg-white p-4">
                      <h3 className="mb-3 text-sm font-bold text-ink">Council Breakdown</h3>
                      <ResponsiveContainer width="100%" height={dashboardData.breakdowns.council.length * 48 + 20}>
                        <BarChart data={dashboardData.breakdowns.council} layout="vertical" margin={{ left: 20, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} stroke="#9CA3AF" />
                          <YAxis type="category" dataKey="council" tick={{ fontSize: 11 }} tickFormatter={v => v.replace(/_/g, " ")} stroke="#9CA3AF" width={120} />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                            formatter={(value: number) => [`KES ${value.toLocaleString("en-KE")}`, "Total"]}
                          />
                          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                            {dashboardData.breakdowns.council.map((_: any, i: number) => (
                              <Cell key={i} fill={["#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE"][i % 5]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Fellowship Stats Table */}
                    <div className="rounded-lg border border-gray-100 bg-white p-4">
                      <h3 className="mb-3 text-sm font-bold text-ink">Fellowship Details</h3>
                      <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="pb-2 pr-2 font-bold text-muted">Fellowship</th>
                              <th className="pb-2 pr-2 font-bold text-muted text-right">Members</th>
                              <th className="pb-2 pr-2 font-bold text-muted text-right">Donations</th>
                              <th className="pb-2 pr-2 font-bold text-muted text-right">Total</th>
                              <th className="pb-2 font-bold text-muted text-right">Avg</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData.breakdowns.council.map((f: any, i: number) => (
                              <tr key={f.council} className={i < dashboardData.breakdowns.council.length - 1 ? "border-b border-gray-50" : ""}>
                                <td className="py-2 pr-2 font-medium text-ink capitalize whitespace-nowrap">{f.council.replace(/_/g, " ")}</td>
                                <td className="py-2 pr-2 text-right tabular-nums text-ink">{f.member_count}</td>
                                <td className="py-2 pr-2 text-right tabular-nums text-ink">{f.count}</td>
                                <td className="py-2 pr-2 text-right tabular-nums font-bold text-nobuk">KES {f.total.toLocaleString("en-KE")}</td>
                                <td className="py-2 text-right tabular-nums text-muted">KES {f.avg_per_member.toLocaleString("en-KE")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="rounded-lg border border-gray-100 bg-white p-4">
                      <h3 className="mb-3 text-sm font-bold text-ink">Payment Methods</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <RePie>
                          <Pie
                            data={dashboardData.breakdowns.method}
                            dataKey="total"
                            nameKey="method"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={2}
                          >
                            {dashboardData.breakdowns.method.map((_: any, i: number) => (
                              <Cell key={i} fill={["#2563EB", "#3B82F6", "#60A5FA", "#93C5FD"][i % 4]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                            formatter={(value: number) => [`KES ${value.toLocaleString("en-KE")}`, ""]} />
                          <Legend
                            formatter={(value: string) => <span className="text-xs text-muted capitalize">{value}</span>}
                            wrapperStyle={{ fontSize: 11 }}
                          />
                        </RePie>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* ── Pledge Analytics ── */}
                  <div className="mb-6 rounded-lg border border-gray-100 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Target size={16} className="text-nobuk" />
                      <h3 className="text-sm font-bold text-ink">Pledge Analytics</h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div className="rounded-lg bg-blue-50 p-3 text-center">
                        <p className="text-xs font-medium text-blue-700">Total Pledged</p>
                        <p className="mt-1 text-lg font-bold text-blue-900">KES {dashboardData.pledges.total.toLocaleString("en-KE")}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-3 text-center">
                        <p className="text-xs font-medium text-emerald-700">Paid</p>
                        <p className="mt-1 text-lg font-bold text-emerald-900">KES {dashboardData.pledges.paid.toLocaleString("en-KE")}</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 p-3 text-center">
                        <p className="text-xs font-medium text-amber-700">Outstanding</p>
                        <p className="mt-1 text-lg font-bold text-amber-900">KES {dashboardData.pledges.remaining.toLocaleString("en-KE")}</p>
                      </div>
                      <div className="rounded-lg bg-violet-50 p-3 text-center">
                        <p className="text-xs font-medium text-violet-700">Rate</p>
                        <p className="mt-1 text-lg font-bold text-violet-900">{dashboardData.pledges.fulfillment_rate}%</p>
                      </div>
                    </div>
                    {dashboardData.pledges.total > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted mb-1">
                          <span>Fulfillment progress</span>
                          <span>{dashboardData.pledges.fulfilled} fulfilled · {dashboardData.pledges.active} active</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all" style={{ width: `${Math.min(dashboardData.pledges.fulfillment_rate, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Top Donors + Member Honour ── */}
                  <div className="grid gap-6 lg:grid-cols-2">

                    {/* Top Donors */}
                    <div className="rounded-lg border border-gray-100 bg-white p-4">
                      <h3 className="mb-3 text-sm font-bold text-ink">Top Donors</h3>
                      {dashboardData.breakdowns.top_donors?.length ? (
                        <div className="space-y-0.5">
                          {dashboardData.breakdowns.top_donors.slice(0, 10).map((d: any, i: number) => {
                            const max = dashboardData.breakdowns.top_donors[0].amount;
                            const pct = (d.amount / max) * 100;
                            return (
                              <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-cream transition-colors">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-nobuk-muted text-[9px] font-bold text-nobuk">
                                  {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-ink truncate">{d.name}</span>
                                    <span className="text-xs font-bold text-nobuk tabular-nums shrink-0 ml-2">KES {d.amount.toLocaleString("en-KE")}</span>
                                  </div>
                                  <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted">No donor data yet.</p>
                      )}
                    </div>

                    {/* Member Honour Ranking */}
                    <div className="rounded-lg border border-gray-100 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Medal size={16} className="text-nobuk" />
                        <h3 className="text-sm font-bold text-ink">Member Honour Ranking</h3>
                      </div>
                      {dashboardData.members.ranking?.length ? (
                        <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
                          {dashboardData.members.ranking.slice(0, 20).map((m: any, i: number) => (
                            <div key={m.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-cream transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                                  i === 0 ? "bg-amber text-white" : i === 1 ? "bg-gray-300 text-gray-700" : i === 2 ? "bg-amber-light text-amber-dark" : "bg-nobuk-muted text-nobuk"
                                }`}>
                                  {i + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-ink truncate">{m.name}</p>
                                  <p className="text-[9px] text-muted">{m.council.replace(/_/g, " ")} &middot; {m.count} donations</p>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-nobuk tabular-nums shrink-0 ml-2">KES {m.total.toLocaleString("en-KE")}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted">No member honour data yet.</p>
                      )}
                    </div>
                  </div>

                  {/* ── Member + Campaign Stats ── */}
                  <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-lg border border-gray-100 bg-cream p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users size={16} className="text-nobuk" />
                        <h3 className="text-sm font-bold text-ink">Church Members</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-2xl font-bold text-nobuk">{dashboardData.members.total}</p>
                          <p className="text-[10px] text-muted">Total members</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-emerald-600">{dashboardData.members.new_30d}</p>
                          <p className="text-[10px] text-muted">New (30d)</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-amber-600">{dashboardData.pledges.active}</p>
                          <p className="text-[10px] text-muted">Active pledges</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-100 bg-cream p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={16} className="text-nobuk" />
                        <h3 className="text-sm font-bold text-ink">Period Comparison</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <p className={`text-lg font-bold ${dashboardData.kpis.period_change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {dashboardData.kpis.period_change >= 0 ? "+" : ""}{dashboardData.kpis.period_change}%
                          </p>
                          <p className="text-[10px] text-muted">Revenue vs prev 30d</p>
                        </div>
                        <div>
                          <p className={`text-lg font-bold ${dashboardData.kpis.count_change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {dashboardData.kpis.count_change >= 0 ? "+" : ""}{dashboardData.kpis.count_change}%
                          </p>
                          <p className="text-[10px] text-muted">Donations vs prev 30d</p>
                        </div>
                      </div>
                    </div>

                    {/* ── Gender Breakdown ── */}
                    {dashboardData.members.gender && (
                      <div className="mt-6 rounded-lg border border-gray-100 bg-white p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Users size={16} className="text-nobuk" />
                          <h3 className="text-sm font-bold text-ink">Men / Women</h3>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                            <div
                              className="h-full w-full rounded-full"
                              style={{
                                background: (() => {
                                  const m = dashboardData.members.gender.male;
                                  const f = dashboardData.members.gender.female;
                                  const u = dashboardData.members.gender.unset;
                                  const total = m + f + u;
                                  if (total === 0) return "conic-gradient(#e5e7eb 0deg 360deg)";
                                  const mPct = (m / total) * 360;
                                  const fPct = (f / total) * 360;
                                  return `conic-gradient(#3B82F6 0deg ${mPct}deg, #EC4899 ${mPct}deg ${mPct + fPct}deg, #D1D5DB ${mPct + fPct}deg 360deg)`;
                                })(),
                              }}
                            />
                            <div className="absolute flex h-20 w-20 items-center justify-center rounded-full bg-white">
                              <span className="text-lg font-bold text-nobuk">{dashboardData.members.gender.male + dashboardData.members.gender.female + dashboardData.members.gender.unset}</span>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-blue-500" />
                              <span className="text-muted">Men</span>
                              <span className="ml-auto font-bold text-ink">{dashboardData.members.gender.male}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-pink-500" />
                              <span className="text-muted">Women</span>
                              <span className="ml-auto font-bold text-ink">{dashboardData.members.gender.female}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-gray-300" />
                              <span className="text-muted">Unset</span>
                              <span className="ml-auto font-bold text-ink">{dashboardData.members.gender.unset}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-nobuk border-t-transparent" />
                    <p className="text-sm text-muted">Loading analytics...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "sitecontent" && <SiteContentEditor />}
      </main>
    </div>
  );
}

function SiteContentEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [translating, setTranslating] = useState(false);
  const [content, setContent] = useState({
    goal_amount: 30000000,
    church_phone: "0727278577",
    cards: [
      { title_en: "Our Goal", text_en: "" },
      { title_en: "Our Community", text_en: "" },
      { title_en: "Give with Purpose", text_en: "" },
    ],
    about_desc_en: "",
    harambee_reason_en: "",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.settings?.site_content) {
          try {
            const parsed = JSON.parse(data.settings.site_content);
            setContent(prev => ({ ...prev, ...parsed, cards: parsed.cards?.map((c: any) => ({ title_en: c.title_en, text_en: c.text_en })) || prev.cards }));
          } catch {}
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function updateCard(i: number, field: string, value: string) {
    const cards = [...content.cards];
    cards[i] = { ...cards[i], [field]: value };
    setContent({ ...content, cards });
  }

  async function translateText(text: string): Promise<string> {
    if (!text.trim()) return "";
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return text;
      const data = await res.json();
      return data.translated || text;
    } catch { return text; }
  }

  async function handleSave() {
    setSaving(true); setTranslating(true); setMsg("Translating to Swahili...");

    try {
      // Auto-translate all English fields to Swahili
      const cards = await Promise.all(content.cards.map(async (card) => ({
        title_en: card.title_en,
        title_sw: await translateText(card.title_en),
        text_en: card.text_en,
        text_sw: await translateText(card.text_en),
      })));

      const about_desc_sw = await translateText(content.about_desc_en);
      const harambee_reason_sw = await translateText(content.harambee_reason_en);

      setTranslating(false); setMsg("Saving...");

      const payload = {
        goal_amount: content.goal_amount,
        cards,
        about_desc_en: content.about_desc_en,
        about_desc_sw,
        harambee_reason_en: content.harambee_reason_en,
        harambee_reason_sw,
      };

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_content: JSON.stringify(payload), church_phone: content.church_phone }),
      });
      if (res.ok) setMsg("Saved successfully!");
      else setMsg("Failed to save");
    } catch { setMsg("Network error"); }
    setSaving(false); setTranslating(false);
  }

  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-nobuk border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Site Content</h2>
            <p className="text-sm text-muted">Type in English only — Swahili is auto-translated on save.</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="btn-lift flex items-center gap-2 rounded-xl bg-nobuk px-5 py-2.5 text-sm font-bold text-white hover:bg-nobuk-light disabled:opacity-50">
            <Save size={16} />
            {translating ? "Translating..." : saving ? "Saving..." : "Save All"}
          </button>
        </div>
        {msg && (
          <div className={`mb-4 rounded-lg px-4 py-2 text-sm font-medium ${msg.includes("Success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {msg}
          </div>
        )}

        {/* Church Phone */}
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-bold text-ink">Church Phone</label>
          <input type="text" value={content.church_phone} onChange={e => setContent({...content, church_phone: e.target.value})}
            className="w-full max-w-xs rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none focus:border-nobuk" />
        </div>

        {/* Goal */}
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-bold text-ink">Goal Amount (KES)</label>
          <input type="number" value={content.goal_amount} onChange={e => setContent({...content, goal_amount: Number(e.target.value)})}
            className="w-full max-w-xs rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none focus:border-nobuk" />
        </div>

        {/* About description */}
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-bold text-ink">About Description</label>
          <textarea value={content.about_desc_en} onChange={e => setContent({...content, about_desc_en: e.target.value})} rows={2}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none focus:border-nobuk" placeholder="The construction of this Great House of God started in 2006..." />
        </div>

        {/* Harambee reason */}
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-bold text-ink">Harambee Reason</label>
          <textarea value={content.harambee_reason_en} onChange={e => setContent({...content, harambee_reason_en: e.target.value})} rows={2}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none focus:border-nobuk" placeholder="Together we are building the house of the Lord..." />
        </div>

        {/* Cards */}
        <h3 className="mb-3 text-sm font-bold text-ink uppercase tracking-wider">Objectives Cards</h3>
        {content.cards.map((card, i) => (
          <div key={i} className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-3 text-xs font-bold text-muted uppercase">Card {i + 1}</p>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Title</label>
                <input type="text" value={card.title_en} onChange={e => updateCard(i, "title_en", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Text</label>
                <textarea value={card.text_en} onChange={e => updateCard(i, "text_en", e.target.value)} rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
