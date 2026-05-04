"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Toast from "@/components/ui/Toast";
import { customersApi, accountsApi } from "@/lib/api";
import { kycOnboardingRiskShowsEngineMetadata } from "@/lib/kycOnboardingRiskDisplay";
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
	ComplianceTask,
	ComplianceTaskStatus,
	Customer,
	Document,
	DocumentType,
	IdCardSide,
	KycCheck,
	KycOnboardingRiskAssessmentResponse,
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

	const kycShowsDroolsEngineMeta = useMemo(
		() => kycOnboardingRisk != null && kycOnboardingRiskShowsEngineMetadata(kycOnboardingRisk),
		[kycOnboardingRisk]
	);

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
		{ id: "kycReview", label: t("customer.detail.tabs.kycReview") },
		{ id: "compliance", label: t("customer.detail.tabs.compliance") },
		{ id: "accounts", label: t("customer.detail.tabs.accounts") }
	];

	const [kycChecks, setKycChecks] = useState<KycCheck[]>([]);
	const [complianceTasks, setComplianceTasks] = useState<ComplianceTask[]>([]);
	const [complianceLoading, setComplianceLoading] = useState(false);
	const [complianceAction, setComplianceAction] = useState<string | null>(null);
	const [decisionPanelScreeningBusy, setDecisionPanelScreeningBusy] = useState(false);
	const [eddInstruction, setEddInstruction] = useState("");
	const [taskResolution, setTaskResolution] = useState<Record<number, string>>({});

	const loadComplianceData = async () => {
		if (!id) return;
		setComplianceLoading(true);
		try {
			const [checks, tasks] = await Promise.all([customersApi.listKycChecks(id), customersApi.listComplianceTasks(id)]);
			setKycChecks(checks);
			setComplianceTasks(tasks);
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

	/** Checks listes / KYC : nécessaires au panneau Décision (screening + score) dès que le dossier est en revue. */
	useEffect(() => {
		if (!id || customer?.status !== "PENDING_REVIEW") return;
		void loadComplianceData();
	}, [id, customer?.status]);

	useEffect(() => {
		if (!id || Number.isNaN(id)) {
			setKycOnboardingRisk(null);
			return;
		}
		if (customer?.status !== "PENDING_REVIEW") {
			setKycOnboardingRisk(null);
			return;
		}
		if (customer.id !== id) {
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
	}, [id, customer?.id, customer?.status, verifyPep, listScreeningPresence.hasListScreening]);

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
							identityDocumentExpiresOn: identityDocExpiresOn.trim()
						}
					: undefined;
			await customersApi.uploadDocument(id, docType, docFile, uploadOpts);
			await load();
			setDocFile(null);
			setIdentityDocNumber("");
			setIdentityDocExpiresOn("");
			setToast({ message: t("customer.detail.documents.uploaded"), type: "success" });
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
			<div className="flex min-h-[50vh] items-center justify-center py-20">
				<div className="text-center">
					<div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
					<p className="text-sm font-medium text-slate-600">{t("customer.detail.loading")}</p>
				</div>
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
			<div className="mx-auto max-w-2xl space-y-6 pb-12">
				<div className="overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/40 p-6 shadow-lg shadow-amber-100/40 sm:p-7">
					<p className="text-base font-semibold tracking-tight text-amber-950">{t("customer.detail.wrongRouteTitle")}</p>
					<p className="mt-2 text-sm leading-relaxed text-amber-900/90">
						{t("customer.detail.wrongRouteDescription", {
							opened: t(`customer.types.${expectedType}`),
							actual: t(`customer.types.${customer.type}`)
						})}
					</p>
					<div className="mt-6 flex flex-wrap gap-3">
						<Link href={correctPath}>
							<Button className="shadow-sm">{t("customer.detail.wrongRouteOpenButton")}</Button>
						</Link>
						<Link href="/customers">
							<Button variant="outline" className="border-amber-300/80 bg-white/80">
								{t("customer.detail.backToList")}
							</Button>
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-6xl space-y-8 pb-12">
			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					onClose={() => setToast(null)}
				/>
			)}
			<datalist id="nace-suggestions-customer-detail">
				{NACE_ACTIVITY_CODE_SUGGESTIONS.map(code => (
					<option key={code} value={code} />
				))}
			</datalist>

			{/* En-tête */}
			<div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/50 sm:p-7">
				<Link
					href="/customers"
					className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-indigo-700"
				>
					<svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("customer.detail.backToList")}
				</Link>
				<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex items-start gap-4">
						<div
							className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${
								expectedType === "BUSINESS"
									? "bg-gradient-to-br from-violet-600 to-indigo-900"
									: "bg-gradient-to-br from-sky-500 to-indigo-800"
							}`}
						>
							{expectedType === "BUSINESS" ? (
								<svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.75}
										d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
									/>
								</svg>
							) : (
								<svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.75}
										d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
									/>
								</svg>
							)}
						</div>
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-2">
								<h1 className="text-2xl font-bold tracking-tight text-black sm:text-3xl">
									{customer?.displayName || `${t("common.customers")} #${id}`}
								</h1>
								{customer && (
									<span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
										{t(`customer.types.${customer.type}`)}
									</span>
								)}
							</div>
							<p className="mt-1.5 text-sm text-slate-600 sm:text-base">{t("customer.detail.subtitle")}</p>
						</div>
					</div>
					<div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
						<Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2 border-slate-200">
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
							</svg>
							{t("customer.detail.back")}
						</Button>
						<Button variant="outline" onClick={load} className="flex items-center gap-2 border-slate-200">
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							{t("common.refresh")}
						</Button>
					</div>
				</div>
				{error && (
					<div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-red-900">
						<svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span className="text-sm">{error}</span>
					</div>
				)}
			</div>

			{/* Onglets + contenu */}
			<div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-200/50">
				<nav
					className="flex gap-1 overflow-x-auto border-b border-slate-100 bg-gradient-to-r from-slate-100/90 via-slate-50 to-slate-100/90 px-2 py-2 sm:px-3"
					aria-label={t("customer.detail.subtitle")}
				>
					{tabs.map(tab => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
								activeTab === tab.id
									? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90"
									: "text-slate-600 hover:bg-white/80 hover:text-slate-900"
							}`}
						>
							{tab.label}
						</button>
					))}
				</nav>

				<div className="min-h-[280px] bg-gradient-to-b from-white via-white to-slate-50/40 p-6 sm:p-8">
				{activeTab === "dossier" && customer && (
					<div className="space-y-10">
					<div className="space-y-6">
						<div
							className={
								expectedType === "BUSINESS"
									? "overflow-hidden rounded-2xl border border-violet-200/85 bg-gradient-to-br from-white via-violet-50/[0.4] to-indigo-50/30 shadow-md shadow-violet-200/25 ring-1 ring-violet-950/[0.06]"
									: "overflow-hidden rounded-2xl border border-slate-200/85 bg-gradient-to-br from-white via-slate-50/45 to-indigo-50/[0.2] shadow-md shadow-slate-200/40 ring-1 ring-slate-900/[0.06]"
							}
						>
							<div
								className={
									expectedType === "BUSINESS"
										? "flex items-center justify-between gap-4 border-b border-violet-100/95 bg-gradient-to-r from-violet-600/[0.14] via-white to-indigo-600/[0.1] px-6 py-5 sm:px-8"
										: "flex items-center justify-between gap-4 border-b border-slate-100/95 bg-gradient-to-r from-indigo-600/[0.11] via-white to-slate-100/85 px-6 py-5 sm:px-8"
								}
							>
								<div className="flex min-w-0 flex-1 items-start gap-4">
									{expectedType === "BUSINESS" && (
										<div className="mt-0.5 hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-900 text-white shadow-md sm:flex">
											<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
										<div className="mt-0.5 hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-slate-800 text-white shadow-md sm:flex">
											<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
										<h2 className="text-xl font-bold tracking-tight text-black">
											{expectedType === "BUSINESS"
												? t("customer.detail.profile.businessTitle")
												: t("customer.detail.profile.title")}
										</h2>
										{expectedType === "PERSON" && (
											<p className="mt-1 text-xs text-slate-600">{t("customer.detail.profile.subtitle")}</p>
										)}
									</div>
								</div>
								{!isEditingProfile && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => setIsEditingProfile(true)}
										className={
											expectedType === "BUSINESS"
												? "shrink-0 border-violet-200/80 bg-white/90 text-black hover:bg-violet-50"
												: "shrink-0 border-indigo-200/80 bg-white/90 text-slate-900 hover:bg-indigo-50"
										}
									>
										{t("customer.detail.generalInfo.edit")}
									</Button>
								)}
							</div>
							<div className="p-6 sm:p-8">
								{customer.type === "PERSON" ? (
									!isEditingProfile ? (
										<div className="space-y-8 rounded-xl border border-slate-100/90 bg-white/85 p-5 shadow-inner ring-1 ring-slate-950/[0.04] sm:p-6">
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
											<div className="space-y-8 rounded-xl border border-slate-100/90 bg-white/85 p-5 shadow-inner ring-1 ring-slate-950/[0.04] sm:p-6">
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
											<div className="flex items-center gap-2 border-b border-violet-100/90 bg-gradient-to-r from-violet-50/90 via-white to-indigo-50/40 px-4 py-2.5">
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
											<div className="bg-gradient-to-b from-white to-violet-50/20 p-4 sm:p-5">
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
											<div className="flex items-center gap-2 border-b border-violet-100/90 bg-gradient-to-r from-violet-50/90 via-white to-indigo-50/40 px-4 py-2.5">
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
											<div className="bg-gradient-to-b from-white to-violet-50/20 p-4 sm:p-5">
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
											<div className="flex items-center gap-2 border-b border-violet-100/90 bg-gradient-to-r from-violet-50/90 via-white to-indigo-50/40 px-4 py-2.5">
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
											<div className="bg-gradient-to-b from-white to-violet-50/20 p-4 sm:p-5">
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
												<div className="flex items-center gap-2 border-b border-violet-100/90 bg-gradient-to-r from-violet-50/90 via-white to-indigo-50/40 px-4 py-2.5">
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
												<div className="bg-gradient-to-b from-white to-violet-50/20 p-4 sm:p-5">
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
												<div className="flex items-center gap-2 border-b border-violet-100/90 bg-gradient-to-r from-violet-50/90 via-white to-indigo-50/40 px-4 py-2.5">
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
												<div className="bg-gradient-to-b from-white to-violet-50/20 p-4 sm:p-5">
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
												<div className="flex items-center gap-2 border-b border-violet-100/90 bg-gradient-to-r from-violet-50/90 via-white to-indigo-50/40 px-4 py-2.5">
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
												<div className="bg-gradient-to-b from-white to-violet-50/20 p-4 sm:p-5">
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
							<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
								<div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50/90 px-6 py-4">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/60">
											<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
											</svg>
										</div>
										<div>
											<h2 className="text-lg font-semibold tracking-tight text-black">{t("customer.detail.addresses.title")}</h2>
											<p className="text-xs text-slate-500">{t("customer.detail.addresses.subtitle")}</p>
										</div>
									</div>
								</div>
								<div className="p-6">
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
							<form onSubmit={submitAddress} className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
								<div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50/90 px-6 py-4">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/60">
											<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
											</svg>
										</div>
										<div>
											<h2 className="text-lg font-semibold tracking-tight text-black">{t("customer.detail.addresses.add")}</h2>
											<p className="text-xs text-slate-500">{t("customer.detail.addresses.addSubtitle")}</p>
										</div>
									</div>
								</div>
								<div className="p-6 space-y-4">
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
						<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
							<div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50/90 px-6 py-4">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/60">
										<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
										</svg>
									</div>
									<div>
										<h2 className="text-lg font-semibold tracking-tight text-black">{t("customer.detail.relatedPersons.title")}</h2>
										<p className="text-xs text-slate-500">{t("customer.detail.relatedPersons.subtitle")}</p>
									</div>
								</div>
							</div>
							<div className="p-6">
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
							<div className="overflow-hidden rounded-xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/50 via-white to-white p-5 shadow-sm ring-1 ring-indigo-900/[0.06]">
								<h2 className="text-base font-semibold tracking-tight text-slate-900 mb-1">{t("customer.detail.kyc.submit.title")}</h2>
								<p className="text-xs text-slate-600 mb-4">{t("customer.detail.kyc.submit.description")}</p>
								<Button onClick={doSubmitKyc} disabled={kycSubmitting !== null} size="sm">
									{kycSubmitting === "submit" ? t("customer.detail.kyc.submit.submitting") : t("customer.detail.kyc.submit.button")}
								</Button>
							</div>
						)}
						{/* Carte Selfie améliorée */}
			{customer && (
				<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
					<div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50/90 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/60">
								<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
								</svg>
							</div>
							<div>
								<h2 className="text-lg font-semibold tracking-tight text-black">{t("customer.detail.photo.title")}</h2>
								<p className="text-xs text-slate-500">{t("customer.detail.photo.subtitle")}</p>
							</div>
						</div>
					</div>
					<div className="p-6">
						<div className="flex items-center gap-6">
							<div className="flex-shrink-0">
								{selfieUrl && id && !selfieError ? (
									<div className="relative">
										<img
											src={selfieUrl}
											alt={t("customer.detail.photo.alt")}
											className="h-32 w-32 rounded-2xl border-4 border-slate-200 object-cover shadow-lg"
											onError={() => setSelfieError(true)}
											onLoad={() => setSelfieError(false)}
										/>
										{selfieDocument?.status === "APPROVED" && (
											<div className="absolute bottom-0 right-0 rounded-lg border-2 border-white bg-green-500 p-1.5 shadow-md">
												<svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
													<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
												</svg>
											</div>
										)}
									</div>
								) : (
									<div className="flex h-32 w-32 items-center justify-center rounded-2xl border-4 border-slate-200 bg-slate-100 shadow-lg">
										<svg className="w-20 h-20 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
											<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
										</svg>
									</div>
								)}
							</div>
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-3">
									<Badge variant={statusBadgeVariant(customer.status)}>
										{customer.status}
									</Badge>
									<Badge variant={customer.type === "PERSON" ? "info" : "warning"}>
										{customer.type}
									</Badge>
								</div>
								{!selfieUrl ? (
									<form onSubmit={uploadSelfie} className="flex items-center gap-3">
										<div className="flex-1">
											<input
												type="file"
												id="selfie-upload"
												accept="image/*"
												onChange={e => setSelfieFile(e.target.files?.[0] ?? null)}
												className="hidden"
											/>
											<label
												htmlFor="selfie-upload"
												className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
											>
												<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
												</svg>
												{selfieFile ? selfieFile.name : t("customer.detail.photo.upload")}
											</label>
										</div>
										{selfieFile && (
											<Button type="submit" disabled={selfieUploading} size="sm">
												{selfieUploading ? t("customer.detail.photo.uploading") : t("customer.detail.photo.send")}
											</Button>
										)}
									</form>
								) : (
									<div className="flex items-center gap-2">
										<a
											href={selfieUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="text-sm text-indigo-600 hover:text-indigo-800 underline font-medium"
										>
											{t("customer.detail.photo.view")}
										</a>
										{selfieDocument?.status && (
											<Badge variant={selfieDocument.status === "APPROVED" ? "success" : selfieDocument.status === "REJECTED" ? "danger" : "warning"}>
												{selfieDocument.status}
											</Badge>
										)}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

						{/* Informations principales */}
						{/* Carte Informations générales */}
						<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04] mb-6">
					<div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50/90 px-6 py-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/60">
									<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<div>
									<h2 className="text-lg font-semibold tracking-tight text-black">{t("customer.detail.generalInfo.title")}</h2>
									<p className="text-xs text-slate-500">{t("customer.detail.generalInfo.subtitle")}</p>
								</div>
							</div>
							{!isEditing && customer && (
								<Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
									{t("customer.detail.generalInfo.edit")}
								</Button>
							)}
						</div>
					</div>
					<div className="p-6">
						{loading && <div className="text-sm text-slate-500 text-center py-4">{t("common.loading")}</div>}
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
														<div className="flex items-center gap-2 border-b border-violet-100/90 bg-gradient-to-r from-violet-50/90 via-white to-indigo-50/40 px-4 py-2.5">
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
														<div className="bg-gradient-to-b from-white to-violet-50/20 p-4 sm:p-5">
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
														<div className="flex items-center gap-2 border-b border-violet-100/90 bg-gradient-to-r from-violet-50/90 via-white to-indigo-50/40 px-4 py-2.5">
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
														<div className="bg-gradient-to-b from-white to-violet-50/20 p-4 sm:p-5">
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
														<div className="flex items-center gap-2 border-b border-violet-100/90 bg-gradient-to-r from-violet-50/90 via-white to-indigo-50/40 px-4 py-2.5">
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
														<div className="bg-gradient-to-b from-white to-violet-50/20 p-4 sm:p-5">
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
													<dt className="text-sm font-medium text-slate-600">Statut</dt>
													<dd>
														<Badge variant={statusBadgeVariant(customer.status)}>{customer.status}</Badge>
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
					<div className="space-y-6">
						{/* En-tête */}
						<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
							<div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50/40 to-white px-6 py-5">
								<h2 className="text-xl font-semibold tracking-tight text-black">{t("customer.detail.documents.title")}</h2>
								<p className="text-sm text-slate-500 mt-0.5">{t("customer.detail.documents.subtitle")}</p>
							</div>
						</div>

						{/* Carte Upload */}
						<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
							<div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3.5">
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
									</div>
								</form>
							</div>
						</div>

						{/* Carte Liste des documents */}
						<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
							<div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3.5">
								<h3 className="text-sm font-semibold text-slate-800">{t("customer.detail.documents.saved")}</h3>
							</div>
							<div className="p-6">
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
																<span>{new Date(doc.uploadedAt).toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
															</div>
														)}
														{doc.reviewedAt && (
															<div className="flex items-center gap-2">
																<span className="text-slate-400">{t("customer.detail.documents.reviewedAt")}:</span>
																<span>{new Date(doc.reviewedAt).toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
															</div>
														)}
													</div>
													{doc.reviewerNote && (
														<div className="mt-3 rounded-lg bg-indigo-50 border border-indigo-100 p-3">
															<p className="text-xs font-medium text-black mb-0.5">{t("customer.detail.documents.reviewerNote")}</p>
															<p className="text-xs text-slate-800">{doc.reviewerNote}</p>
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
				)}

				{activeTab === "kycReview" && customer && (
					<div className="space-y-6">
						{/* En-tête */}
						<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
							<div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50/40 to-white px-6 py-5">
								<h2 className="text-xl font-semibold tracking-tight text-black">{t("customer.detail.kyc.title")}</h2>
								<p className="text-sm text-slate-500 mt-0.5">{t("customer.detail.kyc.subtitle")}</p>
							</div>
						</div>

						{/* Grille: Revue email, Revue profil, Revue identité */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
							<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
								<div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3.5">
									<h3 className="text-sm font-semibold text-slate-800">{t("customer.detail.kyc.emailReview")}</h3>
								</div>
								<div className="p-5">
									<div className="flex items-center justify-between mb-4">
										<span className="text-xs text-slate-500">{t("customer.detail.kyc.currentStatus")}</span>
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

							<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
								<div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3.5">
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

							<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
								<div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3.5">
									<h3 className="text-sm font-semibold text-slate-800">{t("customer.detail.kyc.identityReview")}</h3>
								</div>
								<div className="p-5">
									<div className="flex items-center justify-between mb-4">
										<span className="text-xs text-slate-500">{t("customer.detail.kyc.currentStatus")}</span>
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

						{/* Décision KYC — workflow (statut → revues → risque → décision) */}
						<div className="overflow-hidden rounded-xl border border-indigo-200/70 bg-gradient-to-br from-white via-slate-50/40 to-indigo-50/[0.35] shadow-sm ring-1 ring-slate-900/[0.05]">
							<div className="border-b border-indigo-100/90 bg-gradient-to-r from-indigo-50/90 via-white to-white px-5 py-4 md:px-6">
								<h3 className="text-base font-semibold tracking-tight text-slate-900">{t("customer.detail.kyc.decisionPanel.title")}</h3>
								<p className="text-xs text-slate-600 mt-1 max-w-3xl">{t("customer.detail.kyc.decisionPanel.subtitle")}</p>
							</div>
							<div className="p-5 md:p-6 space-y-8">
								{/* Synthèse statut dossier */}
								<section className="rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm">
									<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("customer.detail.kyc.currentStatus")}</p>
											<p className="text-lg font-semibold text-slate-900 mt-1">
												{t(`customer.statuses.${customer.status}`)}
											</p>
										</div>
										<Badge variant={statusBadgeVariant(customer.status)} className="w-fit shrink-0 text-xs font-medium px-3 py-1">
											{customer.status}
										</Badge>
									</div>
								</section>

								{/* Étape 1 — Revues ligne (résumé) */}
								<section>
									<div className="flex flex-wrap items-start gap-3">
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm ring-2 ring-indigo-200/80">
											1
										</div>
										<div className="min-w-0 flex-1 space-y-3">
											<div className="flex flex-wrap items-center gap-2">
												<h4 className="text-sm font-semibold text-slate-900">{t("customer.detail.kyc.workflow.stepA.title")}</h4>
												{kycAllLineReviewsApproved ? (
													<Badge variant="success" className="text-[10px] font-medium">
														{t("customer.detail.kyc.workflow.stepA.badgeOk")}
													</Badge>
												) : null}
											</div>
											<p className="text-xs text-slate-600">{t("customer.detail.kyc.workflow.stepA.description")}</p>
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
												{[
													{ key: "email", label: t("customer.detail.kyc.emailReview"), s: customer.emailReviewStatus },
													{ key: "profile", label: t("customer.detail.kyc.profileReview"), s: customer.profileReviewStatus },
													{ key: "identity", label: t("customer.detail.kyc.identityReview"), s: customer.identityReviewStatus }
												].map(row => (
													<div
														key={row.key}
														className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/90 bg-slate-50/80 px-3 py-2.5"
													>
														<span className="text-xs font-medium text-slate-700 truncate">{row.label}</span>
														<Badge variant={reviewStatusBadgeVariant(row.s)} className="shrink-0 text-[10px]">
															{reviewStatusLabel(row.s)}
														</Badge>
													</div>
												))}
											</div>
											{customer.status === "PENDING_REVIEW" && !kycAllLineReviewsApproved ? (
												<p className="text-xs text-amber-900 bg-amber-50 border border-amber-200/90 rounded-lg px-3 py-2">
													{t("customer.detail.kyc.verify.reviewsNotApprovedHint")}
												</p>
											) : null}
										</div>
									</div>
								</section>

								<div className="border-t border-slate-200/80" aria-hidden />

								{/* Étape 2 — Screening listes */}
								<section>
									<div className="flex flex-wrap items-start gap-3">
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm ring-2 ring-indigo-200/80">
											2
										</div>
										<div className="min-w-0 flex-1 space-y-3">
											<div className="flex flex-wrap items-center gap-2">
												<h4 className="text-sm font-semibold text-slate-900">{t("customer.detail.kyc.workflow.stepScreening.title")}</h4>
												{listScreeningPresence.hasListScreening ? (
													<Badge variant="success" className="text-[10px] font-medium">
														{t("customer.detail.kyc.workflow.stepScreening.badgeOk")}
													</Badge>
												) : null}
											</div>
											<p className="text-xs text-slate-600">{t("customer.detail.kyc.workflow.stepScreening.description")}</p>
											{customer.status === "PENDING_REVIEW" && complianceLoading && kycChecks.length === 0 ? (
												<p className="text-xs text-slate-500">{t("customer.detail.kyc.workflow.stepScreening.loading")}</p>
											) : null}
											{customer.status === "PENDING_REVIEW" && !complianceLoading && !listScreeningPresence.hasListScreening ? (
												<p className="text-xs text-amber-900 bg-amber-50 border border-amber-200/90 rounded-lg px-3 py-2">
													{t("customer.detail.kyc.workflow.stepScreening.noneHint")}
												</p>
											) : null}
											{listScreeningPresence.hasListScreening ? (
												<div className="max-w-3xl space-y-2 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-sm shadow-sm">
													{listScreeningPresence.latestSanctions ? (
														<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
															<span className="text-xs font-medium text-slate-700">
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
																	{listScreeningPresence.latestSanctions.result}
																</Badge>
																<span className="text-[11px] text-slate-500">
																	{listScreeningPresence.latestSanctions.checkedAt
																		? new Date(listScreeningPresence.latestSanctions.checkedAt).toLocaleString(locale)
																		: "—"}
																</span>
															</div>
														</div>
													) : null}
													{listScreeningPresence.latestPep ? (
														<div className="flex flex-wrap items-center justify-between gap-2 pt-1">
															<span className="text-xs font-medium text-slate-700">
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
																	{listScreeningPresence.latestPep.result}
																</Badge>
																<span className="text-[11px] text-slate-500">
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
											) : null}
										</div>
									</div>
								</section>

								<div className="border-t border-slate-200/80" aria-hidden />

								{/* Étape 3 — Risque */}
								<section>
									<div className="flex flex-wrap items-start gap-3">
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm ring-2 ring-indigo-200/80">
											3
										</div>
										<div className="min-w-0 flex-1 space-y-4">
											<div>
												<h4 className="text-sm font-semibold text-slate-900">{t("customer.detail.kyc.workflow.stepB.title")}</h4>
												<p className="text-xs text-slate-600 mt-1">{t("customer.detail.kyc.workflow.stepB.description")}</p>
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
												<div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-sm shadow-sm">
													<div className="mb-3 flex flex-wrap items-center gap-2">
														<h5 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
															{t("customer.detail.kyc.onboardingRisk.title")}
														</h5>
														{kycOnboardingRisk != null && kycShowsDroolsEngineMeta ? (
															<span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-900 ring-1 ring-indigo-200/80">
																{t("customer.detail.kyc.onboardingRisk.engineBadge.drools")}
															</span>
														) : null}
														<span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
															{t("customer.detail.kyc.onboardingRisk.phasePill")}
														</span>
													</div>
													<p className="mb-2 text-[11px] leading-snug text-slate-600">{t("customer.detail.kyc.onboardingRisk.subtitle")}</p>
													{kycOnboardingRisk != null && !kycShowsDroolsEngineMeta ? (
														<p className="mb-4 rounded-md border border-amber-200/80 bg-amber-50/80 px-2 py-1.5 text-[10px] leading-snug text-amber-950">
															{t("customer.detail.kyc.onboardingRisk.metadataPartialHint")}
														</p>
													) : null}
													{customer.status === "PENDING_REVIEW" && kycOnboardingRisk ? (
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
																<div className="flex min-w-[6.5rem] flex-col justify-center gap-1 rounded-lg border border-slate-200/90 bg-slate-50/80 px-3 py-2.5">
																	<span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
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
																					<span className="shrink-0 rounded bg-slate-200/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-800">
																						{c.code}
																					</span>
																					<span className="truncate text-xs font-medium text-slate-800" title={c.label}>
																						{c.label}
																					</span>
																				</div>
																				<span className="shrink-0 rounded-md bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-800">
																					{t("customer.detail.kyc.onboardingRisk.floorShort", { n: c.floorAfterComponent })}
																				</span>
																			</div>
																			<p className="mt-1 break-words text-[11px] leading-snug text-slate-600">{c.detail}</p>
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
														<p className="text-xs leading-relaxed text-slate-600">{t("customer.detail.kyc.workflow.stepB.engineLoading")}</p>
													) : (
														<p className="text-xs leading-relaxed text-slate-600">{t("customer.detail.kyc.workflow.stepB.engineWhenPending")}</p>
													)}
												</div>
											</div>
										</div>
									</div>
								</section>

								<div className="border-t border-slate-200/80" aria-hidden />

								{/* Étape 4 — Décision finale */}
								<section>
									<div className="flex flex-wrap items-start gap-3">
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm ring-2 ring-indigo-200/80">
											4
										</div>
										<div className="min-w-0 flex-1 space-y-4">
											<div>
												<h4 className="text-sm font-semibold text-slate-900">{t("customer.detail.kyc.workflow.stepC.title")}</h4>
												<p className="text-xs text-slate-600 mt-1">{t("customer.detail.kyc.workflow.stepC.description")}</p>
											</div>
											<div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-0 md:divide-x md:divide-slate-200">
												<div className="md:pr-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm md:border-0 md:shadow-none md:bg-transparent md:p-0 md:rounded-none">
													<h5 className="text-sm font-semibold text-slate-900 mb-1">{t("customer.detail.kyc.verify.title")}</h5>
													<p className="text-xs text-slate-500 mb-3">{t("customer.detail.kyc.verify.descriptionNoManualScore")}</p>
													{customer.status === "PENDING_REVIEW" && !kycAllLineReviewsApproved ? (
														<p className="text-xs text-amber-900 bg-amber-50 border border-amber-200/90 rounded-lg px-2 py-1.5 mb-3">
															{t("customer.detail.kyc.verify.reviewsNotApprovedHint")}
														</p>
													) : null}
													{kycOnboardingRisk?.blocked === true ? (
														<p className="mb-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
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
												<div className="md:pl-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm md:border-0 md:shadow-none md:bg-transparent md:p-0 md:rounded-none">
													<h5 className="text-sm font-semibold text-slate-900 mb-1">{t("customer.detail.kyc.reject.title")}</h5>
													<p className="text-xs text-slate-500 mb-3">{t("customer.detail.kyc.reject.description")}</p>
													{customer.status === "PENDING_REVIEW" && !kycAllLineReviewsApproved ? (
														<p className="text-xs text-amber-900 bg-amber-50 border border-amber-200/90 rounded-lg px-2 py-1.5 mb-3">
															{t("customer.detail.kyc.verify.reviewsNotApprovedHint")}
														</p>
													) : null}
													<label className="mb-2 block text-xs font-medium text-slate-700">{t("customer.detail.kyc.reject.reason")}</label>
													<textarea
														value={rejectionReason}
														onChange={e => setRejectionReason(e.target.value)}
														placeholder={t("customer.detail.kyc.reject.reasonPlaceholder")}
														className="mb-3 w-full resize-none rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
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
							<div className="rounded-xl border border-red-200 bg-red-50 p-4">
								<h3 className="text-sm font-semibold text-red-900 mb-2">{t("customer.detail.kyc.reject.previousReason")}</h3>
								<p className="text-sm text-red-800">{customer.rejectionReason}</p>
							</div>
						)}
					</div>
				)}

				{activeTab === "compliance" && customer && (
					<div className="space-y-6">
						<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
							<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-white via-slate-50/40 to-white px-6 py-5">
								<div>
									<h2 className="text-xl font-semibold tracking-tight text-black">{t("customer.detail.compliance.title")}</h2>
									<p className="text-sm text-slate-500 mt-0.5">{t("customer.detail.compliance.subtitle")}</p>
								</div>
								<div className="flex gap-2">
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
									<Button size="sm" variant="outline" disabled={complianceLoading} onClick={() => void loadComplianceData()}>
										{t("customer.detail.compliance.refresh")}
									</Button>
								</div>
							</div>
						</div>

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

						<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
							<div className="border-b border-slate-100 bg-slate-50/90 px-5 py-3">
								<h3 className="text-sm font-semibold text-slate-800">{t("customer.detail.compliance.checksTitle")}</h3>
							</div>
							<div className="p-4 overflow-x-auto">
								{complianceLoading ? (
									<p className="text-sm text-slate-500">{t("customer.detail.loading")}</p>
								) : kycChecks.length === 0 ? (
									<p className="text-sm text-slate-500">{t("customer.detail.compliance.emptyChecks")}</p>
								) : (
									<table className="min-w-full text-sm">
										<thead>
											<tr className="text-left text-slate-600 border-b">
												<th className="py-2 pr-4">{t("customer.detail.compliance.type")}</th>
												<th className="py-2 pr-4">{t("customer.detail.compliance.result")}</th>
												<th className="py-2 pr-4">{t("customer.detail.compliance.at")}</th>
											</tr>
										</thead>
										<tbody>
											{kycChecks.map(c => (
												<tr key={c.id} className="border-b border-slate-100">
													<td className="py-2 pr-4 font-medium">{c.type}</td>
													<td className="py-2 pr-4">{c.result}</td>
													<td className="py-2 pr-4 text-slate-600">
														{c.checkedAt ? new Date(c.checkedAt).toLocaleString(locale) : "—"}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								)}
							</div>
						</div>

						<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
							<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-5 py-3">
								<h3 className="text-sm font-semibold text-slate-800">{t("customer.detail.compliance.tasksTitle")}</h3>
								<div className="flex flex-wrap items-end gap-2">
									<Input
										className="w-56 h-9 text-xs"
										placeholder={t("customer.detail.compliance.instruction")}
										value={eddInstruction}
										onChange={e => setEddInstruction(e.target.value)}
									/>
									<Button
										size="sm"
										disabled={complianceAction !== null || !eddInstruction.trim()}
										onClick={async () => {
											setComplianceAction("edd");
											try {
												await customersApi.createComplianceTask(id, { taskType: "EDD_REVIEW", instruction: eddInstruction.trim() });
												setEddInstruction("");
												await loadComplianceData();
												setToast({ message: t("customer.detail.compliance.eddCreated"), type: "success" });
											} catch (e) {
												setToast({ message: e instanceof Error ? e.message : String(e), type: "error" });
											} finally {
												setComplianceAction(null);
											}
										}}
									>
										{complianceAction === "edd" ? "…" : t("customer.detail.compliance.createEdd")}
									</Button>
								</div>
							</div>
							<div className="p-4 space-y-3">
								{complianceLoading ? (
									<p className="text-sm text-slate-500">{t("customer.detail.loading")}</p>
								) : complianceTasks.length === 0 ? (
									<p className="text-sm text-slate-500">{t("customer.detail.compliance.emptyTasks")}</p>
								) : (
									complianceTasks.map(task => (
										<div key={task.id} className="rounded-lg border border-slate-200 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
											<div>
												<div className="flex items-center gap-2">
													<Badge variant={task.status === "OPEN" ? "warning" : "success"}>{task.taskType}</Badge>
													<span className="text-xs text-slate-500">{task.status}</span>
												</div>
												{task.instruction && <p className="text-sm text-slate-600 mt-1">{task.instruction}</p>}
											</div>
											{task.status === "OPEN" && (
												<div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
													<Input
														className="w-full sm:w-48 h-9 text-xs"
														placeholder={t("customer.detail.compliance.resolution")}
														value={taskResolution[task.id] ?? ""}
														onChange={e => setTaskResolution(prev => ({ ...prev, [task.id]: e.target.value }))}
													/>
													<Button
														size="sm"
														disabled={complianceAction !== null}
														onClick={async () => {
															setComplianceAction("done-" + task.id);
															try {
																await customersApi.patchComplianceTask(id, task.id, {
																	status: "DONE" as ComplianceTaskStatus,
																	resolutionNote: taskResolution[task.id]?.trim() || undefined
																});
																await loadComplianceData();
																setToast({ message: t("customer.detail.compliance.taskUpdated"), type: "success" });
															} catch (e) {
																setToast({ message: e instanceof Error ? e.message : String(e), type: "error" });
															} finally {
																setComplianceAction(null);
															}
														}}
													>
														{t("customer.detail.compliance.markDone")}
													</Button>
													<Button
														size="sm"
														variant="outline"
														disabled={complianceAction !== null}
														onClick={async () => {
															setComplianceAction("cx-" + task.id);
															try {
																await customersApi.patchComplianceTask(id, task.id, {
																	status: "CANCELLED" as ComplianceTaskStatus,
																	resolutionNote: taskResolution[task.id]?.trim() || undefined
																});
																await loadComplianceData();
																setToast({ message: t("customer.detail.compliance.taskUpdated"), type: "success" });
															} catch (e) {
																setToast({ message: e instanceof Error ? e.message : String(e), type: "error" });
															} finally {
																setComplianceAction(null);
															}
														}}
													>
														{t("customer.detail.compliance.cancel")}
													</Button>
												</div>
											)}
										</div>
									))
								)}
							</div>
						</div>
					</div>
				)}

				{activeTab === "accounts" && (
					<div className="space-y-6">
						{/* Section Comptes */}
						<div className="overflow-hidden rounded-xl border border-slate-200/85 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
							<div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50/90 px-6 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/60">
								<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
								</svg>
							</div>
							<div>
								<h2 className="text-lg font-semibold tracking-tight text-black">{t("customer.detail.accounts.title")}</h2>
								<p className="text-xs text-slate-500">{t("customer.detail.accounts.subtitle")}</p>
							</div>
						</div>
						<Button variant="outline" size="sm" onClick={load}>
							<svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							{t("common.refresh")}
						</Button>
					</div>
				</div>
				<div className="p-6">
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


