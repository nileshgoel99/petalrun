import { useEffect, useState } from "react";
import { requestUpgrade } from "../api";
import { useAuth } from "../auth/AuthContext";

export default function LandingPage() {
  const { login, register, signupInfo, refreshSignupInfo } = useAuth();
  const [mode, setMode] = useState("login"); // login | register | upgrade
  const [form, setForm] = useState({
    username: "",
    password: "",
    email: "",
    first_name: "",
    name: "",
    company: "Fleurish & Co.",
    message: "I'd like more than 2 user seats for our delivery team.",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refreshSignupInfo();
  }, [refreshSignupInfo]);

  const canSignup = signupInfo?.can_signup !== false;
  const seatsUsed = signupInfo?.seats_used ?? 0;
  const seatsMax = signupInfo?.seats_max ?? 2;

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const switchMode = (next) => {
    setError("");
    setSuccess("");
    if (next === "register" && !canSignup) {
      setMode("upgrade");
      return;
    }
    setMode(next);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login({ username: form.username, password: form.password });
    } catch (err) {
      const data = err?.response?.data;
      setError(
        data?.non_field_errors?.[0] ||
          data?.detail ||
          "Could not sign in. Check your username and password."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register({
        username: form.username,
        password: form.password,
        email: form.email,
        first_name: form.first_name,
      });
    } catch (err) {
      const data = err?.response?.data;
      if (data?.upgrade_required || err?.response?.status === 403) {
        setMode("upgrade");
        setError(data?.detail || "Free plan allows 2 users. Request an upgrade.");
        await refreshSignupInfo();
        return;
      }
      setError(
        data?.username?.[0] ||
          data?.password?.[0] ||
          data?.detail ||
          "Could not create account."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleUpgrade = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await requestUpgrade({
        name: form.name || form.first_name || form.username,
        email: form.email,
        company: form.company,
        message: form.message,
      });
      setSuccess(res.detail);
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.email?.[0] || data?.detail || "Could not submit upgrade request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="landing">
      <div className="landing-glow" aria-hidden="true" />
      <div className="landing-grid">
        <section className="landing-brand">
          <img src="/logo.jpg" alt="Fleurish & Co." className="landing-logo" />
          <div className="landing-copy">
            <p className="landing-kicker">Florist delivery studio</p>
            <h1>Fleurish &amp; Co.</h1>
            <p className="landing-lede">
              A warm, artisanal workspace for today&apos;s routes — track deliveries,
              tend customer schedules, and keep every bouquet on time.
            </p>
            <ul className="landing-points">
              <li>Auto-build today&apos;s delivery list from schedules</li>
              <li>Mark Delivered, Pending, or Not Delivered with remarks</li>
              <li>Free plan includes 2 team seats</li>
            </ul>
          </div>
        </section>

        <section className="landing-panel">
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => switchMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === "register" || mode === "upgrade" ? "active" : ""}
              onClick={() => switchMode("register")}
            >
              Create user
            </button>
          </div>

          {mode === "login" && (
            <form className="auth-form" onSubmit={handleLogin}>
              <h2>Welcome back</h2>
              <p className="auth-sub">Sign in to your Fleurish delivery desk.</p>
              <label>
                Username
                <input
                  required
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => setField("username", e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn primary wide" disabled={busy}>
                {busy ? "Signing in…" : "Login"}
              </button>
            </form>
          )}

          {mode === "register" && (
            <form className="auth-form" onSubmit={handleRegister}>
              <h2>Create user</h2>
              <p className="auth-sub">
                Free plan allows {seatsMax} users. {seatsMax - seatsUsed} seat
                {seatsMax - seatsUsed === 1 ? "" : "s"} remaining.
              </p>
              <label>
                First name
                <input
                  value={form.first_name}
                  onChange={(e) => setField("first_name", e.target.value)}
                  placeholder="Amelia"
                />
              </label>
              <label>
                Username
                <input
                  required
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => setField("username", e.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="you@fleurish.co"
                />
              </label>
              <label>
                Password
                <input
                  required
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn primary wide" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </button>
            </form>
          )}

          {mode === "upgrade" && (
            <form className="auth-form" onSubmit={handleUpgrade}>
              <h2>Request upgrade</h2>
              <p className="auth-sub">
                Your free plan already has {seatsMax} users. Tell us you need more
                seats and we&apos;ll follow up.
              </p>
              <label>
                Name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </label>
              <label>
                Company
                <input
                  value={form.company}
                  onChange={(e) => setField("company", e.target.value)}
                />
              </label>
              <label>
                Message
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={(e) => setField("message", e.target.value)}
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              {success && <p className="form-success">{success}</p>}
              <button type="submit" className="btn primary wide" disabled={busy}>
                {busy ? "Sending…" : "Request upgrade"}
              </button>
              <button
                type="button"
                className="btn ghost wide"
                onClick={() => switchMode("login")}
              >
                Back to login
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
