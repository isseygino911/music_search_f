import { useState, useEffect, useCallback } from 'react';
import { getAllTracks, searchTracks } from '../api/tracks';
import SearchBar from '../components/SearchBar';
import TrackCard from '../components/TrackCard';

export default function SearchPage() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTrackId, setActiveTrackId] = useState(null);

  useEffect(() => {
    getAllTracks()
      .then(setTracks)
      .catch(() => setError('Failed to load tracks'))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = useCallback(async (q, genre, artist) => {
    setLoading(true);
    setError('');
    try {
      const results = await searchTracks(q, genre, artist);
      setTracks(results);
    } catch {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="page">
      <h1>Music Library</h1>
      <SearchBar onSearch={handleSearch} />

      {loading && <p className="loading">Loading...</p>}
      {error && <p className="error-msg">{error}</p>}

      {!loading && !error && tracks.length === 0 && (
        <p className="empty-state">No tracks found.</p>
      )}

      <div className="track-list">
        {tracks.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            activeTrackId={activeTrackId}
            onPlay={setActiveTrackId}
          />
        ))}
      </div>
    </div>
  );
}
