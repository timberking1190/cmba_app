import { PageSkeleton, CardGridSkeleton } from '@/components/feedback/Skeletons'

export default function ChallengesLoading() {
  return <PageSkeleton body={<CardGridSkeleton count={6} />} />
}
