import { ImageResponse } from "next/og";

import { Mark } from "@/lib/pwa/mark";

const SIZES = { "192": 192, "512": 512, maskable: 512 } as const;

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  if (!(size in SIZES)) return new Response("Not found", { status: 404 });
  const px = SIZES[size as keyof typeof SIZES];
  // Maskable icons get cropped to a circle; keep the mark in the middle 80%.
  return new ImageResponse(
    <Mark size={px} inset={size === "maskable" ? 0.2 : 0} />,
    { width: px, height: px },
  );
}
