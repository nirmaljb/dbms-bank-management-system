'use client';

import React from 'react';

interface RetroDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  confirmText?: string;
  onConfirm?: () => void;
  isConfirm?: boolean;
}

export function RetroDialog({
  isOpen,
  title = 'State Bank Internet Banking Notice',
  message,
  onClose,
  confirmText = 'OK',
  onConfirm,
  isConfirm = false,
}: RetroDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 select-none">
      <div className="w-full max-w-md bg-[#ffffff] border-2 border-[#004c8f] shadow-2xl rounded-none animate-in fade-in zoom-in-95 duration-100">
        {/* Title bar */}
        <div className="bg-gradient-to-r from-[#004c8f] via-[#003366] to-[#002244] text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold border-b border-[#001729]">
          <div className="flex items-center gap-1.5">
            <span>ℹ️</span>
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center bg-[#8b0000] hover:bg-[#aa0000] text-white border border-[#ffffff]/40 text-xs font-bold leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Dialog body */}
        <div className="p-4 bg-[#fbfcfe] text-slate-800 text-[11.5px] leading-relaxed border-b border-[#ccd9e8]">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0 mt-0.5">🏛️</span>
            <div className="whitespace-pre-line">{message}</div>
          </div>
        </div>

        {/* Action bar */}
        <div className="bg-[#eef3f8] px-3 py-2 flex items-center justify-end gap-2">
          {isConfirm && (
            <button
              type="button"
              onClick={onClose}
              className="bank-btn-secondary px-4 py-1 text-xs"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
            className="bank-btn px-6 py-1 text-xs font-bold bg-[#004c8f] text-white"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
