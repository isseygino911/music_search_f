import { useEffect, useRef } from 'react';

const BAR_COUNT = 80;

// Color sweep: left=blue → centre=purple/magenta → right=red
function barRGB(index, total) {
  const t = index / (total - 1);
  let r, g, b;
  if (t < 0.5) {
    const u = t / 0.5;
    r = Math.round(u * 192);
    g = Math.round(170 - u * 170);
    b = 255;
  } else {
    const u = (t - 0.5) / 0.5;
    r = Math.round(192 + u * 63);
    g = Math.round(u * 51);
    b = Math.round(255 - u * 255);
  }
  return [r, g, b];
}

export default function SpectrumBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const bars = Array.from({ length: BAR_COUNT }, (_, i) => ({
      height: Math.random(),
      target: Math.random(),
      speed: 0.006 + Math.random() * 0.014,
      phase: Math.random() * Math.PI * 2,
      // Envelope: taller toward centre, shorter at edges
      maxScale: 0.4 + 0.6 * Math.sin((i / (BAR_COUNT - 1)) * Math.PI),
    }));

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    let raf;

    function draw() {
      raf = requestAnimationFrame(draw);
      time += 0.011;

      const W = canvas.width;
      const H = canvas.height;

      // Clear to near-black
      ctx.fillStyle = '#00000c';
      ctx.fillRect(0, 0, W, H);

      const slotW = W / BAR_COUNT;   // width of each slot
      const maxBarH = H * 0.85;

      // ── Update bar physics ──────────────────────────────────────────
      for (let i = 0; i < BAR_COUNT; i++) {
        const bar = bars[i];
        bar.target = bar.maxScale * Math.max(0.04,
          0.38
          + 0.34 * Math.sin(time * 1.05 + bar.phase)
          + 0.18 * Math.sin(time * 2.4  + bar.phase * 1.6)
          + 0.10 * Math.abs(Math.sin(time * 0.55 + i * 0.14))
        );
        bar.target = Math.min(1, bar.target);
        // Smooth chase — rises fast, falls a bit slower
        const lag = bar.height < bar.target ? bar.speed * 1.4 : bar.speed * 0.7;
        bar.height += (bar.target - bar.height) * lag * 60 * (1 / 60);
      }

      // ── Draw each bar as three horizontal-gradient filled columns ──
      // Using a horizontal radial-style gradient (via createLinearGradient
      // rotated 90°) makes bars bleed into each other seamlessly.
      // We layer: outer bloom → mid glow → bright core.
      for (let i = 0; i < BAR_COUNT; i++) {
        const bar = bars[i];
        const [r, g, b] = barRGB(i, BAR_COUNT);
        const cx = i * slotW + slotW * 0.5;  // bar centre x
        const barH = bar.height * maxBarH;
        const top = H - barH;

        // ── Outer bloom: very wide, very transparent ──────────────────
        const bloomW = slotW * 9;
        const bloomL = cx - bloomW / 2;
        const boomGradH = ctx.createLinearGradient(bloomL, 0, bloomL + bloomW, 0);
        boomGradH.addColorStop(0,    `rgba(${r},${g},${b},0)`);
        boomGradH.addColorStop(0.3,  `rgba(${r},${g},${b},0.055)`);
        boomGradH.addColorStop(0.5,  `rgba(${r},${g},${b},0.13)`);
        boomGradH.addColorStop(0.7,  `rgba(${r},${g},${b},0.055)`);
        boomGradH.addColorStop(1,    `rgba(${r},${g},${b},0)`);

        // Vertical fade: transparent at top, opaque at bottom
        // We use a second pass with globalAlpha driven by a vertical gradient trick:
        // simplest approach — draw with alpha scaled by bar.height, vertically via linear grad
        const vGrad1 = ctx.createLinearGradient(0, top, 0, H);
        vGrad1.addColorStop(0,   `rgba(${r},${g},${b},0)`);
        vGrad1.addColorStop(0.6, `rgba(${r},${g},${b},${0.07 * bar.height})`);
        vGrad1.addColorStop(1,   `rgba(${r},${g},${b},${0.22 * bar.height})`);
        ctx.fillStyle = vGrad1;
        ctx.fillRect(cx - bloomW / 2, top, bloomW, barH);

        // ── Mid glow: medium width ────────────────────────────────────
        const midW = slotW * 4.5;
        const vGrad2 = ctx.createLinearGradient(0, top, 0, H);
        vGrad2.addColorStop(0,   `rgba(${r},${g},${b},0)`);
        vGrad2.addColorStop(0.35,`rgba(${r},${g},${b},${0.12 * bar.height})`);
        vGrad2.addColorStop(1,   `rgba(${r},${g},${b},${0.5  * bar.height})`);

        // Horizontal envelope for mid — cosine bell
        const midGradH = ctx.createLinearGradient(cx - midW / 2, 0, cx + midW / 2, 0);
        midGradH.addColorStop(0,   'rgba(0,0,0,0)'); // we'll use globalAlpha trick below

        // Draw mid glow with a separate pass using globalAlpha bell
        // Simpler: just use the vertical grad with a narrower rect
        ctx.fillStyle = vGrad2;
        // Gaussian-like: draw multiple overlapping rects with decreasing width/opacity
        for (let s = 1; s >= 0.2; s -= 0.2) {
          ctx.globalAlpha = (1 - s) * 0.55 * bar.height;
          ctx.fillRect(cx - midW * s / 2, top, midW * s, barH);
        }
        ctx.globalAlpha = 1;

        // ── Bright core streak: very narrow, full opacity ─────────────
        const coreW = Math.max(1.5, slotW * 0.38);
        const coreGrad = ctx.createLinearGradient(0, top, 0, H);
        coreGrad.addColorStop(0,    `rgba(${r},${g},${b},0)`);
        coreGrad.addColorStop(0.15, `rgba(${r},${g},${b},${0.55 * bar.height})`);
        coreGrad.addColorStop(0.75, `rgba(${r},${g},${b},0.95)`);
        coreGrad.addColorStop(1,    `rgba(255,255,255,0.95)`);
        ctx.fillStyle = coreGrad;
        ctx.fillRect(cx - coreW / 2, top, coreW, barH);

        // ── Base hotspot: radial white glow at floor ──────────────────
        const spotR = slotW * 4 * bar.height;
        if (spotR > 1) {
          const spotGrad = ctx.createRadialGradient(cx, H, 0, cx, H, spotR);
          spotGrad.addColorStop(0,   `rgba(255,255,255,${0.85 * bar.height})`);
          spotGrad.addColorStop(0.25,`rgba(${r},${g},${b},${0.55 * bar.height})`);
          spotGrad.addColorStop(0.7, `rgba(${r},${g},${b},${0.12 * bar.height})`);
          spotGrad.addColorStop(1,    'rgba(0,0,0,0)');
          ctx.fillStyle = spotGrad;
          ctx.fillRect(cx - spotR, H - spotR * 0.55, spotR * 2, spotR * 0.55 + 2);
        }
      }

      // ── Central ambient bloom ────────────────────────────────────────
      const bloom = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, W * 0.5);
      bloom.addColorStop(0,    'rgba(180,210,255,0.18)');
      bloom.addColorStop(0.2,  'rgba(100,60,200,0.08)');
      bloom.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, W, H);

      // ── Floor horizon line ───────────────────────────────────────────
      const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
      lineGrad.addColorStop(0,    'rgba(0,170,255,0.3)');
      lineGrad.addColorStop(0.35, 'rgba(150,0,255,0.5)');
      lineGrad.addColorStop(0.5,  'rgba(255,255,255,0.75)');
      lineGrad.addColorStop(0.65, 'rgba(255,60,0,0.5)');
      lineGrad.addColorStop(1,    'rgba(255,10,10,0.3)');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, H - 1);
      ctx.lineTo(W, H - 1);
      ctx.stroke();
    }

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: -1, display: 'block' }}
    />
  );
}
