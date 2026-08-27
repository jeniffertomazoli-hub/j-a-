import React from 'react';
import { calculateDaysTogether } from '../lib/storage';

export default function Header({
  nomeEu,
  emojiEu,
  onTrocarPerfil,
  onOpenSettings,
  settings,
}) {
  const timeTogether = calculateDaysTogether(settings?.dataInicio);

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-5 pt-2.5 pb-2 flex items-center justify-between gap-2">
      {/* Brand & Days Counter */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-full bg-yellow border-3 border-ink flex items-center justify-center font-display font-extrabold text-ink shrink-0 text-sm shadow-brutsm">
          S
        </div>
        <div className="min-w-0">
          <span className="font-display font-extrabold text-white text-sm sm:text-base truncate block leading-tight">
            Sintonia
          </span>
          {timeTogether ? (
            <span className="text-[10px] font-bold text-yellow/90 block truncate leading-none mt-0.5">
              💜 {timeTogether.totalDays} dias juntos
            </span>
          ) : (
            <span className="text-[10px] font-bold text-white/70 block truncate leading-none mt-0.5">
              {settings.apelido1} & {settings.apelido2}
            </span>
          )}
        </div>
      </div>

      {/* Profile controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onOpenSettings}
          className="w-8 h-8 rounded-full border-3 border-ink bg-white text-ink flex items-center justify-center text-xs sm:text-sm shadow-brutsm hover:bg-yellow transition active:scale-95"
          title="Configurações do Casal"
          aria-label="Configurações"
        >
          ⚙️
        </button>

        <button
          onClick={onTrocarPerfil}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border-3 border-ink bg-white text-ink whitespace-nowrap shadow-brutsm hover:bg-yellow transition active:scale-95"
        >
          Trocar
        </button>

        <div className="flex items-center gap-1 pl-0.5">
          <span className="text-xs font-bold text-white hidden sm:inline whitespace-nowrap">
            Olá, {nomeEu}!
          </span>
          <span
            className="w-8 h-8 rounded-full bg-cyan border-3 border-ink flex items-center justify-center text-sm shrink-0 shadow-brutsm"
            title={`Você é ${nomeEu}`}
          >
            {emojiEu || '🐰'}
          </span>
        </div>
      </div>
    </div>
  );
}
