import LegalPage from './LegalPage'
import { PRIVACY_POLICY } from './legalContent'

export default function PrivacyPolicyPage() {
  return <LegalPage doc={PRIVACY_POLICY} other={{ label: 'Ver os Termos de Uso', to: '/termos' }} />
}
