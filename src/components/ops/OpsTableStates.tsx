"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OPS_CARD_SHELL } from "@/components/ops/opsClasses";

type OpsLoadingStateProps = {
	message: ReactNode;
	className?: string;
	embedded?: boolean;
};

export function OpsLoadingState({ message, className, embedded }: OpsLoadingStateProps) {
	if (embedded) {
		return (
			<div className={cn("p-10 sm:p-12 text-center", className)}>
				<div
					className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-ops-border border-t-ops-ring"
					aria-hidden
				/>
				<p className="mt-4 text-sm text-ops-fg-muted">{message}</p>
			</div>
		);
	}
	return (
		<div className={cn(OPS_CARD_SHELL, "p-10 sm:p-12 text-center", className)}>
			<div
				className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-ops-border border-t-ops-ring"
				aria-hidden
			/>
			<p className="mt-4 text-sm text-ops-fg-muted">{message}</p>
		</div>
	);
}

type OpsEmptyStateProps = {
	title: ReactNode;
	hint?: ReactNode;
	icon?: ReactNode;
	className?: string;
	embedded?: boolean;
};

export function OpsEmptyState({ title, hint, icon, className, embedded }: OpsEmptyStateProps) {
	if (embedded) {
		return (
			<div className={cn("p-10 sm:p-12 text-center", className)}>
				{icon ? <div className="mb-4 flex justify-center text-ops-fg-muted">{icon}</div> : null}
				<p className="text-ops-fg font-medium">{title}</p>
				{hint ? <p className="text-sm text-ops-fg-muted mt-2">{hint}</p> : null}
			</div>
		);
	}
	return (
		<div className={cn(OPS_CARD_SHELL, "p-10 sm:p-12 text-center", className)}>
			{icon ? <div className="mb-4 flex justify-center text-ops-fg-muted">{icon}</div> : null}
			<p className="text-ops-fg font-medium">{title}</p>
			{hint ? <p className="text-sm text-ops-fg-muted mt-2">{hint}</p> : null}
		</div>
	);
}
