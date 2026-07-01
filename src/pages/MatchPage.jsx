import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoMatchForm from '../components/VideoMatchForm';
import { getMatchSession, deleteMatchSession } from '../api/match';

export default function MatchPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(!!sessionId);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm('Delete this match session? This will remove the video and all related projects from storage.')) return;
    setDeleting(true);
    try {
      await deleteMatchSession(sessionId);
      navigate('/profile');
    } catch {
      alert('Failed to delete. Please try again.');
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (!sessionId) return;
    getMatchSession(sessionId)
      .then((data) => { setSession(data); setLoading(false); })
      .catch(() => { setLoadError('Session not found.'); setLoading(false); });
  }, [sessionId]);

  if (loading) {
    return (
      <div className="page">
        <p className="loading">Loading session...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page">
        <p className="error-msg">{loadError}</p>
        <button className="btn btn-outline" onClick={() => navigate('/match')} style={{ marginTop: 12 }}>
          Start a new match
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Match Music to Video</h1>
      {session ? (
        <div className="session-header">
          <p className="upload-hint" style={{ margin: 0 }}>
            Viewing saved session from {new Date(session.created_at).toLocaleDateString()} — pick a track or{' '}
            <button className="btn-link" onClick={() => navigate('/match')}>start a new match</button>.
          </p>
          <button
            className="btn btn-small btn-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Session'}
          </button>
        </div>
      ) : (
        <p className="upload-hint">
          Upload a short video and AI will find tracks that match its mood and energy.
        </p>
      )}
      <VideoMatchForm preloadedSession={session} />
    </div>
  );
}
