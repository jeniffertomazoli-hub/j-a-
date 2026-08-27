# 💜 Sintonia 2.0 - O Espaço do Casal

Aplicativo completo de conexão para casais com **Termômetro de Felicidade**, **Planos Diários & Intimidade**, **Filmes & Séries**, **Quiz de Compatibilidade**, **Cápsula de Memórias** e **Painel de Insights**, construído com **React 18 + Vite + Tailwind CSS + Supabase (Realtime & Storage)** no estilo de design **Neo-brutalismo**.

---

## ✨ O que há de novo na versão 2.0:

1. **⚡ Supabase Realtime:**
   - Atualizações instantâneas e ao vivo via WebSocket: quando um dos parceiros responde ao termômetro, envia um recado ou sugere um filme, o outro vê na mesma hora sem recarregar a tela!
2. **🎲 Roleta da Decisão (Sorteador de Filmes e Rolês):**
   - Sorteie aleatoriamente entre os filmes pendentes ou atividades do dia com animação de roleta e confetes (`canvas-confetti`).
3. **🎨 Sistema Completo de Toasts e Modais Neo-brutalistas:**
   - 100% livre dos diálogos nativos do navegador (`alert`/`confirm`), trazendo uma experiência imersiva, moderna e fluida.
4. **📸 Compressão Inteligente de Fotos no Upload:**
   - Fotos pesadas de smartphone (5MB a 15MB) são comprimidas e redimensionadas no navegador antes do envio ao Supabase Storage, reduzindo o tempo de upload para menos de 1 segundo e economizando armazenamento.
5. **⚙️ Personalização Completa do Casal & Contador de Dias:**
   - Altere nomes/apelidos, emojis de avatar, data de início do relacionamento e o PIN de segurança direto pelo modal de configurações.
   - Contador de tempo de relacionamento no topo (*"💜 X dias juntos"*).
6. **📱 PWA Ready (Instalável no Celular):**
   - Pronto para ser instalado como aplicativo nativo no iPhone/Android sem a barra do navegador.

---

## 🚀 Como Rodar Localmente

1. Navegue até a pasta do projeto:
```bash
cd sintonia-app
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

4. Para gerar a build de produção otimizada para o Vercel:
```bash
npm run build
```

---

## 🔒 Banco de Dados Supabase Conectado

O app já está integrado com o banco de dados Supabase na nuvem (`https://duvpdskqriegldzwheho.supabase.co`) e utiliza as tabelas:
* `respostas_diarias`: Registros diários do termômetro de humor.
* `capsula_memorias`: Histórico da porcentagem de sintonia do casal.
* `topicos`: Planos e atividades diárias categorizadas (Rolês, Em casa, Filmes).
* `jogar_do_dia`: Status de disponibilidade para jogar no dia.
* `mensagens_conversa`: Recadinhos e reflexões do dia com emojis.
* `filmes_series`: Lista de filmes e séries para assistir e assistidos.
* `quiz_perguntas_v2`: Perguntas cadastradas para o quiz do casal.
* `quiz_respostas_v2`: Respostas individuais e cálculo de match.
* `memorias`: Histórias e datas especiais com fotos.
* Bucket `memorias-imagens`: Armazenamento de fotos na nuvem.
