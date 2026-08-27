import React, { useState } from 'react';
import Modal from './Modal';
import { saveCoupleSettings } from '../lib/storage';
import { useToast } from '../context/ToastContext';

const EMOJI_OPTIONS = ['🐰', '🦊', '🐻', '🐼', '🐱', '🐶', '🦁', '🐨', '🦄', '🐯', '🐧', '🦉'];

export default function CoupleSettingsModal({ isOpen, onClose, settings, onSettingsUpdated }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    apelido1: settings?.apelido1 || 'Parceiro 1',
    emoji1: settings?.emoji1 || '🐰',
    apelido2: settings?.apelido2 || 'Parceiro 2',
    emoji2: settings?.emoji2 || '🦊',
    dataInicio: settings?.dataInicio || '',
    pinCode: settings?.pinCode || '1234',
  });

  function handleChange(field, val) {
    setFormData((prev) => ({ ...prev, [field]: val }));
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
      <form onSubmit={handleSave} className="space-y-4">
        {/* Parceiro 1 */}
        <div className="rounded-xl border-2 border-ink p-3 bg-yellow/10">
          <label className="block text-xs font-black uppercase text-ink mb-1.5">
            Parceiro(a) 1
          </label>
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

        {/* Parceiro 2 */}
        <div className="rounded-xl border-2 border-ink p-3 bg-pink/10">
          <label className="block text-xs font-black uppercase text-ink mb-1.5">
            Parceiro(a) 2
          </label>
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
            Data de início do relacionamento:
          </label>
          <input
            type="date"
            value={formData.dataInicio}
            onChange={(e) => handleChange('dataInicio', e.target.value)}
            className="w-full rounded-xl border-3 border-ink px-3 py-2 text-sm font-bold bg-white outline-none"
          />
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
            className="btn-brut flex-1 py-2.5 bg-yellow text-ink text-xs shadow-brut"
          >
            Salvar Mudanças
          </button>
        </div>
      </form>
    </Modal>
  );
}
