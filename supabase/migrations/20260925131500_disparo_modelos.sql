-- Modelos de mensagem reaproveitáveis entre disparos.
--
-- O rascunho automático da tela de novo disparo mora no navegador, porque é
-- lixo de trabalho em andamento e morre junto com a campanha criada. Aqui ficam
-- só as sequências que alguém salvou de propósito: elas atravessam máquinas e
-- servem a quem mais entrar no painel.
create table if not exists public.disparo_modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  mensagens jsonb not null,
  criado_em timestamptz not null default now()
);

create index if not exists disparo_modelos_criado_em_idx
  on public.disparo_modelos (criado_em desc);

alter table public.disparo_modelos enable row level security;

-- Mesma regra das outras tabelas de disparo: só o usuário do painel enxerga.
drop policy if exists "painel gerencia modelos" on public.disparo_modelos;
create policy "painel gerencia modelos"
  on public.disparo_modelos for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'painel@alvocon.com.br')
  with check ((auth.jwt() ->> 'email') = 'painel@alvocon.com.br');
