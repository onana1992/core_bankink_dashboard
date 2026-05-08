"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OPS_CARD_HEADER, OPS_CARD_SHELL } from "@/components/ops/opsClasses";

type OpsTableCardProps = {
	title?: ReactNode;
	/** Contenu sous l’en-tête (souvent tableau + pagination). */
	children: ReactNode;
	className?: string;
	headerClassName?: string;
};

/** Carte liste / tableau : en-tête + corps alignés sur le design OPS. */
export function OpsTableCard({ title, children, className, headerClassName }: OpsTableCardProps) {
	return (
		<div className={cn(OPS_CARD_SHELL, className)}>
			{title ? (
				<div className={cn(OPS_CARD_HEADER, headerClassName)}>
					<h2 className="text-lg font-semibold text-ops-fg">{title}</h2>
				</div>
			) : null}
			{children}
		</div>
	);
}
