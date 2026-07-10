# Painel Isabela — Alvocon

Painel em tempo real da SDR IA (Isabela) no WhatsApp: funil de qualificação,
métricas por perfil de cliente, eventos do fluxo e visualizador de conversas.

Os dados são gravados pelo fluxo n8n ("SDR Isabela Alvocon") nas tabelas
`isabela_leads`, `isabela_mensagens` e `isabela_eventos` do Supabase, e o painel
lê essas tabelas com atualização ao vivo (Supabase Realtime + refresh de reserva).

## Rodar local

```bash
cp .env.example .env   # preencha com URL e anon key do Supabase
npm install
npm run dev            # abre em http://localhost:5173
```

O login é feito com o usuário dedicado do painel (Supabase Auth). A leitura das
tabelas é protegida por RLS: somente esse usuário enxerga os dados.

## Deploy (Vercel)

- Framework: Vite (build `npm run build`, saída `dist/`)
- Configurar as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no
  painel da Vercel (Settings → Environment Variables) — o `.env` local NÃO vai
  pro repositório (está no `.gitignore`).
- O `vercel.json` já contém o rewrite de SPA: qualquer rota (`/conversas`,
  `/conversas/5514...`) cai no `index.html` e o React Router resolve — sem 404.

## Estrutura

- `src/pages/VisaoGeral.jsx` — KPIs, funil, perfis, leads por dia, eventos
- `src/pages/Conversas.jsx` — lista de leads + conversa (cliente × IA)
- `src/lib/useDados.js` — carregamento + Realtime
- `src/lib/metricas.js` — cálculo de funil/etapas/agregados
