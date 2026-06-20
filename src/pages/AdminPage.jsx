import { useState, useEffect } from 'react';
import { getAllTracks, bulkDeleteTracks } from '../api/tracks';
import UploadForm from '../components/UploadForm';
import BulkUploadForm from '../components/BulkUploadForm';
import TrackTable from '../components/TrackTable';
import EditTrackModal from '../components/EditTrackModal';

export default function AdminPage() {
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [uploadTab, setUploadTab] = useState('single');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [editingTrack, setEditingTrack] = useState(null);

  useEffect(() => {
    getAllTracks()
      .then(setTracks)
      .finally(() => setLoadingTracks(false));
  }, []);

  function handleSingleUploaded(newTrack) {
    setTracks((prev) => [newTrack, ...prev]);
  }

  function handleBulkUploaded(newTracks) {
    setTracks((prev) => [...newTracks, ...prev]);
  }

  function handleSelectChange(id, checked) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleTrackUpdated(updated) {
    setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleTrackDeleted(id) {
    setTracks((prev) => prev.filter((t) => t.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Delete ${selectedIds.size} track${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setDeleteError('');
    try {
      await bulkDeleteTracks(Array.from(selectedIds));
      const deletedIds = new Set(selectedIds);
      setTracks((prev) => prev.filter((t) => !deletedIds.has(t.id)));
      setSelectedIds(new Set());
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page">
      <h1>Admin — Music Library</h1>

      <div className="upload-tabs">
        <button
          className={`tab-btn ${uploadTab === 'single' ? 'tab-btn--active' : ''}`}
          onClick={() => setUploadTab('single')}
        >
          Single Upload
        </button>
        <button
          className={`tab-btn ${uploadTab === 'bulk' ? 'tab-btn--active' : ''}`}
          onClick={() => setUploadTab('bulk')}
        >
          Bulk Upload
        </button>
      </div>

      {uploadTab === 'single' ? (
        <UploadForm onUploaded={handleSingleUploaded} />
      ) : (
        <BulkUploadForm onUploaded={handleBulkUploaded} />
      )}

      <section className="admin-library">
        <div className="library-header">
          <h2>Music Library ({tracks.length} tracks)</h2>
        </div>

        {selectedIds.size > 0 && (
          <div className="bulk-action-bar">
            <span>{selectedIds.size} track{selectedIds.size > 1 ? 's' : ''} selected</span>
            <button
              className="btn btn-danger"
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : `Delete ${selectedIds.size} Selected`}
            </button>
          </div>
        )}

        {deleteError && <p className="error-msg">{deleteError}</p>}

        {loadingTracks ? (
          <p className="loading">Loading...</p>
        ) : tracks.length === 0 ? (
          <p className="empty-state">No tracks uploaded yet.</p>
        ) : (
          <TrackTable
            tracks={tracks}
            selectedIds={selectedIds}
            onSelectChange={handleSelectChange}
            activeTrackId={activeTrackId}
            onPlay={setActiveTrackId}
            onEdit={setEditingTrack}
            onDeleted={handleTrackDeleted}
          />
        )}
      </section>

      <EditTrackModal
        track={editingTrack}
        onSave={(updated) => { handleTrackUpdated(updated); setEditingTrack(null); }}
        onClose={() => setEditingTrack(null)}
      />
    </div>
  );
}
