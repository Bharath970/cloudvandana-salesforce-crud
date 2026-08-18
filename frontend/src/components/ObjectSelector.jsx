export default function ObjectSelector({ objects, selected, onSelect }) {
  return (
    <div className="object-selector">
      <label htmlFor="object-select">Object</label>
      <select
        id="object-select"
        value={selected || ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="" disabled>
          Select an object…
        </option>
        {objects.map((obj) => (
          <option key={obj.apiName} value={obj.apiName}>
            {obj.label}
          </option>
        ))}
      </select>
    </div>
  );
}
