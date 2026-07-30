import { useState } from "react";

const STATUS_OPTIONS = [
  { value: "delivered", label: "Delivered" },
  { value: "pending", label: "Pending" },
  { value: "not_delivered", label: "Not Delivered" },
];

export default function StatusModal({ open, record, onClose, onSave }) {
  if (!open || !record) return null;
  return (
    <StatusModalInner
      key={`${record.id}-${record.updated_at}`}
      record={record}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function StatusModalInner({ record, onClose, onSave }) {
  const [status, setStatus] = useState(record.status || "pending");
  const [remarks, setRemarks] = useState(record.remarks || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(record.id, { status, remarks });
      onClose();
    } catch {
      setError("Could not update delivery status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card compact"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Delivery status</p>
            <h2>{record.customer_name}</h2>
            <p className="muted">
              {record.landmark ? `Near ${record.landmark}` : record.area}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="status-pills full">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`status-pill ${opt.value} ${status === opt.value ? "active" : ""}`}
                onClick={() => setStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <label className="full">
            Remarks (optional)
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Gate code, left with receptionist…"
            />
          </label>
          {error && <p className="form-error full">{error}</p>}
          <div className="modal-actions full">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? "Updating…" : "Update status"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
