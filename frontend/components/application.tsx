"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  FileCheck2,
  FileSearch,
  FileText,
  FlaskConical,
  FolderOpen,
  GitBranch,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Microscope,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Trash2,
  UploadCloud,
  UserRound,
  X,
  RefreshCw,
  BarChart3,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, post, percent, date } from "@/lib/api";
import type {
  User,
  Doc,
  Result,
  Claim,
  Trace,
  Overview,
  Source,
} from "@/lib/types";

const NAV = [
  { section: "overview", label: "Overview", icon: LayoutDashboard },
  { section: "workspace", label: "Clinical AI Workspace", icon: Sparkles },
  { section: "library", label: "Evidence Library", icon: BookOpen },
  { section: "upload", label: "Document Upload", icon: UploadCloud },
  { section: "rag", label: "RAG Explorer", icon: GitBranch },
  { section: "detector", label: "Hallucination Detector", icon: ShieldAlert },
  { section: "verification", label: "Evidence Verification", icon: FileCheck2 },
  { section: "correction", label: "Self-Correction Center", icon: RefreshCw },
  { section: "history", label: "Verification History", icon: History },
  { section: "reports", label: "Research Reports", icon: FileText },
  { section: "analytics", label: "Analytics & Reports", icon: BarChart3 },
  { section: "audit", label: "Audit Logs", icon: Activity },
  { section: "settings", label: "Settings", icon: Settings2 },
];
const COLORS = ["#13a991", "#e7aa42", "#f47b65", "#c75b7c", "#a8b8c9"];
const STAGES = [
  "Query understanding",
  "Hybrid retrieval & reranking",
  "Evidence-grounded generation",
  "Atomic claim extraction",
  "Evidence verification",
  "Hallucination detection",
  "Self-correction",
  "Final validation",
];
const schema = z.object({
  name: z.string().optional(),
  email: z.email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters."),
});
type AuthFields = z.infer<typeof schema>;
function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={"brand " + (light ? "light" : "")}>
      <span className="brand-symbol">
        <ShieldCheck size={24} />
      </span>
      <span>
        MediVerify<span className="brand-ai"> AI</span>
        <small>CLINICAL EVIDENCE INTELLIGENCE</small>
      </span>
    </span>
  );
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
function Status({ status }: { status: string }) {
  return (
    <Badge
      tone={
        status === "Supported"
          ? "green"
          : status === "Contradicted"
            ? "red"
            : status === "Partially Supported"
              ? "amber"
              : status === "Indexed"
                ? "green"
                : "neutral"
      }
    >
      {status === "Supported" && <Check size={12} />} {status}
    </Badge>
  );
}
function Empty({
  title,
  body,
  href,
  label,
}: {
  title: string;
  body: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <FileSearch size={28} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {href && (
        <Link href={href} className="button primary">
          {label || "Start an investigation"}
          <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
function Loading() {
  return (
    <div className="loading">
      <Loader2 className="spin" size={24} />
      <p>Opening your evidence workspace…</p>
    </div>
  );
}

export default function Application({ section }: { section: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [history, setHistory] = useState<Result[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [system, setSystem] = useState<Record<string, unknown>>({});
  const [audit, setAudit] = useState<
    {
      id: string;
      action: string;
      resource_type: string;
      resource_id: string;
      created_at: string;
    }[]
  >([]);
  const [selected, setSelected] = useState<Result | null>(null);
  const [question, setQuestion] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [topK, setTopK] = useState(5);
  const [maxIterations, setMaxIterations] = useState(3);
  const [scenario, setScenario] = useState<number | null>(null);
  const [scenarios, setScenarios] = useState<
    { topic: string; question: string; bad: string }[]
  >([]);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sourceModal, setSourceModal] = useState<Source | Doc | null>(null);
  const [preview, setPreview] = useState<{ page: number; text: string }[]>([]);
  const [claimModal, setClaimModal] = useState<Claim | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileTitle, setFileTitle] = useState("");
  const [category, setCategory] = useState("Clinical Research");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [profileName, setProfileName] = useState("");
  const result = selected || history[0] || null;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFields>({ resolver: zodResolver(schema) });
  async function reload() {
    const [d, h, o, s, a] = await Promise.all([
      api<Doc[]>("/documents"),
      api<Result[]>("/clinical/queries"),
      api<Overview>("/dashboard/overview"),
      api<Record<string, unknown>>("/system/status"),
      api<typeof audit>("/audit-logs"),
    ]);
    setDocs(d);
    setHistory(h);
    setOverview(o);
    setSystem(s);
    setAudit(a);
  }
  useEffect(() => {
    let alive = true;
    api<User>("/auth/me")
      .then(async (u) => {
        if (!alive) return;
        setUser(u);
        setProfileName(u.name);
        setTopK(u.settings.top_k || 5);
        setMaxIterations(u.settings.max_iterations || 3);
        await reload();
      })
      .catch((e) => {
        if (
          section !== "home" &&
          section !== "login" &&
          section !== "register" &&
          alive
        )
          setError(e.message);
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    api<typeof scenarios>("/demo/scenarios")
      .then(setScenarios)
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [section]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The operation failed.");
    } finally {
      setBusy(false);
    }
  }
  async function demo() {
    await action(async () => {
      const u = await post<User>("/auth/demo", {});
      setUser(u);
      router.push("/overview");
    });
  }
  async function authenticate(fields: AuthFields) {
    await action(async () => {
      const u = await post<User>(
        section === "register" ? "/auth/register" : "/auth/login",
        fields,
      );
      setUser(u);
      router.push("/overview");
    });
  }
  async function investigate() {
    if (question.trim().length < 8) {
      setError("Enter a research question of at least 8 characters.");
      return;
    }
    setBusy(true);
    setError("");
    setTraces([]);
    setSelected(null);
    try {
      const response = await fetch("/api/clinical/query/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          document_ids: selectedDocs,
          top_k: topK,
          max_iterations: maxIterations,
          draft: section === "detector" ? draft : "",
          scenario,
        }),
        credentials: "include",
      });
      if (!response.ok) {
        const e = await response.json();
        throw new Error(
          typeof e.detail === "string" ? e.detail : "Pipeline request failed.",
        );
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Streaming is unavailable.");
      let buffer = "";
      let complete = false;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          const data = JSON.parse(event.slice(6));
          if (data.type === "stage") setTraces((t) => [...t, data.stage]);
          if (data.type === "error") throw new Error(data.message);
          if (data.type === "result") {
            setSelected(data.result);
            complete = true;
          }
        }
      }
      if (!complete)
        throw new Error(
          "The connection ended before a result was saved. Please retry.",
        );
      await reload();
      setNotice(
        "Assessment saved. Review every claim and its source before using the result.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "The pipeline failed.");
    } finally {
      setBusy(false);
    }
  }
  async function openDoc(d: Doc) {
    setSourceModal(d);
    setPreview([]);
    try {
      const data = await api<{ chunks: typeof preview }>("/documents/" + d.id);
      setPreview(data.chunks);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function upload() {
    if (!files.length) {
      setError("Select at least one document.");
      return;
    }
    await action(async () => {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append(
          "title",
          files.length === 1 ? fileTitle || file.name : file.name,
        );
        form.append("category", category);
        form.append("author", author);
        if (year) form.append("publication_year", year);
        await api("/documents/upload", { method: "POST", body: form });
      }
      setFiles([]);
      setFileTitle("");
      await reload();
      setNotice("Documents processed and indexed successfully.");
    });
  }
  const filteredHistory = history.filter((q) =>
    q.question.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredDocs = docs.filter((d) =>
    (d.title + " " + d.category).toLowerCase().includes(search.toLowerCase()),
  );
  const filteredClaims = (result?.claims || []).filter(
    (c) =>
      (filter === "All" || c.status === filter) &&
      c.text.toLowerCase().includes(search.toLowerCase()),
  );

  if (!ready) return <Loading />;
  if (!user || ["home", "login", "register"].includes(section))
    return (
      <div className="public-page">
        <nav className="public-nav">
          <Link href="/">
            <Brand />
          </Link>
          <div>
            <Link href="/login" className="text-link">
              Sign in
            </Link>
            <button className="button primary" onClick={demo} disabled={busy}>
              Open demo workspace <ArrowUpRight size={15} />
            </button>
          </div>
        </nav>
        {error && <div className="alert error">{error}</div>}
        {section === "login" || section === "register" ? (
          <div className="auth-wrap">
            <div className="auth-story">
              <Badge tone="green">
                <ShieldCheck size={13} /> Evidence before answers
              </Badge>
              <h1>
                Better answers begin
                <br />
                with better evidence.
              </h1>
              <p>
                A transparent workspace for clinical research. Retrieve,
                inspect, verify, and refine—with a source for every claim.
              </p>
              <div className="auth-points">
                <p>
                  <CheckCheck /> Isolated research workspaces
                </p>
                <p>
                  <GitBranch /> Eight-stage verification pipeline
                </p>
                <p>
                  <FileCheck2 /> Traceable evidence and reports
                </p>
              </div>
            </div>
            <form className="auth-card" onSubmit={handleSubmit(authenticate)}>
              <span className="eyebrow">YOUR RESEARCH STARTS HERE</span>
              <h2>
                {section === "register"
                  ? "Create your workspace"
                  : "Welcome back"}
              </h2>
              <p>
                {section === "register"
                  ? "Join MediVerify AI for evidence-first research."
                  : "Sign in to continue your investigations."}
              </p>
              {section === "register" && (
                <label>
                  Full name
                  <input
                    {...register("name")}
                    required
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  {...register("email")}
                  placeholder="researcher@example.com"
                  autoComplete="email"
                />
                {errors.email && (
                  <small className="red-text">{errors.email.message}</small>
                )}
              </label>
              <label>
                Password
                <input
                  type="password"
                  {...register("password")}
                  placeholder="At least 10 characters"
                  autoComplete={
                    section === "register" ? "new-password" : "current-password"
                  }
                />
                {errors.password && (
                  <small className="red-text">{errors.password.message}</small>
                )}
              </label>
              <button className="button primary full" disabled={busy}>
                {busy ? (
                  <Loader2 className="spin" size={16} />
                ) : section === "register" ? (
                  "Create account"
                ) : (
                  "Sign in"
                )}
                <ArrowRight size={16} />
              </button>
              <p className="auth-switch">
                {section === "register"
                  ? "Already have an account?"
                  : "New to MediVerify?"}{" "}
                <Link href={section === "register" ? "/login" : "/register"}>
                  {section === "register" ? "Sign in" : "Create an account"}
                </Link>
              </p>
              <div className="divider">or explore first</div>
              <button
                type="button"
                className="button full"
                disabled={busy}
                onClick={demo}
              >
                Try the isolated demo <FlaskConical size={15} />
              </button>
              <small>
                Demo data is synthetic. Never upload real patient records.
              </small>
            </form>
          </div>
        ) : (
          <>
            <main className="hero">
              <div>
                <Badge tone="green">
                  <span className="dot" /> THE EVIDENCE-FIRST CLINICAL AI
                  WORKSPACE
                </Badge>
                <h1>
                  Every claim.
                  <br />
                  Every source.
                  <br />
                  <em>Verified together.</em>
                </h1>
                <p>
                  Move from a clinical question to a transparent evidence
                  assessment. See what’s supported, catch what isn’t, and refine
                  answers with a self-correcting research pipeline.
                </p>
                <div className="hero-actions">
                  <button
                    className="button primary"
                    onClick={demo}
                    disabled={busy}
                  >
                    Explore the workspace <ArrowRight size={18} />
                  </button>
                  <Link className="button" href="/register">
                    Create an account
                  </Link>
                </div>
                <div className="hero-foot">
                  <ShieldCheck size={16} /> Research support. Traceable sources.
                  Human oversight.
                </div>
              </div>
              <div className="hero-preview">
                <div className="preview-top">
                  <span className="dot" /> EVIDENCE ASSESSMENT{" "}
                  <Badge tone="green">Synthetic example</Badge>
                </div>
                <div className="preview-question">
                  <Microscope size={20} />
                  <h3>From uncertainty to evidence.</h3>
                </div>
                <div className="preview-step">
                  <span>
                    <Check size={16} />
                  </span>
                  <div>
                    <strong>Retrieve the right context</strong>
                    <p>Hybrid retrieval across your research library</p>
                  </div>
                </div>
                <div className="preview-step">
                  <span>
                    <Check size={16} />
                  </span>
                  <div>
                    <strong>Inspect every factual claim</strong>
                    <p>Supporting passages, citations, and limitations</p>
                  </div>
                </div>
                <div className="preview-step">
                  <span>
                    <Check size={16} />
                  </span>
                  <div>
                    <strong>Correct, then verify again</strong>
                    <p>Unsupported statements removed transparently</p>
                  </div>
                </div>
                <div className="preview-evidence">
                  <Badge tone="green">
                    <FileCheck2 size={13} /> Source attribution checked
                  </Badge>
                  <p>
                    “The sleep study did not establish a causal relationship.”
                  </p>
                  <small>[S1] Synthetic teaching study · Page 1</small>
                </div>
              </div>
            </main>
            <section className="landing-features">
              <span className="eyebrow">A COMPLETE EVIDENCE WORKFLOW</span>
              <h2>Built for questions that deserve scrutiny.</h2>
              <div className="feature-grid">
                {[
                  {
                    icon: BookOpen,
                    title: "Your evidence, organized",
                    text: "Upload PDF, DOCX, TXT, CSV, and JSON. Inspect indexed passages and page references.",
                  },
                  {
                    icon: GitBranch,
                    title: "Eight connected agents",
                    text: "A LangGraph workflow connects retrieval, generation, claim extraction, verification, and correction.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Transparent by design",
                    text: "Source checks, synthetic demo labels, audit logs, and exportable reports make limitations visible.",
                  },
                ].map((f) => (
                  <article key={f.title}>
                    <f.icon size={24} />
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </article>
                ))}
              </div>
            </section>
            <footer>
              <Brand />
              <p>
                AI-assisted evidence assessment · Not a diagnosis or medical
                advice.
              </p>
              <Link href="/login">Enter workspace →</Link>
            </footer>
          </>
        )}
      </div>
    );

  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <Link href="/overview" className="sidebar-brand">
          <Brand light />
        </Link>
        <div className="workspace-switch">
          <span className="workspace-avatar">
            <Microscope size={19} />
          </span>
          <span>
            Research workspace<small>Personal workspace</small>
          </span>
          <ChevronDown size={14} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {NAV.map((item, i) => (
            <div key={item.section}>
              {i === 4 && (
                <span className="nav-label second">EVIDENCE INTELLIGENCE</span>
              )}
              {i === 8 && (
                <span className="nav-label second">INSIGHTS & MANAGEMENT</span>
              )}
              <Link
                href={"/" + item.section}
                className={section === item.section ? "active" : ""}
                onClick={() => setMobile(false)}
              >
                <item.icon size={17} />
                <span>{item.label}</span>
                {section === item.section && <span className="active-dot" />}
              </Link>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="trust-box">
            <ShieldCheck size={19} />
            <strong>Evidence, with integrity.</strong>
            <p>Research support with human oversight at every step.</p>
            <Badge tone="dark">
              <span className="dot" /> DEMO ENVIRONMENT
            </Badge>
          </div>
          <Link className="user-card" href="/profile">
            <span className="avatar">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <span>
              {user.name}
              <small>Clinical researcher</small>
            </span>
            <Settings2 size={16} />
          </Link>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <button
            aria-label="Toggle navigation"
            className="icon-button mobile-toggle"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <strong>
              {NAV.find((n) => n.section === section)?.label || "Profile"}
            </strong>
          </div>
          <div className="topbar-right">
            <div className="global-search">
              <Search size={15} />
              <input
                aria-label="Search current workspace"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your workspace…"
              />
              <kbd>⌕</kbd>
            </div>
            <span className="system-live">
              <span className="dot" /> System operational
            </span>
            <Link href="/profile" className="avatar small">
              {user.name.slice(0, 2).toUpperCase()}
            </Link>
          </div>
        </header>
        <main className="content">
          <div className="demo-banner">
            <FlaskConical size={15} />
            <span>
              <strong>Synthetic research environment.</strong> Demo sources are
              fictional teaching fixtures. No patient data or clinical advice.
            </span>
            <Badge tone="amber">Demo mode</Badge>
          </div>
          {error && (
            <div role="alert" className="alert error">
              <ShieldAlert size={18} />
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              <Check size={18} />
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {["overview", "analytics"].includes(section)
                  ? "YOUR RESEARCH, AT A GLANCE"
                  : "MEDIVERIFY INTELLIGENCE"}
              </div>
              <h1>
                {section === "overview"
                  ? "Research overview"
                  : NAV.find((n) => n.section === section)?.label ||
                    "Your profile"}
              </h1>
              <p>
                {
                  (
                    {
                      overview:
                        "A clear view of your evidence, verification, and research activity.",
                      workspace:
                        "Ask a clinical question. Follow the evidence. Inspect every claim.",
                      library:
                        "Your indexed sources. The foundation of trustworthy answers.",
                      upload:
                        "Turn research documents into searchable, traceable evidence.",
                      rag: "Look inside retrieval, ranking, and the context behind each answer.",
                      detector:
                        "Assess an existing answer against the evidence in your library.",
                      verification:
                        "Explore claim-level assessments and their source passages.",
                      correction:
                        "See what changed, why it changed, and what the evidence supports.",
                      history:
                        "Every investigation, preserved with its evidence and assessment.",
                      reports:
                        "Export transparent, source-linked evidence assessments.",
                      analytics: "Insights from your actual workspace records.",
                      audit:
                        "A transparent record of activity in your research workspace.",
                      settings:
                        "Configure retrieval and the boundaries of your evidence workflow.",
                      profile: "Manage your researcher profile and session.",
                    } as Record<string, string>
                  )[section]
                }
              </p>
            </div>
            <div className="heading-actions">
              {section === "overview" || section === "library" ? (
                <>
                  <Link className="button" href="/upload">
                    <UploadCloud size={15} /> Upload document
                  </Link>
                  <Link className="button primary" href="/workspace">
                    <Plus size={16} /> New investigation
                  </Link>
                </>
              ) : (
                <Badge tone="green">
                  <span className="dot" /> Evidence-first workspace
                </Badge>
              )}
            </div>
          </div>

          {section === "overview" && overview && (
            <>
              <div className="stats-grid">
                {[
                  {
                    label: "Clinical queries",
                    value: overview.queries,
                    icon: Stethoscope,
                    sub: "Investigations in your workspace",
                    tone: "teal",
                  },
                  {
                    label: "Documents indexed",
                    value: overview.documents,
                    icon: BookOpen,
                    sub: `${docs.reduce((n, d) => n + d.chunk_count, 0)} searchable evidence passages`,
                    tone: "blue",
                  },
                  {
                    label: "Claims assessed",
                    value: overview.claims,
                    icon: ShieldCheck,
                    sub: `${overview.flagged} claims flagged for review`,
                    tone: "purple",
                  },
                  {
                    label: "Final source confidence",
                    value: overview.queries
                      ? percent(overview.confidence)
                      : "—",
                    icon: Activity,
                    sub: "System estimate · not clinical accuracy",
                    tone: "amber",
                  },
                ].map((s) => (
                  <article className="stat-card" key={s.label}>
                    <div>
                      <span>{s.label}</span>
                      <span className={"stat-icon " + s.tone}>
                        <s.icon size={19} />
                      </span>
                    </div>
                    <strong>{s.value}</strong>
                    <small>{s.sub}</small>
                  </article>
                ))}
              </div>
              <div className="dashboard-main-grid">
                <section className="card activity-chart">
                  <div className="card-heading">
                    <div>
                      <h2>Research activity</h2>
                      <p>Queries and flagged claims across your workspace</p>
                    </div>
                    <Badge>
                      All recorded activity <ChevronDown size={12} />
                    </Badge>
                  </div>
                  {overview.timeline.length ? (
                    <div className="chart">
                      <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={overview.timeline}>
                          <defs>
                            <linearGradient
                              id="teal"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#15ad99"
                                stopOpacity={0.22}
                              />
                              <stop
                                offset="100%"
                                stopColor="#15ad99"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="4 5"
                            vertical={false}
                            stroke="#edf0f3"
                          />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: "#8793a4" }}
                          />
                          <YAxis
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                            width={30}
                            tick={{ fontSize: 11, fill: "#8793a4" }}
                          />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="queries"
                            stroke="#12a58f"
                            fill="url(#teal)"
                            strokeWidth={2.5}
                          />
                          <Area
                            type="monotone"
                            dataKey="flagged"
                            stroke="#e9ae57"
                            fill="transparent"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Empty
                      title="Your research story starts here"
                      body="Run your first investigation to see real activity over time."
                      href="/workspace"
                      label="Ask a question"
                    />
                  )}
                  <div className="chart-legend">
                    <span>
                      <i style={{ background: "#12a58f" }} /> Clinical queries
                    </span>
                    <span>
                      <i style={{ background: "#e9ae57" }} /> Flagged claims
                    </span>
                    <small>Based on saved assessments</small>
                  </div>
                </section>
                <section className="card distribution">
                  <div className="card-heading">
                    <div>
                      <h2>Evidence quality</h2>
                      <p>Initial claim classifications</p>
                    </div>
                    <ShieldCheck size={19} />
                  </div>
                  {overview.claims ? (
                    <div className="donut">
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={overview.distribution}
                            dataKey="value"
                            innerRadius={58}
                            outerRadius={78}
                            paddingAngle={4}
                            stroke="none"
                          >
                            {COLORS.map((c) => (
                              <Cell key={c} fill={c} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="donut-label">
                        <strong>{overview.claims}</strong>
                        <small>claims assessed</small>
                      </div>
                    </div>
                  ) : (
                    <div className="donut-empty">
                      <ShieldCheck size={34} />
                      <strong>No assessments yet</strong>
                      <small>
                        Your evidence distribution will appear here.
                      </small>
                    </div>
                  )}
                  <div className="distribution-list">
                    {overview.distribution.map((d, i) => (
                      <div key={d.name}>
                        <span>
                          <i style={{ background: COLORS[i] }} />
                          {d.name}
                        </span>
                        <strong>{d.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="dashboard-bottom-grid">
                <section className="card">
                  <div className="card-heading">
                    <div>
                      <h2>Recent investigations</h2>
                      <p>Your latest evidence assessments</p>
                    </div>
                    <Link href="/history">
                      View all <ArrowRight size={14} />
                    </Link>
                  </div>
                  <HistoryTable
                    items={overview.recent}
                    select={(q) => {
                      setSelected(q);
                      router.push("/verification");
                    }}
                    compact
                  />
                </section>
                <section className="card pipeline-card">
                  <div className="card-heading">
                    <div>
                      <h2>Pipeline health</h2>
                      <p>Transparent, connected processing</p>
                    </div>
                    <span className="dot" />
                  </div>
                  {[
                    {
                      label: "Evidence storage",
                      value: String(system.storage || "Checking…"),
                      icon: FolderOpen,
                    },
                    {
                      label: "Retrieval engine",
                      value: String(system.retrieval || "Checking…"),
                      icon: GitBranch,
                    },
                    {
                      label: "Agent orchestration",
                      value: "LangGraph · 8 processing nodes",
                      icon: Sparkles,
                    },
                    {
                      label: "Answer generation",
                      value: String(system.generation || "Checking…"),
                      icon: FileCheck2,
                    },
                  ].map((s) => (
                    <div className="health-row" key={s.label}>
                      <span className="health-icon">
                        <s.icon size={16} />
                      </span>
                      <div>
                        <strong>{s.label}</strong>
                        <small>{s.value}</small>
                      </div>
                      <Check size={14} />
                    </div>
                  ))}
                  <Link href="/settings" className="pipeline-link">
                    View system configuration <ArrowUpRight size={15} />
                  </Link>
                </section>
              </div>
              <section className="next-action">
                <span className="next-action-icon">
                  <Sparkles size={25} />
                </span>
                <div>
                  <h3>Let the evidence lead your next question.</h3>
                  <p>
                    Start with a synthetic scenario or bring your own research
                    documents.
                  </p>
                </div>
                <Link href="/workspace" className="button primary">
                  Open Clinical AI Workspace <ArrowRight size={15} />
                </Link>
              </section>
            </>
          )}

          {["workspace", "detector"].includes(section) && (
            <>
              <div className="workspace-grid">
                <section className="card question-card">
                  <div className="card-heading">
                    <div className="inline">
                      <span className="section-icon">
                        <Sparkles size={19} />
                      </span>
                      <div>
                        <h2>
                          {section === "detector"
                            ? "Assess an existing answer"
                            : "Start with a research question"}
                        </h2>
                        <p>
                          Ground your investigation in your evidence library.
                        </p>
                      </div>
                    </div>
                    <Badge tone="green">
                      {section === "detector"
                        ? "Claim assessment"
                        : "Hybrid RAG"}
                    </Badge>
                  </div>
                  <div className="question-body">
                    <label htmlFor="question">Clinical research question</label>
                    <textarea
                      id="question"
                      rows={4}
                      value={question}
                      onChange={(e) => {
                        setQuestion(e.target.value);
                        setScenario(null);
                      }}
                      placeholder="What evidence supports the relationship between hypertension and cardiovascular risk?"
                      maxLength={2000}
                    />
                    {section === "detector" && (
                      <label>
                        Answer to assess
                        <textarea
                          rows={5}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder="Paste an answer to check against your indexed evidence. Use [S1] citations only if they match the retrieved sources."
                          maxLength={12000}
                        />
                      </label>
                    )}
                    <div className="input-foot">
                      <span>
                        <ShieldCheck size={13} /> Evidence-constrained · No
                        clinical recommendations
                      </span>
                      <small>{question.length}/2000</small>
                    </div>
                    <div className="scenario-section">
                      <span className="eyebrow">
                        OR EXPLORE A SYNTHETIC SCENARIO
                      </span>
                      <div className="scenario-chips">
                        {scenarios.map((s, i) => (
                          <button
                            className={scenario === i ? "chosen" : ""}
                            key={s.topic}
                            onClick={() => {
                              setQuestion(s.question);
                              setScenario(i);
                              setDraft("");
                            }}
                          >
                            <FlaskConical size={13} />
                            {s.topic}
                            <ArrowUpRight size={12} />
                          </button>
                        ))}
                      </div>
                      <small>
                        Scenarios deliberately include a false claim to
                        demonstrate detection and correction.
                      </small>
                    </div>
                    <button
                      className="button primary full run-button"
                      disabled={
                        busy ||
                        !question.trim() ||
                        (section === "detector" && !draft.trim())
                      }
                      onClick={investigate}
                    >
                      {busy ? (
                        <Loader2 className="spin" size={17} />
                      ) : (
                        <Sparkles size={17} />
                      )}{" "}
                      {busy
                        ? "Assessing the evidence…"
                        : "Run evidence assessment"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </section>
                <aside className="card config-card">
                  <div className="card-heading">
                    <h2>
                      <SlidersHorizontal size={17} /> Investigation settings
                    </h2>
                  </div>
                  <div className="config-body">
                    <label>
                      Evidence sources
                      <small>
                        Leave all unchecked to search the entire library.
                      </small>
                    </label>
                    <div className="source-checks">
                      {docs.map((d) => (
                        <label key={d.id}>
                          <input
                            type="checkbox"
                            checked={selectedDocs.includes(d.id)}
                            onChange={(e) =>
                              setSelectedDocs((v) =>
                                e.target.checked
                                  ? [...v, d.id]
                                  : v.filter((x) => x !== d.id),
                              )
                            }
                          />
                          <span>
                            {d.title}
                            <small>
                              {d.chunk_count} passages ·{" "}
                              {d.synthetic ? "Synthetic" : "Uploaded"}
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                    <label>
                      Retrieved passages <span>{topK}</span>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={topK}
                        onChange={(e) => setTopK(+e.target.value)}
                      />
                    </label>
                    <label>
                      Maximum correction iterations
                      <select
                        value={maxIterations}
                        onChange={(e) => setMaxIterations(+e.target.value)}
                      >
                        {[1, 2, 3].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <div className="config-note">
                      <FlaskConical size={17} />
                      <p>
                        <strong>Deterministic demo mode</strong>
                        <br />
                        Extractive answers and conservative rule-based
                        verification. No paid AI key required.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
              {(busy || traces.length > 0) && (
                <section className="card tracker">
                  <div className="card-heading">
                    <div>
                      <h2>Live execution trace</h2>
                      <p>
                        Updates are emitted by the backend as nodes complete.
                      </p>
                    </div>
                    <Badge tone={busy ? "amber" : "green"}>
                      {busy ? "Processing" : "Completed"}
                    </Badge>
                  </div>
                  <div className="stages">
                    {STAGES.map((stage, i) => {
                      const t = traces.find((t) => t.name === stage);
                      return (
                        <div
                          className={
                            t
                              ? "done"
                              : busy && traces.length === i
                                ? "running"
                                : ""
                          }
                          key={stage}
                        >
                          <span>
                            {t ? (
                              <Check size={15} />
                            ) : busy && traces.length === i ? (
                              <Loader2 size={15} className="spin" />
                            ) : (
                              i + 1
                            )}
                          </span>
                          <strong>{stage}</strong>
                          <small>{t ? t.duration_ms + " ms" : "Pending"}</small>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
              {result && !busy && (
                <ResultPanel
                  result={result}
                  inspect={setClaimModal}
                  source={setSourceModal}
                />
              )}
            </>
          )}

          {section === "library" && (
            <section className="card">
              <div className="card-heading">
                <div>
                  <h2>
                    Evidence library <Badge>{docs.length} documents</Badge>
                  </h2>
                  <p>Source documents, indexed and ready for retrieval.</p>
                </div>
                <div className="inline">
                  <Search size={15} />
                  <input
                    className="table-search"
                    aria-label="Filter documents"
                    placeholder="Search documents…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>DOCUMENT</th>
                      <th>CATEGORY</th>
                      <th>STATUS</th>
                      <th>PASSAGES</th>
                      <th>ADDED</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <button
                            className="document-title"
                            onClick={() => openDoc(d)}
                          >
                            <span className="file-icon">
                              <FileText size={19} />
                            </span>
                            <span>
                              {d.title}
                              <small>
                                {d.synthetic
                                  ? "Synthetic teaching fixture"
                                  : d.filename}
                              </small>
                            </span>
                          </button>
                        </td>
                        <td>{d.category}</td>
                        <td>
                          <Status status={d.processing_status} />
                        </td>
                        <td>{d.chunk_count}</td>
                        <td>{date(d.created_at)}</td>
                        <td>
                          <div className="inline">
                            <button
                              title="Preview document"
                              className="icon-button"
                              onClick={() => openDoc(d)}
                            >
                              <FileSearch size={16} />
                            </button>
                            <button
                              title="Re-index document"
                              className="icon-button"
                              disabled={busy}
                              onClick={() =>
                                action(async () => {
                                  await post(
                                    "/documents/" + d.id + "/index",
                                    {},
                                  );
                                  await reload();
                                  setNotice("Document re-indexed.");
                                })
                              }
                            >
                              <RefreshCw size={15} />
                            </button>
                            <button
                              title="Delete document"
                              className="icon-button danger"
                              disabled={busy}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Delete this document from your library? Existing reports preserve evidence snapshots.",
                                  )
                                )
                                  action(async () => {
                                    await api("/documents/" + d.id, {
                                      method: "DELETE",
                                    });
                                    await reload();
                                  });
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!filteredDocs.length && (
                <Empty
                  title="No documents found"
                  body="Upload a research document or change your search."
                  href="/upload"
                  label="Upload document"
                />
              )}
            </section>
          )}

          {section === "upload" && (
            <div className="upload-grid">
              <section className="card">
                <div className="card-heading">
                  <div>
                    <h2>Add to your evidence library</h2>
                    <p>
                      Text is extracted, chunked, and indexed automatically.
                    </p>
                  </div>
                  <UploadCloud size={20} />
                </div>
                <div className="upload-body">
                  <label
                    className="dropzone"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      setFiles(Array.from(e.dataTransfer.files));
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt,.csv,.json"
                      onChange={(e) =>
                        setFiles(Array.from(e.target.files || []))
                      }
                    />
                    <span>
                      <UploadCloud size={30} />
                    </span>
                    <h3>Drop your research documents here</h3>
                    <p>
                      or <b>browse files</b> on your computer
                    </p>
                    <small>PDF, DOCX, TXT, CSV, JSON · Up to 4 MB each</small>
                  </label>
                  {files.map((f, i) => (
                    <div className="selected-file" key={f.name + i}>
                      <FileText size={18} />
                      <span>
                        {f.name}
                        <small>{(f.size / 1024).toFixed(1)} KB</small>
                      </span>
                      <button
                        aria-label={"Remove " + f.name}
                        className="icon-button"
                        onClick={() =>
                          setFiles(files.filter((_, j) => i !== j))
                        }
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="form-grid">
                    <label>
                      Document title
                      <input
                        value={fileTitle}
                        onChange={(e) => setFileTitle(e.target.value)}
                        placeholder="Uses filename if left blank"
                      />
                    </label>
                    <label>
                      Category
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {[
                          "Clinical Research",
                          "Medical Guidelines",
                          "Research Publications",
                          "Drug Information",
                          "Clinical Protocols",
                          "Healthcare Reports",
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Author
                      <input
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="Optional"
                      />
                    </label>
                    <label>
                      Publication year
                      <input
                        type="number"
                        min="1800"
                        max="2100"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="Optional"
                      />
                    </label>
                  </div>
                  <button
                    className="button primary full"
                    disabled={busy || !files.length}
                    onClick={upload}
                  >
                    {busy ? (
                      <Loader2 className="spin" size={17} />
                    ) : (
                      <UploadCloud size={17} />
                    )}{" "}
                    Upload & index {files.length > 0 && `(${files.length})`}
                  </button>
                </div>
              </section>
              <aside className="card upload-guide">
                <span className="section-icon">
                  <ShieldCheck size={23} />
                </span>
                <h2>
                  Good evidence starts
                  <br />
                  with good sources.
                </h2>
                <p>
                  Use research documents you have permission to process. Source
                  attribution checks do not establish source reliability.
                </p>
                {[
                  "Validate format & file size",
                  "Extract text & page references",
                  "Create overlapping passages",
                  "Generate retrieval vectors",
                  "Index for evidence search",
                ].map((s, i) => (
                  <div className="guide-step" key={s}>
                    <span>{i + 1}</span>
                    {s}
                  </div>
                ))}
                <div className="config-note">
                  <ShieldAlert size={18} />
                  <p>
                    Upload synthetic or public research only. No real patient
                    information in this demo.
                  </p>
                </div>
              </aside>
            </div>
          )}

          {["rag", "verification", "correction", "reports"].includes(
            section,
          ) && (
            <>
              <ResultSelector
                history={history}
                result={result}
                select={setSelected}
              />
              {!result ? (
                <Empty
                  title="No assessment to inspect yet"
                  body="Run an investigation to explore retrieval, claim checks, and corrections."
                  href="/workspace"
                />
              ) : (
                <>
                  {section === "rag" && (
                    <>
                      <div className="info-strip">
                        <GitBranch size={20} />
                        <div>
                          <strong>{result.question}</strong>
                          <p>
                            Embedding: {String(system.retrieval)} · Top{" "}
                            {result.evidence.length} passages · RRF fusion
                          </p>
                        </div>
                      </div>
                      <div className="keyword-row">
                        {result.keywords?.map((k) => (
                          <Badge key={k}>{k}</Badge>
                        ))}
                      </div>
                      <div className="source-grid">
                        {result.evidence.map((p) => (
                          <article
                            className="card evidence-card"
                            key={p.chunk_id}
                          >
                            <div className="card-heading">
                              <Badge tone="green">[{p.citation}]</Badge>
                              <span>Page {p.page}</span>
                            </div>
                            <h3>{p.title}</h3>
                            <p>{p.text}</p>
                            <div className="score-grid">
                              {[
                                ["Vector", p.similarity],
                                ["BM25", p.bm25],
                                ["RRF", p.fusion],
                                ["Rerank", p.rerank],
                              ].map(([k, v]) => (
                                <div key={k}>
                                  <small>{k}</small>
                                  <strong>{v}</strong>
                                </div>
                              ))}
                            </div>
                            <button
                              className="text-link"
                              onClick={() => setSourceModal(p)}
                            >
                              Inspect source passage <ArrowUpRight size={14} />
                            </button>
                          </article>
                        ))}
                      </div>
                      {!result.evidence.length && (
                        <Empty
                          title="No relevant passages retrieved"
                          body="Add relevant sources or select a broader evidence library."
                          href="/upload"
                          label="Add evidence"
                        />
                      )}
                      <section className="card text-card">
                        <h2>Final model context</h2>
                        <p className="muted">
                          Source excerpts are treated as untrusted data. Context
                          is capped for provider requests.
                        </p>
                        <pre>
                          {result.evidence
                            .map(
                              (p) =>
                                `[${p.citation}] ${p.title} · Page ${p.page}\n${p.text}`,
                            )
                            .join("\n\n") || "No context available."}
                        </pre>
                      </section>
                    </>
                  )}
                  {section === "verification" && (
                    <>
                      <div className="mini-stats">
                        {[
                          "Supported",
                          "Partially Supported",
                          "Unsupported",
                          "Contradicted",
                          "Insufficient Evidence",
                        ].map((s, i) => (
                          <article className="card" key={s}>
                            <span style={{ color: COLORS[i] }}>{s}</span>
                            <strong>
                              {
                                result.claims.filter((c) => c.status === s)
                                  .length
                              }
                            </strong>
                          </article>
                        ))}
                      </div>
                      <section className="card">
                        <div className="card-heading">
                          <h2>Claim-by-claim evidence assessment</h2>
                          <Badge>System estimates</Badge>
                        </div>
                        <div className="filter-tabs">
                          {[
                            "All",
                            "Supported",
                            "Partially Supported",
                            "Unsupported",
                            "Contradicted",
                            "Insufficient Evidence",
                          ].map((s) => (
                            <button
                              key={s}
                              className={filter === s ? "selected" : ""}
                              onClick={() => setFilter(s)}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                        <ClaimsTable
                          claims={filteredClaims}
                          inspect={setClaimModal}
                        />
                      </section>
                    </>
                  )}
                  {section === "correction" && (
                    <>
                      <div className="info-strip">
                        <RefreshCw size={20} />
                        <div>
                          <strong>
                            {result.iteration} correction iteration
                            {result.iteration === 1 ? "" : "s"} ·{" "}
                            {result.corrections.reduce(
                              (n, c) => n + c.removed.length,
                              0,
                            )}{" "}
                            statements removed
                          </strong>
                          <p>
                            Supported statements are preserved. Unsupported
                            statements are removed and the remaining claims are
                            checked again.
                          </p>
                        </div>
                        <Badge tone={result.valid ? "green" : "amber"}>
                          {result.valid
                            ? "Source attribution checked"
                            : "Insufficient evidence"}
                        </Badge>
                      </div>
                      <div className="comparison-grid">
                        <section className="card text-card">
                          <Badge tone="amber">BEFORE · INITIAL ANSWER</Badge>
                          <h2>Original generated response</h2>
                          <p className="answer-text">{result.answer}</p>
                        </section>
                        <section className="card text-card corrected">
                          <Badge tone="green">AFTER · RECHECKED ANSWER</Badge>
                          <h2>Evidence-constrained response</h2>
                          <p className="answer-text">
                            {result.corrected_answer}
                          </p>
                        </section>
                      </div>
                      {result.corrections.map((c) => (
                        <section key={c.iteration} className="card text-card">
                          <h2>Iteration {c.iteration}</h2>
                          <p>{c.reason}</p>
                          {c.removed.map((t) => (
                            <div key={t} className="removed">
                              <X size={15} />
                              <span>{t}</span>
                              <Badge tone="red">Removed</Badge>
                            </div>
                          ))}
                        </section>
                      ))}
                      <section className="card">
                        <div className="card-heading">
                          <h2>Final validation</h2>
                          <Badge tone="green">
                            {result.final_claims.length} claims rechecked
                          </Badge>
                        </div>
                        <ClaimsTable
                          claims={result.final_claims}
                          inspect={setClaimModal}
                        />
                      </section>
                    </>
                  )}
                  {section === "reports" && (
                    <section className="card report-card">
                      <span className="report-icon">
                        <FileCheck2 size={38} />
                      </span>
                      <Badge tone="green">RESEARCH EVIDENCE REPORT</Badge>
                      <h2>{result.question}</h2>
                      <p>
                        Complete source assessment with the original answer,
                        claim classifications, retrieved evidence, correction
                        history, final response, execution trace, and
                        limitations.
                      </p>
                      <div className="report-meta">
                        <span>
                          <Clock3 size={15} />
                          {date(result.created_at)}
                        </span>
                        <span>
                          <FileCheck2 size={15} />
                          {result.claims.length} claims assessed
                        </span>
                        <span>
                          <BookOpen size={15} />
                          {result.evidence.length} source passages
                        </span>
                      </div>
                      <div className="inline center">
                        <a
                          className="button primary"
                          href={
                            "/api/reports/" + result.id + "/download?format=pdf"
                          }
                        >
                          <Download size={16} /> Download PDF report
                        </a>
                        <a
                          className="button"
                          href={
                            "/api/reports/" + result.id + "/download?format=csv"
                          }
                        >
                          <Download size={16} /> Export claims CSV
                        </a>
                      </div>
                      <small>
                        AI-assisted assessment. Qualified clinical review is
                        always required.
                      </small>
                    </section>
                  )}
                </>
              )}
            </>
          )}

          {section === "history" && (
            <section className="card">
              <div className="card-heading">
                <div>
                  <h2>Investigation history</h2>
                  <p>{history.length} saved assessments in your workspace</p>
                </div>
                <Link className="button primary" href="/workspace">
                  <Plus size={15} /> New investigation
                </Link>
              </div>
              <HistoryTable
                items={filteredHistory}
                select={(q) => {
                  setSelected(q);
                  router.push("/verification");
                }}
                remove={(q) => {
                  if (window.confirm("Delete this assessment and its claims?"))
                    action(async () => {
                      await api("/clinical/queries/" + q.id, {
                        method: "DELETE",
                      });
                      await reload();
                    });
                }}
              />
            </section>
          )}

          {section === "analytics" && overview && (
            <>
              <div className="stats-grid">
                {[
                  ["Claims assessed", overview.claims],
                  ["Flagged initial claims", overview.flagged],
                  ["Successfully corrected", overview.corrected],
                  ["Mean processing time", overview.processing_ms + " ms"],
                ].map(([k, v]) => (
                  <article className="stat-card" key={k}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                    <small>Computed from saved workspace records</small>
                  </article>
                ))}
              </div>
              <div className="comparison-grid">
                <section className="card">
                  <div className="card-heading">
                    <h2>Claim classification breakdown</h2>
                  </div>
                  {overview.claims ? (
                    <div className="chart">
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                          data={overview.distribution}
                          layout="vertical"
                        >
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={130}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip />
                          <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                            {COLORS.map((c) => (
                              <Cell key={c} fill={c} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <Empty
                      title="No claims assessed yet"
                      body="Start an investigation to populate your analytics."
                      href="/workspace"
                    />
                  )}
                </section>
                <section className="card">
                  <div className="card-heading">
                    <h2>Evidence source distribution</h2>
                  </div>
                  <div className="chart">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={overview.sources}>
                        <CartesianGrid strokeDasharray="4 5" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar
                          dataKey="value"
                          fill="#16a68f"
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>
              <div className="info-strip">
                <ShieldAlert size={20} />
                <p>
                  Source distribution describes provenance, not source
                  reliability. Demo evaluations do not measure real-world
                  clinical accuracy. Average final system estimate:{" "}
                  {percent(overview.confidence)}.
                </p>
              </div>
            </>
          )}

          {section === "audit" && (
            <section className="card">
              <div className="card-heading">
                <h2>Workspace audit trail</h2>
                <Badge>{audit.length} recent events</Badge>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>EVENT</th>
                      <th>RESOURCE</th>
                      <th>RESOURCE ID</th>
                      <th>TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <span className="inline">
                            <Activity size={15} />
                            {a.action.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td>
                          <Badge>{a.resource_type}</Badge>
                        </td>
                        <td>
                          <code>
                            {a.resource_id.slice(0, 18) || "Workspace"}
                          </code>
                        </td>
                        <td>{date(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {["settings", "profile"].includes(section) && (
            <div className="settings-grid">
              <section className="card">
                <div className="card-heading">
                  <h2>
                    {section === "profile"
                      ? "Researcher profile"
                      : "Retrieval & verification defaults"}
                  </h2>
                  <Settings2 size={18} />
                </div>
                <div className="settings-body">
                  {section === "profile" ? (
                    <>
                      <label>
                        Display name
                        <input
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          maxLength={80}
                        />
                      </label>
                      <label>
                        Email address
                        <input value={user.email} readOnly />
                      </label>
                      <label>
                        Workspace role<Badge tone="green">{user.role}</Badge>
                      </label>
                    </>
                  ) : (
                    <>
                      <label>
                        Default retrieved passages
                        <select
                          value={topK}
                          onChange={(e) => setTopK(+e.target.value)}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Maximum correction iterations
                        <select
                          value={maxIterations}
                          onChange={(e) => setMaxIterations(+e.target.value)}
                        >
                          {[1, 2, 3].map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                      <div className="config-note">
                        <ShieldCheck size={18} />
                        <p>
                          All factual claims are checked. Similarity alone never
                          establishes support. API keys and model configuration
                          are managed server-side through environment variables.
                        </p>
                      </div>
                    </>
                  )}
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() =>
                      action(async () => {
                        const u = await api<User>("/auth/me", {
                          method: "PATCH",
                          body: JSON.stringify({
                            name: profileName || user.name,
                            settings: {
                              top_k: topK,
                              max_iterations: maxIterations,
                            },
                          }),
                        });
                        setUser(u);
                        setNotice("Preferences saved.");
                      })
                    }
                  >
                    <Check size={16} /> Save changes
                  </button>
                </div>
              </section>
              <section className="card">
                <div className="card-heading">
                  <h2>System & session</h2>
                  <ShieldCheck size={18} />
                </div>
                <div className="settings-body">
                  {["storage", "retrieval", "generation", "orchestrator"].map(
                    (k) => (
                      <div className="setting-row" key={k}>
                        <small>{k}</small>
                        <strong>{String(system[k] || "Unavailable")}</strong>
                      </div>
                    ),
                  )}
                  <p className="muted">
                    Model keys are never stored in the browser. All documents
                    and assessments are scoped to your account.
                  </p>
                  <button
                    className="button"
                    onClick={() =>
                      action(async () => {
                        await post("/auth/logout", {});
                        setUser(null);
                        router.push("/login");
                      })
                    }
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              </section>
            </div>
          )}

          <div className="content-footer">
            <span>
              <ShieldCheck size={13} /> AI-assisted research · Always apply
              qualified clinical review
            </span>
            <span>
              MediVerify AI <i /> Evidence you can inspect.
            </span>
          </div>
        </main>
      </div>
      {(sourceModal || claimModal) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setSourceModal(null);
            setClaimModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Evidence details"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-heading">
              <h2>
                {claimModal ? "Claim evidence detail" : "Source inspection"}
              </h2>
              <button
                className="icon-button"
                aria-label="Close details"
                onClick={() => {
                  setSourceModal(null);
                  setClaimModal(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {claimModal ? (
                <>
                  <Status status={claimModal.status} />
                  <h3>{claimModal.text}</h3>
                  <p>{claimModal.explanation}</p>
                  <div className="info-strip">
                    <strong>{percent(claimModal.confidence)}</strong>
                    <span>System estimate, not a clinical probability.</span>
                  </div>
                  <h4>Matching source passages</h4>
                  {claimModal.evidence.map((p) => (
                    <div className="source-excerpt" key={p.chunk_id}>
                      <Badge tone="green">
                        [{p.citation}] · Page {p.page}
                      </Badge>
                      <h4>{p.title}</h4>
                      <blockquote>{p.matched_passage || p.text}</blockquote>
                      <small>
                        Chunk {p.chunk_id} ·{" "}
                        {p.synthetic
                          ? "Synthetic teaching evidence"
                          : "User-uploaded source"}
                      </small>
                    </div>
                  ))}
                  {!claimModal.evidence.length && (
                    <p>No matching evidence was retrieved.</p>
                  )}
                  <p>
                    <strong>Recommended action:</strong> {claimModal.action}
                  </p>
                </>
              ) : (
                sourceModal && (
                  <>
                    <h3>{sourceModal.title}</h3>
                    <Badge tone={sourceModal.synthetic ? "amber" : "green"}>
                      {sourceModal.synthetic
                        ? "Synthetic teaching fixture"
                        : "Uploaded evidence"}
                    </Badge>
                    {"text" in sourceModal ? (
                      <div className="source-excerpt">
                        <Badge>
                          Page {sourceModal.page} · [{sourceModal.citation}]
                        </Badge>
                        <blockquote>{sourceModal.text}</blockquote>
                        <small>
                          Document {sourceModal.document_id}
                          <br />
                          Chunk {sourceModal.chunk_id}
                        </small>
                      </div>
                    ) : preview.length ? (
                      preview.map((p, i) => (
                        <div key={i} className="source-excerpt">
                          <Badge>Page {p.page}</Badge>
                          <blockquote>{p.text}</blockquote>
                        </div>
                      ))
                    ) : (
                      <p>Loading extracted passages…</p>
                    )}
                  </>
                )
              )}
              <p className="muted">
                Source attribution does not independently establish medical
                correctness.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function HistoryTable({
  items,
  select,
  remove,
  compact = false,
}: {
  items: Result[];
  select: (q: Result) => void;
  remove?: (q: Result) => void;
  compact?: boolean;
}) {
  return items.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>RESEARCH QUESTION</th>
            <th>ASSESSMENT</th>
            {!compact && <th>CLAIMS</th>}
            <th>CREATED</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((q) => (
            <tr key={q.id}>
              <td>
                <button className="history-question" onClick={() => select(q)}>
                  <span className="file-icon">
                    <FileSearch size={17} />
                  </span>
                  <span>
                    {q.question}
                    <small>{q.mode}</small>
                  </span>
                </button>
              </td>
              <td>
                <Badge tone={q.valid ? "green" : "amber"}>
                  {q.valid ? "Source-checked" : "Insufficient evidence"}
                </Badge>
              </td>
              {!compact && <td>{q.claims.length}</td>}
              <td>{date(q.created_at)}</td>
              <td>
                <div className="inline">
                  <button
                    title="Inspect assessment"
                    className="icon-button"
                    onClick={() => select(q)}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                  {remove && (
                    <button
                      title="Delete assessment"
                      className="icon-button danger"
                      onClick={() => remove(q)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty
      title="Your first investigation awaits"
      body="Ask a question and see the evidence behind every answer."
      href="/workspace"
      label="Start investigating"
    />
  );
}
function ResultSelector({
  history,
  result,
  select,
}: {
  history: Result[];
  result: Result | null;
  select: (q: Result) => void;
}) {
  return history.length ? (
    <div className="result-selector">
      <label>
        <History size={16} /> Investigation
        <select
          aria-label="Choose an investigation"
          value={result?.id || ""}
          onChange={(e) => {
            const q = history.find((q) => q.id === e.target.value);
            if (q) select(q);
          }}
        >
          {history.map((q) => (
            <option key={q.id} value={q.id}>
              {q.question} — {date(q.created_at)}
            </option>
          ))}
        </select>
      </label>
      <Link href="/workspace" className="button">
        <Plus size={14} /> New investigation
      </Link>
    </div>
  ) : null;
}
function ClaimsTable({
  claims,
  inspect,
}: {
  claims: Claim[];
  inspect: (c: Claim) => void;
}) {
  return (
    <>
      <div className="table-scroll">
        <table className="claims-table">
          <thead>
            <tr>
              <th>CLAIM</th>
              <th>STATUS</th>
              <th>EVIDENCE SOURCE</th>
              <th>SYSTEM ESTIMATE</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id}>
                <td>
                  <button onClick={() => inspect(c)} className="claim-text">
                    <small>{c.id}</small>
                    {c.text}
                  </button>
                </td>
                <td>
                  <Status status={c.status} />
                </td>
                <td>
                  {c.evidence[0] ? (
                    <span>
                      {c.evidence[0].title}
                      <small className="block">
                        Page {c.evidence[0].page} · [{c.evidence[0].citation}]
                      </small>
                    </span>
                  ) : (
                    <span className="muted">No evidence</span>
                  )}
                </td>
                <td>
                  <div className="confidence">
                    <span>{percent(c.confidence)}</span>
                    <div>
                      <i
                        style={{
                          width: percent(c.confidence),
                          background:
                            c.status === "Supported" ? "#13a991" : "#e9ae57",
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td>
                  <button
                    className="icon-button"
                    title="Inspect claim"
                    onClick={() => inspect(c)}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!claims.length && (
        <Empty
          title="No claims in this view"
          body="Change the filter or start an investigation with relevant evidence."
        />
      )}
    </>
  );
}
function ResultPanel({
  result,
  inspect,
  source,
}: {
  result: Result;
  inspect: (c: Claim) => void;
  source: (s: Source) => void;
}) {
  const [tab, setTab] = useState("Final answer");
  return (
    <section className="card result-panel">
      <div className="card-heading">
        <div>
          <h2>
            <ShieldCheck size={20} /> Evidence assessment
          </h2>
          <p>{result.question}</p>
        </div>
        <Badge tone={result.valid ? "green" : "amber"}>
          {result.valid
            ? "Source attribution checked"
            : "Insufficient evidence"}
        </Badge>
      </div>
      <div className="result-summary">
        <span>
          <FileCheck2 size={15} />
          <strong>{result.claims.length}</strong> claims assessed
        </span>
        <span>
          <BookOpen size={15} />
          <strong>{result.evidence.length}</strong> passages retrieved
        </span>
        <span>
          <RefreshCw size={15} />
          <strong>{result.iteration}</strong> corrections
        </span>
        <span>
          <Clock3 size={15} />
          {result.elapsed_ms.toFixed(0)} ms
        </span>
      </div>
      <div className="filter-tabs">
        {["Final answer", "Original answer", "Claim assessment", "Sources"].map(
          (t) => (
            <button
              key={t}
              className={tab === t ? "selected" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ),
        )}
      </div>
      {tab === "Final answer" || tab === "Original answer" ? (
        <div className="answer-body">
          <Badge tone={tab === "Final answer" ? "green" : "amber"}>
            {tab === "Final answer"
              ? "AFTER CORRECTION & RECHECK"
              : "INITIAL RESPONSE · MAY CONTAIN UNSUPPORTED CLAIMS"}
          </Badge>
          <p className="answer-text">
            {tab === "Final answer" ? result.corrected_answer : result.answer}
          </p>
          <div className="citation-links">
            {result.evidence.map((p) => (
              <button key={p.chunk_id} onClick={() => source(p)}>
                <BookOpen size={13} />[{p.citation}] {p.title} · p.{p.page}
                <ExternalLink size={12} />
              </button>
            ))}
          </div>
        </div>
      ) : tab === "Claim assessment" ? (
        <ClaimsTable claims={result.claims} inspect={inspect} />
      ) : (
        <div className="answer-body">
          {result.evidence.map((p) => (
            <button
              className="source-result"
              key={p.chunk_id}
              onClick={() => source(p)}
            >
              <Badge tone="green">[{p.citation}]</Badge>
              <span>
                <strong>{p.title}</strong>
                <small>{p.text}</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      )}
      <div className="result-footer">
        <span>
          <ShieldAlert size={14} /> AI-assisted source assessment. Clinical
          validity is not established.
        </span>
        <Link href="/reports">
          <Download size={14} /> Export report
        </Link>
      </div>
    </section>
  );
}
