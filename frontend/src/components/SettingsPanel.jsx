import { useEffect, useState } from "react";
import {
  changePassword,
  createTeamUser,
  getTeamUsers,
  requestUpgrade,
  setStoredToken,
} from "../api";
import { useAuth } from "../auth/AuthContext";

export default function SettingsPanel() {
  const { refreshSignupInfo, signupInfo } = useAuth();
  const [team, setTeam] = useState([]);
  const [seatInfo, setSeatInfo] = useState(signupInfo);
  const [loading, setLoading] = useState(true);
  const [createForm, setCreateForm] = useState({
    first_name: "",
    username: "",
    email: "",
    password: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [upgradeForm, setUpgradeForm] = useState({
    name: "",
    email: "",
    company: "Fleurish & Co.",
    message: "Please add more team seats for Fleurish & Co.",
  });
  const [createMsg, setCreateMsg] = useState({ type: "", text: "" });
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });
  const [upgradeMsg, setUpgradeMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState("");

  const loadTeam = async () => {
    setLoading(true);
    try {
      const data = await getTeamUsers();
      setTeam(data.results || []);
      setSeatInfo(data);
      await refreshSignupInfo();
    } catch {
      setCreateMsg({ type: "error", text: "Could not load team users." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const canCreate = (seatInfo?.seats_used ?? 0) < (seatInfo?.seats_max ?? 2);

  const handleCreate = async (e) => {
    e.preventDefault();
    setBusy("create");
    setCreateMsg({ type: "", text: "" });
    try {
      const data = await createTeamUser(createForm);
      setCreateMsg({ type: "ok", text: data.detail || "User created." });
      setCreateForm({ first_name: "", username: "", email: "", password: "" });
      setSeatInfo(data);
      await loadTeam();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.upgrade_required) {
        setCreateMsg({
          type: "error",
          text: data.detail || "Seat limit reached. Request an upgrade below.",
        });
        setSeatInfo(data);
      } else {
        setCreateMsg({
          type: "error",
          text:
            data?.username?.[0] ||
            data?.password?.[0] ||
            data?.detail ||
            "Could not create user.",
        });
      }
    } finally {
      setBusy("");
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setBusy("password");
    setPasswordMsg({ type: "", text: "" });
    try {
      const data = await changePassword(passwordForm);
      if (data.token) setStoredToken(data.token);
      setPasswordMsg({ type: "ok", text: "Password updated." });
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      const data = err?.response?.data;
      setPasswordMsg({
        type: "error",
        text:
          data?.current_password?.[0] ||
          data?.confirm_password?.[0] ||
          data?.new_password?.[0] ||
          data?.detail ||
          "Could not update password.",
      });
    } finally {
      setBusy("");
    }
  };

  const handleUpgrade = async (e) => {
    e.preventDefault();
    setBusy("upgrade");
    setUpgradeMsg({ type: "", text: "" });
    try {
      const data = await requestUpgrade(upgradeForm);
      setUpgradeMsg({ type: "ok", text: data.detail });
    } catch (err) {
      const data = err?.response?.data;
      setUpgradeMsg({
        type: "error",
        text: data?.email?.[0] || data?.detail || "Could not send upgrade request.",
      });
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="settings-panel">
      <div className="settings-intro table-card">
        <h3>Settings</h3>
        <p className="muted">
          Manage team seats and your login password. Free plan allows{" "}
          {seatInfo?.seats_max ?? 2} users
          {seatInfo ? ` · ${seatInfo.seats_used}/${seatInfo.seats_max} used` : ""}.
        </p>
      </div>

      <div className="settings-grid">
        <article className="table-card settings-card">
          <h4>Create user</h4>
          <p className="muted tiny">
            {canCreate
              ? "Add another teammate to the free plan."
              : "Both free seats are taken. Request an upgrade to add more."}
          </p>

          {loading ? (
            <p className="muted">Loading team…</p>
          ) : (
            <ul className="team-list">
              {team.map((u) => (
                <li key={u.id}>
                  <strong>{u.first_name || u.username}</strong>
                  <span>@{u.username}</span>
                </li>
              ))}
              {!team.length && <li className="muted">No team users yet.</li>}
            </ul>
          )}

          {canCreate ? (
            <form className="settings-form" onSubmit={handleCreate}>
              <label>
                First name
                <input
                  value={createForm.first_name}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, first_name: e.target.value }))
                  }
                />
              </label>
              <label>
                Username
                <input
                  required
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, username: e.target.value }))
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </label>
              <label>
                Password
                <input
                  required
                  type="password"
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
              </label>
              {createMsg.text && (
                <p className={createMsg.type === "ok" ? "form-success" : "form-error"}>
                  {createMsg.text}
                </p>
              )}
              <button type="submit" className="btn primary" disabled={busy === "create"}>
                {busy === "create" ? "Creating…" : "Create user"}
              </button>
            </form>
          ) : (
            <form className="settings-form" onSubmit={handleUpgrade}>
              <label>
                Name
                <input
                  required
                  value={upgradeForm.name}
                  onChange={(e) =>
                    setUpgradeForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  value={upgradeForm.email}
                  onChange={(e) =>
                    setUpgradeForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </label>
              <label>
                Message
                <textarea
                  rows={3}
                  value={upgradeForm.message}
                  onChange={(e) =>
                    setUpgradeForm((f) => ({ ...f, message: e.target.value }))
                  }
                />
              </label>
              {upgradeMsg.text && (
                <p className={upgradeMsg.type === "ok" ? "form-success" : "form-error"}>
                  {upgradeMsg.text}
                </p>
              )}
              {createMsg.text && (
                <p className={createMsg.type === "ok" ? "form-success" : "form-error"}>
                  {createMsg.text}
                </p>
              )}
              <button type="submit" className="btn primary" disabled={busy === "upgrade"}>
                {busy === "upgrade" ? "Sending…" : "Request upgrade"}
              </button>
            </form>
          )}
        </article>

        <article className="table-card settings-card">
          <h4>Edit password</h4>
          <p className="muted tiny">Update the password for your signed-in account.</p>
          <form className="settings-form" onSubmit={handlePassword}>
            <label>
              Current password
              <input
                required
                type="password"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, current_password: e.target.value }))
                }
              />
            </label>
            <label>
              New password
              <input
                required
                type="password"
                minLength={6}
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, new_password: e.target.value }))
                }
              />
            </label>
            <label>
              Confirm new password
              <input
                required
                type="password"
                minLength={6}
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm((f) => ({ ...f, confirm_password: e.target.value }))
                }
              />
            </label>
            {passwordMsg.text && (
              <p className={passwordMsg.type === "ok" ? "form-success" : "form-error"}>
                {passwordMsg.text}
              </p>
            )}
            <button type="submit" className="btn primary" disabled={busy === "password"}>
              {busy === "password" ? "Saving…" : "Update password"}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
