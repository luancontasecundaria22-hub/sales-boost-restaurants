import { supabase } from './supabase'

// Tipos de estabelecimento — geridos pelo dono no painel owner (tabela
// `business_types`). A lista abaixo é só um fallback pra nada quebrar se a
// consulta falhar ou a tabela estiver vazia. "Outro" nunca é armazenado: é uma
// opção de escape sempre adicionada na tela, com campo de texto livre.
export const FALLBACK_BUSINESS_TYPES = [
  'Restaurante / Food',
  'Varejo / E-commerce',
  'Serviços',
  'Beleza & Estética',
  'Barbearia',
  'Saúde & Bem-estar',
]

export const OTHER_BUSINESS_TYPE = 'Outro'

export async function fetchBusinessTypes(): Promise<string[]> {
  try {
    const { data } = await supabase.from('business_types').select('label').eq('enabled', true).order('sort')
    const labels = ((data as { label: string }[] | null) ?? []).map(r => r.label)
    return labels.length ? labels : FALLBACK_BUSINESS_TYPES
  } catch {
    return FALLBACK_BUSINESS_TYPES
  }
}
