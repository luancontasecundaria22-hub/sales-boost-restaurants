import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export type Lang = 'pt' | 'en'

interface LanguageCtx {
  lang: Lang
  setLang: (l: Lang) => void
}

const LanguageContext = createContext<LanguageCtx>({ lang: 'pt', setLang: () => {} })

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('sb_lang')
    return (saved === 'en' ? 'en' : 'pt') as Lang
  })

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('sb_lang', l)
  }

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>
}

export function useLang() {
  return useContext(LanguageContext)
}
