import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  criarPostFeed,
  buscarPostsFeed,
  reagirPostFeed,
  adicionarComentarioPost,
  editarPostFeed,
  excluirPostFeed,
  uploadImagemMemoria,
  subscribeToTable,
} from '../../lib/supabase';
import { compressImage } from '../../lib/imageUtils';
import { useToast } from '../../context/ToastContext';
import Modal from '../Modal';
import Avatar from '../Avatar';

const EMOJIS_REACAO = ['❤️', '😍', '🥺', '😂', '🔥', '💋', '🫂', '✨'];

function formatarDataPost(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const hoje = new Date();
  const ehHoje = d.toDateString() === hoje.toDateString();
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return ehHoje ? `Hoje, às ${hora}` : `${data}, às ${hora}`;
}

export default function FeedTab({ quemSouEu, settings }) {
  const toast = useToast();
  const ehP1 = quemSouEu === 'parceiro1';
  const meuNome = ehP1 ? settings.apelido1 : settings.apelido2;
  const meuEmoji = ehP1 ? settings.emoji1 : settings.emoji2;
  const meuFoto = ehP1 ? settings.foto1 : settings.foto2;

  const outroNome = ehP1 ? settings.apelido2 : settings.apelido1;
  const outroEmoji = ehP1 ? settings.emoji2 : settings.emoji1;
  const outroFoto = ehP1 ? settings.foto2 : settings.foto1;

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [publicando, setPublicando] = useState(false);
  const [statusUpload, setStatusUpload] = useState('');

  // Novo Post
  const [textoPost, setTextoPost] = useState('');
  const [arquivoFoto, setArquivoFoto] = useState(null);
  const [previewFoto, setPreviewFoto] = useState(null);
  const [showNovoPost, setShowNovoPost] = useState(false);
  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);

  // Modais
  const [imagemCheia, setImagemCheia] = useState(null);
  const [editModal, setEditModal] = useState({ isOpen: false, id: null, texto: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  // Popover de reações por post
  const [reacaoAbertaPostId, setReacaoAbertaPostId] = useState(null);

  // Comentários abertos por post
  const [comentariosAbertos, setComentariosAbertos] = useState({});
  const [novoComentarioTexto, setNovoComentarioTexto] = useState({});
  const [enviandoComentario, setEnviandoComentario] = useState({});

  useEffect(() => {
    carregarPosts();
    const unsub = subscribeToTable('feed_posts', () => carregarPosts());
    return () => unsub();
  }, []);

  async function carregarPosts() {
    try {
      const data = await buscarPostsFeed();
      setPosts(data);
    } catch (err) {
      console.error('Erro ao carregar posts do feed:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelecionarFoto(e) {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoFoto(file);
      try {
        const previewUrl = URL.createObjectURL(file);
        setPreviewFoto(previewUrl);
      } catch (err) {
        console.warn('URL.createObjectURL failed:', err);
      }
      setShowNovoPost(true);
    }
    e.target.value = '';
  }

  async function handleCriarPost() {
    if (!textoPost.trim() && !arquivoFoto) {
      toast.error('Escreva um pensamento ou anexe uma foto!');
      return;
    }

    setPublicando(true);
    try {
      let fotoUrl = null;

      if (arquivoFoto) {
        setStatusUpload('Otimizando foto...');
        let fileToSend = arquivoFoto;
        try {
          fileToSend = await compressImage(arquivoFoto);
        } catch (compErr) {
          console.warn('Compressão fallback:', compErr);
        }

        setStatusUpload('Enviando para o feed...');
        fotoUrl = await uploadImagemMemoria(fileToSend);
      }

      setStatusUpload('Publicando...');
      await criarPostFeed({
        parceiro: quemSouEu,
        autor_nome: meuNome,
        texto: textoPost.trim(),
        foto_url: fotoUrl,
      });

      setTextoPost('');
      setArquivoFoto(null);
      setPreviewFoto(null);
      setShowNovoPost(false);

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFD93D', '#FF4D97', '#8B7FFF'],
      });

      toast.love('Publicado no feed do casal! 📸💜');
      carregarPosts();
    } catch (err) {
      console.error('Erro ao criar post:', err);
      toast.error(err.message || 'Erro ao publicar no feed.');
    } finally {
      setPublicando(false);
      setStatusUpload('');
    }
  }

  async function handleReagir(post, emoji) {
    setReacaoAbertaPostId(null);
    const reacoesAtuais = post.reacoes || {};
    const jaTinhaEsseEmoji = reacoesAtuais[quemSouEu] === emoji;

    if (!jaTinhaEsseEmoji) {
      confetti({
        particleCount: 35,
        spread: 45,
        origin: { y: 0.7 },
        colors: ['#FF4D97', '#FFD93D', '#33DDF3'],
      });
      toast.love(`Você reagiu com ${emoji}!`);
    }

    try {
      await reagirPostFeed(post.id, quemSouEu, emoji, reacoesAtuais);
      carregarPosts();
    } catch (err) {
      console.error('Erro ao reagir:', err);
    }
  }

  async function handleAdicionarComentario(postId, comentariosAtuais = []) {
    const texto = (novoComentarioTexto[postId] || '').trim();
    if (!texto) return;

    setEnviandoComentario((prev) => ({ ...prev, [postId]: true }));
    try {
      await adicionarComentarioPost(
        postId,
        {
          parceiro: quemSouEu,
          autor_nome: meuNome,
          texto,
        },
        Array.isArray(comentariosAtuais) ? comentariosAtuais : []
      );

      setNovoComentarioTexto((prev) => ({ ...prev, [postId]: '' }));
      // Garante que a seção de comentários permaneça aberta
      setComentariosAbertos((prev) => ({ ...prev, [postId]: true }));

      toast.love('Resposta enviada com carinho! 💌');
      carregarPosts();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar resposta.');
    } finally {
      setEnviandoComentario((prev) => ({ ...prev, [postId]: false }));
    }
  }

  function toggleComentarios(postId) {
    setComentariosAbertos((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }

  async function handleSalvarEdicao() {
    if (!editModal.id) return;
    try {
      await editarPostFeed(editModal.id, editModal.texto.trim());
      toast.success('Publicação atualizada!');
      setEditModal({ isOpen: false, id: null, texto: '' });
      carregarPosts();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Erro ao editar publicação.');
    }
  }

  async function handleConfirmDelete() {
    if (!deleteModal.id) return;
    try {
      await excluirPostFeed(deleteModal.id);
      toast.success('Publicação removida.');
      setDeleteModal({ isOpen: false, id: null });
      carregarPosts();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Erro ao excluir publicação.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-6 pt-4 max-w-md mx-auto pb-16 animate-fadeIn">
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-2">
        <p className="badge-brut bg-pink text-ink text-[10px]">
          Feed do Casal 📸
        </p>
        <span className="text-[11px] font-extrabold text-white/80">
          {settings.apelido1} & {settings.apelido2}
        </span>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-1 leading-tight">
        Nosso Cantinho
      </h1>
      <p className="text-xs text-white/80 font-medium mb-4">
        Compartilhem fotos, pensamentos e reajam aos momentos um do outro 💜
      </p>

      {/* Barra Rápida de Criar Publicação */}
      <div className="card-brut p-3.5 mb-5 shadow-brut bg-white">
        <div className="flex items-center gap-2.5">
          <Avatar
            foto={meuFoto}
            emoji={meuEmoji}
            nome={meuNome}
            size="md"
            corFundo={ehP1 ? 'bg-yellow' : 'bg-pink'}
          />
          <button
            onClick={() => setShowNovoPost(true)}
            className="flex-1 rounded-full border-2 border-ink px-4 py-2 text-left text-xs font-bold text-ink/50 bg-ink/5 hover:bg-yellow/20 transition truncate"
          >
            No que você está pensando agora, {meuNome}?
          </button>
          <button
            onClick={() => fileInputRef1.current?.click()}
            className="btn-brut px-3 py-2 bg-cyan text-ink text-xs shrink-0 shadow-brutsm flex items-center gap-1"
            title="Adicionar foto"
          >
            <span>📷</span>
            <span className="hidden sm:inline">Foto</span>
          </button>
          <input
            ref={fileInputRef1}
            type="file"
            accept="image/*"
            onChange={handleSelecionarFoto}
            className="hidden"
          />
        </div>

        {/* Formulário Expandido */}
        {showNovoPost && (
          <div className="mt-3 pt-3 border-t-2 border-ink/10 animate-popIn space-y-3">
            <textarea
              value={textoPost}
              onChange={(e) => setTextoPost(e.target.value)}
              placeholder={`Escreva uma legenda ou pensamento para ${outroNome}...`}
              rows={3}
              className="w-full rounded-xl border-3 border-ink px-3 py-2 text-xs font-medium outline-none bg-white resize-none placeholder:text-ink/40 shadow-brutsm"
              autoFocus
            />

            {previewFoto && (
              <div className="relative">
                <img
                  src={previewFoto}
                  alt="Prévia"
                  className="w-full max-h-56 object-cover rounded-xl border-3 border-ink shadow-brutsm"
                />
                <button
                  onClick={() => {
                    setArquivoFoto(null);
                    setPreviewFoto(null);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-pink border-2 border-ink text-white font-black text-xs flex items-center justify-center shadow-brutsm hover:scale-105 transition"
                >
                  ✕
                </button>
              </div>
            )}

            <input
              ref={fileInputRef2}
              type="file"
              accept="image/*"
              onChange={handleSelecionarFoto}
              className="hidden"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef2.current?.click()}
                className="btn-brut px-3 py-2 bg-white text-ink text-xs flex items-center gap-1.5"
              >
                <span>📷</span>
                <span>{previewFoto ? 'Trocar foto' : 'Anexar foto'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNovoPost(false);
                  setTextoPost('');
                  setArquivoFoto(null);
                  setPreviewFoto(null);
                }}
                className="btn-brut px-3 py-2 bg-white text-ink text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriarPost}
                disabled={publicando}
                className="btn-brut flex-1 py-2 bg-yellow text-ink text-xs font-black disabled:opacity-50 shadow-brut"
              >
                {publicando ? statusUpload || 'Publicando...' : 'Publicar 💜'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feed de Publicações */}
      <div className="space-y-5">
        {posts.length === 0 ? (
          <div className="card-brut p-8 text-center shadow-brut bg-white">
            <p className="text-4xl mb-2">📸</p>
            <p className="text-sm font-bold text-ink/70 leading-relaxed">
              O feed ainda está vazio! Compartilhem a primeira foto ou pensamento do dia acima ✨
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const ehAutorP1 = post.parceiro === 'parceiro1';
            const autorNome = ehAutorP1 ? settings.apelido1 : settings.apelido2;
            const autorEmoji = ehAutorP1 ? settings.emoji1 : settings.emoji2;
            const autorFoto = ehAutorP1 ? settings.foto1 : settings.foto2;
            const corBadge = ehAutorP1 ? 'bg-yellow' : 'bg-pink';

            const reacoes = post.reacoes && typeof post.reacoes === 'object' && !Array.isArray(post.reacoes)
              ? post.reacoes
              : {};
            const minhaReacao = reacoes[quemSouEu];
            const outraReacao = reacoes[quemSouEu === 'parceiro1' ? 'parceiro2' : 'parceiro1'];

            const comentarios = Array.isArray(post.comentarios) ? post.comentarios : [];
            const comentariosAbertosParaEste = comentariosAbertos[post.id];
            const isReacaoMenuOpen = reacaoAbertaPostId === post.id;

            return (
              <article
                key={post.id}
                className="card-brut bg-white p-4 shadow-brut relative overflow-hidden"
              >
                {/* Header do Post */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      foto={autorFoto}
                      emoji={autorEmoji}
                      nome={autorNome}
                      size="md"
                      corFundo={ehAutorP1 ? 'bg-yellow' : 'bg-pink'}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-ink truncate">
                          {autorNome}
                        </span>
                        <span className={`badge-brut ${corBadge} text-[8px] py-0 px-1.5`}>
                          {ehAutorP1 ? 'Jeniffer' : 'Alvaro'}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink/50 font-bold">
                        {formatarDataPost(post.criado_em)}
                      </p>
                    </div>
                  </div>

                  {/* Ações (Editar / Excluir) */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setEditModal({
                          isOpen: true,
                          id: post.id,
                          texto: post.texto || '',
                        })
                      }
                      className="text-xs text-ink/30 hover:text-royal p-1"
                      title="Editar legenda"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, id: post.id })}
                      className="text-xs text-ink/30 hover:text-pink p-1"
                      title="Excluir post"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Foto do Post (se houver) */}
                {post.foto_url && (
                  <div
                    onClick={() => setImagemCheia(post.foto_url)}
                    onDoubleClick={() => handleReagir(post, '❤️')}
                    className="cursor-pointer mb-3 relative group"
                    title="Toque duplo para curtir ❤️"
                  >
                    <img
                      src={post.foto_url}
                      alt="Foto da publicação"
                      className="w-full max-h-96 object-cover rounded-xl border-3 border-ink shadow-brutsm group-hover:opacity-95 transition"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Legenda / Pensamento */}
                {post.texto && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-ink leading-relaxed break-words whitespace-pre-wrap">
                      <span className="font-black mr-1.5">{autorNome}:</span>
                      {post.texto}
                    </p>
                  </div>
                )}

                {/* Badges de Reações Ativas com Fotos do Casal */}
                <div className="flex items-center gap-2 flex-wrap mb-2.5">
                  {/* Reação de Jeniffer (se houver) */}
                  {reacoes.parceiro1 && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 border-ink bg-yellow/30 text-xs font-black shadow-brutsm animate-popIn">
                      <Avatar
                        foto={settings.foto1}
                        emoji={settings.emoji1 || '🐰'}
                        nome={settings.apelido1}
                        size="xs"
                        corFundo="bg-yellow"
                      />
                      <span>{settings.apelido1}</span>
                      <span className="text-sm">{reacoes.parceiro1}</span>
                    </div>
                  )}

                  {/* Reação de Alvaro (se houver) */}
                  {reacoes.parceiro2 && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 border-ink bg-pink/30 text-xs font-black shadow-brutsm animate-popIn">
                      <Avatar
                        foto={settings.foto2}
                        emoji={settings.emoji2 || '🦊'}
                        nome={settings.apelido2}
                        size="xs"
                        corFundo="bg-pink"
                      />
                      <span>{settings.apelido2}</span>
                      <span className="text-sm">{reacoes.parceiro2}</span>
                    </div>
                  )}
                </div>

                {/* Barra de Ações: Botão de Reagir + Botão de Comentários */}
                <div className="relative pt-2 border-t-2 border-ink/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Botão de Reagir (Abre menu de emojis) */}
                    <button
                      onClick={() => setReacaoAbertaPostId(isReacaoMenuOpen ? null : post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-ink text-xs font-black transition active:scale-95 shadow-brutsm ${
                        minhaReacao
                          ? 'bg-yellow text-ink scale-102'
                          : 'bg-white text-ink hover:bg-yellow/20'
                      }`}
                    >
                      <span className="text-sm">{minhaReacao || '❤️'}</span>
                      <span>{minhaReacao ? 'Reagido' : 'Reagir'}</span>
                    </button>

                    {/* Botão de Comentários */}
                    <button
                      onClick={() => toggleComentarios(post.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-ink text-xs font-black bg-white text-ink hover:bg-pink/15 transition shadow-brutsm"
                    >
                      <span>💬</span>
                      <span>{comentarios.length > 0 ? `${comentarios.length} ${comentarios.length === 1 ? 'resposta' : 'respostas'}` : 'Responder'}</span>
                    </button>
                  </div>

                  {/* Status de quem reagiu */}
                  {reacoes.parceiro1 && reacoes.parceiro2 && (
                    <span className="text-[10px] font-extrabold text-ink/70 hidden sm:inline">
                      Vocês dois reagiram! 💜
                    </span>
                  )}

                  {/* Popover Flutuante de Escolha de Emojis */}
                  {isReacaoMenuOpen && (
                    <div className="absolute left-0 bottom-11 z-20 flex gap-1.5 p-2 bg-white border-3 border-ink rounded-full shadow-brut animate-popIn">
                      {EMOJIS_REACAO.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => handleReagir(post, em)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-lg hover:scale-125 transition ${
                            minhaReacao === em ? 'bg-yellow border-2 border-ink' : 'hover:bg-ink/5'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Seção de Comentários / Respostas em Texto */}
                {comentariosAbertosParaEste && (
                  <div className="mt-3 pt-3 border-t-2 border-ink/10 space-y-2.5 animate-fadeIn">
                    {/* Lista de Comentários */}
                    {comentarios.length === 0 ? (
                      <p className="text-[11px] text-ink/50 font-bold italic text-center py-1">
                        Nenhuma resposta ainda. Escreva o primeiro recado abaixo! 💬
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {comentarios.map((com) => {
                          const comAutorP1 = com.parceiro === 'parceiro1';
                          const comNome = comAutorP1 ? settings.apelido1 : settings.apelido2;
                          const comEmoji = comAutorP1 ? settings.emoji1 : settings.emoji2;
                          const comFoto = comAutorP1 ? settings.foto1 : settings.foto2;

                          return (
                            <div
                              key={com.id}
                              className="bg-ink/5 rounded-2xl p-2.5 border border-ink/10 text-xs flex items-start gap-2.5"
                            >
                              <Avatar
                                foto={comFoto}
                                emoji={comEmoji}
                                nome={comNome}
                                size="sm"
                                corFundo={comAutorP1 ? 'bg-yellow' : 'bg-pink'}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="font-black text-ink truncate">
                                    {comNome}
                                  </span>
                                  <span className="text-[9px] text-ink/40 font-bold shrink-0">
                                    {formatarDataPost(com.criado_em)}
                                  </span>
                                </div>
                                <p className="text-ink/90 font-medium break-words leading-relaxed">
                                  {com.texto}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Input de Resposta com Avatar de quem está comentando */}
                    <div className="flex items-center gap-2 pt-1">
                      <Avatar
                        foto={meuFoto}
                        emoji={meuEmoji}
                        nome={meuNome}
                        size="sm"
                        corFundo={ehP1 ? 'bg-yellow' : 'bg-pink'}
                      />
                      <input
                        value={novoComentarioTexto[post.id] || ''}
                        onChange={(e) =>
                          setNovoComentarioTexto((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) =>
                          e.key === 'Enter' &&
                          handleAdicionarComentario(post.id, comentarios)
                        }
                        placeholder={`Responder como ${meuNome}...`}
                        className="flex-1 rounded-xl border-2 border-ink px-3 py-1.5 text-xs font-bold outline-none bg-white shadow-brutsm placeholder:text-ink/40"
                      />
                      <button
                        onClick={() =>
                          handleAdicionarComentario(post.id, comentarios)
                        }
                        disabled={enviandoComentario[post.id]}
                        className="btn-brut px-3 py-1.5 bg-yellow text-ink text-xs font-black shrink-0 shadow-brutsm disabled:opacity-50"
                      >
                        {enviandoComentario[post.id] ? '...' : '💌'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Modal Imagem Tela Cheia */}
      {imagemCheia && (
        <div
          onClick={() => setImagemCheia(null)}
          className="fixed inset-0 z-50 bg-ink/85 flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
        >
          <img
            src={imagemCheia}
            alt="Foto ampliada"
            className="rounded-2xl border-3 border-ink shadow-brut max-h-[88vh] max-w-full object-contain"
          />
        </div>
      )}

      {/* Modal Editar Legenda */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, id: null, texto: '' })}
        title="Editar Legenda ✏️"
        badgeText="Feed"
        badgeColor="bg-yellow"
        confirmText="Salvar Alteração"
        onConfirm={handleSalvarEdicao}
      >
        <textarea
          value={editModal.texto}
          onChange={(e) =>
            setEditModal((prev) => ({ ...prev, texto: e.target.value }))
          }
          rows={4}
          className="w-full rounded-xl border-3 border-ink px-3 py-2 text-xs font-medium outline-none bg-white resize-none"
        />
      </Modal>

      {/* Modal Excluir Post */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        title="Excluir Publicação"
        badgeText="Atenção"
        badgeColor="bg-pink"
        confirmText="Sim, Excluir"
        onConfirm={handleConfirmDelete}
        isDestructive={true}
      >
        <p>Tem certeza que deseja remover esta publicação do feed do casal?</p>
      </Modal>
    </div>
  );
}
