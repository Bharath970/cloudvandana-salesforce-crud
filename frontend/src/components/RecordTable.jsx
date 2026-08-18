import { useEffect, useRef } from "react";

export default function RecordTable({
  fields,
  records,
  loading,
  hasMore,
  onLoadMore,
  onEdit,
  onDelete,
}) {
  const sentinelRef = useRef(null);

  // Infinite scroll: when the sentinel row at the bottom of the table
  // enters the viewport, ask the parent to fetch the next page of 20.
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (!loading && records.length === 0) {
    return <div className="empty-state">No records found for this object yet.</div>;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {fields.map((f) => (
              <th key={f.name}>{f.label}</th>
            ))}
            <th className="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.Id}>
              {fields.map((f) => (
                <td key={f.name}>{formatValue(record[f.name])}</td>
              ))}
              <td className="actions-col">
                <button className="btn-link" onClick={() => onEdit(record)}>
                  Edit
                </button>
                <button className="btn-link btn-danger" onClick={() => onDelete(record)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div ref={sentinelRef} className="scroll-sentinel">
        {loading && <span>Loading more records…</span>}
        {!hasMore && records.length > 0 && <span>End of results.</span>}
      </div>
    </div>
  );
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
