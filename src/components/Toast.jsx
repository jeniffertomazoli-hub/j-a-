import React from 'react';

const TOAST_STYLES = {
  info: 'bg-cyan text-ink border-ink',
  success: 'bg-yellow text-ink border-ink',
  error: 'bg-pink text-ink border-ink',
  love: 'bg-purple text-ink border-ink',
};

const TOAST_ICONS = {
  info: 'ℹ️',
  success: '✅',
  error: '⚠️',
  love: '💜',
};

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-4 left-4 sm:left-auto sm:right-6 sm:w-80 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border-3 shadow-brut animate-popIn ${TOAST_STYLES[toast.type] || TOAST_STYLES.info}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base shrink-0">{TOAST_ICONS[toast.type] || '✨'}</span>
            <p className="text-xs font-extrabold leading-tight break-words">{toast.message}</p>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-xs font-black text-ink/50 hover:text-ink shrink-0 px-1"
            aria-label="Fechar notificação"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
