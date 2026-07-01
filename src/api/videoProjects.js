import axios from 'axios';
import { BASE_URL } from './config';

export function listProjects() {
  return axios.get(`${BASE_URL}/api/video-projects`).then((r) => r.data);
}

export function createProject(trackId, videoS3Key) {
  return axios.post(`${BASE_URL}/api/video-projects`, { trackId, videoS3Key })
    .then((r) => r.data);
}

export function getProject(projectId) {
  return axios.get(`${BASE_URL}/api/video-projects/${projectId}`)
    .then((r) => r.data);
}

export function updateProject(projectId, { videoStart, videoEnd, audioStart, audioEnd }) {
  return axios.patch(`${BASE_URL}/api/video-projects/${projectId}`, {
    videoStart, videoEnd, audioStart, audioEnd,
  }).then((r) => r.data);
}

// POST /render streams SSE back — same pattern as match.js and syncQdrant
export function renderAndStream(projectId, onProgress, onDone, onError) {
  const token = localStorage.getItem('token');
  const url = `${BASE_URL}/api/video-projects/${projectId}/render`;

  fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).then(async (response) => {
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      onError({ error: body.error || 'Render failed' });
      return;
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

      let currentEvent = null;
      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const data = JSON.parse(line.slice(5).trim());
          if (currentEvent === 'progress') onProgress(data);
          else if (currentEvent === 'done') onDone(data);
          else if (currentEvent === 'error') onError(data);
          currentEvent = null;
        }
      }
    }
  }).catch((err) => onError({ error: err.message }));
}
