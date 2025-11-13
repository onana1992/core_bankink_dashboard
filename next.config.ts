import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Ensure Next.js uses the project repo root for output file tracing (silences lockfile root warning)
  outputFileTracingRoot: path.join(process.cwd(), ".."),
};

export default nextConfig;
