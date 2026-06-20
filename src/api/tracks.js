import axios from 'axios';

export async function getAllTracks() {
  const { data } = await axios.get('/api/tracks');
  return data;
}

export async function searchTracks(q, genre, artist) {
  const { data } = await axios.get('/api/tracks/search', {
    params: { q, genre, artist },
  });
  return data;
}

export async function uploadTrack(formData, onProgress) {
  const { data } = await axios.post('/api/tracks', formData, {
    onUploadProgress(event) {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
  return data;
}

export async function bulkUploadTracks(formData, onProgress) {
  const { data } = await axios.post('/api/tracks/bulk', formData, {
    onUploadProgress(event) {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
  return data;
}

export async function deleteTrack(id) {
  const { data } = await axios.delete(`/api/tracks/${id}`);
  return data;
}

export async function bulkDeleteTracks(ids) {
  const { data } = await axios.delete('/api/tracks', { data: { ids } });
  return data;
}

export async function getStreamUrl(trackId) {
  const { data } = await axios.get(`/api/tracks/${trackId}/stream`);
  return data.url;
}

export async function updateTrack(id, { title, artist, genre, description }) {
  const { data } = await axios.put(`/api/tracks/${id}`, { title, artist, genre, description });
  return data;
}

// Opens the download URL in the current tab — browser follows the S3 redirect
export function downloadTrack(trackId) {
  window.location.href = `/api/tracks/${trackId}/download`;
}
