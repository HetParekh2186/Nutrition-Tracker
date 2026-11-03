import { ImageResponse } from "next/og";

import { Mark } from "@/lib/pwa/mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<Mark size={180} inset={0.1} />, size);
}
