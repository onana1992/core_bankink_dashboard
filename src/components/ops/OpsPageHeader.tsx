"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type OpsPageHeaderProps = {
	title: ReactNode;
	description?: ReactNode;
	/** Actions principales (boutons à droite). */
	actions?: ReactNode;
	className?: string;
};

export function OpsPageHeader({ title, description, actions, className }: OpsPageHeaderProps) {
	return (
		<div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
			<div className="min-w-0">
				<h1 className="text-2xl sm:text-3xl font-bold text-ops-fg tracking-tight">{title}</h1>
				{description ? (
					<p className="text-ops-fg-muted mt-1 text-sm sm:text-base">{description}</p>
				) : null}
			</div>
			{actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
		</div>
	);
}
