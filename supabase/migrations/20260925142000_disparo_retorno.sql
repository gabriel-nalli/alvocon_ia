-- Retorno do disparo: quem respondeu, e quando a mensagem chegou de fato.
--
-- Até aqui "Entregue" no painel queria dizer só "a uazapi aceitou o envio".
-- Estas colunas são preenchidas pelo workflow RETORNO DO DISPARO, a partir dos
-- eventos que a instância manda de volta.
alter table public.disparo_contatos
  add column if not exists entregue_em timestamptz,
  add column if not exists visualizado_em timestamptz,
  add column if not exists respondeu_em timestamptz,
  add column if not exists resposta text;

-- o webhook chega pelo número, sem saber de campanha
create index if not exists disparo_contatos_numero_idx
  on public.disparo_contatos (numero);

-- Contagem que a lista de campanhas lê. Resposta é o número que importa para
-- julgar um disparo, então entra junto com o resto.
create or replace view public.disparo_progresso as
 SELECT c.id AS campanha_id,
    count(ct.id) AS total,
    count(*) FILTER (WHERE ct.status = 'pendente'::text) AS pendentes,
    count(*) FILTER (WHERE ct.status = 'enviando'::text) AS enviando,
    count(*) FILTER (WHERE ct.status = 'enviado'::text) AS enviados,
    count(*) FILTER (WHERE ct.status = 'erro'::text) AS erros,
    count(*) FILTER (WHERE ct.entregue_em IS NOT NULL) AS entregues,
    count(*) FILTER (WHERE ct.visualizado_em IS NOT NULL) AS visualizados,
    count(*) FILTER (WHERE ct.respondeu_em IS NOT NULL) AS responderam
   FROM disparo_campanhas c
     LEFT JOIN disparo_contatos ct ON ct.campanha_id = c.id
  GROUP BY c.id;
