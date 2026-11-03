import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Clock3,
  Command,
  Filter,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  Sun,
  Users,
  X,
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");
const STATUSES = ["open", "in_progress", "blocked", "done"];
const PRIORITIES = ["low", "medium", "high", "critical"];
const CATEGORIES = ["incident", "change", "task", "access"];
const EMPTY_FORM = {
  title: "",
  description: "",
  status: "open",
  priority: "medium",
  category: "task",
  assignee: "",
  reporter: "",
};

function getInitialTheme() {
  const saved = localStorage.getItem("clearpath-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function label(value) {
  return value.replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // Keep the HTTP status message when the response has no JSON body.
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_status: {} });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [activePage, setActivePage] = useState("Overview");
  const [apiStatus, setApiStatus] = useState("checking");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("clearpath-theme", theme);
  }, [theme]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    return params.toString();
  }, [search, statusFilter, priorityFilter]);

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setPageLoading(true);
    const healthCheck = api("/health")
      .then(() => setApiStatus("healthy"))
      .catch(() => setApiStatus("unavailable"));
    try {
      const [items, totals] = await Promise.all([
        api(`/requests${query ? `?${query}` : ""}`),
        api("/requests/stats"),
      ]);
      setRequests(items);
      setStats(totals);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setPageLoading(false);
    }
    await healthCheck;
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadData(true), 180);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const startCreate = () => {
    setError("");
    setForm(EMPTY_FORM);
    setModal({ mode: "create" });
  };

  const startEdit = (item) => {
    setError("");
    setForm({
      title: item.title || "",
      description: item.description || "",
      status: item.status || "open",
      priority: item.priority || "medium",
      category: item.category || "task",
      assignee: item.assignee || "",
      reporter: item.reporter || "",
    });
    setModal({ mode: "edit", item });
  };

  const saveRequest = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (modal.mode === "create") {
        await api("/requests", { method: "POST", body: JSON.stringify(form) });
      } else {
        await api(`/requests/${modal.item.id}`, { method: "PUT", body: JSON.stringify(form) });
      }
      setModal(null);
      await loadData();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteRequest = async () => {
    setBusy(true);
    setError("");
    try {
      await api(`/requests/${modal.item.id}`, { method: "DELETE" });
      setModal(null);
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusy(false);
    }
  };

  const renderTable = (items) => (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Work request</th>
            <th>Category</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assignee</th>
            <th>Updated</th>
            <th><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <button className="request-link" onClick={() => startEdit(item)}>{item.title}</button>
                <span className="request-id">CP-{item.id.slice(-5).toUpperCase()}</span>
              </td>
              <td><span className="category-label">{item.category}</span></td>
              <td><span className={`priority priority-${item.priority}`}>{item.priority}</span></td>
              <td><span className={`status status-${item.status}`}>{label(item.status)}</span></td>
              <td><span className="person">{item.assignee || "Unassigned"}</span></td>
              <td className="date-cell">{formatDate(item.updated_at)}</td>
              <td>
                <button
                  className="icon-button row-menu"
                  aria-label={`Edit ${item.title}`}
                  onClick={() => startEdit(item)}
                >
                  <MoreHorizontal size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && !pageLoading && (
        <div className="empty-state">
          <ClipboardList size={26} />
          <strong>No work requests found</strong>
          <span>Try adjusting your filters or create a new request.</span>
          <button className="button button-secondary" onClick={startCreate}><Plus size={16} /> New request</button>
        </div>
      )}
      {pageLoading && (
        <div className="table-loading"><LoaderCircle className="spin" size={20} /> Loading requests…</div>
      )}
    </div>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setActivePage("Overview"); }}>
          <span className="brand-mark"><Command size={19} strokeWidth={2.5} /></span>
          <span className="brand-name">clearpath<span>.</span></span>
        </a>
        <div className="workspace-switcher">
          <div className="workspace-avatar">N</div>
          <div className="workspace-copy"><strong>Clearpath team</strong><span>Workspace</span></div>
          <ChevronDown size={16} />
        </div>
        <div className="nav-heading">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <button className={activePage === "Overview" ? "nav-item active" : "nav-item"} onClick={() => { setActivePage("Overview"); setMobileNav(false); }}>
            <LayoutDashboard size={18} /> Overview
          </button>
          <button className={activePage === "Requests" ? "nav-item active" : "nav-item"} onClick={() => { setActivePage("Requests"); setMobileNav(false); }}>
            <ClipboardList size={18} /> Requests <span className="nav-count">{stats.total}</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CircleHelp size={17} /></div>
            <div><strong>Need a hand?</strong><span>Visit the help center</span></div>
            <ArrowUpRight size={15} />
          </div>
          <button className="profile-button">
            <span className="profile-avatar">AL</span>
            <span className="profile-copy"><strong>Alex Lewis</strong><span>Operations lead</span></span>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activePage}</strong></div>
          <div className="topbar-actions">
            <span className="today-label"><Clock3 size={15} /> <span>{new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span></span>
            <span className="topbar-divider" />
            <button
              className="icon-button theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-button settings-button" aria-label="Settings"><Settings size={18} /></button>
            <span className="topbar-avatar">AL</span>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="live-dot" /> OPERATIONS OVERVIEW</div>
              <h1>{activePage === "Overview" ? "Good morning, Alex" : "Work requests"}</h1>
              <p>{activePage === "Overview" ? "Here’s what’s happening across your team today." : "Track, prioritize, and manage your team’s work."}</p>
            </div>
            <button className="button button-primary" onClick={startCreate}><Plus size={17} /> New request</button>
          </div>

          {error && <div className="error-banner" role="alert"><ShieldAlert size={18} /><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}

          {activePage === "Overview" && (
            <>
              <section className="stats-grid" aria-label="Request summary">
                <article className="stat-card stat-total">
                  <div className="stat-top"><span className="stat-icon blue"><ClipboardList size={18} /></span><span className="stat-caption">ALL REQUESTS</span><ArrowUpRight size={16} className="stat-trend" /></div>
                  <div className="stat-value">{stats.total ?? 0}</div>
                  <div className="stat-foot"><span className="stat-note">Across your workspace</span></div>
                </article>
                <article className="stat-card">
                  <div className="stat-top"><span className="stat-icon amber"><Clock3 size={18} /></span><span className="stat-caption">OPEN</span><span className="stat-indicator amber-indicator" /></div>
                  <div className="stat-value">{stats.by_status?.open ?? 0}</div>
                  <div className="stat-foot"><span className="stat-note">Awaiting action</span></div>
                </article>
                <article className="stat-card">
                  <div className="stat-top"><span className="stat-icon violet"><Activity size={18} /></span><span className="stat-caption">IN PROGRESS</span><span className="stat-indicator violet-indicator" /></div>
                  <div className="stat-value">{stats.by_status?.in_progress ?? 0}</div>
                  <div className="stat-foot"><span className="stat-note">Currently being worked</span></div>
                </article>
                <article className="stat-card">
                  <div className="stat-top"><span className="stat-icon green"><Check size={18} /></span><span className="stat-caption">COMPLETED</span><span className="stat-indicator green-indicator" /></div>
                  <div className="stat-value">{stats.by_status?.done ?? 0}</div>
                  <div className="stat-foot"><span className="stat-note">Successfully resolved</span></div>
                </article>
              </section>

              <section className="insight-strip">
                <div className="insight-symbol"><Users size={18} /></div>
                <div className="insight-copy"><strong>Keep work moving</strong><span>Clear ownership helps your team stay on top of incoming requests.</span></div>
                <button className="text-button" onClick={() => setActivePage("Requests")}>View all requests <ArrowUpRight size={15} /></button>
              </section>

              <section className="panel request-panel">
                <div className="panel-heading">
                  <div><h2>Recent requests</h2><p>Your team’s latest work, all in one place.</p></div>
                  <button className="button button-secondary small-button" onClick={() => setActivePage("Requests")}>View all <ArrowUpRight size={15} /></button>
                </div>
                {renderTable(requests.slice(0, 5))}
              </section>
            </>
          )}

          {activePage === "Requests" && (
            <section className="panel request-panel full-request-panel">
              <div className="panel-heading requests-heading">
                <div><h2>All requests <span className="heading-count">{stats.total}</span></h2><p>Search and filter your team’s work requests.</p></div>
                <div className="view-note"><span className="view-dot" /> Live workspace</div>
              </div>
              <div className="toolbar">
                <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests..." /></label>
                <div className="filter-control"><Filter size={16} />
                  <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="">All statuses</option>
                    {STATUSES.map((value) => <option key={value} value={value}>{label(value)}</option>)}
                  </select>
                </div>
                <div className="filter-control">
                  <select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                    <option value="">All priorities</option>
                    {PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <ChevronDown size={15} className="select-chevron" />
                </div>
                <button className="icon-button sort-button" aria-label="Sort requests"><ArrowDownUp size={17} /></button>
              </div>
              {renderTable(requests)}
            </section>
          )}

          <footer className="page-footer"><span>Clearpath <span className="footer-dot">·</span> Internal work management</span><span><span className={`footer-status ${apiStatus === "unavailable" ? "footer-status-offline" : ""}`} /> {apiStatus === "checking" ? "Checking API" : apiStatus === "healthy" ? "API operational" : "API unavailable"}</span></footer>
        </div>
      </main>

      {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

      {modal && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setModal(null); }}>
          {modal.mode === "delete" ? (
            <section className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
              <button className="modal-close icon-button" onClick={() => setModal(null)} aria-label="Close"><X size={18} /></button>
              <div className="confirm-icon"><LogOut size={20} /></div>
              <h2 id="delete-title">Delete this request?</h2>
              <p><strong>{modal.item.title}</strong> will be permanently removed. This action can’t be undone.</p>
              {error && <div className="modal-error" role="alert">{error}</div>}
              <div className="modal-actions"><button className="button button-secondary" onClick={() => setModal(null)}>Cancel</button><button className="button button-danger" onClick={deleteRequest} disabled={busy}>{busy ? "Deleting…" : "Delete request"}</button></div>
            </section>
          ) : (
            <section className="modal request-modal" role="dialog" aria-modal="true" aria-labelledby="request-form-title">
              <div className="modal-header"><div><div className="eyebrow">WORKSPACE REQUEST</div><h2 id="request-form-title">{modal.mode === "create" ? "Create a request" : "Edit request"}</h2><p>Give your team the context they need to get started.</p></div><button className="modal-close icon-button" onClick={() => setModal(null)} aria-label="Close" disabled={busy}><X size={18} /></button></div>
              {error && <div className="modal-error" role="alert">{error}</div>}
              <form onSubmit={saveRequest}>
                <label className="form-field"><span>Request title <b>*</b></span><input autoFocus required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What needs to be done?" /></label>
                <label className="form-field"><span>Description</span><textarea rows="3" maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Add helpful details or context..." /></label>
                <div className="form-grid">
                  <label className="form-field"><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{STATUSES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
                  <label className="form-field"><span>Priority</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                  <label className="form-field"><span>Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                  <label className="form-field"><span>Assignee</span><input value={form.assignee} onChange={(event) => setForm({ ...form, assignee: event.target.value })} placeholder="Name" /></label>
                  <label className="form-field form-full"><span>Reporter</span><input value={form.reporter} onChange={(event) => setForm({ ...form, reporter: event.target.value })} placeholder="Name" /></label>
                </div>
                <div className="modal-actions">
                  {modal.mode === "edit" && <button type="button" className="button button-danger-outline delete-inline" onClick={() => setModal({ mode: "delete", item: modal.item })}>Delete</button>}
                  <button type="button" className="button button-secondary" onClick={() => setModal(null)} disabled={busy}>Cancel</button>
                  <button type="submit" className="button button-primary" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={16} /> Saving…</> : <>{modal.mode === "create" ? "Create request" : "Save changes"} <ArrowUpRight size={15} /></>}</button>
                </div>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
