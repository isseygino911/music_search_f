import { useRef, useCallback } from 'react';

function formatTime(sec) {
  if (sec == null || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Horizontal trim timeline bar with draggable left/right handles.
 *
 * Props:
 *   duration   - total duration in seconds
 *   start      - current trim start (seconds)
 *   end        - current trim end (seconds)
 *   onChange   - (start, end) => void
 *   color      - CSS color for the active region (default blue)
 *   label      - label shown above the bar
 *   playhead   - optional current playback position (seconds) to show a cursor
 */
export default function TimelineBar({ duration, start, end, onChange, color = '#60b8ff', label, playhead }) {
  const trackRef = useRef(null);
  const dragging = useRef(null); // 'left' | 'right' | null

  const safeEnd = end ?? duration ?? 0;
  const safeDuration = duration || 1;
  const leftPct = (start / safeDuration) * 100;
  const rightPct = (safeEnd / safeDuration) * 100;

  const pctToTime = useCallback((pct) => {
    return Math.max(0, Math.min(safeDuration, (pct / 100) * safeDuration));
  }, [safeDuration]);

  const getTrackPct = useCallback((clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  }, []);

  const onMouseDown = useCallback((handle) => (e) => {
    e.preventDefault();
    dragging.current = handle;

    const onMove = (moveEvent) => {
      const pct = getTrackPct(moveEvent.clientX);
      const time = pctToTime(pct);
      if (dragging.current === 'left') {
        const newStart = Math.min(time, safeEnd - 0.5);
        onChange(Math.max(0, newStart), safeEnd);
      } else {
        const newEnd = Math.max(time, start + 0.5);
        onChange(start, Math.min(safeDuration, newEnd));
      }
    };

    const onUp = () => {
      dragging.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [getTrackPct, pctToTime, start, safeEnd, safeDuration, onChange]);

  // Touch support
  const onTouchStart = useCallback((handle) => (e) => {
    e.preventDefault();
    dragging.current = handle;

    const onMove = (touchEvent) => {
      const pct = getTrackPct(touchEvent.touches[0].clientX);
      const time = pctToTime(pct);
      if (dragging.current === 'left') {
        const newStart = Math.min(time, safeEnd - 0.5);
        onChange(Math.max(0, newStart), safeEnd);
      } else {
        const newEnd = Math.max(time, start + 0.5);
        onChange(start, Math.min(safeDuration, newEnd));
      }
    };

    const onEnd = () => {
      dragging.current = null;
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [getTrackPct, pctToTime, start, safeEnd, safeDuration, onChange]);

  const playheadPct = playhead != null ? (playhead / safeDuration) * 100 : null;

  return (
    <div className="timeline-bar-wrapper">
      {label && (
        <div className="timeline-bar-header">
          <span className="timeline-bar-label">{label}</span>
          <span className="timeline-bar-time">
            {formatTime(start)} – {formatTime(safeEnd)}
            <span className="timeline-bar-total"> / {formatTime(safeDuration)}</span>
          </span>
        </div>
      )}
      <div className="timeline-bar-track" ref={trackRef}>
        {/* Dimmed left region (before trim start) */}
        <div
          className="timeline-bar-dim"
          style={{ left: 0, width: `${leftPct}%` }}
        />

        {/* Active region */}
        <div
          className="timeline-bar-active"
          style={{
            left: `${leftPct}%`,
            width: `${rightPct - leftPct}%`,
            background: `${color}30`,
            borderTop: `2px solid ${color}`,
            borderBottom: `2px solid ${color}`,
          }}
        />

        {/* Dimmed right region (after trim end) */}
        <div
          className="timeline-bar-dim"
          style={{ left: `${rightPct}%`, right: 0 }}
        />

        {/* Left handle */}
        <div
          className="timeline-handle timeline-handle--left"
          style={{ left: `${leftPct}%`, background: color }}
          onMouseDown={onMouseDown('left')}
          onTouchStart={onTouchStart('left')}
        />

        {/* Right handle */}
        <div
          className="timeline-handle timeline-handle--right"
          style={{ left: `${rightPct}%`, background: color }}
          onMouseDown={onMouseDown('right')}
          onTouchStart={onTouchStart('right')}
        />

        {/* Playhead cursor */}
        {playheadPct != null && (
          <div
            className="timeline-playhead"
            style={{ left: `${playheadPct}%` }}
          />
        )}
      </div>
    </div>
  );
}
