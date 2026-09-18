-- Histórico completo da conversa: além de lead e IA, passa a guardar o que o
-- vendedor escreveu pelo celular/WhatsApp Web. Até aqui o n8n só registrava a
-- hora disso (evento pausa_humana) e jogava o texto fora.
--
-- direcao:
--   lead        — o cliente
--   ia          — a Isabela (enviada pela API)
--   humano      — o vendedor, pelo celular ou WhatsApp Web
--   automatica  — resposta automática do WhatsApp Business ("Agradecemos sua mensagem...")

alter table public.isabela_mensagens
  drop constraint isabela_mensagens_direcao_check;

alter table public.isabela_mensagens
  add constraint isabela_mensagens_direcao_check
  check (direcao in ('lead', 'ia', 'humano', 'automatica'));

alter table public.isabela_mensagens
  add column if not exists message_id text,       -- id da mensagem no WhatsApp; evita duplicar
  add column if not exists remetente_nome text,   -- ex: "Dep Vendas Alvocon"
  add column if not exists canal text,            -- android, web, ios... (de onde o vendedor mandou)
  add column if not exists tipo text,             -- texto, audio, imagem, video, documento, figurinha...
  add column if not exists midia_url text,
  add column if not exists em_massa boolean not null default false, -- mesma mensagem mandada pra vários leads (disparo)
  add column if not exists origem_registro text not null default 'fluxo'; -- 'fluxo' (tempo real) ou 'backfill_n8n'

create unique index if not exists isabela_mensagens_message_id_key
  on public.isabela_mensagens (message_id)
  where message_id is not null;
