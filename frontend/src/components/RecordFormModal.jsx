import { useState } from "react";

export default function RecordFormModal({ fields, initialRecord, objectLabel, onSave, onClose, saving }) {
  const isEdit = Boolean(initialRecord);
  const [values, setValues] = useState(() => {
    const initial = {};
    fields.forEach((f) => {
      initial[f.name] = initialRecord ? initialRecord[f.name] ?? "" : "";
    });
    return initial;
  });
  const [error, setError] = useState("");

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const missing = fields.find((f) => f.required && !String(values[f.name] || "").trim());
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    setError("");

    // Only send fields that have a value, so we don't overwrite unrelated
    // Salesforce fields with empty strings.
    const payload = {};
    fields.forEach((f) => {
      if (values[f.name] !== "" && values[f.name] !== null) {
        payload[f.name] = f.type === "number" ? Number(values[f.name]) : values[f.name];
      }
    });

    onSave(payload);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>
          {isEdit ? `Edit ${objectLabel}` : `New ${objectLabel}`}
        </h2>
        <form onSubmit={handleSubmit}>
          {fields.map((f) => (
            <div className="form-row" key={f.name}>
              <label htmlFor={f.name}>
                {f.label}
                {f.required && <span className="required-mark"> *</span>}
              </label>
              {renderInput(f, values[f.name], handleChange)}
            </div>
          ))}

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function renderInput(field, value, handleChange) {
  if (field.type === "picklist") {
    return (
      <select
        id={field.name}
        value={value}
        onChange={(e) => handleChange(field.name, e.target.value)}
      >
        <option value="">— Select —</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        id={field.name}
        rows={3}
        value={value}
        onChange={(e) => handleChange(field.name, e.target.value)}
      />
    );
  }

  return (
    <input
      id={field.name}
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={value}
      onChange={(e) => handleChange(field.name, e.target.value)}
    />
  );
}
