import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile, getDownloadHistory } from '../api/users';
import { listMatchSessions, deleteMatchSession } from '../api/match';
import TrackCard from '../components/TrackCard';

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function ProfilePage() {
  const navigate = useNavigate();
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
  const [matchSessions, setMatchSessions] = useState([]);
  const [deletingSessionId, setDeletingSessionId] = useState(null);

  useEffect(() => {
    Promise.all([
      getProfile(),
      getDownloadHistory(1),
      listMatchSessions().catch(() => []),
    ]).then(([profileData, historyData, sessions]) => {
        setProfile(profileData);
        setEditName(profileData.display_name || '');
        setDownloads(historyData.downloads);
        setPagination(historyData.pagination);
        setMatchSessions(sessions);
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

  async function handleDeleteSession(e, sessionId) {
    e.stopPropagation();
    if (!window.confirm('Delete this match session? This will also remove the video from storage and any related editor projects.')) return;
    setDeletingSessionId(sessionId);
    try {
      await deleteMatchSession(sessionId);
      setMatchSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      alert('Failed to delete session. Please try again.');
    } finally {
      setDeletingSessionId(null);
    }
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

      {/* Match History */}
      <section className="video-projects-history">
        <h2>Match History</h2>
        {matchSessions.length === 0 ? (
          <p className="empty-state">
            No past matches yet.{' '}
            <button className="btn-link" onClick={() => navigate('/match')}>
              Upload a video to find matching music →
            </button>
          </p>
        ) : (
          <div className="vp-list">
            {matchSessions.map((s) => (
              <div
                key={s.id}
                className="vp-card"
                onClick={() => navigate(`/match/session/${s.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="vp-card-icon">🎥</div>
                <div className="vp-card-body">
                  <div className="vp-card-title">Video Match</div>
                  <div className="vp-card-meta">
                    <span>{s.track_count} track{s.track_count !== 1 ? 's' : ''} matched</span>
                    <span>{formatDate(s.created_at)}</span>
                  </div>
                </div>
                <div className="vp-card-status" style={{ color: '#60b8ff' }}>
                  View →
                </div>
                <button
                  className="btn btn-small btn-danger"
                  disabled={deletingSessionId === s.id}
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  style={{ marginLeft: 8 }}
                >
                  {deletingSessionId === s.id ? '...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Download History */}
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
