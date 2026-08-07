-- Biblioteca: adiciona Emoções, Composição e Componentes por módulo. Cada
-- formato ganha as emoções que fazem sentido, princípios de composição e os
-- blocos (componentes) típicos daquele formato. A IA já usa por módulo.
insert into marketing_ai_knowledge (company_id, module, kind, title, content, tags) values
-- ORGÂNICO — emoção
(null,'organico','emotion','Curiosidade','Deixa uma lacuna que só a legenda ou o próximo slide fecha. Prende a atenção.','{emocao}'),
(null,'organico','emotion','Identificação','"Isso sou eu" — o público se vê na situação. Gera conexão e comentário.','{emocao}'),
(null,'organico','emotion','Aspiração','Mostra o resultado desejado (o depois). Faz o público querer.','{emocao}'),
(null,'organico','emotion','Surpresa','Dado ou virada inesperada. Alto compartilhamento.','{emocao}'),
-- ORGÂNICO — composição
(null,'organico','composition','Regra dos terços','Posiciona o elemento principal nos pontos de força, não no centro morto.','{composicao}'),
(null,'organico','composition','Hierarquia visual','Um ponto focal claro; o resto apoia. O olho sabe pra onde ir.','{composicao}'),
(null,'organico','composition','Contraste','Fundo x objeto, cor x neutro. Faz o assunto saltar.','{composicao}'),
(null,'organico','composition','Respiro','Margem e ar em volta do foco = leitura fácil e ar premium.','{composicao}'),
-- ORGÂNICO — componentes
(null,'organico','component','Capa do carrossel','1º slide com gancho grande — decide se abrem o resto.','{componente}'),
(null,'organico','component','Legenda','Primeira linha prende; corpo entrega valor; fecha com CTA.','{componente}'),
(null,'organico','component','Hashtags','5 a 10 relevantes, misturando nicho e amplas.','{componente}'),
(null,'organico','component','Selo de série','Marca d''água discreta ou selo que dá reconhecimento à série.','{componente}'),
-- STORIES — emoção
(null,'stories','emotion','Proximidade','Bastidor, rosto, dia a dia. Sensação de amizade com a marca.','{emocao}'),
(null,'stories','emotion','Urgência','"Só hoje", "acabando". Story é o canal da urgência real.','{emocao}'),
(null,'stories','emotion','Diversão','Enquete boba, meme, brincadeira. Aumenta resposta e retorno.','{emocao}'),
(null,'stories','emotion','Pertencimento','Faz o público sentir parte (comunidade, cliente VIP).','{emocao}'),
-- STORIES — composição
(null,'stories','composition','Vertical 9:16','Ocupa a tela toda. Elementos importantes longe das bordas (a interface cobre).','{composicao}'),
(null,'stories','composition','Zona segura','Texto e CTA no centro-baixo, fora da área do nome e das reações.','{composicao}'),
(null,'stories','composition','Texto grande','Poucas palavras, fonte grande — leitura em 1-2 segundos.','{composicao}'),
(null,'stories','composition','Movimento','Transições e elementos que se movem seguram a atenção.','{composicao}'),
-- STORIES — componentes
(null,'stories','component','Sticker de enquete/quiz','Interação que alimenta alcance e dá dado de preferência.','{componente}'),
(null,'stories','component','Barra de progresso','Sinaliza a sequência e incentiva assistir até o fim.','{componente}'),
(null,'stories','component','Botão de link','CTA de conversão (WhatsApp, agendamento, página).','{componente}'),
(null,'stories','component','Texto na tela','Legenda embutida — a maioria assiste sem som.','{componente}'),
-- CAMPANHAS — emoção
(null,'campanhas','emotion','Desejo','Foca no resultado sonhado. Base de todo anúncio de conversão.','{emocao}'),
(null,'campanhas','emotion','Medo de perder (FOMO)','Urgência + escassez. Empurra a decisão.','{emocao}'),
(null,'campanhas','emotion','Confiança','Prova social, garantia. Reduz o risco percebido.','{emocao}'),
(null,'campanhas','emotion','Alívio','Mostra a dor resolvida. O anúncio como solução.','{emocao}'),
-- CAMPANHAS — composição
(null,'campanhas','composition','Foco no benefício','1 mensagem visual dominante; nada de poluição.','{composicao}'),
(null,'campanhas','composition','Contraste alto','O criativo compete no feed — precisa saltar na rolagem.','{composicao}'),
(null,'campanhas','composition','Pouco texto na imagem','Texto pesado vai na copy; a imagem comunica rápido.','{composicao}'),
(null,'campanhas','composition','Marca discreta','Logo presente, mas sem roubar o foco do benefício.','{composicao}'),
-- CAMPANHAS — componentes
(null,'campanhas','component','Headline','Frase-título curta com benefício ou número.','{componente}'),
(null,'campanhas','component','Copy primária','Texto do anúncio: dor, solução, prova, CTA.','{componente}'),
(null,'campanhas','component','Criativo','Imagem ou vídeo — o que para a rolagem.','{componente}'),
(null,'campanhas','component','Botão de CTA','Ação clara (Saiba mais, Comprar, Enviar mensagem).','{componente}')
on conflict do nothing;
