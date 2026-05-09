"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import TablePagination, { OPS_TABLE_PAGE_SIZE_OPTIONS } from "@/components/ui/TablePagination";
import Toast from "@/components/ui/Toast";
import { AuditEventsTable } from "@/components/audit/AuditEventsTable";
import { OpsEmptyState, OpsInlineAlert, OpsLoadingState, OpsModal, OpsPageHeader } from "@/components/ops";
import {
	OPS_CARD_HEADER,
	OPS_CARD_SHELL,
	OPS_PAGE_STACK,
	OPS_TABLE,
	OPS_TABLE_WRAP,
	OPS_TD,
	OPS_TH,
	OPS_THEAD,
	OPS_TR_HOVER
} from "@/components/ops/opsClasses";
import { customersApi, accountsApi } from "@/lib/api";
import { customerDetailPath } from "@/lib/customerRoutes";
import { formatAmount } from "@/lib/utils";
import { formatNationalityLabel, getNationalitySelectOptions } from "@/lib/nationalityOptions";
import { ANNUAL_REVENUE_BAND_OPTIONS, LEGAL_FORM_OPTIONS } from "@/data/legalFormOptions";
import { NACE_ACTIVITY_CODE_SUGGESTIONS } from "@/data/naceActivitySuggestions";
import { isValidNaceClassCode, normalizeNaceClassCode } from "@/lib/naceActivityCode";
import {
	isPersonIncomeSourceValue,
	isPersonProfessionValue,
	PERSON_INCOME_SOURCE_VALUES,
	PERSON_PROFESSION_VALUES
} from "@/types/personProfileOptions";
import type {
	AddAddressRequest,
	AddRelatedPersonRequest,
	Address,
	Customer,
	AuditEvent,
	Document,
	DocumentType,
	IdCardSide,
	KycCheck,
	KycCheckResult,
	KycCheckType,
	KycOnboardingRiskAssessmentResponse,
	KycRiskRunDetail,
	KycRiskRunItem,
	PagedResponse,
	RelatedPerson,
	RelatedPersonRole,
	Account,
	UpdateCustomerRequest,
	CustomerType
} from "@/types";

type BusinessProfileFormData = {
	tradeName: string;
	legalForm: string;
	registrationNumber: string;
	incorporationDate: string;
	incorporationCountry: string;
	taxResidenceCountry: string;
	taxIdentificationNumber: string;
	activityCode: string;
	activityDescription: string;
	signingAuthorityNote: string;
	websiteUrl: string;
	employeeCount: string;
	annualRevenueBand: string;
	currenciesUsed: string;
	expectedTransactionProfile: string;
	fundsSource: string;
	accountOpeningPurpose: string;
};

function emptyBusinessProfileForm(): BusinessProfileFormData {
	return {
		tradeName: "",
		legalForm: "",
		registrationNumber: "",
		incorporationDate: "",
		incorporationCountry: "",
		taxResidenceCountry: "",
		taxIdentificationNumber: "",
		activityCode: "",
		activityDescription: "",
		signingAuthorityNote: "",
		websiteUrl: "",
		employeeCount: "",
		annualRevenueBand: "",
		currenciesUsed: "",
		expectedTransactionProfile: "",
		fundsSource: "",
		accountOpeningPurpose: ""
	};
}

function customerToBusinessProfileForm(c: Customer): BusinessProfileFormData {
	const stripScheme = (url: string | null | undefined) => {
		const s = url?.trim();
		if (!s) return "";
		return s.replace(/^https?:\/\//i, "");
	};
	return {
		tradeName: c.tradeName ?? "",
		legalForm: c.legalForm ?? "",
		registrationNumber: c.registrationNumber ?? "",
		incorporationDate: c.incorporationDate ? c.incorporationDate.slice(0, 10) : "",
		incorporationCountry: c.incorporationCountry ?? "",
		taxResidenceCountry: c.taxResidenceCountry ?? "",
		taxIdentificationNumber: c.taxIdentificationNumber ?? "",
		activityCode: c.activityCode ?? "",
		activityDescription: c.activityDescription ?? "",
		signingAuthorityNote: c.signingAuthorityNote ?? "",
		websiteUrl: stripScheme(c.websiteUrl),
		employeeCount: c.employeeCount != null && !Number.isNaN(Number(c.employeeCount)) ? String(c.employeeCount) : "",
		annualRevenueBand: c.annualRevenueBand ?? "",
		currenciesUsed: c.currenciesUsed ?? "",
		expectedTransactionProfile: c.expectedTransactionProfile ?? "",
		fundsSource: c.fundsSource ?? "",
		accountOpeningPurpose: c.accountOpeningPurpose ?? ""
	};
}

function sanitizeReviewerNote(raw?: string | null): string | null {
	if (!raw) return null;
	const note = raw.trim();
	if (!note) return null;
	// Hide legacy technical marker previously used to store ID card side.
	if (note.startsWith("ID_CARD_SIDE:")) return null;
	return note;
}

const KYC_COMPLIANCE_CHECKS_PAGE_SIZE = 20;

/** Sous-onglets conformité : 1 Revue KYC, 2 Screening PEP & Sanctions, 3 Décision KYC, 4 Historique évaluations, 5 Piste d'audit KYC. */
const COMPLIANCE_INNER_SUBTAB_ORDER = ["review", "screeningChecks", "decision", "riskRunsHistory", "auditTrail"] as const;
type ComplianceInnerTab = (typeof COMPLIANCE_INNER_SUBTAB_ORDER)[number];

function kycCheckResultBadgeVariant(result: KycCheckResult): "success" | "danger" | "warning" {
	if (result === "PASS") return "success";
	if (result === "FAIL") return "danger";
	return "warning";
}

function kycCheckResultLabel(t: TFunction, result: KycCheckResult): string {
	const key = `customer.detail.kyc.checkResult.${result}`;
	const lbl = t(key);
	return lbl === key ? result : lbl;
}

function kycCheckTypeRowAccent(type: KycCheckType): string {
	switch (type) {
		case "SANCTIONS_SCREENING":
		case "PEP_SCREENING":
			return "border-l-[3px] border-l-rose-500";
		case "ID_VERIFICATION":
			return "border-l-[3px] border-l-sky-600";
		case "ADDRESS_VALIDATION":
			return "border-l-[3px] border-l-violet-500";
		default:
			return "border-l-[3px] border-l-slate-300";
	}
}

function translatedCustomerStatus(t: TFunction, status: Customer["status"]): string {
	const key = `customer.statuses.${status}`;
	const lbl = t(key);
	return lbl === key ? status : lbl;
}

function documentReviewStatusLabel(t: TFunction, status: string): string {
	const key = `customer.detail.profileDetail.reviewStatus.${status}`;
	const lbl = t(key);
	return lbl === key ? status : lbl;
}

export function CustomerDetailPage({ expectedType }: { expectedType: CustomerType }) {
	const { t, i18n } = useTranslation();
	const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const id = useMemo(() => Number(params?.id), [params]);
	const nationalityOptions = useMemo(() => getNationalitySelectOptions(i18n.language), [i18n.language]);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [customer, setCustomer] = useState<Customer | null>(null);
	const [addresses, setAddresses] = useState<Address[]>([]);
	const [documents, setDocuments] = useState<Document[]>([]);
	const [relatedPersons, setRelatedPersons] = useState<RelatedPerson[]>([]);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [isEditing, setIsEditing] = useState(false);
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
	const [formData, setFormData] = useState<{
		displayName: string;
		firstName: string;
		lastName: string;
		email: string;
		phone: string;
	}>({
		displayName: "",
		firstName: "",
		lastName: "",
		email: "",
		phone: ""
	});
	const [saving, setSaving] = useState(false);

	const [addr, setAddr] = useState<AddAddressRequest>({
		type: "RESIDENTIAL",
		line1: "",
		line2: "",
		city: "",
		state: "",
		postalCode: "",
		country: "CM",
		primaryAddress: true
	});
	const [addrSubmitting, setAddrSubmitting] = useState(false);
	const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
	const [editAddr, setEditAddr] = useState<AddAddressRequest | null>(null);

	const [docType, setDocType] = useState<DocumentType>("ID_CARD");
	const [idCardSide, setIdCardSide] = useState<IdCardSide>("RECTO");
	const [identityDocNumber, setIdentityDocNumber] = useState("");
	const [identityDocExpiresOn, setIdentityDocExpiresOn] = useState("");
	const [docFile, setDocFile] = useState<File | null>(null);
	const [docSubmitting, setDocSubmitting] = useState(false);
	const [reviewingDocId, setReviewingDocId] = useState<number | null>(null);
	const [reviewNote, setReviewNote] = useState<string>("");
	const [reviewSubmitting, setReviewSubmitting] = useState(false);

	const [kycSubmitting, setKycSubmitting] = useState<null | "submit" | "verify" | "reject">(null);
	const [reviewStatusSubmitting, setReviewStatusSubmitting] = useState<null | "email" | "profile" | "identity">(null);
	const [verifyPep, setVerifyPep] = useState<boolean>(false);
	/** N’initialise le PEP « évaluation » depuis le profil qu’au premier chargement du client : évite qu’un `load()` écrase la case après cochage. */
	const evaluationPepInitClientIdRef = useRef<number | null>(null);
	const [kycOnboardingRisk, setKycOnboardingRisk] = useState<KycOnboardingRiskAssessmentResponse | null>(null);
	/** Chargement du snapshot « dernière évaluation » pour clients déjà vérifiés. */
	const [kycLastEvalLoading, setKycLastEvalLoading] = useState(false);
	const [rejectionReason, setRejectionReason] = useState<string>("");

	const kycAllLineReviewsApproved = useMemo(
		() =>
			customer != null &&
			customer.emailReviewStatus === "APPROVED" &&
			customer.profileReviewStatus === "APPROVED" &&
			customer.identityReviewStatus === "APPROVED",
		[customer]
	);
	/** Même règle que l’API : vérification ou rejet KYC final uniquement si les 3 revues sont APPROVED. */
	const canFinalizeKyc = customer != null && customer.status === "PENDING_REVIEW" && kycAllLineReviewsApproved;

	// RelatedPerson states
	const [rpForm, setRpForm] = useState<AddRelatedPersonRequest>({
		role: "UBO",
		firstName: "",
		lastName: "",
		dateOfBirth: "",
		nationalId: "CM",
		ownershipPercent: undefined,
		pepFlag: false
	});
	const [rpSubmitting, setRpSubmitting] = useState(false);
	const [editingRpId, setEditingRpId] = useState<number | null>(null);
	const [editRpForm, setEditRpForm] = useState<AddRelatedPersonRequest | null>(null);

	// État pour gérer les onglets
	const [activeTab, setActiveTab] = useState<string>("overview");
	const [showDocumentUpload, setShowDocumentUpload] = useState(false);

	// État pour l'édition du détail du profil
	const [isEditingProfile, setIsEditingProfile] = useState(false);
	const [profileFormData, setProfileFormData] = useState<{
		firstName: string;
		lastName: string;
		gender: string;
		birthDate: string;
		maritalStatus: string;
		nationality: string;
		taxResidenceCountry: string;
		taxIdentificationNumber: string;
		professionalActivity: string;
		incomeSource: string;
	}>({
		firstName: "",
		lastName: "",
		gender: "",
		birthDate: "",
		maritalStatus: "",
		nationality: "",
		taxResidenceCountry: "",
		taxIdentificationNumber: "",
		professionalActivity: "",
		incomeSource: ""
	});
	const [savingProfile, setSavingProfile] = useState(false);
	const [businessProfileFormData, setBusinessProfileFormData] = useState<BusinessProfileFormData>(emptyBusinessProfileForm());

	const tabs = [
		{ id: "overview", label: t("customer.detail.tabs.overview") },
		{ id: "dossier", label: t("customer.detail.tabs.dossier") },
		{ id: "pieces", label: t("customer.detail.tabs.pieces") },
		{ id: "compliance", label: t("customer.detail.tabs.compliance") },
		{ id: "accounts", label: t("customer.detail.tabs.accounts") }
	];

	const [kycChecks, setKycChecks] = useState<KycCheck[]>([]);
	const [complianceLoading, setComplianceLoading] = useState(false);
	const [complianceAction, setComplianceAction] = useState<string | null>(null);
	const [decisionPanelScreeningBusy, setDecisionPanelScreeningBusy] = useState(false);
	const [showListScreeningCard, setShowListScreeningCard] = useState(false);

	const [complianceInnerTab, setComplianceInnerTab] = useState<ComplianceInnerTab>("screeningChecks");
	const prevWorklistComplianceRef = useRef<{ tab: string; customerId?: number }>({
		tab: "overview",
		customerId: undefined
	});
	const KYC_AUDIT_TRAIL_PAGE_SIZE = 15;
	const [kycAuditTrailPage, setKycAuditTrailPage] = useState(0);
	const [kycAuditTrailPaged, setKycAuditTrailPaged] = useState<PagedResponse<AuditEvent> | null>(null);
	const [kycAuditTrailLoading, setKycAuditTrailLoading] = useState(false);

	const KYC_RISK_RUNS_PAGE_SIZE = 15;
	const [kycRiskRunsPage, setKycRiskRunsPage] = useState(0);
	const [kycRiskRunsSize, setKycRiskRunsSize] = useState(KYC_RISK_RUNS_PAGE_SIZE);
	const [kycRiskRunsPaged, setKycRiskRunsPaged] = useState<PagedResponse<KycRiskRunItem> | null>(null);
	const [kycRiskRunsLoading, setKycRiskRunsLoading] = useState(false);
	const [kycRiskRunModalOpen, setKycRiskRunModalOpen] = useState(false);
	const [kycRiskRunDetailLoading, setKycRiskRunDetailLoading] = useState(false);
	const [kycRiskRunDetail, setKycRiskRunDetail] = useState<KycRiskRunDetail | null>(null);

	const loadComplianceData = async () => {
		if (!id) return;
		setComplianceLoading(true);
		try {
			const checks = await customersApi.listKycChecks(id);
			setKycChecks(checks);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setComplianceLoading(false);
		}
	};

	const listScreeningPresence = useMemo(() => {
		const hasListScreening = kycChecks.some(
			c => c.type === "SANCTIONS_SCREENING" || c.type === "PEP_SCREENING"
		);
		let latestSanctions: KycCheck | null = null;
		let latestPep: KycCheck | null = null;
		for (const c of kycChecks) {
			if (c.type === "SANCTIONS_SCREENING" && latestSanctions === null) {
				latestSanctions = c;
			}
			if (c.type === "PEP_SCREENING" && latestPep === null) {
				latestPep = c;
			}
		}
		return { hasListScreening, latestSanctions, latestPep };
	}, [kycChecks]);

	const listScreeningHasReviewOutcome = useMemo(() => {
		const s = listScreeningPresence.latestSanctions?.result;
		const p = listScreeningPresence.latestPep?.result;
		return s === "REVIEW" || p === "REVIEW";
	}, [listScreeningPresence.latestSanctions?.result, listScreeningPresence.latestPep?.result]);

	/** Change à chaque nouveau contrôle sanctions/PEP (simulation, relance stub, etc.) pour recalculer le score moteur. */
	const screeningChecksFingerprint = useMemo(() => {
		const list = kycChecks.filter(c => c.type === "SANCTIONS_SCREENING" || c.type === "PEP_SCREENING");
		if (list.length === 0) return "";
		return list
			.map(c => `${c.id}:${c.result}:${c.checkedAt ?? ""}`)
			.sort()
			.join("|");
	}, [kycChecks]);

	const sortedKycChecksForCompliance = useMemo(() => {
		return [...kycChecks].sort((a, b) => {
			const ta = a.checkedAt ? new Date(a.checkedAt).getTime() : 0;
			const tb = b.checkedAt ? new Date(b.checkedAt).getTime() : 0;
			if (tb !== ta) return tb - ta;
			return b.id - a.id;
		});
	}, [kycChecks]);

	const [kycComplianceChecksPage, setKycComplianceChecksPage] = useState(0);
	useEffect(() => {
		const totalPages = Math.max(1, Math.ceil(kycChecks.length / KYC_COMPLIANCE_CHECKS_PAGE_SIZE));
		const maxPage = totalPages - 1;
		setKycComplianceChecksPage(p => (p > maxPage ? maxPage : p));
	}, [kycChecks.length]);

	const kycCompliancePaginated = useMemo(() => {
		const start = kycComplianceChecksPage * KYC_COMPLIANCE_CHECKS_PAGE_SIZE;
		return sortedKycChecksForCompliance.slice(start, start + KYC_COMPLIANCE_CHECKS_PAGE_SIZE);
	}, [sortedKycChecksForCompliance, kycComplianceChecksPage]);

	/**
	 * Contrôles / tâches conformité : nécessaires au panneau décision KYC si dossier en revue,
	 * et à l’onglet Conformité pour tous les statuts (sinon liste vide tant que « Actualiser » n’est pas utilisé).
	 */
	useEffect(() => {
		if (!id || !customer || customer.id !== id) return;
		const needForKycDecision = customer.status === "PENDING_REVIEW";
		const onComplianceTab = activeTab === "compliance";
		if (!needForKycDecision && !onComplianceTab) return;
		void loadComplianceData();
	}, [id, customer?.id, customer?.status, activeTab]);

	useEffect(() => {
		if (!customer?.id || Number.isNaN(id)) return;
		if (activeTab !== "compliance") return;
		const prev = prevWorklistComplianceRef.current;
		const enteredCompliance = prev.tab !== "compliance";
		const switchedCustomer =
			prev.customerId !== undefined && prev.customerId !== customer.id;
		if (!enteredCompliance && !switchedCustomer) return;
		setComplianceInnerTab(customer.status === "PENDING_REVIEW" ? "review" : "screeningChecks");
	}, [activeTab, customer?.id, customer?.status, id]);

	useEffect(() => {
		prevWorklistComplianceRef.current = { tab: activeTab, customerId: customer?.id };
	}, [activeTab, customer?.id]);

	useEffect(() => {
		if (activeTab !== "pieces") setShowDocumentUpload(false);
	}, [activeTab]);

	useEffect(() => {
		if (complianceInnerTab !== "screeningChecks") setShowListScreeningCard(false);
	}, [complianceInnerTab]);

	useEffect(() => {
		if (!id || Number.isNaN(id)) return;
		if (activeTab !== "compliance" || complianceInnerTab !== "auditTrail") return;
		let cancelled = false;
		setKycAuditTrailLoading(true);
		(async () => {
			try {
				const res = await customersApi.getKycAuditTimeline(id, {
					page: kycAuditTrailPage,
					size: KYC_AUDIT_TRAIL_PAGE_SIZE
				});
				if (!cancelled) {
					setKycAuditTrailPaged(res);
				}
			} catch (e) {
				if (!cancelled) {
					setKycAuditTrailPaged(null);
					const errMsg = e instanceof Error ? e.message : String(e);
					setToast({
						message: errMsg ? `${t("customer.detail.compliance.auditTrail.loadError")} — ${errMsg}` : t("customer.detail.compliance.auditTrail.loadError"),
						type: "error"
					});
				}
			} finally {
				if (!cancelled) {
					setKycAuditTrailLoading(false);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [id, activeTab, complianceInnerTab, kycAuditTrailPage, t]);

	useEffect(() => {
		if (!id || Number.isNaN(id)) return;
		if (activeTab !== "compliance" || complianceInnerTab !== "riskRunsHistory") return;
		let cancelled = false;
		setKycRiskRunsLoading(true);
		(async () => {
			try {
				const res = await customersApi.listKycRiskRuns(id, {
					page: kycRiskRunsPage,
					size: kycRiskRunsSize
				});
				if (!cancelled) setKycRiskRunsPaged(res);
			} catch (e) {
				if (!cancelled) {
					setKycRiskRunsPaged(null);
					const errMsg = e instanceof Error ? e.message : String(e);
					setToast({
						message: errMsg
							? `${t("customer.detail.compliance.riskRunsHistory.loadError")} — ${errMsg}`
							: t("customer.detail.compliance.riskRunsHistory.loadError"),
						type: "error"
					});
				}
			} finally {
				if (!cancelled) setKycRiskRunsLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [id, activeTab, complianceInnerTab, kycRiskRunsPage, kycRiskRunsSize, t]);

	useEffect(() => {
		if (!id || Number.isNaN(id)) {
			setKycOnboardingRisk(null);
			setKycLastEvalLoading(false);
			return;
		}
		if (customer == null || customer.id !== id) {
			setKycOnboardingRisk(null);
			setKycLastEvalLoading(false);
			return;
		}

		if (customer.status === "VERIFIED") {
			setKycOnboardingRisk(null);
			setKycLastEvalLoading(true);
			let cancelled = false;
			(async () => {
				try {
					const a = await customersApi.getKycRiskAssessmentLatest(id);
					if (!cancelled) {
						setKycOnboardingRisk(a);
					}
				} catch {
					if (!cancelled) setKycOnboardingRisk(null);
				} finally {
					if (!cancelled) setKycLastEvalLoading(false);
				}
			})();
			return () => {
				cancelled = true;
			};
		}

		setKycLastEvalLoading(false);

		if (customer.status !== "PENDING_REVIEW") {
			setKycOnboardingRisk(null);
			return;
		}
		if (!listScreeningPresence.hasListScreening) {
			setKycOnboardingRisk(null);
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				const a = await customersApi.getKycRiskAssessment(id, { pep: verifyPep });
				if (!cancelled) {
					setKycOnboardingRisk(a);
				}
			} catch {
				if (!cancelled) setKycOnboardingRisk(null);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [
		id,
		customer?.id,
		customer?.status,
		verifyPep,
		listScreeningPresence.hasListScreening,
		screeningChecksFingerprint
	]);

	function statusBadgeVariant(status: Customer["status"]): "neutral" | "success" | "warning" | "danger" | "info" {
		switch (status) {
			case "VERIFIED":
				return "success";
			case "DRAFT":
				return "warning";
			case "REJECTED":
			case "BLOCKED":
				return "danger";
			case "PENDING_REVIEW":
			default:
				return "info";
		}
	}

	function riskBadgeVariant(score?: number | null): "neutral" | "success" | "warning" | "danger" {
		if (typeof score !== "number") return "neutral";
		if (score >= 70) return "danger";
		if (score >= 40) return "warning";
		return "success";
	}

	function onboardingRiskBandBadgeVariant(band: string): "neutral" | "success" | "warning" | "danger" {
		const b = band?.trim().toUpperCase();
		if (b === "HIGH") return "danger";
		if (b === "MEDIUM") return "warning";
		if (b === "LOW") return "success";
		return "neutral";
	}

	function onboardingRiskBandLabel(band: string): string {
		const b = band?.trim().toUpperCase();
		const key = `customer.detail.kyc.onboardingRisk.bandValue.${b}`;
		const translated = t(key);
		return translated === key ? band : translated;
	}

	function onboardingRiskDecisionBadgeVariant(decision: string): "neutral" | "success" | "warning" | "danger" {
		const d = decision?.trim().toUpperCase();
		if (d === "BLOCK" || d === "EDD_REQUIRED") return "danger";
		if (d === "ALLOW_REINFORCED_REVIEW") return "warning";
		if (d === "ALLOW_STANDARD") return "success";
		return "neutral";
	}

	function onboardingRiskDecisionLabel(decision: string): string {
		const d = decision?.trim().toUpperCase();
		const key = `customer.detail.kyc.onboardingRisk.decision.${d}`;
		const translated = t(key);
		return translated === key ? decision : translated;
	}

	function onboardingRiskBlockReasonLabel(code: string | null | undefined): string {
		if (code == null || code === "") return "—";
		const key = `customer.detail.kyc.onboardingRisk.blockReason.${code}`;
		const translated = t(key);
		return translated === key ? code : translated;
	}

	function kycRiskRunSourceLabel(source: string): string {
		const key = `customer.detail.compliance.riskRunsHistory.runSource.${source}`;
		const translated = t(key);
		return translated === key ? source : translated;
	}

	function reviewStatusBadgeVariant(s?: Customer["emailReviewStatus"]): "neutral" | "success" | "warning" | "danger" {
		if (!s) return "neutral";
		if (s === "APPROVED") return "success";
		if (s === "REJECTED") return "danger";
		return "warning";
	}

	function reviewStatusLabel(s?: Customer["emailReviewStatus"]): string {
		if (!s) return "-";
		const key = `customer.detail.profileDetail.reviewStatus.${s}`;
		const translated = t(key);
		return translated === key ? s : translated;
	}

	// Trouver le document selfie
	const selfieDocument = documents.find(doc => doc.type === "SELFIE");
	const [selfieFile, setSelfieFile] = useState<File | null>(null);
	const [selfieUploading, setSelfieUploading] = useState(false);
	const [selfieError, setSelfieError] = useState(false);
	const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

	async function loadSelfieImage(documentId: number) {
		if (!id) return;
		try {
			const blob = await customersApi.getDocumentBlob(id, documentId);
			const blobUrl = URL.createObjectURL(blob);
			setSelfieUrl(blobUrl);
			setSelfieError(false);
		} catch (e) {
			console.warn("Selfie image could not be loaded:", e);
			setSelfieError(true);
			setSelfieUrl(null);
		}
	}

	async function load() {
		if (!id) return;
		setLoading(true);
		setError(null);
		setSelfieError(false);
		setSelfieUrl(null);
		try {
			const [customerData, addressesData, documentsData] = await Promise.all([
				customersApi.get(id),
				customersApi.getAddresses(id),
				customersApi.getDocuments(id)
			]);
			setCustomer(customerData);
			if (customerData.status === "PENDING_REVIEW") {
				if (evaluationPepInitClientIdRef.current !== customerData.id) {
					setVerifyPep(Boolean(customerData.pepFlag));
					evaluationPepInitClientIdRef.current = customerData.id;
				}
			} else {
				evaluationPepInitClientIdRef.current = null;
			}
			setAddresses(addressesData);
			setDocuments(documentsData);

			// Charger l'image du selfie si disponible
			const selfieDoc = documentsData.find(doc => doc.type === "SELFIE");
			if (selfieDoc) {
				await loadSelfieImage(selfieDoc.id);
			}
			
			// Charger les comptes du client
			try {
				const accountsData = await accountsApi.getClientAccounts(id);
				setAccounts(accountsData);
			} catch (e) {
				console.warn("Impossible de charger les comptes:", e);
			}
			
			// Charger les personnes liées uniquement pour la fiche entreprise
			if (expectedType === "BUSINESS" && customerData.type === "BUSINESS") {
				try {
					const rpData = await customersApi.getRelatedPersons(id);
					setRelatedPersons(rpData);
				} catch (e) {
					// Ignorer les erreurs si l'endpoint n'est pas disponible
					console.warn("Impossible de charger les personnes liées:", e);
				}
			} else {
				setRelatedPersons([]);
			}
			setFormData({
				displayName: customerData.displayName ?? "",
				firstName: customerData.firstName ?? "",
				lastName: customerData.lastName ?? "",
				email: customerData.email ?? "",
				phone: customerData.phone ?? ""
			});
			setProfileFormData({
				firstName: customerData.firstName ?? "",
				lastName: customerData.lastName ?? "",
				gender: customerData.gender ?? "",
				birthDate: customerData.birthDate ? customerData.birthDate.slice(0, 10) : "",
				maritalStatus: customerData.maritalStatus ?? "",
				nationality: customerData.nationality ?? "",
				taxResidenceCountry: customerData.taxResidenceCountry ?? "",
				taxIdentificationNumber: customerData.taxIdentificationNumber ?? "",
				professionalActivity: customerData.professionalActivity ?? "",
				incomeSource: customerData.incomeSource ?? ""
			});
			if (customerData.type === "BUSINESS") {
				setBusinessProfileFormData(customerToBusinessProfileForm(customerData));
			} else {
				setBusinessProfileFormData(emptyBusinessProfileForm());
			}
		} catch (e: any) {
			setError(e?.message ?? t("customer.errors.unknown"));
		} finally {
			setLoading(false);
		}
	}

	async function handleSave() {
		if (!id) return;
		setSaving(true);
		setError(null);
		try {
			const updated = await customersApi.update(id, {
				displayName: formData.displayName,
				firstName: formData.firstName || undefined,
				lastName: formData.lastName || undefined,
				email: formData.email || undefined,
				phone: formData.phone || undefined
			});
			setCustomer(updated);
			setIsEditing(false);
		} catch (e: any) {
			setError(e?.message ?? t("customer.detail.generalInfo.save") + " - " + t("customer.errors.unknown"));
		} finally {
			setSaving(false);
		}
	}

	function handleCancel() {
		if (customer) {
			setFormData({
				displayName: customer.displayName ?? "",
				firstName: customer.firstName ?? "",
				lastName: customer.lastName ?? "",
				email: customer.email ?? "",
				phone: customer.phone ?? ""
			});
		}
		setIsEditing(false);
	}

	async function handleSaveProfile() {
		if (!id || !customer) return;

		if (expectedType === "PERSON") {
			if (!profileFormData.professionalActivity.trim()) {
				setToast({ message: t("customer.detail.profile.professionalActivityRequired"), type: "error" });
				return;
			}
			if (profileFormData.professionalActivity.trim().length > 255) {
				setToast({ message: t("customer.detail.profile.professionalActivityTooLong"), type: "error" });
				return;
			}
			if (!isPersonProfessionValue(profileFormData.professionalActivity.trim())) {
				setToast({ message: t("customer.detail.profile.professionalActivityInvalid"), type: "error" });
				return;
			}
			if (!profileFormData.incomeSource.trim()) {
				setToast({ message: t("customer.detail.profile.incomeSourceRequired"), type: "error" });
				return;
			}
			if (!isPersonIncomeSourceValue(profileFormData.incomeSource.trim())) {
				setToast({ message: t("customer.detail.profile.incomeSourceInvalid"), type: "error" });
				return;
			}
			if (profileFormData.incomeSource.length > 500) {
				setToast({ message: t("customer.detail.profile.incomeSourceTooLong"), type: "error" });
				return;
			}
			const pTax = profileFormData.taxResidenceCountry.trim().toUpperCase().slice(0, 2);
			if (!pTax) {
				setToast({ message: t("customer.detail.profile.taxResidenceRequired"), type: "error" });
				return;
			}
			if (!/^[A-Z]{2}$/.test(pTax) || !nationalityOptions.some(o => o.code === pTax)) {
				setToast({ message: t("customer.detail.profile.taxResidenceInvalid"), type: "error" });
				return;
			}
			if (profileFormData.taxIdentificationNumber.trim().length > 64) {
				setToast({ message: t("customer.detail.profile.taxIdTooLong"), type: "error" });
				return;
			}
			setSavingProfile(true);
			setError(null);
			try {
				const updated = await customersApi.update(id, {
					firstName: profileFormData.firstName || undefined,
					lastName: profileFormData.lastName || undefined,
					gender: profileFormData.gender || null,
					birthDate: profileFormData.birthDate || null,
					maritalStatus: profileFormData.maritalStatus || null,
					nationality: profileFormData.nationality?.trim() ? profileFormData.nationality.trim().toUpperCase() : null,
					taxResidenceCountry: pTax,
					taxIdentificationNumber: profileFormData.taxIdentificationNumber?.trim()
						? profileFormData.taxIdentificationNumber.trim()
						: null,
					professionalActivity: profileFormData.professionalActivity.trim(),
					incomeSource: profileFormData.incomeSource.trim()
				});
				setCustomer(updated);
				setIsEditingProfile(false);
				setToast({ message: t("customer.detail.generalInfo.save"), type: "success" });
			} catch (e: any) {
				setToast({ message: e?.message ?? t("customer.errors.unknown"), type: "error" });
			} finally {
				setSavingProfile(false);
			}
			return;
		}

		const b = businessProfileFormData;
		if (!b.legalForm.trim()) {
			setToast({ message: t("customer.wizard.business.validation.legalFormRequired"), type: "error" });
			return;
		}
		if (!b.registrationNumber.trim()) {
			setToast({ message: t("customer.wizard.business.validation.registrationRequired"), type: "error" });
			return;
		}
		if (!b.incorporationDate.trim()) {
			setToast({ message: t("customer.wizard.business.validation.incorporationDateRequired"), type: "error" });
			return;
		}
		if (Number.isNaN(Date.parse(b.incorporationDate.trim()))) {
			setToast({ message: t("customer.wizard.validation.identityDocumentExpiresInvalid"), type: "error" });
			return;
		}
		const incCountry = b.incorporationCountry.trim().toUpperCase().slice(0, 2);
		if (!/^[A-Z]{2}$/.test(incCountry) || !nationalityOptions.some(o => o.code === incCountry)) {
			setToast({ message: t("customer.wizard.validation.countryInvalid"), type: "error" });
			return;
		}
		const taxCountry = b.taxResidenceCountry.trim().toUpperCase().slice(0, 2);
		if (!taxCountry) {
			setToast({ message: t("customer.detail.profile.taxResidenceRequired"), type: "error" });
			return;
		}
		if (!/^[A-Z]{2}$/.test(taxCountry) || !nationalityOptions.some(o => o.code === taxCountry)) {
			setToast({ message: t("customer.detail.profile.taxResidenceInvalid"), type: "error" });
			return;
		}
		if (b.taxIdentificationNumber.trim().length > 64) {
			setToast({ message: t("customer.detail.profile.taxIdTooLong"), type: "error" });
			return;
		}
		if (!b.activityCode.trim()) {
			setToast({ message: t("customer.wizard.business.validation.activityNaceCodeRequired"), type: "error" });
			return;
		}
		if (!isValidNaceClassCode(b.activityCode)) {
			setToast({ message: t("customer.wizard.business.validation.activityNaceCodeInvalid"), type: "error" });
			return;
		}
		if (!b.activityDescription.trim()) {
			setToast({ message: t("customer.wizard.business.validation.activityDescriptionRequired"), type: "error" });
			return;
		}
		if (b.activityDescription.trim().length > 1000) {
			setToast({ message: t("customer.wizard.business.validation.textTooLong"), type: "error" });
			return;
		}
		if (b.signingAuthorityNote.length > 4000) {
			setToast({ message: t("customer.wizard.business.validation.textTooLong"), type: "error" });
			return;
		}
		const wRaw = b.websiteUrl.trim();
		if (wRaw && !/^https?:\/\/.+/i.test(wRaw) && !/^[a-z0-9.-]+\.[a-z]{2,}.*$/i.test(wRaw)) {
			setToast({ message: t("customer.wizard.business.validation.websiteInvalid"), type: "error" });
			return;
		}
		if (!b.annualRevenueBand.trim()) {
			setToast({ message: t("customer.wizard.business.validation.revenueBandRequired"), type: "error" });
			return;
		}
		if (!b.fundsSource.trim()) {
			setToast({ message: t("customer.wizard.business.validation.fundsSourceRequired"), type: "error" });
			return;
		}
		if (b.fundsSource.trim().length > 500) {
			setToast({ message: t("customer.detail.profile.businessFundsSourceTooLong"), type: "error" });
			return;
		}
		if (!b.accountOpeningPurpose.trim()) {
			setToast({ message: t("customer.wizard.business.validation.openingPurposeRequired"), type: "error" });
			return;
		}
		if (b.accountOpeningPurpose.trim().length > 500) {
			setToast({ message: t("customer.detail.profile.businessOpeningPurposeTooLong"), type: "error" });
			return;
		}
		if (b.expectedTransactionProfile.trim().length > 1000) {
			setToast({ message: t("customer.wizard.business.validation.textTooLong"), type: "error" });
			return;
		}
		if (b.currenciesUsed.trim().length > 255) {
			setToast({ message: t("customer.detail.profile.businessCurrenciesTooLong"), type: "error" });
			return;
		}
		let employeeCount: number | undefined;
		if (b.employeeCount.trim() !== "") {
			const n = Number.parseInt(b.employeeCount.trim(), 10);
			if (Number.isNaN(n) || n < 0) {
				setToast({ message: t("customer.detail.profile.businessInvalidEmployeeCount"), type: "error" });
				return;
			}
			employeeCount = n;
		}

		const websiteUrl = wRaw === "" ? "" : /^https?:\/\//i.test(wRaw) ? wRaw : `https://${wRaw}`;

		setSavingProfile(true);
		setError(null);
		try {
			const payload: UpdateCustomerRequest = {
				tradeName: b.tradeName.trim() === "" ? "" : b.tradeName.trim(),
				legalForm: b.legalForm.trim(),
				registrationNumber: b.registrationNumber.trim(),
				incorporationDate: b.incorporationDate.trim(),
				incorporationCountry: incCountry,
				taxResidenceCountry: taxCountry,
				taxIdentificationNumber: b.taxIdentificationNumber.trim() ? b.taxIdentificationNumber.trim() : null,
				activityDescription: b.activityDescription.trim(),
				signingAuthorityNote: b.signingAuthorityNote.trim(),
				websiteUrl,
				annualRevenueBand: b.annualRevenueBand.trim(),
				currenciesUsed: b.currenciesUsed.trim() === "" ? "" : b.currenciesUsed.trim(),
				expectedTransactionProfile: b.expectedTransactionProfile.trim() === "" ? "" : b.expectedTransactionProfile.trim(),
				fundsSource: b.fundsSource.trim(),
				accountOpeningPurpose: b.accountOpeningPurpose.trim()
			};
			if (employeeCount !== undefined) {
				payload.employeeCount = employeeCount;
			}
			const updated = await customersApi.update(id, payload);
			setCustomer(updated);
			setBusinessProfileFormData(customerToBusinessProfileForm(updated));
			setIsEditingProfile(false);
			setToast({ message: t("customer.detail.generalInfo.save"), type: "success" });
		} catch (e: any) {
			setToast({ message: e?.message ?? t("customer.errors.unknown"), type: "error" });
		} finally {
			setSavingProfile(false);
		}
	}

	function handleCancelProfile() {
		if (customer) {
			setProfileFormData({
				firstName: customer.firstName ?? "",
				lastName: customer.lastName ?? "",
				gender: customer.gender ?? "",
				birthDate: customer.birthDate ? customer.birthDate.slice(0, 10) : "",
				maritalStatus: customer.maritalStatus ?? "",
				nationality: customer.nationality ?? "",
				taxResidenceCountry: customer.taxResidenceCountry ?? "",
				taxIdentificationNumber: customer.taxIdentificationNumber ?? "",
				professionalActivity: customer.professionalActivity ?? "",
				incomeSource: customer.incomeSource ?? ""
			});
			if (expectedType === "BUSINESS") {
				setBusinessProfileFormData(customerToBusinessProfileForm(customer));
			}
		}
		setIsEditingProfile(false);
	}

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, expectedType]);

	// Nettoyer le blob URL quand le composant est démonté ou quand l'URL change
	useEffect(() => {
		return () => {
			if (selfieUrl) {
				URL.revokeObjectURL(selfieUrl);
			}
		};
	}, [selfieUrl]);

	async function submitAddress(e: React.FormEvent) {
		e.preventDefault();
		if (!id) return;
		
		// Validation côté client
		if (!addr.line1?.trim()) {
			setError(t("customer.detail.addresses.line1Required"));
			return;
		}
		if (!addr.city?.trim()) {
			setError(t("customer.detail.addresses.cityRequired"));
			return;
		}
		if (!addr.country?.trim()) {
			setError(t("customer.detail.addresses.countryRequired"));
			return;
		}
		
		setAddrSubmitting(true);
		setError(null);
		try {
			await customersApi.addAddress(id, {
				...addr,
				line1: addr.line1.trim(),
				city: addr.city.trim(),
				postalCode: addr.postalCode?.trim() || undefined,
				state: addr.state?.trim() || undefined,
				line2: addr.line2?.trim() || undefined,
				country: addr.country.trim(),
				primaryAddress: Boolean(addr.primaryAddress)
			});
			// Recharger les adresses
			const updatedAddresses = await customersApi.getAddresses(id);
			setAddresses(updatedAddresses);
			setAddr(prev => ({ ...prev, line1: "", line2: "", city: "", state: "", postalCode: "", country: "CM" }));
		} catch (e: any) {
			setError(e?.message ?? t("customer.detail.addresses.addError"));
		} finally {
			setAddrSubmitting(false);
		}
	}

	function startEditAddress(address: Address) {
		setEditingAddressId(address.id);
		setEditAddr({
			type: address.type,
			line1: address.line1,
			line2: address.line2 || "",
			city: address.city,
			state: address.state || "",
			postalCode: address.postalCode || "",
			country: address.country,
			primaryAddress: address.primaryAddress
		});
	}

	function cancelEditAddress() {
		setEditingAddressId(null);
		setEditAddr(null);
	}

	async function submitEditAddress(e: React.FormEvent) {
		e.preventDefault();
		if (!id || !editingAddressId || !editAddr) return;
		
		// Validation côté client
		if (!editAddr.line1?.trim()) {
			setError(t("customer.detail.addresses.line1Required"));
			return;
		}
		if (!editAddr.city?.trim()) {
			setError(t("customer.detail.addresses.cityRequired"));
			return;
		}
		if (!editAddr.country?.trim()) {
			setError(t("customer.detail.addresses.countryRequired"));
			return;
		}
		
		setAddrSubmitting(true);
		setError(null);
		try {
			await customersApi.updateAddress(id, editingAddressId, {
				...editAddr,
				line1: editAddr.line1.trim(),
				city: editAddr.city.trim(),
				postalCode: editAddr.postalCode?.trim() || undefined,
				state: editAddr.state?.trim() || undefined,
				line2: editAddr.line2?.trim() || undefined,
				country: editAddr.country.trim(),
				primaryAddress: Boolean(editAddr.primaryAddress)
			});
			// Recharger les adresses
			const updatedAddresses = await customersApi.getAddresses(id);
			setAddresses(updatedAddresses);
			cancelEditAddress();
		} catch (e: any) {
			setError(e?.message ?? t("customer.detail.addresses.updateError"));
		} finally {
			setAddrSubmitting(false);
		}
	}

	async function submitDocument(e: React.FormEvent) {
		e.preventDefault();
		if (!id || !docFile) return;

		if (docType === "ID_CARD" || docType === "PASSPORT") {
			if (!identityDocNumber.trim()) {
				const errorMsg = t("customer.detail.documents.identityNumberRequired");
				setError(errorMsg);
				setToast({ message: errorMsg, type: "error" });
				return;
			}
			if (!identityDocExpiresOn.trim()) {
				const errorMsg = t("customer.detail.documents.identityExpiresRequired");
				setError(errorMsg);
				setToast({ message: errorMsg, type: "error" });
				return;
			}
			if (Number.isNaN(Date.parse(identityDocExpiresOn))) {
				const errorMsg = t("customer.detail.documents.identityExpiresInvalid");
				setError(errorMsg);
				setToast({ message: errorMsg, type: "error" });
				return;
			}
			if (identityDocNumber.trim().length > 64) {
				const errorMsg = t("customer.detail.documents.identityNumberTooLong");
				setError(errorMsg);
				setToast({ message: errorMsg, type: "error" });
				return;
			}
		}
		
		// Validation: le selfie doit être une image
		if (docType === "SELFIE" && !docFile.type.startsWith("image/")) {
			const errorMsg = t("customer.detail.documents.selfieError");
			setError(errorMsg);
			setToast({ message: errorMsg, type: "error" });
			return;
		}
		
		setDocSubmitting(true);
		setError(null);
		try {
			const uploadOpts =
				docType === "ID_CARD" || docType === "PASSPORT"
					? {
							...(docType === "ID_CARD" ? { idCardSide } : {}),
							identityDocumentNumber: identityDocNumber.trim(),
							identityDocumentIssuingCountry: customer?.nationality ?? undefined,
							identityDocumentExpiresOn: identityDocExpiresOn.trim()
						}
					: undefined;
			await customersApi.uploadDocument(id, docType, docFile, uploadOpts);
			await load();
			setDocFile(null);
			setIdentityDocNumber("");
			setIdentityDocExpiresOn("");
			setToast({ message: t("customer.detail.documents.uploaded"), type: "success" });
			setShowDocumentUpload(false);
		} catch (e: any) {
			const errorMessage = e?.message ?? t("customer.detail.documents.uploadError");
			setError(errorMessage);
			setToast({ message: errorMessage, type: "error" });
		} finally {
			setDocSubmitting(false);
		}
	}

	async function uploadSelfie(e: React.FormEvent) {
		e.preventDefault();
		if (!id || !selfieFile) return;
		
		// Validation: le selfie doit être une image
		if (!selfieFile.type.startsWith("image/")) {
			const errorMsg = t("customer.detail.documents.selfieError");
			setError(errorMsg);
			setToast({ message: errorMsg, type: "error" });
			return;
		}
		
		setSelfieUploading(true);
		setError(null);
		try {
			// Nettoyer l'ancien blob URL si présent
			if (selfieUrl) {
				URL.revokeObjectURL(selfieUrl);
				setSelfieUrl(null);
			}
			const uploadedDoc = await customersApi.uploadDocument(id, "SELFIE", selfieFile);
			await load();
			setSelfieFile(null);
			// Charger l'image du selfie uploadé
			if (uploadedDoc) {
				await loadSelfieImage(uploadedDoc.id);
			}
			setToast({ message: t("customer.detail.documents.uploaded"), type: "success" });
		} catch (e: any) {
			const errorMessage = e?.message ?? t("customer.detail.documents.uploadError");
			setError(errorMessage);
			setToast({ message: errorMessage, type: "error" });
		} finally {
			setSelfieUploading(false);
		}
	}

	async function openKycRiskRunDetails(run: KycRiskRunItem) {
		if (!id || Number.isNaN(id)) return;
		setKycRiskRunModalOpen(true);
		setKycRiskRunDetail(null);
		setKycRiskRunDetailLoading(true);
		try {
			const d = await customersApi.getKycRiskRun(id, run.id);
			if (d) {
				setKycRiskRunDetail(d);
			} else {
				setToast({ message: t("customer.detail.compliance.riskRunsHistory.detailNotFound"), type: "error" });
			}
		} catch (e) {
			setKycRiskRunDetail(null);
			setToast({ message: e instanceof Error ? e.message : String(e), type: "error" });
		} finally {
			setKycRiskRunDetailLoading(false);
		}
	}

	async function doSubmitKyc() {
		if (!id) return;
		setKycSubmitting("submit");
		setError(null);
		try {
			const c = await customersApi.submitKyc(id);
			setCustomer(c);
		} catch (e: any) {
			const errorMessage = e?.message ?? t("customer.detail.kyc.submit.error");
			setError(errorMessage);
		} finally {
			setKycSubmitting(null);
		}
	}
	async function doVerifyKyc() {
		if (!id) return;
		setKycSubmitting("verify");
		setError(null);
		try {
			const c = await customersApi.verifyKyc(id, { pep: verifyPep });
			setCustomer(c);
		} catch (e: any) {
			const errorMessage = e?.message ?? t("customer.detail.kyc.verify.error");
			setError(errorMessage);
		} finally {
			setKycSubmitting(null);
		}
	}
	async function doRejectKyc() {
		if (!id) return;
		setKycSubmitting("reject");
		setError(null);
		try {
			const c = await customersApi.rejectKyc(id, rejectionReason || undefined);
			setCustomer(c);
			setRejectionReason("");
			setToast({ message: t("customer.detail.kyc.reject.success"), type: "success" });
		} catch (e: any) {
			const errorMessage = e?.message ?? t("customer.detail.kyc.reject.error");
			setError(errorMessage);
			setToast({ message: errorMessage, type: "error" });
		} finally {
			setKycSubmitting(null);
		}
	}

	async function doSetEmailReviewStatus(status: "APPROVED" | "REJECTED") {
		if (!id) return;
		setReviewStatusSubmitting("email");
		setError(null);
		try {
			const c = await customersApi.setEmailReviewStatus(id, status);
			setCustomer(c);
			setToast({ message: status === "APPROVED" ? t("customer.detail.profileDetail.reviewStatus.APPROVED") : t("customer.detail.profileDetail.reviewStatus.REJECTED"), type: "success" });
		} catch (e: any) {
			setError(e?.message ?? "Erreur");
			setToast({ message: e?.message ?? "Erreur", type: "error" });
		} finally {
			setReviewStatusSubmitting(null);
		}
	}
	async function doSetProfileReviewStatus(status: "APPROVED" | "REJECTED") {
		if (!id) return;
		setReviewStatusSubmitting("profile");
		setError(null);
		try {
			const c = await customersApi.setProfileReviewStatus(id, status);
			setCustomer(c);
			setToast({ message: status === "APPROVED" ? t("customer.detail.profileDetail.reviewStatus.APPROVED") : t("customer.detail.profileDetail.reviewStatus.REJECTED"), type: "success" });
		} catch (e: any) {
			setError(e?.message ?? "Erreur");
			setToast({ message: e?.message ?? "Erreur", type: "error" });
		} finally {
			setReviewStatusSubmitting(null);
		}
	}
	async function doSetIdentityReviewStatus(status: "APPROVED" | "REJECTED") {
		if (!id) return;
		setReviewStatusSubmitting("identity");
		setError(null);
		try {
			const c = await customersApi.setIdentityReviewStatus(id, status);
			setCustomer(c);
			setToast({ message: status === "APPROVED" ? t("customer.detail.profileDetail.reviewStatus.APPROVED") : t("customer.detail.profileDetail.reviewStatus.REJECTED"), type: "success" });
		} catch (e: any) {
			setError(e?.message ?? "Erreur");
			setToast({ message: e?.message ?? "Erreur", type: "error" });
		} finally {
			setReviewStatusSubmitting(null);
		}
	}

	// RelatedPerson functions
	async function submitRelatedPerson(e: React.FormEvent) {
		e.preventDefault();
		if (!id) return;
		
		// Validation
		if (!rpForm.firstName?.trim()) {
			setError(t("customer.detail.relatedPersons.firstNameRequired"));
			return;
		}
		if (!rpForm.lastName?.trim()) {
			setError(t("customer.detail.relatedPersons.lastNameRequired"));
			return;
		}
		if (rpForm.role === "UBO" && !rpForm.ownershipPercent) {
			setError(t("customer.detail.relatedPersons.ownershipRequired"));
			return;
		}
		
		setRpSubmitting(true);
		setError(null);
		try {
			await customersApi.addRelatedPerson(id, {
				...rpForm,
				dateOfBirth: rpForm.dateOfBirth || undefined,
				nationalId: rpForm.nationalId || undefined,
				ownershipPercent: rpForm.ownershipPercent || undefined
			});
			const updated = await customersApi.getRelatedPersons(id);
			setRelatedPersons(updated);
			setRpForm({
				role: "UBO",
				firstName: "",
				lastName: "",
				dateOfBirth: "",
				nationalId: "CM",
				ownershipPercent: undefined,
				pepFlag: false
			});
			setToast({ message: t("customer.detail.relatedPersons.added"), type: "success" });
		} catch (e: any) {
			setError(e?.message ?? t("customer.detail.relatedPersons.addError"));
		} finally {
			setRpSubmitting(false);
		}
	}

	function startEditRelatedPerson(rp: RelatedPerson) {
		setEditingRpId(rp.id);
		setEditRpForm({
			role: rp.role,
			firstName: rp.firstName,
			lastName: rp.lastName,
			dateOfBirth: rp.dateOfBirth || "",
			nationalId: rp.nationalId || "",
			ownershipPercent: rp.ownershipPercent || undefined,
			pepFlag: rp.pepFlag
		});
	}

	function cancelEditRelatedPerson() {
		setEditingRpId(null);
		setEditRpForm(null);
	}

	async function submitEditRelatedPerson(e: React.FormEvent) {
		e.preventDefault();
		if (!id || !editingRpId || !editRpForm) return;
		
		// Validation
		if (!editRpForm.firstName?.trim()) {
			setError(t("customer.detail.relatedPersons.firstNameRequired"));
			return;
		}
		if (!editRpForm.lastName?.trim()) {
			setError(t("customer.detail.relatedPersons.lastNameRequired"));
			return;
		}
		if (editRpForm.role === "UBO" && !editRpForm.ownershipPercent) {
			setError(t("customer.detail.relatedPersons.ownershipRequired"));
			return;
		}
		
		setRpSubmitting(true);
		setError(null);
		try {
			await customersApi.updateRelatedPerson(id, editingRpId, {
				...editRpForm,
				dateOfBirth: editRpForm.dateOfBirth || undefined,
				nationalId: editRpForm.nationalId || undefined,
				ownershipPercent: editRpForm.ownershipPercent || undefined
			});
			const updated = await customersApi.getRelatedPersons(id);
			setRelatedPersons(updated);
			cancelEditRelatedPerson();
			setToast({ message: t("customer.detail.relatedPersons.updated"), type: "success" });
		} catch (e: any) {
			setError(e?.message ?? t("customer.detail.relatedPersons.updateError"));
		} finally {
			setRpSubmitting(false);
		}
	}

	async function deleteRelatedPerson(rpId: number) {
		if (!id) return;
		if (!confirm(t("customer.detail.relatedPersons.deleteConfirm"))) return;
		
		setRpSubmitting(true);
		setError(null);
		try {
			await customersApi.deleteRelatedPerson(id, rpId);
			const updated = await customersApi.getRelatedPersons(id);
			setRelatedPersons(updated);
			setToast({ message: t("customer.detail.relatedPersons.deleted"), type: "success" });
		} catch (e: any) {
			setError(e?.message ?? t("customer.detail.relatedPersons.deleteError"));
		} finally {
			setRpSubmitting(false);
		}
	}

	async function reviewDocument(docId: number, status: "APPROVED" | "REJECTED") {
		if (!id) return;
		setReviewSubmitting(true);
		setError(null);
		try {
			await customersApi.reviewDocument(id, docId, status, reviewNote || undefined);
			await load();
			setReviewingDocId(null);
			setReviewNote("");
			setToast({ 
				message: status === "APPROVED" ? t("customer.detail.documents.approved") : t("customer.detail.documents.rejected"), 
				type: "success" 
			});
		} catch (e: any) {
			const errorMessage = e?.message ?? t("customer.detail.documents.reviewError");
			setError(errorMessage);
			setToast({ message: errorMessage, type: "error" });
		} finally {
			setReviewSubmitting(false);
		}
	}

	async function simulateScreeningCheck(
		type: "SANCTIONS_SCREENING" | "PEP_SCREENING",
		result: KycCheckResult,
		source: "decision-panel" | "compliance-tab"
	) {
		if (!id) return;
		const useDecisionPanelBusy = source === "decision-panel";
		if (useDecisionPanelBusy) {
			setDecisionPanelScreeningBusy(true);
		} else {
			setComplianceAction(`simulate-${type}-${result}`);
		}
		try {
			await customersApi.createKycCheck(id, {
				type,
				result,
				provider: "ui-simulator",
				rawJson: JSON.stringify({
					source: "ui-simulator",
					simulated: true,
					screeningType: type,
					result,
					at: new Date().toISOString()
				})
			});
			await loadComplianceData();
			const typeTk = `customer.detail.compliance.checkType.${type}`;
			const typeTl = t(typeTk);
			const typeDisp = typeTl === typeTk ? type : typeTl;
			setToast({
				message: t("customer.detail.kyc.workflow.stepScreening.simulationDone", {
					type: typeDisp,
					result: kycCheckResultLabel(t, result)
				}),
				type: "success"
			});
		} catch (e) {
			setToast({ message: e instanceof Error ? e.message : String(e), type: "error" });
		} finally {
			if (useDecisionPanelBusy) {
				setDecisionPanelScreeningBusy(false);
			} else {
				setComplianceAction(null);
			}
		}
	}

	async function openDocument(documentId: number) {
		if (!id) return;
		try {
			const blob = await customersApi.getDocumentBlob(id, documentId);
			const blobUrl = URL.createObjectURL(blob);
			window.open(blobUrl, '_blank');
			setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
		} catch (e) {
			console.warn("Document could not be loaded:", e);
			const errorMsg = t("customer.detail.documents.uploadError");
			setToast({ message: errorMsg, type: "error" });
		}
	}

	function documentStatusBadgeVariant(status: Document["status"]): "neutral" | "success" | "warning" | "danger" | "info" {
		switch (status) {
			case "APPROVED":
				return "success";
			case "REJECTED":
				return "danger";
			case "PENDING":
			default:
				return "warning";
		}
	}

	if (loading) {
		return (
			<div className={`${OPS_PAGE_STACK} w-full min-w-0`}>
				<OpsLoadingState message={t("customer.detail.loading")} />
			</div>
		);
	}

	if (error && !customer) {
		return (
			<div className="mx-auto max-w-2xl space-y-6 pb-12">
				<div className="flex items-start gap-3 rounded-2xl border border-red-200/90 bg-red-50/90 px-5 py-4 text-red-900 shadow-sm">
					<svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
					</svg>
					<div>
						<div className="font-medium">{t("customer.detail.error")}</div>
						<div className="text-sm mt-1">{error || t("customer.detail.notFound")}</div>
					</div>
				</div>
				<Link href="/customers">
					<Button className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						{t("customer.detail.backToList")}
					</Button>
				</Link>
			</div>
		);
	}

	if (!loading && customer && customer.type !== expectedType) {
		const correctPath = customerDetailPath(customer.id, customer.type);
		return (
			<div className={`${OPS_PAGE_STACK} w-full min-w-0`}>
				<OpsInlineAlert variant="warning">
					<div>
						<p className="font-medium">{t("customer.detail.wrongRouteTitle")}</p>
						<p className="mt-2 text-sm leading-relaxed opacity-90">
							{t("customer.detail.wrongRouteDescription", {
								opened: t(`customer.types.${expectedType}`),
								actual: t(`customer.types.${customer.type}`)
							})}
						</p>
					</div>
				</OpsInlineAlert>
				<div className="flex flex-wrap gap-3">
					<Link href={correctPath}>
						<Button>{t("customer.detail.wrongRouteOpenButton")}</Button>
					</Link>
					<Link href="/customers">
						<Button variant="outline">{t("customer.detail.backToList")}</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className={`${OPS_PAGE_STACK} w-full min-w-0 pb-8`}>
			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					onClose={() => setToast(null)}
				/>
			)}
			<OpsModal
				open={kycRiskRunModalOpen}
				onOpenChange={open => {
					setKycRiskRunModalOpen(open);
					if (!open) {
						setKycRiskRunDetail(null);
						setKycRiskRunDetailLoading(false);
					}
				}}
				size="xl"
				className="!p-8 sm:!p-10"
				title={
					kycRiskRunDetail
						? t("customer.detail.compliance.riskRunsHistory.modalTitle", { id: kycRiskRunDetail.id })
						: t("customer.detail.compliance.riskRunsHistory.modalTitleLoading")
				}
				description={
					kycRiskRunDetail?.createdAt
						? new Date(kycRiskRunDetail.createdAt).toLocaleString(locale)
						: undefined
				}
			>
				{kycRiskRunDetailLoading ? (
					<OpsLoadingState embedded message={t("customer.detail.compliance.riskRunsHistory.modalLoading")} />
				) : kycRiskRunDetail ? (
					<div className="space-y-4 text-sm text-ops-fg">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div className="rounded-lg border border-ops-border bg-ops-surface-muted/40 px-3 py-2">
								<p className="text-[10px] font-semibold uppercase tracking-wide text-ops-fg-muted">
									{t("customer.detail.compliance.riskRunsHistory.columnSource")}
								</p>
								<p className="mt-0.5 font-medium">{kycRiskRunSourceLabel(kycRiskRunDetail.runSource)}</p>
							</div>
							<div className="rounded-lg border border-ops-border bg-ops-surface-muted/40 px-3 py-2">
								<p className="text-[10px] font-semibold uppercase tracking-wide text-ops-fg-muted">
									{t("customer.detail.compliance.riskRunsHistory.modalMetaPep")}
								</p>
								<p className="mt-0.5 font-medium">
									{kycRiskRunDetail.analystPepFlag
										? t("customer.detail.compliance.riskRunsHistory.yes")
										: t("customer.detail.compliance.riskRunsHistory.no")}
								</p>
							</div>
							<div className="rounded-lg border border-ops-border bg-ops-surface-muted/40 px-3 py-2 sm:col-span-2">
								<p className="text-[10px] font-semibold uppercase tracking-wide text-ops-fg-muted">
									{t("customer.detail.compliance.riskRunsHistory.modalInputHash")}
								</p>
								<code className="mt-1 block break-all text-xs text-ops-fg">{kycRiskRunDetail.inputHash}</code>
							</div>
						</div>
						<div className="flex flex-wrap gap-3">
							<div
								className={`flex min-w-[7rem] flex-1 flex-col rounded-lg border px-3 py-2 ${
									riskBadgeVariant(kycRiskRunDetail.proposedRiskScore) === "danger"
										? "border-red-200/90 bg-red-50/60"
										: riskBadgeVariant(kycRiskRunDetail.proposedRiskScore) === "warning"
											? "border-amber-200/90 bg-amber-50/50"
											: "border-emerald-200/90 bg-emerald-50/40"
								}`}
							>
								<span className="text-[10px] font-semibold uppercase text-ops-fg-muted">
									{t("customer.detail.kyc.onboardingRisk.proposed")}
								</span>
								<span className="text-xl font-bold tabular-nums">{kycRiskRunDetail.proposedRiskScore}</span>
								<span className="text-xs text-ops-fg-muted">/100</span>
							</div>
							<div className="flex min-w-[6rem] flex-col gap-1 rounded-lg border border-ops-border bg-ops-surface-muted/60 px-3 py-2">
								<span className="text-[10px] font-semibold uppercase text-ops-fg-muted">
									{t("customer.detail.kyc.onboardingRisk.band")}
								</span>
								<Badge variant={onboardingRiskBandBadgeVariant(kycRiskRunDetail.riskBand)} className="w-fit text-[11px] font-semibold">
									{onboardingRiskBandLabel(kycRiskRunDetail.riskBand)}
								</Badge>
							</div>
							{kycRiskRunDetail.decision ? (
								<div className="flex min-w-[8rem] flex-col gap-1 rounded-lg border border-ops-border bg-ops-surface-muted/60 px-3 py-2">
									<span className="text-[10px] font-semibold uppercase text-ops-fg-muted">
										{t("customer.detail.kyc.onboardingRisk.decisionLabel")}
									</span>
									<Badge variant={onboardingRiskDecisionBadgeVariant(kycRiskRunDetail.decision)} className="w-fit text-[11px] font-semibold">
										{onboardingRiskDecisionLabel(kycRiskRunDetail.decision)}
									</Badge>
								</div>
							) : null}
						</div>
						{kycRiskRunDetail.blocked ? (
							<div className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-xs text-red-900">
								<span className="font-semibold">{t("customer.detail.kyc.onboardingRisk.blockedTitle")}</span>
								{": "}
								{onboardingRiskBlockReasonLabel(kycRiskRunDetail.blockReasonCode)}
							</div>
						) : null}
						{kycRiskRunDetail.matchedRules && kycRiskRunDetail.matchedRules.length > 0 ? (
							<div>
								<p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ops-fg-muted">
									{t("customer.detail.kyc.onboardingRisk.matchedRulesTitle")}
								</p>
								<ul className="flex flex-wrap gap-1">
									{kycRiskRunDetail.matchedRules.map(rule => (
										<li key={rule}>
											<code className="rounded bg-ops-surface-muted px-1.5 py-0.5 text-[11px]">{rule}</code>
										</li>
									))}
								</ul>
							</div>
						) : null}
						<div className="rounded-lg border border-slate-200/80 bg-slate-50/50">
							<div className="border-b border-slate-200/70 bg-white/90 px-3 py-1.5">
								<p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
									{t("customer.detail.kyc.onboardingRisk.components")}
								</p>
							</div>
							<ul className="max-h-48 divide-y divide-slate-200/60 overflow-y-auto">
								{kycRiskRunDetail.components.map((c, i) => (
									<li key={`${c.code}-${i}`} className="px-3 py-2">
										<div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
											<div className="flex min-w-0 flex-1 items-center gap-2">
												<span className="shrink-0 rounded bg-ops-surface-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ops-fg">
													{c.code}
												</span>
												<span className="truncate text-xs font-medium text-ops-fg" title={c.label}>
													{c.label}
												</span>
											</div>
											<span className="shrink-0 rounded-md bg-ops-surface-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ops-fg">
												{t("customer.detail.kyc.onboardingRisk.floorShort", { n: c.floorAfterComponent })}
											</span>
										</div>
										<p className="mt-1 break-words text-[11px] leading-snug text-ops-fg-muted">{c.detail}</p>
									</li>
								))}
							</ul>
						</div>
						<p className="text-[10px] text-slate-500">
							<span className="font-medium uppercase tracking-wide">{t("customer.detail.kyc.onboardingRisk.algorithm")}</span>{" "}
							<code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-800">{kycRiskRunDetail.algorithmVersion}</code>
						</p>
					</div>
				) : (
					<p className="text-sm text-ops-fg-muted">{t("customer.detail.compliance.riskRunsHistory.modalEmpty")}</p>
				)}
			</OpsModal>
			<datalist id="nace-suggestions-customer-detail">
				{NACE_ACTIVITY_CODE_SUGGESTIONS.map(code => (
					<option key={code} value={code} />
				))}
			</datalist>

			<Link
				href="/customers"
				className="inline-flex items-center gap-1.5 text-sm font-medium text-ops-fg-muted transition hover:text-ops-fg"
			>
				<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
				</svg>
				{t("customer.detail.backToList")}
			</Link>

			<OpsPageHeader
				leading={
					customer ? (
						<div className="shrink-0" aria-label={t("customer.detail.photo.selfieLabel")}>
							{selfieUrl && id && !selfieError ? (
								<div className="relative h-14 w-14 sm:h-16 sm:w-16">
									<img
										src={selfieUrl}
										alt={t("customer.detail.photo.alt")}
										className="h-full w-full rounded-2xl border border-ops-border object-cover shadow-sm"
										onError={() => setSelfieError(true)}
										onLoad={() => setSelfieError(false)}
									/>
									{selfieDocument?.status === "APPROVED" && (
										<div className="absolute bottom-0.5 right-0.5 rounded-md border-2 border-white bg-emerald-600 p-0.5 shadow-sm" title={documentReviewStatusLabel(t, "APPROVED")}>
											<svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
												<path
													fillRule="evenodd"
													d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
													clipRule="evenodd"
												/>
											</svg>
										</div>
									)}
								</div>
							) : (
								<div
									className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-dashed border-ops-border bg-ops-surface-muted sm:h-16 sm:w-16"
									role="img"
									aria-label={t("customer.detail.photo.alt")}
								>
									<svg className="h-8 w-8 text-ops-fg-muted/50 sm:h-9 sm:w-9" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
										<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
									</svg>
								</div>
							)}
						</div>
					) : undefined
				}
				title={
					<span className="inline-flex flex-wrap items-center gap-2">
						<span>{customer?.displayName || `${t("common.customers")} #${id}`}</span>
						{customer ? (
							<span className="inline-flex items-center rounded-full border border-ops-border bg-ops-surface-muted px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-ops-fg-muted">
								{t(`customer.types.${customer.type}`)}
							</span>
						) : null}
					</span>
				}
				description={t("customer.detail.subtitle")}
				actions={
					<>
						<Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
							</svg>
							{t("customer.detail.back")}
						</Button>
						<Button variant="outline" onClick={() => load()} className="flex items-center gap-2">
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							{t("common.refresh")}
						</Button>
					</>
				}
			/>

			{customer && expectedType === "BUSINESS" && (
				<div className={`${OPS_CARD_SHELL} px-4 py-3 sm:px-5 sm:py-4`}>
					<div className="flex flex-wrap items-center gap-x-5 gap-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-[11px] font-semibold uppercase tracking-wide text-ops-fg-muted">
								{t("customer.detail.headerStrip.dossierStatus")}
							</span>
							<Badge variant={statusBadgeVariant(customer.status)} className="gap-0 text-xs font-medium">
								<span>{translatedCustomerStatus(t, customer.status)}</span>
								<span className="ml-1.5 font-mono text-[10px] font-normal opacity-70">
									{t("customer.detail.headerStrip.statusCode", { code: customer.status })}
								</span>
							</Badge>
						</div>
						<div className="hidden h-4 w-px bg-ops-border sm:block" aria-hidden />
						<div className="flex flex-wrap items-center gap-2 text-xs text-ops-fg">
							<span className="font-medium text-ops-fg-muted">{t("customer.detail.headerStrip.clientId")}</span>
							<span className="rounded-md border border-ops-border bg-ops-surface-muted px-2 py-0.5 font-mono">{customer.id}</span>
						</div>
						<div className="flex flex-wrap items-center gap-2 text-xs text-ops-fg">
							<span className="font-medium text-ops-fg-muted">{t("customer.detail.headerStrip.typeLabel")}</span>
							<span className="rounded-md border border-ops-border bg-ops-surface-muted px-2 py-0.5">{t(`customer.types.${customer.type}`)}</span>
						</div>
						{typeof customer.riskScore === "number" && (
							<div className="flex flex-wrap items-center gap-2 text-xs text-ops-fg">
								<span className="font-medium text-ops-fg-muted">{t("customer.detail.headerStrip.riskScore")}</span>
								<Badge variant={riskBadgeVariant(customer.riskScore)} className="text-[11px]">
									{customer.riskScore}/100
								</Badge>
							</div>
						)}
						{customer.lastRiskAssessmentAt && (
							<div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-ops-fg">
								<span className="shrink-0 font-medium text-ops-fg-muted">{t("customer.detail.headerStrip.lastRiskAt")}</span>
								<span className="truncate tabular-nums">{new Date(customer.lastRiskAssessmentAt).toLocaleString(locale)}</span>
							</div>
						)}
						<div className="flex flex-wrap items-center gap-2 text-xs text-ops-fg">
							<span className="font-medium text-ops-fg-muted">{t("customer.detail.headerStrip.pepLabel")}</span>
							<Badge variant={customer.pepFlag ? "danger" : "success"} className="text-[11px]">
								{customer.pepFlag ? t("customer.detail.generalInfo.yes") : t("customer.detail.generalInfo.no")}
							</Badge>
						</div>
					</div>
				</div>
			)}

			{error && customer ? (
				<OpsInlineAlert variant="error">
					<span className="text-sm">{error}</span>
				</OpsInlineAlert>
			) : null}

			{customer && expectedType === "BUSINESS" && (
				<div className={`${OPS_CARD_SHELL} p-4 sm:p-5`}>
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="min-w-0 flex-1 space-y-2">
							<h3 className="text-sm font-semibold tracking-tight text-ops-fg">{t("customer.detail.headerDecision.title")}</h3>
							<p className="max-w-prose text-xs leading-relaxed text-ops-fg-muted">{t("customer.detail.headerDecision.hint")}</p>
							{kycChecks.length > 0 ? (
								<div className="flex flex-wrap items-center gap-2">
									{listScreeningPresence.latestSanctions ? (
										<Badge variant={kycCheckResultBadgeVariant(listScreeningPresence.latestSanctions.result)}>
											{t("customer.detail.headerDecision.screeningSanctions")}:{" "}
											{kycCheckResultLabel(t, listScreeningPresence.latestSanctions.result)}
										</Badge>
									) : null}
									{listScreeningPresence.latestPep ? (
										<Badge variant={kycCheckResultBadgeVariant(listScreeningPresence.latestPep.result)}>
											{t("customer.detail.headerDecision.screeningPep")}: {kycCheckResultLabel(t, listScreeningPresence.latestPep.result)}
										</Badge>
									) : null}
									{!listScreeningPresence.latestSanctions && !listScreeningPresence.latestPep ? (
										<span className="text-xs text-ops-fg-muted">—</span>
									) : null}
								</div>
							) : (
								<p className="text-xs text-ops-fg-muted">{complianceLoading ? t("customer.detail.loading") : "—"}</p>
							)}
						</div>
						<div className="flex flex-wrap gap-2 lg:shrink-0">
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => {
									setActiveTab("compliance");
									setComplianceInnerTab("review");
								}}
							>
								{t("customer.detail.headerDecision.openReview")}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => {
									setActiveTab("compliance");
									setComplianceInnerTab("decision");
								}}
							>
								{t("customer.detail.headerDecision.openRejectSection")}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => {
									setActiveTab("compliance");
									setComplianceInnerTab("screeningChecks");
								}}
							>
								{t("customer.detail.headerDecision.openScreening")}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => {
									setActiveTab("compliance");
									setComplianceInnerTab("auditTrail");
									setKycAuditTrailPage(0);
								}}
							>
								{t("customer.detail.headerDecision.openAudit")}
							</Button>
							<Button type="button" size="sm" variant="outline" onClick={() => router.push(`/aml/alerts?clientId=${customer.id}`)}>
								{t("customer.detail.headerDecision.openAmlAlerts")}
							</Button>
						</div>
					</div>
				</div>
			)}

			<div className={OPS_CARD_SHELL}>
				<nav className="flex gap-1 overflow-x-auto border-b border-ops-border bg-ops-surface-muted px-2 py-2 sm:px-3" aria-label={t("customer.detail.subtitle")}>
					{tabs.map(tab => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap shrink-0 ${
								activeTab === tab.id ? "bg-ops-surface text-ops-fg shadow-sm ring-1 ring-ops-border" : "text-ops-fg-muted hover:bg-ops-surface hover:text-ops-fg"
							}`}
						>
							{tab.label}
						</button>
					))}
				</nav>

				<div className="min-h-[280px] bg-ops-surface p-4 sm:p-6 lg:p-8">
				{activeTab === "dossier" && customer && (
					<div className="space-y-6">
					<div className="space-y-6">
						<div className={OPS_CARD_SHELL}>
							<div className={`${OPS_CARD_HEADER} flex flex-wrap items-center justify-between gap-4`}>
								<div className="flex min-w-0 flex-1 items-start gap-3">
									{expectedType === "BUSINESS" && (
										<div className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ops-fg-muted text-white sm:flex" aria-hidden>
											<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={1.75}
													d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
												/>
											</svg>
										</div>
									)}
									{expectedType === "PERSON" && (
										<div className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ops-fg-muted text-white sm:flex" aria-hidden>
											<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={1.75}
													d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
												/>
											</svg>
										</div>
									)}
									<div className="min-w-0">
										<h2 className="text-lg font-semibold tracking-tight text-ops-fg">
											{expectedType === "BUSINESS"
												? t("customer.detail.profile.businessTitle")
												: t("customer.detail.profile.title")}
										</h2>
										{expectedType === "PERSON" ? (
											<p className="mt-1 text-xs text-ops-fg-muted">{t("customer.detail.profile.subtitle")}</p>
										) : null}
									</div>
								</div>
								{!isEditingProfile ? (
									<Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)} className="shrink-0">
										{t("customer.detail.generalInfo.edit")}
									</Button>
								) : null}
							</div>
							<div className="p-6 sm:p-8">
								{customer.type === "PERSON" ? (
									!isEditingProfile ? (
										<div className="space-y-8 rounded-lg border border-ops-border bg-ops-surface-muted/50 p-5 sm:p-6">
											<section>
												<h3 className="border-b border-slate-200/80 pb-2 text-xs font-bold uppercase tracking-wider text-black">
													{t("customer.detail.profile.sectionIdentity")}
												</h3>
												<dl className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
															{t("customer.detail.profile.lastName")}
														</dt>
														<dd className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">{customer.lastName ?? "—"}</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
															{t("customer.detail.profile.firstName")}
														</dt>
														<dd className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">{customer.firstName ?? "—"}</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t("customer.detail.profile.gender")}</dt>
														<dd className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">
															{customer.gender
																? (t(`customer.detail.profile.genderValue.${customer.gender}`) !==
																  `customer.detail.profile.genderValue.${customer.gender}`
																	? t(`customer.detail.profile.genderValue.${customer.gender}`)
																	: customer.gender)
																: "—"}
														</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t("customer.detail.profile.birthDate")}</dt>
														<dd className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">
															{customer.birthDate
																? new Date(customer.birthDate).toLocaleDateString(locale, {
																		year: "numeric",
																		month: "long",
																		day: "numeric"
																	})
																: "—"}
														</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
															{t("customer.detail.profile.maritalStatus")}
														</dt>
														<dd className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">
															{customer.maritalStatus
																? (t(`customer.detail.profile.maritalStatusValue.${customer.maritalStatus}`) !==
																  `customer.detail.profile.maritalStatusValue.${customer.maritalStatus}`
																	? t(`customer.detail.profile.maritalStatusValue.${customer.maritalStatus}`)
																	: customer.maritalStatus)
																: "—"}
														</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
															{t("customer.detail.profile.nationality")}
														</dt>
														<dd className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">
															{customer.nationality
																? `${formatNationalityLabel(customer.nationality, i18n.language)} (${customer.nationality})`
																: "—"}
														</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
															{t("customer.detail.profile.taxResidence")}
														</dt>
														<dd className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">
															{customer.taxResidenceCountry
																? `${formatNationalityLabel(customer.taxResidenceCountry, i18n.language)} (${customer.taxResidenceCountry})`
																: "—"}
														</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
															{t("customer.detail.profile.taxIdentification")}
														</dt>
														<dd className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">
															{customer.taxIdentificationNumber?.trim() || "—"}
														</dd>
													</div>
												</dl>
											</section>
											<section className="border-t border-slate-100 pt-8">
												<h3 className="border-b border-slate-200/80 pb-2 text-xs font-bold uppercase tracking-wider text-black">
													{t("customer.detail.profile.sectionProfessional")}
												</h3>
												<dl className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
													<div className="sm:col-span-2 lg:col-span-3">
														<dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
															{t("customer.detail.profile.professionalActivity")}
														</dt>
														<dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
															{(() => {
																const v = customer.professionalActivity?.trim() ?? "";
																if (!v) return "—";
																return isPersonProfessionValue(v)
																	? t(`customer.wizard.profile.profession.${v}`)
																	: v;
															})()}
														</dd>
													</div>
													<div className="sm:col-span-2 lg:col-span-3">
														<dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">
															{t("customer.detail.profile.incomeSource")}
														</dt>
														<dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
															{(() => {
																const v = customer.incomeSource?.trim() ?? "";
																if (!v) return "—";
																return isPersonIncomeSourceValue(v)
																	? t(`customer.wizard.profile.incomeSourceOption.${v}`)
																	: v;
															})()}
														</dd>
													</div>
												</dl>
											</section>
										</div>
									) : (
										<form
											onSubmit={e => {
												e.preventDefault();
												handleSaveProfile();
											}}
											className="space-y-6"
										>
											<div className="space-y-8 rounded-lg border border-ops-border bg-ops-surface-muted/50 p-5 sm:p-6">
												<section>
													<h3 className="border-b border-slate-200/80 pb-2 text-xs font-bold uppercase tracking-wider text-black">
														{t("customer.detail.profile.sectionIdentity")}
													</h3>
													<div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
																{t("customer.detail.profile.lastName")}
															</label>
															<Input
																value={profileFormData.lastName}
																onChange={e => setProfileFormData(prev => ({ ...prev, lastName: e.target.value }))}
															/>
														</div>
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
																{t("customer.detail.profile.firstName")}
															</label>
															<Input
																value={profileFormData.firstName}
																onChange={e => setProfileFormData(prev => ({ ...prev, firstName: e.target.value }))}
															/>
														</div>
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
																{t("customer.detail.profile.gender")}
															</label>
															<select
																value={profileFormData.gender}
																onChange={e => setProfileFormData(prev => ({ ...prev, gender: e.target.value }))}
																className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															>
																<option value="">—</option>
																<option value="MALE">{t("customer.detail.profile.genderValue.MALE")}</option>
																<option value="FEMALE">{t("customer.detail.profile.genderValue.FEMALE")}</option>
																<option value="OTHER">{t("customer.detail.profile.genderValue.OTHER")}</option>
															</select>
														</div>
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
																{t("customer.detail.profile.birthDate")}
															</label>
															<Input
																type="date"
																value={profileFormData.birthDate}
																onChange={e => setProfileFormData(prev => ({ ...prev, birthDate: e.target.value }))}
															/>
														</div>
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
																{t("customer.detail.profile.maritalStatus")}
															</label>
															<select
																value={profileFormData.maritalStatus}
																onChange={e => setProfileFormData(prev => ({ ...prev, maritalStatus: e.target.value }))}
																className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															>
																<option value="">—</option>
																<option value="SINGLE">{t("customer.detail.profile.maritalStatusValue.SINGLE")}</option>
																<option value="MARRIED">{t("customer.detail.profile.maritalStatusValue.MARRIED")}</option>
																<option value="DIVORCED">{t("customer.detail.profile.maritalStatusValue.DIVORCED")}</option>
																<option value="WIDOWED">{t("customer.detail.profile.maritalStatusValue.WIDOWED")}</option>
																<option value="OTHER">{t("customer.detail.profile.maritalStatusValue.OTHER")}</option>
															</select>
														</div>
														<div className="sm:col-span-2 lg:col-span-3">
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
																{t("customer.detail.profile.nationality")}
															</label>
															<select
																value={profileFormData.nationality}
																onChange={e => setProfileFormData(prev => ({ ...prev, nationality: e.target.value }))}
																className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															>
																<option value="">{t("customer.detail.profile.nationalityPlaceholder")}</option>
																{nationalityOptions.map(opt => (
																	<option key={opt.code} value={opt.code}>
																		{opt.label} ({opt.code})
																	</option>
																))}
															</select>
														</div>
														<div className="sm:col-span-2 lg:col-span-3">
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
																{t("customer.detail.profile.taxResidence")} <span className="text-red-500">*</span>
															</label>
															<select
																value={profileFormData.taxResidenceCountry}
																onChange={e =>
																	setProfileFormData(prev => ({ ...prev, taxResidenceCountry: e.target.value }))
																}
																className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															>
																<option value="">{t("customer.detail.profile.nationalityPlaceholder")}</option>
																{nationalityOptions.map(opt => (
																	<option key={opt.code} value={opt.code}>
																		{opt.label} ({opt.code})
																	</option>
																))}
															</select>
														</div>
														<div className="sm:col-span-2 lg:col-span-3">
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
																{t("customer.detail.profile.taxIdentification")}
															</label>
															<Input
																value={profileFormData.taxIdentificationNumber}
																onChange={e =>
																	setProfileFormData(prev => ({ ...prev, taxIdentificationNumber: e.target.value }))
																}
																maxLength={64}
															/>
														</div>
													</div>
												</section>
												<section className="border-t border-slate-100 pt-8">
													<h3 className="border-b border-slate-200/80 pb-2 text-xs font-bold uppercase tracking-wider text-black">
														{t("customer.detail.profile.sectionProfessional")}
													</h3>
													<div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
														<div className="sm:col-span-2 lg:col-span-3">
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
																{t("customer.detail.profile.professionalActivity")} <span className="text-red-500">*</span>
															</label>
															<select
																value={profileFormData.professionalActivity}
																onChange={e =>
																	setProfileFormData(prev => ({ ...prev, professionalActivity: e.target.value }))
																}
																className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															>
																<option value="">{t("customer.wizard.profile.selectFromList")}</option>
																{PERSON_PROFESSION_VALUES.map(code => (
																	<option key={code} value={code}>
																		{t(`customer.wizard.profile.profession.${code}`)}
																	</option>
																))}
															</select>
														</div>
														<div className="sm:col-span-2 lg:col-span-3">
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
																{t("customer.detail.profile.incomeSource")} <span className="text-red-500">*</span>
															</label>
															<select
																value={profileFormData.incomeSource}
																onChange={e => setProfileFormData(prev => ({ ...prev, incomeSource: e.target.value }))}
																className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															>
																<option value="">{t("customer.wizard.profile.selectFromList")}</option>
																{PERSON_INCOME_SOURCE_VALUES.map(code => (
																	<option key={code} value={code}>
																		{t(`customer.wizard.profile.incomeSourceOption.${code}`)}
																	</option>
																))}
															</select>
														</div>
													</div>
												</section>
											</div>
											<div className="flex gap-2 border-t border-slate-200/80 pt-4">
												<Button type="submit" disabled={savingProfile}>
													{savingProfile ? t("customer.detail.generalInfo.saving") : t("customer.detail.generalInfo.save")}
												</Button>
												<Button type="button" variant="outline" onClick={handleCancelProfile} disabled={savingProfile}>
													{t("customer.detail.generalInfo.cancel")}
												</Button>
											</div>
										</form>
									)
								) : !isEditingProfile ? (
									<div className="space-y-4">
										<p className="text-xs font-semibold uppercase tracking-wide text-black">
											{t("customer.detail.business.title")}
										</p>
										<div className="overflow-hidden rounded-xl border border-violet-200/85 bg-white shadow-sm ring-1 ring-violet-950/[0.06]">
											<div className="flex items-center gap-2 border-b border-ops-border bg-ops-surface-muted px-4 py-2.5">
												<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm">
													<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
														/>
													</svg>
												</div>
												<h4 className="text-xs font-bold uppercase tracking-wider text-black">
													{t("customer.detail.profile.sectionLegal")}
												</h4>
											</div>
											<div className="bg-ops-surface p-4 sm:p-5">
												<dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.business.fields.tradeName")}
														</dt>
														<dd className="mt-1.5 text-sm font-normal leading-relaxed text-slate-800">{customer.tradeName?.trim() || "—"}</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.business.fields.legalForm")}
														</dt>
														<dd className="mt-1.5 text-sm font-normal leading-relaxed text-slate-800">{customer.legalForm?.trim() || "—"}</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.business.fields.registrationNumber")}
														</dt>
														<dd className="mt-1.5 text-sm font-normal leading-relaxed text-slate-800">{customer.registrationNumber?.trim() || "—"}</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.business.fields.incorporationDate")}
														</dt>
														<dd className="mt-1.5 text-sm font-normal leading-relaxed text-slate-800">
															{customer.incorporationDate
																? new Date(customer.incorporationDate).toLocaleDateString(locale, {
																		year: "numeric",
																		month: "long",
																		day: "numeric"
																	})
																: "—"}
														</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.business.fields.incorporationCountry")}
														</dt>
														<dd className="mt-1.5 text-sm font-normal leading-relaxed text-slate-800">
															{customer.incorporationCountry
																? `${formatNationalityLabel(customer.incorporationCountry, i18n.language)} (${customer.incorporationCountry})`
																: "—"}
														</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.profile.taxResidence")}
														</dt>
														<dd className="mt-1.5 text-sm font-normal leading-relaxed text-slate-800">
															{customer.taxResidenceCountry
																? `${formatNationalityLabel(customer.taxResidenceCountry, i18n.language)} (${customer.taxResidenceCountry})`
																: "—"}
														</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.profile.taxIdentification")}
														</dt>
														<dd className="mt-1.5 text-sm font-normal leading-relaxed text-slate-800">
															{customer.taxIdentificationNumber?.trim() || "—"}
														</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">{t("customer.detail.business.website")}</dt>
														<dd className="mt-1.5 text-sm font-normal leading-relaxed text-slate-800">
															{customer.websiteUrl?.trim() ? (
																<a
																	href={
																		/^https?:\/\//i.test(customer.websiteUrl.trim())
																			? customer.websiteUrl.trim()
																			: `https://${customer.websiteUrl.trim()}`
																	}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-black underline decoration-slate-300 underline-offset-2 hover:text-slate-800"
																>
																	{customer.websiteUrl.trim()}
																</a>
															) : (
																"—"
															)}
														</dd>
													</div>
												</dl>
											</div>
										</div>

										<div className="overflow-hidden rounded-xl border border-violet-200/85 bg-white shadow-sm ring-1 ring-violet-950/[0.06]">
											<div className="flex items-center gap-2 border-b border-ops-border bg-ops-surface-muted px-4 py-2.5">
												<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
													<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
														/>
													</svg>
												</div>
												<h4 className="text-xs font-bold uppercase tracking-wider text-black">
													{t("customer.detail.profile.sectionActivityGovernance")}
												</h4>
											</div>
											<div className="bg-ops-surface p-4 sm:p-5">
												<dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.business.fields.activityCode")}
														</dt>
														<dd className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">
															{customer.activityCode?.trim() || "—"}
														</dd>
													</div>
													<div className="sm:col-span-2 lg:col-span-3">
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.business.fields.activityDescription")}
														</dt>
														<dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
															{customer.activityDescription?.trim() || "—"}
														</dd>
													</div>
													<div className="sm:col-span-2 lg:col-span-3">
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.business.fields.signingAuthorityNote")}
														</dt>
														<dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
															{customer.signingAuthorityNote?.trim() || "—"}
														</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.business.fields.employeeCount")}
														</dt>
														<dd className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">
															{customer.employeeCount != null && !Number.isNaN(Number(customer.employeeCount))
																? String(customer.employeeCount)
																: "—"}
														</dd>
													</div>
												</dl>
											</div>
										</div>

										<div className="overflow-hidden rounded-xl border border-violet-200/85 bg-white shadow-sm ring-1 ring-violet-950/[0.06]">
											<div className="flex items-center gap-2 border-b border-ops-border bg-ops-surface-muted px-4 py-2.5">
												<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-700 text-white shadow-sm">
													<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
														/>
													</svg>
												</div>
												<h4 className="text-xs font-bold uppercase tracking-wider text-black">
													{t("customer.detail.profile.sectionFinancial")}
												</h4>
											</div>
											<div className="bg-ops-surface p-4 sm:p-5">
												<dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.business.fields.annualRevenueBand")}
														</dt>
														<dd className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">
															{customer.annualRevenueBand
																? (() => {
																		const key = `customer.wizard.business.financial.revenueBands.${customer.annualRevenueBand}`;
																		const tr = t(key);
																		return tr === key ? customer.annualRevenueBand : tr;
																	})()
																: "—"}
														</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.business.fields.currenciesUsed")}
														</dt>
														<dd className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">{customer.currenciesUsed?.trim() || "—"}</dd>
													</div>
													<div className="sm:col-span-2 lg:col-span-3">
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.business.fields.expectedTransactionProfile")}
														</dt>
														<dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
															{customer.expectedTransactionProfile?.trim() || "—"}
														</dd>
													</div>
													<div className="sm:col-span-2 lg:col-span-3">
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.business.fields.fundsSource")}
														</dt>
														<dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{customer.fundsSource?.trim() || "—"}</dd>
													</div>
													<div className="sm:col-span-2 lg:col-span-3">
														<dt className="text-xs font-semibold uppercase tracking-wide text-black">
															{t("customer.detail.business.fields.accountOpeningPurpose")}
														</dt>
														<dd className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
															{customer.accountOpeningPurpose?.trim() || "—"}
														</dd>
													</div>
												</dl>
											</div>
										</div>
									</div>
								) : (
									<form
										onSubmit={e => {
											e.preventDefault();
											handleSaveProfile();
										}}
										className="space-y-6"
									>
										<div className="space-y-4">
											<p className="text-xs font-semibold uppercase tracking-wide text-black">
												{t("customer.detail.business.title")}
											</p>
											<div className="overflow-hidden rounded-xl border border-violet-200/85 bg-white shadow-sm ring-1 ring-violet-950/[0.06]">
												<div className="flex items-center gap-2 border-b border-ops-border bg-ops-surface-muted px-4 py-2.5">
													<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm">
														<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
															/>
														</svg>
													</div>
													<h4 className="text-xs font-bold uppercase tracking-wider text-black">
														{t("customer.detail.profile.sectionLegal")}
													</h4>
												</div>
												<div className="bg-ops-surface p-4 sm:p-5">
													<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.fields.tradeName")}
															</label>
															<Input
																value={businessProfileFormData.tradeName}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({ ...prev, tradeName: e.target.value }))
																}
																maxLength={255}
															/>
														</div>
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.fields.legalForm")} <span className="text-red-500">*</span>
															</label>
															<select
																value={businessProfileFormData.legalForm}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({ ...prev, legalForm: e.target.value }))
																}
																className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															>
																<option value="">{t("customer.wizard.business.entity.legalFormPlaceholder")}</option>
																{LEGAL_FORM_OPTIONS.map(opt => (
																	<option key={opt} value={opt}>
																		{opt}
																	</option>
																))}
															</select>
														</div>
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.fields.registrationNumber")} <span className="text-red-500">*</span>
															</label>
															<Input
																value={businessProfileFormData.registrationNumber}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({ ...prev, registrationNumber: e.target.value }))
																}
																maxLength={64}
															/>
														</div>
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.fields.incorporationDate")} <span className="text-red-500">*</span>
															</label>
															<Input
																type="date"
																value={businessProfileFormData.incorporationDate}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({ ...prev, incorporationDate: e.target.value }))
																}
															/>
														</div>
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.fields.incorporationCountry")} <span className="text-red-500">*</span>
															</label>
															<select
																value={businessProfileFormData.incorporationCountry}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({
																		...prev,
																		incorporationCountry: e.target.value
																	}))
																}
																className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															>
																<option value="">{t("customer.detail.profile.nationalityPlaceholder")}</option>
																{nationalityOptions.map(opt => (
																	<option key={opt.code} value={opt.code}>
																		{opt.label} ({opt.code})
																	</option>
																))}
															</select>
														</div>
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.profile.taxResidence")} <span className="text-red-500">*</span>
															</label>
															<select
																value={businessProfileFormData.taxResidenceCountry}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({
																		...prev,
																		taxResidenceCountry: e.target.value
																	}))
																}
																className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															>
																<option value="">{t("customer.detail.profile.nationalityPlaceholder")}</option>
																{nationalityOptions.map(opt => (
																	<option key={opt.code} value={opt.code}>
																		{opt.label} ({opt.code})
																	</option>
																))}
															</select>
														</div>
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.profile.taxIdentification")}
															</label>
															<Input
																value={businessProfileFormData.taxIdentificationNumber}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({
																		...prev,
																		taxIdentificationNumber: e.target.value
																	}))
																}
																maxLength={64}
															/>
														</div>
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.website")}
															</label>
															<Input
																value={businessProfileFormData.websiteUrl}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({ ...prev, websiteUrl: e.target.value }))
																}
																placeholder="https://…"
															/>
														</div>
													</div>
												</div>
											</div>

											<div className="overflow-hidden rounded-xl border border-violet-200/85 bg-white shadow-sm ring-1 ring-violet-950/[0.06]">
												<div className="flex items-center gap-2 border-b border-ops-border bg-ops-surface-muted px-4 py-2.5">
													<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
														<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
															/>
														</svg>
													</div>
													<h4 className="text-xs font-bold uppercase tracking-wider text-black">
														{t("customer.detail.profile.sectionActivityGovernance")}
													</h4>
												</div>
												<div className="bg-ops-surface p-4 sm:p-5">
													<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.fields.activityCode")} <span className="text-red-500">*</span>
															</label>
															<Input
																value={businessProfileFormData.activityCode}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({
																		...prev,
																		activityCode: e.target.value
																	}))
																}
																list="nace-suggestions-customer-detail"
																maxLength={32}
																placeholder="62.01"
																autoComplete="off"
															/>
														</div>
														<div className="sm:col-span-2 lg:col-span-3">
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.fields.activityDescription")} <span className="text-red-500">*</span>
															</label>
															<textarea
																value={businessProfileFormData.activityDescription}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({
																		...prev,
																		activityDescription: e.target.value
																	}))
																}
																maxLength={1000}
																rows={4}
																className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															/>
														</div>
														<div className="sm:col-span-2 lg:col-span-3">
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.fields.signingAuthorityNote")}
															</label>
															<textarea
																value={businessProfileFormData.signingAuthorityNote}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({
																		...prev,
																		signingAuthorityNote: e.target.value
																	}))
																}
																maxLength={4000}
																rows={3}
																className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															/>
														</div>
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.fields.employeeCount")}
															</label>
															<Input
																type="number"
																min={0}
																value={businessProfileFormData.employeeCount}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({ ...prev, employeeCount: e.target.value }))
																}
															/>
														</div>
													</div>
												</div>
											</div>

											<div className="overflow-hidden rounded-xl border border-violet-200/85 bg-white shadow-sm ring-1 ring-violet-950/[0.06]">
												<div className="flex items-center gap-2 border-b border-ops-border bg-ops-surface-muted px-4 py-2.5">
													<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-700 text-white shadow-sm">
														<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
															/>
														</svg>
													</div>
													<h4 className="text-xs font-bold uppercase tracking-wider text-black">
														{t("customer.detail.profile.sectionFinancial")}
													</h4>
												</div>
												<div className="bg-ops-surface p-4 sm:p-5">
													<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.fields.annualRevenueBand")} <span className="text-red-500">*</span>
															</label>
															<select
																value={businessProfileFormData.annualRevenueBand}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({
																		...prev,
																		annualRevenueBand: e.target.value
																	}))
																}
																className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															>
																<option value="">{t("customer.wizard.business.financial.revenueBandPlaceholder")}</option>
																{ANNUAL_REVENUE_BAND_OPTIONS.map(opt => {
																	const key = `customer.wizard.business.financial.revenueBands.${opt.value}`;
																	const label = t(key);
																	return (
																		<option key={opt.value} value={opt.value}>
																			{label === key ? opt.value : label}
																		</option>
																	);
																})}
															</select>
														</div>
														<div>
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.fields.currenciesUsed")}
															</label>
															<Input
																value={businessProfileFormData.currenciesUsed}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({ ...prev, currenciesUsed: e.target.value }))
																}
																maxLength={255}
															/>
														</div>
														<div className="sm:col-span-2 lg:col-span-3">
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.fields.expectedTransactionProfile")}
															</label>
															<textarea
																value={businessProfileFormData.expectedTransactionProfile}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({
																		...prev,
																		expectedTransactionProfile: e.target.value
																	}))
																}
																maxLength={1000}
																rows={3}
																className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															/>
														</div>
														<div className="sm:col-span-2 lg:col-span-3">
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.fields.fundsSource")} <span className="text-red-500">*</span>
															</label>
															<textarea
																value={businessProfileFormData.fundsSource}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({ ...prev, fundsSource: e.target.value }))
																}
																maxLength={500}
																rows={2}
																className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															/>
														</div>
														<div className="sm:col-span-2 lg:col-span-3">
															<label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black">
																{t("customer.detail.business.fields.accountOpeningPurpose")} <span className="text-red-500">*</span>
															</label>
															<textarea
																value={businessProfileFormData.accountOpeningPurpose}
																onChange={e =>
																	setBusinessProfileFormData(prev => ({
																		...prev,
																		accountOpeningPurpose: e.target.value
																	}))
																}
																maxLength={500}
																rows={2}
																className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
															/>
														</div>
													</div>
												</div>
											</div>
										</div>
										<div className="flex gap-2 border-t border-violet-100/80 pt-4">
											<Button type="submit" disabled={savingProfile}>
												{savingProfile ? t("customer.detail.generalInfo.saving") : t("customer.detail.generalInfo.save")}
											</Button>
											<Button type="button" variant="outline" onClick={handleCancelProfile} disabled={savingProfile}>
												{t("customer.detail.generalInfo.cancel")}
											</Button>
										</div>
									</form>
								)}
							</div>
						</div>
					</div>

					<div className="space-y-6">
						<div className="grid gap-6 md:grid-cols-2">
							{/* Carte Adresses */}
							<div className={OPS_CARD_SHELL}>
								<div className={`${OPS_CARD_HEADER} flex flex-wrap items-center gap-3`}>
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ops-surface text-ops-fg-muted ring-1 ring-ops-border">
											<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
											</svg>
										</div>
										<div className="min-w-0">
											<h2 className="text-lg font-semibold tracking-tight text-ops-fg sm:text-xl">{t("customer.detail.addresses.title")}</h2>
											<p className="mt-0.5 text-xs text-ops-fg-muted sm:text-sm">{t("customer.detail.addresses.subtitle")}</p>
										</div>
								</div>
								<div className="p-6 sm:p-8">
									{addresses.length === 0 ? (
										<div className="text-sm text-slate-500 py-4">{t("customer.detail.addresses.none")}</div>
									) : (
										<div className="space-y-3">
											{addresses.map(addr => (
												<div key={addr.id} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 shadow-sm">
													{editingAddressId === addr.id && editAddr ? (
														<form onSubmit={submitEditAddress} className="space-y-3">
															<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
																<div>
																	<label className="block text-xs mb-1">{t("common.type")}</label>
																	<select
																		className="w-full rounded-md border bg-white px-2 py-1.5 text-xs"
																		value={editAddr.type}
																		onChange={e => setEditAddr(prev => prev ? ({ ...prev, type: e.target.value as AddAddressRequest["type"] }) : null)}
																	>
																		<option value="RESIDENTIAL">RESIDENTIAL</option>
																		<option value="BUSINESS">BUSINESS</option>
																		<option value="MAILING">MAILING</option>
																	</select>
																</div>
																<div className="md:col-span-2">
																	<label className="block text-xs mb-1">{t("customer.detail.addresses.line1")} *</label>
																	<Input 
																		value={editAddr.line1} 
																		onChange={e => setEditAddr(prev => prev ? ({ ...prev, line1: e.target.value }) : null)}
																		required
																		className="text-xs"
																	/>
																</div>
																<div>
																	<label className="block text-xs mb-1">{t("customer.detail.addresses.line2")}</label>
																	<Input 
																		value={editAddr.line2} 
																		onChange={e => setEditAddr(prev => prev ? ({ ...prev, line2: e.target.value }) : null)}
																		className="text-xs"
																	/>
																</div>
																<div>
																	<label className="block text-xs mb-1">{t("customer.detail.addresses.city")} *</label>
																	<Input 
																		value={editAddr.city} 
																		onChange={e => setEditAddr(prev => prev ? ({ ...prev, city: e.target.value }) : null)}
																		required
																		className="text-xs"
																	/>
																</div>
																<div>
																	<label className="block text-xs mb-1">{t("customer.detail.addresses.state")}</label>
																	<Input 
																		value={editAddr.state} 
																		onChange={e => setEditAddr(prev => prev ? ({ ...prev, state: e.target.value }) : null)}
																		className="text-xs"
																	/>
																</div>
																<div>
																	<label className="block text-xs mb-1">{t("customer.detail.addresses.postalCode")}</label>
																	<Input 
																		value={editAddr.postalCode} 
																		onChange={e => setEditAddr(prev => prev ? ({ ...prev, postalCode: e.target.value }) : null)}
																		className="text-xs"
																	/>
																</div>
																<div>
																	<label className="block text-xs mb-1">{t("customer.detail.addresses.country")} *</label>
																	<Input 
																		value={editAddr.country} 
																		onChange={e => setEditAddr(prev => prev ? ({ ...prev, country: e.target.value }) : null)}
																		required
																		className="text-xs"
																	/>
																</div>
																<div className="flex items-center gap-2">
																	<input
																		type="checkbox"
																		checked={Boolean(editAddr.primaryAddress)}
																		onChange={e => setEditAddr(prev => prev ? ({ ...prev, primaryAddress: e.target.checked }) : null)}
																	/>
																	<label className="text-xs">{t("customer.detail.addresses.primaryAddress")}</label>
																</div>
															</div>
															<div className="flex gap-2 pt-2">
																<Button type="submit" size="sm" disabled={addrSubmitting}>
																	{addrSubmitting ? t("customer.detail.addresses.saving") : t("customer.detail.addresses.save")}
																</Button>
																<Button type="button" variant="outline" size="sm" onClick={cancelEditAddress} disabled={addrSubmitting}>
																	{t("customer.detail.generalInfo.cancel")}
																</Button>
															</div>
														</form>
													) : (
														<>
															<div className="flex items-start justify-between mb-3">
																<div className="flex items-center gap-2">
																	<Badge variant={addr.primaryAddress ? "success" : "neutral"}>
																		{addr.type}
																	</Badge>
																	{addr.primaryAddress && (
																		<Badge variant="info">{t("customer.detail.addresses.primary")}</Badge>
																	)}
																</div>
																<Button variant="outline" size="sm" onClick={() => startEditAddress(addr)}>
																	{t("customer.detail.addresses.edit")}
																</Button>
															</div>
															<div className="bg-white rounded-lg p-4 border border-slate-200 space-y-2">
																<div className="flex items-center gap-2">
																	<svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
																	</svg>
																	<span className="font-semibold text-slate-900">{addr.line1}</span>
																</div>
																{addr.line2 && (
																	<div className="text-sm text-slate-600 pl-6">{addr.line2}</div>
																)}
																<div className="text-sm text-slate-600 pl-6">
																	{addr.city}
																	{addr.state && `, ${addr.state}`}
																	{addr.postalCode && ` ${addr.postalCode}`}
																</div>
																<div className="flex items-center gap-2 pl-6">
																	<svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
																	</svg>
																	<span className="text-xs font-medium text-slate-500">{addr.country}</span>
																</div>
															</div>
														</>
													)}
												</div>
											))}
										</div>
									)}
								</div>
							</div>

							{/* Formulaire Ajouter une adresse */}
							<form onSubmit={submitAddress} className={OPS_CARD_SHELL}>
								<div className={`${OPS_CARD_HEADER} flex flex-wrap items-center gap-3`}>
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ops-surface text-ops-fg-muted ring-1 ring-ops-border">
											<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
											</svg>
										</div>
										<div className="min-w-0">
											<h2 className="text-lg font-semibold tracking-tight text-ops-fg sm:text-xl">{t("customer.detail.addresses.add")}</h2>
											<p className="mt-0.5 text-xs text-ops-fg-muted sm:text-sm">{t("customer.detail.addresses.addSubtitle")}</p>
										</div>
								</div>
								<div className="space-y-4 p-6 sm:p-8">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm mb-1">{t("common.type")}</label>
											<select
												className="w-full rounded-md border bg-white px-3 py-2 text-sm"
												value={addr.type}
												onChange={e => setAddr(prev => ({ ...prev, type: e.target.value as AddAddressRequest["type"] }))}
											>
												<option value="RESIDENTIAL">RESIDENTIAL</option>
												<option value="BUSINESS">BUSINESS</option>
												<option value="MAILING">MAILING</option>
											</select>
										</div>
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.addresses.line1")} *</label>
											<Input 
												value={addr.line1} 
												onChange={e => setAddr(prev => ({ ...prev, line1: e.target.value }))}
												required
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.addresses.line2")}</label>
											<Input value={addr.line2} onChange={e => setAddr(prev => ({ ...prev, line2: e.target.value }))} />
										</div>
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.addresses.city")} *</label>
											<Input 
												value={addr.city} 
												onChange={e => setAddr(prev => ({ ...prev, city: e.target.value }))}
												required
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.addresses.state")}</label>
											<Input 
												value={addr.state} 
												onChange={e => setAddr(prev => ({ ...prev, state: e.target.value }))}
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.addresses.postalCode")}</label>
											<Input 
												value={addr.postalCode} 
												onChange={e => setAddr(prev => ({ ...prev, postalCode: e.target.value }))}
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.addresses.country")} *</label>
											<Input 
												value={addr.country} 
												onChange={e => setAddr(prev => ({ ...prev, country: e.target.value }))}
												placeholder="CM"
												required
											/>
										</div>
										<div className="flex items-center gap-2">
											<input
												id="primaryAddress"
												type="checkbox"
												checked={Boolean(addr.primaryAddress)}
												onChange={e => setAddr(prev => ({ ...prev, primaryAddress: e.target.checked }))}
											/>
											<label htmlFor="primaryAddress" className="text-sm">{t("customer.detail.addresses.primaryAddress")}</label>
										</div>
									</div>
									<div className="flex gap-2">
										<Button type="submit" disabled={addrSubmitting}>
											{addrSubmitting ? t("customer.detail.addresses.adding") : t("customer.detail.addresses.addButton")}
										</Button>
									</div>
								</div>
							</form>
						</div>
					</div>

					{expectedType === "BUSINESS" && (
					<div className="space-y-6">
						{/* Section Related Persons */}
						<div className={OPS_CARD_SHELL}>
							<div className={`${OPS_CARD_HEADER} flex flex-wrap items-center gap-3`}>
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ops-surface text-ops-fg-muted ring-1 ring-ops-border">
									<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
									</svg>
								</div>
								<div className="min-w-0">
									<h2 className="text-lg font-semibold tracking-tight text-ops-fg sm:text-xl">{t("customer.detail.relatedPersons.title")}</h2>
									<p className="mt-0.5 text-xs text-ops-fg-muted">{t("customer.detail.relatedPersons.subtitle")}</p>
								</div>
							</div>
							<div className="p-6 sm:p-8">
								{/* Formulaire d'ajout */}
								<div className="border-b border-slate-200 pb-4 mb-4">
									<h3 className="text-sm font-semibold text-slate-600 mb-3">
										{editingRpId ? t("customer.detail.relatedPersons.edit") : t("customer.detail.relatedPersons.add")}
									</h3>
							{editingRpId && editRpForm ? (
								<form onSubmit={submitEditRelatedPerson} className="space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.relatedPersons.role")} *</label>
											<select
												className="w-full rounded-md border bg-white px-3 py-2 text-sm"
												value={editRpForm.role}
												onChange={e => setEditRpForm(prev => prev ? ({ ...prev, role: e.target.value as RelatedPersonRole }) : null)}
												required
											>
												<option value="UBO">UBO</option>
												<option value="DIRECTOR">DIRECTOR</option>
												<option value="SIGNATORY">SIGNATORY</option>
											</select>
										</div>
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.relatedPersons.firstName")} *</label>
											<Input
												value={editRpForm.firstName}
												onChange={e => setEditRpForm(prev => prev ? ({ ...prev, firstName: e.target.value }) : null)}
												required
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.relatedPersons.lastName")} *</label>
											<Input
												value={editRpForm.lastName}
												onChange={e => setEditRpForm(prev => prev ? ({ ...prev, lastName: e.target.value }) : null)}
												required
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.relatedPersons.dateOfBirth")}</label>
											<Input
												type="date"
												value={editRpForm.dateOfBirth}
												onChange={e => setEditRpForm(prev => prev ? ({ ...prev, dateOfBirth: e.target.value }) : null)}
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.relatedPersons.nationalId")}</label>
											<Input
												value={editRpForm.nationalId || ""}
												onChange={e => setEditRpForm(prev => prev ? ({ ...prev, nationalId: e.target.value }) : null)}
											/>
										</div>
										{editRpForm.role === "UBO" && (
											<div>
												<label className="block text-sm mb-1">{t("customer.detail.relatedPersons.ownershipPercent")} *</label>
												<Input
													type="number"
													min="0"
													max="100"
													step="0.01"
													value={editRpForm.ownershipPercent || ""}
													onChange={e => setEditRpForm(prev => prev ? ({ ...prev, ownershipPercent: e.target.value ? parseFloat(e.target.value) : undefined }) : null)}
													required
												/>
											</div>
										)}
										<div>
											<label className="flex items-center gap-2 text-sm">
												<input
													type="checkbox"
													checked={editRpForm.pepFlag || false}
													onChange={e => setEditRpForm(prev => prev ? ({ ...prev, pepFlag: e.target.checked }) : null)}
												/>
												{t("customer.detail.relatedPersons.pepFlag")}
											</label>
										</div>
									</div>
									<div className="flex gap-2">
										<Button type="submit" disabled={rpSubmitting}>
											{rpSubmitting ? t("customer.detail.relatedPersons.saving") : t("customer.detail.relatedPersons.save")}
										</Button>
										<Button type="button" variant="outline" onClick={cancelEditRelatedPerson} disabled={rpSubmitting}>
											{t("customer.detail.generalInfo.cancel")}
										</Button>
									</div>
								</form>
							) : (
								<form onSubmit={submitRelatedPerson} className="space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.relatedPersons.role")} *</label>
											<select
												className="w-full rounded-md border bg-white px-3 py-2 text-sm"
												value={rpForm.role}
												onChange={e => setRpForm(prev => ({ ...prev, role: e.target.value as RelatedPersonRole }))}
												required
											>
												<option value="UBO">UBO</option>
												<option value="DIRECTOR">DIRECTOR</option>
												<option value="SIGNATORY">SIGNATORY</option>
											</select>
										</div>
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.relatedPersons.firstName")} *</label>
											<Input
												value={rpForm.firstName}
												onChange={e => setRpForm(prev => ({ ...prev, firstName: e.target.value }))}
												required
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.relatedPersons.lastName")} *</label>
											<Input
												value={rpForm.lastName}
												onChange={e => setRpForm(prev => ({ ...prev, lastName: e.target.value }))}
												required
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.relatedPersons.dateOfBirth")}</label>
											<Input
												type="date"
												value={rpForm.dateOfBirth}
												onChange={e => setRpForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">{t("customer.detail.relatedPersons.nationalId")}</label>
											<Input
												value={rpForm.nationalId}
												onChange={e => setRpForm(prev => ({ ...prev, nationalId: e.target.value }))}
											/>
										</div>
										{rpForm.role === "UBO" && (
											<div>
												<label className="block text-sm mb-1">{t("customer.detail.relatedPersons.ownershipPercent")} *</label>
												<Input
													type="number"
													min="0"
													max="100"
													step="0.01"
													value={rpForm.ownershipPercent || ""}
													onChange={e => setRpForm(prev => ({ ...prev, ownershipPercent: e.target.value ? parseFloat(e.target.value) : undefined }))}
													required
												/>
											</div>
										)}
										<div>
											<label className="flex items-center gap-2 text-sm">
												<input
													type="checkbox"
													checked={rpForm.pepFlag || false}
													onChange={e => setRpForm(prev => ({ ...prev, pepFlag: e.target.checked }))}
												/>
												{t("customer.detail.relatedPersons.pepFlag")}
											</label>
										</div>
									</div>
									<div className="flex gap-2">
										<Button type="submit" disabled={rpSubmitting}>
											{rpSubmitting ? t("customer.detail.relatedPersons.adding") : t("customer.detail.relatedPersons.addButton")}
										</Button>
									</div>
								</form>
							)}
							</div>

							{/* Liste des personnes liées */}
							<div>
								<h3 className="text-sm font-semibold text-slate-600 mb-3">{t("customer.detail.relatedPersons.saved")}</h3>
								{relatedPersons.length === 0 ? (
									<div className="text-sm text-slate-500 py-4">{t("customer.detail.relatedPersons.none")}</div>
								) : (
									<div className="space-y-3">
										{relatedPersons.map(rp => (
											<div key={rp.id} className="bg-white rounded-lg p-4 border border-slate-200">
												<div className="flex items-start justify-between mb-3">
													<div className="flex items-center gap-2">
														<Badge variant="info">{rp.role}</Badge>
														<span className="text-sm font-semibold text-slate-900">
															{rp.firstName} {rp.lastName}
														</span>
													</div>
													<div className="flex gap-2">
														<Button
															variant="outline"
															size="sm"
															onClick={() => startEditRelatedPerson(rp)}
															disabled={rpSubmitting || editingRpId !== null}
														>
															{t("customer.detail.relatedPersons.edit")}
														</Button>
														<Button
															variant="outline"
															size="sm"
															onClick={() => deleteRelatedPerson(rp.id)}
															disabled={rpSubmitting}
															className="border-red-300 text-red-700 hover:bg-red-50"
														>
															{t("customer.detail.relatedPersons.delete")}
														</Button>
													</div>
												</div>
												<div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
													{rp.dateOfBirth && (
														<div className="flex items-center gap-2 text-xs text-slate-600">
															<svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
															</svg>
															<span>{t("customer.detail.relatedPersons.dateOfBirth")}: {new Date(rp.dateOfBirth).toLocaleDateString("fr-FR")}</span>
														</div>
													)}
													{rp.nationalId && (
														<div className="flex items-center gap-2 text-xs text-slate-600">
															<svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
															</svg>
															<span>{t("customer.detail.relatedPersons.nationalId")}: {rp.nationalId}</span>
														</div>
													)}
													{rp.ownershipPercent !== null && rp.ownershipPercent !== undefined && (
														<div className="flex items-center gap-2 text-xs text-slate-600">
															<svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
															</svg>
															<span>{t("customer.detail.relatedPersons.ownershipPercent")}: <span className="font-semibold">{rp.ownershipPercent}%</span></span>
														</div>
													)}
													<div className="flex items-center gap-2 text-xs">
														<svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
														</svg>
														<span className="text-slate-600">PEP: </span>
														<Badge variant={rp.pepFlag ? "danger" : "success"} className="text-xs">
															{rp.pepFlag ? t("customer.detail.generalInfo.yes") : t("customer.detail.generalInfo.no")}
														</Badge>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
				)}


					</div>
				)}

				{activeTab === "overview" && (
					<div className="space-y-6">
						{customer && customer.status !== "VERIFIED" && customer.status !== "PENDING_REVIEW" && (
							<div className="overflow-hidden rounded-ops-xl border border-ops-border bg-ops-surface p-5 shadow-ops-card">
								<h2 className="text-base font-semibold tracking-tight text-slate-900 mb-1">{t("customer.detail.kyc.submit.title")}</h2>
								<p className="text-xs text-slate-600 mb-4">{t("customer.detail.kyc.submit.description")}</p>
								<Button onClick={doSubmitKyc} disabled={kycSubmitting !== null} size="sm">
									{kycSubmitting === "submit" ? t("customer.detail.kyc.submit.submitting") : t("customer.detail.kyc.submit.button")}
								</Button>
							</div>
						)}
						{/* Photo + informations générales (carte unique) */}
						<div className={OPS_CARD_SHELL}>
					<div className={`${OPS_CARD_HEADER} flex flex-wrap items-center justify-between gap-4`}>
							<div className="flex min-w-0 items-center gap-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ops-surface text-ops-fg-muted ring-1 ring-ops-border">
									<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
								</div>
								<div className="min-w-0">
									<h2 className="text-lg font-semibold tracking-tight text-ops-fg sm:text-xl">{t("customer.detail.generalInfo.title")}</h2>
									<p className="text-xs text-ops-fg-muted">{t("customer.detail.generalInfo.subtitle")}</p>
								</div>
							</div>
							{!isEditing && customer && (
								<Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="shrink-0">
									{t("customer.detail.generalInfo.edit")}
								</Button>
							)}
					</div>
					<div className="p-6 sm:p-8">
						{loading && <div className="text-sm text-slate-500 text-center py-4">{t("common.loading")}</div>}
						{customer && !selfieUrl ? (
							<div className="mb-6 border-b border-ops-border pb-6">
								<p className="mb-2 text-xs font-medium text-ops-fg">{t("customer.detail.photo.selfieLabel")}</p>
								<form onSubmit={uploadSelfie} className="flex flex-col gap-3 sm:flex-row sm:items-center">
									<div className="min-w-0 flex-1">
										<input type="file" id="selfie-upload" accept="image/*" onChange={e => setSelfieFile(e.target.files?.[0] ?? null)} className="hidden" />
										<label
											htmlFor="selfie-upload"
											className="inline-flex cursor-pointer items-center rounded-lg border border-ops-border bg-ops-surface px-4 py-2 text-sm font-medium text-ops-fg shadow-sm transition hover:bg-ops-surface-muted"
										>
											<svg className="mr-2 h-5 w-5 text-ops-fg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
											</svg>
											{selfieFile ? selfieFile.name : t("customer.detail.photo.upload")}
										</label>
									</div>
									{selfieFile ? (
										<Button type="submit" disabled={selfieUploading} size="sm">
											{selfieUploading ? t("customer.detail.photo.uploading") : t("customer.detail.photo.send")}
										</Button>
									) : null}
								</form>
							</div>
						) : null}
						{customer && (
							<>
								{!isEditing ? (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										{/* Colonne gauche */}
										<div className="space-y-4">
											{/* Nom affiché - Mise en avant */}
											<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
												<dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{t("customer.detail.generalInfo.displayName")}</dt>
												<dd className="font-semibold text-lg text-slate-900 mt-1">{customer.displayName}</dd>
											</div>
											
											{/* Identité */}
											<div className="space-y-3">
												{customer.type === "PERSON" && (customer.firstName || customer.lastName) && (
													<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
														<dt className="text-sm font-medium text-slate-600">{t("customer.detail.generalInfo.fullName")}</dt>
														<dd className="text-sm font-semibold text-slate-900">
															{customer.firstName} {customer.lastName}
														</dd>
													</div>
												)}
												<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
													<dt className="text-sm font-medium text-slate-600">Type</dt>
													<dd>
														<Badge variant={customer.type === "PERSON" ? "info" : "warning"}>{customer.type}</Badge>
													</dd>
												</div>
											</div>

											{/* Contact */}
											<div className="space-y-3">
												{customer.email && (
													<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
														<dt className="text-sm font-medium text-slate-600 flex items-center gap-2">
															<svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
															</svg>
															{t("common.email")}
														</dt>
														<dd>
															<a
																href={`mailto:${customer.email}`}
																className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline break-all"
															>
																{customer.email}
															</a>
														</dd>
													</div>
												)}
												{customer.phone && (
													<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
														<dt className="text-sm font-medium text-slate-600 flex items-center gap-2">
															<svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
															</svg>
															{t("customer.detail.generalInfo.phone")}
														</dt>
														<dd>
															<a
																href={`tel:${customer.phone}`}
																className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
															>
																{customer.phone}
															</a>
														</dd>
													</div>
												)}
												{customer.type === "BUSINESS" && customer.websiteUrl && (
													<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
														<dt className="flex items-center gap-2 text-sm font-medium text-slate-600">
															<svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
																/>
															</svg>
															{t("customer.detail.business.website")}
														</dt>
														<dd>
															<a
																href={customer.websiteUrl}
																target="_blank"
																rel="noopener noreferrer"
																className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline break-all"
															>
																{customer.websiteUrl}
															</a>
														</dd>
													</div>
												)}
											</div>
											{customer.type === "BUSINESS" && (
												<div className="space-y-4">
													<p className="text-xs font-semibold uppercase tracking-wide text-black">
														{t("customer.detail.business.title")}
													</p>
													<div className="overflow-hidden rounded-xl border border-violet-200/85 bg-white shadow-sm ring-1 ring-violet-950/[0.06]">
														<div className="flex items-center gap-2 border-b border-ops-border bg-ops-surface-muted px-4 py-2.5">
															<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm">
																<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		strokeWidth={2}
																		d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
																	/>
																</svg>
															</div>
															<h4 className="text-xs font-bold uppercase tracking-wider text-black">
																{t("customer.detail.profile.sectionLegal")}
															</h4>
														</div>
														<div className="bg-ops-surface p-4 sm:p-5">
															<dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6">
																<div>
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.business.fields.tradeName")}
																	</dt>
																	<dd className="mt-1 text-sm font-normal leading-relaxed text-slate-800">{customer.tradeName?.trim() || "—"}</dd>
																</div>
																<div>
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.business.fields.legalForm")}
																	</dt>
																	<dd className="mt-1 text-sm font-normal leading-relaxed text-slate-800">{customer.legalForm?.trim() || "—"}</dd>
																</div>
																<div>
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.business.fields.registrationNumber")}
																	</dt>
																	<dd className="mt-1 text-sm font-normal leading-relaxed text-slate-800">{customer.registrationNumber?.trim() || "—"}</dd>
																</div>
																<div>
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.business.fields.incorporationDate")}
																	</dt>
																	<dd className="mt-1 text-sm font-normal leading-relaxed text-slate-800">
																		{customer.incorporationDate
																			? new Date(customer.incorporationDate).toLocaleDateString(locale, {
																					year: "numeric",
																					month: "long",
																					day: "numeric"
																				})
																			: "—"}
																	</dd>
																</div>
																<div className="sm:col-span-2">
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.business.fields.incorporationCountry")}
																	</dt>
																	<dd className="mt-1 text-sm font-normal leading-relaxed text-slate-800">
																		{customer.incorporationCountry
																			? `${formatNationalityLabel(customer.incorporationCountry, i18n.language)} (${customer.incorporationCountry})`
																			: "—"}
																	</dd>
																</div>
																<div>
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.profile.taxResidence")}
																	</dt>
																	<dd className="mt-1 text-sm font-normal leading-relaxed text-slate-800">
																		{customer.taxResidenceCountry
																			? `${formatNationalityLabel(customer.taxResidenceCountry, i18n.language)} (${customer.taxResidenceCountry})`
																			: "—"}
																	</dd>
																</div>
																<div>
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.profile.taxIdentification")}
																	</dt>
																	<dd className="mt-1 text-sm font-normal leading-relaxed text-slate-800">
																		{customer.taxIdentificationNumber?.trim() || "—"}
																	</dd>
																</div>
															</dl>
														</div>
													</div>

													<div className="overflow-hidden rounded-xl border border-violet-200/85 bg-white shadow-sm ring-1 ring-violet-950/[0.06]">
														<div className="flex items-center gap-2 border-b border-ops-border bg-ops-surface-muted px-4 py-2.5">
															<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
																<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		strokeWidth={2}
																		d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
																	/>
																</svg>
															</div>
															<h4 className="text-xs font-bold uppercase tracking-wider text-black">
																{t("customer.detail.profile.sectionActivityGovernance")}
															</h4>
														</div>
														<div className="bg-ops-surface p-4 sm:p-5">
															<dl className="grid grid-cols-1 gap-4">
																<div>
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.business.fields.activityCode")}
																	</dt>
																	<dd className="mt-1 text-sm font-medium leading-relaxed text-slate-800">
																		{customer.activityCode?.trim() || "—"}
																	</dd>
																</div>
																<div>
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.business.fields.activityDescription")}
																	</dt>
																	<dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
																		{customer.activityDescription?.trim() || "—"}
																	</dd>
																</div>
																<div>
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.business.fields.signingAuthorityNote")}
																	</dt>
																	<dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
																		{customer.signingAuthorityNote?.trim() || "—"}
																	</dd>
																</div>
																<div className="max-w-xs">
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.business.fields.employeeCount")}
																	</dt>
																	<dd className="mt-1 text-sm font-medium leading-relaxed text-slate-800">
																		{customer.employeeCount != null && !Number.isNaN(Number(customer.employeeCount))
																			? String(customer.employeeCount)
																			: "—"}
																	</dd>
																</div>
															</dl>
														</div>
													</div>

													<div className="overflow-hidden rounded-xl border border-violet-200/85 bg-white shadow-sm ring-1 ring-violet-950/[0.06]">
														<div className="flex items-center gap-2 border-b border-ops-border bg-ops-surface-muted px-4 py-2.5">
															<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-700 text-white shadow-sm">
																<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		strokeWidth={2}
																		d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
																	/>
																</svg>
															</div>
															<h4 className="text-xs font-bold uppercase tracking-wider text-black">
																{t("customer.detail.profile.sectionFinancial")}
															</h4>
														</div>
														<div className="bg-ops-surface p-4 sm:p-5">
															<dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6">
																<div>
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.business.fields.annualRevenueBand")}
																	</dt>
																	<dd className="mt-1 text-sm font-medium leading-relaxed text-slate-800">
																		{customer.annualRevenueBand
																			? (() => {
																					const rk = `customer.wizard.business.financial.revenueBands.${customer.annualRevenueBand}`;
																					const trb = t(rk);
																					return trb === rk ? customer.annualRevenueBand : trb;
																				})()
																			: "—"}
																	</dd>
																</div>
																<div>
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.business.fields.currenciesUsed")}
																	</dt>
																	<dd className="mt-1 text-sm font-medium leading-relaxed text-slate-800">{customer.currenciesUsed?.trim() || "—"}</dd>
																</div>
																<div className="sm:col-span-2">
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.business.fields.expectedTransactionProfile")}
																	</dt>
																	<dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
																		{customer.expectedTransactionProfile?.trim() || "—"}
																	</dd>
																</div>
																<div className="sm:col-span-2">
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.business.fields.fundsSource")}
																	</dt>
																	<dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
																		{customer.fundsSource?.trim() || "—"}
																	</dd>
																</div>
																<div className="sm:col-span-2">
																	<dt className="text-xs font-semibold uppercase tracking-wide text-black">
																		{t("customer.detail.business.fields.accountOpeningPurpose")}
																	</dt>
																	<dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
																		{customer.accountOpeningPurpose?.trim() || "—"}
																	</dd>
																</div>
															</dl>
														</div>
													</div>
												</div>
											)}
										</div>

										{/* Colonne droite */}
										<div className="space-y-4">
											{/* KYC & Conformité */}
											<div className="space-y-3">
												<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
													<dt className="text-sm font-medium text-slate-600">{t("common.status")}</dt>
													<dd>
														<Badge variant={statusBadgeVariant(customer.status)} className="text-xs font-medium">
															<span>{translatedCustomerStatus(t, customer.status)}</span>
															<span className="ml-1.5 font-mono text-[10px] font-normal opacity-70">
																{t("customer.detail.headerStrip.statusCode", { code: customer.status })}
															</span>
														</Badge>
													</dd>
												</div>
												{typeof customer.riskScore === "number" && (
													<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
														<dt className="text-sm font-medium text-slate-600">{t("customer.detail.generalInfo.riskScore")}</dt>
														<dd>
															<Badge variant={riskBadgeVariant(customer.riskScore)}>{customer.riskScore}/100</Badge>
														</dd>
													</div>
												)}
												<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
													<dt className="text-sm font-medium text-slate-600">{t("customer.detail.generalInfo.pepPerson")}</dt>
													<dd>
														<Badge variant={customer.pepFlag ? "danger" : "success"}>
															{customer.pepFlag ? t("customer.detail.generalInfo.yes") : t("customer.detail.generalInfo.no")}
														</Badge>
													</dd>
												</div>
											</div>

											<div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
												<h3 className="text-sm font-semibold text-black">{t("customer.detail.aml.title")}</h3>
												<p className="text-xs text-slate-600">{t("customer.detail.aml.subtitle")}</p>
												<div className="flex flex-col gap-2 pt-1">
													<Button
														type="button"
														variant="outline"
														className="w-full border-slate-300 bg-white hover:bg-slate-50"
														onClick={() => router.push(`/aml/risk-profiles?clientId=${customer.id}`)}
													>
														{t("customer.detail.aml.riskProfiles")}
													</Button>
													<Button
														type="button"
														variant="outline"
														className="w-full border-slate-300 bg-white hover:bg-slate-50"
														onClick={() => router.push(`/aml/alerts?clientId=${customer.id}`)}
													>
														{t("customer.detail.aml.alerts")}
													</Button>
													<Button
														type="button"
														variant="outline"
														className="w-full border-slate-300 bg-white hover:bg-slate-50"
														onClick={() => router.push(`/aml/cases/new?clientId=${customer.id}`)}
													>
														{t("customer.detail.aml.newCase")}
													</Button>
												</div>
											</div>

											{/* Métadonnées */}
											{(customer.createdAt || customer.updatedAt) && (
												<div className="space-y-3 pt-3 border-t border-slate-200/80">
													{customer.createdAt && (
														<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
															<dt className="text-sm font-medium text-slate-600 flex items-center gap-2">
																<svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
																</svg>
																{t("customer.detail.generalInfo.createdAt")}
															</dt>
															<dd className="text-sm text-slate-600">
																{new Date(customer.createdAt).toLocaleDateString("fr-FR", {
																	year: "numeric",
																	month: "long",
																	day: "numeric",
																	hour: "2-digit",
																	minute: "2-digit"
																})}
															</dd>
														</div>
													)}
													{customer.updatedAt && (
														<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
															<dt className="text-sm font-medium text-slate-600 flex items-center gap-2">
																<svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
																</svg>
																{t("customer.detail.generalInfo.updatedAt")}
															</dt>
															<dd className="text-sm text-slate-600">
																{new Date(customer.updatedAt).toLocaleDateString("fr-FR", {
																	year: "numeric",
																	month: "long",
																	day: "numeric",
																	hour: "2-digit",
																	minute: "2-digit"
																})}
															</dd>
														</div>
													)}
												</div>
											)}
										</div>
									</div>
								) : (
									<form
										onSubmit={e => {
											e.preventDefault();
											handleSave();
										}}
										className="space-y-4"
									>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
											{/* Colonne gauche */}
											<div className="space-y-4">
												<div>
													<label className="block text-sm font-medium mb-1">{t("customer.detail.generalInfo.displayName")} *</label>
													<Input
														value={formData.displayName}
														onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
														required
													/>
												</div>
												{customer.type === "PERSON" && (
													<>
														<div>
															<label className="block text-sm font-medium mb-1">{t("customer.detail.relatedPersons.firstName")}</label>
															<Input
																value={formData.firstName}
																onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
															/>
														</div>
														<div>
															<label className="block text-sm font-medium mb-1">{t("customer.detail.relatedPersons.lastName")}</label>
															<Input
																value={formData.lastName}
																onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
															/>
														</div>
													</>
												)}
												<div>
													<label className="block text-sm font-medium mb-1">{t("common.email")}</label>
													<Input
														type="email"
														value={formData.email}
														onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
													/>
												</div>
												<div>
													<label className="block text-sm font-medium mb-1">{t("customer.detail.generalInfo.phone")}</label>
													<Input
														value={formData.phone}
														onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
													/>
												</div>
											</div>

											{/* Colonne droite */}
											<div className="space-y-4">
												<div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
													<label className="block text-sm font-medium text-slate-600 mb-1">Type</label>
													<div className="text-sm text-slate-900">{customer.type}</div>
												</div>
												<div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
													<label className="block text-sm font-medium text-slate-600 mb-1">Statut</label>
													<Badge variant={statusBadgeVariant(customer.status)}>{customer.status}</Badge>
												</div>
											</div>
										</div>
										<div className="flex gap-2 pt-2 border-t border-slate-200/80">
											<Button type="submit" disabled={saving}>
												{saving ? t("customer.detail.generalInfo.saving") : t("customer.detail.generalInfo.save")}
											</Button>
											<Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
												{t("customer.detail.generalInfo.cancel")}
											</Button>
										</div>
									</form>
								)}
						</>
					)}
					</div>
				</div>
					</div>
				)}

												{activeTab === "pieces" && (
					<div className={OPS_CARD_SHELL}>
						<div className={`${OPS_CARD_HEADER} flex flex-wrap items-center justify-between gap-4`}>
							<div className="flex min-w-0 flex-1 items-start gap-3">
								<div
									className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ops-fg-muted text-white sm:flex"
									aria-hidden
								>
									<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1.75}
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
								</div>
								<div className="min-w-0">
									<h2 className="text-lg font-semibold tracking-tight text-ops-fg sm:text-xl">{t("customer.detail.documents.title")}</h2>
									<p className="mt-1 text-xs text-ops-fg-muted sm:text-sm">{t("customer.detail.documents.subtitle")}</p>
								</div>
							</div>
							{showDocumentUpload ? (
								<Button variant="outline" size="sm" type="button" onClick={() => setShowDocumentUpload(false)} className="shrink-0">
									{t("customer.detail.documents.closeUpload")}
								</Button>
							) : (
								<Button variant="outline" size="sm" type="button" onClick={() => setShowDocumentUpload(true)} className="shrink-0">
									{t("customer.detail.documents.newButton")}
								</Button>
							)}
						</div>
						<div className="space-y-8 p-6 sm:p-8">
							{showDocumentUpload ? (
								<div className="overflow-hidden rounded-ops-xl border border-ops-border bg-ops-surface shadow-ops-card">
									<div className="border-b border-ops-border bg-ops-surface-muted px-5 py-3.5">
										<h3 className="text-sm font-semibold text-slate-800">{t("customer.detail.documents.upload")}</h3>
									</div>
									<div className="p-6">
										<form onSubmit={submitDocument} className="space-y-4">
										{(docType === "ID_CARD" || docType === "PASSPORT") && (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
											<div>
												<label className="block text-sm font-medium text-slate-600 mb-1.5">
													{t("customer.detail.documents.identityNumber")} <span className="text-red-500">*</span>
												</label>
												<input
													type="text"
													className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
													value={identityDocNumber}
													onChange={e => setIdentityDocNumber(e.target.value)}
													maxLength={64}
													autoComplete="off"
												/>
											</div>
											<div>
												<label className="block text-sm font-medium text-slate-600 mb-1.5">
													{t("customer.detail.documents.identityExpires")} <span className="text-red-500">*</span>
												</label>
												<input
													type="date"
													className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
													value={identityDocExpiresOn}
													onChange={e => setIdentityDocExpiresOn(e.target.value)}
												/>
											</div>
										</div>
									)}
									<div
										className={
											docType === "ID_CARD"
												? "grid grid-cols-1 md:grid-cols-4 gap-5"
												: "grid grid-cols-1 md:grid-cols-3 gap-5"
										}
									>
										<div>
											<label className="block text-sm font-medium text-slate-600 mb-1.5">{t("customer.detail.documents.fileType")}</label>
											<select
												className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
												value={docType}
												onChange={e => {
													const v = e.target.value as DocumentType;
													setDocType(v);
													if (v !== "ID_CARD") setIdCardSide("RECTO");
													if (v !== "ID_CARD" && v !== "PASSPORT") {
														setIdentityDocNumber("");
														setIdentityDocExpiresOn("");
													}
												}}
											>
												{(["ID_CARD", "PASSPORT", "PROOF_OF_ADDRESS", "REGISTRATION_DOC", "SELFIE"] as const).map(
													code => (
														<option key={code} value={code}>
															{t(`customer.detail.documents.types.${code}`)}
														</option>
													)
												)}
											</select>
										</div>
										{docType === "ID_CARD" ? (
											<div>
												<label className="block text-sm font-medium text-slate-600 mb-1.5">
													{t("customer.detail.documents.idCardSide")}
												</label>
												<select
													className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
													value={idCardSide}
													onChange={e => setIdCardSide(e.target.value as IdCardSide)}
												>
													<option value="RECTO">{t("customer.detail.documents.idCardSideRecto")}</option>
													<option value="VERSO">{t("customer.detail.documents.idCardSideVerso")}</option>
												</select>
											</div>
										) : null}
										<div>
											<label className="block text-sm font-medium text-slate-600 mb-1.5">{t("customer.detail.documents.file")}</label>
											<input
												type="file"
												id="file-upload"
												accept={
													docType === "SELFIE" ? "image/*" : undefined
												}
												onChange={e => setDocFile(e.target.files?.[0] ?? null)}
												className="hidden"
											/>
											<label
												htmlFor="file-upload"
												className="flex items-center justify-center w-full min-h-[42px] px-4 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-600 cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-colors"
											>
												<svg className="w-5 h-5 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
												</svg>
												{docFile ? docFile.name : t("customer.detail.documents.chooseFile")}
											</label>
											{docFile && (
												<p className="mt-1.5 text-xs text-slate-500">
													{t("customer.detail.documents.fileSelected")}: <span className="font-medium text-slate-600">{docFile.name}</span>
												</p>
											)}
										</div>
										<div className="flex items-end">
											<Button type="submit" disabled={!docFile || docSubmitting} className="w-full min-h-[42px]">
												{docSubmitting ? t("customer.detail.documents.uploading") : t("customer.detail.documents.uploadButton")}
											</Button>
										</div>
									</div>										</form>
									</div>
								</div>
							) : null}
						<div className="overflow-hidden rounded-ops-lg border border-ops-border bg-ops-surface-muted/30">
							<div className="border-b border-ops-border bg-ops-surface-muted/50 px-4 py-3 sm:px-5">
								<h3 className="text-sm font-semibold text-ops-fg">{t("customer.detail.documents.saved")}</h3>
							</div>
							<div className="p-6 sm:p-8">
								{documents.length === 0 ? (
									<div className="text-center py-12 text-slate-500">
										<svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
										</svg>
										<p className="text-sm">{t("customer.detail.documents.none")}</p>
									</div>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{documents.map(doc => (
											<div key={doc.id} className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.03] transition-all hover:border-slate-300/90 hover:shadow-md">
												<div className="p-4">
													<div className="flex items-start justify-between gap-3 mb-4">
														<div className="flex flex-wrap gap-2">
															<Badge variant={documentStatusBadgeVariant(doc.status)}>{doc.status}</Badge>
															<Badge variant="info">{doc.type}</Badge>
														</div>
														{doc.status === "PENDING" && (
															<Button
																variant="outline"
																size="sm"
																onClick={() => { setReviewingDocId(doc.id); setReviewNote(""); }}
																disabled={reviewSubmitting}
																className="flex-shrink-0"
															>
																{t("customer.detail.documents.review")}
															</Button>
														)}
													</div>
													<div className="rounded-lg bg-white border border-slate-100 p-3 mb-3">
														<p className="font-medium text-slate-900 text-sm truncate" title={doc.fileName || undefined}>
															{doc.fileName || t("customer.detail.documents.noName")}
														</p>
														{(doc.type === "ID_CARD" || doc.type === "PASSPORT") &&
															(doc.identityDocumentNumber || doc.identityDocumentExpiresOn) && (
															<div className="mt-2 space-y-1 text-xs text-slate-600">
																{doc.identityDocumentNumber ? (
																	<div>
																		<span className="text-slate-400">{t("customer.detail.documents.identityNumber")}:</span>{" "}
																		<span className="font-medium text-slate-800">{doc.identityDocumentNumber}</span>
																	</div>
																) : null}
																{doc.identityDocumentExpiresOn ? (
																	<div>
																		<span className="text-slate-400">{t("customer.detail.documents.identityExpires")}:</span>{" "}
																		<span className="font-medium text-slate-800">{doc.identityDocumentExpiresOn}</span>
																	</div>
																) : null}
															</div>
														)}
														<button
															type="button"
															onClick={() => openDocument(doc.id)}
															className="inline-flex items-center gap-1.5 mt-2 text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
														>
															<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
															</svg>
															{t("customer.detail.documents.view")}
														</button>
													</div>
													<div className="space-y-1.5 text-xs text-slate-600">
														{doc.contentType && (
															<div className="flex items-center gap-2">
																<span className="text-slate-400">{t("customer.detail.documents.type")}:</span>
																<span>{doc.contentType}</span>
															</div>
														)}
														{doc.uploadedAt && (
															<div className="flex items-center gap-2">
																<span className="text-slate-400">{t("customer.detail.documents.uploadedAt")}:</span>
																<span>{new Date(doc.uploadedAt).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
															</div>
														)}
														{doc.reviewedAt && (
															<div className="flex items-center gap-2">
																<span className="text-slate-400">{t("customer.detail.documents.reviewedAt")}:</span>
																<span>{new Date(doc.reviewedAt).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
															</div>
														)}
													</div>
													{sanitizeReviewerNote(doc.reviewerNote) && (
														<div className="mt-3 rounded-lg bg-indigo-50 border border-indigo-100 p-3">
															<p className="text-xs font-medium text-black mb-0.5">{t("customer.detail.documents.reviewerNote")}</p>
															<p className="text-xs text-slate-800">{sanitizeReviewerNote(doc.reviewerNote)}</p>
														</div>
													)}
												</div>
												{reviewingDocId === doc.id && (
													<div className="border-t border-slate-200/80 bg-white p-4">
														<label className="block text-xs font-medium text-slate-600 mb-2">{t("customer.detail.documents.reviewerNote")}</label>
														<textarea
															value={reviewNote}
															onChange={e => setReviewNote(e.target.value)}
															placeholder={t("customer.detail.documents.reviewerNotePlaceholder")}
															className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
															rows={3}
														/>
														<div className="flex flex-wrap gap-2 mt-3">
															<Button size="sm" onClick={() => reviewDocument(doc.id, "APPROVED")} disabled={reviewSubmitting}>
																{reviewSubmitting ? "..." : t("customer.detail.documents.approve")}
															</Button>
															<Button size="sm" variant="outline" onClick={() => reviewDocument(doc.id, "REJECTED")} disabled={reviewSubmitting} className="border-red-300 text-red-700 hover:bg-red-50">
																{reviewSubmitting ? "..." : t("customer.detail.documents.reject")}
															</Button>
															<Button size="sm" variant="ghost" onClick={() => { setReviewingDocId(null); setReviewNote(""); }} disabled={reviewSubmitting}>
																{t("customer.detail.generalInfo.cancel")}
															</Button>
														</div>
													</div>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						</div>
						</div>
					</div>
				)}


				{activeTab === "compliance" && customer && (
					<div className={OPS_CARD_SHELL}>
						<div className={`${OPS_CARD_HEADER} flex flex-wrap items-center justify-between gap-4`}>
							<div className="flex min-w-0 flex-1 items-start gap-3">
								<div
									className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ops-fg-muted text-white sm:flex"
									aria-hidden
								>
									<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1.75}
											d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
										/>
									</svg>
								</div>
								<div className="min-w-0">
									<h2 id="compliance-tab-title" className="text-lg font-semibold tracking-tight text-ops-fg sm:text-xl">
										{t("customer.detail.compliance.title")}
									</h2>
									<p className="mt-0.5 max-w-prose text-xs text-ops-fg-muted sm:text-sm">
										{t("customer.detail.compliance.subtitle")}
									</p>
								</div>
							</div>
						</div>
						<nav
							role="tablist"
							aria-label={t("customer.detail.compliance.subTabs.aria")}
							className="flex gap-1 overflow-x-auto border-b border-ops-border bg-ops-surface-muted px-2 py-2 sm:px-3"
						>
							{COMPLIANCE_INNER_SUBTAB_ORDER.map(tid => (
								<button
									key={tid}
									type="button"
									role="tab"
									id={`compliance-subtab-${tid}`}
									aria-selected={complianceInnerTab === tid}
									aria-controls={`compliance-subpanel-${tid}`}
									tabIndex={complianceInnerTab === tid ? 0 : -1}
									onClick={() => {
										if (tid === "auditTrail" && complianceInnerTab !== "auditTrail") {
											setKycAuditTrailPage(0);
										}
										if (tid === "riskRunsHistory" && complianceInnerTab !== "riskRunsHistory") {
											setKycRiskRunsPage(0);
										}
										setComplianceInnerTab(tid);
									}}
									className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap shrink-0 ${
										complianceInnerTab === tid
											? "bg-ops-surface text-ops-fg shadow-sm ring-1 ring-ops-border"
											: "text-ops-fg-muted hover:bg-ops-surface hover:text-ops-fg"
									}`}
								>
									{t(`customer.detail.compliance.subTabs.${tid}`)}
								</button>
							))}
						</nav>
						<div className="space-y-6 p-4 sm:p-6 lg:p-8">

				{complianceInnerTab === "review" && (
					<div
						className="space-y-6"
						role="tabpanel"
						id="compliance-subpanel-review"
						aria-labelledby="compliance-subtab-review"
					>
						{/* En-tête — Informations personnelles / KYC */}
						<div className={OPS_CARD_SHELL}>
							<div className={OPS_CARD_HEADER}>
								<h2 className="text-lg font-semibold tracking-tight text-ops-fg sm:text-xl">{t("customer.detail.kyc.title")}</h2>
								<p className="mt-0.5 text-xs text-ops-fg-muted sm:text-sm">{t("customer.detail.kyc.subtitle")}</p>
							</div>
						</div>

						{/* Grille: Revue email, Revue profil, Revue identité */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
							<div className={OPS_CARD_SHELL}>
								<div className={`${OPS_CARD_HEADER} px-5 py-3.5`}>
									<h3 className="text-sm font-semibold text-ops-fg">{t("customer.detail.kyc.emailReview")}</h3>
								</div>
								<div className="p-5 sm:p-6">
									<div className="mb-4 flex items-center justify-between">
										<span className="text-xs text-ops-fg-muted">{t("customer.detail.kyc.currentStatus")}</span>
										<Badge variant={reviewStatusBadgeVariant(customer.emailReviewStatus)}>{reviewStatusLabel(customer.emailReviewStatus)}</Badge>
									</div>
									<div className="flex gap-2">
										<Button size="sm" onClick={() => doSetEmailReviewStatus("APPROVED")} disabled={reviewStatusSubmitting !== null || customer.emailReviewStatus === "APPROVED"}>
											{reviewStatusSubmitting === "email" ? "..." : t("customer.detail.kyc.approveButton")}
										</Button>
										<Button size="sm" variant="outline" onClick={() => doSetEmailReviewStatus("REJECTED")} disabled={reviewStatusSubmitting !== null || customer.emailReviewStatus === "APPROVED"} className="border-red-300 text-red-700 hover:bg-red-50">
											{t("customer.detail.kyc.rejectButton")}
										</Button>
									</div>
								</div>
							</div>

							<div className="overflow-hidden rounded-ops-xl border border-ops-border bg-ops-surface shadow-ops-card">
								<div className="border-b border-ops-border bg-ops-surface-muted px-5 py-3.5">
									<h3 className="text-sm font-semibold text-slate-800">{t("customer.detail.kyc.profileReview")}</h3>
								</div>
								<div className="p-5">
									<div className="flex items-center justify-between mb-4">
										<span className="text-xs text-slate-500">{t("customer.detail.kyc.currentStatus")}</span>
										<Badge variant={reviewStatusBadgeVariant(customer.profileReviewStatus)}>{reviewStatusLabel(customer.profileReviewStatus)}</Badge>
									</div>
									<div className="flex gap-2">
										<Button size="sm" onClick={() => doSetProfileReviewStatus("APPROVED")} disabled={reviewStatusSubmitting !== null || customer.profileReviewStatus === "APPROVED"}>
											{reviewStatusSubmitting === "profile" ? "..." : t("customer.detail.kyc.approveButton")}
										</Button>
										<Button size="sm" variant="outline" onClick={() => doSetProfileReviewStatus("REJECTED")} disabled={reviewStatusSubmitting !== null || customer.profileReviewStatus === "APPROVED"} className="border-red-300 text-red-700 hover:bg-red-50">
											{t("customer.detail.kyc.rejectButton")}
										</Button>
									</div>
								</div>
							</div>

							<div className={OPS_CARD_SHELL}>
								<div className={`${OPS_CARD_HEADER} px-5 py-3.5`}>
									<h3 className="text-sm font-semibold text-ops-fg">{t("customer.detail.kyc.identityReview")}</h3>
								</div>
								<div className="p-5 sm:p-6">
									<div className="mb-4 flex items-center justify-between">
										<span className="text-xs text-ops-fg-muted">{t("customer.detail.kyc.currentStatus")}</span>
										<Badge variant={reviewStatusBadgeVariant(customer.identityReviewStatus)}>{reviewStatusLabel(customer.identityReviewStatus)}</Badge>
									</div>
									<div className="flex gap-2">
										<Button size="sm" onClick={() => doSetIdentityReviewStatus("APPROVED")} disabled={reviewStatusSubmitting !== null || customer.identityReviewStatus === "APPROVED"}>
											{reviewStatusSubmitting === "identity" ? "..." : t("customer.detail.kyc.approveButton")}
										</Button>
										<Button size="sm" variant="outline" onClick={() => doSetIdentityReviewStatus("REJECTED")} disabled={reviewStatusSubmitting !== null || customer.identityReviewStatus === "APPROVED"} className="border-red-300 text-red-700 hover:bg-red-50">
											{t("customer.detail.kyc.rejectButton")}
										</Button>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

						{complianceInnerTab === "screeningChecks" && (
					<div
						className="space-y-6"
						role="tabpanel"
						id="compliance-subpanel-screeningChecks"
						aria-labelledby="compliance-subtab-screeningChecks"
					>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex flex-wrap items-center gap-2">
								<Button
									type="button"
									size="sm"
									variant={showListScreeningCard ? "outline" : "default"}
									onClick={() => setShowListScreeningCard(v => !v)}
									aria-expanded={showListScreeningCard}
								>
									{showListScreeningCard
										? t("customer.detail.compliance.listScreeningClose")
										: t("customer.detail.compliance.newListScreening")}
								</Button>
								<Button type="button" size="sm" variant="outline" disabled={complianceLoading} onClick={() => void loadComplianceData()}>
									{t("customer.detail.compliance.refresh")}
								</Button>
							</div>
						</div>

						{showListScreeningCard ? (
						<section className="overflow-hidden rounded-ops-xl border border-ops-border bg-ops-surface shadow-ops-card">
							<div className="border-b border-ops-border bg-ops-surface-muted px-5 py-4">
								<h3 className="text-sm font-semibold tracking-tight text-slate-900">
									{t("customer.detail.compliance.screeningBlockTitle")}
								</h3>
								<p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600">
									{t("customer.detail.compliance.screeningBlockHint")}
								</p>
								<div className="mt-4 flex flex-wrap gap-2">
									<Button
										size="sm"
										variant="outline"
										disabled={complianceLoading || complianceAction !== null}
										onClick={async () => {
											setComplianceAction("screen");
											try {
												await customersApi.runListScreening(id);
												await loadComplianceData();
												setToast({ message: t("customer.detail.compliance.screeningDone"), type: "success" });
											} catch (e) {
												setToast({ message: e instanceof Error ? e.message : String(e), type: "error" });
											} finally {
												setComplianceAction(null);
											}
										}}
									>
										{complianceAction === "screen" ? "…" : t("customer.detail.compliance.runScreening")}
									</Button>
								</div>
							</div>
							<div className="p-5">
								<div className="rounded-lg border border-ops-border bg-ops-surface-muted p-4 sm:p-5">
									<p className="text-xs font-semibold tracking-tight text-slate-900">
										{t("customer.detail.compliance.simulatorBlockTitle")}
									</p>
									<p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600">
										{t("customer.detail.compliance.simulatorBlockHint")}
									</p>
									<div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
										<div>
											<p className="mb-2 text-xs font-medium text-slate-700">
												{t("customer.detail.kyc.workflow.stepScreening.simulateSanctions")}
											</p>
											<div className="flex flex-wrap gap-2">
												<Button
													size="sm"
													variant="outline"
													disabled={complianceLoading || complianceAction !== null}
													onClick={() => void simulateScreeningCheck("SANCTIONS_SCREENING", "PASS", "compliance-tab")}
												>
													{kycCheckResultLabel(t, "PASS")}
												</Button>
												<Button
													size="sm"
													variant="outline"
													disabled={complianceLoading || complianceAction !== null}
													onClick={() => void simulateScreeningCheck("SANCTIONS_SCREENING", "REVIEW", "compliance-tab")}
												>
													{kycCheckResultLabel(t, "REVIEW")}
												</Button>
												<Button
													size="sm"
													variant="outline"
													disabled={complianceLoading || complianceAction !== null}
													onClick={() => void simulateScreeningCheck("SANCTIONS_SCREENING", "FAIL", "compliance-tab")}
												>
													{kycCheckResultLabel(t, "FAIL")}
												</Button>
											</div>
										</div>
										<div>
											<p className="mb-2 text-xs font-medium text-slate-700">
												{t("customer.detail.kyc.workflow.stepScreening.simulatePep")}
											</p>
											<div className="flex flex-wrap gap-2">
												<Button
													size="sm"
													variant="outline"
													disabled={complianceLoading || complianceAction !== null}
													onClick={() => void simulateScreeningCheck("PEP_SCREENING", "PASS", "compliance-tab")}
												>
													{kycCheckResultLabel(t, "PASS")}
												</Button>
												<Button
													size="sm"
													variant="outline"
													disabled={complianceLoading || complianceAction !== null}
													onClick={() => void simulateScreeningCheck("PEP_SCREENING", "REVIEW", "compliance-tab")}
												>
													{kycCheckResultLabel(t, "REVIEW")}
												</Button>
												<Button
													size="sm"
													variant="outline"
													disabled={complianceLoading || complianceAction !== null}
													onClick={() => void simulateScreeningCheck("PEP_SCREENING", "FAIL", "compliance-tab")}
												>
													{kycCheckResultLabel(t, "FAIL")}
												</Button>
											</div>
										</div>
									</div>
								</div>
							</div>
						</section>
						) : null}

						{(customer.rekycPendingReason || customer.lastAmlRekycRequestedAt) && (
							<div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
								<h3 className="text-sm font-semibold text-amber-900 mb-1">{t("customer.detail.compliance.rekycBanner")}</h3>
								{customer.lastAmlRekycRequestedAt && (
									<p className="text-xs text-amber-800 mb-1">
										{new Date(customer.lastAmlRekycRequestedAt).toLocaleString(locale)}
									</p>
								)}
								{customer.rekycPendingReason && <p className="text-sm text-amber-900">{customer.rekycPendingReason}</p>}
							</div>
						)}
						<section className={OPS_CARD_SHELL} aria-labelledby="compliance-dossier-tracking">
							<div className="flex flex-wrap items-start justify-between gap-3 border-b border-ops-border bg-ops-surface-muted px-5 py-4">
								<div>
									<h3 id="compliance-dossier-tracking" className="text-sm font-semibold tracking-tight text-slate-900">
										{t("customer.detail.compliance.checksTitle")}
									</h3>
								</div>
								{kycChecks.length > 0 && !complianceLoading ? (
									<Badge variant="neutral" className="shrink-0 text-[11px] font-medium tabular-nums">
										{t("customer.detail.compliance.checksTotal", { count: kycChecks.length })}
									</Badge>
								) : null}
							</div>

							{complianceLoading ? (
								<div className="flex items-center gap-3 px-5 py-10 text-sm text-slate-500">
									<span
										className="inline-block size-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"
										aria-hidden
									/>
									{t("customer.detail.loading")}
								</div>
							) : kycChecks.length === 0 ? (
								<div className="px-5 py-10 text-center">
									<p className="text-sm font-medium text-slate-700">{t("customer.detail.compliance.emptyChecksTitle")}</p>
									<p className="mt-1 text-xs text-slate-500">{t("customer.detail.compliance.emptyChecks")}</p>
								</div>
							) : (
								<>
									<div className="overflow-x-auto">
										<table className="min-w-full divide-y divide-slate-200 text-sm">
											<thead className="bg-slate-50/95">
												<tr>
													<th
														scope="col"
														className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600"
													>
														{t("customer.detail.compliance.columnId")}
													</th>
													<th
														scope="col"
														className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600"
													>
														{t("customer.detail.compliance.type")}
													</th>
													<th
														scope="col"
														className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600"
													>
														{t("customer.detail.compliance.result")}
													</th>
													<th
														scope="col"
														className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600"
													>
														{t("customer.detail.compliance.columnProvider")}
													</th>
													<th
														scope="col"
														className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600 min-w-[9.5rem]"
													>
														{t("customer.detail.compliance.at")}
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-slate-100 bg-white">
												{kycCompliancePaginated.map((c, rowIdx) => {
													const rowNumber =
														kycComplianceChecksPage * KYC_COMPLIANCE_CHECKS_PAGE_SIZE + rowIdx + 1;
													const typeKey = `customer.detail.compliance.checkType.${c.type}`;
													const typeLabel = t(typeKey);
													const displayType = typeLabel === typeKey ? c.type : typeLabel;
													const provider = c.provider?.trim() || "—";
													return (
														<tr
															key={c.id}
															className={`${kycCheckTypeRowAccent(c.type)} transition-colors hover:bg-slate-50/90`}
														>
															<td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500 tabular-nums">
																{rowNumber}
															</td>
															<td className="px-4 py-3">
																<span className="font-medium text-slate-900">{displayType}</span>
															</td>
															<td className="whitespace-nowrap px-4 py-3">
																<Badge variant={kycCheckResultBadgeVariant(c.result)} className="text-[10px]">
																	{kycCheckResultLabel(t, c.result)}
																</Badge>
															</td>
															<td className="max-w-[10rem] px-4 py-3 text-xs text-slate-600" title={provider}>
																<span className="line-clamp-2 break-words">{provider}</span>
															</td>
															<td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
																{c.checkedAt ? new Date(c.checkedAt).toLocaleString(locale) : "—"}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
									<TablePagination
										page={kycComplianceChecksPage}
										pageSize={KYC_COMPLIANCE_CHECKS_PAGE_SIZE}
										totalPages={Math.max(1, Math.ceil(sortedKycChecksForCompliance.length / KYC_COMPLIANCE_CHECKS_PAGE_SIZE))}
										totalElements={sortedKycChecksForCompliance.length}
										onPageChange={setKycComplianceChecksPage}
										resultsLabel={t("customer.detail.compliance.paginationResultsLabel")}
										showFirstLast
										className="border-t border-slate-200 bg-slate-50/80 rounded-none px-4 sm:px-5"
									/>
								</>
							)}
						</section>
						</div>
					)}

				{complianceInnerTab === "decision" && (
					<div
						className="space-y-6"
						role="tabpanel"
						id="compliance-subpanel-decision"
						aria-labelledby="compliance-subtab-decision"
					>
						{/* Décision KYC — workflow (statut → revues → risque → décision) */}
						<div className={OPS_CARD_SHELL}>
							<div className={`${OPS_CARD_HEADER} flex flex-wrap items-center justify-between gap-4`}>
								<div className="min-w-0 flex-1">
									<h2 className="text-lg font-semibold tracking-tight text-ops-fg sm:text-xl">
										{t("customer.detail.kyc.decisionPanel.title")}
									</h2>
									<p className="mt-0.5 max-w-prose text-xs text-ops-fg-muted sm:text-sm">
										{t("customer.detail.kyc.decisionPanel.subtitle")}
									</p>
								</div>
							</div>
							<div className="space-y-4 bg-ops-surface-muted/25 p-4 sm:p-6 lg:p-8">
								{/* Synthèse statut dossier */}
								<section
									className="overflow-hidden rounded-ops-xl border border-ops-border bg-ops-surface shadow-sm ring-1 ring-black/[0.03]"
									aria-labelledby="kyc-decision-status-heading"
								>
									<div className="border-b border-ops-border bg-ops-surface-muted/80 px-5 py-3">
										<h3 id="kyc-decision-status-heading" className="text-[11px] font-semibold uppercase tracking-wide text-ops-fg-muted">
											{t("customer.detail.kyc.currentStatus")}
										</h3>
									</div>
									<div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-5">
										<p className="text-lg font-semibold tracking-tight text-ops-fg sm:text-xl">
											{t(`customer.statuses.${customer.status}`)}
										</p>
										<Badge variant={statusBadgeVariant(customer.status)} className="w-fit shrink-0 px-3 py-1 text-xs font-medium">
											<span>{translatedCustomerStatus(t, customer.status)}</span>
											<span className="ml-1.5 font-mono text-[10px] font-normal opacity-75">
												{t("customer.detail.headerStrip.statusCode", { code: customer.status })}
											</span>
										</Badge>
									</div>
								</section>

								{/* Étape 1 — Revues ligne (résumé) */}
								<section
									className="overflow-hidden rounded-ops-xl border border-ops-border bg-ops-surface shadow-sm ring-1 ring-black/[0.03]"
									aria-labelledby="kyc-decision-step-1-title"
								>
									<div className="flex flex-wrap items-start gap-4 p-5 sm:gap-5 sm:p-6">
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-bold text-white shadow-md ring-4 ring-black/10">
											1
										</div>
										<div className="min-w-0 flex-1 space-y-3">
											<div className="flex flex-wrap items-center gap-2">
												<h4 id="kyc-decision-step-1-title" className="text-sm font-semibold text-ops-fg sm:text-base">
													{t("customer.detail.kyc.workflow.stepA.title")}
												</h4>
												{kycAllLineReviewsApproved ? (
													<Badge variant="success" className="text-[10px] font-medium">
														{t("customer.detail.kyc.workflow.stepA.badgeOk")}
													</Badge>
												) : null}
											</div>
											<p className="text-xs leading-relaxed text-ops-fg-muted sm:text-sm">{t("customer.detail.kyc.workflow.stepA.description")}</p>
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
												{[
													{ key: "email", label: t("customer.detail.kyc.emailReview"), s: customer.emailReviewStatus },
													{ key: "profile", label: t("customer.detail.kyc.profileReview"), s: customer.profileReviewStatus },
													{ key: "identity", label: t("customer.detail.kyc.identityReview"), s: customer.identityReviewStatus }
												].map(row => (
													<div
														key={row.key}
														className="flex items-center justify-between gap-2 rounded-xl border border-ops-border bg-ops-surface-muted/50 px-3 py-2.5 shadow-sm"
													>
														<span className="truncate text-xs font-medium text-ops-fg">{row.label}</span>
														<Badge variant={reviewStatusBadgeVariant(row.s)} className="shrink-0 text-[10px]">
															{reviewStatusLabel(row.s)}
														</Badge>
													</div>
												))}
											</div>
											{customer.status === "PENDING_REVIEW" && !kycAllLineReviewsApproved ? (
												<p className="rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-xs text-amber-950">
													{t("customer.detail.kyc.verify.reviewsNotApprovedHint")}
												</p>
											) : null}
										</div>
									</div>
								</section>

								{/* Étape 2 — Screening listes */}
								<section
									className="overflow-hidden rounded-ops-xl border border-ops-border bg-ops-surface shadow-sm ring-1 ring-black/[0.03]"
									aria-labelledby="kyc-decision-step-2-title"
								>
									<div className="flex flex-wrap items-start gap-4 p-5 sm:gap-5 sm:p-6">
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-bold text-white shadow-md ring-4 ring-black/10">
											2
										</div>
										<div className="min-w-0 flex-1 space-y-3">
											<div className="flex flex-wrap items-center gap-2">
												<h4 id="kyc-decision-step-2-title" className="text-sm font-semibold text-ops-fg sm:text-base">
													{t("customer.detail.kyc.workflow.stepScreening.title")}
												</h4>
												{listScreeningPresence.hasListScreening ? (
													<Badge variant="success" className="text-[10px] font-medium">
														{t("customer.detail.kyc.workflow.stepScreening.badgeOk")}
													</Badge>
												) : null}
											</div>
											<p className="text-xs leading-relaxed text-ops-fg-muted sm:text-sm">{t("customer.detail.kyc.workflow.stepScreening.description")}</p>
											{listScreeningPresence.hasListScreening && listScreeningHasReviewOutcome ? (
												<p className="text-xs leading-relaxed text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded-lg px-3 py-2">
													{t("customer.detail.kyc.workflow.stepScreening.reviewOutcomeHint")}
												</p>
											) : null}
											{customer.status === "PENDING_REVIEW" && complianceLoading && kycChecks.length === 0 ? (
												<p className="text-xs text-slate-500">{t("customer.detail.kyc.workflow.stepScreening.loading")}</p>
											) : null}
											{customer.status === "PENDING_REVIEW" && !complianceLoading && !listScreeningPresence.hasListScreening ? (
												<p className="text-xs text-amber-900 bg-amber-50 border border-amber-200/90 rounded-lg px-3 py-2">
													{t("customer.detail.kyc.workflow.stepScreening.noneHint")}
												</p>
											) : null}
											{listScreeningPresence.hasListScreening ? (
												<div className="max-w-3xl space-y-2 rounded-xl border border-ops-border bg-ops-surface-muted/40 px-4 py-3 text-sm text-ops-fg shadow-sm">
													{listScreeningPresence.latestSanctions ? (
														<div className="flex flex-wrap items-center justify-between gap-2 border-b border-ops-border pb-2">
															<span className="text-xs font-medium text-ops-fg">
																{t("customer.detail.kyc.workflow.stepScreening.sanctions")}
															</span>
															<div className="flex flex-wrap items-center gap-2">
																<Badge
																	variant={
																		listScreeningPresence.latestSanctions.result === "PASS"
																			? "success"
																			: listScreeningPresence.latestSanctions.result === "FAIL"
																				? "danger"
																				: "warning"
																	}
																	className="text-[10px]"
																>
																	{kycCheckResultLabel(t, listScreeningPresence.latestSanctions.result)}
																</Badge>
																<span className="text-[11px] text-ops-fg-muted">
																	{listScreeningPresence.latestSanctions.checkedAt
																		? new Date(listScreeningPresence.latestSanctions.checkedAt).toLocaleString(locale)
																		: "—"}
																</span>
															</div>
														</div>
													) : null}
													{listScreeningPresence.latestPep ? (
														<div className="flex flex-wrap items-center justify-between gap-2 pt-1">
															<span className="text-xs font-medium text-ops-fg">
																{t("customer.detail.kyc.workflow.stepScreening.pep")}
															</span>
															<div className="flex flex-wrap items-center gap-2">
																<Badge
																	variant={
																		listScreeningPresence.latestPep.result === "PASS"
																			? "success"
																			: listScreeningPresence.latestPep.result === "FAIL"
																				? "danger"
																				: "warning"
																	}
																	className="text-[10px]"
																>
																	{kycCheckResultLabel(t, listScreeningPresence.latestPep.result)}
																</Badge>
																<span className="text-[11px] text-ops-fg-muted">
																	{listScreeningPresence.latestPep.checkedAt
																		? new Date(listScreeningPresence.latestPep.checkedAt).toLocaleString(locale)
																		: "—"}
																</span>
															</div>
														</div>
													) : null}
												</div>
											) : null}
											{customer.status === "PENDING_REVIEW" ? (
												<div className="space-y-3">
													<Button
														size="sm"
														variant="outline"
														disabled={decisionPanelScreeningBusy || complianceLoading || kycSubmitting !== null}
														onClick={async () => {
															if (!id) return;
															setDecisionPanelScreeningBusy(true);
															try {
																await customersApi.runListScreening(id);
																await loadComplianceData();
																setToast({ message: t("customer.detail.kyc.workflow.stepScreening.rescreenDone"), type: "success" });
															} catch (e) {
																setToast({ message: e instanceof Error ? e.message : String(e), type: "error" });
															} finally {
																setDecisionPanelScreeningBusy(false);
															}
														}}
													>
														{decisionPanelScreeningBusy ? "…" : t("customer.detail.kyc.workflow.stepScreening.rescreening")}
													</Button>
													<div className="rounded-ops-md border border-ops-border bg-ops-surface-muted/60 p-3">
														<p className="mb-2 text-[11px] font-medium text-ops-fg">
															{t("customer.detail.kyc.workflow.stepScreening.simulateSanctions")}
														</p>
														<div className="flex flex-wrap gap-2">
															<Button size="sm" variant="outline" disabled={decisionPanelScreeningBusy || complianceLoading || kycSubmitting !== null} onClick={() => void simulateScreeningCheck("SANCTIONS_SCREENING", "PASS", "decision-panel")}>
																{kycCheckResultLabel(t, "PASS")}
															</Button>
															<Button size="sm" variant="outline" disabled={decisionPanelScreeningBusy || complianceLoading || kycSubmitting !== null} onClick={() => void simulateScreeningCheck("SANCTIONS_SCREENING", "REVIEW", "decision-panel")}>
																{kycCheckResultLabel(t, "REVIEW")}
															</Button>
															<Button size="sm" variant="outline" disabled={decisionPanelScreeningBusy || complianceLoading || kycSubmitting !== null} onClick={() => void simulateScreeningCheck("SANCTIONS_SCREENING", "FAIL", "decision-panel")}>
																{kycCheckResultLabel(t, "FAIL")}
															</Button>
														</div>
													</div>
													<div className="rounded-xl border border-ops-border bg-ops-surface-muted/50 p-3 shadow-sm">
														<p className="mb-2 text-[11px] font-medium text-ops-fg">
															{t("customer.detail.kyc.workflow.stepScreening.simulatePep")}
														</p>
														<div className="flex flex-wrap gap-2">
															<Button size="sm" variant="outline" disabled={decisionPanelScreeningBusy || complianceLoading || kycSubmitting !== null} onClick={() => void simulateScreeningCheck("PEP_SCREENING", "PASS", "decision-panel")}>
																{kycCheckResultLabel(t, "PASS")}
															</Button>
															<Button size="sm" variant="outline" disabled={decisionPanelScreeningBusy || complianceLoading || kycSubmitting !== null} onClick={() => void simulateScreeningCheck("PEP_SCREENING", "REVIEW", "decision-panel")}>
																{kycCheckResultLabel(t, "REVIEW")}
															</Button>
															<Button size="sm" variant="outline" disabled={decisionPanelScreeningBusy || complianceLoading || kycSubmitting !== null} onClick={() => void simulateScreeningCheck("PEP_SCREENING", "FAIL", "decision-panel")}>
																{kycCheckResultLabel(t, "FAIL")}
															</Button>
														</div>
													</div>
												</div>
											) : null}
										</div>
									</div>
								</section>

								{/* Étape 3 — Risque */}
								<section
									className="overflow-hidden rounded-ops-xl border border-ops-border bg-ops-surface shadow-sm ring-1 ring-black/[0.03]"
									aria-labelledby="kyc-decision-step-3-title"
								>
									<div className="flex flex-wrap items-start gap-4 p-5 sm:gap-5 sm:p-6">
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-bold text-white shadow-md ring-4 ring-black/10">
											3
										</div>
										<div className="min-w-0 flex-1 space-y-4">
											<div>
												<h4 id="kyc-decision-step-3-title" className="text-sm font-semibold text-ops-fg sm:text-base">
													{t("customer.detail.kyc.workflow.stepB.title")}
												</h4>
												<p className="mt-1 text-xs leading-relaxed text-ops-fg-muted sm:text-sm">
													{customer.status === "VERIFIED"
														? t("customer.detail.kyc.workflow.stepB.verifiedDescription")
														: t("customer.detail.kyc.workflow.stepB.description")}
												</p>
											</div>
											{customer.status === "PENDING_REVIEW" ? (
												<div className="max-w-3xl rounded-xl border border-indigo-200/80 bg-indigo-50/40 px-4 py-3 shadow-sm">
													<p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-900">
														{t("customer.detail.kyc.evaluationPep.title")}
													</p>
													<p className="mt-1 text-xs text-slate-700">{t("customer.detail.kyc.evaluationPep.hint")}</p>
													<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
														<label className="flex cursor-pointer items-center gap-2 text-sm text-slate-900">
															<input
																type="checkbox"
																checked={verifyPep}
																onChange={e => setVerifyPep(e.target.checked)}
																className="h-4 w-4 rounded border-slate-300 text-indigo-600"
															/>
															<span>{t("customer.detail.kyc.evaluationPep.checkbox")}</span>
														</label>
														<span className="text-xs text-slate-600">
															{t("customer.detail.kyc.evaluationPep.profileFlag")}{" "}
															<strong>{customer.pepFlag ? t("customer.detail.kyc.evaluationPep.yes") : t("customer.detail.kyc.evaluationPep.no")}</strong>
														</span>
													</div>
												</div>
											) : null}
											<div className="min-w-0 max-w-3xl">
												{(customer.status === "PENDING_REVIEW" || customer.status === "VERIFIED") && (
												<div className="rounded-xl border border-ops-border bg-ops-surface-muted/35 px-4 py-3 text-sm text-ops-fg shadow-sm">
													{kycOnboardingRisk ? (
														<>
															<div className="mb-4 flex flex-wrap items-stretch gap-3">
																<div
																	className={`flex min-w-[7.5rem] flex-1 flex-col justify-center rounded-lg border px-3 py-2.5 ${
																		riskBadgeVariant(kycOnboardingRisk.proposedRiskScore) === "danger"
																			? "border-red-200/90 bg-red-50/60"
																			: riskBadgeVariant(kycOnboardingRisk.proposedRiskScore) === "warning"
																				? "border-amber-200/90 bg-amber-50/50"
																				: "border-emerald-200/90 bg-emerald-50/40"
																	}`}
																>
																	<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
																		{t("customer.detail.kyc.onboardingRisk.proposed")}
																	</span>
																	<div className="mt-0.5 flex items-baseline gap-0.5">
																		<span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">
																			{kycOnboardingRisk.proposedRiskScore}
																		</span>
																		<span className="text-xs font-medium text-slate-500">/100</span>
																	</div>
																</div>
																<div className="flex min-w-[6.5rem] flex-col justify-center gap-1 rounded-lg border border-ops-border bg-ops-surface-muted/60 px-3 py-2.5">
																	<span className="text-[10px] font-semibold uppercase tracking-wide text-ops-fg-muted">
																		{t("customer.detail.kyc.onboardingRisk.band")}
																	</span>
																	<Badge variant={onboardingRiskBandBadgeVariant(kycOnboardingRisk.riskBand)} className="w-fit text-[11px] font-semibold">
																		{onboardingRiskBandLabel(kycOnboardingRisk.riskBand)}
																	</Badge>
																</div>
															</div>

															<div className="mb-4 rounded-lg border border-slate-200/80 bg-slate-50/50">
																<div className="border-b border-slate-200/70 bg-white/90 px-3 py-1.5">
																	<p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
																		{t("customer.detail.kyc.onboardingRisk.components")}
																	</p>
																</div>
																<ul className="max-h-40 divide-y divide-slate-200/60 overflow-y-auto">
																	{kycOnboardingRisk.components.map((c, i) => (
																		<li key={`${c.code}-${i}`} className="px-3 py-2">
																			<div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
																				<div className="flex min-w-0 flex-1 items-center gap-2">
																					<span className="shrink-0 rounded bg-ops-surface-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ops-fg">
																						{c.code}
																					</span>
																					<span className="truncate text-xs font-medium text-ops-fg" title={c.label}>
																						{c.label}
																					</span>
																				</div>
																				<span className="shrink-0 rounded-md bg-ops-surface-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ops-fg">
																					{t("customer.detail.kyc.onboardingRisk.floorShort", { n: c.floorAfterComponent })}
																				</span>
																			</div>
																			<p className="mt-1 break-words text-[11px] leading-snug text-ops-fg-muted">{c.detail}</p>
																		</li>
																	))}
																</ul>
															</div>

															<p className="text-[10px] text-slate-500">
																<span className="font-medium uppercase tracking-wide">{t("customer.detail.kyc.onboardingRisk.algorithm")}</span>{" "}
																<code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-800">{kycOnboardingRisk.algorithmVersion}</code>
															</p>
														</>
													) : customer.status === "PENDING_REVIEW" && !listScreeningPresence.hasListScreening ? (
														<p className="text-xs leading-relaxed text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded-lg px-3 py-2">
															{t("customer.detail.kyc.workflow.stepB.needScreeningFirst")}
														</p>
													) : customer.status === "PENDING_REVIEW" && listScreeningPresence.hasListScreening && !kycOnboardingRisk ? (
														<p className="text-xs leading-relaxed text-ops-fg-muted">{t("customer.detail.kyc.workflow.stepB.engineLoading")}</p>
													) : customer.status === "VERIFIED" && kycLastEvalLoading ? (
														<p className="text-xs leading-relaxed text-ops-fg-muted">{t("customer.detail.kyc.workflow.stepB.lastRunLoading")}</p>
													) : customer.status === "VERIFIED" && !kycLastEvalLoading ? (
														<p className="text-xs leading-relaxed text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded-lg px-3 py-2">
															{t("customer.detail.kyc.workflow.stepB.lastRunEmpty")}
														</p>
													) : null}
												</div>
												)}
											</div>
										</div>
									</div>
								</section>

								{/* Étape 4 — Décision finale */}
								<section
									className="overflow-hidden rounded-ops-xl border border-ops-border bg-ops-surface shadow-sm ring-1 ring-black/[0.03]"
									aria-labelledby="kyc-decision-step-4-title"
								>
									<div className="flex flex-wrap items-start gap-4 p-5 sm:gap-5 sm:p-6">
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-bold text-white shadow-md ring-4 ring-black/10">
											4
										</div>
										<div className="min-w-0 flex-1 space-y-4">
											<div>
												<h4 id="kyc-decision-step-4-title" className="text-sm font-semibold text-ops-fg sm:text-base">
													{t("customer.detail.kyc.workflow.stepC.title")}
												</h4>
												<p className="mt-1 text-xs leading-relaxed text-ops-fg-muted sm:text-sm">{t("customer.detail.kyc.workflow.stepC.description")}</p>
											</div>
											<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
												<div className="rounded-xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/50 to-ops-surface p-4 shadow-sm sm:p-5">
													<h5 className="mb-1 text-sm font-semibold text-ops-fg">{t("customer.detail.kyc.verify.title")}</h5>
													<p className="mb-3 text-xs text-ops-fg-muted">{t("customer.detail.kyc.verify.descriptionNoManualScore")}</p>
													{customer.status === "PENDING_REVIEW" && !kycAllLineReviewsApproved ? (
														<p className="mb-3 rounded-xl border border-amber-200/90 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-950">
															{t("customer.detail.kyc.verify.reviewsNotApprovedHint")}
														</p>
													) : null}
													{kycOnboardingRisk?.blocked === true ? (
														<p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800">
															{t("customer.detail.kyc.onboardingRisk.blockedVerifyHint")}
														</p>
													) : null}
													<Button
														onClick={() => void doVerifyKyc()}
														disabled={
															kycSubmitting !== null ||
															!canFinalizeKyc ||
															!listScreeningPresence.hasListScreening ||
															kycOnboardingRisk == null ||
															kycOnboardingRisk.blocked === true
														}
														size="sm"
														className="bg-emerald-600 text-white hover:bg-emerald-700"
													>
														{kycSubmitting === "verify" ? t("customer.detail.kyc.verify.verifying") : t("customer.detail.kyc.verify.button")}
													</Button>
												</div>
												<div className="rounded-xl border border-ops-border bg-ops-surface-muted/40 p-4 shadow-sm sm:p-5">
													<h5 className="mb-1 text-sm font-semibold text-ops-fg">{t("customer.detail.kyc.reject.title")}</h5>
													<p className="mb-3 text-xs text-ops-fg-muted">{t("customer.detail.kyc.reject.description")}</p>
													{customer.status === "PENDING_REVIEW" && !kycAllLineReviewsApproved ? (
														<p className="mb-3 rounded-xl border border-amber-200/90 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-950">
															{t("customer.detail.kyc.verify.reviewsNotApprovedHint")}
														</p>
													) : null}
													<label className="mb-2 block text-xs font-medium text-ops-fg">{t("customer.detail.kyc.reject.reason")}</label>
													<textarea
														value={rejectionReason}
														onChange={e => setRejectionReason(e.target.value)}
														placeholder={t("customer.detail.kyc.reject.reasonPlaceholder")}
														className="mb-3 w-full resize-none rounded-ops-md border border-ops-border bg-ops-surface px-2 py-1.5 text-xs text-ops-fg placeholder:text-ops-fg-muted focus:border-ops-ring focus:outline-none focus:ring-2 focus:ring-ops-ring/25"
														rows={3}
													/>
													<div className="flex flex-wrap gap-2">
														<Button
															size="sm"
															variant="outline"
															onClick={() => void doRejectKyc()}
															disabled={kycSubmitting !== null || !rejectionReason.trim() || !canFinalizeKyc}
															className="border-red-300 text-red-700 hover:bg-red-50"
														>
															{kycSubmitting === "reject" ? t("customer.detail.kyc.reject.rejecting") : t("customer.detail.kyc.reject.confirm")}
														</Button>
														<Button
															size="sm"
															variant="ghost"
															onClick={() => setRejectionReason("")}
															disabled={kycSubmitting !== null}
														>
															{t("customer.detail.generalInfo.cancel")}
														</Button>
													</div>
												</div>
											</div>
										</div>
									</div>
								</section>
							</div>
						</div>

						{customer.rejectionReason && (
							<div className="overflow-hidden rounded-ops-xl border border-red-200/90 bg-red-50/90 p-5 shadow-sm ring-1 ring-red-900/[0.06] sm:p-6">
								<h3 className="mb-2 text-sm font-semibold text-red-900">{t("customer.detail.kyc.reject.previousReason")}</h3>
								<p className="text-sm leading-relaxed text-red-800">{customer.rejectionReason}</p>
							</div>
						)}
					</div>
				)}


						{complianceInnerTab === "riskRunsHistory" && (
							<div
								className="space-y-4"
								role="tabpanel"
								id="compliance-subpanel-riskRunsHistory"
								aria-labelledby="compliance-subtab-riskRunsHistory"
							>
								<section
									className="overflow-hidden rounded-ops-xl border border-ops-border bg-ops-surface shadow-ops-card"
									aria-labelledby="compliance-risk-runs-heading"
								>
									<div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
										<h3 id="compliance-risk-runs-heading" className="text-sm font-semibold tracking-tight text-slate-900">
											{t("customer.detail.compliance.riskRunsHistory.title")}
										</h3>
										<p className="mt-1 text-xs text-slate-500 leading-relaxed">
											{t("customer.detail.compliance.riskRunsHistory.subtitle")}
										</p>
									</div>
									{kycRiskRunsLoading && !kycRiskRunsPaged ? (
										<OpsLoadingState embedded message={t("customer.detail.compliance.riskRunsHistory.loading")} />
									) : !kycRiskRunsPaged || kycRiskRunsPaged.content.length === 0 ? (
										<OpsEmptyState embedded title={t("customer.detail.compliance.riskRunsHistory.empty")} />
									) : (
										<>
											<div className={OPS_TABLE_WRAP}>
												<table className={OPS_TABLE}>
													<thead className={OPS_THEAD}>
														<tr>
															<th className={OPS_TH}>{t("customer.detail.compliance.riskRunsHistory.columnWhen")}</th>
															<th className={OPS_TH}>{t("customer.detail.compliance.riskRunsHistory.columnSource")}</th>
															<th className={OPS_TH}>{t("customer.detail.compliance.riskRunsHistory.columnScore")}</th>
															<th className={OPS_TH}>{t("customer.detail.compliance.riskRunsHistory.columnBand")}</th>
															<th className={OPS_TH}>{t("customer.detail.compliance.riskRunsHistory.columnDecision")}</th>
															<th className={OPS_TH}>{t("customer.detail.compliance.riskRunsHistory.columnBlocked")}</th>
															<th className={OPS_TH}>{t("customer.detail.compliance.riskRunsHistory.columnActions")}</th>
														</tr>
													</thead>
													<tbody className="divide-y divide-ops-border bg-ops-surface text-sm">
														{kycRiskRunsPaged.content.map(run => (
															<tr key={run.id} className={OPS_TR_HOVER}>
																<td className={`${OPS_TD} whitespace-nowrap text-ops-fg-muted`}>
																	{run.createdAt ? new Date(run.createdAt).toLocaleString(locale) : "—"}
																</td>
																<td className={OPS_TD}>{kycRiskRunSourceLabel(run.runSource)}</td>
																<td className={`${OPS_TD} font-semibold tabular-nums`}>{run.proposedRiskScore}</td>
																<td className={OPS_TD}>
																	<Badge variant={onboardingRiskBandBadgeVariant(run.riskBand)} className="text-[10px] font-semibold">
																		{onboardingRiskBandLabel(run.riskBand)}
																	</Badge>
																</td>
																<td className={OPS_TD}>
																	{run.decision ? (
																		<Badge variant={onboardingRiskDecisionBadgeVariant(run.decision)} className="text-[10px] font-semibold">
																			{onboardingRiskDecisionLabel(run.decision)}
																		</Badge>
																	) : (
																		<span className="text-ops-fg-muted">—</span>
																	)}
																</td>
																<td className={OPS_TD}>
																	{run.blocked ? (
																		<Badge variant="danger" className="text-[10px]">
																			{t("customer.detail.compliance.riskRunsHistory.yes")}
																		</Badge>
																	) : (
																		<span className="text-ops-fg-muted">{t("customer.detail.compliance.riskRunsHistory.no")}</span>
																	)}
																</td>
																<td className={OPS_TD}>
																	<Button type="button" size="sm" variant="outline" onClick={() => void openKycRiskRunDetails(run)}>
																		{t("customer.detail.compliance.riskRunsHistory.details")}
																	</Button>
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
											<TablePagination
												page={kycRiskRunsPaged.page ?? kycRiskRunsPage}
												totalPages={Math.max(1, kycRiskRunsPaged.totalPages ?? 1)}
												totalElements={kycRiskRunsPaged.totalElements ?? 0}
												pageSize={kycRiskRunsPaged.size ?? kycRiskRunsSize}
												onPageChange={setKycRiskRunsPage}
												resultsLabel={t("customer.detail.compliance.riskRunsHistory.paginationLabel")}
												showFirstLast
												sizeOptions={OPS_TABLE_PAGE_SIZE_OPTIONS}
												size={kycRiskRunsSize}
												onSizeChange={s => {
													setKycRiskRunsSize(s);
													setKycRiskRunsPage(0);
												}}
											/>
										</>
									)}
								</section>
							</div>
						)}

						{complianceInnerTab === "auditTrail" && (
						<div
							className="space-y-4"
							role="tabpanel"
							id="compliance-subpanel-auditTrail"
							aria-labelledby="compliance-subtab-auditTrail"
						>
							<section
								className="overflow-hidden rounded-ops-xl border border-ops-border bg-ops-surface shadow-ops-card"
								aria-labelledby="compliance-audit-trail-heading"
							>
								<div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
									<h3 id="compliance-audit-trail-heading" className="text-sm font-semibold tracking-tight text-slate-900">
										{t("customer.detail.compliance.auditTrail.title")}
									</h3>
									<p className="mt-1 text-xs text-slate-500 leading-relaxed">
										{t("customer.detail.compliance.auditTrail.subtitle")}
									</p>
								</div>
								<AuditEventsTable
									events={kycAuditTrailPaged?.content ?? []}
									loading={kycAuditTrailLoading}
									totalPages={Math.max(1, kycAuditTrailPaged?.totalPages ?? 1)}
									totalElements={kycAuditTrailPaged?.totalElements ?? 0}
									currentPage={kycAuditTrailPaged?.page ?? kycAuditTrailPage}
									pageSize={kycAuditTrailPaged?.size ?? KYC_AUDIT_TRAIL_PAGE_SIZE}
									resultsHeading={t("customer.detail.compliance.auditTrail.title")}
									onPageChange={setKycAuditTrailPage}
									onPageSizeChange={() => {
										setKycAuditTrailPage(0);
									}}
									onEventDetails={(eventId) => router.push(`/audit/${eventId}`)}
									onResourceTrace={(resourceType, resourceId) =>
										router.push(`/audit?resourceType=${encodeURIComponent(resourceType)}&resourceId=${resourceId}`)
									}
									showUserColumn
								/>
							</section>
						</div>
					)}
						</div>
					</div>
				)}

				{activeTab === "accounts" && (
					<div className="space-y-6">
						{/* Section Comptes */}
						<div className={OPS_CARD_SHELL}>
							<div className={`${OPS_CARD_HEADER} flex flex-wrap items-center justify-between gap-4`}>
						<div className="flex min-w-0 items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ops-surface text-ops-fg-muted ring-1 ring-ops-border">
								<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
								</svg>
							</div>
							<div className="min-w-0">
								<h2 className="text-lg font-semibold tracking-tight text-ops-fg sm:text-xl">{t("customer.detail.accounts.title")}</h2>
								<p className="text-xs text-ops-fg-muted sm:text-sm">{t("customer.detail.accounts.subtitle")}</p>
							</div>
						</div>
						<Button variant="outline" size="sm" onClick={load} className="shrink-0">
							<svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							{t("common.refresh")}
						</Button>
					</div>
				<div className="p-6 sm:p-8">
					{accounts.length === 0 ? (
						<div className="text-sm text-slate-500 py-8 text-center">
							<svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
							</svg>
							<p className="text-slate-500 text-lg font-medium">{t("customer.detail.accounts.none")}</p>
							<p className="text-slate-400 text-sm mt-2">{t("customer.detail.accounts.noneHint")}</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-slate-200">
								<thead className="bg-slate-50/90">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
											{t("customer.detail.accounts.accountNumber")}
										</th>
										<th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
											{t("customer.detail.accounts.productCode")}
										</th>
										<th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
											{t("common.status")}
										</th>
										<th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
											{t("customer.detail.accounts.currency")}
										</th>
										<th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
											{t("customer.detail.accounts.balance")}
										</th>
										<th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
											{t("customer.detail.accounts.availableBalance")}
										</th>
										<th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
											{t("customer.detail.accounts.openingDate")}
										</th>
										<th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
											{t("customer.table.actions")}
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-slate-200 text-sm">
									{accounts.map((account) => {
										const statusColors: Record<Account["status"], string> = {
											ACTIVE: "bg-green-100 text-green-800",
											CLOSED: "bg-slate-100 text-slate-800",
											FROZEN: "bg-sky-100 text-sky-800",
											SUSPENDED: "bg-yellow-100 text-yellow-800"
										};
										const statusLabels: Record<Account["status"], string> = {
											ACTIVE: t("common.status") + " - ACTIVE",
											CLOSED: t("common.status") + " - CLOSED",
											FROZEN: t("common.status") + " - FROZEN",
											SUSPENDED: t("common.status") + " - SUSPENDED"
										};
										return (
											<tr key={account.id} className="transition-colors hover:bg-indigo-50/40">
												<td className="px-6 py-4 whitespace-nowrap">
													<Link
														href={`/accounts/${account.id}`}
														className="text-indigo-600 hover:text-indigo-800 hover:underline font-mono font-medium"
													>
														{account.accountNumber}
													</Link>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													{account.product?.code ? (
														<Link
															href={`/products/${account.productId}`}
															className="text-indigo-600 hover:text-indigo-800 hover:underline font-mono"
														>
															{account.product.code}
														</Link>
													) : (
														<span className="text-slate-400">-</span>
													)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<Badge className={statusColors[account.status]}>
														{statusLabels[account.status]}
													</Badge>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
														{account.currency}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right">
													<span className={`font-mono font-semibold ${account.balance >= 0 ? "text-slate-900" : "text-red-600"}`}>
														{formatAmount(account.balance, account.currency || "XAF", locale)}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right">
													<span className={`font-mono font-semibold ${account.availableBalance >= 0 ? "text-slate-900" : "text-red-600"}`}>
														{formatAmount(account.availableBalance, account.currency || "XAF", locale)}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-slate-600">
													{account.openedAt
														? new Date(account.openedAt).toLocaleDateString("fr-FR", {
																day: "2-digit",
																month: "2-digit",
																year: "numeric"
															})
														: "-"}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right">
													<Link href={`/accounts/${account.id}`}>
														<Button variant="outline" size="sm" className="flex items-center gap-1">
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
													{t("customer.detail.accounts.view")}
												</Button>
													</Link>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
						)}
					</div>
				</div>
			</div>
				)}
				</div>
			</div>
		</div>
	);
}


