import { OG_CONTENT_TYPE, OG_SIZE, worldsOgImage } from "@/lib/og-image";
import { WORLDS_YEAR } from "@/lib/worlds";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return worldsOgImage(WORLDS_YEAR);
}
