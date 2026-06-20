import { useState, useRef, useEffect } from 'react';
import { getStreamUrl, deleteTrack } from '../api/tracks';

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

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function TrackRow({ track, selected, onSelectChange, activeTrackId, onPlay, onEdit, onDeleted }) {
  const [streamUrl, setStreamUrl] = useState(null);
  const [loadingStream, setLoadingStream] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(null);
  const audioRef = useRef(null);

  // Pause when another track takes over
  useEffect(() => {
    if (activeTrackId !== track.id && playing) {
      audioRef.current?.pause();
    }
  }, [activeTrackId, track.id, playing]);

  // Auto-play once stream URL is fetched
  useEffect(() => {
    if (streamUrl && audioRef.current) {
      setLoadingStream(false);
      onPlay(track.id);
      audioRef.current.play();
    }
  }, [streamUrl]);

  async function handlePlayPause() {
    if (!streamUrl) {
      setLoadingStream(true);
      try {
        const url = await getStreamUrl(track.id);
        setStreamUrl(url);
      } catch {
        setLoadingStream(false);
      }
      return;
    }
    if (playing) {
      audioRef.current?.pause();
    } else {
      onPlay(track.id);
      audioRef.current?.play();
    }
  }

  function handleSeek(e) {
    const time = (Number(e.target.value) / 100) * (audioDuration || 0);
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${track.title}"? This cannot be undone.`)) return;
    try {
      await deleteTrack(track.id);
      onDeleted(track.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  }

  const progressPct = audioDuration ? (currentTime / audioDuration) * 100 : 0;

  return (
    <>
      <tr className={`track-table-row ${selected ? 'track-table-row--selected' : ''}`}>
        <td className="tt-col-check">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectChange(track.id, e.target.checked)}
          />
        </td>

        <td className="tt-col-title" title={track.title}>{track.title}</td>
        <td className="tt-col-artist">{track.artist}</td>
        <td className="tt-col-genre">
          {track.genre ? <span className="badge">{track.genre}</span> : <span className="tt-empty">—</span>}
        </td>
        <td className="tt-col-description">
          <span className="tt-description" title={track.description || ''}>
            {track.description || <span className="tt-empty">—</span>}
          </span>
        </td>

        <td className="tt-col-duration">{formatDuration(track.duration)}</td>
        <td className="tt-col-date">{formatDate(track.uploaded_at)}</td>

        <td className="tt-col-stream">
          <button
            className={`btn-stream ${playing ? 'btn-stream--active' : ''}`}
            onClick={handlePlayPause}
            disabled={loadingStream}
            title={playing ? 'Pause' : 'Preview'}
          >
            {loadingStream ? (
              <span className="track-play-spinner track-play-spinner--sm" />
            ) : playing ? (
              <PauseIcon />
            ) : (
              <PlayIcon />
            )}
          </button>
        </td>

        <td className="tt-col-actions">
          <div className="tt-action-group">
            <button className="btn btn-small btn-outline" onClick={() => onEdit(track)}>Edit</button>
            <button className="btn btn-small btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        </td>
      </tr>

      {streamUrl && (
        <tr className="track-table-row track-table-row--player">
          <td colSpan={9} className="tt-player-cell">
            <div className="tt-player">
              <span className="tt-player-label">
                {playing && audioDuration
                  ? `${formatDuration(Math.floor(currentTime))} / ${formatDuration(Math.floor(audioDuration))}`
                  : track.title}
              </span>
              <input
                type="range"
                className="track-scrubber tt-scrubber"
                min="0"
                max="100"
                value={progressPct.toFixed(1)}
                onChange={handleSeek}
              />
            </div>
            <audio
              ref={audioRef}
              src={streamUrl}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); setCurrentTime(0); }}
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
              onLoadedMetadata={() => setAudioDuration(audioRef.current?.duration || null)}
            />
          </td>
        </tr>
      )}
    </>
  );
}

export default function TrackTable({ tracks, selectedIds, onSelectChange, activeTrackId, onPlay, onEdit, onDeleted }) {
  const allSelected = tracks.length > 0 && selectedIds.size === tracks.length;

  function handleSelectAll(e) {
    tracks.forEach((t) => onSelectChange(t.id, e.target.checked));
  }

  return (
    <div className="track-table-wrapper">
      <table className="track-table">
        <thead>
          <tr>
            <th className="tt-col-check">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                title={allSelected ? 'Deselect all' : 'Select all'}
              />
            </th>
            <th className="tt-col-title">Title</th>
            <th className="tt-col-artist">Artist</th>
            <th className="tt-col-genre">Genre</th>
            <th className="tt-col-description">Description</th>
            <th className="tt-col-duration">Duration</th>
            <th className="tt-col-date">Uploaded</th>
            <th className="tt-col-stream">Preview</th>
            <th className="tt-col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              selected={selectedIds.has(track.id)}
              onSelectChange={onSelectChange}
              activeTrackId={activeTrackId}
              onPlay={onPlay}
              onEdit={onEdit}
              onDeleted={onDeleted}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
