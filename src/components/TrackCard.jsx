import { downloadTrack } from '../api/tracks';

function formatDuration(seconds) {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function TrackCard({ track, showDownloadedAt = false, selectable = false, selected = false, onSelectChange }) {
  const trackId = track.track_id || track.id;

  return (
    <div className={`track-card ${selected ? 'track-card--selected' : ''}`}>
      {selectable && (
        <input
          type="checkbox"
          className="track-checkbox"
          checked={selected}
          onChange={(e) => onSelectChange && onSelectChange(trackId, e.target.checked)}
        />
      )}
      <div className="track-info">
        <h3 className="track-title">{track.title}</h3>
        <p className="track-artist">{track.artist}</p>
        <div className="track-meta">
          {track.genre && <span className="badge">{track.genre}</span>}
          <span className="duration">{formatDuration(track.duration)}</span>
          {showDownloadedAt && track.downloaded_at && (
            <span className="downloaded-at">Downloaded {formatDate(track.downloaded_at)}</span>
          )}
        </div>
        {track.description && (
          <p className="track-description">{track.description}</p>
        )}
      </div>
      <button
        className="btn btn-download"
        onClick={() => downloadTrack(trackId)}
      >
        Download
      </button>
    </div>
  );
}
