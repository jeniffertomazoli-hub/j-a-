import React, { useState, useEffect } from 'react';
import {
  criarCartaAbraQuando,
  buscarCartas,
  abrirCarta,
  excluirCarta,
  subscribeToTable,
} from '../../lib/supabase';
import { compressImage } from '../../lib/imageUtils';
import { useToast } from '../../context/ToastContext';
import Modal from '../Modal';
import CartaAbertaModal from '../CartaAbertaModal';
import Avatar from '../Avatar';

function formatDataCurta(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const TITULOS_SUGERIDOS = [
  'Abra quando sentir saudade demais...',
  'Abra quando tiver um dia difícil...',
  'Abra quando não conseguir dormir de madrugada...',
  'Abra quando precisar de um abraço...',
  'Abra no nosso próximo aniversário...',
  'Abra quando estiver triste sem motivo...',
  'Abra quando precisar se lembrar que é amado(a)...',
  'Abra quando ganhar uma conquista nova...',
  'Abra quando bater aquela saudade das nossas risadas...',
  'Abra quando quiser se sentir especial...',
];

export default function CartasTab({ quemSouEu, settings }) {
  const toast = useToast();
  const ehP1 = quemSouEu === 'parceiro1';
  const meuNome = ehP1 ? settings.apelido1 : settings.apelido2;
  const meuEmoji = ehP1 ? settings.emoji1 : settings.emoji2;
  const meuFoto = ehP1 ? settings.foto1 : settings.foto2;

  const [loading, setLoading] = useState(true);
  const [cartas, setCartas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [statusUpload, setStatusUpload] = useState('');

  // Form state
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [arquivoFoto, setArquivoFoto] = useState(null);
  const [previewFoto, setPreviewFoto] = useState(null);
  const [showSugestoes, setShowSugestoes] = useState(false);

  // Modais
  const [cartaParaAbrir, setCartaParaAbrir] = useState(null);
  const [cartaRevelada, setCartaRevelada] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [confirmarAberturaModal, setConfirmarAberturaModal] = useState({ isOpen: false, carta: null });

  useEffect(() => {
    carregar();
    const unsub = subscribeToTable('cartas_abra_quando', () => carregar());
    return () => unsub();
  }, []);

  async function carregar() {
    try {
      const data = await buscarCartas();
      setCartas(data);
    } catch (err) {
      console.error('Erro ao carregar cartas:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoFoto(file);
      setPreviewFoto(URL.createObjectURL(file));
    }
  }

  async function handleSalvarCarta() {
    if (!titulo.trim() || !mensagem.trim()) {
      toast.error('Preencha o título e a mensagem da carta!');
      return;
    }

    setSalvando(true);
    try {
      let fotoUrl = null;

      if (arquivoFoto) {
        setStatusUpload('Comprimindo foto...');
        const compressed = await compressImage(arquivoFoto);
        setStatusUpload('Enviando foto...');
        const { uploadImagemMemoria } = await import('../../lib/supabase');
        fotoUrl = await uploadImagemMemoria(compressed);
      }

      setStatusUpload('Selando a carta com amor...');
      await criarCartaAbraQuando({
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        escrita_por: quemSouEu,
        foto_url: fotoUrl,
      });

      setTitulo('');
      setMensagem('');
      setArquivoFoto(null);
      setPreviewFoto(null);
      setShowForm(false);

      toast.love('Carta lacrada com muito amor! 💌 O outro lado pode abrir quando quiser.');
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Não consegui salvar a carta agora. Tente de novo!');
    } finally {
      setSalvando(false);
      setStatusUpload('');
    }
  }

  async function handleAbrirCarta() {
    const carta = confirmarAberturaModal.carta;
    if (!carta) return;

    try {
      const cartaAtualizada = await abrirCarta(carta.id, quemSouEu);
      setConfirmarAberturaModal({ isOpen: false, carta: null });
      setCartaRevelada(cartaAtualizada);
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao abrir a carta.');
    }
  }

  async function handleConfirmDelete() {
    try {
      await excluirCarta(deleteModal.id);
      toast.success('Carta removida.');
      setDeleteModal({ isOpen: false, id: null });
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir carta.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const cartasFechadas = cartas.filter((c) => !c.aberta);
  const cartasAbertas = cartas.filter((c) => c.aberta);

  return (
    <div className="px-3 sm:px-6 pt-4 max-w-md mx-auto pb-14 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="badge-brut bg-pink text-ink text-[10px]">
          Cartas Secretas 💌
        </p>
        <span className="text-[11px] font-extrabold text-white/80">
          {settings.apelido1} & {settings.apelido2}
        </span>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-1 leading-tight">
        Abra Quando...
      </h1>
      <p className="text-xs text-white/80 font-medium mb-4 leading-relaxed">
        Escreva cartas secretas para {settings.apelido1 === meuNome ? settings.apelido2 : settings.apelido1} abrir nos momentos certos 💜
      </p>

      {/* Botão de Nova Carta */}
      <button
        onClick={() => setShowForm((prev) => !prev)}
        className="btn-brut w-full py-3 bg-white text-ink text-xs font-black mb-5 shadow-brut flex items-center justify-center gap-2"
      >
        {showForm ? '✕ Fechar' : '💌 Escrever Nova Carta Secreta'}
      </button>

      {/* Formulário */}
      {showForm && (
        <div className="card-brut p-4 mb-6 space-y-3 shadow-brut animate-popIn">
          <div className="flex items-center gap-2">
            <Avatar
              foto={meuFoto}
              emoji={meuEmoji}
              nome={meuNome}
              size="sm"
              corFundo={ehP1 ? 'bg-yellow' : 'bg-pink'}
            />
            <p className="badge-brut bg-yellow text-ink text-[10px]">
              Escrita por {meuNome}
            </p>
          </div>

          {/* Campo de Título com Sugestões */}
          <div className="relative">
            <div className="flex gap-2">
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Abra quando..."
                className="flex-1 rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs font-bold placeholder:text-ink/40 shadow-brutsm"
              />
              <button
                type="button"
                onClick={() => setShowSugestoes((v) => !v)}
                className="btn-brut px-3 py-2 bg-yellow text-ink text-[10px] font-black shrink-0"
                title="Sugestões de título"
              >
                💡
              </button>
            </div>

            {showSugestoes && (
              <div className="mt-2 rounded-xl border-3 border-ink bg-white shadow-brut overflow-hidden animate-popIn">
                {TITULOS_SUGERIDOS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setTitulo(sug);
                      setShowSugestoes(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-[11px] font-bold text-ink hover:bg-yellow/30 border-b border-ink/10 last:border-0 transition"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mensagem */}
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder={`Escreva com o coração aberto. ${settings.apelido1 === meuNome ? settings.apelido2 : settings.apelido1} vai ler num momento especial...`}
            rows={5}
            className="w-full rounded-xl border-3 border-ink px-3 py-2 outline-none bg-white text-xs font-medium resize-none placeholder:text-ink/40 shadow-brutsm"
          />

          {/* Upload de Foto */}
          <div>
            <label className="block text-[10px] font-black uppercase text-ink/70 mb-1.5">
              Anexar uma foto especial (opcional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-2 file:border-ink file:bg-yellow file:text-ink file:font-black file:text-[10px]"
            />
            {previewFoto && (
              <img
                src={previewFoto}
                alt="Prévia"
                className="mt-2.5 w-full max-h-40 object-cover rounded-xl border-3 border-ink shadow-brutsm"
              />
            )}
          </div>

          <button
            onClick={handleSalvarCarta}
            disabled={salvando}
            className="btn-brut w-full py-3 bg-pink text-ink text-xs font-black disabled:opacity-50 shadow-brut"
          >
            {salvando ? statusUpload || 'Lacrando com amor...' : '💌 Lacrar e Enviar a Carta'}
          </button>
        </div>
      )}

      {/* Cartas Fechadas */}
      {cartasFechadas.length > 0 && (
        <div className="mb-6">
          <h2 className="font-display font-extrabold text-white text-base mb-3 flex items-center gap-2">
            🔒 Esperando para serem abertas ({cartasFechadas.length})
          </h2>

          <div className="space-y-3">
            {cartasFechadas.map((carta) => {
              const escritaPorMim = carta.escrita_por === quemSouEu;
              const ehEscritorP1 = carta.escrita_por === 'parceiro1';
              const nomeEscritor = ehEscritorP1 ? settings.apelido1 : settings.apelido2;
              const emojiEscritor = ehEscritorP1 ? settings.emoji1 : settings.emoji2;
              const fotoEscritor = ehEscritorP1 ? settings.foto1 : settings.foto2;

              return (
                <div
                  key={carta.id}
                  className={`card-brut p-4 shadow-brut relative overflow-hidden transition ${
                    escritaPorMim ? 'bg-white/90' : 'bg-yellow/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Avatar
                          foto={fotoEscritor}
                          emoji={emojiEscritor}
                          nome={nomeEscritor}
                          size="xs"
                          corFundo={ehEscritorP1 ? 'bg-yellow' : 'bg-pink'}
                        />
                        <span className={`badge-brut text-[9px] ${escritaPorMim ? 'bg-purple text-ink' : 'bg-pink text-ink'}`}>
                          {escritaPorMim ? 'Você escreveu' : `De ${nomeEscritor}`}
                        </span>
                      </div>

                      <p className="font-display font-bold text-ink text-sm leading-snug pr-4">
                        {escritaPorMim ? (
                          <span className="italic opacity-70">🔒 {carta.titulo}</span>
                        ) : (
                          <>🔒 {carta.titulo}</>
                        )}
                      </p>

                      <p className="text-[10px] text-ink/50 font-bold mt-1">
                        Criada em {formatDataCurta(carta.criado_em)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      {!escritaPorMim && (
                        <button
                          onClick={() => setConfirmarAberturaModal({ isOpen: true, carta })}
                          className="btn-brut px-3 py-2 bg-yellow text-ink text-[10px] font-black shadow-brutsm"
                        >
                          Abrir 💌
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, id: carta.id })}
                        className="text-ink/30 hover:text-pink text-xs p-1 text-center"
                        title="Excluir carta"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cartas Abertas */}
      {cartasAbertas.length > 0 && (
        <div>
          <h2 className="font-display font-extrabold text-white text-base mb-3 flex items-center gap-2">
            💜 Histórico de Cartas Abertas ({cartasAbertas.length})
          </h2>

          <div className="space-y-3">
            {cartasAbertas.map((carta) => {
              const ehEscritorP1 = carta.escrita_por === 'parceiro1';
              const nomeEscritor = ehEscritorP1 ? settings.apelido1 : settings.apelido2;
              const emojiEscritor = ehEscritorP1 ? settings.emoji1 : settings.emoji2;
              const fotoEscritor = ehEscritorP1 ? settings.foto1 : settings.foto2;

              const ehLeitorP1 = carta.aberta_por === 'parceiro1';
              const nomeLeitor = ehLeitorP1 ? settings.apelido1 : settings.apelido2;

              return (
                <div
                  key={carta.id}
                  className="card-brut p-4 shadow-brutsm bg-white/80 opacity-80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Avatar
                          foto={fotoEscritor}
                          emoji={emojiEscritor}
                          nome={nomeEscritor}
                          size="xs"
                          corFundo={ehEscritorP1 ? 'bg-yellow' : 'bg-pink'}
                        />
                        <span className="badge-brut bg-cyan text-ink text-[9px]">
                          ✉️ Aberta!
                        </span>
                      </div>
                      <p className="font-display font-bold text-ink text-sm leading-snug">
                        {carta.titulo}
                      </p>
                      <p className="text-[10px] text-ink/50 font-bold mt-1">
                        Escrita por {nomeEscritor} · Aberta por {nomeLeitor} em{' '}
                        {formatDataCurta(carta.aberta_em)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => setCartaRevelada(carta)}
                        className="btn-brut px-2.5 py-1.5 bg-white text-ink text-[10px] font-black shadow-brutsm"
                      >
                        Reler 💌
                      </button>
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, id: carta.id })}
                        className="text-ink/30 hover:text-pink text-xs p-1 text-center"
                        title="Excluir carta"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {cartas.length === 0 && !showForm && (
        <div className="card-brut p-8 text-center shadow-brut">
          <p className="text-4xl mb-3">💌</p>
          <p className="text-sm font-bold text-ink/70 leading-relaxed">
            Nenhuma carta escrita ainda. Escreva a primeira carta secreta para{' '}
            {settings.apelido1 === meuNome ? settings.apelido2 : settings.apelido1} abrir no momento certo!
          </p>
        </div>
      )}

      {/* Modal de Confirmação de Abertura */}
      <Modal
        isOpen={confirmarAberturaModal.isOpen}
        onClose={() => setConfirmarAberturaModal({ isOpen: false, carta: null })}
        title="Abrir esta carta?"
        badgeText="Abra Quando..."
        badgeColor="bg-yellow"
        confirmText="Sim, Abrir com Carinho 💌"
        onConfirm={handleAbrirCarta}
        confirmColor="bg-yellow"
      >
        <p>
          Uma vez aberta, a carta não pode ser fechada novamente. Tem certeza que o momento chegou?
        </p>
      </Modal>

      {/* Modal de Revelação da Carta */}
      <CartaAbertaModal
        carta={cartaRevelada}
        settings={settings}
        nomeQuemAbriu={cartaRevelada?.aberta_por === 'parceiro1' ? settings.apelido1 : settings.apelido2}
        onClose={() => setCartaRevelada(null)}
      />

      {/* Modal de Exclusão */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        title="Excluir Carta"
        badgeText="Atenção"
        badgeColor="bg-pink"
        confirmText="Sim, Excluir"
        onConfirm={handleConfirmDelete}
        isDestructive={true}
      >
        <p>Deseja excluir esta carta permanentemente?</p>
      </Modal>
    </div>
  );
}
