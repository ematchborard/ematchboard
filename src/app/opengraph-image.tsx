import { OG_CONTENT_TYPE, OG_SIZE, siteOgImage } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return siteOgImage();
}
