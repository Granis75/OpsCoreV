import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'

export function Maintenance() {
  return (
    <PageSection
      title="Maintenance"
      description="Base route pour brancher les interventions, le planning et le suivi de disponibilite."
    >
      <SurfaceCard
        title="Module initialise"
        description="La route, le layout et la zone de contenu sont prets pour les composants produit du domaine maintenance."
      />
    </PageSection>
  )
}
