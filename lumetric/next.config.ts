import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      alasql: "./node_modules/alasql/dist/alasql.min.js",
      "react-native": false,
      "react-native-fs": false,
      "react-native-fetch-blob": false,
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

