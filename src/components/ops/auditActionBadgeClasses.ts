/** Classes Tailwind pour badges d’action audit (domaine AUDIT). */
export const AUDIT_ACTION_BADGE_CLASSES: Record<string, string> = {
	LOGIN: "bg-emerald-100 text-emerald-800",
	LOGOUT: "bg-gray-100 text-gray-800",
	CREATE: "bg-blue-100 text-blue-800",
	UPDATE: "bg-amber-100 text-amber-800",
	DELETE: "bg-red-100 text-red-800",
	READ: "bg-violet-100 text-violet-800",
	EXECUTE: "bg-indigo-100 text-indigo-800",
	REFRESH_TOKEN: "bg-pink-100 text-pink-800",
	KYC_CLIENT_CREATED: "bg-cyan-100 text-cyan-800",
	KYC_SUBMITTED: "bg-cyan-100 text-cyan-800",
	KYC_VERIFIED: "bg-emerald-100 text-emerald-800",
	KYC_REJECTED: "bg-rose-100 text-rose-800",
	KYC_CHECK_CREATED: "bg-sky-100 text-sky-800",
	KYC_LIST_SCREENING_RUN: "bg-violet-100 text-violet-800",
	KYC_SANCTIONS_SCREENING_RUN: "bg-rose-100 text-rose-800",
	KYC_PEP_SCREENING_RUN: "bg-purple-100 text-purple-800",
	KYC_RISK_ASSESSMENT_RUN: "bg-fuchsia-100 text-fuchsia-800",
	KYC_EMAIL_REVIEW_SET: "bg-teal-100 text-teal-800",
	KYC_PROFILE_REVIEW_SET: "bg-amber-100 text-amber-800",
	KYC_IDENTITY_REVIEW_SET: "bg-lime-100 text-lime-800",
	KYC_DOCUMENT_REVIEW_SET: "bg-orange-100 text-orange-800",
	KYC_CLIENT_PERSONAL_INFO_UPDATED: "bg-yellow-100 text-yellow-800",
	KYC_CLIENT_ADDRESS_ADDED: "bg-sky-100 text-sky-800",
	KYC_CLIENT_ADDRESS_UPDATED: "bg-blue-100 text-blue-800",
	KYC_COMPLIANCE_TASK_CREATED: "bg-blue-100 text-blue-800",
	KYC_COMPLIANCE_TASK_PATCHED: "bg-yellow-100 text-yellow-800",

	// AML (voir services aml/* — logEvent action codes)
	AML_CASE_CREATED: "bg-blue-100 text-blue-800",
	AML_CASE_NOTE_ADDED: "bg-sky-100 text-sky-800",
	AML_CASE_STATUS: "bg-amber-100 text-amber-800",
	AML_DECLARATION_DRAFT: "bg-violet-100 text-violet-800",
	AML_DECLARATION_UPDATED: "bg-violet-100 text-violet-800",
	AML_DECLARATION_SUBMITTED: "bg-violet-200 text-violet-900",
	AML_DECLARATION_ACKNOWLEDGED: "bg-purple-200 text-purple-900",
	AML_DECLARATION_CLOSED: "bg-slate-200 text-slate-800",
	AML_DECLARATION_VIEWED: "bg-slate-100 text-slate-700",
	AML_DECLARATION_ATTACHMENT: "bg-indigo-100 text-indigo-800",
	AML_ALERT_CREATED: "bg-cyan-100 text-cyan-800",
	AML_ALERT_MANUAL_CREATED: "bg-teal-100 text-teal-800",
	AML_ALERT_ASSIGNED: "bg-indigo-100 text-indigo-800",
	AML_ALERT_STATUS: "bg-orange-100 text-orange-800",
	AML_ALERT_CLOSED: "bg-emerald-100 text-emerald-800",
	AML_RISK_RECOMPUTED: "bg-fuchsia-100 text-fuchsia-800",
	AML_RULE_DEFINITION_CREATED: "bg-blue-100 text-blue-800",
	AML_RULE_DEFINITION_UPDATED: "bg-amber-100 text-amber-800",
	AML_RULE_DEFINITION_DELETED: "bg-red-100 text-red-800",
	AML_RULE_VERSION_PUBLISHED: "bg-emerald-100 text-emerald-800",
	AML_RULE_VERSION_PATCHED: "bg-yellow-100 text-yellow-800"
};

export function getAuditActionBadgeClass(action: string): string {
	const mapped = AUDIT_ACTION_BADGE_CLASSES[action];
	if (mapped) return mapped;
	/** Codes AML futurs : badge coloré par défaut (évite le gris « inconnu » sur /aml/audit-trail). */
	if (action.startsWith("AML_")) return "bg-teal-100 text-teal-800";
	return "bg-gray-100 text-gray-800";
}
