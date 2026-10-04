"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Database,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Lock,
  X,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Kategori = "Belanja" | "Pendapatan" | "Pembiayaan";

interface RekeningRow {
  id: number;
  kategori: string;
  kode: string;
  uraian: string;
  deskripsi: string;
  contoh: string;
}

interface RekeningResponse {
  kategori: string;
  q: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: RekeningRow[];
}

interface StatsResponse {
  total: number;
  counts: Record<string, number>;
  lastSync: string | null;
  logs: Array<{
    id: number;
    kategori: string;
    rowCount: number;
    status: string;
    message: string;
    createdAt: string;
  }>;
}

const KATEGORI_LIST: Kategori[] = ["Belanja", "Pendapatan", "Pembiayaan"];
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];

// Empty form template for add/edit
const EMPTY_FORM = {
  kategori: "Belanja" as Kategori,
  kode: "",
  uraian: "",
  deskripsi: "",
  contoh: "",
};

/** Highlight occurrences of `query` inside `text` (case-insensitive). */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts: Array<{ s: string; hit: boolean }> = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(ql, i);
    if (idx === -1) {
      parts.push({ s: text.slice(i), hit: false });
      break;
    }
    if (idx > i) parts.push({ s: text.slice(i, idx), hit: false });
    parts.push({ s: text.slice(idx, idx + q.length), hit: true });
    i = idx + q.length;
  }
  return (
    <>
      {parts.map((p, idx) =>
        p.hit ? (
          <mark
            key={idx}
            className="rounded bg-amber-300/80 px-0.5 text-amber-950"
          >
            {p.s}
          </mark>
        ) : (
          <span key={idx}>{p.s}</span>
        )
      )}
    </>
  );
}

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

export default function HomePage() {
  const [kategori, setKategori] = useState<Kategori>("Belanja");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [data, setData] = useState<RekeningResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [syncing, setSyncing] = useState(false);

  // ===== Admin state =====
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState(false); // toggles inline edit controls
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // add/edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);

  // delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<RekeningRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // change password
  const [pwOpen, setPwOpen] = useState(false);
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwShowOld, setPwShowOld] = useState(false);
  const [pwShowNew, setPwShowNew] = useState(false);

  // Debounce search input -> q
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  // Fetch rekening rows
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        kategori,
        q,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/rekening?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: RekeningResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [kategori, q, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (!res.ok) return;
      const json: StatsResponse = await res.json();
      setStats(json);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Check admin session on mount
  const checkAdmin = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setIsAdmin(!!json.isAdmin);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  // ===== Admin actions =====
  const handleLogin = async () => {
    if (!loginPassword) return;
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Login gagal");
      }
      setIsAdmin(true);
      setAdminMode(true);
      setLoginOpen(false);
      setLoginPassword("");
      toast({
        title: "Login berhasil",
        description: "Mode admin aktif. Anda dapat menambah, mengedit, dan menghapus.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Login gagal",
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAdmin(false);
    setAdminMode(false);
    toast({ title: "Logout berhasil", description: "Anda keluar dari mode admin." });
  };

  const openCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setForm({ ...EMPTY_FORM, kategori });
    setFormOpen(true);
  };

  const openEdit = (row: RekeningRow) => {
    setFormMode("edit");
    setEditingId(row.id);
    setForm({
      kategori: row.kategori as Kategori,
      kode: row.kode,
      uraian: row.uraian,
      deskripsi: row.deskripsi,
      contoh: row.contoh === "--" ? "" : row.contoh,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.kode.trim() || !form.uraian.trim()) {
      toast({
        variant: "destructive",
        title: "Validasi gagal",
        description: "Kode dan Uraian wajib diisi.",
      });
      return;
    }
    setFormSaving(true);
    try {
      const isEdit = formMode === "edit" && editingId !== null;
      const url = isEdit
        ? `/api/rekening/${editingId}`
        : "/api/rekening";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      toast({
        title: isEdit ? "Rekening diperbarui" : "Rekening ditambahkan",
        description: `${form.kode} — ${form.uraian}`,
      });
      setFormOpen(false);
      // If the edited/created row's kategori differs from current view, switch to it
      if (form.kategori !== kategori) {
        setKategori(form.kategori);
      } else {
        await fetchData();
      }
      await fetchStats();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan",
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/rekening/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      toast({
        title: "Rekening dihapus",
        description: `${deleteTarget.kode} — ${deleteTarget.uraian}`,
      });
      setDeleteTarget(null);
      await fetchData();
      await fetchStats();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Gagal menghapus",
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ===== Change password =====
  const handleChangePassword = async () => {
    if (!pwOld || !pwNew || !pwConfirm) {
      toast({
        variant: "destructive",
        title: "Validasi gagal",
        description: "Semua kolom wajib diisi.",
      });
      return;
    }
    if (pwNew !== pwConfirm) {
      toast({
        variant: "destructive",
        title: "Validasi gagal",
        description: "Password baru dan konfirmasi tidak cocok.",
      });
      return;
    }
    if (pwNew.length < 6) {
      toast({
        variant: "destructive",
        title: "Validasi gagal",
        description: "Password baru minimal 6 karakter.",
      });
      return;
    }
    if (pwOld === pwNew) {
      toast({
        variant: "destructive",
        title: "Validasi gagal",
        description: "Password baru harus berbeda dari password lama.",
      });
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: pwOld,
          newPassword: pwNew,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      toast({
        title: "Password berhasil diubah",
        description:
          "Gunakan password baru saat login berikutnya. Password lama tidak berlaku lagi.",
      });
      setPwOpen(false);
      setPwOld("");
      setPwNew("");
      setPwConfirm("");
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Gagal mengubah password",
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setPwLoading(false);
    }
  };

  // ===== Sync =====
  const handleSync = async () => {
    setSyncing(true);
    toast({
      title: "Memulai sinkronisasi",
      description: "Memperbarui data rekening sesuai Permendagri 90 Tahun 2019...",
    });
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      toast({
        title: "Sinkronisasi berhasil",
        description: `${formatNumber(json.total)} rekening diperbarui dari sumber.`,
      });
      await fetchStats();
      await fetchData();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Sinkronisasi gagal",
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSyncing(false);
    }
  };

  const counts = stats?.counts ?? {};
  const total = stats?.total ?? 0;
  const lastSync = stats?.lastSync ?? null;

  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? 1;
  const totalRows = data?.total ?? 0;
  const showingFrom = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, totalRows);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-amber-200 via-yellow-100 to-amber-200 text-slate-800">
      {/* ===== Decorative diamond corners (echo of the KAREBA banner) ===== */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 0% 0%, #92400e 0, transparent 22%), radial-gradient(circle at 100% 0%, #92400e 0, transparent 22%), radial-gradient(circle at 0% 100%, #92400e 0, transparent 22%), radial-gradient(circle at 100% 100%, #92400e 0, transparent 22%)",
        }}
      />

      {/* ===== Header / Nav ===== */}
      <header className="sticky top-0 z-30 border-b border-amber-700/30 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white shadow-lg">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/40 backdrop-blur">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <h1 className="text-xl font-extrabold tracking-tight drop-shadow-sm sm:text-2xl">
                KAREBA
              </h1>
              <p className="text-[10px] font-medium text-amber-50 sm:text-[11px]">
                Kamus Rekening Belanja · Kenali Rekening, Pahami Belanja.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="hidden bg-white/20 text-amber-50 ring-1 ring-white/30 hover:bg-white/25 sm:inline-flex"
            >
              <Database className="mr-1 h-3.5 w-3.5" />
              {formatNumber(total)} rekening
            </Badge>

            {/* Admin controls */}
            {isAdmin ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPwOpen(true)}
                  className="border-white/60 bg-transparent text-white hover:bg-white/15"
                >
                  <KeyRound className="mr-1.5 h-4 w-4" />
                  Ganti Password
                </Button>
                <Button
                  size="sm"
                  variant={adminMode ? "secondary" : "outline"}
                  onClick={() => setAdminMode((v) => !v)}
                  className={
                    adminMode
                      ? "border-0 bg-white text-amber-800 hover:bg-amber-50"
                      : "border-white/60 bg-transparent text-white hover:bg-white/15"
                  }
                >
                  <ShieldCheck className="mr-1.5 h-4 w-4" />
                  {adminMode ? "Mode Admin Aktif" : "Mode Admin"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLogout}
                  className="border-white/60 bg-transparent text-white hover:bg-white/15"
                >
                  <LogOut className="mr-1.5 h-4 w-4" />
                  Keluar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setLoginOpen(true)}
                className="bg-white text-amber-800 hover:bg-amber-50"
              >
                <Lock className="mr-1.5 h-4 w-4" />
                Admin
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="hidden bg-amber-900 text-amber-50 hover:bg-amber-950 sm:inline-flex"
            >
              <RefreshCw
                className={cn("mr-1.5 h-4 w-4", syncing && "animate-spin")}
              />
              {syncing ? "Sinkron..." : "Sinkron"}
            </Button>
          </div>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6">
        {/* Stat cards */}
        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {KATEGORI_LIST.map((k) => {
            const active = k === kategori;
            return (
              <button
                key={k}
                onClick={() => {
                  setKategori(k);
                  setPage(1);
                }}
                className={cn(
                  "group rounded-xl border p-4 text-left shadow-sm transition-all hover:shadow-md",
                  active
                    ? "border-amber-600 bg-white ring-2 ring-amber-500/40"
                    : "border-amber-300/60 bg-white/80 hover:border-amber-400"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      active ? "text-amber-700" : "text-slate-600"
                    )}
                  >
                    {k}
                  </span>
                  <BookOpen
                    className={cn(
                      "h-4 w-4 transition-colors",
                      active ? "text-amber-600" : "text-slate-400"
                    )}
                  />
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {formatNumber(counts[k] ?? 0)}
                </div>
                <div className="text-xs text-slate-500">akun rekening</div>
              </button>
            );
          })}
        </section>

        {/* Toolbar: tabs + search + page size */}
        <section className="rounded-t-xl border border-b-0 border-amber-300/60 bg-amber-50/90 shadow-sm backdrop-blur">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-amber-200 px-2 pt-2">
            {KATEGORI_LIST.map((k) => {
              const active = k === kategori;
              return (
                <button
                  key={k}
                  onClick={() => {
                    setKategori(k);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-t-md px-4 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "border-b-2 border-amber-600 text-amber-800"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {k}
                  <span
                    className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      active
                        ? "bg-amber-200 text-amber-800"
                        : "bg-slate-200 text-slate-500"
                    )}
                  >
                    {formatNumber(counts[k] ?? 0)}
                  </span>
                </button>
              );
            })}

            {/* Admin: Add new button (right side of tabs) */}
            {isAdmin && adminMode && (
              <Button
                size="sm"
                onClick={openCreate}
                className="ml-auto mb-1 bg-amber-700 text-white hover:bg-amber-800"
              >
                <Plus className="mr-1 h-4 w-4" />
                Tambah Rekening
              </Button>
            )}
          </div>

          {/* Search row */}
          <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
              <Input
                type="search"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder={`Cari kode, uraian, deskripsi, atau contoh di ${kategori}...`}
                className="h-10 rounded-lg border-amber-300 bg-white pl-9 pr-3 focus-visible:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="whitespace-nowrap text-xs text-slate-500">
                Per halaman
              </label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[90px] rounded-lg border-amber-300 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="overflow-hidden rounded-b-xl border border-amber-300/60 bg-white shadow-sm">
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 bg-amber-200 text-amber-900 shadow-[0_1px_0_rgba(0,0,0,0.08)]">
                <tr>
                  <th className="w-[140px] border-b border-amber-300 p-2.5 font-semibold sm:w-[180px]">
                    KODE AKUN
                  </th>
                  <th className="w-[200px] border-b border-amber-300 p-2.5 font-semibold sm:w-[240px]">
                    URAIAN AKUN
                  </th>
                  <th className="border-b border-amber-300 p-2.5 font-semibold">
                    DESKRIPSI
                  </th>
                  <th className="hidden w-[220px] border-b border-amber-300 p-2.5 font-semibold md:table-cell">
                    CONTOH / KETENTUAN
                  </th>
                  {isAdmin && adminMode && (
                    <th className="w-[100px] border-b border-amber-300 p-2.5 text-center font-semibold">
                      AKSI
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="p-2.5">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="p-2.5">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="p-2.5">
                        <Skeleton className="h-4 w-full max-w-md" />
                      </td>
                      <td className="hidden p-2.5 md:table-cell">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      {isAdmin && adminMode && (
                        <td className="p-2.5">
                          <Skeleton className="h-4 w-16" />
                        </td>
                      )}
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td
                      colSpan={isAdmin && adminMode ? 5 : 4}
                      className="p-8 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-slate-500">
                        <AlertCircle className="h-8 w-8 text-rose-500" />
                        <p className="font-medium text-slate-700">
                          Gagal memuat data
                        </p>
                        <p className="text-xs">{error}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={fetchData}
                        >
                          <RefreshCw className="mr-1.5 h-4 w-4" /> Coba lagi
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : data && data.rows.length > 0 ? (
                  data.rows.map((row, i) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-slate-100 align-top transition-colors hover:bg-amber-50/60",
                        i % 2 === 0 ? "bg-white" : "bg-amber-50/30"
                      )}
                    >
                      <td className="p-2.5">
                        <span className="font-mono text-[13px] font-semibold text-amber-800">
                          <Highlight text={row.kode} query={q} />
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className="break-words font-medium text-slate-800">
                          <Highlight text={row.uraian} query={q} />
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className="block max-w-xl break-words text-slate-600">
                          <Highlight text={row.deskripsi} query={q} />
                        </span>
                      </td>
                      <td className="hidden p-2.5 md:table-cell">
                        <span className="block max-w-xs break-words text-slate-500">
                          <Highlight text={row.contoh} query={q} />
                        </span>
                      </td>
                      {isAdmin && adminMode && (
                        <td className="p-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                              onClick={() => openEdit(row)}
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => setDeleteTarget(row)}
                              aria-label="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={isAdmin && adminMode ? 5 : 4}
                      className="p-12 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-slate-500">
                        <Search className="h-8 w-8 text-slate-400" />
                        <p className="font-medium text-slate-700">
                          Tidak ada hasil
                        </p>
                        <p className="text-xs">
                          {q
                            ? `Tidak ditemukan rekening untuk "${q}" di kategori ${kategori}.`
                            : "Belum ada data. Coba lakukan sinkronisasi."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-amber-200 bg-amber-50/80 px-3 py-3 sm:flex-row">
            <div className="text-xs text-slate-600">
              {loading ? (
                <span className="text-slate-400">Memuat...</span>
              ) : totalRows > 0 ? (
                <span>
                  Menampilkan{" "}
                  <strong className="text-slate-800">{showingFrom}</strong>–
                  <strong className="text-slate-800">{showingTo}</strong> dari{" "}
                  <strong className="text-slate-800">
                    {formatNumber(totalRows)}
                  </strong>{" "}
                  rekening
                </span>
              ) : (
                <span className="text-slate-400">Tidak ada data</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-amber-300"
                onClick={() => setPage(1)}
                disabled={currentPage <= 1 || loading}
                aria-label="Halaman pertama"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-amber-300"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs font-medium text-slate-700">
                Hal. {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-amber-300"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-amber-300"
                onClick={() => setPage(totalPages)}
                disabled={currentPage >= totalPages || loading}
                aria-label="Halaman terakhir"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Sync status card */}
        <section className="mt-5 rounded-xl border border-amber-300/60 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    Status Database
                  </span>
                  {stats ? (
                    <Badge
                      variant="outline"
                      className="border-amber-200 bg-amber-50 text-amber-700"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Aktif
                    </Badge>
                  ) : null}
                  {isAdmin && (
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-emerald-700"
                    >
                      <ShieldCheck className="mr-1 h-3 w-3" /> Admin
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Total{" "}
                  <strong className="text-slate-700">
                    {formatNumber(total)}
                  </strong>{" "}
                  rekening tersimpan · Sinkronisasi terakhir:{" "}
                  <strong className="text-slate-700">
                    {formatDateTime(lastSync)}
                  </strong>
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="border-amber-400 text-amber-700 hover:bg-amber-50"
            >
              <RefreshCw
                className={cn("mr-1.5 h-4 w-4", syncing && "animate-spin")}
              />
              {syncing ? "Menyinkronkan..." : "Sinkronkan Ulang"}
            </Button>
          </div>
        </section>

        {/* ===== Reference card (legal basis) ===== */}
        <section className="mt-4 rounded-xl border border-amber-300/60 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-700 text-amber-50">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-900">
                  Referensi
                </span>
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-white text-amber-700"
                >
                  Dasar Hukum
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-700">
                <strong className="text-amber-900">
                  Permendagri Nomor 90 Tahun 2019
                </strong>{" "}
                tentang Klasifikasi, Kodefikasi, dan Nomenklatur Perencanaan
                Pembangunan dan Keuangan Daerah beserta pemutakhirannya.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="relative z-10 mt-auto border-t border-amber-700/30 bg-amber-800 text-amber-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs sm:flex-row sm:px-6">
          <p>
            <span className="font-bold text-white">KAREBA</span> · Kamus
            Rekening Belanja — Kenali Rekening, Pahami Belanja.
          </p>
          <p className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            <span>
              Referensi: Permendagri Nomor 90 Tahun 2019 beserta
              pemutakhirannya
            </span>
          </p>
        </div>
      </footer>

      {/* ===== Admin Login Dialog ===== */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-800">
              <Lock className="h-5 w-5" /> Login Admin
            </DialogTitle>
            <DialogDescription>
              Masukkan password admin untuk mengelola data rekening.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogin();
                }}
                placeholder="••••••••"
                autoFocus
              />
            </div>
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
              Password demo default: <code className="font-mono font-bold">admin123</code>
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLoginOpen(false)}
              disabled={loginLoading}
            >
              Batal
            </Button>
            <Button
              onClick={handleLogin}
              disabled={loginLoading || !loginPassword}
              className="bg-amber-700 text-white hover:bg-amber-800"
            >
              {loginLoading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-1.5 h-4 w-4" />
              )}
              Masuk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Add / Edit Form Dialog ===== */}
      <Dialog open={formOpen} onOpenChange={(o) => !formSaving && setFormOpen(o)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-800">
              {formMode === "create" ? (
                <>
                  <Plus className="h-5 w-5" /> Tambah Rekening
                </>
              ) : (
                <>
                  <Pencil className="h-5 w-5" /> Edit Rekening
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {formMode === "create"
                ? "Isi formulir untuk menambahkan rekening baru."
                : `Edit rekening ${form.kode}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="f-kategori">Kategori *</Label>
              <Select
                value={form.kategori}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, kategori: v as Kategori }))
                }
              >
                <SelectTrigger id="f-kategori" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KATEGORI_LIST.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-kode">Kode Akun *</Label>
              <Input
                id="f-kode"
                value={form.kode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kode: e.target.value }))
                }
                placeholder="contoh: 5.1.01.01.001"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-uraian">Uraian Akun *</Label>
              <Input
                id="f-uraian"
                value={form.uraian}
                onChange={(e) =>
                  setForm((f) => ({ ...f, uraian: e.target.value }))
                }
                placeholder="contoh: Belanja Gaji Pokok ASN"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-deskripsi">Deskripsi</Label>
              <Textarea
                id="f-deskripsi"
                value={form.deskripsi}
                onChange={(e) =>
                  setForm((f) => ({ ...f, deskripsi: e.target.value }))
                }
                placeholder="Penjelasan penggunaan rekening..."
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-contoh">Contoh / Ketentuan</Label>
              <Textarea
                id="f-contoh"
                value={form.contoh}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contoh: e.target.value }))
                }
                placeholder="Contoh pemakaian atau ketentuan..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={formSaving}
            >
              <X className="mr-1.5 h-4 w-4" /> Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={formSaving}
              className="bg-amber-700 text-white hover:bg-amber-800"
            >
              {formSaving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              {formMode === "create" ? "Tambah" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirmation ===== */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !deleteLoading && !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-700">
              <Trash2 className="h-5 w-5" /> Hapus Rekening?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus rekening berikut. Tindakan ini tidak dapat
              dibatalkan.
              <span className="mt-2 block rounded-md bg-slate-50 p-2 text-sm text-slate-700 ring-1 ring-slate-200">
                <span className="font-mono font-bold text-amber-800">
                  {deleteTarget?.kode}
                </span>
                {" — "}
                {deleteTarget?.uraian}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {deleteLoading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-4 w-4" />
              )}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== Change Password Dialog ===== */}
      <Dialog open={pwOpen} onOpenChange={(o) => !pwLoading && setPwOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-800">
              <KeyRound className="h-5 w-5" /> Ganti Password Admin
            </DialogTitle>
            <DialogDescription>
              Password baru akan disimpan dengan aman (hash scrypt). Password
              lama tidak akan berlaku lagi setelah diubah.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pw-old">Password Lama</Label>
              <div className="relative">
                <Input
                  id="pw-old"
                  type={pwShowOld ? "text" : "password"}
                  value={pwOld}
                  onChange={(e) => setPwOld(e.target.value)}
                  placeholder="••••••••"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setPwShowOld((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={pwShowOld ? "Sembunyikan" : "Tampilkan"}
                >
                  {pwShowOld ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-new">Password Baru</Label>
              <div className="relative">
                <Input
                  id="pw-new"
                  type={pwShowNew ? "text" : "password"}
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setPwShowNew((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={pwShowNew ? "Sembunyikan" : "Tampilkan"}
                >
                  {pwShowNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-confirm">Konfirmasi Password Baru</Label>
              <Input
                id="pw-confirm"
                type={pwShowNew ? "text" : "password"}
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                placeholder="Ulangi password baru"
              />
            </div>
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
              Setelah password diubah, gunakan password baru untuk login
              berikutnya.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPwOpen(false)}
              disabled={pwLoading}
            >
              Batal
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={pwLoading}
              className="bg-amber-700 text-white hover:bg-amber-800"
            >
              {pwLoading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-1.5 h-4 w-4" />
              )}
              Ubah Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
