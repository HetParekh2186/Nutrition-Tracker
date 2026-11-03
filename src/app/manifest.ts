import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mise",
    short_name: "Mise",
    description: "A nutrition tracker that learns what you eat.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#f7f4ee",
    theme_color: "#f7f4ee",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Today", url: "/today" },
      { name: "For You", url: "/for-you" },
      { name: "Recipes", url: "/recipes" },
    ],
  };
}
