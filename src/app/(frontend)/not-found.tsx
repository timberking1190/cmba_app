import { ErrorState } from "@/components/states/ErrorState";

/*
 * 404 for the public site. The only not-found.tsx that existed before this belongs
 * to the Payload admin, so a mistyped or dead public URL rendered nothing at all.
 *
 * No retry action here. Reloading a URL that does not exist produces the same 404,
 * and offering a button that cannot work is worse than offering none.
 */
export default function FrontendNotFound() {
  return (
    <ErrorState
      title="We could not find that page"
      body="The link may be out of date, or the address may have a typo in it. The schedule, standings and rules are all reachable from the home page."
    />
  );
}
