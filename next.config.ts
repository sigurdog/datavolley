import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
