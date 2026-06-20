import { useState, useEffect } from 'react';
import { getAllTracks, bulkDeleteTracks } from '../api/tracks';
import UploadForm from '../components/UploadForm';
import BulkUploadForm from '../components/BulkUploadForm';
import TrackCard from '../components/TrackCard';

export default function AdminPage() {
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [uploadTab, setUploadTab] = useState('single'); // 'single' | 'bulk'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  function handleSelectAll() {
    if (selectedIds.size === tracks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tracks.map((t) => t.id)));
    }
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
      setTracks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  const allSelected = tracks.length > 0 && selectedIds.size === tracks.length;

  return (
    <div className="page">
      <h1>Admin — Music Library</h1>

      {/* Upload section with tabs */}
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

      {/* Library section */}
      <section className="admin-library">
        <div className="library-header">
          <h2>Music Library ({tracks.length} tracks)</h2>

          {tracks.length > 0 && (
            <div className="library-controls">
              <button className="btn-link" onClick={handleSelectAll}>
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          )}
        </div>

        {/* Bulk delete action bar */}
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
          <div className="track-list">
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                selectable
                selected={selectedIds.has(track.id)}
                onSelectChange={handleSelectChange}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
