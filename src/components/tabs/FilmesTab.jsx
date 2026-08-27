import React, { useState, useEffect } from 'react';
import {
  buscarFilmesSeries,
  adicionarFilmeSerie,
  alternarAssistidoFilmeSerie,
  excluirFilmeSerie,
  subscribeToTable,
} from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import Modal from '../Modal';
import RouletteModal from '../RouletteModal';

export default function FilmesTab({ quemSouEu, settings }) {
  const toast = useToast();
  const meuNome = quemSouEu === 'parceiro1' ? settings.apelido1 : settings.apelido2;

  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('filme');
  const [filtro, setFiltro] = useState('pendentes'); // 'pendentes' | 'assistidos'
  const [adicionando, setAdicionando] = useState(false);

  // Modais
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  useEffect(() => {
    carregar();
    const unsub = subscribeToTable('filmes_series', () => carregar());
    return () => unsub();
  }, []);

  async function carregar() {
    try {
      const data = await buscarFilmesSeries();
      setLista(data);
    } catch (err) {
      console.error('Erro ao carregar filmes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdicionar() {
    if (!titulo.trim()) return;
    setAdicionando(true);
    try {
      await adicionarFilmeSerie({
        titulo: titulo.trim(),
        tipo,
        sugerido_por: meuNome,
        assistido: false,
      });
      setTitulo('');
      toast.success(`${tipo === 'filme' ? 'Filme' : 'Série'} adicionado à lista com sucesso! 🎬`);
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar sugestão.');
    } finally {
      setAdicionando(false);
    }
  }

  async function handleToggleAssistido(item) {
    try {
      await alternarAssistidoFilmeSerie(item.id, !item.assistido);
      if (!item.assistido) {
        toast.love(`Marcado como assistido! 🍿`);
      }
      carregar();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteModal.id) return;
    try {
      await excluirFilmeSerie(deleteModal.id);
      toast.success('Sugestão removida!');
      setDeleteModal({ isOpen: false, id: null });
      carregar();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover sugestão.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const itensFiltrados = lista.filter((item) =>
    filtro === 'pendentes' ? !item.assistido : item.assistido
  );
  const pendentesParaSortear = lista.filter((item) => !item.assistido);

  return (
    <div className="px-4 sm:px-6 pt-5 max-w-md mx-auto pb-12 animate-fadeIn">
      <div className="flex items-center justify-between mb-2">
        <p className="badge-brut bg-yellow text-ink">Sessão Pipoca 🍿</p>
        <button
          onClick={() => setIsRouletteOpen(true)}
          className="btn-brut px-3 py-1 bg-yellow text-ink text-xs shadow-brutsm flex items-center gap-1"
        >
          🎲 Sortear Filme
        </button>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-5">
        Filmes & Séries
      </h1>

      {/* Formulário de Adicionar */}
      <div className="card-brut p-4 mb-5 shadow-brut">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdicionar()}
          placeholder="Nome do filme, série ou anime..."
          className="w-full rounded-xl border-3 border-ink px-3.5 py-2.5 outline-none bg-white text-xs font-bold mb-3 shadow-brutsm placeholder:text-ink/40"
        />

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setTipo('filme')}
            className={`flex-1 py-2 rounded-full text-xs font-black border-3 border-ink transition shadow-brutsm ${
              tipo === 'filme' ? 'bg-yellow text-ink' : 'bg-white text-ink'
            }`}
          >
            🎬 Filme
          </button>
          <button
            type="button"
            onClick={() => setTipo('serie')}
            className={`flex-1 py-2 rounded-full text-xs font-black border-3 border-ink transition shadow-brutsm ${
              tipo === 'serie' ? 'bg-yellow text-ink' : 'bg-white text-ink'
            }`}
          >
            📺 Série
          </button>
        </div>

        <button
          onClick={handleAdicionar}
          disabled={adicionando}
          className="btn-brut w-full py-2.5 bg-pink text-ink text-xs font-extrabold disabled:opacity-50 shadow-brut"
        >
          {adicionando ? 'Adicionando...' : '+ Sugerir para Assistirmos'}
        </button>
      </div>

      {/* Filtro: Para Assistir vs Já Assistidos */}
      <div className="flex gap-2 mb-4 justify-center">
        <button
          onClick={() => setFiltro('pendentes')}
          className={`px-4 py-1.5 rounded-full text-xs font-black border-3 border-ink transition shadow-brutsm ${
            filtro === 'pendentes' ? 'bg-ink text-white' : 'bg-white text-ink'
          }`}
        >
          Para assistir ({lista.filter((i) => !i.assistido).length})
        </button>
        <button
          onClick={() => setFiltro('assistidos')}
          className={`px-4 py-1.5 rounded-full text-xs font-black border-3 border-ink transition shadow-brutsm ${
            filtro === 'assistidos' ? 'bg-ink text-white' : 'bg-white text-ink'
          }`}
        >
          Já assistidos ({lista.filter((i) => i.assistido).length})
        </button>
      </div>

      {/* Lista de Filmes/Séries */}
      <div className="space-y-2.5">
        {itensFiltrados.length === 0 ? (
          <div className="card-brut p-6 text-center">
            <p className="text-xs text-ink/60 font-bold">
              {filtro === 'pendentes'
                ? 'Nenhum filme pendente na lista. Sugira um acima! 🍿'
                : 'Nenhum item marcado como assistido ainda.'}
            </p>
          </div>
        ) : (
          itensFiltrados.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 card-brut px-4 py-3 shadow-brutsm transition ${
                item.assistido ? 'opacity-60 bg-white/70' : 'bg-white'
              }`}
            >
              <button
                onClick={() => handleToggleAssistido(item)}
                className={`w-6 h-6 rounded-full border-3 border-ink flex items-center justify-center shrink-0 font-black text-xs ${
                  item.assistido ? 'bg-yellow text-ink' : 'bg-white'
                }`}
                title={item.assistido ? 'Marcar como não assistido' : 'Marcar como assistido'}
              >
                {item.assistido && '✓'}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-bold truncate ${
                    item.assistido ? 'line-through text-ink/50' : 'text-ink'
                  }`}
                >
                  {item.titulo}
                </p>
                <p className="text-[9px] text-ink/50 font-bold uppercase mt-0.5">
                  {item.tipo === 'filme' ? '🎬 Filme' : '📺 Série'} · sugerido por{' '}
                  {item.sugerido_por || '—'}
                </p>
              </div>

              <button
                onClick={() => setDeleteModal({ isOpen: true, id: item.id })}
                className="text-ink/30 hover:text-pink font-black text-base px-1.5"
                aria-label="Excluir filme"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal Confirmação de Exclusão */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        title="Remover Sugestão"
        badgeText="Filmes"
        badgeColor="bg-pink"
        confirmText="Sim, Remover"
        onConfirm={handleConfirmDelete}
        isDestructive={true}
      >
        <p>Deseja remover esta sugestão de filme/série da lista?</p>
      </Modal>

      {/* Roleta de Sorteio */}
      <RouletteModal
        isOpen={isRouletteOpen}
        onClose={() => setIsRouletteOpen(false)}
        items={pendentesParaSortear}
        title="Sortear Filme ou Série 🍿"
        emptyMessage="Adicione filmes pendentes à lista para poder sortear!"
      />
    </div>
  );
}
