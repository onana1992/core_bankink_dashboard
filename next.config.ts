import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
	// Ensure Next.js uses the project repo root for output file tracing (silences lockfile root warning)
	outputFileTracingRoot: path.join(process.cwd(), ".."),
	experimental: {
		// Disable Lightning CSS to avoid native binary/wasm resolution issues on Windows
		optimizeCss: false
	},
	env: {
		CSS_TRANSFORMER_WASM: ""
	}
};

export default nextConfig;
