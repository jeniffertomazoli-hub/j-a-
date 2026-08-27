import React, { useState } from 'react';
import { setAuthenticated, getCoupleSettings } from '../lib/storage';

export default function PinLock({ onEntrar }) {
  const [pin, setPin] = useState('');
  const [hasError, setHasError] = useState(false);
  const settings = getCoupleSettings();
  const validPin = settings.pinCode || '1234';

  function handleSubmit(e) {
    e?.preventDefault();
    if (pin === validPin) {
      setAuthenticated(true);
      onEntrar();
    } else {
      setHasError(true);
      setPin('');
    }
  }

  function handleKeyPress(digit) {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setHasError(false);
      if (nextPin.length === 4) {
        if (nextPin === validPin) {
          setAuthenticated(true);
          onEntrar();
        } else {
          setHasError(true);
          setTimeout(() => setPin(''), 400);
        }
      }
    }
  }

  function handleDelete() {
    setPin((prev) => prev.slice(0, -1));
    setHasError(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-royal">
      <div className="w-16 h-16 rounded-full bg-yellow border-3 border-ink flex items-center justify-center font-display font-extrabold text-3xl text-ink mb-3 shadow-brut animate-popIn">
        S
      </div>

      <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-2 animate-fadeUp">
        Sintonia
      </h1>
      <p className="text-xs text-white/80 font-medium mb-6 animate-fadeUp">
        Espaço exclusivo do casal 💜
      </p>

      <div className="w-full max-w-xs card-brut p-6 animate-fadeUp">
        <p className="badge-brut bg-pink text-ink mb-4">Acesso do Casal</p>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-3 mb-5">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full border-2 border-ink transition-all ${
                index < pin.length
                  ? 'bg-yellow scale-110'
                  : 'bg-white/80'
              } ${hasError ? 'bg-pink animate-bounce' : ''}`}
            />
          ))}
        </div>

        {hasError && (
          <p className="text-xs text-pink font-extrabold mb-3">
            Código incorreto — tente de novo!
          </p>
        )}

        {/* Numeric Keypad for fast mobile experience */}
        <div className="grid grid-cols-3 gap-2.5 my-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(String(num))}
              className="py-3 rounded-2xl border-3 border-ink bg-white font-display font-extrabold text-lg text-ink hover:bg-yellow active:scale-95 transition shadow-brutsm"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            className="py-3 rounded-2xl border-3 border-ink bg-white text-xs font-bold text-ink/70 hover:bg-ink/5 active:scale-95 transition"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-3 rounded-2xl border-3 border-ink bg-white font-display font-extrabold text-lg text-ink hover:bg-yellow active:scale-95 transition shadow-brutsm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="py-3 rounded-2xl border-3 border-ink bg-white font-bold text-base text-ink hover:bg-pink/20 active:scale-95 transition"
            aria-label="Apagar"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
