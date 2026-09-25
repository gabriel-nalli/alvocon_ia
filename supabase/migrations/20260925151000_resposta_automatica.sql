-- Saudação automática não é resposta.
--
-- Muitos leads são empresa e têm mensagem de saudação ou de ausência no
-- WhatsApp Business. Ela chega como mensagem normal — o evento da uazapi não
-- traz nenhuma marca — e estava entrando na conta de quem respondeu, inflando a
-- taxa do disparo. O caso que apareceu: "Olá! Sou o Henrique, do Departamento
-- de Vendas...", disparada no mesmo segundo da nossa primeira mensagem.
alter table public.disparo_contatos
  add column if not exists resposta_automatica boolean not null default false;

-- Dois sinais independentes, porque nenhum dos dois sozinho é confiável:
-- o tempo pega a saudação desconhecida, o texto pega a que veio devagar.
create or replace function public.disparo_resposta_automatica(
  p_texto text,
  p_status text,
  p_enviado_em timestamptz
) returns boolean
language sql
stable
as $$
  select
    -- ainda estávamos mandando as mensagens, ou acabamos de mandar: saudação e
    -- aviso de ausência saem na hora, gente leva mais tempo
    p_status = 'enviando'
    or (p_enviado_em is not null and now() - p_enviado_em < interval '20 seconds')
    or lower(coalesce(p_texto, '')) ~ (
      'não estamos disponíveis|nao estamos disponiveis'
      || '|horário comercial|horario comercial'
      || '|obrigado por entrar em contato|obrigada por entrar em contato'
      || '|agradecemos sua mensagem|agradecemos seu contato'
      || '|retornaremos|assim que possível|assim que possivel'
      || '|mensagem automática|mensagem automatica'
      || '|atendimento automático|atendimento automatico'
      || '|escolha pelo número|escolha pelo numero'
      || '|digite o número|digite o numero'
    );
$$;

-- Ponto único de entrada do webhook: o n8n manda o evento cru e a decisão fica
-- aqui, onde dá para corrigir a regra sem mexer no workflow.
create or replace function public.disparo_retorno(
  p_numero text,
  p_evento text,
  p_texto text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_status text;
  v_enviado_em timestamptz;
  v_auto boolean;
begin
  -- o contato mais recente desse número que já recebeu ou está recebendo
  select id, status, enviado_em
    into v_id, v_status, v_enviado_em
    from disparo_contatos
   where numero = p_numero
     and status in ('enviado', 'enviando')
   order by id desc
   limit 1;

  if v_id is null then
    return;
  end if;

  if p_evento = 'entregue' then
    update disparo_contatos set entregue_em = now()
     where id = v_id and entregue_em is null;

  elsif p_evento = 'visualizado' then
    update disparo_contatos set visualizado_em = now()
     where id = v_id and visualizado_em is null;

  elsif p_evento = 'resposta' then
    v_auto := disparo_resposta_automatica(p_texto, v_status, v_enviado_em);

    -- Guarda a primeira resposta. A exceção é a automática ser substituída por
    -- uma de verdade: é o que salva a regra quando ela erra, porque quem
    -- responde depois da saudação é gente.
    update disparo_contatos
       set respondeu_em = case
             when respondeu_em is null or (resposta_automatica and not v_auto)
             then now() else respondeu_em end,
           resposta = case
             when respondeu_em is null or (resposta_automatica and not v_auto)
             then p_texto else resposta end,
           resposta_automatica = case
             when respondeu_em is null then v_auto
             else resposta_automatica and v_auto end
     where id = v_id;
  end if;
end;
$$;

revoke all on function public.disparo_retorno(text, text, text) from public, anon;
grant execute on function public.disparo_retorno(text, text, text) to service_role, authenticated;

-- Quem respondeu de verdade é o número que conta o disparo; a automática fica
-- visível à parte, para ninguém achar que a mensagem sumiu.
create or replace view public.disparo_progresso as
 SELECT c.id AS campanha_id,
    count(ct.id) AS total,
    count(*) FILTER (WHERE ct.status = 'pendente'::text) AS pendentes,
    count(*) FILTER (WHERE ct.status = 'enviando'::text) AS enviando,
    count(*) FILTER (WHERE ct.status = 'enviado'::text) AS enviados,
    count(*) FILTER (WHERE ct.status = 'erro'::text) AS erros,
    count(*) FILTER (WHERE ct.entregue_em IS NOT NULL) AS entregues,
    count(*) FILTER (WHERE ct.visualizado_em IS NOT NULL) AS visualizados,
    count(*) FILTER (WHERE ct.respondeu_em IS NOT NULL AND NOT ct.resposta_automatica) AS responderam,
    count(*) FILTER (WHERE ct.respondeu_em IS NOT NULL AND ct.resposta_automatica) AS responderam_auto
   FROM disparo_campanhas c
     LEFT JOIN disparo_contatos ct ON ct.campanha_id = c.id
  GROUP BY c.id;

-- reclassifica o que já foi gravado pela regra antiga
update public.disparo_contatos
   set resposta_automatica = true
 where respondeu_em is not null
   and not resposta_automatica
   and disparo_resposta_automatica(resposta, 'enviado', respondeu_em - interval '1 second');
