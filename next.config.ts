import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow opening the dev server from other devices on the local network
  // (tablet, phone, or the Mac's own LAN address) so client-side JS loads.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  // Everything in this app is per-user, authenticated data, so every page is
  // rendered dynamically. Cache Components are therefore left off for now.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
