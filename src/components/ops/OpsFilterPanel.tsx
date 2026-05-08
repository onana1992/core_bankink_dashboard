"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OPS_CARD_SHELL, OPS_FILTER_GRID } from "@/components/ops/opsClasses";

type OpsFilterPanelProps = {
	title: ReactNode;
	icon?: ReactNode;
	children: ReactNode;
	className?: string;
	gridClassName?: string;
};

/** Panneau de filtres — surface et grille responsive standard. */
export function OpsFilterPanel({ title, icon, children, className, gridClassName }: OpsFilterPanelProps) {
	return (
		<div className={cn(OPS_CARD_SHELL, "p-5 sm:p-6", className)}>
			<div className="flex items-center gap-2 mb-4">
				{icon}
				<h2 className="text-lg font-semibold text-ops-fg">{title}</h2>
			</div>
			<div className={cn(OPS_FILTER_GRID, gridClassName)}>{children}</div>
		</div>
	);
}
