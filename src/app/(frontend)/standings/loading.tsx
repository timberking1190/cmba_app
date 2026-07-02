import { PageSkeleton, TableSkeleton } from '@/components/feedback/Skeletons'

export default function StandingsLoading() {
  return <PageSkeleton body={<TableSkeleton rows={10} cols={7} />} />
}
