import { PageSkeleton, CardGridSkeleton } from '@/components/feedback/Skeletons'

// Covers /ref and every ref subpage via Next hierarchical loading boundaries.
export default function RefLoading() {
  return <PageSkeleton body={<CardGridSkeleton count={6} />} />
}
