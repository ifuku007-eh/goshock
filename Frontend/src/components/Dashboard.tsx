"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Check,
  Copy,
  Download,
  Eye,
  History,
  Link2,
  Loader2,
  LogOut,
  MousePointerClick,
  Plus,
  RefreshCw,
  Timer,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteLink,
  getChart,
  getLinks,
  getMe,
  logout,
  shortenURL,
  type ChartResponse,
  type LinkItem,
  type ShortenResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type TabKey = "generate" | "history" | "stats";

// ─── Custom Tooltip untuk Recharts ──────────────────────────
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs shadow-xl">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-bold text-primary">{payload[0].value} klik</p>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [tab, setTab] = useState<TabKey>("generate");
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [expiryDays, setExpiryDays] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [resultModal, setResultModal] = useState<ShortenResponse | null>(null);
  const [chartModal, setChartModal] = useState<ChartResponse | null>(null);
  const [detailModal, setDetailModal] = useState<LinkItem | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [copied, setCopied] = useState("");

  const loadLinks = useCallback(async (activeToken: string, silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await getLinks(activeToken);
      setLinks(data ?? []);
    } catch (err) {
      if (!silent)
        setError(
          err instanceof Error ? err.message : "Gagal mengambil history",
        );
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem("goshock_token");
    const savedUsername = localStorage.getItem("goshock_username");
    if (!savedToken) {
      router.replace("/");
      return;
    }

    setToken(savedToken);
    setUsername(savedUsername || "");

    getMe(savedToken)
      .then((user) => {
        setUsername(user.username);
        localStorage.setItem("goshock_username", user.username);
        return loadLinks(savedToken, true);
      })
      .catch(() => {
        localStorage.removeItem("goshock_token");
        localStorage.removeItem("goshock_username");
        router.replace("/");
      })
      .finally(() => setLoading(false));
  }, [loadLinks, router]);

  // Auto-refresh setiap 5 detik
  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(() => loadLinks(token, true), 5000);
    return () => window.clearInterval(timer);
  }, [loadLinks, token]);

  const totals = useMemo(() => {
    return links.reduce(
      (acc, link) => {
        acc.clicks += link.clicks;
        if (!link.is_expired) acc.active += 1;
        return acc;
      },
      { links: links.length, clicks: 0, active: 0 },
    );
  }, [links]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!url.trim()) return setError("Masukkan URL terlebih dahulu.");
    if (!url.startsWith("http://") && !url.startsWith("https://"))
      return setError("URL harus diawali http:// atau https://");

    setSaving(true);
    try {
      const result = await shortenURL(
        url.trim(),
        alias.trim() || undefined,
        expiryDays || undefined,
        token,
      );
      setResultModal(result);
      setUrl("");
      setAlias("");
      setExpiryDays("");
      await loadLinks(token, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat short link");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(value);
    window.setTimeout(() => setCopied(""), 1600);
  }

  // Buka modal grafik klik per jam
  async function handleOpenChart(code: string) {
    setChartLoading(true);
    setChartModal(null);
    try {
      const data = await getChart(code, token);
      setChartModal(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengambil data grafik",
      );
    } finally {
      setChartLoading(false);
    }
  }

  async function handleDelete(code: string) {
  setError("");

  const confirmed = window.confirm(
    "Apakah Anda yakin ingin menghapus link ini?"
  );

  if (!confirmed) return;

  try {
    await deleteLink(code, token);

    setLinks((prev) =>
      prev.filter((l) => l.short_code !== code)
    );

  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Gagal menghapus link"
    );
  }
}

  function handleDownloadQR(qrUrl: string) {
    window.open(qrUrl, "_blank");
  }

  async function handleLogout() {
    try {
      await logout(token);
    } catch {}
    localStorage.removeItem("goshock_token");
    localStorage.removeItem("goshock_username");
    router.replace("/");
  }

  if (loading) {
    return (
      <div className="z-content flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="z-content mx-auto w-full max-w-6xl">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 border-b border-border/60 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-none">
            Go<span className="text-primary">Shock</span>
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-[2px] text-muted-foreground">
            Dashboard realtime {username ? `untuk ${username}` : ""}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="h-10 w-full gap-2 font-mono text-xs md:w-auto"
        >
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </header>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <MetricCard
          icon={<Link2 className="h-5 w-5 text-primary" />}
          label="Total Link"
          value={totals.links}
        />
        <MetricCard
          icon={<MousePointerClick className="h-5 w-5 text-primary" />}
          label="Total Klik"
          value={totals.clicks}
        />
        <MetricCard
          icon={<Zap className="h-5 w-5 text-primary" />}
          label="Link Aktif"
          value={totals.active}
        />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto rounded-lg border border-border/60 bg-card/70 p-1">
        <TabButton
          active={tab === "generate"}
          onClick={() => setTab("generate")}
          icon={<Plus className="h-4 w-4" />}
          label="Generate Code"
        />
        <TabButton
          active={tab === "history"}
          onClick={() => setTab("history")}
          icon={<History className="h-4 w-4" />}
          label="History Link"
        />
        <TabButton
          active={tab === "stats"}
          onClick={() => setTab("stats")}
          icon={<BarChart3 className="h-4 w-4" />}
          label="Statistic"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Tab: Generate ── */}
      {tab === "generate" && (
        <section className="rounded-lg border border-border/70 bg-card/75 p-5 backdrop-blur">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-muted-foreground">
            // Buat short link baru
          </p>
          <form
            onSubmit={handleCreate}
            className="grid gap-3 lg:grid-cols-[1fr_180px_160px_auto]"
          >
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-11 bg-background/60 pl-9 font-mono text-sm"
                placeholder="https://link-panjang-anda.com/..."
              />
            </div>
            <Input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="h-11 bg-background/60 font-mono text-sm"
              placeholder="custom-alias"
              maxLength={30}
            />
            <select
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              className="h-11 rounded-md border border-input bg-background/60 px-3 font-mono text-xs text-foreground"
            >
              <option value="">No expiry</option>
              <option value="1">1 hari</option>
              <option value="7">7 hari</option>
              <option value="30">30 hari</option>
            </select>
            <Button
              type="submit"
              disabled={saving}
              className="h-11 gap-2 font-display font-bold"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate
            </Button>
          </form>
        </section>
      )}

      {/* ── Tab: History & Statistic ── */}
      {(tab === "history" || tab === "stats") && (
        <section className="rounded-lg border border-border/70 bg-card/75">
          <div className="flex items-center justify-between border-b border-border/60 p-4">
            <h2 className="font-display text-xl font-bold">
              {tab === "history" ? "History Link" : "Statistic"}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadLinks(token)}
              disabled={refreshing}
              className="gap-2 font-mono text-xs"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
              />{" "}
              Refresh
            </Button>
          </div>

          <div className="divide-y divide-border/40">
            {links.length === 0 ? (
              <div className="p-8 text-center font-mono text-sm text-muted-foreground">
                Belum ada link.
              </div>
            ) : (
              links.map((link) => (
                <div
                  key={link.short_code}
                  className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-mono text-sm font-bold text-primary">
                        {link.short_url}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 font-mono text-[10px]",
                          link.is_expired
                            ? "border-destructive/30 text-destructive"
                            : "border-primary/30 text-primary",
                        )}
                      >
                        {link.is_expired ? "expired" : "active"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 break-all font-mono text-xs text-muted-foreground">
                      {link.long_url}
                    </p>

                    {tab === "stats" && (
                      <div className="mt-2 flex items-center gap-3">
                        <span className="flex items-center gap-1 font-mono text-xs text-foreground">
                          <MousePointerClick className="h-3 w-3 text-primary" />
                          <strong className="text-primary">
                            {link.clicks}
                          </strong>{" "}
                          klik
                        </span>
                        {link.expires_at && (
                          <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                            <Timer className="h-3 w-3" />
                            {formatDate(link.expires_at)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {/* Tombol 👁 — di tab Statistic buka grafik, di History buka copy */}
                    <IconButton
                      title={
                        tab === "stats"
                          ? "Lihat grafik klik per jam"
                          : "Lihat detail"
                      }
                      onClick={() =>
                        tab === "stats"
                          ? handleOpenChart(link.short_code)
                          : setDetailModal(link)
                      }
                    >
                      {tab === "stats" ? (
                        <BarChart3 className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </IconButton>
                    <IconButton
                      title="Copy link"
                      onClick={() => handleCopy(link.short_url)}
                    >
                      {copied === link.short_url ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </IconButton>
                    <IconButton
                      title="Hapus"
                      onClick={() => handleDelete(link.short_code)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* ── Modal: Hasil Generate ── */}
      {resultModal && (
        <ResultModal
          item={resultModal}
          copied={copied}
          onCopy={handleCopy}
          onDownloadQR={handleDownloadQR}
          onClose={() => setResultModal(null)}
        />
      )}

      {/* ── Modal: Detail History ── */}
      {detailModal && (
        <HistoryDetailModal
          item={detailModal}
          copied={copied}
          onCopy={handleCopy}
          onDownloadQR={handleDownloadQR}
          onClose={() => setDetailModal(null)}
        />
      )}

      {/* ── Modal: Grafik Klik Per Jam ── */}
      {(chartLoading || chartModal) && (
        <ChartModal
          data={chartModal}
          loading={chartLoading}
          copied={copied}
          onCopy={handleCopy}
          onDownloadQR={handleDownloadQR}
          onClose={() => {
            setChartModal(null);
            setChartLoading(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Komponen kecil ──────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card/70 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[2px] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-4xl font-extrabold text-primary">
            {value}
          </p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2">{icon}</div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 rounded-md px-4 font-mono text-xs transition",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {icon} {label}
    </button>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border/70 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
    >
      {children}
    </button>
  );
}

// ─── Modal Hasil Generate ────────────────────────────────────
function ResultModal({
  item,
  copied,
  onCopy,
  onDownloadQR,
  onClose,
}: {
  item: ShortenResponse;
  copied: string;
  onCopy: (v: string) => void;
  onDownloadQR: (url: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Link dibuat! 🎉</h2>
            <p className="font-mono text-xs text-muted-foreground">
              Short link siap digunakan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-4">
          <div className="rounded-lg bg-white p-2 shrink-0">
            <Image
              src={item.qr_url}
              alt="QR"
              width={110}
              height={110}
              className="rounded"
              unoptimized
            />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Short URL
              </p>
              <div className="mt-1 flex gap-2 items-center">
                <a
                  href={item.short_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 truncate font-mono font-bold text-primary hover:underline text-sm"
                >
                  {item.short_url}
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCopy(item.short_url)}
                  className="shrink-0 gap-1 font-mono text-xs h-8"
                >
                  {copied === item.short_url ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}{" "}
                  Copy
                </Button>
              </div>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Original URL
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground break-all line-clamp-2">
                {item.long_url}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onDownloadQR(item.qr_url)}
                className="flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 font-mono text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Download QR
              </button>
              {item.expires_at && (
                <span className="flex items-center gap-1 rounded-md border border-border/40 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
                  <Timer className="h-3 w-3" /> {formatDate(item.expires_at)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Grafik Klik Per Jam ───────────────────────────────
function ChartModal({
  data,
  loading,
  copied,
  onCopy,
  onDownloadQR,
  onClose,
}: {
  data: ChartResponse | null;
  loading: boolean;
  copied: string;
  onCopy: (v: string) => void;
  onDownloadQR: (url: string) => void;
  onClose: () => void;
}) {
  const totalInChart = data?.chart?.reduce((s, d) => s + d.clicks, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Grafik Klik</h2>
            <p className="font-mono text-xs text-muted-foreground">
              Data klik per jam — 24 jam terakhir
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Content */}
        {!loading && data && (
          <div className="space-y-5">
            {/* Info link */}
            <div className="flex gap-4 items-start">
              <div className="rounded-lg bg-white p-2 shrink-0">
                <Image
                  src={data.qr_url}
                  alt="QR"
                  width={80}
                  height={80}
                  className="rounded"
                  unoptimized
                />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex gap-2 items-center">
                  <a
                    href={data.short_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono font-bold text-primary hover:underline truncate"
                  >
                    {data.short_url}
                  </a>
                  <button
                    onClick={() => onCopy(data.short_url)}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {copied === data.short_url ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="font-mono text-xs text-muted-foreground line-clamp-1">
                  {data.long_url}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 font-mono text-xs">
                    <MousePointerClick className="h-3 w-3 text-primary" />
                    <strong className="text-primary">{data.clicks}</strong>
                    <span className="text-muted-foreground">total klik</span>
                  </span>
                  <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                    <BarChart3 className="h-3 w-3" />
                    {totalInChart} klik dalam 24 jam terakhir
                  </span>
                  <button
                    onClick={() => onDownloadQR(data.qr_url)}
                    className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Download className="h-3 w-3" /> QR
                  </button>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="rounded-lg border border-border/50 bg-background/60 p-4">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                // Klik per jam (24 jam terakhir)
              </p>
              {totalInChart === 0 ? (
                <div className="flex h-40 items-center justify-center font-mono text-sm text-muted-foreground">
                  Belum ada klik dalam 24 jam terakhir
                </div>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.chart}
                      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="hour"
                        tick={{
                          fontFamily: "Space Mono",
                          fontSize: 10,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        interval={2}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{
                          fontFamily: "Space Mono",
                          fontSize: 10,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "hsl(var(--accent))" }}
                      />
                      <Bar
                        dataKey="clicks"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryDetailModal({
  item,
  copied,
  onCopy,
  onDownloadQR,
  onClose,
}: {
  item: LinkItem;
  copied: string;
  onCopy: (v: string) => void;
  onDownloadQR: (url: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Detail Link</h2>

            <p className="font-mono text-xs text-muted-foreground">
              Informasi short link
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* QR */}
        <div className="mb-5 flex justify-center">
          <div className="rounded-xl bg-white p-3">
            <Image
              src={item.qr_url}
              alt="QR Code"
              width={180}
              height={180}
              className="rounded-lg"
              unoptimized
            />
          </div>
        </div>

        {/* Info */}
        <div className="space-y-4">
          {/* Short URL */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Short URL
            </p>

            <a
              href={item.short_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all font-mono text-sm font-bold text-primary hover:underline"
            >
              {item.short_url}
            </a>
          </div>

          {/* Original URL */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Original URL
            </p>

            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
              {item.long_url}
            </p>
          </div>

          {/* Expiry */}
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2">
            <Timer className="h-4 w-4 text-primary" />

            <div className="font-mono text-xs">
              {item.expires_at ? (
                <>
                  Expired:{" "}
                  <span className="text-primary">
                    {formatDate(item.expires_at)}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">No expiry</span>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            {/* Copy */}
            <Button
              variant="outline"
              onClick={() => onCopy(item.short_url)}
              className="gap-2 font-mono text-xs"
            >
              {copied === item.short_url ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copy Link
            </Button>

            {/* Download QR */}
            <Button
              variant="outline"
              onClick={() => onDownloadQR(item.qr_url)}
              className="gap-2 font-mono text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Download QR
            </Button>

            {/* Back */}
            <Button onClick={onClose} className="gap-2 font-mono text-xs">
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
