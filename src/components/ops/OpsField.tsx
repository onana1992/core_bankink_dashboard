"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type OpsFieldProps = {
	label: ReactNode;
	htmlFor?: string;
	children: ReactNode;
	className?: string;
};

/** Label + contrôle espacés comme sur les filtres OPS. */
export function OpsField({ label, htmlFor, children, className }: OpsFieldProps) {
	return (
		<div className={cn("min-w-0", className)}>
			<label htmlFor={htmlFor} className="block text-sm font-medium text-ops-fg mb-2">
				{label}
			</label>
			{children}
		</div>
	);
}
