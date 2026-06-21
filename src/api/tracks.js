import axios from 'axios';
import { BASE_URL } from './config';

export async function getAllTracks() {
  const { data } = await axios.get(`${BASE_URL}/api/tracks`);
  return data;
}

export async function searchTracks(q, genre, artist) {
  const { data } = await axios.get(`${BASE_URL}/api/tracks/search`, {
    params: { q, genre, artist },
  });
  return data;
}

export async function uploadTrack(formData, onProgress) {
  const { data } = await axios.post(`${BASE_URL}/api/tracks`, formData, {
    onUploadProgress(event) {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
  return data;
}

export async function bulkUploadTracks(formData, onProgress, onDone) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/api/tracks/bulk`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop();

    let eventType = null;
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (eventType === 'progress' && onProgress) onProgress(data);
          if (eventType === 'done' && onDone) onDone(data);
        } catch {}
        eventType = null;
      }
    }
  }
}

export async function deleteTrack(id) {
  const { data } = await axios.delete(`${BASE_URL}/api/tracks/${id}`);
  return data;
}

export async function bulkDeleteTracks(ids) {
  const { data } = await axios.delete(`${BASE_URL}/api/tracks`, { data: { ids } });
  return data;
}

export async function getStreamUrl(trackId) {
  const { data } = await axios.get(`${BASE_URL}/api/tracks/${trackId}/stream`);
  return data.url;
}

export async function updateTrack(id, { title, artist, genre, description }) {
  const { data } = await axios.put(`${BASE_URL}/api/tracks/${id}`, { title, artist, genre, description });
  return data;
}

export async function downloadTrack(trackId) {
  const { data } = await axios.get(`${BASE_URL}/api/tracks/${trackId}/download-url`);
  window.location.href = data.url;
}
