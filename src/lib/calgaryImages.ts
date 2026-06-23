/*
 * Self-hosted Calgary + basketball imagery (Pexels License: free for commercial
 * use, no attribution required, self-hosting permitted). Files live in
 * /public/images/calgary. Use via <PhotoHero image="..."> / <PhotoBand image="...">
 * so alt text and the brand "duotone-grade" treatment stay consistent.
 */
export type CalgaryImage = {
  src: string;
  alt: string;
  orientation: "landscape" | "portrait";
};

export const CALGARY_IMAGES = {
  skylineSunset: {
    src: "/images/calgary/calgary-skyline-sunset.jpg",
    alt: "Downtown Calgary skyline at sunset with the Calgary Tower and the Centre Street Bridge lions",
    orientation: "landscape",
  },
  skylineNight: {
    src: "/images/calgary/calgary-skyline-night.jpg",
    alt: "Downtown Calgary skyline illuminated at night",
    orientation: "landscape",
  },
  aerial: {
    src: "/images/calgary/calgary-aerial.jpg",
    alt: "Aerial view of downtown Calgary, Alberta",
    orientation: "landscape",
  },
  youthOutdoor: {
    src: "/images/calgary/youth-basketball-outdoor.jpg",
    alt: "Two young players dribbling on an outdoor basketball court",
    orientation: "landscape",
  },
  kidsOnCourt: {
    src: "/images/calgary/kids-on-court.jpg",
    alt: "A group of young basketball players on an outdoor court",
    orientation: "landscape",
  },
  studentsOnCourt: {
    src: "/images/calgary/students-on-court.jpg",
    alt: "A youth basketball team standing together under a hoop",
    orientation: "portrait",
  },
  hoopNetSky: {
    src: "/images/calgary/hoop-net-sky.jpg",
    alt: "A red basketball rim and net against a bright sky",
    orientation: "portrait",
  },
  swish: {
    src: "/images/calgary/basketball-swish.jpg",
    alt: "A basketball dropping through the hoop and net",
    orientation: "portrait",
  },
  indoorGym: {
    src: "/images/calgary/indoor-gym.jpg",
    alt: "An empty indoor basketball court with a painted centre circle",
    orientation: "portrait",
  },
} as const;

export type CalgaryImageKey = keyof typeof CALGARY_IMAGES;
