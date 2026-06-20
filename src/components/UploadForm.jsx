import { useState } from 'react';
import { uploadTrack } from '../api/tracks';

export default function UploadForm({ onUploaded }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('audioFile', file);
    formData.append('title', title);
    formData.append('artist', artist);
    formData.append('genre', genre);
    formData.append('description', description);

    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      const track = await uploadTrack(formData, setProgress);
      setStatus('success');
      setTitle('');
      setArtist('');
      setGenre('');
      setDescription('');
      setFile(null);
      setProgress(0);
      if (onUploaded) onUploaded(track);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.response?.data?.error || 'Upload failed');
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <h2>Upload Track</h2>

      <div className="form-group">
        <label>Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Track title"
        />
      </div>

      <div className="form-group">
        <label>Artist *</label>
        <input
          type="text"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          required
          placeholder="Artist name"
        />
      </div>

      <div className="form-group">
        <label>Genre</label>
        <input
          type="text"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="e.g. Pop, Rock, Jazz"
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mood, energy, theme... (helps with AI matching)"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Audio File *</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setFile(e.target.files[0] || null)}
          required
        />
        {file && <p className="file-name">{file.name}</p>}
      </div>

      {status === 'uploading' && (
        <div className="progress-wrapper">
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-label">{progress}%</p>
        </div>
      )}

      {status === 'success' && (
        <p className="success-msg">Track uploaded successfully!</p>
      )}

      {status === 'error' && (
        <p className="error-msg">{errorMsg}</p>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === 'uploading' || !file}
      >
        {status === 'uploading' ? 'Uploading...' : 'Upload Track'}
      </button>
    </form>
  );
}
