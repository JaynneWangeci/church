import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, Users, DollarSign, Clock, AlertCircle,
  Download, LogOut, RefreshCw, Shield, UserPlus, Trash2, Medal, Church, Settings, BarChart3, FileSpreadsheet, Search, ScanSearch, ArrowUpRight, ArrowDownRight, PieChart, Target, Save, Pencil, Monitor, Eye,   EyeOff, GitMerge, Send, ExternalLink, AlertTriangle, Plus,
} from "lucide-react";
import MemberHistoryPanel from "../components/MemberHistoryPanel";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePie, Pie, Cell, Legend,
} from "recharts";
import { COUNCIL_ORDER } from "../types";
import type { DashboardStats, AdminUser, ChurchMember, CommitteeMember, Council } from "../types";
import { fetchCouncils, getCouncilLabel, clearCouncilCache } from "../lib/councils";

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
  const [tab, setTab] = useState<"overview" | "members" | "admins" | "analytics" | "council" | "pledges" | "fellowshipreports" | "sitecontent" | "security">("overview");
  const [churchMembers, setChurchMembers] = useState<ChurchMember[]>([]);
  const [newName, setNewName] = useState("");
  const [newCouncil, setNewCouncil] = useState("maranatha_fellowship");
  const [newGender, setNewGender] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [memberError, setMemberError] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [bulkCouncil, setBulkCouncil] = useState("maranatha_fellowship");
  const [bulkGender, setBulkGender] = useState("");
  const [bulkPhone, setBulkPhone] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkResult, setBulkResult] = useState("");
  const [bulkEditNames, setBulkEditNames] = useState("");
  const [bulkEditCouncil, setBulkEditCouncil] = useState("");
  const [bulkEditGender, setBulkEditGender] = useState("");
  const [bulkEditResult, setBulkEditResult] = useState("");
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberCouncil, setEditMemberCouncil] = useState("");
  const [editMemberGender, setEditMemberGender] = useState("");
  const [editMemberPhone, setEditMemberPhone] = useState("");
  const [memberCouncilFilter, setMemberCouncilFilter] = useState("");
  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("admin");
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [newAdminShowPassword, setNewAdminShowPassword] = useState(false);
  const [newAdminShowConfirm, setNewAdminShowConfirm] = useState(false);
  const [newAdminConfirm, setNewAdminConfirm] = useState("");
  const [adminError, setAdminError] = useState("");
  const [editingAdmin, setEditingAdmin] = useState<AdminUserRecord | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwError, setPwError] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [deduping, setDeduping] = useState(false);
  const [dedupResult, setDedupResult] = useState("");
  const [mergeResult, setMergeResult] = useState("");
  const [historyName, setHistoryName] = useState("");
  const [historyResult, setHistoryResult] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [donationFilter, setDonationFilter] = useState<"all" | "stk" | "paybill" | "unassigned">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<any>(null);
  const [addMemberSearchResults, setAddMemberSearchResults] = useState<any[]>([]);
  const [showAddMemberDropdown, setShowAddMemberDropdown] = useState(false);
  const [searchingMember, setSearchingMember] = useState(false);
  const addMemberDropdownRef = useRef<HTMLDivElement>(null);
  const addMemberTimer = useRef<any>(null);
  const [honouringDonation, setHonouringDonation] = useState<string | null>(null);
  const [honourSearch, setHonourSearch] = useState("");
  const [honourResults, setHonourResults] = useState<any[]>([]);
  const [honourSearching, setHonourSearching] = useState(false);
  const honourTimer = useRef<any>(null);
  const [allDonations, setAllDonations] = useState<any[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationsTotal, setDonationsTotal] = useState(0);
  const donationsOffsetRef = useRef(0);
  const [donationsHasMore, setDonationsHasMore] = useState(true);
  const [donationDateFrom, setDonationDateFrom] = useState("");
  const [donationDateTo, setDonationDateTo] = useState("");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [analyticsRange, setAnalyticsRange] = useState<"7d" | "30d" | "90d" | "1y" | "all">("30d");
  const [chartPeriod, setChartPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [newComName, setNewComName] = useState("");
  const [newComRole, setNewComRole] = useState("");
  const [newComCouncil, setNewComCouncil] = useState("maranatha_fellowship");
  const [newComOrder, setNewComOrder] = useState("0");
  const [comError, setComError] = useState("");
  const [councils, setCouncils] = useState<Council[]>([]);
  const [editingCouncil, setEditingCouncil] = useState<Council | null>(null);
  const [editCouncilSlug, setEditCouncilSlug] = useState("");
  const [editCouncilName, setEditCouncilName] = useState("");
  const [newCouncilSlug, setNewCouncilSlug] = useState("");
  const [newCouncilName, setNewCouncilName] = useState("");
  const [councilMgmtError, setCouncilMgmtError] = useState("");
  const [councilMgmtMsg, setCouncilMgmtMsg] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
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
  const [secEvents, setSecEvents] = useState<any[]>([]);
  const [secSummary, setSecSummary] = useState<Record<string, number>>({});
  const [secLoading, setSecLoading] = useState(false);
  const secTimerRef = useRef<ReturnType<typeof setInterval>>();
  const [secFilter, setSecFilter] = useState("");

  const hourlyBarColors = Array.from({ length: 24 }, (_, i) => {
    const hue = i < 6 ? 250 : i < 12 ? 270 : i < 18 ? 240 : 260;
    return `hsl(${hue}, ${50 + (i % 6) * 5}%, ${40 + (i % 4) * 8}%)`;
  });

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addMemberDropdownRef.current && !addMemberDropdownRef.current.contains(e.target as Node)) {
        setShowAddMemberDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchDonations = useCallback(async (from?: string, to?: string, append = false, filter?: string) => {
    setDonationsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const pageSize = 200;
      const currentOffset = append ? donationsOffsetRef.current : 0;
      const params = new URLSearchParams({ limit: String(pageSize), offset: String(currentOffset) });
      if (from) params.set("date_from", from);
      if (to) params.set("date_to", to);
      if (filter === "unassigned") params.set("honoured", "false");
      const res = await fetch(`/api/donations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const newDonations = data.donations || [];
        setAllDonations(prev => append ? [...prev, ...newDonations] : newDonations);
        setDonationsTotal(data.total || 0);
        donationsOffsetRef.current = currentOffset + newDonations.length;
        setDonationsHasMore(newDonations.length >= pageSize);
      }
    } catch {}
    setDonationsLoading(false);
  }, []);

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
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/admin/audit-logs?limit=20", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch { /* silent */ }
  }, [admin?.role]);

  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const res = await fetch("/api/auth/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch { /* silent */ }
    finally { setLoadingSessions(false); }
  }, [token]);

  const fetchSecurityEvents = useCallback(async () => {
    try {
      setSecLoading(true);
      const res = await fetch(`/api/admin/security/feed/critical?hours=24`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSecEvents(data.events || []);
        setSecSummary(data.summary || {});
      }
    } catch { /* silent */ }
    finally { setSecLoading(false); }
  }, [token]);

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
      const res = await fetch("/api/members", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChurchMembers(data.members || []);
      }
    } catch { /* silent */ }
  }, [token]);

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
    fetchDonations();
    fetchMembers();
    fetchAdmins();
    fetchAnalytics();
    fetchCommittee();
    fetchPledges();
    fetchFellowshipReport();
    loadCouncils();
    loadHarambee();
  }, [admin, fetchStats, fetchLogs, fetchDonations, fetchMembers, fetchAdmins, fetchAnalytics, fetchCommittee, fetchPledges, fetchFellowshipReport, loadCouncils, loadHarambee]);

  // Live audit log polling
  useEffect(() => {
    if (admin?.role !== "super_admin") return;
    fetchLogs();
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [admin?.role, fetchLogs]);

  // Fetch donations when date range changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDonations(donationDateFrom || undefined, donationDateTo || undefined, false, donationFilter);
    }, 400);
    return () => clearTimeout(timer);
  }, [donationDateFrom, donationDateTo, donationFilter, fetchDonations]);

  // Security feed auto-refresh (30s when tab is active)
  useEffect(() => {
    if (tab !== "security") return;
    fetchSecurityEvents();
    const id = setInterval(fetchSecurityEvents, 30000);
    return () => clearInterval(id);
  }, [tab, fetchSecurityEvents]);

  // Pledges auto-refresh (15s when tab is active)
  useEffect(() => {
    if (tab !== "pledges") return;
    fetchPledges();
    const id = setInterval(fetchPledges, 15000);
    return () => clearInterval(id);
  }, [tab, fetchPledges]);

  // Fellowship reports auto-refresh (30s when tab is active)
  useEffect(() => {
    if (tab !== "fellowshipreports") return;
    fetchFellowshipReport();
    const id = setInterval(fetchFellowshipReport, 30000);
    return () => clearInterval(id);
  }, [tab, fetchFellowshipReport]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) { setMemberError("Kindly provide the member's name"); return; }
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim().replace(/^\d+[\.\)]?\s*(?:[A-Za-z]\s+)?/, "").replace(/\.+$/, ""), council: newCouncil, gender: newGender || undefined, phone: newPhone.replace(/\D/g, "") || undefined }),
      });
      if (!res.ok) { const d = await res.json(); setMemberError(d.error || "Something went wrong. Please try again."); return; }
      const d = await res.json();
      setChurchMembers(prev => [...prev, d.member]);
      setNewName("");
      setMemberError("");
      fetchStats(); fetchAnalytics(); fetchFellowshipReport(); fetchPledges();
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
    const newMembers: ChurchMember[] = [];
    const serverDups: string[] = [];
    let added = 0;
    for (const { name, council } of toAdd) {
      try {
        const res = await fetch("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name, council, gender: bulkGender || undefined, phone: bulkPhone.replace(/\D/g, "") || undefined }),
        });
        if (res.ok) { const d = await res.json(); newMembers.push(d.member); added++; addedNames.add(name); continue; }
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
    if (newMembers.length) { setChurchMembers(prev => [...prev, ...newMembers]); fetchStats(); fetchAnalytics(); fetchFellowshipReport(); fetchPledges(); }
  }

  async function handleBulkEdit() {
    const names = bulkEditNames.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (!names.length) { setBulkEditResult("Paste at least one name"); return; }
    if (!bulkEditCouncil) { setBulkEditResult("Select a fellowship"); return; }
    setBulkEditResult("");
    const res = await fetch("/api/members/bulk-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ names, council: bulkEditCouncil, gender: bulkEditGender || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      const missing = data.missing?.length || 0;
      let msg = `${data.updated} of ${data.total} members updated.`;
      if (missing) msg += `\n${missing} name${missing > 1 ? 's' : ''} not found in database. Use "Bulk Add Members" first.`;
      if (data.missing?.length && data.missing.length <= 5) msg += `\nNot found: ${data.missing.join(", ")}`;
      setBulkEditResult(msg);
      setBulkEditNames("");
      const lower = new Set(names.map(n => n.trim().toLowerCase()));
      setChurchMembers(prev => prev.map(m => lower.has(m.name.trim().toLowerCase()) ? { ...m, council: bulkEditCouncil, gender: bulkEditGender || m.gender } : m));
      fetchStats();
      fetchAnalytics();
      fetchFellowshipReport();
      fetchPledges();
    } else {
      setBulkEditResult(data.error || "Something went wrong");
    }
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
      if (res.ok) { setChurchMembers(prev => prev.filter(m => m.id !== id)); fetchStats(); fetchAnalytics(); fetchFellowshipReport(); fetchPledges(); }
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
        const deleted = new Set(selectedMembers);
        setSelectedMembers(new Set());
        setChurchMembers(prev => prev.filter(m => !deleted.has(m.id)));
        fetchStats(); fetchAnalytics(); fetchFellowshipReport(); fetchPledges();
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
      if (data.deduped > 0) { fetchMembers(); fetchStats(); fetchAnalytics(); fetchFellowshipReport(); fetchPledges(); }
    } catch { setDedupResult("Something went wrong. Please try again."); }
    finally { setDeduping(false); }
  }

  async function handleMerge() {
    if (selectedMembers.size < 2) return;
    const selected = churchMembers.filter(m => selectedMembers.has(m.id));
    const names = selected.map((m, i) => `  ${i === 0 ? "→ " : "  "}${m.name}${i === 0 ? " (survivor)" : ""}`).join("\n");
    if (!confirm(`Merge these ${selected.length} members into one?\n\n${names}\n\n"${selected[0].name}" will be kept. All others will be absorbed and deactivated. This cannot be undone.`)) return;
    setMergeResult("");
    try {
      const sourceIds = selected.slice(1).map(m => m.id);
      const res = await fetch(`/api/members/${selected[0].id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ source_ids: sourceIds }),
      });
      const data = await res.json();
      setMergeResult(data.message || "Done.");
      if (res.ok) { setSelectedMembers(new Set()); fetchMembers(); fetchStats(); fetchAnalytics(); fetchFellowshipReport(); fetchPledges(); }
    } catch { setMergeResult("Something went wrong. Please try again."); }
  }

  async function handleHistorySearch() {
    const q = historyName.trim();
    if (!q || q.length < 2) return;
    setHistoryLoading(true);
    setHistoryResult(null);
    try {
      const res = await fetch(`/api/members/history?name=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHistoryResult(await res.json());
      else setHistoryResult({ summary: { total_donated: 0, total_donations: 0, completed_donations: 0, failed_donations: 0, pending_donations: 0, total_pledged: 0, total_paid: 0, pledge_count: 0 }, donations: [], pledges: [], members: [] });
    } catch { setHistoryResult({ summary: { total_donated: 0, total_donations: 0, completed_donations: 0, failed_donations: 0, pending_donations: 0, total_pledged: 0, total_paid: 0, pledge_count: 0 }, donations: [], pledges: [], members: [] }); }
    finally { setHistoryLoading(false); }
  }

  async function handleUpdateMember(id: string) {
    if (!editMemberName.trim()) return;
    const prev = churchMembers.find(m => m.id === id);
    setChurchMembers(prev => prev.map(m => m.id === id ? { ...m, name: editMemberName.trim(), council: editMemberCouncil, gender: editMemberGender || null } : m));
    setEditingMember(null);
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editMemberName.trim(), council: editMemberCouncil, gender: editMemberGender || null, phone: editMemberPhone.replace(/\D/g, "") || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setChurchMembers(prev => prev.map(m => m.id === id ? data.member : m));
        fetchStats(); fetchAnalytics(); fetchFellowshipReport(); fetchPledges();
      } else if (prev) {
        setChurchMembers(prev => prev.map(m => m.id === id ? prev : m));
      }
    } catch {
      if (prev) setChurchMembers(prev => prev.map(m => m.id === id ? prev : m));
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/admin/login");
  }

  async function revokeSession(sessionId: string) {
    try {
      const res = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSessions(prev => prev.filter((s: any) => s.id !== sessionId));
      }
    } catch { /* silent */ }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-nobuk border-t-transparent" />
      </div>
    );
  }

  if (!admin) return null;

  const progress = stats ? Math.min((stats.raised / stats.goal) * 100, 100) : 0;

  const paybillPct = stats?.total_raised ? ((stats as any).paybill_total || 0) / stats.total_raised * 100 : 0;

  const smsStats = (stats as any)?.sms;
  const smsSent = smsStats?.total_sent ?? 0;
  const smsFailed = smsStats?.total_failed ?? 0;
  const smsCost = smsStats?.total_cost ?? 0;

  const statCards = [
    { icon: TrendingUp, label: "Total Raised", value: stats ? `KES ${stats.total_raised.toLocaleString()}` : "—" },
    { icon: Users, label: "Total Donors", value: stats?.total_donors?.toLocaleString() || "0" },
    { icon: DollarSign, label: "Average Gift", value: stats ? `KES ${stats.avg_gift.toLocaleString()}` : "—" },
    { icon: Clock, label: "Pending", value: stats?.pending_count?.toString() || "0" },
    { icon: Send, label: "SMS Sent", value: smsSent ? smsSent.toLocaleString() : "0", sub: smsFailed ? `${smsFailed} failed` : undefined },
    { icon: TrendingUp, label: "STK Push", value: stats ? `KES ${((stats as any).stk_total || 0).toLocaleString()}` : "—" },
    { icon: TrendingUp, label: "Paybill", value: stats ? `KES ${((stats as any).paybill_total || 0).toLocaleString()} (${paybillPct.toFixed(2)}%)` : "—" },
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

  const TabButton = ({ active, onClick, icon, count, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; count?: number; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-medium transition-all sm:gap-2 sm:px-4 sm:py-2 sm:text-sm ${
        active
          ? "bg-nobuk text-white shadow-sm"
          : "bg-white text-muted hover:bg-cream hover:text-ink border border-gray-200"
      }`}
    >
      {icon}
      <span>{children}</span>
      {count !== undefined && (
        <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold sm:ml-1 ${
          active ? "bg-white/20 text-white" : "bg-gray-100 text-muted"
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-nobuk sm:text-lg">Admin Dashboard</h1>
            <p className="truncate text-[10px] text-muted sm:text-xs">{admin.name} &middot; {admin.role.replace("_", " ")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <button onClick={() => { fetchStats(); fetchLogs(); fetchDonations(donationDateFrom || undefined, donationDateTo || undefined); fetchMembers(); fetchAdmins(); fetchAnalytics(); fetchCommittee(); fetchPledges(); fetchFellowshipReport(); loadCouncils(); loadHarambee(); }} className="rounded-lg p-1.5 text-muted transition hover:bg-cream sm:p-2" title="Refresh">
              <RefreshCw size={14} />
            </button>
            <a href="/" className="hidden text-xs text-muted underline underline-offset-2 hover:text-nobuk sm:inline">View Site</a>
            <button onClick={() => { setShowSessions(p => !p); if (!showSessions) fetchSessions(); }} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-muted transition hover:bg-cream sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm">
              <Monitor size={12} className="sm:size-[14px]" /> <span className="hidden sm:inline">Sessions</span>
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-muted transition hover:bg-cream sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm">
              <LogOut size={12} className="sm:size-[14px]" /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8">
        {/* Tab navigation — mobile scrollable, desktop pills */}
        <div className="mb-4 overflow-x-auto sm:mb-6">
          <div className="flex gap-1.5 pb-2 sm:flex-wrap sm:gap-2 sm:pb-0">
            <TabButton active={tab === "overview"} onClick={() => setTab("overview")} icon={<BarChart3 size={14} />}>Overview</TabButton>
            {(admin.role === "admin" || admin.role === "super_admin") && (
              <TabButton active={tab === "members"} onClick={() => setTab("members")} icon={<Users size={14} />} count={churchMembers.length}>Members</TabButton>
            )}
            {admin.role === "super_admin" && (
              <TabButton active={tab === "admins"} onClick={() => setTab("admins")} icon={<Shield size={14} />} count={admins.length}>Admins</TabButton>
            )}
            {(admin.role === "admin" || admin.role === "super_admin") && (
              <TabButton active={tab === "council"} onClick={() => { clearCouncilCache(); loadCouncils(); fetchCommittee(); setTab("council"); }} icon={<Users size={14} />} count={committeeMembers.length}>Fellowship</TabButton>
            )}
            {(admin.role === "admin" || admin.role === "super_admin") && (
              <TabButton active={tab === "pledges"} onClick={() => setTab("pledges")} icon={<Target size={14} />} count={pledges.length}>Pledges</TabButton>
            )}
            {(admin.role === "admin" || admin.role === "super_admin") && (
              <TabButton active={tab === "fellowshipreports"} onClick={() => { setTab("fellowshipreports"); fetchFellowshipReport(); }} icon={<Users size={14} />}>Fellowship Reports</TabButton>
            )}
            <TabButton active={tab === "analytics"} onClick={() => setTab("analytics")} icon={<TrendingUp size={14} />}>Analytics</TabButton>
            {(admin.role === "admin" || admin.role === "super_admin") && (
              <TabButton active={tab === "security"} onClick={() => setTab("security")} icon={<Shield size={14} />}>Security</TabButton>
            )}
            {(admin.role === "admin" || admin.role === "super_admin") && (
              <TabButton active={tab === "sitecontent"} onClick={() => setTab("sitecontent")} icon={<Settings size={14} />}>Settings</TabButton>
            )}
          </div>
        </div>

        {/* Global member search — DB-powered autocomplete */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div ref={dropdownRef} className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Type any name to search full history..."
                value={historyName}
                onChange={e => {
                  const val = e.target.value;
                  setHistoryName(val);
                  setShowHistoryDropdown(true);
                  if (searchTimer.current) clearTimeout(searchTimer.current);
                  if (val.trim().length >= 1) {
                    setSearchLoading(true);
                    searchTimer.current = setTimeout(async () => {
                      try {
                        const res = await fetch(`/api/members/search?q=${encodeURIComponent(val.trim())}`, {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (res.ok) { const d = await res.json(); setSearchResults(d.members || []); }
                      } catch {}
                      setSearchLoading(false);
                    }, 200);
                  } else {
                    // Show all members from local cache when input is empty
                    setSearchResults(churchMembers.filter(m => m.is_active !== false));
                    setSearchLoading(false);
                  }
                }}
                onFocus={() => {
                  setShowHistoryDropdown(true);
                  if (!historyName.trim()) {
                    setSearchResults(churchMembers.filter(m => m.is_active !== false));
                  }
                }}
                onKeyDown={e => { if (e.key === "Enter") { setShowHistoryDropdown(false); handleHistorySearch(); } }}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-9 pr-3 text-sm text-ink outline-none focus:border-nobuk shadow-sm"
              />
              {showHistoryDropdown && historyName.trim() && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                  {searchLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-nobuk border-t-transparent" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                      {(() => {
                        const councilsInResults = [...new Set(searchResults.map(m => m.council))];
                        const orderMap = COUNCIL_ORDER || {};
                        councilsInResults.sort((a, b) => (orderMap[a] || 99) - (orderMap[b] || 99));
                        return councilsInResults.map(council => {
                          const councilMembers = searchResults.filter(m => m.council === council);
                          return (
                            <div key={council}>
                              <div className="sticky top-0 flex items-center gap-2 bg-blue-50 px-4 py-1.5">
                                <Church size={12} className="text-nobuk" />
                                <span className="text-[10px] font-bold text-nobuk uppercase tracking-wider">{councilLabels[council] || council.replace(/_/g, " ")}</span>
                              </div>
                              {councilMembers.map(m => (
                                <button key={m.id} type="button"
                                  onClick={() => { setHistoryName(m.name); setShowHistoryDropdown(false); handleHistorySearch(); }}
                                  className="flex w-full items-center gap-3 px-4 py-2 text-left transition-all hover:bg-cream">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nobuk-muted text-xs font-bold text-nobuk">
                                    {m.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-ink truncate">{m.name}</p>
                                    <p className="text-[10px] text-muted">{councilLabels[m.council] || m.council?.replace(/_/g, " ")}{m.gender ? ` · ${m.gender}` : ""}{!m.is_active ? " · inactive" : ""}</p>
                                  </div>
                                  <span className="shrink-0 text-[10px] text-nobuk underline">View</span>
                                </button>
                              ))}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-center text-xs text-muted">
                      {historyName.trim().length >= 1 ? "No matching members found." : "Start typing to search..."}
                    </div>
                  )}
                  {searchResults.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-2">
                      <button onClick={() => { setShowHistoryDropdown(false); handleHistorySearch(); }}
                        className="w-full text-center text-xs font-semibold text-nobuk hover:underline">
                        Search all records for &ldquo;{historyName}&rdquo; →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => { setShowHistoryDropdown(false); handleHistorySearch(); }} disabled={!historyName.trim() || historyLoading}
              className="flex items-center gap-1.5 rounded-xl bg-nobuk px-5 py-3 text-sm font-bold text-white hover:bg-nobuk-light disabled:opacity-40 transition shadow-sm">
              {historyLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Search size={16} />}
              Search
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted">Type to search from database — click a name to see all donations (completed, failed, pending), pledges, and payment attempts with timestamps. Press Enter for broader search.</p>
        </div>

        {historyResult && (
          <MemberHistoryPanel result={historyResult} name={historyName} onClose={() => setHistoryResult(null)} adminRole={admin?.role} token={token} onRefresh={handleHistorySearch} />
        )}

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
                  <p className="text-3xl font-bold text-nobuk">{progress.toFixed(2)}%</p>
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
                    {(s as any).sub && <p className="mt-0.5 text-[10px] text-red-400">{(s as any).sub}</p>}
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
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-ink">Donations</h2>
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
                  <button onClick={async () => {
                    setExporting("pdf");
                    try {
                      const res = await fetch("/api/contributions/export/pdf", { headers: { Authorization: `Bearer ${token}` } });
                      if (!res.ok) return;
                      const blob = await res.blob();
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `AIPCA-Harambee-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    } catch {}
                    setExporting(null);
                  }} disabled={exporting === "pdf"} className="flex items-center gap-1 text-xs text-muted hover:text-nobuk disabled:opacity-40">
                    <Download size={12} /> {exporting === "pdf" ? "..." : "Export PDF"}
                  </button>
                </div>

                {/* Date range + filter bar */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <input type="date" value={donationDateFrom} onChange={(e) => setDonationDateFrom(e.target.value)}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-[10px] text-ink outline-none focus:border-nobuk" />
                    <span className="text-[10px] text-muted">—</span>
                    <input type="date" value={donationDateTo} onChange={(e) => setDonationDateTo(e.target.value)}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-[10px] text-ink outline-none focus:border-nobuk" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["all", "stk", "paybill", "unassigned"].map(f => (
                      <button key={f} onClick={() => setDonationFilter(f as any)}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                          donationFilter === f ? "bg-nobuk text-white" : "bg-gray-100 text-muted hover:bg-gray-200"
                        }`}>
                        {f === "all" ? "All" : f === "stk" ? "STK Push" : f === "paybill" ? "Paybill" : "Unassigned"}
                      </button>
                    ))}
                  </div>
                  {donationsTotal > 0 && (
                    <span className="text-[10px] text-muted ml-auto tabular-nums">{donationsTotal} donation{donationsTotal !== 1 ? "s" : ""}</span>
                  )}
                </div>

                {/* Donations list */}
                <div className="max-h-[520px] overflow-y-auto space-y-1.5">
                  {donationsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-nobuk border-t-transparent" />
                    </div>
                  ) : allDonations.length > 0 ? (
                    allDonations.filter((d: any) => {
                      if (donationFilter === "all" || donationFilter === "unassigned") return true;
                      const isPaybill = !!d.transaction_id || (d.account_reference && d.account_reference.startsWith("C2B:"));
                      return donationFilter === "paybill" ? isPaybill : !isPaybill;
                    }).map((d: any) => {
                      const isPaybill = !!d.transaction_id || (d.account_reference && d.account_reference.startsWith("C2B:"));
                      return (
                        <div key={d.id}>
                          <div className="flex items-center justify-between rounded-lg bg-cream px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="truncate text-sm font-medium text-ink">{d.donor_name || "Anonymous"}</p>
                                {d.honoured?.name && (
                                  <span className="text-xs text-amber-600 truncate">→ {d.honoured.name}</span>
                                )}
                                <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase ${
                                  isPaybill
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}>{isPaybill ? "Paybill" : "STK"}</span>
                                {d.honored_member_id && <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold text-amber-700">Honoured</span>}
                              </div>
                              <p className="text-xs text-muted">{d.created_at ? new Date(d.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {d.receipt_number && <span className="text-[9px] font-mono text-muted">#{d.receipt_number}</span>}
                                {d.transaction_id && <span className="text-[9px] font-mono text-muted">TXN: {d.transaction_id}</span>}
                                {d.phone && <span className="text-[9px] text-muted">{d.phone}</span>}
                              </div>
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
                              <div className="flex items-center gap-1 mt-1 justify-end">
                                {d.status === "completed" && d.phone && (
                                  <button onClick={async () => { await fetch(`/api/mpesa/resend-whatsapp/${d.id}`, { method: "POST" }); }}
                                    className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 hover:bg-blue-200">
                                    WA
                                  </button>
                                )}
                                <button onClick={() => {
                                  setHonouringDonation(honouringDonation === d.id ? null : d.id);
                                  setHonourSearch("");
                                  setHonourResults([]);
                                }}
                                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition ${
                                    d.honored_member_id
                                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                      : "bg-gray-100 text-muted hover:bg-gray-200"
                                  }`}>
                                  {d.honored_member_id ? "Change" : "Honour"}
                                </button>
                              </div>
                            </div>
                          </div>
                          {honouringDonation === d.id && (
                            <div className="px-3 pb-2">
                              <div className="rounded-lg border border-gray-100 bg-white p-2 shadow-sm">
                                <div className="relative">
                                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                                  <input type="text" value={honourSearch} onChange={(e) => {
                                    const val = e.target.value;
                                    setHonourSearch(val);
                                    if (honourTimer.current) clearTimeout(honourTimer.current);
                                    if (val.trim().length >= 1) {
                                      setHonourSearching(true);
                                      honourTimer.current = setTimeout(async () => {
                                        try {
                                          const res = await fetch(`/api/members/search?q=${encodeURIComponent(val.trim())}`, {
                                            headers: { Authorization: `Bearer ${token}` },
                                          });
                                          if (res.ok) { const data = await res.json(); setHonourResults(data.members || []); }
                                        } catch {}
                                        setHonourSearching(false);
                                      }, 200);
                                    } else { setHonourResults([]); setHonourSearching(false); }
                                  }}
                                    placeholder="Search member to honour..."
                                    className="w-full rounded-lg border border-gray-200 pl-7 pr-2 py-1.5 text-xs text-ink outline-none focus:border-nobuk"
                                    autoFocus />
                                </div>
                                {honourSearching && (
                                  <div className="flex items-center justify-center py-2">
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-nobuk border-t-transparent" />
                                  </div>
                                )}
                                {!honourSearching && honourResults.length > 0 && (
                                  <div className="mt-1 max-h-40 overflow-y-auto">
                                    {(() => {
                                      const councils = [...new Set(honourResults.map((m: any) => m.council))];
                                      return councils.map(council => (
                                        <div key={council}>
                                          <div className="sticky top-0 bg-white px-2 py-1 text-[9px] font-bold text-muted uppercase tracking-wider">
                                            {councilLabels[council] || council?.replace(/_/g, " ")}
                                          </div>
                                          {honourResults.filter((m: any) => m.council === council).map((m: any) => (
                                            <button key={m.id} type="button" onClick={async () => {
                                              try {
                                                const res = await fetch(`/api/donations/${d.id}/honour`, {
                                                  method: "PATCH",
                                                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                                  body: JSON.stringify({ honored_member_id: m.id }),
                                                });
                                                if (res.ok) {
                                                  setHonouringDonation(null);
                                                  setHonourSearch("");
                                                  setHonourResults([]);
                                                  fetchDonations(donationDateFrom || undefined, donationDateTo || undefined, false, donationFilter);
                                                }
                                              } catch {}
                                            }}
                                              className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition hover:bg-cream rounded">
                                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-nobuk-muted text-[8px] font-bold text-nobuk">
                                                {m.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-ink truncate">{m.name}</p>
                                                <p className="text-[9px] text-muted">{councilLabels[m.council] || m.council?.replace(/_/g, " ")}</p>
                                              </div>
                                            </button>
                                          ))}
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                )}
                                {!honourSearching && honourSearch.length >= 1 && honourResults.length === 0 && (
                                  <p className="py-2 text-center text-[10px] text-muted">No members found</p>
                                )}
                                <div className="mt-1 flex justify-end">
                                  <button onClick={() => { setHonouringDonation(null); setHonourSearch(""); setHonourResults([]); }}
                                    className="text-[9px] text-muted hover:text-ink font-medium">Cancel</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : <p className="py-8 text-center text-sm text-muted">No donations found</p>}
                  {donationsHasMore && !donationsLoading && (
                    <button onClick={() => fetchDonations(donationDateFrom || undefined, donationDateTo || undefined, true)}
                      className="mt-2 w-full rounded-lg border border-gray-200 py-2 text-xs font-bold text-muted hover:bg-cream transition">
                      Load more ({donationsTotal - donationsOffsetRef.current} remaining)
                    </button>
                  )}
                  {donationsLoading && allDonations.length > 0 && (
                    <div className="flex items-center justify-center py-3">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-nobuk border-t-transparent" />
                    </div>
                  )}
                </div>
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
                          <p className="ml-2 shrink-0 text-xs text-muted">{new Date(log.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
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
          <>

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
                <div ref={addMemberDropdownRef} className="relative">
                  <label className="mb-1 block text-xs font-bold text-muted">Name</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input type="text" value={newName} onChange={(e) => {
                      const val = e.target.value;
                      setNewName(val);
                      setShowAddMemberDropdown(true);
                      if (addMemberTimer.current) clearTimeout(addMemberTimer.current);
                      if (val.trim().length >= 1) {
                        setSearchingMember(true);
                        addMemberTimer.current = setTimeout(async () => {
                          try {
                            const res = await fetch(`/api/members/search?q=${encodeURIComponent(val.trim())}`, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (res.ok) { const d = await res.json(); setAddMemberSearchResults(d.members || []); }
                          } catch {}
                          setSearchingMember(false);
                        }, 200);
                      } else { setAddMemberSearchResults([]); setSearchingMember(false); }
                    }}
                      onFocus={() => setShowAddMemberDropdown(true)}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                  </div>
                  {showAddMemberDropdown && newName.trim() && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg">
                      {searchingMember ? (
                        <div className="flex items-center justify-center py-4"><div className="h-4 w-4 animate-spin rounded-full border-2 border-nobuk border-t-transparent" /></div>
                      ) : addMemberSearchResults.length > 0 ? (
                        (() => {
                          const councilsInResults = [...new Set(addMemberSearchResults.map((m: any) => m.council))];
                          return councilsInResults.map(council => {
                            const members = addMemberSearchResults.filter((m: any) => m.council === council);
                            return (
                              <div key={council}>
                                <div className="sticky top-0 flex items-center gap-2 bg-blue-50 px-3 py-1.5">
                                  <Church size={10} className="text-nobuk" />
                                  <span className="text-[10px] font-bold text-nobuk uppercase tracking-wider">{councilLabels[council] || council.replace(/_/g, " ")}</span>
                                </div>
                                {members.map((m: any) => (
                                  <button key={m.id} type="button" onClick={() => { setNewName(m.name); setNewCouncil(m.council); setNewGender(m.gender || ""); setShowAddMemberDropdown(false); }}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-cream">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-nobuk-muted text-[10px] font-bold text-nobuk">
                                      {m.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-ink truncate">{m.name}</p>
                                      <p className="text-[10px] text-muted">{councilLabels[m.council] || m.council?.replace(/_/g, " ")}{m.gender ? ` · ${m.gender}` : ""}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            );
                          });
                        })()
                      ) : (
                        <div className="px-3 py-3 text-center text-xs text-muted">New member will be added as: <span className="font-bold text-ink">{newName}</span></div>
                      )}
                    </div>
                  )}
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
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Phone (for SMS)</label>
                  <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
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
                        const pdfjsMod = await import("pdfjs-dist");
                        const workerMod = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
                        pdfjsMod.GlobalWorkerOptions.workerSrc = workerMod.default;
                        const pdf = await pdfjsMod.getDocument(buffer).promise;
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
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Phone for all (optional)</label>
                  <input type="tel" value={bulkPhone} onChange={(e) => setBulkPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
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

            {/* Bulk Edit Members */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Pencil size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Bulk Edit Members</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Paste names to reassign</label>
                  <textarea value={bulkEditNames} onChange={(e) => setBulkEditNames(e.target.value)} rows={4}
                    placeholder={"John Kamau\nMary Wambui\nPeter Njoroge\n\nOne name per line — matching names will be updated to the fellowship and gender below"}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk resize-vertical placeholder:text-muted/50" />
                  <p className="mt-1 text-[10px] text-muted">{bulkEditNames.trim() ? (bulkEditNames.trim().split('\n').filter(n => n.trim()).length + " names") : "Paste names above"}</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-bold text-muted">New fellowship</label>
                    <select value={bulkEditCouncil} onChange={(e) => setBulkEditCouncil(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk">
                      <option value="">Select fellowship...</option>
                      {(councils.length ? councils : []).map(c => (
                        <option key={c.slug} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-bold text-muted">New gender</label>
                    <select value={bulkEditGender} onChange={(e) => setBulkEditGender(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk">
                      <option value="">Keep current</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
                {bulkEditResult && (
                  <div className={`rounded-lg border px-3 py-2 text-xs ${bulkEditResult.includes("error") || bulkEditResult.includes("Something") ? "border-red-300 bg-red-50 text-red-700" : "border-green-300 bg-green-50 text-green-700"}`}>
                    {bulkEditResult}
                  </div>
                )}
                <button onClick={handleBulkEdit} disabled={!bulkEditNames.trim() || !bulkEditCouncil}
                  className="w-full rounded-lg bg-nobuk py-2.5 text-sm font-bold text-white hover:bg-nobuk-light disabled:opacity-40">
                  Update {bulkEditNames.trim() ? bulkEditNames.trim().split('\n').filter(n => n.trim()).length : 0} Members
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
              {(dedupResult || mergeResult) && (
                <div className={`mb-3 rounded-lg border px-3 py-2 text-xs ${mergeResult ? "border-blue-300 bg-blue-50 text-blue-700" : "border-green-300 bg-green-50 text-green-700"}`}>{mergeResult || dedupResult}</div>
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
                {selectedMembers.size >= 2 && (
                  <button onClick={handleMerge}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 transition">
                    <GitMerge size={14} /> Merge {selectedMembers.size} selected
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
                    if (r.ok) {
                      const idSet = new Set(ids);
                      setChurchMembers(prev => prev.filter(m => !idSet.has(m.id)));
                    }
                  }}
                    className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100 transition">
                    <Trash2 size={11} /> Delete all
                  </button>
                )}
              </div>
              {churchMembers.length ? (
                <div className="space-y-4">
                  {Object.entries(groupedMembers).sort(([a], [b]) => (COUNCIL_ORDER[a] || 99) - (COUNCIL_ORDER[b] || 99)).map(([council, councilMembers]) => {
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
                                      <input type="tel" value={editMemberPhone}
                                        onChange={e => setEditMemberPhone(e.target.value)}
                                        placeholder="07XX XXX XXX"
                                        className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-ink outline-none focus:border-nobuk" />
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
                                        {m.phone && <p className="text-[10px] text-muted">{m.phone}</p>}
                                      </div>
                                      {m.gender && (
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${m.gender === "male" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                                          {m.gender === "male" ? "M" : "F"}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button onClick={() => { setEditingMember(m.id); setEditMemberName(m.name); setEditMemberCouncil(m.council); setEditMemberGender(m.gender || ""); setEditMemberPhone(m.phone || ""); }}
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
          </>
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
                  <div className="grid gap-3 sm:grid-cols-3">
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
                      <label className="mb-1 block text-xs font-bold text-muted">Phone (for reset)</label>
                      <input type="tel" value={newAdminPhone} onChange={(e) => setNewAdminPhone(e.target.value)}
                        placeholder="0712 345 678"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">Password</label>
                      <div className="relative">
                        <input type={newAdminShowPassword ? "text" : "password"} value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Min 8 chars"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-9 text-sm text-ink outline-none focus:border-nobuk" />
                        <button type="button" onClick={() => setNewAdminShowPassword(p => !p)} tabIndex={-1}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                          {newAdminShowPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">Confirm Password</label>
                      <div className="relative">
                        <input type={newAdminShowConfirm ? "text" : "password"} value={newAdminConfirm} onChange={(e) => setNewAdminConfirm(e.target.value)}
                          placeholder="Repeat password"
                          className="w-full rounded-lg border px-3 py-2 pr-9 text-sm text-ink outline-none focus:border-nobuk"
                          style={{
                            borderColor: newAdminConfirm.length === 0 ? "rgb(229 231 235)" : newAdminPassword === newAdminConfirm ? "rgb(34 197 94)" : "rgb(239 68 68)",
                            backgroundColor: newAdminConfirm.length === 0 ? "" : newAdminPassword === newAdminConfirm ? "rgb(240 253 244)" : "rgb(254 242 242)",
                          }} />
                        <button type="button" onClick={() => setNewAdminShowConfirm(p => !p)} tabIndex={-1}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                          {newAdminShowConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {newAdminConfirm.length > 0 && newAdminPassword !== newAdminConfirm && (
                        <p className="mt-1 text-[10px] text-red-600">Passwords do not match</p>
                      )}
                      {newAdminConfirm.length > 0 && newAdminPassword === newAdminConfirm && (
                        <p className="mt-1 text-[10px] text-green-600">Passwords match</p>
                      )}
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
                      if (newAdminPassword !== newAdminConfirm) { setAdminError("Passwords do not match"); return; }
                      if (newAdminPassword.length < 8) { setAdminError("Password must be at least 8 characters"); return; }
                      setAdminError("");
                      try {
                        const res = await fetch("/api/admin/admins", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ name: newAdminName, email: newAdminEmail, password: newAdminPassword, role: newAdminRole, phone: newAdminPhone }),
                        });
                        if (!res.ok) { const d = await res.json(); setAdminError(d.error || "Something went wrong. Please try again."); return; }
                        setNewAdminName(""); setNewAdminEmail(""); setNewAdminPassword(""); setNewAdminConfirm(""); setNewAdminRole("admin"); setNewAdminPhone("");
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
                        <p className="text-xs text-muted">{a.email}{a.phone ? ` · ${a.phone}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingAdmin(editingAdmin?.id === a.id ? null : a);
                            setEditEmail(a.email);
                            setEditName(a.name);
                            setEditRole(a.role);
                            setEditPhone(a.phone || "");
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
                  <div className="grid gap-3 sm:grid-cols-5">
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
                          <div>
                            <label className="mb-1 block text-xs font-bold text-muted">Phone</label>
                            <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                          </div>
                          <div className="flex items-end gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/users/${a.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ name: editName, email: editEmail, role: editRole, phone: editPhone }),
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
                          setEditCouncilSlug(c.slug);
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
                    <div className="mt-3 border-t border-gray-200 pt-3 space-y-3">
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-bold text-muted">Name</label>
                          <input type="text" value={editCouncilName} onChange={(e) => setEditCouncilName(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-bold text-muted">Slug</label>
                          <input type="text" value={editCouncilSlug} onChange={(e) => setEditCouncilSlug(
                            e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z_0-9]/g, "")
                          )}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono text-ink outline-none focus:border-nobuk" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            if (!editCouncilName.trim()) return;
                            setCouncilMgmtError(""); setCouncilMgmtMsg("");
                            try {
                              const body: Record<string, string> = { name: editCouncilName.trim() };
                              if (editCouncilSlug.trim() && editCouncilSlug.trim() !== c.slug) body.slug = editCouncilSlug.trim();
                              const res = await fetch(`/api/councils/${c.slug}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                body: JSON.stringify(body),
                              });
                              const data = await res.json();
                              if (!res.ok) { setCouncilMgmtError(data.error || "Failed to rename"); return; }
                              setCouncilMgmtMsg(`Updated "${data.council.name}".`);
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
                  {(councils.length ? councils : []).map((c) => {
                    const filtered = committeeMembers.filter(m => m.council === c.slug).sort((a, b) => a.order - b.order);
                    if (filtered.length === 0) return null;
                    return (
                      <div key={c.slug}>
                        <div className="mb-2 flex items-center gap-2">
                          <Church size={14} className="text-muted" />
                          <h3 className="text-xs font-bold text-muted uppercase tracking-wider">{councilLabels[c.slug] || c.name}</h3>
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
                                        {(councils.length ? councils : []).map(c => (
                                          <option key={c.slug} value={c.slug}>{c.name}</option>
                                        ))}
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

                const councilOrder = [...new Set([...(councils.map(c => c.slug)), ...Object.keys(grouped)])].filter(c => grouped[c]?.length).sort((a, b) => (COUNCIL_ORDER[a] || 99) - (COUNCIL_ORDER[b] || 99));

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
                                      p.status === "pending" ? "bg-blue-100 text-blue-800" :
                                      "bg-gray-100 text-gray-600"
                                    }`}>{p.status}</span>
                                  </td>
                                  <td className="py-2 pr-3 text-xs text-muted">{new Date(p.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
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
                                              if (res.ok) { setEditingPledge(null); fetchPledges(); window.dispatchEvent(new Event('pledge:changed')); }
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
                                              if (res.ok) { setPayingPledge(null); setPayAmount(""); setPayReceipt(""); fetchPledges(); window.dispatchEvent(new Event('pledge:changed')); }
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
                                              if (res.ok) { fetchPledges(); window.dispatchEvent(new Event('pledge:changed')); }
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
                    <Download size={12} /> {exporting === "frxlsx" ? "..." : "Export XLSX"}
                  </button>
                  <button onClick={async () => {
                    setExporting("frpdf");
                    try {
                      const res = await fetch("/api/contributions/export/pdf", { headers: { Authorization: `Bearer ${token}` } });
                      if (!res.ok) return;
                      const blob = await res.blob();
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `AIPCA-Harambee-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    } catch {}
                    setExporting(null);
                  }} disabled={exporting === "frpdf"} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-muted hover:bg-cream disabled:opacity-40">
                    <Download size={12} /> {exporting === "frpdf" ? "..." : "PDF Report"}
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
                              <span className="text-amber-dark font-medium whitespace-nowrap">Rate: {Number(f.pledge.fulfillment_rate).toFixed(2)}%</span>
                            </div>
                          </summary>

                          <div className="p-4">
                            {/* Pledge progress bar */}
                            {f.pledge.total > 0 && (
                              <div className="mb-4">
                                <div className="mb-1 flex items-center justify-between text-xs">
                                  <span className="font-semibold text-ink">Pledge Fulfillment</span>
                                  <span className="text-muted tabular-nums">{f.pledge.fulfilled}/{f.pledge.count} fulfilled · {pledgePct.toFixed(2)}%</span>
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
                                  {Number(f.pledge.fulfillment_rate).toFixed(2)}%
                                </p>
                                <p className="text-[10px] text-muted tabular-nums">{f.pledge.active} active · {f.pledge.fulfilled} done</p>
                              </div>
                            </div>

                            {/* Members list */}
                            <div className="mb-4">
                              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                                Members ({f.members?.length || 0})
                              </p>
                              {f.members?.length > 0 ? (
                                <div className="max-h-[200px] overflow-y-auto rounded-lg border border-gray-100">
                                  <table className="w-full text-left text-xs">
                                    <thead className="sticky top-0 bg-gray-50">
                                      <tr className="border-b border-gray-100">
                                        <th className="px-2 py-1.5 font-bold text-muted">#</th>
                                        <th className="px-2 py-1.5 font-bold text-muted">Name</th>
                                        <th className="px-2 py-1.5 font-bold text-muted">Fellowship</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {f.members.map((m: any, i: number) => (
                                        <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-cream">
                                          <td className="px-2 py-1.5 text-muted tabular-nums w-6">{i + 1}</td>
                                          <td className="px-2 py-1.5 font-medium text-ink">{m.name}</td>
                                          <td className="px-2 py-1.5 capitalize text-muted">{f.council.replace(/_/g, " ")}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-muted italic">No members in this fellowship.</p>
                              )}
                            </div>

                            {/* Two-column layout for top donors + methods */}
                            <div className="grid gap-4 md:grid-cols-2">
                              {/* Top donors */}
                              <div>
                                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">All Donors ({f.donation.top_donors?.length || 0})</p>
                                {f.donation.top_donors?.length > 0 ? (
                                  <div className="max-h-[400px] overflow-y-auto rounded-lg border border-gray-100">
                                    <table className="w-full text-left text-xs">
                                      <thead className="sticky top-0 bg-gray-50">
                                        <tr className="border-b border-gray-100">
                                          <th className="px-2 py-1.5 font-bold text-muted w-6">#</th>
                                          <th className="px-2 py-1.5 font-bold text-muted">Donor</th>
                                          <th className="px-2 py-1.5 font-bold text-muted">Phone</th>
                                          <th className="px-2 py-1.5 font-bold text-muted text-right">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {f.donation.top_donors.map((d: any, i: number) => {
                                          const phones = d.phones?.filter(Boolean).join(", ");
                                          return (
                                            <tr key={d.name} className="border-b border-gray-50 last:border-0 hover:bg-cream">
                                              <td className="px-2 py-1.5 text-muted tabular-nums w-6">{i + 1}</td>
                                              <td className="px-2 py-1.5 font-medium text-ink max-w-[140px] truncate">{d.name}</td>
                                              <td className="px-2 py-1.5 text-muted tabular-nums">{phones || "—"}</td>
                                              <td className="px-2 py-1.5 font-semibold text-ink tabular-nums text-right">KES {d.total.toLocaleString("en-KE")}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
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
                  <button onClick={async () => {
                    setExporting("pdf");
                    try {
                      const res = await fetch("/api/contributions/export/pdf", { headers: { Authorization: `Bearer ${token}` } });
                      if (!res.ok) return;
                      const blob = await res.blob();
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `AIPCA-Harambee-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    } catch {}
                    setExporting(null);
                  }} disabled={exporting === "pdf"}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-cream disabled:opacity-40">
                    <Download size={14} /> {exporting === "pdf" ? "..." : "PDF Report"}
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
                      { label: "Pledge Fulfillment", value: `${Number(dashboardData.pledges.fulfillment_rate).toFixed(2)}%`, subtitle: `${dashboardData.pledges.fulfilled}/${dashboardData.pledges.active + dashboardData.pledges.fulfilled} fulfilled`, icon: Target, color: "bg-amber-600" },
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

                  {/* ── Revenue Chart ── */}
                  <div className="mb-6 rounded-lg border border-gray-100 bg-white p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-ink">Revenue Trend</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                          {(["daily", "weekly", "monthly"] as const).map(p => (
                            <button key={p} onClick={() => setChartPeriod(p)}
                              className={`px-2 py-1 text-[10px] font-semibold transition ${
                                chartPeriod === p ? "bg-nobuk text-white" : "text-muted hover:bg-cream"
                              }`}>
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={dashboardData.trends[chartPeriod].slice(-(analyticsRange === "7d" ? 7 : analyticsRange === "30d" ? 30 : analyticsRange === "90d" ? 90 : analyticsRange === "1y" ? 365 : undefined))}>
                        <defs>
                          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey={chartPeriod === "weekly" ? "week" : chartPeriod === "monthly" ? "month" : "date"} tick={{ fontSize: 10 }} tickFormatter={v => chartPeriod === "daily" ? v.slice(5) : v} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} stroke="#9CA3AF" />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                          formatter={(value: number) => [`KES ${value.toLocaleString("en-KE")}`, "Revenue"]}
                          labelFormatter={label => new Date(label + (chartPeriod === "monthly" ? "-02" : "")).toLocaleDateString("en-KE", chartPeriod === "daily" ? { weekday: "short", month: "short", day: "numeric" } : chartPeriod === "weekly" ? { month: "short", day: "numeric" } : { month: "long", year: "numeric" })}
                        />
                        <Area type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* ── Charts grid ── */}
                  <div className="mb-6 grid gap-6 lg:grid-cols-2">

                    {/* Council Breakdown + Fellowship Stats combined */}
                    <div className="rounded-lg border border-gray-100 bg-white p-4">
                      <h3 className="mb-3 text-sm font-bold text-ink">Council Breakdown</h3>
                      <div className="hidden sm:block">
                        <ResponsiveContainer width="100%" height={dashboardData.breakdowns.council.length * 36 + 20}>
                          <BarChart data={[...dashboardData.breakdowns.council].sort((a: any, b: any) => (COUNCIL_ORDER[a.council] || 99) - (COUNCIL_ORDER[b.council] || 99))} layout="vertical" margin={{ left: 16, right: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} stroke="#9CA3AF" />
                            <YAxis type="category" dataKey="council" tick={{ fontSize: 10 }} tickFormatter={v => v.replace(/_/g, " ")} stroke="#9CA3AF" width={100} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 11 }}
                              formatter={(value: number) => [`KES ${value.toLocaleString("en-KE")}`, "Total"]} />
                            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                              {dashboardData.breakdowns.council.map((_: any, i: number) => (
                                <Cell key={i} fill={["#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE"][i % 5]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Compact list for mobile */}
                      <div className="sm:hidden space-y-1.5 max-h-[260px] overflow-y-auto">
                        {[...dashboardData.breakdowns.council].sort((a: any, b: any) => (COUNCIL_ORDER[a.council] || 99) - (COUNCIL_ORDER[b.council] || 99)).map((f: any) => {
                          const maxTotal = Math.max(...dashboardData.breakdowns.council.map((c: any) => c.total));
                          return (
                            <div key={f.council} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-cream transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-medium text-ink truncate">{f.council.replace(/_/g, " ")}</span>
                                  <span className="text-[10px] font-bold text-nobuk tabular-nums shrink-0 ml-1">KES {(f.total / 1000).toFixed(0)}k</span>
                                </div>
                                <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${(f.total / maxTotal) * 100}%` }} />
                                </div>
                                <div className="flex items-center gap-2 text-[9px] text-muted mt-0.5">
                                  <span>{f.member_count} members</span>
                                  <span>·</span>
                                  <span>{f.count} donations</span>
                                  <span>·</span>
                                  <span>avg KES {(f.avg_per_member || 0).toLocaleString("en-KE")}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Desktop table */}
                      <div className="hidden sm:block mt-3">
                        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Fellowship Details</h4>
                        <div className="overflow-x-auto max-h-[240px] overflow-y-auto">
                          <table className="w-full text-left text-[11px]">
                            <thead>
                              <tr className="border-b border-gray-100">
                                <th className="pb-1.5 pr-2 font-bold text-muted">Fellowship</th>
                                <th className="pb-1.5 pr-2 font-bold text-muted text-right">Members</th>
                                <th className="pb-1.5 pr-2 font-bold text-muted text-right">Donations</th>
                                <th className="pb-1.5 pr-2 font-bold text-muted text-right">Total</th>
                                <th className="pb-1.5 font-bold text-muted text-right">Avg</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...dashboardData.breakdowns.council].sort((a: any, b: any) => (COUNCIL_ORDER[a.council] || 99) - (COUNCIL_ORDER[b.council] || 99)).map((f: any, i: number, arr: any[]) => (
                                <tr key={f.council} className={i < arr.length - 1 ? "border-b border-gray-50" : ""}>
                                  <td className="py-1.5 pr-2 font-medium text-ink capitalize whitespace-nowrap">{f.council.replace(/_/g, " ")}</td>
                                  <td className="py-1.5 pr-2 text-right tabular-nums text-ink">{f.member_count}</td>
                                  <td className="py-1.5 pr-2 text-right tabular-nums text-ink">{f.count}</td>
                                  <td className="py-1.5 pr-2 text-right tabular-nums font-bold text-nobuk">KES {f.total.toLocaleString("en-KE")}</td>
                                  <td className="py-1.5 text-right tabular-nums text-muted">KES {f.avg_per_member.toLocaleString("en-KE")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
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
                        <p className="mt-1 text-lg font-bold text-violet-900">{Number(dashboardData.pledges.fulfillment_rate).toFixed(2)}%</p>
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

                  {/* ── Recent Transactions ── */}
                  {dashboardData.recent_transactions?.length > 0 && (
                    <div className="rounded-lg border border-gray-100 bg-white p-4">
                      <h3 className="mb-3 text-sm font-bold text-ink">Recent Transactions</h3>
                      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="pb-2 pr-2 font-bold text-muted">Date & Time</th>
                              <th className="pb-2 pr-2 font-bold text-muted">Donor</th>
                              <th className="pb-2 pr-2 font-bold text-muted text-right">Amount</th>
                              <th className="pb-2 font-bold text-muted">Method</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardData.recent_transactions.slice(0, 30).map((t: any, i: number, arr: any[]) => (
                              <tr key={i} className={i < arr.length - 1 ? "border-b border-gray-50" : ""}>
                                <td className="py-2 pr-2 tabular-nums text-muted whitespace-nowrap">
                                  {new Date(t.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </td>
                                <td className="py-2 pr-2 font-medium text-ink truncate max-w-[140px]">{t.donor_name}</td>
                                <td className="py-2 pr-2 text-right tabular-nums font-bold text-nobuk">KES {t.amount.toLocaleString("en-KE")}</td>
                                <td className="py-2 capitalize text-muted">{t.method}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ── Usage Analysis ── */}
                  {dashboardData.usage && (
                    <div className="rounded-lg border border-gray-100 bg-white p-4">
                      <div className="mb-4 flex items-center gap-2">
                        <BarChart3 size={16} className="text-nobuk" />
                        <h3 className="text-sm font-bold text-ink">Usage Analysis</h3>
                      </div>

                      {/* KPI mini-cards */}
                      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {[
                          { label: "Page Views (7d)", value: dashboardData.system.page_views_7d, color: "bg-blue-50 text-blue-900" },
                          { label: "Page Views (30d)", value: dashboardData.system.page_views_30d, color: "bg-blue-50 text-blue-900" },
                          { label: "Unique Visitors (7d)", value: dashboardData.usage.unique_visitors_7d, color: "bg-violet-50 text-violet-900" },
                          { label: "Unique Visitors (30d)", value: dashboardData.usage.unique_visitors_30d, color: "bg-violet-50 text-violet-900" },
                          { label: "Logins (30d)", value: dashboardData.usage.login_trend.reduce((s: number, d: any) => s + d.success, 0), color: "bg-emerald-50 text-emerald-900" },
                          { label: "Failed Logins (30d)", value: dashboardData.usage.login_trend.reduce((s: number, d: any) => s + d.failed, 0), color: "bg-red-50 text-red-900" },
                        ].map((k) => (
                          <div key={k.label} className={`rounded-lg p-3 text-center ${k.color}`}>
                            <p className="text-xs font-medium opacity-75">{k.label}</p>
                            <p className="mt-0.5 text-lg font-bold">{k.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Charts row 1: Page views trend + Top pages */}
                      <div className="mb-4 grid gap-4 lg:grid-cols-2">
                        {/* Page Views Trend */}
                        <div className="rounded-lg border border-gray-100 p-3">
                          <h4 className="mb-2 text-xs font-bold text-ink">Page Views (Daily Trend)</h4>
                          <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={dashboardData.usage.page_views_trend}>
                              <defs>
                                <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} stroke="#9CA3AF" />
                              <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" allowDecimals={false} />
                              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 11 }} />
                              <Area type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2} fill="url(#pvGrad)" dot={false} activeDot={{ r: 3 }} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Top Pages */}
                        <div className="rounded-lg border border-gray-100 p-3">
                          <h4 className="mb-2 text-xs font-bold text-ink">Most Visited Pages</h4>
                          <div className="space-y-1">
                            {dashboardData.usage.top_pages.map((p: any, i: number) => {
                              const maxCount = dashboardData.usage.top_pages[0].count;
                              const pct = (p.count / maxCount) * 100;
                              return (
                                <div key={p.path} className="flex items-center gap-2">
                                  <span className="w-4 text-[10px] font-bold text-muted text-right shrink-0">{i + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] text-ink truncate">{p.title || p.path}</span>
                                      <span className="text-[10px] font-bold text-nobuk tabular-nums shrink-0 ml-2">{p.count}</span>
                                    </div>
                                    <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                      <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Charts row 2: Hourly + Browser breakdown */}
                      <div className="mb-4 grid gap-4 lg:grid-cols-2">
                        {/* Hourly Activity */}
                        <div className="rounded-lg border border-gray-100 p-3">
                          <h4 className="mb-2 text-xs font-bold text-ink">Activity by Hour (7d)</h4>
                          <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={dashboardData.usage.hourly_breakdown}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickFormatter={v => `${v}:00`} stroke="#9CA3AF" />
                              <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" allowDecimals={false} />
                              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 11 }} />
                              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                                {dashboardData.usage.hourly_breakdown.map((_: any, i: number) => (
                                  <Cell key={i} fill={hourlyBarColors[i]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Browser Breakdown + Unique Visitors */}
                        <div className="rounded-lg border border-gray-100 p-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="mb-2 text-xs font-bold text-ink">Devices (7d)</h4>
                              <ResponsiveContainer width="100%" height={140}>
                                <RePie>
                                  <Pie
                                    data={[
                                      { name: "Mobile", value: dashboardData.usage.browser_breakdown.mobile },
                                      { name: "Desktop", value: dashboardData.usage.browser_breakdown.desktop },
                                      { name: "Tablet", value: dashboardData.usage.browser_breakdown.tablet },
                                      { name: "Unknown", value: dashboardData.usage.browser_breakdown.unknown },
                                    ].filter(d => d.value > 0)}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={30}
                                    outerRadius={55}
                                    paddingAngle={2}
                                  >
                                    {["#8B5CF6", "#3B82F6", "#10B981", "#D1D5DB"].map((c, i) => (
                                      <Cell key={i} fill={c} />
                                    ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 11 }} />
                                </RePie>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex flex-col justify-center space-y-3">
                              <div className="flex items-center gap-2 text-xs">
                                <div className="h-2.5 w-2.5 rounded-full bg-violet-500 shrink-0" />
                                <span className="text-muted">Mobile</span>
                                <span className="ml-auto font-bold text-ink">{dashboardData.usage.browser_breakdown.mobile}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                                <span className="text-muted">Desktop</span>
                                <span className="ml-auto font-bold text-ink">{dashboardData.usage.browser_breakdown.desktop}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-muted">Tablet</span>
                                <span className="ml-auto font-bold text-ink">{dashboardData.usage.browser_breakdown.tablet}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <div className="h-2.5 w-2.5 rounded-full bg-gray-300 shrink-0" />
                                <span className="text-muted">Unknown</span>
                                <span className="ml-auto font-bold text-ink">{dashboardData.usage.browser_breakdown.unknown}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Charts row 3: Login activity */}
                      <div className="grid gap-4 lg:grid-cols-2">
                        {/* Login Trend */}
                        {dashboardData.usage.login_trend.length > 0 && (
                          <div className="rounded-lg border border-gray-100 p-3">
                            <h4 className="mb-2 text-xs font-bold text-ink">Login Activity (Daily)</h4>
                            <ResponsiveContainer width="100%" height={180}>
                              <BarChart data={dashboardData.usage.login_trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} stroke="#9CA3AF" />
                                <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 11 }} />
                                <Bar dataKey="success" stackId="a" fill="#10B981" radius={[2, 2, 0, 0]} name="Success" />
                                <Bar dataKey="failed" stackId="a" fill="#EF4444" radius={[2, 2, 0, 0]} name="Failed" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Recent Logins */}
                        {dashboardData.usage.recent_logins.length > 0 && (
                          <div className="rounded-lg border border-gray-100 p-3">
                            <h4 className="mb-2 text-xs font-bold text-ink">Recent Logins (7d)</h4>
                            <div className="max-h-[180px] overflow-y-auto">
                              <table className="w-full text-left text-[10px]">
                                <thead className="sticky top-0 bg-white">
                                  <tr className="border-b border-gray-100">
                                    <th className="pb-1 pr-1 font-bold text-muted">Admin</th>
                                    <th className="pb-1 pr-1 font-bold text-muted">Status</th>
                                    <th className="pb-1 font-bold text-muted">When</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dashboardData.usage.recent_logins.map((r: any, i: number) => (
                                    <tr key={i} className="border-b border-gray-50 last:border-0">
                                      <td className="py-1 pr-1 font-medium text-ink">{r.admin_name || "—"}</td>
                                      <td className="py-1 pr-1">
                                        <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                          r.action === "login" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                        }`}>
                                          {r.action === "login" ? "Success" : "Failed"}
                                        </span>
                                      </td>
                                      <td className="py-1 text-muted tabular-nums whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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

                        {/* ── Gender Contributions ── */}
                        {dashboardData.members.gender_contributions && (
                          <div className="mt-4 border-t border-gray-100 pt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <DollarSign size={14} className="text-nobuk" />
                              <h4 className="text-xs font-bold text-ink">Contributions by Gender</h4>
                              {(() => {
                                const { male: mM, female: fM } = dashboardData.members.gender_contributions;
                                if (mM === fM) return <span className="text-[10px] font-bold text-gray-500">— TIED</span>;
                                return (
                                  <span className={`flex items-center gap-0.5 text-[10px] font-bold tabular-nums ${mM > fM ? "text-blue-600" : "text-pink-600"}`}>
                                    {mM > fM ? <ArrowUpRight size={11} /> : <ArrowUpRight size={11} />}
                                    {mM > fM ? "Men leading" : "Women leading"}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                                <ResponsiveContainer width={112} height={112}>
                                  <RePie>
                                    <Pie
                                      data={[
                                        { name: "Men", value: dashboardData.members.gender_contributions.male || 1 },
                                        { name: "Women", value: dashboardData.members.gender_contributions.female || 1 },
                                      ]}
                                      dataKey="value"
                                      nameKey="name"
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={30}
                                      outerRadius={52}
                                      paddingAngle={2}
                                    >
                                      <Cell fill="#3B82F6" />
                                      <Cell fill="#EC4899" />
                                    </Pie>
                                    <Tooltip
                                      contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 11 }}
                                      formatter={(value: number) => [`KES ${value.toLocaleString("en-KE")}`, ""]}
                                    />
                                  </RePie>
                                </ResponsiveContainer>
                              </div>
                              <div className="space-y-2 text-sm flex-1">
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                                      <span className="text-xs text-muted">Men</span>
                                    </div>
                                    <span className="text-xs font-bold text-ink tabular-nums">KES {dashboardData.members.gender_contributions.male.toLocaleString("en-KE")}</span>
                                  </div>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{
                                      width: `${(() => {
                                        const total = dashboardData.members.gender_contributions.male + dashboardData.members.gender_contributions.female;
                                        return total > 0 ? (dashboardData.members.gender_contributions.male / total) * 100 : 0;
                                      })()}%`
                                    }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <div className="h-2.5 w-2.5 rounded-full bg-pink-500 shrink-0" />
                                      <span className="text-xs text-muted">Women</span>
                                    </div>
                                    <span className="text-xs font-bold text-ink tabular-nums">KES {dashboardData.members.gender_contributions.female.toLocaleString("en-KE")}</span>
                                  </div>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div className="h-full rounded-full bg-pink-500 transition-all" style={{
                                      width: `${(() => {
                                        const total = dashboardData.members.gender_contributions.male + dashboardData.members.gender_contributions.female;
                                        return total > 0 ? (dashboardData.members.gender_contributions.female / total) * 100 : 0;
                                      })()}%`
                                    }} />
                                  </div>
                                </div>
                                <div className="pt-1 text-[10px] text-muted text-center border-t border-gray-50">
                                  Total: KES {(dashboardData.members.gender_contributions.male + dashboardData.members.gender_contributions.female).toLocaleString("en-KE")}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── System Metrics ── */}
                    <div className="mt-6 rounded-lg border border-gray-100 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <BarChart3 size={16} className="text-nobuk" />
                        <h3 className="text-sm font-bold text-ink">System Activity</h3>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3 mb-4">
                        <div className="rounded-lg bg-blue-50 p-3 text-center">
                          <p className="text-xs font-medium text-blue-700">Total Audit Events</p>
                          <p className="mt-1 text-lg font-bold text-blue-900">{dashboardData.system?.audit_logs_total || 0}</p>
                        </div>
                        <div className="rounded-lg bg-violet-50 p-3 text-center">
                          <p className="text-xs font-medium text-violet-700">Page Views (7d)</p>
                          <p className="mt-1 text-lg font-bold text-violet-900">{dashboardData.system?.page_views_7d || 0}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 p-3 text-center">
                          <p className="text-xs font-medium text-emerald-700">Page Views (30d)</p>
                          <p className="mt-1 text-lg font-bold text-emerald-900">{dashboardData.system?.page_views_30d || 0}</p>
                        </div>
                      </div>
                      {dashboardData.system?.page_views_live?.length > 0 && (
                        <div className="mt-2">
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">Recent Page Views</p>
                          <div className="max-h-[160px] overflow-y-auto rounded-lg border border-gray-100">
                            <table className="w-full text-left text-[10px]">
                              <thead className="sticky top-0 bg-gray-50">
                                <tr className="border-b border-gray-100">
                                  <th className="px-2 py-1 font-bold text-muted">Path</th>
                                  <th className="px-2 py-1 font-bold text-muted">When</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dashboardData.system.page_views_live.slice(0, 10).map((v: any, i: number) => (
                                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-cream">
                                    <td className="px-2 py-1 text-ink font-medium truncate max-w-[200px]">{v.path}</td>
                                    <td className="px-2 py-1 text-muted tabular-nums whitespace-nowrap">{new Date(v.viewed_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Audit Log ── */}
                    {admin.role === "super_admin" && (
                      <div className="mt-6 rounded-lg border border-gray-100 bg-white p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Shield size={16} className="text-nobuk" />
                          <h3 className="text-sm font-bold text-ink">Audit Log ({dashboardData.system?.audit_logs_total || 0})</h3>
                        </div>
                        {logs.length > 0 ? (
                          <div className="max-h-[400px] overflow-y-auto rounded-lg border border-gray-100">
                            <table className="w-full text-left text-xs">
                              <thead className="sticky top-0 bg-gray-50">
                                <tr className="border-b border-gray-100">
                                  <th className="px-2 py-1.5 font-bold text-muted">Admin</th>
                                  <th className="px-2 py-1.5 font-bold text-muted">Action</th>
                                  <th className="px-2 py-1.5 font-bold text-muted">When</th>
                                </tr>
                              </thead>
                              <tbody>
                                {logs.map((log: any) => (
                                  <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-cream">
                                    <td className="px-2 py-1.5 font-medium text-ink">{log.admin_name || log.admin_id?.slice(0, 8)}</td>
                                    <td className="px-2 py-1.5 text-muted capitalize">{log.action.replace(/_/g, " ")}</td>
                                    <td className="px-2 py-1.5 text-muted tabular-nums whitespace-nowrap">{new Date(log.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-muted py-2">No audit events recorded yet. Audit events are generated as you use the admin panel.</p>
                        )}
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

              {/* ── External Analytics (PostHog / Sentry) ── */}
              <div className="mt-8 border-t border-gray-100 pt-8">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink">
                  <ExternalLink size={14} />
                  External Analytics
                </h3>
                <div className="flex flex-wrap gap-4">
                  <a href="https://us.posthog.com/project/488895" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm text-muted transition hover:border-nobuk hover:text-nobuk">
                    <BarChart3 size={16} />
                    Open PostHog Dashboard
                  </a>
                  <a href="https://swolf-tech.sentry.io" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm text-muted transition hover:border-nobuk hover:text-nobuk">
                    <AlertTriangle size={16} />
                    Open Sentry Dashboard
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "security" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-nobuk" />
                <h2 className="text-lg font-bold text-ink">Security Console</h2>
              </div>
              <div className="flex items-center gap-3">
                <select value={secFilter} onChange={e => setSecFilter(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-muted">
                  <option value="">All events</option>
                  <option value="failed_login">Failed logins</option>
                  <option value="suspicious_activity">Suspicious activity</option>
                  <option value="rate_limit_blocked">Rate limited</option>
                  <option value="stk_rate_limited">STK rate limited</option>
                  <option value="password_reset">Password resets</option>
                  <option value="login">Logins</option>
                </select>
                <button onClick={fetchSecurityEvents} className="rounded-lg p-2 text-muted transition hover:bg-cream" title="Refresh">
                  <RefreshCw size={14} className={secLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-3">
              {[
                { key: "failed_login", label: "Failed Logins", color: "bg-red-100 text-red-700" },
                { key: "suspicious_activity", label: "Suspicious", color: "bg-orange-100 text-orange-700" },
                { key: "rate_limit_blocked", label: "Rate Limited", color: "bg-yellow-100 text-yellow-700" },
                { key: "stk_rate_limited", label: "STK Limited", color: "bg-yellow-100 text-yellow-700" },
                { key: "ip_blocked", label: "IP Blocked", color: "bg-red-100 text-red-700" },
              ].map(b => (
                <div key={b.key} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${b.color}`}>
                  {b.label}: {secSummary[b.key] || 0}
                  <span className="ml-1 text-[10px] opacity-60">/24h</span>
                </div>
              ))}
            </div>
            {secLoading && secEvents.length === 0 ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-nobuk border-t-transparent" />
              </div>
            ) : secEvents.length === 0 ? (
              <div className="py-12 text-center">
                <Shield size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-muted">No security events in the last 24 hours. All clear.</p>
              </div>
            ) : (
              <div className="max-h-[600px] space-y-1 overflow-y-auto">
                {(secFilter ? secEvents.filter(e => e.action === secFilter) : secEvents).map((ev: any) => {
                  let color = "border-gray-200 bg-gray-50";
                  let dot = "bg-gray-400";
                  if (ev.action === "failed_login" || ev.action === "ip_blocked") { color = "border-red-200 bg-red-50"; dot = "bg-red-500"; }
                  else if (ev.action === "suspicious_activity") { color = "border-orange-200 bg-orange-50"; dot = "bg-orange-500"; }
                  else if (ev.action === "rate_limit_blocked" || ev.action === "stk_rate_limited") { color = "border-yellow-200 bg-yellow-50"; dot = "bg-yellow-500"; }
                  else if (ev.action === "login") { color = "border-green-200 bg-green-50"; dot = "bg-green-500"; }

                  const details = ev.details ? (typeof ev.details === "string" ? JSON.parse(ev.details) : ev.details) : {};
                  const ip = ev.ip_address || details?.ip || "-";

                  return (
                    <div key={ev.id} className={`flex items-start gap-3 rounded-lg border p-3 text-xs ${color}`}>
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-ink">{ev.action.replace(/_/g, " ")}</p>
                        <p className="mt-0.5 text-muted">
                          {ip !== "-" && <span className="font-mono">{ip}</span>}
                          {details?.reason && <span className="ml-2">· {details.reason}</span>}
                          {ev.resource_id && <span className="ml-2">· ID: {ev.resource_id}</span>}
                        </p>
                      </div>
                      <span className="shrink-0 text-muted">{new Date(ev.created_at).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-[10px] text-muted">Auto-refreshes every 30s · Events from last 24 hours</p>
          </div>
        )}

        {tab === "sitecontent" && <SiteContentEditor />}

        {showSessions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowSessions(false)}>
            <div className="mx-4 w-full max-w-lg rounded-2xl border border-white/10 bg-white p-6 shadow-2xl backdrop-blur" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">Active Sessions</h2>
                <button onClick={() => setShowSessions(false)} className="text-sm text-muted hover:text-ink">&times;</button>
              </div>
              {loadingSessions ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-nobuk border-t-transparent" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">No active sessions.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-cream px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {s.userAgent ? parseUserAgent(s.userAgent) : "Unknown device"}
                          {s.isCurrent && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Current</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {s.ipAddress || "Unknown IP"} &middot; {formatDate(s.createdAt)}
                        </p>
                      </div>
                      {!s.isCurrent && (
                        <button
                          onClick={() => revokeSession(s.id)}
                          className="ml-3 shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-50"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
    church_name: "AIPCA Bahati Cathedral",
    church_address: "",
    goal_amount: 30000000,
    church_phone: "0727278577",
    whatsapp_phone: "0728066733",
    cards: [
      { title_en: "Our Goal", text_en: "" },
      { title_en: "Our Community", text_en: "" },
      { title_en: "Give with Purpose", text_en: "" },
    ],
    about_desc_en: "",
    harambee_reason_en: "",
    harambee_starts_at: "",
    harambee_ends_at: "",
  });

  const [admin, setAdminLocal] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // Campaign creation form
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampTitle, setNewCampTitle] = useState("");
  const [newCampDesc, setNewCampDesc] = useState("");
  const [newCampGoal, setNewCampGoal] = useState("");
  const [newCampSlug, setNewCampSlug] = useState("");
  const [campMsg, setCampMsg] = useState("");

  // Backup
  const [backups, setBackups] = useState<any[]>([]);
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");

  // SMS stats (local, not from parent scope)
  const [smsStats, setSmsStats] = useState<any>(null);
  const smsSent = smsStats?.total_sent ?? 0;
  const smsFailed = smsStats?.total_failed ?? 0;
  const smsCost = smsStats?.total_cost ?? 0;

  useEffect(() => {
    const stored = localStorage.getItem("admin");
    if (stored) setAdminLocal(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    Promise.all([
      fetch("/api/settings").then(r => r.ok ? r.json() : null),
      fetch("/api/admin/campaigns", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      fetch("/api/admin/backups", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
    ]).then(([settingsData, campData, backupData, statsData]) => {
      if (settingsData?.settings) {
        setContent(prev => ({
          ...prev,
          church_phone: settingsData.settings.church_phone || prev.church_phone,
          whatsapp_phone: settingsData.settings.whatsapp_phone || prev.whatsapp_phone,
        }));
        if (settingsData.settings.site_content) {
          try {
            const parsed = JSON.parse(settingsData.settings.site_content);
            setContent(prev => ({ ...prev, ...parsed }));
          } catch {}
        }
      }
      if (campData?.campaigns) setCampaigns(campData.campaigns);
      if (backupData?.backups) setBackups(backupData.backups);
      if (statsData?.sms) setSmsStats(statsData.sms);
      setLoading(false);
    }).catch(() => setLoading(false));
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
      const cards = await Promise.all(content.cards.map(async (card) => ({
        title_en: card.title_en,
        title_sw: await translateText(card.title_en),
        text_en: card.text_en,
        text_sw: await translateText(card.text_en),
      })));
      const about_desc_sw = await translateText(content.about_desc_en);
      const harambee_reason_sw = await translateText(content.harambee_reason_en);
      setTranslating(false); setMsg("Saving...");
      const payload = { goal_amount: content.goal_amount, cards, about_desc_en: content.about_desc_en, about_desc_sw, harambee_reason_en: content.harambee_reason_en, harambee_reason_sw, church_name: content.church_name, church_address: content.church_address, harambee_starts_at: content.harambee_starts_at, harambee_ends_at: content.harambee_ends_at };
      const token = localStorage.getItem("token");
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ site_content: JSON.stringify(payload), church_phone: content.church_phone, whatsapp_phone: content.whatsapp_phone }),
      });
      if (res.ok) setMsg("Saved successfully!"); else setMsg("Failed to save");
    } catch { setMsg("Network error"); }
    setSaving(false); setTranslating(false);
  }

  const [waTestMsg, setWaTestMsg] = useState("");
  const [waTesting, setWaTesting] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState("");

  async function handleTestWhatsApp() {
    const num = waTestPhone.trim() || content.whatsapp_phone.trim();
    if (!num) return;
    setWaTesting(true); setWaTestMsg("Sending...");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/mpesa/test-whatsapp", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: num }),
      });
      const data = await res.json();
      setWaTestMsg(data.ok ? "Test message sent successfully!" : data.error || "Failed");
    } catch { setWaTestMsg("Network error"); }
    setWaTesting(false);
  }

  async function handleActivateCampaign(id: string) {
    setCampMsg(""); setCampaignsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/campaigns/${id}/activate`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setCampMsg(`Now displaying: ${data.campaign.title}`);
        const campRes = await fetch("/api/admin/campaigns", { headers: { Authorization: `Bearer ${token}` } });
        const campData = await campRes.json();
        if (campData?.campaigns) setCampaigns(campData.campaigns);
      } else setCampMsg(data.error || "Failed");
    } catch { setCampMsg("Network error"); }
    setCampaignsLoading(false);
  }

  async function handleCreateCampaign() {
    if (!newCampTitle || !newCampGoal) { setCampMsg("Title and goal required"); return; }
    setCampMsg(""); setCampaignsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newCampTitle, description: newCampDesc, goal: Number(newCampGoal), slug: newCampSlug || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setCampMsg(`Campaign "${data.campaign.title}" created!`);
        setShowNewCampaign(false); setNewCampTitle(""); setNewCampDesc(""); setNewCampGoal(""); setNewCampSlug("");
        const campRes = await fetch("/api/admin/campaigns", { headers: { Authorization: `Bearer ${token}` } });
        const campData = await campRes.json();
        if (campData?.campaigns) setCampaigns(campData.campaigns);
      } else setCampMsg(data.error || "Failed");
    } catch { setCampMsg("Network error"); }
    setCampaignsLoading(false);
  }

  async function handleBackup() {
    setBackingUp(true); setBackupMsg("Running backup...");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/backup", {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setBackupMsg(`Backup complete! ID: ${data.backup_id.slice(0, 8)}... Tables: ${Object.keys(data.summary).join(", ")}`);
        const bRes = await fetch("/api/admin/backups", { headers: { Authorization: `Bearer ${token}` } });
        const bData = await bRes.json();
        if (bData?.backups) setBackups(bData.backups);
      } else setBackupMsg(data.error || "Backup failed");
    } catch { setBackupMsg("Network error"); }
    setBackingUp(false);
  }

  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-nobuk border-t-transparent" /></div>;

  const isSuper = admin?.role === "super_admin";

  return (
    <div className="space-y-6">

      {/* ─── Site Content ─── */}
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

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Church Name */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Church Name</label>
            <input type="text" value={content.church_name} onChange={e => setContent({...content, church_name: e.target.value})}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none focus:border-nobuk" placeholder="AIPCA Bahati Cathedral" />
          </div>

          {/* Church Phone */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Church Phone</label>
            <input type="text" value={content.church_phone} onChange={e => setContent({...content, church_phone: e.target.value})}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none focus:border-nobuk" />
          </div>

          {/* WhatsApp Phone */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">WhatsApp Number</label>
            <div className="flex items-center gap-2">
              <input type="text" value={content.whatsapp_phone} onChange={e => setContent({...content, whatsapp_phone: e.target.value})}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none focus:border-nobuk" />
              <button onClick={handleTestWhatsApp} disabled={waTesting || !content.whatsapp_phone.trim()}
                className="btn-lift flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-40">
                <Send size={14} /> {waTesting ? "..." : "Test"}
              </button>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input type="text" value={waTestPhone} onChange={e => setWaTestPhone(e.target.value)} placeholder="Custom number (optional)"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-ink outline-none focus:border-nobuk placeholder:text-muted/50" />
              <button onClick={() => { const n = waTestPhone.trim(); if (!n) return; setWaTesting(true); setWaTestMsg("Sending..."); const t = localStorage.getItem("token"); fetch("/api/mpesa/test-whatsapp", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ phone: n }) }).then(r => r.json()).then(d => { setWaTestMsg(d.ok ? "Sent!" : d.error || "Failed"); setWaTesting(false); }).catch(() => { setWaTestMsg("Error"); setWaTesting(false); }); }}
                disabled={waTesting || !waTestPhone.trim()}
                className="rounded-lg border border-green-300 px-2 py-1 text-[10px] font-semibold text-green-700 hover:bg-green-50 disabled:opacity-40 transition">
                Send
              </button>
            </div>
            {waTestMsg && (
              <p className={`mt-1 text-xs ${waTestMsg.includes("success") || waTestMsg === "Sent!" ? "text-green-600" : "text-red-600"}`}>{waTestMsg}</p>
            )}
          </div>

          {/* Church Address */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Church Address</label>
            <input type="text" value={content.church_address} onChange={e => setContent({...content, church_address: e.target.value})}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none focus:border-nobuk" placeholder="P.O. Box 123, Bahati, Kenya" />
          </div>

          {/* Goal */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Goal Amount (KES)</label>
            <input type="number" value={content.goal_amount} onChange={e => setContent({...content, goal_amount: Number(e.target.value)})}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none focus:border-nobuk" />
          </div>

          {/* Harambee Start */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Harambee Start Date</label>
            <input type="date" value={content.harambee_starts_at?.split("T")[0] || ""} onChange={e => setContent({...content, harambee_starts_at: e.target.value})}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none focus:border-nobuk" />
          </div>

          {/* Harambee End */}
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Harambee End Date</label>
            <input type="date" value={content.harambee_ends_at?.split("T")[0] || ""} onChange={e => setContent({...content, harambee_ends_at: e.target.value})}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none focus:border-nobuk" />
          </div>
        </div>

        {/* About description */}
        <div className="mt-6">
          <label className="mb-1.5 block text-sm font-bold text-ink">About Description</label>
          <textarea value={content.about_desc_en} onChange={e => setContent({...content, about_desc_en: e.target.value})} rows={2}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none focus:border-nobuk" placeholder="The construction of this Great House of God started in 2006..." />
        </div>

        {/* Harambee reason */}
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-bold text-ink">Harambee Reason</label>
          <textarea value={content.harambee_reason_en} onChange={e => setContent({...content, harambee_reason_en: e.target.value})} rows={2}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none focus:border-nobuk" placeholder="Together we are building the house of the Lord..." />
        </div>

        {/* Cards */}
        <h3 className="mb-3 mt-6 text-sm font-bold text-ink uppercase tracking-wider">Objectives Cards</h3>
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

      {/* ─── Campaign Management (super admin only) ─── */}
      {isSuper && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Campaign Management</h2>
            <button onClick={() => setShowNewCampaign(!showNewCampaign)}
              className="btn-lift flex items-center gap-1.5 rounded-xl bg-nobuk px-4 py-2 text-xs font-bold text-white hover:bg-nobuk-light">
              <Plus size={14} /> {showNewCampaign ? "Cancel" : "New Harambee"}
            </button>
          </div>
          {campMsg && (
            <div className={`mb-3 rounded-lg px-4 py-2 text-sm font-medium text-white ${camMsg.includes("error") || camMsg.includes("Failed") ? "bg-red-500" : "bg-green-600"}`}>
              {campMsg}
            </div>
          )}

          {/* Create new campaign form */}
          {showNewCampaign && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-bold text-ink">New Harambee Campaign</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">Title *</label>
                  <input type="text" value={newCampTitle} onChange={e => setNewCampTitle(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" placeholder="Development Fund" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">Slug (optional)</label>
                  <input type="text" value={newCampSlug} onChange={e => setNewCampSlug(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" placeholder="development-fund" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink">Goal (KES) *</label>
                  <input type="number" value={newCampGoal} onChange={e => setNewCampGoal(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" placeholder="30000000" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-ink">Description</label>
                  <textarea value={newCampDesc} onChange={e => setNewCampDesc(e.target.value)} rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" placeholder="Building the house of the Lord..." />
                </div>
              </div>
              <button onClick={handleCreateCampaign} disabled={campaignsLoading || !newCampTitle || !newCampGoal}
                className="btn-lift mt-3 rounded-xl bg-nobuk px-5 py-2 text-sm font-bold text-white hover:bg-nobuk-light disabled:opacity-50">
                {campaignsLoading ? "Creating..." : "Create Campaign"}
              </button>
            </div>
          )}

          {/* Campaign list */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 font-bold text-muted">Campaign</th>
                  <th className="pb-2 font-bold text-muted">Goal</th>
                  <th className="pb-2 font-bold text-muted">Raised</th>
                  <th className="pb-2 font-bold text-muted">%</th>
                  <th className="pb-2 font-bold text-muted">Status</th>
                  <th className="pb-2 font-bold text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c: any) => {
                  const pct = c.goal > 0 ? Math.min((c.raised / c.goal) * 100, 100) : 0;
                  return (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="py-2.5 font-semibold text-ink">{c.title}</td>
                      <td className="py-2.5 tabular-nums text-muted">KES {c.goal.toLocaleString()}</td>
                      <td className="py-2.5 tabular-nums text-muted">KES {c.raised.toLocaleString()}</td>
                      <td className="py-2.5 tabular-nums text-muted">{pct.toFixed(1)}%</td>
                      <td className="py-2.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${c.is_displayed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                          {c.is_displayed ? "Displayed" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2.5">
                        {!c.is_displayed && (
                          <button onClick={() => handleActivateCampaign(c.id)} disabled={campaignsLoading}
                            className="rounded-lg bg-nobuk px-3 py-1 text-[10px] font-bold text-white hover:bg-nobuk-light disabled:opacity-40">
                            Set as current
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[10px] text-muted">The "Displayed" campaign is shown on every page. Old campaigns are preserved with their donation history.</p>
        </div>
      )}

      {/* ─── Database Backup (super admin only) ─── */}
      {isSuper && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Database Backup</h2>
            <button onClick={handleBackup} disabled={backingUp}
              className="btn-lift flex items-center gap-1.5 rounded-xl bg-nobuk px-4 py-2 text-xs font-bold text-white hover:bg-nobuk-light disabled:opacity-50">
              <RefreshCw size={14} className={backingUp ? "animate-spin" : ""} />
              {backingUp ? "Backing up..." : "Backup Now"}
            </button>
          </div>
          {backupMsg && (
            <div className={`mb-3 rounded-lg px-4 py-2 text-sm font-medium text-white ${backupMsg.includes("complete") ? "bg-green-600" : "bg-red-500"}`}>
              {backupMsg}
            </div>
          )}
          {backups.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 font-bold text-muted">Date</th>
                    <th className="pb-2 font-bold text-muted">Tables</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.slice(0, 10).map((b: any) => (
                    <tr key={b.id} className="border-b border-gray-50">
                      <td className="py-2 tabular-nums text-ink">{formatDate(b.created_at)}</td>
                      <td className="py-2 text-muted">{b.summary ? Object.entries(b.summary).map(([k, v]) => `${k}:${v}`).join(", ") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-[10px] text-muted">Daily automatic backup runs at 6 AM UTC via Vercel Cron. Also pushes to GitHub if GITHUB_TOKEN is configured.</p>
        </div>
      )}

      {/* ─── Bulk SMS ─── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-ink">Bulk SMS Campaign</h2>
        <p className="mb-3 text-sm text-muted">Send an SMS to all church members with phone numbers on record.</p>
        <div className="mb-3">
          <label className="mb-1.5 block text-sm font-bold text-ink">Message</label>
          <BulkSmsComposer />
        </div>
      </div>

      {/* SMS History */}
      {smsStats?.recent?.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-ink">Recent SMS Activity</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 font-bold text-muted">Phone</th>
                  <th className="pb-2 font-bold text-muted">Status</th>
                  <th className="pb-2 font-bold text-muted">Message</th>
                  <th className="pb-2 font-bold text-muted">Time</th>
                </tr>
              </thead>
              <tbody>
                {smsStats.recent.map((s: any) => (
                  <tr key={s.created_at} className="border-b border-gray-50">
                    <td className="py-2 tabular-nums text-ink">{s.phone}</td>
                    <td className="py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${s.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate py-2 text-muted">{s.message_preview || "—"}</td>
                    <td className="py-2 tabular-nums text-muted">{formatDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[10px] text-muted">Total sent: {smsSent} · Failed: {smsFailed} · Total cost: KES {smsCost.toLocaleString("en-KE", {minimumFractionDigits:2})}</p>
        </div>
      )}
    </div>
  );
}

function BulkSmsComposer() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<null | { total: number; sent: number; failed: number }>(null);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/admin/send-bulk-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      setResult(data);
      setMessage("");
    } catch { setError("Network error"); }
    setSending(false);
  };

  return (
    <div>
      <textarea value={message} onChange={e => setMessage(e.target.value)}
        placeholder="Type your campaign message here... e.g. 'Habari familia! Karibu kushiriki katika Harambee yetu. Bonyeza link: https://aipcaharambee.com ...'"
        rows={3} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-ink outline-none focus:border-nobuk placeholder:text-muted/50" />
      <div className="mt-2 flex items-center gap-3">
        <button onClick={handleSend} disabled={sending || !message.trim()}
          className="btn-lift flex items-center gap-1.5 rounded-xl bg-nobuk px-5 py-2 text-sm font-bold text-white hover:bg-nobuk-light disabled:opacity-50">
          <Send size={14} /> {sending ? "Sending..." : `Send to All Members`}
        </button>
        {result && (
          <span className="text-xs text-green-700">
            Sent to {result.sent}/{result.total} members {result.failed > 0 ? `(${result.failed} failed)` : ""}
          </span>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}

function parseUserAgent(ua: string): string {
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Postman")) return "Postman";
  if (ua.includes("curl")) return "cURL";
  return ua.slice(0, 40) + (ua.length > 40 ? "…" : "");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleString("en-KE", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
