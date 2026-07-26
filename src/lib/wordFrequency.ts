// Portuguese stopwords — filtered out before counting so results are actual
// content words ("demora", "atendimento") instead of "de", "que", "não"...
const STOPWORDS = new Set([
  'a', 'o', 'e', 'é', 'de', 'do', 'da', 'em', 'um', 'uma', 'uns', 'umas', 'para', 'com', 'não', 'os', 'as',
  'no', 'na', 'nos', 'nas', 'se', 'por', 'mais', 'dos', 'das', 'como', 'mas', 'ao', 'aos', 'à', 'às', 'ele',
  'ela', 'eles', 'elas', 'eu', 'tu', 'você', 'vocês', 'nós', 'meu', 'minha', 'meus', 'minhas', 'seu', 'sua',
  'seus', 'suas', 'nosso', 'nossa', 'nossos', 'nossas', 'que', 'qual', 'quem', 'quando', 'onde', 'muito',
  'muita', 'muitos', 'muitas', 'já', 'só', 'também', 'até', 'isso', 'isto', 'aquilo', 'esse', 'essa', 'esses',
  'essas', 'este', 'esta', 'estes', 'estas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'entre', 'depois',
  'antes', 'sem', 'mesmo', 'mesma', 'foi', 'foram', 'ser', 'está', 'estão', 'estava', 'estavam', 'tem', 'têm',
  'ter', 'tinha', 'sou', 'somos', 'são', 'era', 'eram', 'bem', 'lá', 'ali', 'aqui', 'num', 'numa', 'nem',
  'pelo', 'pela', 'pelos', 'pelas', 'dele', 'dela', 'deles', 'delas', 'lhe', 'lhes', 'me', 'te', 'nos2', 'vos',
  'sim', 'nao', 'ainda', 'todo', 'toda', 'todos', 'todas', 'outro', 'outra', 'outros', 'outras', 'algum',
  'alguma', 'alguns', 'algumas', 'cada', 'seja', 'ou', 'vez', 'tudo', 'nada', 'coisa', 'assim', 'porque',
  'pois', 'então', 'aí', 'the', 'and', 'for', 'with', 'was', 'that', 'this',
])

export interface WordStat {
  word: string
  count: number
  docPercent: number
}

/**
 * Ranks the most frequent meaningful words across a list of texts. `docPercent`
 * is the share of texts that mention the word at least once — the framing
 * people actually care about ("76% menciona 'demora'"), not raw token counts.
 */
export function topWords(texts: (string | null | undefined)[], topN = 10): WordStat[] {
  const docs = texts.filter((t): t is string => !!t && t.trim().length > 0)
  if (docs.length === 0) return []

  const docFreq: Record<string, number> = {}
  for (const doc of docs) {
    const words = doc
      .toLowerCase()
      .normalize('NFC')
      .match(/[a-zà-öø-ÿ]+/g) ?? []
    const uniqueInDoc = new Set(words.filter(w => w.length >= 4 && !STOPWORDS.has(w)))
    for (const w of uniqueInDoc) docFreq[w] = (docFreq[w] ?? 0) + 1
  }

  return Object.entries(docFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count, docPercent: Math.round((count / docs.length) * 100) }))
}
