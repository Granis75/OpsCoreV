import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'

export function Teams() {
  return (
    <PageSection
      title="Teams"
      description="Base route pour brancher la gestion des equipes, des roles et des flux de coordination."
    >
      <SurfaceCard
        title="Module initialise"
        description="La route, le layout et la zone de contenu sont prets pour les composants produit du domaine teams."
      />
    </PageSection>
  )
}
