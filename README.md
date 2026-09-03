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

## Disparos

A aba **Disparos** cria campanhas de prospecção pelo WhatsApp. O painel sobe a
planilha e acompanha; quem envia é o n8n.

```
Painel  ──sobe planilha──>  Supabase (disparo_campanhas + disparo_contatos)
   │                              ▲
   └──POST webhook──> n8n ────────┘  lê a fila, envia pela uazapi,
                                     grava o status de volta
   ◄── Realtime ──  progresso ao vivo
```

- A planilha aceita `.csv` e `.xlsx`; precisa de uma coluna `NUMERO` (ou
  TELEFONE/CELULAR) e de preferência `NOME`. O DDI 55 é adicionado sozinho e os
  números impossíveis são descartados na tela, antes de gravar.
- As mensagens e a imagem são escritas na hora de criar a campanha. Use
  `{{nome}}` no texto para chamar a pessoa pelo primeiro nome.
- **Pausar e cancelar** são só uma troca de status no banco: o n8n confere a
  cada contato e encerra o loop sozinho, sem execução travada pela metade.
- O intervalo entre um contato e o próximo é sorteado dentro da janela da
  campanha (padrão 120–180s). Diminuir isso aumenta o risco de bloqueio.

Workflow do n8n: **DISPARO PROSPECÇÃO (painel + supabase)**. Ele precisa da
credencial `uazapi token` (Header Auth com o template
`{"headers":{"token":"<token>"}}`) e da credencial `Supabase account`.

## Estrutura

- `src/pages/VisaoGeral.jsx` — KPIs, funil, perfis, leads por dia
- `src/pages/Conversas.jsx` — lista de leads + conversa (cliente × IA)
- `src/pages/Disparos.jsx` — campanhas de prospecção e progresso
- `src/pages/DisparoNovo.jsx` — mensagens, mídia e upload da planilha
- `src/pages/DisparoDetalhe.jsx` — acompanhamento ao vivo de uma campanha
- `src/lib/useDados.js` — carregamento + Realtime
- `src/lib/metricas.js` — cálculo de funil/etapas/agregados
- `src/lib/periodo.js` — modelo do filtro de data
- `src/lib/planilha.js` — leitura de CSV/XLSX e normalização de telefone
- `src/lib/disparos.js` — campanhas: criação, controle e leitura ao vivo
