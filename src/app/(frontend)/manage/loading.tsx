import { PageSkeleton, TableSkeleton } from '@/components/feedback/Skeletons'

// Covers /manage and its subpages via Next hierarchical loading boundaries.
export default function ManageLoading() {
  return <PageSkeleton body={<TableSkeleton rows={8} cols={6} />} />
}
