import Image from "next/image";
import { CALGARY_IMAGES, type CalgaryImageKey } from "@/lib/calgaryImages";

/*
 * Full-bleed photo hero with the brand "duotone-grade" treatment + dark/red
 * overlays so any Calgary/basketball photo reads on the dark editorial theme and
 * keeps text legible. Content sits bottom-left. Use at the top of a sub-page that
 * only had a plain text header. Server component (no client JS).
 */
export function PhotoHero({
  image,
  eyebrow,
  title,
  accent,
  subtitle,
  children,
  priority = true,
  className = "",
}: {
  image: CalgaryImageKey;
  eyebrow?: string;
  title: React.ReactNode;
  accent?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  priority?: boolean;
  className?: string;
}) {
  const img = CALGARY_IMAGES[image];
  return (
    <section className={`relative isolate overflow-hidden flex items-end min-h-[clamp(360px,52vh,560px)] ${className}`}>
      <Image
        src={img.src}
        alt={img.alt}
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover duotone-grade -z-10"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-cmba-black via-cmba-black/55 to-cmba-black/25" />
      <div className="absolute inset-0 -z-10 bg-cmba-red/10 mix-blend-overlay" />
      <div className="relative z-10 w-full px-5 md:px-10 lg:px-14 pb-10 lg:pb-16 pt-24">
        <div className="max-w-7xl mx-auto">
          {eyebrow && <div className="label-sm text-cmba-red mb-3">{eyebrow}</div>}
          <h1 className="font-display font-black uppercase tracking-tighter2 leading-[0.88] text-[clamp(34px,7vw,84px)]">
            {title}
            {accent && <> <span className="text-cmba-red">{accent}</span></>}
          </h1>
          {subtitle && (
            <p className="mt-4 max-w-[54ch] text-cmba-grey-light/90 text-base md:text-lg leading-relaxed">{subtitle}</p>
          )}
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </section>
  );
}
