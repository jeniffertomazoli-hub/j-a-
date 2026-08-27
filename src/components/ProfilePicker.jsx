import React from 'react';
import { getCoupleSettings } from '../lib/storage';

export default function ProfilePicker({ onEscolher }) {
  const settings = getCoupleSettings();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 text-center bg-royal animate-fadeIn">
      <div className="w-16 h-16 rounded-full bg-yellow border-3 border-ink flex items-center justify-center font-display font-extrabold text-3xl text-ink mb-3 shadow-brut animate-popIn">
        S
      </div>

      <p className="badge-brut bg-cyan text-ink mb-3">
        Quem está aqui agora?
      </p>

      <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-6">
        Escolha o seu perfil
      </h2>

      <div className="flex flex-col gap-3.5 w-full max-w-xs animate-fadeUp">
        <button
          onClick={() => onEscolher('parceiro1')}
          className="btn-brut py-4 px-6 bg-pink text-ink text-base font-extrabold flex items-center justify-center gap-3 shadow-brut hover:scale-102 transition"
        >
          <span className="text-2xl">{settings.emoji1 || '🐰'}</span>
          <span>{settings.apelido1}</span>
        </button>

        <button
          onClick={() => onEscolher('parceiro2')}
          className="btn-brut py-4 px-6 bg-purple text-ink text-base font-extrabold flex items-center justify-center gap-3 shadow-brut hover:scale-102 transition"
        >
          <span className="text-2xl">{settings.emoji2 || '🦊'}</span>
          <span>{settings.apelido2}</span>
        </button>
      </div>

      <p className="text-xs text-white/80 font-medium mt-7 max-w-xs leading-relaxed">
        Essa preferência fica salva neste aparelho para sabermos se as respostas e momentos são da Jeniffer ou do Alvaro 💜
      </p>
    </div>
  );
}
