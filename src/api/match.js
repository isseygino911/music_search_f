import axios from 'axios';
import { BASE_URL } from './config';

export function deleteMatchSession(sessionId) {
  return axios.delete(`${BASE_URL}/api/match/sessions/${sessionId}`).then((r) => r.data);
}

export function listMatchSessions() {
  return axios.get(`${BASE_URL}/api/match/sessions`).then((r) => r.data);
}

export function getMatchSession(sessionId) {
  return axios.get(`${BASE_URL}/api/match/sessions/${sessionId}`).then((r) => r.data);
}

export async function submitVideoForMatch(formData, onUploadProgress) {
  const { data } = await axios.post(`${BASE_URL}/api/match`, formData, {
    onUploadProgress(event) {
      if (onUploadProgress && event.total) {
        onUploadProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
  return data;
}

export async function streamMatchJob(jobId, onStep, onDone, onError) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/api/match/stream/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Stream failed' }));
    throw new Error(err.error || 'Stream failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let pendingEvent = null; // carries eventType across chunk boundaries

  function processBuffer() {
    // Split on SSE message boundaries (double newline)
    const messages = buffer.split('\n\n');
    // Keep the last incomplete message in the buffer
    buffer = messages.pop();

    for (const message of messages) {
      let eventType = pendingEvent;
      pendingEvent = null;
      let dataLine = null;

      for (const line of message.split('\n')) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          dataLine = line.slice(6);
        }
      }

      if (dataLine !== null) {
        try {
          const data = JSON.parse(dataLine);
          if (eventType === 'step' && onStep) onStep(data);
          if (eventType === 'done' && onDone) onDone(data);
          if (eventType === 'error' && onError) onError(data);
        } catch {}
      } else if (eventType) {
        // eventType arrived but no data yet — carry it to next message
        pendingEvent = eventType;
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      // Flush any remaining buffer
      if (buffer.trim()) {
        buffer += '\n\n';
        processBuffer();
      }
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    processBuffer();
  }
}

export async function syncQdrant(onProgress, onDone) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/api/tracks/sync-qdrant`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Sync failed' }));
    throw new Error(err.error || 'Sync failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  function processLines(lines) {
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

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.trim()) processLines(buffer.split('\n'));
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    processLines(lines);
  }
}
