"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { OpsAmlStatusCategory, OpsKycStatusCategory, OpsStatusDomain } from "@/types/ui";
import { getAuditActionBadgeClass } from "@/components/ops/auditActionBadgeClasses";
import { amlStatusBadgeClass, kycStatusBadgeClass } from "@/components/ops/domainStatusMaps";

type DomainStatusBadgeProps = {
	domain: OpsStatusDomain;
	/** Code métier (ex: VERIFIED, PASS, NEW, LOGIN). */
	code: string;
	category?: OpsKycStatusCategory | OpsAmlStatusCategory;
	children?: ReactNode;
	className?: string;
};

/**
 * Badge d’état normalisé par domaine (KYC / AML / AUDIT).
 * Pour KYC/AML, passez `category` pour la bonne cartographie couleur.
 */
export function DomainStatusBadge({ domain, code, category = "client", children, className }: DomainStatusBadgeProps) {
	let tone: string;
	if (domain === "audit") {
		tone = getAuditActionBadgeClass(code);
	} else if (domain === "kyc") {
		tone = kycStatusBadgeClass(category as OpsKycStatusCategory, code);
	} else {
		tone = amlStatusBadgeClass(category as OpsAmlStatusCategory, code);
	}

	return (
		<span
			className={cn(
				"inline-flex items-center max-w-full truncate rounded-md px-2 py-1 text-xs font-medium",
				tone,
				className
			)}
			title={typeof children === "string" ? children : code}
		>
			{children ?? code}
		</span>
	);
}
