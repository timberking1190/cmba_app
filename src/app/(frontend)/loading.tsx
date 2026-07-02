/*
 * Default route group loading state. Shown while a (frontend) page that does not
 * define its own loading.tsx streams its data. A page shaped skeleton keeps the
 * layout stable instead of a spinner on a blank page.
 *
 * Copy rule: no em or en dashes anywhere.
 */

import { PageSkeleton } from '@/components/feedback/Skeletons'

export default function FrontendLoading() {
  return <PageSkeleton />
}
