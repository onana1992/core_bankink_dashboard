import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}"
	],
	theme: {
		extend: {
			borderRadius: {
				"ops-sm": "var(--ops-radius-sm)",
				"ops-md": "var(--ops-radius-md)",
				"ops-lg": "var(--ops-radius-lg)",
				"ops-xl": "var(--ops-radius-xl)"
			},
			boxShadow: {
				"ops-card": "var(--ops-shadow-card)",
				"ops-overlay": "var(--ops-shadow-overlay)"
			},
			colors: {
				ops: {
					border: "var(--ops-border)",
					"border-strong": "var(--ops-border-strong)",
					surface: "var(--ops-surface)",
					"surface-muted": "var(--ops-surface-muted)",
					fg: "var(--ops-fg)",
					"fg-muted": "var(--ops-fg-muted)",
					ring: "var(--ops-ring)",
					kyc: "var(--ops-domain-kyc)",
					aml: "var(--ops-domain-aml)",
					audit: "var(--ops-domain-audit)"
				}
			}
		}
	},
	plugins: []
};

export default config;


