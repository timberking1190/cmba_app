/*
 * CMBA+ logotype. The "+" is a raised red superscript on the "CMBA" wordmark.
 * Caller supplies the font/size via className; the "+" sizes relative to it.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      CMBA<span className="text-cmba-red align-super text-[0.6em] font-black leading-none">+</span>
    </span>
  );
}
