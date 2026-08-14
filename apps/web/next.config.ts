import type { NextConfig } from "next";

const demo = process.env.ISOMILL_DEMO === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: demo ? "export" : undefined,
  basePath: basePath || undefined,
  trailingSlash: demo,
  images: { unoptimized: true },
  transpilePackages: ["@isomill/catalogue", "@isomill/schema"],
  env: {
    NEXT_PUBLIC_ISOMILL_DEMO: demo ? "1" : "",
  },
};

export default nextConfig;
