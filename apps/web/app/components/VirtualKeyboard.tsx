'use client';

import React, { useState, useMemo } from 'react';

interface VirtualKeyboardProps {
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onClose?: () => void;
}

export function VirtualKeyboard({
  onKeyPress,
  onBackspace,
  onClear,
  onClose,
}: VirtualKeyboardProps) {
  const [isCaps, setIsCaps] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'alpha' | 'numeric' | 'special'>('alpha');

  // Scramble numbers like SBI does to prevent pattern detection
  const numbers = useMemo(() => {
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    // semi-randomized on mount
    return [...digits].sort(() => Math.random() - 0.5);
  }, []);

  const alphaRow1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const alphaRow2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
  const alphaRow3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];
  const symbols = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '=', '+', '.', '?'];

  return (
    <div className="bg-[#e4ebf3] border-2 border-[#7a9ab8] p-2 rounded-none shadow-md mt-1.5 w-full max-w-md select-none text-xs">
      <div className="bg-[#1b5b91] text-white px-2 py-1 font-bold flex items-center justify-between text-[11px] mb-2 border-b border-[#0f3b61]">
        <div className="flex items-center gap-1.5">
          <span>⌨️ SECURE VIRTUAL KEYBOARD</span>
          <span className="text-[10px] text-[#ffdd88] font-normal">(Anti-Keylogger)</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-red-200 font-bold px-1 bg-[#0b3356] border border-[#3377aa]"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => setLayoutMode('alpha')}
          className={`px-2 py-0.5 border text-[11px] font-bold ${
            layoutMode === 'alpha'
              ? 'bg-[#ffffff] text-[#003366] border-[#336699]'
              : 'bg-[#d0deeb] text-[#333] border-[#99b4d1]'
          }`}
        >
          Letters [A-Z]
        </button>
        <button
          type="button"
          onClick={() => setLayoutMode('numeric')}
          className={`px-2 py-0.5 border text-[11px] font-bold ${
            layoutMode === 'numeric'
              ? 'bg-[#ffffff] text-[#003366] border-[#336699]'
              : 'bg-[#d0deeb] text-[#333] border-[#99b4d1]'
          }`}
        >
          Numbers [0-9]
        </button>
        <button
          type="button"
          onClick={() => setLayoutMode('special')}
          className={`px-2 py-0.5 border text-[11px] font-bold ${
            layoutMode === 'special'
              ? 'bg-[#ffffff] text-[#003366] border-[#336699]'
              : 'bg-[#d0deeb] text-[#333] border-[#99b4d1]'
          }`}
        >
          Special Symbols
        </button>
      </div>

      {/* Number Row (Always available on top) */}
      <div className="flex gap-1 mb-1.5 justify-center bg-[#f7f9fb] p-1 border border-[#b8cde4]">
        {numbers.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onKeyPress(num)}
            className="w-7 h-7 bg-white hover:bg-[#ffeebb] border border-[#7f9db9] font-bold text-slate-900 active:bg-[#b0c4de]"
          >
            {num}
          </button>
        ))}
      </div>

      {/* Letters Layout */}
      {layoutMode === 'alpha' && (
        <div className="space-y-1">
          <div className="flex gap-1 justify-center">
            {alphaRow1.map((char) => {
              const display = isCaps ? char.toUpperCase() : char;
              return (
                <button
                  key={char}
                  type="button"
                  onClick={() => onKeyPress(display)}
                  className="w-7 h-7 bg-white hover:bg-[#ffeebb] border border-[#7f9db9] font-semibold text-slate-800 active:bg-[#b0c4de]"
                >
                  {display}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1 justify-center">
            {alphaRow2.map((char) => {
              const display = isCaps ? char.toUpperCase() : char;
              return (
                <button
                  key={char}
                  type="button"
                  onClick={() => onKeyPress(display)}
                  className="w-7 h-7 bg-white hover:bg-[#ffeebb] border border-[#7f9db9] font-semibold text-slate-800 active:bg-[#b0c4de]"
                >
                  {display}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1 justify-center items-center">
            <button
              type="button"
              onClick={() => setIsCaps(!isCaps)}
              className={`h-7 px-2 border font-bold text-[10px] ${
                isCaps
                  ? 'bg-[#ffe082] text-amber-900 border-amber-600'
                  : 'bg-[#d0deeb] text-slate-700 border-[#7f9db9]'
              }`}
            >
              Caps Lock
            </button>
            {alphaRow3.map((char) => {
              const display = isCaps ? char.toUpperCase() : char;
              return (
                <button
                  key={char}
                  type="button"
                  onClick={() => onKeyPress(display)}
                  className="w-7 h-7 bg-white hover:bg-[#ffeebb] border border-[#7f9db9] font-semibold text-slate-800 active:bg-[#b0c4de]"
                >
                  {display}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Numeric Pad Layout */}
      {layoutMode === 'numeric' && (
        <div className="grid grid-cols-5 gap-1.5 p-2 bg-[#f0f4f8] border border-[#b8cde4]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => onKeyPress(digit)}
              className="h-8 bg-white hover:bg-[#ffeebb] border border-[#7f9db9] font-bold text-base text-slate-900"
            >
              {digit}
            </button>
          ))}
        </div>
      )}

      {/* Special Symbols Layout */}
      {layoutMode === 'special' && (
        <div className="grid grid-cols-8 gap-1 p-2 bg-[#f0f4f8] border border-[#b8cde4]">
          {symbols.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => onKeyPress(sym)}
              className="h-7 bg-white hover:bg-[#ffeebb] border border-[#7f9db9] font-bold text-xs text-slate-900"
            >
              {sym}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="flex gap-2 mt-2 pt-1 border-t border-[#b8cde4] justify-between">
        <button
          type="button"
          onClick={onBackspace}
          className="px-3 py-1 bg-[#fff0f0] border border-[#cc8888] text-[#990000] font-bold hover:bg-[#ffdada]"
        >
          ⌫ Backspace
        </button>
        <button
          type="button"
          onClick={onClear}
          className="px-3 py-1 bg-[#fff8e6] border border-[#d4a840] text-[#805500] font-bold hover:bg-[#ffefc2]"
        >
          Clear All
        </button>
        <button
          type="button"
          onClick={() => onKeyPress(' ')}
          className="flex-1 py-1 bg-white border border-[#7f9db9] text-slate-700 font-semibold hover:bg-[#f0f4f8]"
        >
          Spacebar
        </button>
      </div>
    </div>
  );
}
