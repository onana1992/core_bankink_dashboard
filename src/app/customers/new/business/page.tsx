"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { customersApi } from "@/lib/api";
import { customerDetailPath } from "@/lib/customerRoutes";
import { formatNationalityLabel, getNationalitySelectOptions } from "@/lib/nationalityOptions";
import { ANNUAL_REVENUE_BAND_OPTIONS, LEGAL_FORM_OPTIONS } from "@/data/legalFormOptions";
import {
	IDENTITY_DOC_NUMBER_MAX,
	PHONE_MAX_LEN,
	PHONE_MIN_DIGITS,
	countPhoneDigits,
	isFileSizeOk,
	isImageOrPdfFile,
	MAX_UPLOAD_BYTES,
	parseIsoLocalDate,
	isIsoDateAtLeastDaysAhead,
	isIsoDateStrictlyFuture,
	MIN_ID_VALIDITY_DAYS
} from "@/lib/personOnboardingValidation";
import { composeInternationalPhone, getPhoneDialSelectOptions } from "@/lib/phoneCountryDialOptions";
import type { AddAddressRequest, AddRelatedPersonRequest, CreateCustomerRequest, UpdateCustomerRequest } from "@/types";
import { BUSINESS_ACTIVITY_CATEGORY_VALUES, isBusinessActivityCategory } from "@/types/businessActivityCategory";
import type { KycGeographyRiskResponse, KycOnboardingRiskAssessmentResponse } from "@/types/customer";

const PHONE_CHARS_REGEX = /^[+]?[0-9\s\-().]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BUSINESS_CURRENCY_OPTIONS = ["XAF", "XOF", "EUR", "USD", "CAD"] as const;

function parseBusinessCurrencySet(raw: string): Set<string> {
	const s = new Set<string>();
	for (const part of raw.split(",")) {
		const c = part.trim().toUpperCase();
		if ((BUSINESS_CURRENCY_OPTIONS as readonly string[]).includes(c)) s.add(c);
	}
	return s;
}

function serializeBusinessCurrencies(set: Set<string>): string {
	return BUSINESS_CURRENCY_OPTIONS.filter(c => set.has(c)).join(", ");
}

type DirectorRow = { firstName: string; lastName: string; dateOfBirth: string; nationalId: string; pepFlag: boolean };
type UboRow = DirectorRow & {
	ownershipPercent: string;
	nationality: string;
	residenceLine1: string;
	residenceCity: string;
	residencePostalCode: string;
	residenceCountry: string;
	email: string;
	phoneDialIso2: string;
	phoneNational: string;
};

function emptyDirector(): DirectorRow {
	return { firstName: "", lastName: "", dateOfBirth: "", nationalId: "", pepFlag: false };
}

function emptyUbo(): UboRow {
	return {
		...emptyDirector(),
		ownershipPercent: "",
		nationality: "",
		residenceLine1: "",
		residenceCity: "",
		residencePostalCode: "",
		residenceCountry: "CM",
		email: "",
		phoneDialIso2: "CM",
		phoneNational: ""
	};
}

const RECAP_STEP = 8;

const STEP_KEYS = ["entity", "seat", "mailing", "contact", "directors", "ubos", "financial", "documents", "recap"] as const;

export default function NewBusinessCustomerPage() {
	const { t, i18n } = useTranslation();
	const router = useRouter();
	const nationalityOptions = useMemo(() => getNationalitySelectOptions(i18n.language), [i18n.language]);
	const phoneDialOptions = useMemo(() => getPhoneDialSelectOptions(i18n.language), [i18n.language]);

	const [step, setStep] = useState(0);
	const [wizardSuccess, setWizardSuccess] = useState(false);
	const [createdCustomerId, setCreatedCustomerId] = useState<number | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [entity, setEntity] = useState({
		displayName: "",
		tradeName: "",
		legalForm: "",
		registrationNumber: "",
		incorporationDate: "",
		incorporationCountry: "CM",
		taxResidenceCountry: "",
		taxIdentificationNumber: "",
		activityCategory: "",
		activityDescription: "",
		signingAuthorityNote: ""
	});

	const [seat, setSeat] = useState<AddAddressRequest>({
		type: "BUSINESS",
		line1: "",
		line2: "",
		city: "",
		state: "",
		postalCode: "",
		country: "CM",
		primaryAddress: true
	});

	const [mailingDifferent, setMailingDifferent] = useState(false);
	const [mailing, setMailing] = useState<AddAddressRequest>({
		type: "MAILING",
		line1: "",
		line2: "",
		city: "",
		state: "",
		postalCode: "",
		country: "CM",
		primaryAddress: false
	});

	const [contact, setContact] = useState({ email: "", phoneDialIso2: "CM", phoneNational: "", website: "" });

	const [directors, setDirectors] = useState<DirectorRow[]>([emptyDirector()]);
	const [ubos, setUbos] = useState<UboRow[]>([emptyUbo()]);

	const [financial, setFinancial] = useState({
		employeeCount: "",
		annualRevenueBand: "",
		currenciesUsed: "",
		expectedTransactionProfile: "",
		fundsSource: "",
		accountOpeningPurpose: ""
	});

	const [statutesFile, setStatutesFile] = useState<File | null>(null);
	const [kbisFile, setKbisFile] = useState<File | null>(null);
	const [poaFile, setPoaFile] = useState<File | null>(null);
	const [idDocType, setIdDocType] = useState<"ID_CARD" | "PASSPORT">("ID_CARD");
	const [identityDocumentNumber, setIdentityDocumentNumber] = useState("");
	const [identityDocumentExpiresOn, setIdentityDocumentExpiresOn] = useState("");
	const [identityIssuingCountry, setIdentityIssuingCountry] = useState("");
	const [precheck, setPrecheck] = useState<{ loading: boolean; contact: boolean | null; doc: boolean | null }>({
		loading: false,
		contact: null,
		doc: null
	});
	const [kycOutcome, setKycOutcome] = useState<{
		geo: KycGeographyRiskResponse | null;
		risk: KycOnboardingRiskAssessmentResponse | null;
	} | null>(null);
	const [idRectoFile, setIdRectoFile] = useState<File | null>(null);
	const [idVersoFile, setIdVersoFile] = useState<File | null>(null);
	const [passportFile, setPassportFile] = useState<File | null>(null);

	function isImageFile(f: File | null): boolean {
		return f != null && (f.type?.startsWith("image/") ?? false);
	}

	const shellSteps = useMemo(
		() =>
			STEP_KEYS.map((k, i) => ({
				id: `${k}-${i}`,
				title: t(`customer.wizard.business.steps.${k}`)
			})),
		[t]
	);

	useEffect(() => {
		const tr = entity.taxResidenceCountry.trim().toUpperCase().slice(0, 2);
		if (/^[A-Z]{2}$/.test(tr) && nationalityOptions.some(o => o.code === tr)) {
			setIdentityIssuingCountry(prev => (prev.trim() ? prev : tr));
		}
	}, [entity.taxResidenceCountry, nationalityOptions]);

	async function runRecapPrecheck() {
		setPrecheck({ loading: true, contact: null, doc: null });
		try {
			const email = contact.email.trim();
			const phone = composeInternationalPhone(contact.phoneDialIso2, contact.phoneNational).trim();
			const contactCheck = await customersApi.checkContactUniqueness({ email, phone });
			const contactOk = Boolean(contactCheck.emailUnique && contactCheck.phoneUnique);

			const issuing = identityIssuingCountry.trim().toUpperCase().slice(0, 2);
			let docOk = true;
			if (identityDocumentNumber.trim() && issuing.length === 2) {
				const docRes = await customersApi.checkIdentityDocumentUniqueness({
					documentType: idDocType,
					documentNumber: identityDocumentNumber.trim(),
					issuingCountry: issuing
				});
				docOk = Boolean(docRes.unique);
			} else {
				docOk = false;
			}
			setPrecheck({ loading: false, contact: contactOk, doc: docOk });
		} catch {
			setPrecheck({ loading: false, contact: false, doc: false });
		}
	}

	useEffect(() => {
		if (wizardSuccess || step !== RECAP_STEP) return;
		void runRecapPrecheck();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- précontrôle à l’entrée du récap uniquement
	}, [step, wizardSuccess]);

	function validateCountry(code: string): boolean {
		const c = code.trim().toUpperCase().slice(0, 2);
		return /^[A-Z]{2}$/.test(c) && nationalityOptions.some(o => o.code === c);
	}

	function toggleBusinessCurrency(code: (typeof BUSINESS_CURRENCY_OPTIONS)[number]) {
		setFinancial(f => {
			const set = parseBusinessCurrencySet(f.currenciesUsed || "");
			if (set.has(code)) set.delete(code);
			else set.add(code);
			return { ...f, currenciesUsed: serializeBusinessCurrencies(set) };
		});
	}

	function validateStep(s: number): string | null {
		if (s === 0) {
			if (!entity.displayName.trim()) return t("customer.wizard.business.validation.displayNameRequired");
			if (!entity.legalForm.trim()) return t("customer.wizard.business.validation.legalFormRequired");
			if (!entity.registrationNumber.trim()) return t("customer.wizard.business.validation.registrationRequired");
			if (!entity.incorporationDate) return t("customer.wizard.business.validation.incorporationDateRequired");
			if (!validateCountry(entity.incorporationCountry)) return t("customer.wizard.validation.countryInvalid");
			if (!entity.taxResidenceCountry?.trim()) return t("customer.detail.profile.taxResidenceRequired");
			if (!validateCountry(entity.taxResidenceCountry)) return t("customer.detail.profile.taxResidenceInvalid");
			if (entity.taxIdentificationNumber.trim().length > 64) return t("customer.detail.profile.taxIdTooLong");
			if (!entity.activityCategory.trim() || !isBusinessActivityCategory(entity.activityCategory)) {
				return t("customer.wizard.business.validation.activityCategoryRequired");
			}
			if (!entity.activityDescription.trim()) return t("customer.wizard.business.validation.activityDescriptionRequired");
			if (entity.activityDescription.trim().length > 1000) return t("customer.wizard.business.validation.textTooLong");
		}
		if (s === 1) {
			if (!seat.line1.trim()) return t("customer.wizard.validation.addressLine1Required");
			if (!seat.city.trim()) return t("customer.wizard.validation.cityRequired");
			if (!seat.postalCode?.trim()) return t("customer.wizard.validation.postalCodeRequired");
			if (!validateCountry(seat.country)) return t("customer.wizard.validation.countryInvalid");
		}
		if (s === 2 && mailingDifferent) {
			if (!mailing.line1.trim()) return t("customer.wizard.validation.addressLine1Required");
			if (!mailing.city.trim()) return t("customer.wizard.validation.cityRequired");
			if (!mailing.postalCode?.trim()) return t("customer.wizard.validation.postalCodeRequired");
			if (!validateCountry(mailing.country)) return t("customer.wizard.validation.countryInvalid");
		}
		if (s === 3) {
			if (!contact.email.trim()) return t("customer.wizard.validation.emailRequired");
			if (!EMAIL_REGEX.test(contact.email.trim())) return t("customer.wizard.validation.emailInvalid");
			if (!contact.phoneNational.trim()) return t("customer.wizard.validation.phoneRequired");
			const phoneRaw = composeInternationalPhone(contact.phoneDialIso2, contact.phoneNational).trim();
			if (!phoneRaw) return t("customer.wizard.validation.phoneRequired");
			if (phoneRaw.length > PHONE_MAX_LEN) return t("customer.wizard.validation.phoneTooLong");
			if (!PHONE_CHARS_REGEX.test(phoneRaw)) return t("customer.wizard.validation.phoneInvalid");
			if (countPhoneDigits(phoneRaw) < PHONE_MIN_DIGITS) return t("customer.wizard.validation.phoneDigitsTooFew");
			const w = contact.website.trim();
			if (w && !/^https?:\/\/.+/i.test(w) && !/^[a-z0-9.-]+\.[a-z]{2,}.*$/i.test(w)) {
				return t("customer.wizard.business.validation.websiteInvalid");
			}
		}
		if (s === 4) {
			for (let i = 0; i < directors.length; i++) {
				const d = directors[i];
				if (!d.firstName.trim() || !d.lastName.trim()) return t("customer.wizard.business.validation.directorNameRequired");
				if (!d.dateOfBirth) return t("customer.wizard.business.validation.directorDobRequired");
				if (!d.nationalId.trim()) return t("customer.wizard.business.validation.directorNationalIdRequired");
			}
		}
		if (s === 5) {
			for (const u of ubos) {
				if (!u.firstName.trim() || !u.lastName.trim()) return t("customer.wizard.business.validation.uboNameRequired");
				if (!u.dateOfBirth) return t("customer.wizard.business.validation.uboDobRequired");
				if (!u.nationalId.trim()) return t("customer.wizard.business.validation.uboNationalIdRequired");
				const pct = Number(u.ownershipPercent);
				if (Number.isNaN(pct) || pct < 0 || pct > 100) return t("customer.wizard.validation.uboOwnershipRequired");
				if (!validateCountry(u.nationality)) return t("customer.wizard.business.validation.uboNationalityRequired");
				if (!u.residenceLine1.trim() || !u.residenceCity.trim()) return t("customer.wizard.business.validation.uboAddressRequired");
				if (!validateCountry(u.residenceCountry)) return t("customer.wizard.validation.countryInvalid");
				if (u.email.trim() && !EMAIL_REGEX.test(u.email.trim())) return t("customer.wizard.validation.emailInvalid");
				if (u.phoneNational.trim()) {
					const pr = composeInternationalPhone(u.phoneDialIso2, u.phoneNational).trim();
					if (pr.length > PHONE_MAX_LEN) return t("customer.wizard.validation.phoneTooLong");
					if (!PHONE_CHARS_REGEX.test(pr)) return t("customer.wizard.validation.phoneInvalid");
					if (countPhoneDigits(pr) < PHONE_MIN_DIGITS) return t("customer.wizard.validation.phoneDigitsTooFew");
				}
			}
		}
		if (s === 6) {
			if (!financial.annualRevenueBand) return t("customer.wizard.business.validation.revenueBandRequired");
			if (!financial.fundsSource.trim()) return t("customer.wizard.business.validation.fundsSourceRequired");
			if (!financial.accountOpeningPurpose.trim()) return t("customer.wizard.business.validation.openingPurposeRequired");
		}
		if (s === 7) {
			if (!identityDocumentNumber.trim()) return t("customer.wizard.validation.identityDocumentNumberRequired");
			if (identityDocumentNumber.trim().length > IDENTITY_DOC_NUMBER_MAX) {
				return t("customer.wizard.validation.identityDocumentNumberTooLong");
			}
			const issueCc = identityIssuingCountry.trim().toUpperCase().slice(0, 2);
			if (!/^[A-Z]{2}$/.test(issueCc) || !nationalityOptions.some(o => o.code === issueCc)) {
				return t("customer.wizard.validation.identityIssuingCountryRequired");
			}
			if (!identityDocumentExpiresOn.trim()) return t("customer.wizard.validation.identityDocumentExpiresRequired");
			if (!parseIsoLocalDate(identityDocumentExpiresOn)) {
				return t("customer.wizard.validation.identityDocumentExpiresInvalid");
			}
			if (!isIsoDateStrictlyFuture(identityDocumentExpiresOn)) {
				return t("customer.wizard.validation.identityDocumentExpiresPast");
			}
			if (!isIsoDateAtLeastDaysAhead(identityDocumentExpiresOn, MIN_ID_VALIDITY_DAYS)) {
				return t("customer.wizard.validation.identityDocumentExpiresTooSoon");
			}
			const tooLarge = (f: File | null) => f != null && !isFileSizeOk(f, MAX_UPLOAD_BYTES);
			if (!statutesFile) return t("customer.wizard.business.validation.statutesRequired");
			if (tooLarge(statutesFile) || tooLarge(kbisFile) || tooLarge(poaFile)) {
				return t("customer.wizard.validation.uploadFileTooLarge");
			}
			if (!poaFile) return t("customer.wizard.validation.proofOfAddressFileRequired");
			if (!isImageOrPdfFile(poaFile)) return t("customer.wizard.validation.proofOfAddressFileTypeInvalid");
			if (idDocType === "ID_CARD") {
				if (!idRectoFile || !isImageFile(idRectoFile)) return t("customer.wizard.validation.idRectoRequired");
				if (tooLarge(idRectoFile) || tooLarge(idVersoFile)) return t("customer.wizard.validation.uploadFileTooLarge");
				if (idVersoFile && !isImageFile(idVersoFile)) return t("customer.wizard.validation.idCardImageRequired");
			} else {
				if (!passportFile) return t("customer.wizard.validation.passportFileRequired");
				if (!isImageOrPdfFile(passportFile)) return t("customer.wizard.validation.passportFileTypeInvalid");
				if (tooLarge(passportFile)) return t("customer.wizard.validation.uploadFileTooLarge");
			}
		}
		return null;
	}

	function validateAllBusiness(): string | null {
		for (let s = 0; s <= 7; s++) {
			const err = validateStep(s);
			if (err) return err;
		}
		return null;
	}

	async function validateContactUniquenessBeforeSubmit(): Promise<string | null> {
		const uniqueness = await customersApi.checkContactUniqueness({
			email: contact.email.trim(),
			phone: composeInternationalPhone(contact.phoneDialIso2, contact.phoneNational).trim()
		});
		if (!uniqueness.emailUnique && !uniqueness.phoneUnique) {
			return t("customer.wizard.validation.emailAndPhoneAlreadyExists");
		}
		if (!uniqueness.emailUnique) {
			return t("customer.wizard.validation.emailAlreadyExists");
		}
		if (!uniqueness.phoneUnique) {
			return t("customer.wizard.validation.phoneAlreadyExists");
		}
		return null;
	}

	function directorToPayload(d: DirectorRow): AddRelatedPersonRequest {
		return {
			role: "DIRECTOR",
			firstName: d.firstName.trim(),
			lastName: d.lastName.trim(),
			dateOfBirth: d.dateOfBirth || undefined,
			nationalId: d.nationalId.trim(),
			pepFlag: d.pepFlag
		};
	}

	function uboToPayload(u: UboRow): AddRelatedPersonRequest {
		const pct = Number(u.ownershipPercent);
		return {
			role: "UBO",
			firstName: u.firstName.trim(),
			lastName: u.lastName.trim(),
			dateOfBirth: u.dateOfBirth || undefined,
			nationalId: u.nationalId.trim(),
			ownershipPercent: pct,
			pepFlag: u.pepFlag,
			nationality: u.nationality.trim().toUpperCase().slice(0, 2),
			residenceLine1: u.residenceLine1.trim(),
			residenceCity: u.residenceCity.trim(),
			residencePostalCode: u.residencePostalCode.trim() || undefined,
			residenceCountry: u.residenceCountry.trim().toUpperCase().slice(0, 2),
			email: u.email.trim() || undefined,
			phone: composeInternationalPhone(u.phoneDialIso2, u.phoneNational).trim() || undefined
		};
	}

	async function submitAll(): Promise<number> {
		const createPayload: CreateCustomerRequest = {
			type: "BUSINESS",
			displayName: entity.displayName.trim(),
			email: contact.email.trim(),
			phone: composeInternationalPhone(contact.phoneDialIso2, contact.phoneNational).trim()
		};
		const created = await customersApi.create(createPayload);
		const id = created.id;

		const websiteNorm = contact.website.trim();
		const websiteUrl =
			!websiteNorm
				? null
				: /^https?:\/\//i.test(websiteNorm)
					? websiteNorm
					: `https://${websiteNorm}`;

		const emp = financial.employeeCount.trim();
		const parsedEmployees = emp === "" ? null : Number(emp);
		const employeeCount =
			parsedEmployees !== null && Number.isFinite(parsedEmployees) && parsedEmployees >= 0
				? Math.trunc(parsedEmployees)
				: null;
		const updatePayload: UpdateCustomerRequest = {
			tradeName: entity.tradeName.trim() || null,
			legalForm: entity.legalForm.trim(),
			registrationNumber: entity.registrationNumber.trim(),
			incorporationDate: entity.incorporationDate || null,
			incorporationCountry: entity.incorporationCountry.trim().toUpperCase().slice(0, 2),
			taxResidenceCountry: entity.taxResidenceCountry.trim().toUpperCase().slice(0, 2),
			taxIdentificationNumber: entity.taxIdentificationNumber.trim() ? entity.taxIdentificationNumber.trim() : null,
			activityCategory: entity.activityCategory.trim(),
			activityDescription: entity.activityDescription.trim(),
			signingAuthorityNote: entity.signingAuthorityNote.trim() || null,
			websiteUrl,
			employeeCount,
			annualRevenueBand: financial.annualRevenueBand,
			currenciesUsed: financial.currenciesUsed.trim() || null,
			expectedTransactionProfile: financial.expectedTransactionProfile.trim() || null,
			fundsSource: financial.fundsSource.trim(),
			accountOpeningPurpose: financial.accountOpeningPurpose.trim()
		};
		await customersApi.update(id, updatePayload);

		await customersApi.addAddress(id, {
			type: "BUSINESS",
			line1: seat.line1.trim(),
			line2: seat.line2?.trim() || undefined,
			city: seat.city.trim(),
			state: seat.state?.trim() || undefined,
			postalCode: seat.postalCode?.trim() || undefined,
			country: seat.country.trim().toUpperCase().slice(0, 2),
			primaryAddress: true
		});

		if (mailingDifferent) {
			await customersApi.addAddress(id, {
				type: "MAILING",
				line1: mailing.line1.trim(),
				line2: mailing.line2?.trim() || undefined,
				city: mailing.city.trim(),
				state: mailing.state?.trim() || undefined,
				postalCode: mailing.postalCode?.trim() || undefined,
				country: mailing.country.trim().toUpperCase().slice(0, 2),
				primaryAddress: false
			});
		}

		for (const d of directors) {
			await customersApi.addRelatedPerson(id, directorToPayload(d));
		}
		for (const u of ubos) {
			await customersApi.addRelatedPerson(id, uboToPayload(u));
		}

		await customersApi.uploadDocument(id, "REGISTRATION_DOC", statutesFile!);
		if (kbisFile) {
			await customersApi.uploadDocument(id, "REGISTRATION_DOC", kbisFile);
		}
		await customersApi.uploadDocument(id, "PROOF_OF_ADDRESS", poaFile!);

		const idMeta = {
			identityDocumentNumber: identityDocumentNumber.trim(),
			identityDocumentExpiresOn: identityDocumentExpiresOn.trim()
		};
		if (idDocType === "ID_CARD") {
			await customersApi.uploadDocument(id, "ID_CARD", idRectoFile!, { idCardSide: "RECTO", ...idMeta });
			if (idVersoFile) {
				await customersApi.uploadDocument(id, "ID_CARD", idVersoFile, { idCardSide: "VERSO", ...idMeta });
			}
		} else {
			await customersApi.uploadDocument(id, "PASSPORT", passportFile!, idMeta);
		}

		return id;
	}

	async function goNext() {
		setError(null);
		if (step < RECAP_STEP) {
			const err = validateStep(step);
			if (err) {
				setError(err);
				return;
			}
			setStep(s => s + 1);
			return;
		}
		const errAgg = validateAllBusiness();
		if (errAgg) {
			setError(errAgg);
			return;
		}
		if (precheck.loading || precheck.contact !== true || precheck.doc !== true) {
			setError(t("customer.wizard.precheck.nogoBanner"));
			return;
		}
		setSubmitting(true);
		try {
			const uniquenessError = await validateContactUniquenessBeforeSubmit();
			if (uniquenessError) {
				setError(uniquenessError);
				return;
			}
			const docRes = await customersApi.checkIdentityDocumentUniqueness({
				documentType: idDocType,
				documentNumber: identityDocumentNumber.trim(),
				issuingCountry: identityIssuingCountry.trim().toUpperCase().slice(0, 2)
			});
			if (!docRes.unique) {
				setError(t("customer.wizard.validation.identityDocumentDuplicate"));
				await runRecapPrecheck();
				return;
			}
			const newId = await submitAll();
			let geo: KycGeographyRiskResponse | null = null;
			let risk: KycOnboardingRiskAssessmentResponse | null = null;
			try {
				[geo, risk] = await Promise.all([
					customersApi.getKycGeographyRisk(newId),
					customersApi.getKycRiskAssessment(newId, {})
				]);
			} catch {
				geo = null;
				risk = null;
			}
			setKycOutcome({ geo, risk });
			setCreatedCustomerId(newId);
			setWizardSuccess(true);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : t("customer.wizard.validation.genericError"));
		} finally {
			setSubmitting(false);
		}
	}

	function goPrev() {
		setError(null);
		if (step <= 0) return;
		setStep(s => s - 1);
	}

	function idDocLabel(v: "ID_CARD" | "PASSPORT"): string {
		return v === "PASSPORT" ? t("customer.wizard.documents.passport") : t("customer.wizard.documents.idCardShort");
	}

	function PrecheckRow({ label, state }: { label: string; state: boolean | null }) {
		const loading = precheck.loading;
		let tone = "border-slate-200 bg-white text-slate-600";
		let badge = t("customer.wizard.precheck.pending");
		if (loading) {
			badge = t("customer.wizard.precheck.pending");
		} else if (state === true) {
			tone = "border-emerald-200 bg-emerald-50/90 text-emerald-900";
			badge = t("customer.wizard.precheck.ok");
		} else if (state === false) {
			tone = "border-rose-200 bg-rose-50/90 text-rose-900";
			badge = t("customer.wizard.precheck.fail");
		}
		return (
			<div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm shadow-sm ring-1 ring-slate-900/[0.03] ${tone}`}>
				<span className="font-medium">{label}</span>
				<span className="tabular-nums font-semibold">{badge}</span>
			</div>
		);
	}

	function RecapRow({ label, value }: { label: string; value: string }) {
		return (
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 py-1.5 border-b border-gray-100 last:border-0 text-sm">
				<dt className="text-gray-500 font-medium">{label}</dt>
				<dd className="sm:col-span-2 text-gray-900 break-words">{value || t("customer.wizard.recap.notProvided")}</dd>
			</div>
		);
	}

	return (
		<OnboardingShell
			title={t("customer.wizard.business.title")}
			subtitle={t("customer.wizard.business.subtitle")}
			backHref="/customers"
			backLabel={t("customer.wizard.backToList")}
			steps={shellSteps}
			activeStepIndex={step}
		>
			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			{!wizardSuccess && step === 0 && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.business.entity.title")}</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.entity.displayName")} *</label>
							<Input value={entity.displayName} onChange={e => setEntity(x => ({ ...x, displayName: e.target.value }))} />
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.entity.tradeName")}</label>
							<Input value={entity.tradeName} onChange={e => setEntity(x => ({ ...x, tradeName: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.entity.legalForm")} *</label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-md"
								value={entity.legalForm}
								onChange={e => setEntity(x => ({ ...x, legalForm: e.target.value }))}
							>
								<option value="">{t("customer.wizard.business.entity.legalFormPlaceholder")}</option>
								{LEGAL_FORM_OPTIONS.map(f => (
									<option key={f} value={f}>
										{f}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.entity.registrationNumber")} *</label>
							<Input value={entity.registrationNumber} onChange={e => setEntity(x => ({ ...x, registrationNumber: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.entity.incorporationDate")} *</label>
							<Input type="date" value={entity.incorporationDate} onChange={e => setEntity(x => ({ ...x, incorporationDate: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.entity.incorporationCountry")} *</label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-md"
								value={entity.incorporationCountry}
								onChange={e => setEntity(x => ({ ...x, incorporationCountry: e.target.value }))}
							>
								{nationalityOptions.map(opt => (
									<option key={opt.code} value={opt.code}>
										{opt.label} ({opt.code})
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.business.entity.taxResidence")} *
							</label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-md"
								value={entity.taxResidenceCountry}
								onChange={e => setEntity(x => ({ ...x, taxResidenceCountry: e.target.value }))}
							>
								<option value="">{t("customer.wizard.profile.nationalityPlaceholder")}</option>
								{nationalityOptions.map(opt => (
									<option key={opt.code} value={opt.code}>
										{opt.label} ({opt.code})
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.entity.taxIdentification")}</label>
							<Input
								value={entity.taxIdentificationNumber}
								onChange={e => setEntity(x => ({ ...x, taxIdentificationNumber: e.target.value }))}
								maxLength={64}
							/>
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.business.entity.activityCategory")} *
							</label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-md"
								value={entity.activityCategory}
								onChange={e => setEntity(x => ({ ...x, activityCategory: e.target.value }))}
							>
								<option value="">{t("customer.wizard.business.entity.activityCategoryPlaceholder")}</option>
								{BUSINESS_ACTIVITY_CATEGORY_VALUES.map(code => (
									<option key={code} value={code}>
										{t(`customer.detail.businessActivityCategories.${code}`)}
									</option>
								))}
							</select>
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.entity.activityDescription")} *</label>
							<textarea
								className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[88px]"
								value={entity.activityDescription}
								onChange={e => setEntity(x => ({ ...x, activityDescription: e.target.value }))}
								maxLength={1000}
							/>
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.entity.signingAuthority")}</label>
							<textarea
								className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[72px]"
								value={entity.signingAuthorityNote}
								onChange={e => setEntity(x => ({ ...x, signingAuthorityNote: e.target.value }))}
								maxLength={4000}
							/>
						</div>
					</div>
				</div>
			)}

			{!wizardSuccess && step === 1 && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.business.seat.title")}</h2>
					<p className="text-sm text-gray-600">{t("customer.wizard.business.seat.intro")}</p>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.line1")} *</label>
						<Input value={seat.line1} onChange={e => setSeat(a => ({ ...a, line1: e.target.value }))} />
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.line2")}</label>
						<Input value={seat.line2 || ""} onChange={e => setSeat(a => ({ ...a, line2: e.target.value }))} />
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.city")} *</label>
							<Input value={seat.city} onChange={e => setSeat(a => ({ ...a, city: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.postalCode")} *</label>
							<Input value={seat.postalCode || ""} onChange={e => setSeat(a => ({ ...a, postalCode: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.state")}</label>
							<Input value={seat.state || ""} onChange={e => setSeat(a => ({ ...a, state: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.country")} *</label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-md"
								value={seat.country}
								onChange={e => setSeat(a => ({ ...a, country: e.target.value }))}
							>
								{nationalityOptions.map(opt => (
									<option key={opt.code} value={opt.code}>
										{opt.label} ({opt.code})
									</option>
								))}
							</select>
						</div>
					</div>
				</div>
			)}

			{!wizardSuccess && step === 2 && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.business.mailing.title")}</h2>
					<label className="flex items-center gap-2 text-sm text-gray-700">
						<input type="checkbox" checked={mailingDifferent} onChange={e => setMailingDifferent(e.target.checked)} />
						{t("customer.wizard.business.mailing.different")}
					</label>
					{mailingDifferent && (
						<div className="space-y-4 pt-2 border-t border-gray-100">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.line1")} *</label>
								<Input value={mailing.line1} onChange={e => setMailing(a => ({ ...a, line1: e.target.value }))} />
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.line2")}</label>
								<Input value={mailing.line2 || ""} onChange={e => setMailing(a => ({ ...a, line2: e.target.value }))} />
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.city")} *</label>
									<Input value={mailing.city} onChange={e => setMailing(a => ({ ...a, city: e.target.value }))} />
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.postalCode")} *</label>
									<Input value={mailing.postalCode || ""} onChange={e => setMailing(a => ({ ...a, postalCode: e.target.value }))} />
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.state")}</label>
									<Input value={mailing.state || ""} onChange={e => setMailing(a => ({ ...a, state: e.target.value }))} />
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.country")} *</label>
									<select
										className="w-full px-3 py-2 border border-gray-300 rounded-md"
										value={mailing.country}
										onChange={e => setMailing(a => ({ ...a, country: e.target.value }))}
									>
										{nationalityOptions.map(opt => (
											<option key={opt.code} value={opt.code}>
												{opt.label} ({opt.code})
											</option>
										))}
									</select>
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			{!wizardSuccess && step === 3 && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.business.contact.title")}</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.contact.email")} *</label>
							<Input type="email" value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))} />
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.contact.phone")} *</label>
							<div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
								<select
									className="w-full sm:w-[min(100%,280px)] shrink-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white text-sm"
									value={contact.phoneDialIso2}
									onChange={e => setContact(c => ({ ...c, phoneDialIso2: e.target.value.toUpperCase().slice(0, 2) }))}
									aria-label={t("customer.wizard.contact.phonePrefix")}
								>
									{phoneDialOptions.map(opt => (
										<option key={opt.iso2} value={opt.iso2}>
											{opt.label} (+{opt.dial})
										</option>
									))}
								</select>
								<Input
									type="tel"
									className="min-w-0 flex-1"
									value={contact.phoneNational}
									onChange={e => setContact(c => ({ ...c, phoneNational: e.target.value }))}
									placeholder={t("customer.wizard.contact.phoneNationalPlaceholder")}
									maxLength={PHONE_MAX_LEN}
								/>
							</div>
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.contact.website")}</label>
							<Input value={contact.website} onChange={e => setContact(c => ({ ...c, website: e.target.value }))} placeholder="https://…" />
						</div>
					</div>
				</div>
			)}

			{!wizardSuccess && step === 4 && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.business.directors.title")}</h2>
					<p className="text-sm text-gray-600">{t("customer.wizard.business.directors.intro")}</p>
					{directors.map((d, idx) => (
						<div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50">
							<div className="flex justify-between items-center">
								<span className="text-sm font-medium text-gray-700">{t("customer.wizard.business.directors.row", { n: idx + 1 })}</span>
								{directors.length > 1 && (
									<button type="button" className="text-sm text-red-600 hover:underline" onClick={() => setDirectors(rows => rows.filter((_, i) => i !== idx))}>
										{t("customer.wizard.business.directors.remove")}
									</button>
								)}
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.ubo.firstName")} *</label>
									<Input value={d.firstName} onChange={e => setDirectors(rows => rows.map((r, i) => (i === idx ? { ...r, firstName: e.target.value } : r)))} />
								</div>
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.ubo.lastName")} *</label>
									<Input value={d.lastName} onChange={e => setDirectors(rows => rows.map((r, i) => (i === idx ? { ...r, lastName: e.target.value } : r)))} />
								</div>
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.ubo.dateOfBirth")} *</label>
									<Input type="date" value={d.dateOfBirth} onChange={e => setDirectors(rows => rows.map((r, i) => (i === idx ? { ...r, dateOfBirth: e.target.value } : r)))} />
								</div>
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.ubo.nationalId")} *</label>
									<Input value={d.nationalId} onChange={e => setDirectors(rows => rows.map((r, i) => (i === idx ? { ...r, nationalId: e.target.value } : r)))} />
								</div>
							</div>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" checked={d.pepFlag} onChange={e => setDirectors(rows => rows.map((r, i) => (i === idx ? { ...r, pepFlag: e.target.checked } : r)))} />
								{t("customer.wizard.ubo.pep")}
							</label>
						</div>
					))}
					<Button type="button" variant="outline" size="sm" onClick={() => setDirectors(rows => [...rows, emptyDirector()])}>
						{t("customer.wizard.business.directors.add")}
					</Button>
				</div>
			)}

			{!wizardSuccess && step === 5 && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.business.ubos.title")}</h2>
					<p className="text-sm text-gray-600">{t("customer.wizard.business.ubos.intro")}</p>
					{ubos.map((u, idx) => (
						<div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50">
							<div className="flex justify-between items-center">
								<span className="text-sm font-medium text-gray-700">{t("customer.wizard.business.ubos.row", { n: idx + 1 })}</span>
								{ubos.length > 1 && (
									<button type="button" className="text-sm text-red-600 hover:underline" onClick={() => setUbos(rows => rows.filter((_, i) => i !== idx))}>
										{t("customer.wizard.business.ubos.remove")}
									</button>
								)}
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.ubo.firstName")} *</label>
									<Input value={u.firstName} onChange={e => setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, firstName: e.target.value } : r)))} />
								</div>
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.ubo.lastName")} *</label>
									<Input value={u.lastName} onChange={e => setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, lastName: e.target.value } : r)))} />
								</div>
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.ubo.dateOfBirth")} *</label>
									<Input type="date" value={u.dateOfBirth} onChange={e => setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, dateOfBirth: e.target.value } : r)))} />
								</div>
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.ubo.nationalId")} *</label>
									<Input value={u.nationalId} onChange={e => setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, nationalId: e.target.value } : r)))} />
								</div>
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.ubo.ownershipPercent")} *</label>
									<Input type="number" min={0} max={100} step={0.01} value={u.ownershipPercent} onChange={e => setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, ownershipPercent: e.target.value } : r)))} />
								</div>
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.profile.nationality")} *</label>
									<select
										className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
										value={u.nationality}
										onChange={e => setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, nationality: e.target.value } : r)))}
									>
										<option value="">{t("customer.wizard.profile.nationalityPlaceholder")}</option>
										{nationalityOptions.map(opt => (
											<option key={opt.code} value={opt.code}>
												{opt.label}
											</option>
										))}
									</select>
								</div>
								<div className="md:col-span-2">
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.business.ubos.residenceLine1")} *</label>
									<Input value={u.residenceLine1} onChange={e => setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, residenceLine1: e.target.value } : r)))} />
								</div>
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.address.city")} *</label>
									<Input value={u.residenceCity} onChange={e => setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, residenceCity: e.target.value } : r)))} />
								</div>
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.address.postalCode")}</label>
									<Input value={u.residencePostalCode} onChange={e => setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, residencePostalCode: e.target.value } : r)))} />
								</div>
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.business.ubos.residenceCountry")} *</label>
									<select
										className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
										value={u.residenceCountry}
										onChange={e => setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, residenceCountry: e.target.value } : r)))}
									>
										{nationalityOptions.map(opt => (
											<option key={opt.code} value={opt.code}>
												{opt.label}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.contact.email")}</label>
									<Input type="email" value={u.email} onChange={e => setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, email: e.target.value } : r)))} />
								</div>
								<div className="md:col-span-2">
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.contact.phone")}</label>
									<div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
										<select
											className="w-full sm:w-[min(100%,220px)] shrink-0 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
											value={u.phoneDialIso2}
											onChange={e =>
												setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, phoneDialIso2: e.target.value.toUpperCase().slice(0, 2) } : r)))
											}
											aria-label={t("customer.wizard.contact.phonePrefix")}
										>
											{phoneDialOptions.map(opt => (
												<option key={opt.iso2} value={opt.iso2}>
													{opt.label} (+{opt.dial})
												</option>
											))}
										</select>
										<Input
											type="tel"
											className="min-w-0 flex-1 text-sm"
											value={u.phoneNational}
											onChange={e => setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, phoneNational: e.target.value } : r)))}
											placeholder={t("customer.wizard.contact.phoneNationalPlaceholder")}
											maxLength={PHONE_MAX_LEN}
										/>
									</div>
								</div>
							</div>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" checked={u.pepFlag} onChange={e => setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, pepFlag: e.target.checked } : r)))} />
								{t("customer.wizard.ubo.pep")}
							</label>
						</div>
					))}
					<Button type="button" variant="outline" size="sm" onClick={() => setUbos(rows => [...rows, emptyUbo()])}>
						{t("customer.wizard.business.ubos.add")}
					</Button>
				</div>
			)}

			{!wizardSuccess && step === 6 && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.business.financial.title")}</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.financial.employeeCount")}</label>
							<Input type="number" min={0} value={financial.employeeCount} onChange={e => setFinancial(f => ({ ...f, employeeCount: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.financial.revenueBand")} *</label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-md"
								value={financial.annualRevenueBand}
								onChange={e => setFinancial(f => ({ ...f, annualRevenueBand: e.target.value }))}
							>
								<option value="">{t("customer.wizard.business.financial.revenueBandPlaceholder")}</option>
								{ANNUAL_REVENUE_BAND_OPTIONS.map(o => (
									<option key={o.value} value={o.value}>
										{t(`customer.wizard.business.financial.revenueBands.${o.value}`)}
									</option>
								))}
							</select>
						</div>
						<div className="md:col-span-2">
							<fieldset>
								<legend className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.financial.currencies")}</legend>
								<div className="flex flex-wrap gap-x-5 gap-y-2">
									{BUSINESS_CURRENCY_OPTIONS.map(code => {
										const selected = parseBusinessCurrencySet(financial.currenciesUsed || "").has(code);
										return (
											<label key={code} className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-800">
												<input type="checkbox" checked={selected} onChange={() => toggleBusinessCurrency(code)} />
												<span className="font-medium tabular-nums">{code}</span>
											</label>
										);
									})}
								</div>
							</fieldset>
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.financial.transactionProfile")}</label>
							<textarea className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[72px]" value={financial.expectedTransactionProfile} onChange={e => setFinancial(f => ({ ...f, expectedTransactionProfile: e.target.value }))} maxLength={1000} />
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.financial.fundsSource")} *</label>
							<Input value={financial.fundsSource} onChange={e => setFinancial(f => ({ ...f, fundsSource: e.target.value }))} />
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.financial.openingPurpose")} *</label>
							<Input value={financial.accountOpeningPurpose} onChange={e => setFinancial(f => ({ ...f, accountOpeningPurpose: e.target.value }))} />
						</div>
					</div>
				</div>
			)}

			{!wizardSuccess && step === 7 && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.business.documents.title")}</h2>
					<p className="text-sm text-gray-600">{t("customer.wizard.documents.formatsHint")}</p>
					<p className="text-sm text-slate-600">{t("customer.wizard.business.documents.intro")}</p>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
							<div className="mb-3 flex items-start gap-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 ring-1 ring-blue-200/70">
									<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1.75}
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
								</div>
								<div className="min-w-0 flex-1">
									<h4 className="text-sm font-semibold tracking-tight text-slate-900">
										{t("customer.wizard.business.documents.statutes")} <span className="text-red-500">*</span>
									</h4>
									<p className="mt-1 text-xs leading-relaxed text-slate-600">{t("customer.wizard.business.documents.statutesCardHint")}</p>
								</div>
							</div>
							<label className="group flex cursor-pointer flex-col gap-2 rounded-xl border-2 border-dashed border-blue-200/90 bg-white/95 px-3 py-4 transition hover:border-blue-400 hover:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/25">
								<input
									type="file"
									accept="image/*,application/pdf"
									className="sr-only"
									onChange={e => setStatutesFile(e.target.files?.[0] ?? null)}
								/>
								<div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-3">
									<span className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition group-hover:bg-blue-700">
										{t("customer.wizard.documents.proofOfAddressDropHint")}
									</span>
									<span className="text-xs text-slate-500">{t("customer.wizard.documents.passportFormatsLine")}</span>
								</div>
								{statutesFile && (
									<div className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-900">
										<svg className="h-4 w-4 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
											<path
												fillRule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
												clipRule="evenodd"
											/>
										</svg>
										<span className="min-w-0 break-all font-medium">{statutesFile.name}</span>
									</div>
								)}
							</label>
						</div>
						<div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
							<div className="mb-3 flex items-start gap-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">
									<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1.75}
											d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
										/>
									</svg>
								</div>
								<div className="min-w-0 flex-1">
									<h4 className="text-sm font-semibold tracking-tight text-slate-900">{t("customer.wizard.business.documents.kbisOptional")}</h4>
									<p className="mt-1 text-xs leading-relaxed text-slate-600">{t("customer.wizard.business.documents.kbisCardHint")}</p>
								</div>
							</div>
							<label className="group flex cursor-pointer flex-col gap-2 rounded-xl border-2 border-dashed border-slate-200/95 bg-white/95 px-3 py-4 transition hover:border-slate-400 hover:bg-white focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-400/25">
								<input
									type="file"
									accept="image/*,application/pdf"
									className="sr-only"
									onChange={e => setKbisFile(e.target.files?.[0] ?? null)}
								/>
								<div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-3">
									<span className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-700 px-4 text-sm font-medium text-white shadow-sm transition group-hover:bg-slate-800">
										{t("customer.wizard.documents.proofOfAddressDropHint")}
									</span>
									<span className="text-xs text-slate-500">{t("customer.wizard.documents.passportFormatsLine")}</span>
								</div>
								{kbisFile && (
									<div className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-900">
										<svg className="h-4 w-4 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
											<path
												fillRule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
												clipRule="evenodd"
											/>
										</svg>
										<span className="min-w-0 break-all font-medium">{kbisFile.name}</span>
									</div>
								)}
							</label>
						</div>
					</div>
					<div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
						<div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-200/30 blur-2xl" aria-hidden />
						<div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
							<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 shadow-inner ring-1 ring-indigo-200/60">
								<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.75}
										d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
									/>
								</svg>
							</div>
							<div className="min-w-0 flex-1 space-y-4">
								<div>
									<div className="flex flex-wrap items-center gap-2">
										<h3 className="text-base font-semibold tracking-tight text-slate-900">{t("customer.wizard.business.documents.proofOfSeat")}</h3>
										<span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-rose-700 ring-1 ring-rose-200/70">
											*
										</span>
									</div>
									<p className="mt-2 text-sm leading-relaxed text-slate-600">{t("customer.wizard.documents.proofOfAddressCardHint")}</p>
								</div>
								<label className="group flex cursor-pointer flex-col gap-3 rounded-xl border-2 border-dashed border-indigo-200/90 bg-white/90 px-4 py-5 transition hover:border-indigo-400/90 hover:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
									<input
										type="file"
										accept="image/*,application/pdf"
										className="sr-only"
										onChange={e => setPoaFile(e.target.files?.[0] ?? null)}
									/>
									<div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
										<span className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition group-hover:bg-indigo-700">
											{t("customer.wizard.documents.proofOfAddressDropHint")}
										</span>
										<span className="text-xs text-slate-500">{t("customer.wizard.documents.proofOfAddressFormatsLine")}</span>
									</div>
									{poaFile && (
										<div className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900">
											<svg className="h-4 w-4 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
												<path
													fillRule="evenodd"
													d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
													clipRule="evenodd"
												/>
											</svg>
											<span className="min-w-0 break-all">
												<span className="font-medium">{t("customer.wizard.documents.proofOfAddressFileSelected")} : </span>
												{poaFile.name}
											</span>
										</div>
									)}
								</label>
							</div>
						</div>
					</div>
					<div className="mt-2 border-t border-gray-100 pt-6 space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.business.documents.repId")} <span className="text-red-500">*</span>
							</label>
							<div className="flex flex-wrap gap-3 mb-3">
								<label className="flex items-center gap-2 text-sm">
									<input
										type="radio"
										name="bizIdDocType"
										checked={idDocType === "ID_CARD"}
										onChange={() => {
											setIdDocType("ID_CARD");
											setPassportFile(null);
										}}
									/>
									{t("customer.wizard.documents.idCard")}
								</label>
								<label className="flex items-center gap-2 text-sm">
									<input
										type="radio"
										name="bizIdDocType"
										checked={idDocType === "PASSPORT"}
										onChange={() => {
											setIdDocType("PASSPORT");
											setIdRectoFile(null);
											setIdVersoFile(null);
										}}
									/>
									{t("customer.wizard.documents.passport")}
								</label>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										{t("customer.wizard.documents.identityNumber")} <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
										value={identityDocumentNumber}
										onChange={e => setIdentityDocumentNumber(e.target.value)}
										maxLength={IDENTITY_DOC_NUMBER_MAX}
										autoComplete="off"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										{t("customer.wizard.documents.identityExpires")} <span className="text-red-500">*</span>
									</label>
									<input
										type="date"
										className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
										value={identityDocumentExpiresOn}
										onChange={e => setIdentityDocumentExpiresOn(e.target.value)}
									/>
								</div>
							</div>
							<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
								<div className="min-w-0 grow sm:max-w-md">
									<label className="mb-1 block text-sm font-medium text-gray-700">
										{t("customer.wizard.documents.identityIssuingCountryLabel")} <span className="text-red-500">*</span>
									</label>
									<select
										className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-400/35 focus:border-slate-500 focus:ring-2"
										value={identityIssuingCountry}
										onChange={e => setIdentityIssuingCountry(e.target.value)}
									>
										<option value="">{t("customer.wizard.profile.selectFromList")}</option>
										{nationalityOptions.map(o => (
											<option key={o.code} value={o.code}>
												{o.label}
											</option>
										))}
									</select>
									<p className="mt-1 text-xs text-slate-500">{t("customer.wizard.documents.identityIssuingCountryHint")}</p>
								</div>
								<Button
									type="button"
									variant="outline"
									className="shrink-0 text-sm"
									onClick={() => {
										const n = entity.taxResidenceCountry.trim().toUpperCase().slice(0, 2);
										if (/^[A-Z]{2}$/.test(n)) setIdentityIssuingCountry(n);
									}}
								>
									{t("customer.wizard.business.documents.identityIssuingSameAsTaxResidence")}
								</Button>
							</div>
							{idDocType === "ID_CARD" ? (
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
										<div className="mb-3 flex items-start gap-3">
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 ring-1 ring-blue-200/70">
												<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={1.75}
														d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
													/>
												</svg>
											</div>
											<div className="min-w-0 flex-1">
												<h4 className="text-sm font-semibold tracking-tight text-slate-900">
													{t("customer.wizard.documents.idRecto")} <span className="text-red-500">*</span>
												</h4>
												<p className="mt-1 text-xs leading-relaxed text-slate-600">{t("customer.wizard.documents.idRectoSub")}</p>
											</div>
										</div>
										<label className="group flex cursor-pointer flex-col gap-2 rounded-xl border-2 border-dashed border-blue-200/90 bg-white/95 px-3 py-4 transition hover:border-blue-400 hover:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/25">
											<input type="file" accept="image/*" className="sr-only" onChange={e => setIdRectoFile(e.target.files?.[0] ?? null)} />
											<div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-3">
												<span className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition group-hover:bg-blue-700">
													{t("customer.wizard.documents.proofOfAddressDropHint")}
												</span>
												<span className="text-xs text-slate-500">{t("customer.wizard.documents.idPhotoFormatsLine")}</span>
											</div>
											{idRectoFile && (
												<div className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-900">
													<svg className="h-4 w-4 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
														<path
															fillRule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
															clipRule="evenodd"
														/>
													</svg>
													<span className="min-w-0 break-all font-medium">{idRectoFile.name}</span>
												</div>
											)}
										</label>
									</div>
									<div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
										<div className="mb-3 flex items-start gap-3">
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">
												<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={1.75}
														d="M4 7v10c0 1.1.9 2 2 2h12a2 2 0 002-2V7M4 7l2-3h12l2 3M4 7h16"
													/>
												</svg>
											</div>
											<div className="min-w-0 flex-1">
												<h4 className="text-sm font-semibold tracking-tight text-slate-900">{t("customer.wizard.documents.idVerso")}</h4>
												<p className="mt-1 text-xs leading-relaxed text-slate-600">{t("customer.wizard.documents.idVersoSub")}</p>
											</div>
										</div>
										<label className="group flex cursor-pointer flex-col gap-2 rounded-xl border-2 border-dashed border-slate-200/95 bg-white/95 px-3 py-4 transition hover:border-slate-400 hover:bg-white focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-400/25">
											<input type="file" accept="image/*" className="sr-only" onChange={e => setIdVersoFile(e.target.files?.[0] ?? null)} />
											<div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-3">
												<span className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-700 px-4 text-sm font-medium text-white shadow-sm transition group-hover:bg-slate-800">
													{t("customer.wizard.documents.proofOfAddressDropHint")}
												</span>
												<span className="text-xs text-slate-500">{t("customer.wizard.documents.idPhotoFormatsLine")}</span>
											</div>
											{idVersoFile && (
												<div className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-900">
													<svg className="h-4 w-4 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
														<path
															fillRule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
															clipRule="evenodd"
														/>
													</svg>
													<span className="min-w-0 break-all font-medium">{idVersoFile.name}</span>
												</div>
											)}
										</label>
									</div>
								</div>
							) : (
								<div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
									<div className="mb-3 flex items-start gap-3">
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 ring-1 ring-blue-200/70">
											<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={1.75}
													d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
												/>
											</svg>
										</div>
										<div className="min-w-0 flex-1">
											<h4 className="text-sm font-semibold tracking-tight text-slate-900">
												{t("customer.wizard.documents.passportScan")} <span className="text-red-500">*</span>
											</h4>
											<p className="mt-1 text-xs leading-relaxed text-slate-600">{t("customer.wizard.documents.passportScanSub")}</p>
										</div>
									</div>
									<label className="group flex cursor-pointer flex-col gap-2 rounded-xl border-2 border-dashed border-blue-200/90 bg-white/95 px-3 py-4 transition hover:border-blue-400 hover:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/25">
										<input
											type="file"
											accept="image/*,application/pdf"
											className="sr-only"
											onChange={e => setPassportFile(e.target.files?.[0] ?? null)}
										/>
										<div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-3">
											<span className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition group-hover:bg-blue-700">
												{t("customer.wizard.documents.proofOfAddressDropHint")}
											</span>
											<span className="text-xs text-slate-500">{t("customer.wizard.documents.passportFormatsLine")}</span>
										</div>
										{passportFile && (
											<div className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-900">
												<svg className="h-4 w-4 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
													<path
														fillRule="evenodd"
														d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
														clipRule="evenodd"
													/>
												</svg>
												<span className="min-w-0 break-all font-medium">{passportFile.name}</span>
											</div>
										)}
									</label>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{!wizardSuccess && step === RECAP_STEP && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-6">
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.recap.title")}</h2>
					<section>
						<h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-2">{t("customer.wizard.business.recap.entity")}</h3>
						<dl className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
							<RecapRow label={t("customer.wizard.business.entity.displayName")} value={entity.displayName} />
							<RecapRow label={t("customer.wizard.business.entity.tradeName")} value={entity.tradeName} />
							<RecapRow label={t("customer.wizard.business.entity.legalForm")} value={entity.legalForm} />
							<RecapRow label={t("customer.wizard.business.entity.registrationNumber")} value={entity.registrationNumber} />
							<RecapRow label={t("customer.wizard.business.entity.incorporationDate")} value={entity.incorporationDate} />
							<RecapRow
								label={t("customer.wizard.business.entity.incorporationCountry")}
								value={formatNationalityLabel(entity.incorporationCountry, i18n.language)}
							/>
							<RecapRow
								label={t("customer.wizard.business.entity.taxResidence")}
								value={formatNationalityLabel(entity.taxResidenceCountry, i18n.language)}
							/>
							<RecapRow label={t("customer.wizard.business.entity.taxIdentification")} value={entity.taxIdentificationNumber.trim() || "—"} />
							<RecapRow
								label={t("customer.wizard.business.entity.activityCategory")}
								value={
									entity.activityCategory
										? t(`customer.detail.businessActivityCategories.${entity.activityCategory}`)
										: ""
								}
							/>
							<RecapRow label={t("customer.wizard.business.entity.activityDescription")} value={entity.activityDescription} />
						</dl>
					</section>
					<section>
						<h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-2">{t("customer.wizard.recap.sectionContact")}</h3>
						<dl className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
							<RecapRow label={t("customer.wizard.recap.email")} value={contact.email} />
							<RecapRow
								label={t("customer.wizard.recap.phone")}
								value={composeInternationalPhone(contact.phoneDialIso2, contact.phoneNational).trim()}
							/>
							<RecapRow label={t("customer.wizard.business.contact.website")} value={contact.website} />
						</dl>
					</section>
					<section>
						<h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-2">{t("customer.wizard.recap.sectionDocuments")}</h3>
						<dl className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
							<RecapRow label={t("customer.wizard.business.documents.statutes")} value={statutesFile?.name ?? ""} />
							<RecapRow label={t("customer.wizard.business.documents.kbisOptional")} value={kbisFile?.name ?? ""} />
							<RecapRow label={t("customer.wizard.business.documents.proofOfSeat")} value={poaFile?.name ?? ""} />
							<RecapRow label={t("customer.wizard.recap.idDocumentType")} value={idDocLabel(idDocType)} />
							<RecapRow label={t("customer.wizard.recap.identityDocumentNumber")} value={identityDocumentNumber.trim()} />
							<RecapRow
								label={t("customer.wizard.documents.identityIssuingCountryLabel")}
								value={formatNationalityLabel(identityIssuingCountry, i18n.language)}
							/>
							<RecapRow label={t("customer.wizard.recap.identityDocumentExpiresOn")} value={identityDocumentExpiresOn.trim()} />
						</dl>
					</section>

					<section className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="min-w-0">
								<h3 className="text-sm font-semibold tracking-tight text-slate-900">{t("customer.wizard.precheck.title")}</h3>
								<p className="mt-1 text-xs leading-relaxed text-slate-600">{t("customer.wizard.precheck.subtitle")}</p>
							</div>
							<Button type="button" variant="outline" size="sm" disabled={precheck.loading} onClick={() => void runRecapPrecheck()}>
								{t("common.refresh")}
							</Button>
						</div>
						<p className="mt-3 text-xs text-slate-500">{t("customer.wizard.precheck.retryHint")}</p>
						<div className="mt-4 grid gap-2 sm:grid-cols-2">
							<PrecheckRow label={t("customer.wizard.precheck.contact")} state={precheck.contact} />
							<PrecheckRow label={t("customer.wizard.precheck.doc")} state={precheck.doc} />
						</div>
						{precheck.loading ? (
							<p className="mt-3 text-xs text-slate-500">{t("customer.wizard.precheck.pending")}</p>
						) : null}
					</section>
				</div>
			)}

			{wizardSuccess && createdCustomerId != null && (
				<div className="space-y-6">
					<div className="rounded-2xl border border-slate-200/90 bg-white p-6 text-center shadow-sm ring-1 ring-slate-900/[0.04]">
						<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
							<svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<h2 className="mt-4 text-xl font-semibold text-slate-900">{t("customer.wizard.complete.title")}</h2>
						<p className="mt-2 text-sm text-slate-600">{t("customer.wizard.complete.message")}</p>
						<div className="mt-6 flex flex-wrap justify-center gap-3">
							<Button type="button" onClick={() => router.push(customerDetailPath(createdCustomerId, "BUSINESS"))}>
								{t("customer.wizard.complete.openRecord")}
							</Button>
							<Button type="button" variant="outline" onClick={() => router.push("/customers")}>
								{t("customer.wizard.complete.backToList")}
							</Button>
						</div>
					</div>

					{kycOutcome && (kycOutcome.geo || kycOutcome.risk) ? (
						<div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-left shadow-sm">
							<h3 className="text-sm font-semibold text-slate-900">{t("customer.wizard.kycPreview.title")}</h3>
							<div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
								{kycOutcome.geo ? (
									<div className="rounded-xl border border-white bg-white px-4 py-3 shadow-sm">
										<div className="text-xs font-medium uppercase tracking-wide text-slate-500">
											{t("customer.wizard.kycPreview.geographyRisk")}
										</div>
										<div className="mt-1 tabular-nums text-slate-900">
											{t("customer.wizard.kycPreview.points")}: {kycOutcome.geo.geographyRiskPoints ?? "—"}
										</div>
									</div>
								) : null}
								{kycOutcome.risk ? (
									<div className="rounded-xl border border-white bg-white px-4 py-3 shadow-sm sm:col-span-2">
										<div className="flex flex-wrap items-center gap-2">
											<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
												{t("customer.wizard.kycPreview.decision")}
											</span>
											<span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
												{kycOutcome.risk.riskBand ?? "—"}
											</span>
											{kycOutcome.risk.decision ? (
												<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-800">{kycOutcome.risk.decision}</span>
											) : null}
										</div>
										<p className="mt-2 text-xs text-slate-600 tabular-nums">
											{t("customer.wizard.kycPreview.proposedScore")}: {kycOutcome.risk.proposedRiskScore ?? "—"}
										</p>
										{kycOutcome.risk.blocked ? (
											<p className="mt-3 text-xs font-medium text-amber-900">{t("customer.wizard.kycPreview.blockedWarn")}</p>
										) : null}
									</div>
								) : null}
							</div>
						</div>
					) : null}
				</div>
			)}

			{!wizardSuccess && (
				<div className="flex flex-wrap gap-3 items-center justify-between pt-2">
					<div className="flex gap-2">
						{step > 0 && (
							<Button type="button" variant="outline" onClick={goPrev} disabled={submitting}>
								{t("customer.wizard.nav.previous")}
							</Button>
						)}
						<Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
							{t("customer.wizard.nav.cancel")}
						</Button>
					</div>
					<Button type="button" onClick={() => void goNext()} disabled={submitting}>
						{submitting ? t("customer.wizard.nav.submitting") : step === RECAP_STEP ? t("customer.wizard.nav.finish") : t("customer.wizard.nav.next")}
					</Button>
				</div>
			)}
		</OnboardingShell>
	);
}
