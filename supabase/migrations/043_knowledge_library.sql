-- Fase 2 da "agência criativa": Biblioteca de Conhecimento.
-- Recursos que as personalidades (Copywriter, Designer…) consultam ao criar:
-- hooks, CTAs, frameworks, sistemas visuais e as próprias personalidades.
-- Como você desenhou: a biblioteca vem ANTES das personalidades — elas
-- consultam a biblioteca, não "contêm" o conhecimento. Assim, adicionar um
-- framework/estilo novo beneficia todos automaticamente.
--
-- company_id NULL = item embutido (global, disponível pra todo mundo).
-- company_id preenchido = item personalizado daquele negócio.

create table if not exists marketing_ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  kind text not null check (kind in ('hook', 'cta', 'framework', 'visual_system', 'personality')),
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_mai_knowledge_kind on marketing_ai_knowledge(kind, company_id);

alter table marketing_ai_knowledge enable row level security;

-- Lê os globais (company_id null) + os da própria empresa.
create policy "read global + own knowledge" on marketing_ai_knowledge for select
  using (company_id is null or company_id in (select id from companies where user_id = auth.uid()));
-- Só mexe nos itens da própria empresa (não edita os embutidos).
create policy "insert own knowledge" on marketing_ai_knowledge for insert
  with check (company_id in (select id from companies where user_id = auth.uid()));
create policy "update own knowledge" on marketing_ai_knowledge for update
  using (company_id in (select id from companies where user_id = auth.uid()));
create policy "delete own knowledge" on marketing_ai_knowledge for delete
  using (company_id in (select id from companies where user_id = auth.uid()));

-- ── Seed: conhecimento embutido (global) ───────────────────────────────────
insert into marketing_ai_knowledge (company_id, kind, title, content, tags) values
-- Frameworks de copy
(null, 'framework', 'AIDA', 'Atenção → Interesse → Desejo → Ação. Abre com um gancho forte, gera interesse com um dado ou dor, cria desejo mostrando o resultado, fecha com uma ação clara.', '{copy}'),
(null, 'framework', 'PAS', 'Problema → Agitação → Solução. Nomeia a dor, mexe na ferida (o custo de não resolver), e só então apresenta a solução como alívio.', '{copy}'),
(null, 'framework', 'BAB', 'Before → After → Bridge. Mostra o estado atual ruim, pinta o depois desejado, e a "ponte" (seu produto/serviço) que leva de um ao outro.', '{copy}'),
(null, 'framework', 'Equação de Valor (Hormozi)', 'Valor = (Resultado sonhado × Probabilidade percebida) ÷ (Tempo × Esforço). Aumente o resultado e a certeza; reduza o tempo e o esforço percebidos.', '{copy,oferta}'),
(null, 'framework', 'Long copy (Ogilvy)', 'Fato específico vende mais que adjetivo. Título que promete benefício claro, corpo com prova concreta, sem exagero — "o consumidor não é idiota".', '{copy}'),
(null, 'framework', 'Conversational (Alex Cattoni)', 'Escreve como quem fala com um amigo: 1 ideia por frase, ritmo, empatia com a dor real, linguagem simples e humana.', '{copy}'),
-- Hooks (ganchos)
(null, 'hook', 'O erro dos 90%', '"90% dos [tipo de negócio] cometem este erro..." — cria curiosidade + medo de estar errando.', '{gancho}'),
(null, 'hook', 'Ninguém te conta', '"Ninguém te conta isso sobre [tema]..." — promete informação de bastidor/exclusiva.', '{gancho}'),
(null, 'hook', 'Pare de', '"Pare de [ação comum errada] agora." — comando direto que interrompe a rolagem.', '{gancho}'),
(null, 'hook', 'Antes eu achava', '"Antes eu achava [crença comum]... até que [virada]." — storytelling de transformação.', '{gancho,historia}'),
(null, 'hook', 'O segredo que escondem', '"O que [concorrentes] não querem que você saiba sobre [tema]." — tensão + curiosidade.', '{gancho}'),
-- CTAs
(null, 'cta', 'Agende agora', 'Chamada de conversão direta pra serviço/consulta. Use quando o objetivo é reserva/atendimento.', '{conversao}'),
(null, 'cta', 'Chama no WhatsApp', 'Baixa fricção, conversa 1:1. Ótimo pra negócio local que fecha no papo.', '{conversao,whatsapp}'),
(null, 'cta', 'Comenta EU QUERO', 'CTA de engajamento que dispara alcance e captura interesse pra follow-up.', '{engajamento}'),
(null, 'cta', 'Salva esse post', 'Aumenta salvamentos (sinal forte pro algoritmo) em conteúdo educativo/checklist.', '{engajamento}'),
-- Sistemas visuais
(null, 'visual_system', 'Tweet Print', 'Print de "tweet"/nota com uma frase de efeito. Simples, alto contraste, ótimo pra opinião/gancho.', '{design}'),
(null, 'visual_system', 'Antes/Depois', 'Carrossel comparando o estado antes e o resultado depois. Prova visual poderosa.', '{design,prova}'),
(null, 'visual_system', 'Checklist', 'Lista com itens marcáveis. Educativo, gera salvamento, fácil de consumir.', '{design,educativo}'),
(null, 'visual_system', 'Comparação', 'Lado a lado "isso vs aquilo". Clareza de posicionamento e diferencial.', '{design}'),
(null, 'visual_system', 'Infográfico', 'Dado/estatística visualizada. Passa autoridade e é altamente compartilhável.', '{design,autoridade}'),
(null, 'visual_system', 'Timeline', 'Passo a passo ou linha do tempo. Bom pra processo, jornada ou "como fazer".', '{design,educativo}'),
(null, 'visual_system', 'Citação', 'Frase forte em destaque tipográfico. Emocional, fácil de produzir.', '{design}'),
-- Personalidades (especialistas que o Diretor Criativo pode acionar)
(null, 'personality', 'Copywriter', 'Especialista em texto que vende. Domina AIDA/PAS/BAB, escreve ganchos fortes e CTAs claros. Foca em clareza e persuasão.', '{execucao,copy}'),
(null, 'personality', 'Designer', 'Pensa o conceito visual: layout, tipografia, espaço em branco, sistema visual coerente com a marca.', '{execucao,design}'),
(null, 'personality', 'Performance Marketer', 'Pensa em conversão e funil: qual oferta, qual CTA, qual etapa do funil, o que move a métrica.', '{execucao,performance}'),
(null, 'personality', 'Storyteller', 'Constrói narrativa e emoção: antes/depois, jornada do cliente, conexão humana.', '{execucao,historia}'),
(null, 'personality', 'Humor Writer', 'Tom leve e divertido, memes e trocadilhos quando cabe à marca. Aumenta compartilhamento.', '{execucao,humor}'),
(null, 'personality', 'Luxury Brand Writer', 'Voz sofisticada e aspiracional, menos é mais, foco em exclusividade e desejo.', '{execucao,luxo}')
on conflict do nothing;
