import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { saveCoupleSettings } from '../lib/storage';
import { useToast } from '../context/ToastContext';
import { compressImage } from '../lib/imageUtils';
import { uploadImagemMemoria } from '../lib/supabase';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendAppNotification,
} from '../lib/notifications';

const EMOJI_OPTIONS = ['🐰', '🦊', '🐻', '🐼', '🐱', '🐶', '🦁', '🐨', '🦄', '🐯', '🐧', '🦉', '🌸', '✨', '👑', '💙'];

export default function CoupleSettingsModal({ isOpen, onClose, settings, onSettingsUpdated }) {
  const toast = useToast();
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());
  const [salvandoFoto, setSalvandoFoto] = useState(false);

  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);

  const [formData, setFormData] = useState({
    apelido1: settings?.apelido1 || 'Jeniffer',
    emoji1: settings?.emoji1 || '🐰',
    foto1: settings?.foto1 || '',
    apelido2: settings?.apelido2 || 'Alvaro',
    emoji2: settings?.emoji2 || '🦊',
    foto2: settings?.foto2 || '',
    dataInicio: settings?.dataInicio || '',
    pinCode: settings?.pinCode || '1234',
  });

  useEffect(() => {
    if (isOpen) {
      setNotifPermission(getNotificationPermission());
      setFormData({
        apelido1: settings?.apelido1 || 'Jeniffer',
        emoji1: settings?.emoji1 || '🐰',
        foto1: settings?.foto1 || '',
        apelido2: settings?.apelido2 || 'Alvaro',
        emoji2: settings?.emoji2 || '🦊',
        foto2: settings?.foto2 || '',
        dataInicio: settings?.dataInicio || '',
        pinCode: settings?.pinCode || '1234',
      });
    }
  }, [isOpen, settings]);

  function handleChange(field, val) {
    setFormData((prev) => ({ ...prev, [field]: val }));
  }

  async function handleUploadFotoPerfil(parceiro, e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSalvandoFoto(true);
    try {
      toast.show('Comprimindo foto de perfil...');
      const compressed = await compressImage(file, 800, 0.85);

      toast.show('Enviando foto...');
      const fotoUrl = await uploadImagemMemoria(compressed);

      if (parceiro === 'p1') {
        setFormData((prev) => ({ ...prev, foto1: fotoUrl }));
      } else {
        setFormData((prev) => ({ ...prev, foto2: fotoUrl }));
      }

      toast.love('Foto de perfil carregada! Lembre-se de salvar as mudanças 📸');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar foto. Tente novamente!');
    } finally {
      setSalvandoFoto(false);
      e.target.value = '';
    }
  }

  async function handleToggleNotifications() {
    if (!isNotificationSupported()) {
      toast.error('Seu navegador não suporta notificações.');
      return;
    }

    if (notifPermission === 'granted') {
      sendAppNotification('🔔 Teste do Sintonia 💜', {
        body: 'Notificações estão ativas e funcionando perfeitamente no seu aparelho!',
      });
      toast.love('Notificação de teste enviada! 🔔');
    } else {
      const res = await requestNotificationPermission();
      setNotifPermission(res);

      if (res === 'granted') {
        sendAppNotification('💜 Sintonia Conectada!', {
          body: 'Notificações ativadas! Você receberá avisos quando houver novidades.',
        });
        toast.love('Notificações ativadas com sucesso! 💜');
      } else if (res === 'denied') {
        toast.error('Permissão negada. Ative as notificações nas configurações do navegador.');
      }
    }
  }

  function handleSave(e) {
    e.preventDefault();
    if (!formData.apelido1.trim() || !formData.apelido2.trim()) {
      toast.error('Preencha os apelidos de ambos!');
      return;
    }
    if (formData.pinCode.length < 4) {
      toast.error('O PIN de segurança deve ter pelo menos 4 dígitos.');
      return;
    }

    const updated = saveCoupleSettings(formData);
    onSettingsUpdated(updated);
    toast.love('Configurações do casal salvas com sucesso! 💜');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações do Casal ⚙️"
      badgeText="Personalizar"
      badgeColor="bg-purple"
    >
      <form onSubmit={handleSave} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Parceira 1 (Jeniffer) */}
        <div className="rounded-xl border-2 border-ink p-3 bg-yellow/10">
          <label className="block text-xs font-black uppercase text-ink mb-2">
            Perfil de {formData.apelido1 || 'Jeniffer'}
          </label>

          <div className="flex items-center gap-3 mb-2.5">
            {/* Foto ou Emoji da Jeniffer */}
            <div className="relative">
              {formData.foto1 ? (
                <img
                  src={formData.foto1}
                  alt="Foto Jeniffer"
                  className="w-12 h-12 rounded-full border-2 border-ink object-cover shadow-brutsm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-yellow border-2 border-ink flex items-center justify-center text-2xl shadow-brutsm">
                  {formData.emoji1}
                </div>
              )}
            </div>

            <div className="flex-1 flex gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef1.current?.click()}
                disabled={salvandoFoto}
                className="btn-brut flex-1 py-1.5 px-2 bg-white text-ink text-[10px] font-black shadow-brutsm flex items-center justify-center gap-1"
              >
                <span>📷</span>
                <span>{formData.foto1 ? 'Trocar Foto' : 'Adicionar Foto'}</span>
              </button>
              {formData.foto1 && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, foto1: '' }))}
                  className="btn-brut py-1.5 px-2 bg-pink text-white text-[10px] font-black"
                  title="Remover foto"
                >
                  ✕
                </button>
              )}
              <input
                ref={fileInputRef1}
                type="file"
                accept="image/*"
                onChange={(e) => handleUploadFotoPerfil('p1', e)}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={formData.emoji1}
              onChange={(e) => handleChange('emoji1', e.target.value)}
              className="rounded-lg border-2 border-ink px-2 py-1.5 text-lg bg-white outline-none"
            >
              {EMOJI_OPTIONS.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={formData.apelido1}
              onChange={(e) => handleChange('apelido1', e.target.value)}
              placeholder="Nome / Apelido"
              className="flex-1 rounded-lg border-2 border-ink px-3 py-1.5 text-sm font-bold bg-white outline-none"
            />
          </div>
        </div>

        {/* Parceiro 2 (Alvaro) */}
        <div className="rounded-xl border-2 border-ink p-3 bg-pink/10">
          <label className="block text-xs font-black uppercase text-ink mb-2">
            Perfil de {formData.apelido2 || 'Alvaro'}
          </label>

          <div className="flex items-center gap-3 mb-2.5">
            {/* Foto ou Emoji do Alvaro */}
            <div className="relative">
              {formData.foto2 ? (
                <img
                  src={formData.foto2}
                  alt="Foto Alvaro"
                  className="w-12 h-12 rounded-full border-2 border-ink object-cover shadow-brutsm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-pink border-2 border-ink flex items-center justify-center text-2xl shadow-brutsm">
                  {formData.emoji2}
                </div>
              )}
            </div>

            <div className="flex-1 flex gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef2.current?.click()}
                disabled={salvandoFoto}
                className="btn-brut flex-1 py-1.5 px-2 bg-white text-ink text-[10px] font-black shadow-brutsm flex items-center justify-center gap-1"
              >
                <span>📷</span>
                <span>{formData.foto2 ? 'Trocar Foto' : 'Adicionar Foto'}</span>
              </button>
              {formData.foto2 && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, foto2: '' }))}
                  className="btn-brut py-1.5 px-2 bg-pink text-white text-[10px] font-black"
                  title="Remover foto"
                >
                  ✕
                </button>
              )}
              <input
                ref={fileInputRef2}
                type="file"
                accept="image/*"
                onChange={(e) => handleUploadFotoPerfil('p2', e)}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={formData.emoji2}
              onChange={(e) => handleChange('emoji2', e.target.value)}
              className="rounded-lg border-2 border-ink px-2 py-1.5 text-lg bg-white outline-none"
            >
              {EMOJI_OPTIONS.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={formData.apelido2}
              onChange={(e) => handleChange('apelido2', e.target.value)}
              placeholder="Nome / Apelido"
              className="flex-1 rounded-lg border-2 border-ink px-3 py-1.5 text-sm font-bold bg-white outline-none"
            />
          </div>
        </div>

        {/* Início do Relacionamento */}
        <div>
          <label className="block text-xs font-extrabold text-ink/70 mb-1">
            Data de início do namoro:
          </label>
          <input
            type="date"
            value={formData.dataInicio}
            onChange={(e) => handleChange('dataInicio', e.target.value)}
            className="w-full rounded-xl border-3 border-ink px-3 py-2 text-sm font-bold bg-white outline-none"
          />
        </div>

        {/* Notificações no Celular */}
        <div className="rounded-xl border-2 border-ink p-3 bg-cyan/15 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black text-ink">Notificações no Celular 🔔</p>
            <p className="text-[10px] text-ink/60 font-bold">
              {notifPermission === 'granted' ? 'Ativadas e conectadas ✅' : 'Receba avisos de fotos e cartas'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleNotifications}
            className="btn-brut px-3 py-1.5 bg-yellow text-ink text-xs font-black shrink-0 shadow-brutsm"
          >
            {notifPermission === 'granted' ? 'Testar 🔔' : 'Ativar 🔔'}
          </button>
        </div>

        {/* PIN de Acesso */}
        <div>
          <label className="block text-xs font-extrabold text-ink/70 mb-1">
            PIN de Acesso (4 dígitos):
          </label>
          <input
            type="password"
            maxLength={6}
            inputMode="numeric"
            value={formData.pinCode}
            onChange={(e) => handleChange('pinCode', e.target.value)}
            placeholder="Ex: 1234"
            className="w-full rounded-xl border-3 border-ink px-3 py-2 text-sm font-bold bg-white outline-none tracking-widest text-center"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-brut flex-1 py-2.5 bg-white text-ink text-xs"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvandoFoto}
            className="btn-brut flex-1 py-2.5 bg-yellow text-ink text-xs font-black shadow-brut disabled:opacity-50"
          >
            {salvandoFoto ? 'Enviando foto...' : 'Salvar Mudanças 💜'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
