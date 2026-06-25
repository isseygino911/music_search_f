import { useState, useEffect, useRef } from 'react';
import { submitVideoForMatch, streamMatchJob } from '../api/match';
import TrackCard from './TrackCard';

const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'];
const MAX_SIZE_MB = 50;

const STEPS = [
  'Uploading video to AI...',
  'AI is watching your video...',
  'Generating music description...',
  'Finding matching tracks...',
];

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}

export default function VideoMatchForm() {
  const [phase, setPhase] = useState('idle'); // idle | uploading | processing | done | error
  const [file, setFile] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [steps, setSteps] = useState(STEPS.map((label) => ({ label, status: 'pending' })));
  const [tracks, setTracks] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTrackId, setActiveTrackId] = useState(null);

  const warnFnRef = useRef(null);

  // Refresh recovery: if a job was in progress when the page was refreshed
  useEffect(() => {
    const savedJobId = sessionStorage.getItem('matchJobId');
    if (savedJobId) {
      setJobId(savedJobId);
      setPhase('processing');
    }
  }, []);

  // Start SSE stream whenever we enter processing phase with a jobId
  useEffect(() => {
    if (phase !== 'processing' || !jobId) return;

    streamMatchJob(
      jobId,
      (data) => {
        // Step event: update the step list
        setSteps((prev) =>
          prev.map((s, i) => {
            if (i === data.step - 1) return { ...s, status: data.status };
            return s;
          })
        );
      },
      (data) => {
        // Done event
        sessionStorage.removeItem('matchJobId');
        if (warnFnRef.current) {
          window.removeEventListener('beforeunload', warnFnRef.current);
          warnFnRef.current = null;
        }
        setTracks(data.tracks || []);
        setPhase('done');
      },
      (data) => {
        // Error event
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
    setErrorMsg('');
    setActiveTrackId(null);
    sessionStorage.removeItem('matchJobId');
    if (warnFnRef.current) {
      window.removeEventListener('beforeunload', warnFnRef.current);
      warnFnRef.current = null;
    }
  }

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

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!file || !!validationError}
          >
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

  // done
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Matching Tracks</h2>
        <button className="btn btn-outline" onClick={reset}>
          Try Another Video
        </button>
      </div>

      {tracks.length === 0 ? (
        <p className="empty-state">No matching tracks found. Try uploading more tracks with descriptions.</p>
      ) : (
        <div className="track-list">
          {tracks.map((track) => (
            <div key={track.id} className="match-result-item">
              <div className="match-score-badge">
                {Math.round(track.score * 100)}% match
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
  );
}
