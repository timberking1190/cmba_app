import { PageSkeleton, ListSkeleton } from '@/components/feedback/Skeletons'

export default function CalendarLoading() {
  return <PageSkeleton body={<ListSkeleton rows={7} />} />
}
