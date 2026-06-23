import Image from "next/image";
import { CALGARY_IMAGES, type CalgaryImageKey } from "@/lib/calgaryImages";

/*
 * Split image/text band — a Calgary/basketball photo on one side, content on the
 * other. Reveals on scroll (.reveal). Use mid-page to break up dense sections.
 * Server component.
 */
export function PhotoBand({
  image,
  side = "left",
  eyebrow,
  title,
  children,
  className = "",
}: {
  image: CalgaryImageKey;
  side?: "left" | "right";
  eyebrow?: string;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const img = CALGARY_IMAGES[image];
  return (
    <div className={`reveal grid md:grid-cols-2 border border-white/12 overflow-hidden ${className}`}>
      <div className={`relative min-h-[240px] md:min-h-[360px] ${side === "right" ? "md:order-2" : ""}`}>
        <Image
          src={img.src}
          alt={img.alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover duotone-grade"
        />
        <div className="absolute inset-0 bg-cmba-red/10 mix-blend-overlay" />
      </div>
      <div className="p-7 lg:p-10 flex flex-col justify-center bg-cmba-black-card/60 backdrop-blur-sm">
        {eyebrow && <div className="label-sm text-cmba-red mb-3">{eyebrow}</div>}
        {title && (
          <h3 className="font-display font-black uppercase tracking-tighter2 text-2xl lg:text-3xl leading-[0.95] mb-3">{title}</h3>
        )}
        {children && <div className="text-cmba-grey-light/90 leading-relaxed space-y-3">{children}</div>}
      </div>
    </div>
  );
}
