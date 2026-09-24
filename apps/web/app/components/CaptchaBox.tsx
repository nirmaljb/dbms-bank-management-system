'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface CaptchaBoxProps {
  onCaptchaGenerated?: (code: string) => void;
  currentCode?: string;
  onRefresh?: () => void;
}

export function CaptchaBox({ onCaptchaGenerated }: CaptchaBoxProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [, setCaptchaCode] = useState('');

  const generateRandomCode = (): string => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const drawCaptcha = useCallback((code: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background patterned noise
    ctx.fillStyle = '#f2f6fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid noise lines
    ctx.strokeStyle = '#d0deeb';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Strike-through interference lines
    const colors = ['#003366', '#a30000', '#006600', '#552200', '#333333'] as const;
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = colors[Math.floor(Math.random() * colors.length)] || '#003366';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Draw characters with random rotation and offsets
    const fonts = ['bold 20px Arial', 'bold 22px Georgia', 'bold 20px Verdana', 'bold 21px Tahoma'] as const;
    for (let i = 0; i < code.length; i++) {
      const char = code.charAt(i);
      ctx.font = fonts[i % fonts.length] || 'bold 20px Arial';
      ctx.fillStyle = colors[i % colors.length] || '#003366';

      const x = 16 + i * 20;
      const y = 26 + (Math.random() * 6 - 3);
      const angle = (Math.random() * 20 - 10) * (Math.PI / 180);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }, []);

  const refreshCaptcha = useCallback(() => {
    const newCode = generateRandomCode();
    setCaptchaCode(newCode);
    if (onCaptchaGenerated) {
      onCaptchaGenerated(newCode);
    }
    drawCaptcha(newCode);
  }, [drawCaptcha, onCaptchaGenerated]);

  useEffect(() => {
    refreshCaptcha();
  }, [refreshCaptcha]);

  return (
    <div className="flex items-center gap-2">
      <div className="border-2 border-[#7f9db9] bg-[#f2f6fa] p-0.5 shadow-inner inline-block">
        <canvas
          ref={canvasRef}
          width={145}
          height={38}
          className="block cursor-pointer select-none"
          onClick={refreshCaptcha}
          title="Click to reload captcha"
        />
      </div>
      <button
        type="button"
        onClick={refreshCaptcha}
        title="Reload Captcha Image"
        className="px-2 py-1 text-xs font-bold bg-[#eef2f5] hover:bg-[#dbe8f5] border border-[#7f9db9] text-[#003366] flex items-center gap-1 active:bg-[#c8daf0]"
      >
        <span className="text-sm">🔄</span>
        <span>Reload</span>
      </button>
      <span className="text-[10px] text-slate-500 italic">(Case sensitive)</span>
    </div>
  );
}
