import { useState, useEffect } from 'react';
import { getProfile, updateProfile, getDownloadHistory } from '../api/users';
import TrackCard from '../components/TrackCard';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [downloads, setDownloads] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProfile(), getDownloadHistory(1)])
      .then(([profileData, historyData]) => {
        setProfile(profileData);
        setEditName(profileData.display_name || '');
        setDownloads(historyData.downloads);
        setPagination(historyData.pagination);
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  async function loadPage(p) {
    setPage(p);
    const historyData = await getDownloadHistory(p);
    setDownloads(historyData.downloads);
    setPagination(historyData.pagination);
  }

  async function handleSaveName(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile(editName);
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  if (loading) return <div className="page"><p className="loading">Loading...</p></div>;
  if (error) return <div className="page"><p className="error-msg">{error}</p></div>;

  return (
    <div className="page">
      <h1>My Profile</h1>

      <div className="profile-card">
        <div className="profile-field">
          <label>Email</label>
          <p>{profile.email}</p>
        </div>

        <div className="profile-field">
          <label>Display Name</label>
          {editing ? (
            <form onSubmit={handleSaveName} className="inline-edit">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn-small" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="btn btn-small btn-outline" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <p>
              {profile.display_name || <em>Not set</em>}
              <button className="btn-link" onClick={() => setEditing(true)}>Edit</button>
            </p>
          )}
        </div>

        <div className="profile-field">
          <label>Member Since</label>
          <p>{formatDate(profile.created_at)}</p>
        </div>

        <div className="profile-field">
          <label>Role</label>
          <span className={`badge ${profile.role === 'admin' ? 'badge-admin' : ''}`}>
            {profile.role}
          </span>
        </div>
      </div>

      <section className="download-history">
        <h2>Download History</h2>

        {downloads.length === 0 ? (
          <p className="empty-state">No downloads yet. Start exploring music!</p>
        ) : (
          <>
            <div className="track-list">
              {downloads.map((item) => (
                <TrackCard
                  key={item.download_id}
                  track={{ ...item, id: item.track_id }}
                  showDownloadedAt
                  activeTrackId={activeTrackId}
                  onPlay={setActiveTrackId}
                />
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-small btn-outline"
                  disabled={page === 1}
                  onClick={() => loadPage(page - 1)}
                >
                  Previous
                </button>
                <span>Page {page} of {pagination.totalPages}</span>
                <button
                  className="btn btn-small btn-outline"
                  disabled={page === pagination.totalPages}
                  onClick={() => loadPage(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
