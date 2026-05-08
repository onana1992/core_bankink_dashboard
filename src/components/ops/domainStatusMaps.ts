import type { OpsAmlStatusCategory, OpsKycStatusCategory } from "@/types/ui";

const KYC_CLIENT: Record<string, string> = {
	VERIFIED: "bg-emerald-100 text-emerald-800",
	DRAFT: "bg-amber-100 text-amber-800",
	REJECTED: "bg-rose-100 text-rose-800",
	BLOCKED: "bg-slate-200 text-slate-800",
	PENDING_REVIEW: "bg-sky-100 text-sky-800"
};

const KYC_CHECK: Record<string, string> = {
	PASS: "bg-emerald-100 text-emerald-800",
	FAIL: "bg-rose-100 text-rose-800",
	REVIEW: "bg-amber-100 text-amber-800"
};

const KYC_TASK: Record<string, string> = {
	OPEN: "bg-sky-100 text-sky-800",
	DONE: "bg-emerald-100 text-emerald-800",
	CANCELLED: "bg-gray-100 text-gray-700"
};

const AML_ALERT_STATUS: Record<string, string> = {
	NEW: "bg-sky-100 text-sky-800",
	ASSIGNED: "bg-indigo-100 text-indigo-800",
	UNDER_REVIEW: "bg-amber-100 text-amber-800",
	ESCALATED: "bg-orange-100 text-orange-800",
	CLOSED: "bg-gray-100 text-gray-700"
};

const AML_ALERT_SEVERITY: Record<string, string> = {
	INFO: "bg-slate-100 text-slate-700",
	LOW: "bg-emerald-50 text-emerald-800",
	MEDIUM: "bg-amber-100 text-amber-800",
	HIGH: "bg-orange-100 text-orange-800",
	CRITICAL: "bg-rose-100 text-rose-900 font-semibold"
};

const AML_CASE_STATUS: Record<string, string> = {
	OPEN: "bg-sky-100 text-sky-800",
	IN_REVIEW: "bg-amber-100 text-amber-800",
	ESCALATED: "bg-orange-100 text-orange-800",
	CLOSED: "bg-gray-100 text-gray-700"
};

export function kycStatusBadgeClass(category: OpsKycStatusCategory, code: string): string {
	switch (category) {
		case "client":
			return KYC_CLIENT[code] ?? "bg-gray-100 text-gray-800";
		case "check":
			return KYC_CHECK[code] ?? "bg-gray-100 text-gray-800";
		case "task":
			return KYC_TASK[code] ?? "bg-gray-100 text-gray-800";
		default:
			return "bg-gray-100 text-gray-800";
	}
}

export function amlStatusBadgeClass(category: OpsAmlStatusCategory, code: string): string {
	switch (category) {
		case "alert_status":
			return AML_ALERT_STATUS[code] ?? "bg-gray-100 text-gray-800";
		case "alert_severity":
			return AML_ALERT_SEVERITY[code] ?? "bg-gray-100 text-gray-800";
		case "case_status":
			return AML_CASE_STATUS[code] ?? "bg-gray-100 text-gray-800";
		default:
			return "bg-gray-100 text-gray-800";
	}
}
