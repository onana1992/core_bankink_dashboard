"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import { OpsPageHeader } from "@/components/ops";
import { OPS_CARD_SHELL, OPS_PAGE_STACK } from "@/components/ops/opsClasses";

export interface OnboardingShellStep {
	id: string;
	title: string;
}

export interface OnboardingShellProps {
	title: string;
	subtitle?: string;
	/** Lien liste ou hub parent */
	backHref: string;
	backLabel: string;
	/** Ex. passer vers l’autre variante PERSON / ENTREPRISE */
	alternateHref?: string;
	alternateLabel?: string;
	steps: OnboardingShellStep[];
	activeStepIndex: number;
	children: ReactNode;
	className?: string;
}

/** En-tête aligné OPS (worklist clients) — pleine largeur dans la zone principale. */
export default function OnboardingShell({
	title,
	subtitle,
	backHref,
	backLabel,
	alternateHref,
	alternateLabel,
	steps,
	activeStepIndex,
	children,
	className = ""
}: OnboardingShellProps) {
	const safeIdx = Math.max(0, Math.min(activeStepIndex, Math.max(steps.length - 1, 0)));
	return (
		<div className={`${OPS_PAGE_STACK} w-full min-w-0 ${className}`}>
			<div>
				<Link
					href={backHref}
					className="inline-flex items-center gap-1.5 text-sm font-medium text-ops-fg-muted transition hover:text-ops-fg"
				>
					<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{backLabel}
				</Link>
			</div>

			<OpsPageHeader
				title={title}
				description={subtitle}
				actions={
					alternateHref && alternateLabel ? (
						<Link href={alternateHref}>
							<Button type="button" variant="outline" className="shrink-0">
								{alternateLabel}
							</Button>
						</Link>
					) : undefined
				}
			/>

			<div className={`${OPS_CARD_SHELL} p-3`}>
				<nav aria-label="Progression onboarding" className="flex gap-2 overflow-x-auto pb-1">
					{steps.map((s, i) => {
						const done = i < safeIdx;
						const current = i === safeIdx;
						return (
							<div
								key={s.id}
								className={`flex min-w-[7.5rem] flex-1 flex-col rounded-xl px-3 py-2 transition ${
									current
										? "bg-slate-900 text-white shadow-sm"
										: done
											? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70"
											: "bg-ops-surface-muted text-ops-fg-muted ring-1 ring-ops-border"
								}`}
							>
								<span className="text-[0.65rem] font-semibold uppercase tracking-wider opacity-80">
									{i + 1}/{steps.length}
								</span>
								<span className={`text-xs font-medium leading-snug ${current ? "text-white" : ""}`}>{s.title}</span>
							</div>
						);
					})}
				</nav>
			</div>

			<div className="space-y-6">{children}</div>
		</div>
	);
}
