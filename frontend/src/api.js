const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // send the session cookie
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (res.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  base: API_BASE,
  me: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
  objects: () => request("/api/objects"),
  fields: (objectName) => request(`/api/objects/${objectName}/fields`),
  listRecords: (objectName, offset, limit = 20) =>
    request(`/api/records/${objectName}?offset=${offset}&limit=${limit}`),
  createRecord: (objectName, payload) =>
    request(`/api/records/${objectName}`, { method: "POST", body: JSON.stringify(payload) }),
  updateRecord: (objectName, id, payload) =>
    request(`/api/records/${objectName}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteRecord: (objectName, id) =>
    request(`/api/records/${objectName}/${id}`, { method: "DELETE" }),
};
