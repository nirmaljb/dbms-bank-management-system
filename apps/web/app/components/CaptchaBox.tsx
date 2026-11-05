'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { captchaMatches, generateCaptcha, seededRandom } from '../lib/captcha';

const WIDTH = 150;
const HEIGHT = 40;

/**
 * Owns the current captcha code. The code only changes when `refresh` is
 * called, so re-renders, typing and failed logins never swap the image.
 * The code is never rendered as text, so the server's empty initial value
 * does not cause a hydration mismatch.
 */
export function useCaptcha() {
  const [code, setCode] = useState(() => (typeof window === 'undefined' ? '' : generateCaptcha()));
  const refresh = useCallback(() => setCode(generateCaptcha()), []);
  const matches = useCallback((input: string) => captchaMatches(input, code), [code]);
  return { code, refresh, matches };
}

function drawCaptcha(canvas: HTMLCanvasElement, code: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Draw at device resolution so the text stays sharp on high-DPI screens.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = WIDTH * dpr;
  canvas.height = HEIGHT * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const rand = seededRandom(code);

  ctx.fillStyle = '#f2f6fa';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Light noise behind the text: it never crosses a character in a dark colour.
  ctx.strokeStyle = '#c3d3e4';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(rand() * WIDTH, rand() * HEIGHT);
    ctx.bezierCurveTo(rand() * WIDTH, rand() * HEIGHT, rand() * WIDTH, rand() * HEIGHT, rand() * WIDTH, rand() * HEIGHT);
    ctx.stroke();
  }
  ctx.fillStyle = '#b8cde4';
  for (let i = 0; i < 40; i++) {
    ctx.fillRect(rand() * WIDTH, rand() * HEIGHT, 1.5, 1.5);
  }

  const colors = ['#003366', '#8b0000', '#005500', '#4a235a', '#333333'];
  const step = WIDTH / (code.length + 1);
  ctx.font = 'bold 22px Verdana, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < code.length; i++) {
    ctx.save();
    ctx.translate(step * (i + 1), HEIGHT / 2 + (rand() * 6 - 3));
    ctx.rotate((rand() * 24 - 12) * (Math.PI / 180));
    ctx.fillStyle = colors[i % colors.length]!;
    ctx.fillText(code.charAt(i), 0, 0);
    ctx.restore();
  }
}

export function CaptchaBox({ code, onRefresh }: { code: string; onRefresh: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current && code) drawCaptcha(canvasRef.current, code);
  }, [code]);

  return (
    <div className="flex items-center gap-2">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH, height: HEIGHT }}
        className="block border border-[#7f9db9] select-none"
        role="img"
        aria-label="Captcha image"
      />
      <button
        type="button"
        onClick={onRefresh}
        title="Show a new code"
        className="bank-btn-secondary px-2 py-1"
      >
        🔄 New code
      </button>
    </div>
  );
}
