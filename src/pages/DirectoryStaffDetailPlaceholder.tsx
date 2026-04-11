import { Navigate, useParams } from 'react-router-dom'

export function DirectoryStaffDetailPlaceholder() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return <Navigate to="/app/directory" replace />
  }

  return <Navigate to={`/app/directory?staff=${encodeURIComponent(id)}`} replace />
}
