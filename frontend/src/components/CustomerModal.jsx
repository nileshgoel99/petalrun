import { useEffect, useState } from "react";

const DAYS = [
  { key: "monday", label: "Mon", hint: "M" },
  { key: "tuesday", label: "Tue", hint: "T" },
  { key: "wednesday", label: "Wed", hint: "W" },
  { key: "thursday", label: "Thu", hint: "T" },
  { key: "friday", label: "Fri", hint: "F" },
  { key: "saturday", label: "Sat", hint: "S" },
  { key: "sunday", label: "Sun", hint: "S" },
];

const emptyForm = () => ({
  name: "",
  address: "",
  area: "",
  landmark: "",
  maps_link: "",
  phone_numbers: [""],
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
  is_active: true,
});

export default function CustomerModal({ open, onClose, onSaved, customer }) {
  const isEdit = Boolean(customer?.id);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (customer) {
      setForm({
        name: customer.name || "",
        address: customer.address || "",
        area: customer.area || "",
        landmark: customer.landmark || "",
        maps_link: customer.maps_link || "",
        phone_numbers:
          customer.phone_numbers?.length > 0 ? [...customer.phone_numbers] : [""],
        monday: !!customer.monday,
        tuesday: !!customer.tuesday,
        wednesday: !!customer.wednesday,
        thursday: !!customer.thursday,
        friday: !!customer.friday,
        saturday: !!customer.saturday,
        sunday: !!customer.sunday,
        is_active: customer.is_active ?? true,
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, customer]);

  if (!open) return null;

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleDay = (key) => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setPhone = (index, value) => {
    setForm((prev) => {
      const phones = [...prev.phone_numbers];
      phones[index] = value;
      return { ...prev, phone_numbers: phones };
    });
  };

  const addPhone = () => {
    setForm((prev) => ({ ...prev, phone_numbers: [...prev.phone_numbers, ""] }));
  };

  const removePhone = (index) => {
    setForm((prev) => {
      const phones = prev.phone_numbers.filter((_, i) => i !== index);
      return { ...prev, phone_numbers: phones.length ? phones : [""] };
    });
  };

  const selectedDays = DAYS.filter((d) => form[d.key]).map((d) => d.label);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const phones = form.phone_numbers.map((p) => p.trim()).filter(Boolean);
      if (!phones.length) {
        setError("Add at least one phone number.");
        setSaving(false);
        return;
      }
      if (!DAYS.some((d) => form[d.key])) {
        setError("Tap at least one delivery day.");
        setSaving(false);
        return;
      }
      const payload = {
        ...form,
        phone_numbers: phones,
        maps_link: form.maps_link.trim(),
        landmark: form.landmark.trim(),
      };
      await onSaved(payload, customer?.id);
      onClose();
    } catch (err) {
      const data = err?.response?.data;
      setError(
        typeof data === "string"
          ? data
          : data
            ? Object.entries(data)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                .join(" · ")
            : "Could not save customer."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card fun-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-modal-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">New bloom on the route</p>
            <h2 id="customer-modal-title">
              {isEdit ? "Edit customer" : "Add customer"}
            </h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="full">
            Customer name
            <input
              required
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Amelia Rose"
            />
          </label>

          <label className="full">
            Address
            <textarea
              required
              rows={2}
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="12 Petal Lane"
            />
          </label>

          <label>
            Area
            <input
              required
              value={form.area}
              onChange={(e) => setField("area", e.target.value)}
              placeholder="Downtown"
            />
          </label>

          <label>
            Landmark
            <input
              value={form.landmark}
              onChange={(e) => setField("landmark", e.target.value)}
              placeholder="Beside the old fountain"
            />
          </label>

          <label className="full">
            Google Maps link
            <input
              type="url"
              value={form.maps_link}
              onChange={(e) => setField("maps_link", e.target.value)}
              placeholder="https://maps.google.com/…"
            />
          </label>

          <div className="full phone-stack">
            <div className="phone-stack-head">
              <span>Phone numbers</span>
              <button type="button" className="btn ghost tiny" onClick={addPhone}>
                + Add number
              </button>
            </div>
            {form.phone_numbers.map((phone, index) => (
              <div className="phone-row" key={`phone-${index}`}>
                <input
                  required={index === 0}
                  value={phone}
                  onChange={(e) => setPhone(index, e.target.value)}
                  placeholder={index === 0 ? "Primary phone" : "Another number"}
                />
                {form.phone_numbers.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn soft"
                    onClick={() => removePhone(index)}
                    aria-label="Remove phone"
                  >
                    −
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="full day-picker">
            <div className="day-picker-head">
              <span>Delivery days</span>
              <small>Tap one or many</small>
            </div>
            <div className="day-grid" role="group" aria-label="Delivery days">
              {DAYS.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  className={`day-chip ${form[day.key] ? "on" : ""}`}
                  onClick={() => toggleDay(day.key)}
                  aria-pressed={form[day.key]}
                >
                  <strong>{day.label}</strong>
                </button>
              ))}
            </div>
            <p className="day-summary">
              {selectedDays.length
                ? `Delivering on ${selectedDays.join(" · ")}`
                : "No days selected yet"}
            </p>
          </div>

          <label className="checkbox-row full">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setField("is_active", e.target.checked)}
            />
            Active on routes
          </label>

          {error && <p className="form-error full">{error}</p>}

          <div className="modal-actions full">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add to route"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
