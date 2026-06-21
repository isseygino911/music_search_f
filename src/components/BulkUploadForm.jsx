import { useState } from 'react';
import { bulkUploadTracks } from '../api/tracks';

export default function BulkUploadForm({ onUploaded }) {
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | done | error
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  function handleFileChange(e) {
    setFiles(Array.from(e.target.files));
    setStatus('idle');
    setResults([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (files.length === 0 || !artist) return;

    const formData = new FormData();
    files.forEach((f) => formData.append('audioFiles', f));
    formData.append('artist', artist);
    formData.append('genre', genre);
    formData.append('description', description);

    setStatus('uploading');
    setUploadProgress(0);
    setProcessedCount(0);
    setErrorMsg('');
    setResults([]);

    const liveResults = [];

    try {
      await bulkUploadTracks(
        formData,
        ({ index, total, filename, success, error }) => {
          setProcessedCount(index);
          setUploadProgress(Math.round((index / total) * 100));
          liveResults.push({ filename, success, error });
          setResults([...liveResults]);
        },
        ({ results: finalResults }) => {
          setResults(finalResults);
          setStatus('done');
          const uploadedTracks = finalResults.filter((r) => r.success).map((r) => r.track);
          if (onUploaded && uploadedTracks.length > 0) onUploaded(uploadedTracks);
          setArtist('');
          setGenre('');
          setDescription('');
          setFiles([]);
          setUploadProgress(0);
          setProcessedCount(0);
        }
      );
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Bulk upload failed');
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <h2>Bulk Upload Tracks</h2>
      <p className="upload-hint">
        Select multiple audio files. Title will be taken from each filename. Artist applies to all files.
      </p>

      <div className="form-group">
        <label>Artist * (applied to all files)</label>
        <input
          type="text"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          required
          placeholder="Artist name"
        />
      </div>

      <div className="form-group">
        <label>Genre (optional, applied to all)</label>
        <input
          type="text"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="e.g. Pop, Rock, Jazz"
        />
      </div>

      <div className="form-group">
        <label>Description (optional, applied to all)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mood, energy, theme..."
          rows={2}
        />
      </div>

      <div className="form-group">
        <label>Audio Files *</label>
        <input
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileChange}
          required
        />
        {files.length > 0 && (
          <p className="file-name">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
        )}
      </div>

      {/* File list preview */}
      {files.length > 0 && status === 'idle' && (
        <ul className="bulk-file-list">
          {files.map((f) => (
            <li key={f.name} className="bulk-file-item">
              <span className="bulk-file-name">{f.name}</span>
              <span className="bulk-file-size">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
            </li>
          ))}
        </ul>
      )}

      {/* Upload progress bar — real-time per-file via SSE */}
      {status === 'uploading' && (
        <div className="progress-wrapper">
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="progress-label">
            {processedCount} of {files.length} processed — {uploadProgress}%
          </p>
        </div>
      )}

      {/* Live per-file results — shown during upload AND after done */}
      {(status === 'uploading' || status === 'done') && results.length > 0 && (
        <div className="bulk-results">
          <p className="bulk-summary">
            {successCount > 0 && <span className="success-count">{successCount} uploaded</span>}
            {successCount > 0 && failCount > 0 && ' · '}
            {failCount > 0 && <span className="fail-count">{failCount} failed</span>}
          </p>
          <ul className="bulk-result-list">
            {results.map((r) => (
              <li key={r.filename} className={`bulk-result-item ${r.success ? 'bulk-result--ok' : 'bulk-result--fail'}`}>
                <span className="bulk-result-icon">{r.success ? '✓' : '✗'}</span>
                <span className="bulk-result-name">{r.filename}</span>
                {!r.success && <span className="bulk-result-error">{r.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === 'error' && <p className="error-msg">{errorMsg}</p>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === 'uploading' || files.length === 0 || !artist}
      >
        {status === 'uploading'
          ? `Processing file ${processedCount + 1} of ${files.length}...`
          : `Upload ${files.length || ''} Files`}
      </button>
    </form>
  );
}
