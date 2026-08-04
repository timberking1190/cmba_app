import { PageSkeleton, CardGridSkeleton } from '@/components/feedback/Skeletons'

// Covers /coach and every coach subpage via Next hierarchical loading boundaries.
export default function CoachLoading() {
  return <PageSkeleton body={<CardGridSkeleton count={6} />} />
}
