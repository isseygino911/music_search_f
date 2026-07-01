import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TimelineBar from '../components/TimelineBar';
import { getProject, updateProject, renderAndStream } from '../api/videoProjects';

function formatTime(sec) {
  if (sec == null || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoEditorPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Trim state (seconds)
  const [videoStart, setVideoStart] = useState(0);
  const [videoEnd, setVideoEnd] = useState(null);
  const [audioStart, setAudioStart] = useState(0);
  const [audioEnd, setAudioEnd] = useState(null);

  // Playback
  const [previewing, setPreviewing] = useState(false);
  const [videoPlayhead, setVideoPlayhead] = useState(0);
  const [audioPlayhead, setAudioPlayhead] = useState(0);

  // Render
  const [renderPhase, setRenderPhase] = useState('idle'); // idle | rendering | done | error
  const [renderLabel, setRenderLabel] = useState('');
  const [renderPct, setRenderPct] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [renderError, setRenderError] = useState('');

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const previewRafRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Load project on mount
  useEffect(() => {
    getProject(projectId)
      .then((data) => {
        setProject(data);
        setVideoStart(data.video_start ?? 0);
        setVideoEnd(data.video_end ?? null);
        setAudioStart(data.audio_start ?? 0);
        setAudioEnd(data.audio_end ?? null);
        if (data.status === 'done' && data.outputUrl) {
          setRenderPhase('done');
          setDownloadUrl(data.outputUrl);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.message);
        setLoading(false);
      });
  }, [projectId]);

  // Auto-save trim values (debounced 600 ms)
  const scheduleSave = useCallback((vs, ve, as, ae) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateProject(projectId, {
        videoStart: vs,
        videoEnd: ve,
        audioStart: as,
        audioEnd: ae,
      }).catch(() => {});
    }, 600);
  }, [projectId]);

  const handleVideoTrim = useCallback((s, e) => {
    setVideoStart(s);
    setVideoEnd(e);
    scheduleSave(s, e, audioStart, audioEnd);
    // Seek video preview to new start
    if (videoRef.current) {
      videoRef.current.currentTime = s;
    }
  }, [audioStart, audioEnd, scheduleSave]);

  const handleAudioTrim = useCallback((s, e) => {
    setAudioStart(s);
    setAudioEnd(e);
    scheduleSave(videoStart, videoEnd, s, e);
    if (audioRef.current) {
      audioRef.current.currentTime = s;
    }
  }, [videoStart, videoEnd, scheduleSave]);

  // Preview playback loop
  const stopPreview = useCallback(() => {
    setPreviewing(false);
    cancelAnimationFrame(previewRafRef.current);
    if (videoRef.current) videoRef.current.pause();
    if (audioRef.current) audioRef.current.pause();
  }, []);

  const startPreview = useCallback(() => {
    if (!videoRef.current || !audioRef.current || !project) return;

    const vEnd = videoEnd ?? project.video_duration ?? Infinity;
    const aEnd = audioEnd ?? project.track_duration ?? Infinity;

    videoRef.current.currentTime = videoStart;
    audioRef.current.currentTime = audioStart;
    videoRef.current.play().catch(() => {});
    audioRef.current.play().catch(() => {});
    setPreviewing(true);

    const tick = () => {
      if (!videoRef.current || !audioRef.current) return;
      const vTime = videoRef.current.currentTime;
      const aTime = audioRef.current.currentTime;
      setVideoPlayhead(vTime);
      setAudioPlayhead(aTime);

      if (vTime >= vEnd || aTime >= aEnd) {
        stopPreview();
        return;
      }
      previewRafRef.current = requestAnimationFrame(tick);
    };
    previewRafRef.current = requestAnimationFrame(tick);
  }, [project, videoStart, videoEnd, audioStart, audioEnd, stopPreview]);

  // Clean up RAF on unmount
  useEffect(() => () => {
    cancelAnimationFrame(previewRafRef.current);
    clearTimeout(saveTimerRef.current);
  }, []);

  function handleRender() {
    if (renderPhase === 'rendering') return;
    setRenderPhase('rendering');
    setRenderLabel('Starting render...');
    setRenderPct(0);
    setRenderError('');

    renderAndStream(
      projectId,
      (data) => {
        setRenderLabel(data.label || 'Rendering...');
        setRenderPct(data.pct ?? 0);
      },
      (data) => {
        setDownloadUrl(data.downloadUrl);
        setRenderPhase('done');
        setRenderPct(100);
        setRenderLabel('Done!');
      },
      (data) => {
        setRenderError(data.error || 'Render failed');
        setRenderPhase('error');
      }
    );
  }

  if (loading) {
    return (
      <div className="editor-page">
        <div className="editor-loading">Loading project...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="editor-page">
        <p className="error-msg">{error}</p>
        <button className="btn btn-outline" onClick={() => navigate('/match')}>
          ← Back to Match
        </button>
      </div>
    );
  }

  const videoDuration = project.video_duration || null;
  const audioDuration = project.track_duration || null;

  return (
    <div className="editor-page">
      <div className="editor-header">
        <button className="btn btn-outline btn-small" onClick={() => navigate('/match')}>
          ← Back
        </button>
        <div className="editor-title">
          <h2>Video Editor</h2>
          <p className="editor-subtitle">
            {project.title} — {project.artist}
          </p>
        </div>
      </div>

      {/* Video preview */}
      <div className="editor-preview-wrap">
        <video
          ref={videoRef}
          className="editor-video"
          src={project.videoUrl}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const dur = e.target.duration;
            setProject((p) => ({ ...p, video_duration: dur }));
            if (videoEnd == null) setVideoEnd(dur);
          }}
          onEnded={stopPreview}
        />
        {/* Hidden audio element for synced playback */}
        <audio
          ref={audioRef}
          src={project.audioUrl}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const dur = e.target.duration;
            setProject((p) => ({ ...p, track_duration: dur }));
            if (audioEnd == null) setAudioEnd(dur);
          }}
        />
      </div>

      {/* Timeline section */}
      <div className="editor-timelines">
        <TimelineBar
          label="Video"
          duration={videoDuration}
          start={videoStart}
          end={videoEnd ?? videoDuration ?? 0}
          onChange={handleVideoTrim}
          color="#60b8ff"
          playhead={previewing ? videoPlayhead : null}
        />

        <TimelineBar
          label="Audio"
          duration={audioDuration}
          start={audioStart}
          end={audioEnd ?? audioDuration ?? 0}
          onChange={handleAudioTrim}
          color="#c084fc"
          playhead={previewing ? audioPlayhead : null}
        />
      </div>

      {/* Controls */}
      <div className="editor-controls">
        <button
          className={`btn ${previewing ? 'btn-danger' : 'btn-outline'}`}
          onClick={previewing ? stopPreview : startPreview}
          disabled={!project.videoUrl || !project.audioUrl}
        >
          {previewing ? '⏹ Stop Preview' : '▶ Preview'}
        </button>

        <div className="editor-trim-summary">
          <span>Video: {formatTime(videoStart)} – {formatTime(videoEnd ?? videoDuration)}</span>
          <span>Audio: {formatTime(audioStart)} – {formatTime(audioEnd ?? audioDuration)}</span>
        </div>
      </div>

      {/* Export section */}
      <div className="editor-export">
        {renderPhase === 'idle' && (
          <button className="btn btn-primary" onClick={handleRender}>
            Export &amp; Download
          </button>
        )}

        {renderPhase === 'rendering' && (
          <div className="editor-render-progress">
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${renderPct}%` }} />
            </div>
            <p className="progress-label">{renderLabel}</p>
          </div>
        )}

        {renderPhase === 'done' && downloadUrl && (
          <div className="editor-render-done">
            <p className="editor-render-success">Your video is ready!</p>
            <a
              href={downloadUrl}
              download
              className="btn btn-primary"
              target="_blank"
              rel="noreferrer"
            >
              Download MP4
            </a>
            <button
              className="btn btn-outline"
              onClick={() => { setRenderPhase('idle'); setDownloadUrl(null); }}
              style={{ marginLeft: '10px' }}
            >
              Re-export
            </button>
          </div>
        )}

        {renderPhase === 'error' && (
          <div>
            <p className="error-msg">{renderError}</p>
            <button className="btn btn-outline" onClick={() => setRenderPhase('idle')}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
