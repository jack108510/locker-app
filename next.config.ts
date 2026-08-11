import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "1";

const nextConfig: NextConfig = {
  output: isGithubPages ? "export" : undefined,
  basePath: isGithubPages ? "/locker-app" : undefined,
  assetPrefix: isGithubPages ? "/locker-app/" : undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
