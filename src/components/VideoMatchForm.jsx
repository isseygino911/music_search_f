import { useState, useEffect, useRef, useCallback } from 'react';
import { submitVideoForMatch, streamMatchJob } from '../api/match';
import { createProject, updateProject, renderAndStream } from '../api/videoProjects';
import TrackCard from './TrackCard';
import TimelineBar from './TimelineBar';

const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'];
const MAX_SIZE_MB = 200;

const STEPS = [
  'Uploading video to AI...',
  'AI is watching your video...',
  'Generating music description...',
  'Finding matching tracks...',
];

function formatTime(sec) {
  if (sec == null || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}

// ── Inline editor shown after a track is selected ────────────────────────────
function InlineEditor({ videoFile, videoFallbackUrl, videoS3Key, track, onClose }) {
  const [videoDuration, setVideoDuration] = useState(null);
  const [audioDuration, setAudioDuration] = useState(null);
  const [videoStart, setVideoStart] = useState(0);
  const [videoEnd, setVideoEnd] = useState(null);
  const [audioStart, setAudioStart] = useState(0);
  const [audioEnd, setAudioEnd] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [videoPlayhead, setVideoPlayhead] = useState(0);
  const [audioPlayhead, setAudioPlayhead] = useState(0);
  const [renderPhase, setRenderPhase] = useState('idle'); // idle | rendering | done | error
  const [renderLabel, setRenderLabel] = useState('');
  const [renderPct, setRenderPct] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [renderError, setRenderError] = useState('');
  const [projectId, setProjectId] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const saveTimer = useRef(null);

  // Create project + get audio stream URL on mount
  useEffect(() => {
    async function init() {
      // Get presigned audio URL for preview
      const { getStreamUrl } = await import('../api/tracks');
      const url = await getStreamUrl(track.id);
      setAudioUrl(url);

      // Create project if we have videoS3Key
      if (videoS3Key) {
        try {
          const { projectId: pid } = await createProject(track.id, videoS3Key);
          setProjectId(pid);
        } catch {
          // Project creation failed — editor still works for preview, just can't export
        }
      }
    }
    init();
  }, [track.id, videoS3Key]);

  // Use local file blob URL for video preview (works even without S3)
  const localVideoUrl = useRef(null);
  useEffect(() => {
    if (videoFile) {
      localVideoUrl.current = URL.createObjectURL(videoFile);
    }
    return () => {
      if (localVideoUrl.current) URL.revokeObjectURL(localVideoUrl.current);
    };
  }, [videoFile]);

  const scheduleSave = useCallback((vs, ve, as, ae) => {
    if (!projectId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateProject(projectId, { videoStart: vs, videoEnd: ve, audioStart: as, audioEnd: ae }).catch(() => {});
    }, 600);
  }, [projectId]);

  const handleVideoTrim = useCallback((s, e) => {
    setVideoStart(s);
    setVideoEnd(e);
    scheduleSave(s, e, audioStart, audioEnd);
    if (videoRef.current) videoRef.current.currentTime = s;
  }, [audioStart, audioEnd, scheduleSave]);

  const handleAudioTrim = useCallback((s, e) => {
    setAudioStart(s);
    setAudioEnd(e);
    scheduleSave(videoStart, videoEnd, s, e);
    if (audioRef.current) audioRef.current.currentTime = s;
  }, [videoStart, videoEnd, scheduleSave]);

  const stopPreview = useCallback(() => {
    setPreviewing(false);
    cancelAnimationFrame(rafRef.current);
    videoRef.current?.pause();
    audioRef.current?.pause();
  }, []);

  const startPreview = useCallback(() => {
    if (!videoRef.current || !audioRef.current) return;
    const vEnd = videoEnd ?? videoDuration ?? Infinity;
    const aEnd = audioEnd ?? audioDuration ?? Infinity;

    videoRef.current.currentTime = videoStart;
    audioRef.current.currentTime = audioStart;
    videoRef.current.play().catch(() => {});
    audioRef.current.play().catch(() => {});
    setPreviewing(true);

    const tick = () => {
      const vTime = videoRef.current?.currentTime ?? 0;
      const aTime = audioRef.current?.currentTime ?? 0;
      setVideoPlayhead(vTime);
      setAudioPlayhead(aTime);
      if (vTime >= vEnd || aTime >= aEnd) { stopPreview(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [videoStart, videoEnd, audioStart, audioEnd, videoDuration, audioDuration, stopPreview]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(saveTimer.current);
  }, []);

  function handleRender() {
    if (!projectId) {
      setRenderError('Project could not be saved (video may not have been stored). Re-upload and try again.');
      setRenderPhase('error');
      return;
    }
    setRenderPhase('rendering');
    setRenderLabel('Starting render...');
    setRenderPct(0);
    renderAndStream(
      projectId,
      (d) => { setRenderLabel(d.label || 'Rendering...'); setRenderPct(d.pct ?? 0); },
      (d) => { setDownloadUrl(d.downloadUrl); setRenderPhase('done'); setRenderPct(100); },
      (d) => { setRenderError(d.error || 'Render failed'); setRenderPhase('error'); }
    );
  }

  return (
    <div className="inline-editor">
      <div className="inline-editor-header">
        <div className="inline-editor-track-info">
          <span className="inline-editor-label">Editing with</span>
          <strong>{track.title}</strong>
          <span className="inline-editor-artist">— {track.artist}</span>
        </div>
        <button className="btn btn-outline btn-small" onClick={onClose}>✕ Change track</button>
      </div>

      {/* Video preview */}
      <div className="editor-preview-wrap">
        <video
          ref={videoRef}
          className="editor-video"
          src={localVideoUrl.current || videoFallbackUrl || undefined}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const dur = e.target.duration;
            setVideoDuration(dur);
            if (videoEnd == null) setVideoEnd(dur);
          }}
          onEnded={stopPreview}
        />
        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const dur = e.target.duration;
            setAudioDuration(dur);
            if (audioEnd == null) setAudioEnd(dur);
          }}
        />
      </div>

      {/* Duration info */}
      <div className="inline-editor-meta">
        {videoDuration != null && (
          <span>Video: <strong>{formatTime(videoDuration)}</strong></span>
        )}
        {audioDuration != null && (
          <span>Audio: <strong>{formatTime(audioDuration)}</strong></span>
        )}
      </div>

      {/* Timelines */}
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
          disabled={!audioUrl}
        >
          {previewing ? '⏹ Stop' : '▶ Preview'}
        </button>
        <span className="editor-trim-summary" style={{ display: 'flex', gap: 16 }}>
          <span>Video: {formatTime(videoStart)} – {formatTime(videoEnd ?? videoDuration)}</span>
          <span>Audio: {formatTime(audioStart)} – {formatTime(audioEnd ?? audioDuration)}</span>
        </span>
      </div>

      {/* Export */}
      <div className="editor-export">
        {renderPhase === 'idle' && (
          <button className="btn btn-primary" onClick={handleRender} disabled={!projectId}>
            {projectId ? 'Export & Download' : 'Saving project...'}
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
            <a href={downloadUrl} download className="btn btn-primary" target="_blank" rel="noreferrer">
              Download MP4
            </a>
            <button className="btn btn-outline" onClick={() => { setRenderPhase('idle'); setDownloadUrl(null); }} style={{ marginLeft: 10 }}>
              Re-export
            </button>
          </div>
        )}
        {renderPhase === 'error' && (
          <div>
            <p className="error-msg">{renderError}</p>
            <button className="btn btn-outline" onClick={() => setRenderPhase('idle')}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main VideoMatchForm ───────────────────────────────────────────────────────
export default function VideoMatchForm({ preloadedSession = null }) {
  const [phase, setPhase] = useState(preloadedSession ? 'done' : 'idle');
  const [file, setFile] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [steps, setSteps] = useState(STEPS.map((label) => ({ label, status: 'pending' })));
  const [tracks, setTracks] = useState(preloadedSession?.tracks || []);
  const [videoS3Key, setVideoS3Key] = useState(preloadedSession?.video_s3_key || null);
  const [sessionVideoUrl] = useState(preloadedSession?.videoUrl || null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);

  const warnFnRef = useRef(null);
  const previewVideoRef = useRef(null);

  // Local blob URL for the uploaded video (for preview on results screen)
  const localVideoUrl = useRef(null);

  useEffect(() => {
    const savedJobId = sessionStorage.getItem('matchJobId');
    if (savedJobId) {
      setJobId(savedJobId);
      setPhase('processing');
    }
  }, []);

  useEffect(() => {
    if (phase !== 'processing' || !jobId) return;

    streamMatchJob(
      jobId,
      (data) => {
        setSteps((prev) =>
          prev.map((s, i) => (i === data.step - 1 ? { ...s, status: data.status } : s))
        );
      },
      (data) => {
        sessionStorage.removeItem('matchJobId');
        if (warnFnRef.current) {
          window.removeEventListener('beforeunload', warnFnRef.current);
          warnFnRef.current = null;
        }
        setTracks(data.tracks || []);
        setVideoS3Key(data.videoS3Key || null);
        setPhase('done');
        // sessionId is the same as jobId — used for history lookup
      },
      (data) => {
        sessionStorage.removeItem('matchJobId');
        if (warnFnRef.current) {
          window.removeEventListener('beforeunload', warnFnRef.current);
          warnFnRef.current = null;
        }
        setErrorMsg(data.error || 'Something went wrong');
        setPhase('error');
      }
    ).catch((err) => {
      sessionStorage.removeItem('matchJobId');
      setErrorMsg(err.message);
      setPhase('error');
    });
  }, [phase, jobId]);

  // Create/revoke blob URL when file changes
  useEffect(() => {
    if (file) {
      localVideoUrl.current = URL.createObjectURL(file);
    }
    return () => {
      if (localVideoUrl.current) {
        URL.revokeObjectURL(localVideoUrl.current);
        localVideoUrl.current = null;
      }
    };
  }, [file]);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setValidationError('Unsupported format. Use MP4, WebM, MOV, or AVI.');
      setFile(null);
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setValidationError(`File too large (max ${MAX_SIZE_MB} MB)`);
      setFile(null);
      return;
    }
    setValidationError('');
    setFile(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;

    setPhase('uploading');
    setUploadProgress(0);

    const warnFn = (ev) => {
      ev.preventDefault();
      ev.returnValue = 'Video is still being processed. Are you sure you want to leave?';
    };
    warnFnRef.current = warnFn;
    window.addEventListener('beforeunload', warnFn);

    try {
      const formData = new FormData();
      formData.append('videoFile', file);
      const { jobId: newJobId } = await submitVideoForMatch(formData, setUploadProgress);
      sessionStorage.setItem('matchJobId', newJobId);
      setJobId(newJobId);
      setSteps(STEPS.map((label) => ({ label, status: 'pending' })));
      setPhase('processing');
    } catch (err) {
      window.removeEventListener('beforeunload', warnFn);
      warnFnRef.current = null;
      setErrorMsg(err.response?.data?.error || err.message || 'Upload failed');
      setPhase('error');
    }
  }

  function reset() {
    setPhase('idle');
    setFile(null);
    setValidationError('');
    setUploadProgress(0);
    setJobId(null);
    setSteps(STEPS.map((label) => ({ label, status: 'pending' })));
    setTracks([]);
    setVideoS3Key(null);
    setErrorMsg('');
    setActiveTrackId(null);
    setSelectedTrack(null);
    setVideoDuration(null);
    sessionStorage.removeItem('matchJobId');
    if (warnFnRef.current) {
      window.removeEventListener('beforeunload', warnFnRef.current);
      warnFnRef.current = null;
    }
  }

  // ── Render phases ───────────────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <div className="upload-form">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Video File</label>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/avi"
              onChange={handleFileChange}
            />
            {file && (
              <p className="file-name">
                {file.name} — {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
            {validationError && <p className="error-msg">{validationError}</p>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={!file || !!validationError}>
            Find Matching Music
          </button>
        </form>
      </div>
    );
  }

  if (phase === 'uploading') {
    return (
      <div className="upload-form">
        <div className="progress-wrapper">
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="progress-label">Uploading video... {uploadProgress}%</p>
        </div>
      </div>
    );
  }

  if (phase === 'processing') {
    return (
      <div className="upload-form">
        <div className="match-steps">
          {steps.map((step, i) => (
            <div key={i} className={`match-step match-step--${step.status}`}>
              <div className="match-step-icon">
                {step.status === 'done' && <CheckIcon />}
                {step.status === 'active' && <span className="track-play-spinner" />}
              </div>
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="upload-form">
        <p className="error-msg">{errorMsg}</p>
        <button className="btn btn-primary" onClick={reset} style={{ marginTop: '12px' }}>
          Try Again
        </button>
      </div>
    );
  }

  // ── done phase: show video + duration + tracks + inline editor ──────────────
  return (
    <div className="match-done-layout">

      {/* If a track is selected, show the inline editor full-width */}
      {selectedTrack ? (
        <InlineEditor
          videoFile={file}
          videoFallbackUrl={sessionVideoUrl}
          videoS3Key={videoS3Key}
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
        />
      ) : (
        <>
          {/* Video preview + duration bar */}
          <div className="match-video-preview">
            <div className="match-video-header">
              <h3 className="match-video-title">Your Video</h3>
              <button className="btn btn-outline btn-small" onClick={reset}>
                Try Another Video
              </button>
            </div>
            <div className="editor-preview-wrap">
              <video
                ref={previewVideoRef}
                className="editor-video"
                src={localVideoUrl.current || sessionVideoUrl || undefined}
                controls
                preload="metadata"
                onLoadedMetadata={(e) => setVideoDuration(e.target.duration)}
              />
            </div>
            {videoDuration != null && (
              <div className="match-video-duration">
                <span className="match-video-duration-label">Duration</span>
                <div className="match-video-duration-bar">
                  <div className="match-video-duration-fill" />
                </div>
                <span className="match-video-duration-time">{formatTime(videoDuration)}</span>
              </div>
            )}
          </div>

          {/* Matched tracks */}
          <div className="match-tracks-section">
            <h3 className="match-tracks-title">
              Matched Tracks
              <span className="match-tracks-hint"> — select one to edit</span>
            </h3>
            {tracks.length === 0 ? (
              <p className="empty-state">No matching tracks found. Try uploading more tracks with descriptions.</p>
            ) : (
              <div className="track-list">
                {tracks.map((track) => (
                  <div key={track.id} className="match-result-item">
                    <div className="match-result-badges">
                      <div className="match-score-badge">
                        {Math.round(track.score * 100)}% match
                      </div>
                      <button
                        className="btn btn-primary btn-small match-use-btn"
                        onClick={() => setSelectedTrack(track)}
                      >
                        Use this track →
                      </button>
                    </div>
                    <TrackCard
                      track={track}
                      activeTrackId={activeTrackId}
                      onPlay={setActiveTrackId}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
