import { PageSkeleton, CardGridSkeleton } from '@/components/feedback/Skeletons'

export default function AthleteLoading() {
  return <PageSkeleton body={<CardGridSkeleton count={6} />} />
}
