import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import Login from "./components/Login";
import ObjectSelector from "./components/ObjectSelector";
import RecordTable from "./components/RecordTable";
import RecordFormModal from "./components/RecordFormModal";

const PAGE_SIZE = 20;

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState("");
  const [fields, setFields] = useState([]);

  const [records, setRecords] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const [modalRecord, setModalRecord] = useState(null); // null = closed, {} = create, {...} = edit
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  // On load: check ?login=... from the OAuth redirect, then check session.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "error") setLoginError(true);
    if (params.has("login")) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    api
      .me()
      .then((res) => setLoggedIn(res.loggedIn))
      .catch(() => setLoggedIn(false))
      .finally(() => setAuthChecked(true));
  }, []);

  // Once logged in, load the object dropdown options.
  useEffect(() => {
    if (!loggedIn) return;
    api.objects().then(setObjects).catch(() => setBanner({ type: "error", text: "Could not load object list." }));
  }, [loggedIn]);

  // When the selected object changes, load its field config and first page.
  useEffect(() => {
    if (!selectedObject) return;
    setRecords([]);
    setOffset(0);
    setHasMore(true);
    api.fields(selectedObject).then(setFields);
    loadPage(selectedObject, 0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedObject]);

  const loadPage = useCallback(async (objectName, pageOffset, replace = false) => {
    setLoadingRecords(true);
    try {
      const res = await api.listRecords(objectName, pageOffset, PAGE_SIZE);
      setRecords((prev) => (replace ? res.records : [...prev, ...res.records]));
      setOffset(pageOffset + res.records.length);
      setHasMore(res.hasMore);
    } catch (err) {
      handleApiError(err, setBanner, setLoggedIn);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  const handleLoadMore = () => {
    if (selectedObject) loadPage(selectedObject, offset);
  };

  const handleCreate = () => setModalRecord({});
  const handleEdit = (record) => setModalRecord(record);
  const closeModal = () => setModalRecord(null);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (modalRecord && modalRecord.Id) {
        await api.updateRecord(selectedObject, modalRecord.Id, payload);
        setBanner({ type: "success", text: "Record updated." });
      } else {
        await api.createRecord(selectedObject, payload);
        setBanner({ type: "success", text: "Record created." });
      }
      closeModal();
      loadPage(selectedObject, 0, true);
    } catch (err) {
      handleApiError(err, setBanner, setLoggedIn);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete this ${selectedObject} record? This cannot be undone.`)) return;
    try {
      await api.deleteRecord(selectedObject, record.Id);
      setRecords((prev) => prev.filter((r) => r.Id !== record.Id));
      setBanner({ type: "success", text: "Record deleted." });
    } catch (err) {
      handleApiError(err, setBanner, setLoggedIn);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setLoggedIn(false);
    setSelectedObject("");
    setRecords([]);
  };

  if (!authChecked) {
    return <div className="loading-screen">Checking session…</div>;
  }

  if (!loggedIn) {
    return <Login loginError={loginError} />;
  }

  const selectedLabel = objects.find((o) => o.apiName === selectedObject)?.label || selectedObject;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">SF</span>
          <span>Object Manager</span>
        </div>
        <button className="btn-secondary" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <main className="app-main">
        <div className="toolbar">
          <ObjectSelector objects={objects} selected={selectedObject} onSelect={setSelectedObject} />
          {selectedObject && (
            <button className="btn-primary" onClick={handleCreate}>
              + New {selectedLabel}
            </button>
          )}
        </div>

        {banner && (
          <div className={`banner banner-${banner.type}`} onAnimationEnd={() => setBanner(null)}>
            {banner.text}
          </div>
        )}

        {!selectedObject && (
          <div className="empty-state">Choose an object above to get started.</div>
        )}

        {selectedObject && fields.length > 0 && (
          <RecordTable
            fields={fields}
            records={records}
            loading={loadingRecords}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </main>

      {modalRecord !== null && (
        <RecordFormModal
          fields={fields}
          initialRecord={modalRecord.Id ? modalRecord : null}
          objectLabel={selectedLabel}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
        />
      )}
    </div>
  );
}

function handleApiError(err, setBanner, setLoggedIn) {
  if (err.message === "UNAUTHENTICATED") {
    setLoggedIn(false);
    return;
  }
  setBanner({ type: "error", text: err.message || "Something went wrong." });
}
