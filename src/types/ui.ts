/** Types partagés pour le design system OPS (KYC / AML / audit métier). */

export type OpsStatusDomain = "kyc" | "aml" | "audit";

/** Sous-catégorie métier pour la cartographie couleur / sémantique. */
export type OpsKycStatusCategory = "client" | "check" | "task";
export type OpsAmlStatusCategory = "alert_status" | "alert_severity" | "case_status";

export type OpsToastType = "success" | "error" | "info" | "warning";

export type OpsModalSize = "sm" | "md" | "lg" | "xl";
