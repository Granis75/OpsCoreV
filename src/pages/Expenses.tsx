import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'

export function Expenses() {
  return (
    <PageSection
      title="Expenses"
      description="Base route pour brancher les depenses, validations et justificatifs."
    >
      <SurfaceCard
        title="Module initialise"
        description="La route, le layout et la zone de contenu sont prets pour les composants produit du domaine expenses."
      />
    </PageSection>
  )
}
