import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'

export function DirectoryStaffDetailPlaceholder() {
  const { id } = useParams<{ id: string }>()

  return (
    <PageSection
      title="Staff profile"
      description="Placeholder route for the future staff detail view in the shared directory."
    >
      <Link
        to="/app/directory"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to directory</span>
      </Link>

      <SurfaceCard
        title="Detail page coming soon"
        description={
          id
            ? `Staff member ${id} is ready for a future dedicated detail page.`
            : 'This staff member is ready for a future dedicated detail page.'
        }
      />
    </PageSection>
  )
}
