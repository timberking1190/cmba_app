import { PageSkeleton, ListSkeleton } from '@/components/feedback/Skeletons'

export default function ImportLoading() {
  return <PageSkeleton body={<ListSkeleton rows={5} />} />
}
