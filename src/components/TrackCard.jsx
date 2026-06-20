import { useState, useRef, useEffect } from 'react';
import { downloadTrack, getStreamUrl } from '../api/tracks';

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

// Simple music note SVG icon
function MusicIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export default function TrackCard({
  track,
  showDownloadedAt = false,
  selectable = false,
  selected = false,
  onSelectChange,
  activeTrackId,
  onPlay,
}) {
  const trackId = track.track_id || track.id;
  const [streamUrl, setStreamUrl] = useState(null);
  const [loadingStream, setLoadingStream] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(null);
  const audioRef = useRef(null);

  // Pause this card when another card starts playing
  useEffect(() => {
    if (activeTrackId !== trackId && playing) {
      audioRef.current?.pause();
    }
  }, [activeTrackId, trackId, playing]);

  async function handlePlayPause() {
    if (!streamUrl) {
      setLoadingStream(true);
      try {
        const url = await getStreamUrl(trackId);
        setStreamUrl(url);
        // Audio will autoplay once src is set via the useEffect below
      } catch {
        setLoadingStream(false);
      }
      return;
    }

    if (playing) {
      audioRef.current?.pause();
    } else {
      onPlay && onPlay(trackId);
      audioRef.current?.play();
    }
  }

  // Once streamUrl is set, start playing
  useEffect(() => {
    if (streamUrl && audioRef.current) {
      setLoadingStream(false);
      onPlay && onPlay(trackId);
      audioRef.current.play();
    }
  }, [streamUrl]);

  function handleTimeUpdate() {
    setCurrentTime(audioRef.current?.currentTime || 0);
  }

  function handleLoadedMetadata() {
    setAudioDuration(audioRef.current?.duration || null);
  }

  function handleEnded() {
    setPlaying(false);
    setCurrentTime(0);
  }

  function handleSeek(e) {
    const pct = Number(e.target.value) / 100;
    const time = pct * (audioDuration || 0);
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  }

  const progressPct = audioDuration ? (currentTime / audioDuration) * 100 : 0;

  // Pick a deterministic gradient color per track based on id
  const gradients = [
    'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    'linear-gradient(135deg, #0f3460 0%, #533483 100%)',
    'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
    'linear-gradient(135deg, #1a1a1a 0%, #4a0080 100%)',
    'linear-gradient(135deg, #0a0a0a 0%, #005f73 100%)',
    'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)',
    'linear-gradient(135deg, #1f4037 0%, #99f2c8 30%, #1f4037 100%)',
    'linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)',
  ];
  const gradient = gradients[trackId % gradients.length];

  return (
    <div className={`track-card ${selected ? 'track-card--selected' : ''}`}>
      {/* Art / play area */}
      <div className="track-art" style={{ background: gradient }}>
        {selectable && (
          <input
            type="checkbox"
            className="track-checkbox track-checkbox--card"
            checked={selected}
            onChange={(e) => onSelectChange && onSelectChange(trackId, e.target.checked)}
          />
        )}
        <MusicIcon />
        <button
          className="track-play-btn"
          onClick={handlePlayPause}
          disabled={loadingStream}
          title={playing ? 'Pause' : 'Play preview'}
        >
          {loadingStream ? (
            <span className="track-play-spinner" />
          ) : playing ? (
            <PauseIcon />
          ) : (
            <PlayIcon />
          )}
        </button>
      </div>

      {/* Info / controls area */}
      <div className="track-body">
        <h3 className="track-title" title={track.title}>{track.title}</h3>
        <p className="track-artist">{track.artist}</p>

        <div className="track-meta">
          {track.genre && <span className="badge">{track.genre}</span>}
          <span className="duration">
            {playing && audioDuration
              ? `${formatDuration(Math.floor(currentTime))} / ${formatDuration(Math.floor(audioDuration))}`
              : formatDuration(track.duration)}
          </span>
        </div>

        {/* Scrubber — shown while playing */}
        {playing && (
          <input
            type="range"
            className="track-scrubber"
            min="0"
            max="100"
            value={progressPct.toFixed(1)}
            onChange={handleSeek}
          />
        )}

        {showDownloadedAt && track.downloaded_at && (
          <p className="downloaded-at">Downloaded {formatDate(track.downloaded_at)}</p>
        )}

        <button
          className="btn btn-download-icon"
          onClick={() => downloadTrack(trackId)}
          title="Download"
        >
          <DownloadIcon />
          <span>Download</span>
        </button>
      </div>

      {/* Hidden audio element */}
      {streamUrl && (
        <audio
          ref={audioRef}
          src={streamUrl}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={handleEnded}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
      )}
    </div>
  );
}
