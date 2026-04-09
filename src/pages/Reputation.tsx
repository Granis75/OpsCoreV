import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'

export function Reputation() {
  return (
    <PageSection
      title="Reputation"
      description="Base route pour brancher le suivi de satisfaction, les avis et les signaux qualite."
    >
      <SurfaceCard
        title="Module initialise"
        description="La route, le layout et la zone de contenu sont prets pour les composants produit du domaine reputation."
      />
    </PageSection>
  )
}
