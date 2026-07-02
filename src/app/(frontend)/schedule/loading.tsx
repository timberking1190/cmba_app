import { PageSkeleton, ListSkeleton } from '@/components/feedback/Skeletons'

export default function ScheduleLoading() {
  return <PageSkeleton body={<ListSkeleton rows={7} />} />
}
