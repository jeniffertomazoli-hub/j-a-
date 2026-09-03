import React, { useState, useEffect } from 'react';
import { getCoupleSettings, saveCoupleSettings } from '../lib/storage';
import { buscarConfiguracoesCasalNuvem } from '../lib/supabase';
import Avatar from './Avatar';
import InstallPwaModal from './InstallPwaModal';

export default function ProfilePicker({ onEscolher, settings: propsSettings }) {
  const [settings, setSettings] = useState(propsSettings || getCoupleSettings());
  const [isInstallOpen, setIsInstallOpen] = useState(false);

  useEffect(() => {
    if (propsSettings) {
      setSettings(propsSettings);
    }
  }, [propsSettings]);

  useEffect(() => {
    async function carregarNuvem() {
      const nuvem = await buscarConfiguracoesCasalNuvem();
      if (nuvem && (nuvem.foto1 || nuvem.foto2 || nuvem.apelido1)) {
        saveCoupleSettings(nuvem);
        setSettings(nuvem);
      }
    }
    carregarNuvem();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 text-center bg-royal animate-fadeIn">
      {/* Logo com ícone PWA */}
      <div className="relative mb-3">
        <div className="w-16 h-16 rounded-2xl bg-yellow border-3 border-ink flex items-center justify-center font-display font-extrabold text-3xl text-ink shadow-brut animate-popIn">
          S
        </div>
        <span className="absolute -bottom-1 -right-1 text-sm">💜</span>
      </div>

      <p className="badge-brut bg-cyan text-ink mb-2">
        Quem está aqui agora?
      </p>

      <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-5">
        Escolha o seu perfil
      </h2>

      <div className="flex flex-col gap-3.5 w-full max-w-xs animate-fadeUp">
        {/* Jeniffer */}
        <button
          onClick={() => onEscolher('parceiro1')}
          className="btn-brut py-3 px-4 bg-pink text-ink text-base font-extrabold flex items-center justify-start gap-3.5 shadow-brut hover:scale-102 transition group"
        >
          <Avatar
            foto={settings?.foto1}
            emoji={settings?.emoji1 || '🐰'}
            nome={settings?.apelido1 || 'Jeniffer'}
            size="md"
            corFundo="bg-yellow"
          />
          <div className="flex-1 text-left min-w-0">
            <span className="truncate block font-black text-base leading-tight">
              {settings?.apelido1 || 'Jeniffer'}
            </span>
            <span className="text-[10px] text-ink/60 font-bold block">
              Entrar como parceira
            </span>
          </div>
          <span className="text-sm font-black opacity-40 group-hover:opacity-100 transition">→</span>
        </button>

        {/* Alvaro */}
        <button
          onClick={() => onEscolher('parceiro2')}
          className="btn-brut py-3 px-4 bg-purple text-ink text-base font-extrabold flex items-center justify-start gap-3.5 shadow-brut hover:scale-102 transition group"
        >
          <Avatar
            foto={settings?.foto2}
            emoji={settings?.emoji2 || '🦊'}
            nome={settings?.apelido2 || 'Alvaro'}
            size="md"
            corFundo="bg-pink"
          />
          <div className="flex-1 text-left min-w-0">
            <span className="truncate block font-black text-base leading-tight">
              {settings?.apelido2 || 'Alvaro'}
            </span>
            <span className="text-[10px] text-ink/60 font-bold block">
              Entrar como parceiro
            </span>
          </div>
          <span className="text-sm font-black opacity-40 group-hover:opacity-100 transition">→</span>
        </button>
      </div>

      {/* Botão de Instalar App no Celular */}
      <div className="mt-6 animate-fadeUp">
        <button
          onClick={() => setIsInstallOpen(true)}
          className="btn-brut py-2 px-3.5 bg-yellow text-ink text-xs font-black shadow-brutsm flex items-center gap-1.5 hover:scale-102 transition"
        >
          <span>📲</span>
          <span>Instalar App na Tela do Celular</span>
        </button>
      </div>

      <p className="text-[11px] text-white/70 font-medium mt-4 max-w-xs leading-relaxed">
        Essa preferência fica salva neste aparelho para sabermos quem está postando e respondendo 💜
      </p>

      {/* Modal PWA */}
      <InstallPwaModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />
    </div>
  );
}
