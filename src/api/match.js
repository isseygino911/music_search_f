import axios from 'axios';
import { BASE_URL } from './config';

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

function parseSseLines(lines, onStep, onDone, onError) {
  let eventType = null;
  for (const line of lines) {
    if (line.startsWith('event: ')) {
      eventType = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        if (eventType === 'step' && onStep) onStep(data);
        if (eventType === 'done' && onDone) onDone(data);
        if (eventType === 'error' && onError) onError(data);
      } catch {}
      eventType = null;
    }
  }
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

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.trim()) parseSseLines(buffer.split('\n'), onStep, onDone, onError);
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    parseSseLines(lines, onStep, onDone, onError);
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
