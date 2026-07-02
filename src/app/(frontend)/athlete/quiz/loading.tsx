import { PageSkeleton, CardGridSkeleton } from '@/components/feedback/Skeletons'

export default function QuizLoading() {
  return <PageSkeleton body={<CardGridSkeleton count={4} cols="sm:grid-cols-2" />} />
}
