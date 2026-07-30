import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCustomer,
  getCustomers,
  getDashboardStats,
  getTodayDeliveries,
  updateCustomer,
  updateDeliveryStatus,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import CustomerModal from "./CustomerModal";
import SettingsPanel from "./SettingsPanel";
import StatusModal from "./StatusModal";

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatNiceDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatActivityTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const STATUS_LABELS = {
  delivered: "Delivered",
  pending: "Pending",
  not_delivered: "Not delivered",
};

const NAV_ITEMS = [
  { id: "dashboard", label: "Today's run", icon: "◎" },
  { id: "customers", label: "Customers", icon: "❀" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

function DonutChart({ delivered, pending, notDelivered, total }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const safeTotal = total || 1;
  const dLen = (delivered / safeTotal) * c;
  const pLen = (pending / safeTotal) * c;
  const nLen = (notDelivered / safeTotal) * c;

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut-svg" aria-hidden="true">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#efe4d8" strokeWidth="16" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#6f8f66"
          strokeWidth="16"
          strokeDasharray={`${dLen} ${c - dLen}`}
          strokeDashoffset={c * 0.25}
          strokeLinecap="round"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#d4a15c"
          strokeWidth="16"
          strokeDasharray={`${pLen} ${c - pLen}`}
          strokeDashoffset={c * 0.25 - dLen}
          strokeLinecap="round"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#c16b5c"
          strokeWidth="16"
          strokeDasharray={`${nLen} ${c - nLen}`}
          strokeDashoffset={c * 0.25 - dLen - pLen}
          strokeLinecap="round"
        />
      </svg>
      <div className="donut-center">
        <strong>{total}</strong>
        <span>Total stops</span>
      </div>
    </div>
  );
}

function MiniCalendar({ value, onChange }) {
  const selected = new Date(`${value}T12:00:00`);
  const [cursor, setCursor] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  );

  useEffect(() => {
    setCursor(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const label = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const cells = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const pick = (day) => {
    const pad = (n) => String(n).padStart(2, "0");
    onChange(`${year}-${pad(month + 1)}-${pad(day)}`);
  };

  return (
    <div className="mini-cal" id="calendar">
      <div className="mini-cal-head">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
        >
          ‹
        </button>
        <strong>{label}</strong>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
        >
          ›
        </button>
      </div>
      <div className="mini-cal-grid dow">
        {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mini-cal-grid">
        {cells.map((day, i) =>
          day ? (
            <button
              key={`${year}-${month}-${day}`}
              type="button"
              className={
                selected.getFullYear() === year &&
                selected.getMonth() === month &&
                selected.getDate() === day
                  ? "day on"
                  : "day"
              }
              onClick={() => pick(day)}
            >
              {day}
            </button>
          ) : (
            <span key={`e-${i}`} />
          )
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout, signupInfo } = useAuth();
  const [view, setView] = useState("dashboard");
  const [date, setDate] = useState(todayISO());
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    pending: 0,
    not_delivered: 0,
  });
  const [deliveries, setDeliveries] = useState([]);
  const [allToday, setAllToday] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(null);
  const [customerModal, setCustomerModal] = useState({ open: false, customer: null });
  const [statusModal, setStatusModal] = useState({ open: false, record: null });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        date,
        ...(search ? { search } : {}),
      };
      const [statsData, deliveryData, unfiltered] = await Promise.all([
        getDashboardStats(date),
        getTodayDeliveries(params),
        getTodayDeliveries({ date }),
      ]);
      setStats(statsData);
      setDeliveries(deliveryData.results || []);
      setAllToday(unfiltered.results || []);
    } catch (err) {
      console.error(err);
      setError("Unable to reach the Fleurish API. Is the Django server running?");
    } finally {
      setLoading(false);
    }
  }, [date, search]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        ...(search ? { search } : {}),
      };
      const customerData = await getCustomers(params);
      setCustomers(customerData);
    } catch (err) {
      console.error(err);
      setError("Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (view === "dashboard") {
      const t = setTimeout(loadDashboard, 180);
      return () => clearTimeout(t);
    }
    if (view === "customers") {
      const t = setTimeout(loadCustomers, 180);
      return () => clearTimeout(t);
    }
    setLoading(false);
    return undefined;
  }, [view, loadDashboard, loadCustomers]);

  const handleSaveCustomer = async (payload, id) => {
    if (id) await updateCustomer(id, payload);
    else await createCustomer(payload);
    if (view === "customers") await loadCustomers();
    else await loadDashboard();
  };

  const handleStatusSave = async (id, payload) => {
    await updateDeliveryStatus(id, payload);
    setMenuOpen(null);
    await loadDashboard();
  };

  const displayName = user?.first_name || user?.username || "Studio";

  const activity = useMemo(() => {
    return [...allToday]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 5);
  }, [allToday]);

  const navClick = (item) => {
    setView(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderDeliveryActions = (d) => (
    <div className="mobile-stop-actions">
      <button
        type="button"
        className="chip delivered"
        onClick={() =>
          handleStatusSave(d.id, { status: "delivered", remarks: d.remarks || "" })
        }
      >
        Delivered
      </button>
      <button
        type="button"
        className="chip pending"
        onClick={() =>
          handleStatusSave(d.id, { status: "pending", remarks: d.remarks || "" })
        }
      >
        Pending
      </button>
      <button
        type="button"
        className="chip not_delivered"
        onClick={() => setStatusModal({ open: true, record: d })}
      >
        Update…
      </button>
    </div>
  );

  return (
    <div className="studio-shell">
      <aside className="studio-sidebar desktop-only">
        <div className="side-brand">
          <img src="/logo.jpg" alt="Fleurish & Co." />
          <div>
            <strong>Fleurish &amp; Co.</strong>
            <span>Studio Delivery</span>
          </div>
        </div>

        <nav className="side-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? "active" : ""}
              onClick={() => navClick(item)}
            >
              <span className="nav-ico" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="side-help">
          <p>Need help?</p>
          <div className="help-art" aria-hidden="true">
            <img src="/logo.jpg" alt="" />
          </div>
          <a className="btn ghost tiny wide" href="mailto:hello@fleurish.co">
            Contact support
          </a>
        </div>
      </aside>

      <div className="studio-main">
        <header className="studio-top">
          <div className="studio-top-copy">
            <div className="mobile-brand-row mobile-only">
              <img src="/logo.jpg" alt="" className="mobile-brand-logo" />
              <span>Fleurish &amp; Co.</span>
            </div>
            <h1>
              {greetingForNow()}, {displayName}{" "}
              <span aria-hidden="true">🌸</span>
            </h1>
            <p className="desktop-only">Here&apos;s your delivery plan for today.</p>
          </div>
          <div className="studio-top-actions">
            <div className="seat-pill desktop-only">
              {displayName} {signupInfo?.seats_used ?? "—"}/{signupInfo?.seats_max ?? 2} seats
            </div>
            <button
              type="button"
              className="btn primary add-customer-btn"
              onClick={() => setCustomerModal({ open: true, customer: null })}
              aria-label="Add customer"
              title="Add customer"
            >
              <span className="add-customer-label desktop-only">+ Add customer</span>
              <span className="add-customer-icon mobile-only" aria-hidden="true">
                +
              </span>
            </button>
            <button
              type="button"
              className="avatar-btn logout-btn"
              onClick={logout}
              aria-label="Logout"
              title="Logout"
            >
              <span className="logout-initials desktop-only">{initials(displayName)}</span>
              <svg
                className="logout-icon mobile-only"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </header>

        {(view === "dashboard" || view === "customers") && (
          <div className="studio-body">
            <div className="studio-center">
              {view === "dashboard" && (
                <>
                  <section className="run-card" id="route">
                    <div className="run-card-copy">
                      <p className="eyebrow">Today&apos;s run</p>
                      <h2>{formatNiceDate(date)}</h2>
                      <label className="mobile-date-field mobile-only">
                        Date
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="run-bloom" aria-hidden="true">
                      ✿
                    </div>
                  </section>

                  <section className="kpi-row">
                    <article className="kpi-card total">
                      <span className="kpi-ico">🚚</span>
                      <div>
                        <p>On the van</p>
                        <strong>{stats.total} stops today</strong>
                      </div>
                    </article>
                    <article className="kpi-card delivered">
                      <span className="kpi-ico">❀</span>
                      <div>
                        <p>Bloomed</p>
                        <strong>{stats.delivered} Delivered</strong>
                      </div>
                    </article>
                    <article className="kpi-card pending">
                      <span className="kpi-ico">✿</span>
                      <div>
                        <p>Still budding</p>
                        <strong>{stats.pending} Pending</strong>
                      </div>
                    </article>
                    <article className="kpi-card missed">
                      <span className="kpi-ico">⚑</span>
                      <div>
                        <p>Missed</p>
                        <strong>{stats.not_delivered} Not delivered</strong>
                      </div>
                    </article>
                  </section>

                  <section className="table-card" id="deliveries">
                    <div className="table-toolbar">
                      <div>
                        <h3>Today&apos;s deliveries</h3>
                      </div>
                      <div className="filters">
                        <input
                          type="search"
                          placeholder="Search name, area, phone..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    {error && <p className="banner-error">{error}</p>}

                    {/* Desktop table */}
                    <div className="table-scroll desktop-only">
                      <table className="delivery-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Customer</th>
                            <th>Area</th>
                            <th>Address</th>
                            <th>Phone</th>
                            <th>Window</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!loading && deliveries.length === 0 && (
                            <tr>
                              <td colSpan={8} className="empty-cell">
                                Quiet route today — pick another date or add customers with matching days.
                              </td>
                            </tr>
                          )}
                          {deliveries.map((d, index) => (
                            <tr key={d.id}>
                              <td>
                                <span className="row-num">{index + 1}</span>
                              </td>
                              <td>
                                <div className="cust-cell">
                                  <span className="cust-avatar">{initials(d.customer_name)}</span>
                                  <div>
                                    <strong>{d.customer_name}</strong>
                                    <small>{d.area}</small>
                                  </div>
                                </div>
                              </td>
                              <td>{d.area}</td>
                              <td>
                                <div className="addr-cell">
                                  <span>📍 {d.address}</span>
                                  {d.landmark && <small>Near {d.landmark}</small>}
                                  {(d.phone_numbers || []).length > 1 && (
                                    <small>{d.phone_numbers.join(" · ")}</small>
                                  )}
                                  {d.maps_link && (
                                    <a href={d.maps_link} target="_blank" rel="noreferrer">
                                      Maps ↗
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td>{d.phone_number || (d.phone_numbers || [])[0] || "—"}</td>
                              <td>7:00 – 11:00 AM</td>
                              <td>
                                <span className={`badge ${d.status}`}>
                                  {STATUS_LABELS[d.status]}
                                </span>
                              </td>
                              <td className="action-cell">
                                <button
                                  type="button"
                                  className="more-btn"
                                  aria-label="Actions"
                                  onClick={() =>
                                    setMenuOpen(menuOpen === d.id ? null : d.id)
                                  }
                                >
                                  ···
                                </button>
                                {menuOpen === d.id && (
                                  <div className="row-menu">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStatusSave(d.id, {
                                          status: "delivered",
                                          remarks: d.remarks || "",
                                        })
                                      }
                                    >
                                      Mark delivered
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStatusSave(d.id, {
                                          status: "pending",
                                          remarks: d.remarks || "",
                                        })
                                      }
                                    >
                                      Mark pending
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStatusModal({ open: true, record: d });
                                        setMenuOpen(null);
                                      }}
                                    >
                                      Update with remarks
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile stop cards */}
                    <div className="mobile-stop-list mobile-only">
                      {!loading && deliveries.length === 0 && (
                        <p className="empty-state">
                          Quiet route today — pick another date or add customers with matching days.
                        </p>
                      )}
                      {deliveries.map((d, index) => (
                        <article key={d.id} className="mobile-stop-card">
                          <div className="mobile-stop-head">
                            <span className="row-num">{index + 1}</span>
                            <div>
                              <strong>{d.customer_name}</strong>
                              <small>{d.area}</small>
                            </div>
                            <span className={`badge ${d.status}`}>
                              {STATUS_LABELS[d.status]}
                            </span>
                          </div>
                          <p className="mobile-stop-addr">{d.address}</p>
                          {d.landmark && (
                            <p className="meta soft">Near {d.landmark}</p>
                          )}
                          <div className="mobile-stop-meta">
                            {(d.phone_numbers || [d.phone_number])
                              .filter(Boolean)
                              .map((phone) => (
                                <a key={phone} href={`tel:${phone}`} className="phone-tap">
                                  {phone}
                                </a>
                              ))}
                            {d.maps_link && (
                              <a
                                href={d.maps_link}
                                target="_blank"
                                rel="noreferrer"
                                className="maps-link"
                              >
                                Open Maps ↗
                              </a>
                            )}
                          </div>
                          {d.remarks && <p className="remarks">“{d.remarks}”</p>}
                          {renderDeliveryActions(d)}
                        </article>
                      ))}
                    </div>
                    {loading && <p className="empty-state">Loading deliveries…</p>}
                  </section>
                </>
              )}

              {view === "customers" && (
                <section className="table-card">
                  <div className="table-toolbar">
                    <div>
                      <h3>Customers</h3>
                      <p className="muted tiny">Everyone on your delivery map</p>
                    </div>
                    <div className="filters">
                      <input
                        type="search"
                        placeholder="Search customers…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => setCustomerModal({ open: true, customer: null })}
                      >
                        + Add customer
                      </button>
                    </div>
                  </div>
                  {error && <p className="banner-error">{error}</p>}
                  <div className="customer-grid fun-customers">
                    {customers.map((c) => (
                      <article
                        key={c.id}
                        className={`customer-card ${c.is_active ? "" : "inactive"}`}
                      >
                        <div className="customer-card-top">
                          <h4>{c.name}</h4>
                          <span className={`pill ${c.is_active ? "on" : "off"}`}>
                            {c.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="meta">
                          {c.area}
                          {c.landmark ? ` · ${c.landmark}` : ""}
                        </p>
                        <p className="meta soft">{c.address}</p>
                        <p className="meta soft">
                          {(c.phone_numbers || []).join(" · ") || c.phone_number}
                        </p>
                        <div className="mini-days">
                          {(c.days_list || []).map((day) => (
                            <span key={day}>{day}</span>
                          ))}
                        </div>
                        <div className="customer-card-actions">
                          {c.maps_link && (
                            <a
                              className="maps-link"
                              href={c.maps_link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Maps ↗
                            </a>
                          )}
                          <button
                            type="button"
                            className="btn ghost small"
                            onClick={() => setCustomerModal({ open: true, customer: c })}
                          >
                            Edit
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!loading && customers.length === 0 && (
                    <p className="empty-state">No customers yet.</p>
                  )}
                </section>
              )}
            </div>

            {view === "dashboard" && (
              <aside className="studio-right desktop-rail desktop-only">
                <section className="widget-card">
                  <h3>Today&apos;s summary</h3>
                  <DonutChart
                    delivered={stats.delivered}
                    pending={stats.pending}
                    notDelivered={stats.not_delivered}
                    total={stats.total}
                  />
                  <ul className="summary-legend">
                    <li>
                      <i className="dot delivered" /> Delivered <strong>{stats.delivered}</strong>
                    </li>
                    <li>
                      <i className="dot pending" /> Pending <strong>{stats.pending}</strong>
                    </li>
                    <li>
                      <i className="dot missed" /> Not delivered{" "}
                      <strong>{stats.not_delivered}</strong>
                    </li>
                  </ul>
                </section>

                <section className="widget-card">
                  <h3>Calendar</h3>
                  <MiniCalendar value={date} onChange={setDate} />
                </section>

                <section className="widget-card">
                  <h3>Recent activity</h3>
                  <ul className="activity-list">
                    {activity.length === 0 && (
                      <li className="muted">No activity for this day yet.</li>
                    )}
                    {activity.map((item) => (
                      <li key={item.id}>
                        <span className={`act-ico ${item.status}`}>
                          {item.status === "delivered"
                            ? "✓"
                            : item.status === "pending"
                              ? "⏱"
                              : "!"}
                        </span>
                        <div>
                          <strong>
                            {STATUS_LABELS[item.status]} to {item.customer_name}
                          </strong>
                          <small>
                            {item.area} · {formatActivityTime(item.updated_at)}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      document
                        .getElementById("deliveries")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    View all activity →
                  </button>
                </section>
              </aside>
            )}
          </div>
        )}

        {view === "settings" && <SettingsPanel />}

        <footer className="studio-footer desktop-only">
          <img src="/logo.jpg" alt="" />
          <p>Fleurish &amp; Co. · florist delivery desk</p>
        </footer>
      </div>

      <nav className="mobile-bottom-nav mobile-only" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <button
            key={`m-${item.id}`}
            type="button"
            className={view === item.id ? "active" : ""}
            onClick={() => navClick(item)}
          >
            <span aria-hidden="true">{item.icon}</span>
            <small>{item.label.replace("'s run", "")}</small>
          </button>
        ))}
        <button
          type="button"
          className="nav-add"
          onClick={() => setCustomerModal({ open: true, customer: null })}
        >
          <span aria-hidden="true">+</span>
          <small>Add</small>
        </button>
      </nav>

      {menuOpen && (
        <button
          type="button"
          className="menu-dismiss"
          aria-label="Close menu"
          onClick={() => setMenuOpen(null)}
        />
      )}

      <CustomerModal
        open={customerModal.open}
        customer={customerModal.customer}
        onClose={() => setCustomerModal({ open: false, customer: null })}
        onSaved={handleSaveCustomer}
      />
      <StatusModal
        open={statusModal.open}
        record={statusModal.record}
        onClose={() => setStatusModal({ open: false, record: null })}
        onSave={handleStatusSave}
      />
    </div>
  );
}
