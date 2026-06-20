import { useState, useEffect } from 'react';
import { updateTrack } from '../api/tracks';

export default function EditTrackModal({ track, onSave, onClose }) {
  const [fields, setFields] = useState({ title: '', artist: '', genre: '', description: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync fields whenever the track prop changes (new track opened)
  useEffect(() => {
    if (track) {
      setFields({
        title: track.title || '',
        artist: track.artist || '',
        genre: track.genre || '',
        description: track.description || '',
      });
      setErrors({});
      setApiError('');
    }
  }, [track]);

  // ESC key closes the modal
  useEffect(() => {
    if (!track) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [track, onClose]);

  if (!track) return null;

  function validate() {
    const errs = {};
    if (!fields.title.trim()) errs.title = 'Title is required';
    if (!fields.artist.trim()) errs.artist = 'Artist is required';
    return errs;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    setApiError('');
    try {
      const updated = await updateTrack(track.id, fields);
      onSave(updated);
    } catch (err) {
      setApiError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function set(field, value) {
    setFields((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">Edit Track</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close" disabled={saving}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="modal-title-input">Title <span aria-hidden="true">*</span></label>
            <input
              id="modal-title-input"
              className={`${errors.title ? 'input-error' : ''}`}
              type="text"
              value={fields.title}
              onChange={(e) => set('title', e.target.value)}
              disabled={saving}
              autoFocus
            />
            {errors.title && <p className="field-error">{errors.title}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="modal-artist-input">Artist <span aria-hidden="true">*</span></label>
            <input
              id="modal-artist-input"
              className={`${errors.artist ? 'input-error' : ''}`}
              type="text"
              value={fields.artist}
              onChange={(e) => set('artist', e.target.value)}
              disabled={saving}
            />
            {errors.artist && <p className="field-error">{errors.artist}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="modal-genre-input">Genre</label>
            <input
              id="modal-genre-input"
              type="text"
              value={fields.genre}
              onChange={(e) => set('genre', e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="modal-desc-input">Description</label>
            <textarea
              id="modal-desc-input"
              value={fields.description}
              onChange={(e) => set('description', e.target.value)}
              disabled={saving}
              rows={4}
            />
          </div>

          {apiError && <p className="modal-error">{apiError}</p>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-small btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-small" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
