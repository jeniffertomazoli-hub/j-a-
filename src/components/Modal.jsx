import React, { useEffect } from 'react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  badgeText = 'Atenção',
  badgeColor = 'bg-yellow',
  confirmText,
  cancelText = 'Cancelar',
  onConfirm,
  confirmColor = 'bg-pink',
  isDestructive = false,
  isLoading = false,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-sm card-brut p-5 sm:p-6 bg-white animate-popIn relative"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-ink/40 hover:text-ink font-extrabold text-sm w-7 h-7 rounded-full flex items-center justify-center hover:bg-ink/5"
          aria-label="Fechar"
        >
          ✕
        </button>

        {badgeText && (
          <p className={`badge-brut ${badgeColor} text-ink mb-2`}>{badgeText}</p>
        )}

        {title && (
          <h3 className="font-display text-xl font-bold text-ink mb-3 pr-6">
            {title}
          </h3>
        )}

        <div className="text-sm text-ink/80 font-medium mb-5">
          {children}
        </div>

        {(confirmText || cancelText) && (
          <div className="flex gap-2 justify-end">
            {cancelText && (
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="btn-brut flex-1 py-2 text-xs bg-white text-ink hover:bg-ink/5 disabled:opacity-50"
              >
                {cancelText}
              </button>
            )}
            {confirmText && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`btn-brut flex-1 py-2 text-xs text-ink disabled:opacity-50 ${isDestructive ? 'bg-pink text-white' : confirmColor}`}
              >
                {isLoading ? 'Aguarde...' : confirmText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
