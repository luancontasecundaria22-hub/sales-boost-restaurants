import LegalPage from './LegalPage'
import { TERMS_OF_USE } from './legalContent'

export default function TermsOfUsePage() {
  return <LegalPage doc={TERMS_OF_USE} other={{ label: 'Ver a Política de Privacidade', to: '/privacidade' }} />
}
