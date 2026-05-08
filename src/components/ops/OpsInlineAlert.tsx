"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type OpsInlineAlertVariant = "error" | "warning" | "info" | "success";

type OpsInlineAlertProps = {
	children: ReactNode;
	variant?: OpsInlineAlertVariant;
	className?: string;
	role?: "alert" | "status";
};

const variantClass: Record<OpsInlineAlertVariant, string> = {
	error: "bg-red-50 border-red-300 text-red-900",
	warning: "bg-amber-50 border-amber-300 text-amber-950",
	info: "bg-blue-50 border-blue-200 text-blue-900",
	success: "bg-emerald-50 border-emerald-200 text-emerald-900"
};

/** Bandeau d’erreur / info aligné OPS (liste, formulaires). */
export function OpsInlineAlert({ children, variant = "error", className, role = "alert" }: OpsInlineAlertProps) {
	return (
		<div
			role={role}
			className={cn("rounded-ops-lg border px-4 py-3 text-sm", variantClass[variant], className)}
		>
			<div className="flex items-start gap-2">{children}</div>
		</div>
	);
}
