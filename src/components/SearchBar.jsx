import { useState, useEffect } from 'react';

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [artist, setArtist] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query, genre, artist);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, genre, artist, onSearch]);

  return (
    <div className="search-bar">
      <input
        type="text"
        className="search-input"
        placeholder="Search by title, artist, genre..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="search-filters">
        <input
          type="text"
          className="filter-input"
          placeholder="Filter by genre"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        />
        <input
          type="text"
          className="filter-input"
          placeholder="Filter by artist"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
      </div>
    </div>
  );
}
