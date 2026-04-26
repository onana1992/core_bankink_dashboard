"use client";

import { useMemo, useState } from "react";
import { formatNationalityLabel, getNationalitySelectOptions } from "@/lib/nationalityOptions";
import { composeInternationalPhone, getPhoneDialSelectOptions } from "@/lib/phoneCountryDialOptions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { customersApi } from "@/lib/api";
import { customerDetailPath } from "@/lib/customerRoutes";
import {
	isPersonIncomeSourceValue,
	isPersonProfessionValue,
	PERSON_INCOME_SOURCE_VALUES,
	PERSON_PROFESSION_VALUES
} from "@/types/personProfileOptions";
import type { AddAddressRequest, CreateCustomerRequest, UpdateCustomerRequest } from "@/types";
import {
	CITY_MAX_LEN,
	CITY_MIN_LEN,
	EMAIL_MAX_LEN,
	IDENTITY_DOC_NUMBER_MAX,
	MAX_UPLOAD_BYTES,
	MIN_ID_VALIDITY_DAYS,
	PHONE_MAX_LEN,
	PHONE_MIN_DIGITS,
	POSTAL_CODE_MAX_LEN,
	POSTAL_CODE_MIN_LEN,
	ADDRESS_LINE_MAX,
	ADDRESS_LINE_MIN,
	countPhoneDigits,
	isFileSizeOk,
	isImageFile,
	isImageOrPdfFile,
	isIsoDateAtLeastDaysAhead,
	isIsoDateStrictlyFuture,
	isValidBirthDateForBanking,
	isValidEmailFormat,
	parseIsoLocalDate
} from "@/lib/personOnboardingValidation";

const PHONE_CHARS_REGEX = /^[+]?[0-9\s\-().]+$/;
const POSTAL_CODE_REGEX = /^[A-Za-z0-9\s\-]{2,30}$/;

const RECAP_STEP_INDEX = 5;

/** Nombre total d'étapes du parcours (inclut le récapitulatif). */
function formStepCount(): number {
	return RECAP_STEP_INDEX + 1;
}

function lastFormStepIndex(): number {
	return RECAP_STEP_INDEX;
}

/** Clé i18n sous `customer.wizard.steps.*` */
function stepTranslationKey(step: number): string {
	const base = ["identity", "contact", "profile", "address", "documents"] as const;
	if (step >= 0 && step <= 4) return base[step];
	if (step === 5) return "recap";
	return "done";
}

function genderLabel(t: (k: string) => string, v: string): string {
	if (v === "MALE") return t("customer.wizard.profile.genderMale");
	if (v === "FEMALE") return t("customer.wizard.profile.genderFemale");
	if (v === "OTHER") return t("customer.wizard.profile.genderOther");
	return v || t("customer.wizard.recap.notProvided");
}

function maritalLabel(t: (k: string) => string, v: string): string {
	const keys: Record<string, string> = {
		SINGLE: "customer.wizard.profile.maritalSingle",
		MARRIED: "customer.wizard.profile.maritalMarried",
		DIVORCED: "customer.wizard.profile.maritalDivorced",
		WIDOWED: "customer.wizard.profile.maritalWidowed",
		OTHER: "customer.wizard.profile.maritalOther"
	};
	const k = keys[v];
	return k ? t(k) : v || t("customer.wizard.recap.notProvided");
}

function addressTypeLabel(t: (k: string) => string, v: string): string {
	if (v === "RESIDENTIAL") return t("customer.wizard.address.typeResidential");
	if (v === "BUSINESS") return t("customer.wizard.address.typeBusiness");
	if (v === "MAILING") return t("customer.wizard.address.typeMailing");
	return v;
}

function idDocTypeLabel(t: (k: string) => string, v: "ID_CARD" | "PASSPORT"): string {
	if (v === "PASSPORT") return t("customer.wizard.documents.passport");
	return t("customer.wizard.documents.idCard");
}

export default function NewCustomerPage() {
	const { t, i18n } = useTranslation();
	const nationalityOptions = useMemo(() => getNationalitySelectOptions(i18n.language), [i18n.language]);
	const phoneDialOptions = useMemo(() => getPhoneDialSelectOptions(i18n.language), [i18n.language]);
	const router = useRouter();
	const [step, setStep] = useState(0);
	const [wizardSuccess, setWizardSuccess] = useState(false);
	const [createdCustomerId, setCreatedCustomerId] = useState<number | null>(null);

	const [identity, setIdentity] = useState<CreateCustomerRequest>({
		type: "PERSON",
		displayName: "",
		firstName: "",
		lastName: "",
		email: ""
	}); // Assistant réservé aux clients personne physique ; entreprise : /customers/new/business — téléphone : phoneDialIso2 + phoneNational

	const [profile, setProfile] = useState({
		gender: "",
		birthDate: "",
		maritalStatus: "",
		nationality: "",
		taxResidenceCountry: "",
		taxIdentificationNumber: "",
		professionalActivity: "",
		incomeSource: ""
	});

	/** Pays / indicatif téléphone (étape Coordonnées) — défaut CM comme l’adresse. */
	const [phoneDialIso2, setPhoneDialIso2] = useState("CM");
	/** Numéro national saisi sans indicatif pays. */
	const [phoneNational, setPhoneNational] = useState("");

	const [address, setAddress] = useState<AddAddressRequest>({
		type: "RESIDENTIAL",
		line1: "",
		line2: "",
		city: "",
		state: "",
		postalCode: "",
		country: "CM",
		primaryAddress: true
	});

	const [idDocType, setIdDocType] = useState<"ID_CARD" | "PASSPORT">("ID_CARD");
	const [identityDocumentNumber, setIdentityDocumentNumber] = useState("");
	const [identityDocumentExpiresOn, setIdentityDocumentExpiresOn] = useState("");
	const [idRectoFile, setIdRectoFile] = useState<File | null>(null);
	const [idVersoFile, setIdVersoFile] = useState<File | null>(null);
	const [passportFile, setPassportFile] = useState<File | null>(null);
	const [selfieFile, setSelfieFile] = useState<File | null>(null);
	const [poaFile, setPoaFile] = useState<File | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const maxStep = useMemo(() => lastFormStepIndex(), []);

	function updateIdentity<K extends keyof CreateCustomerRequest>(key: K, value: CreateCustomerRequest[K]) {
		setIdentity(prev => ({ ...prev, [key]: value }));
	}

	function validateIdentity(): string | null {
		const dn = identity.displayName ?? "";
		if (!dn.trim()) return t("customer.wizard.validation.displayNameRequired");
		if (!identity.firstName?.trim()) return t("customer.wizard.validation.firstNameRequired");
		if (!identity.lastName?.trim()) return t("customer.wizard.validation.lastNameRequired");
		return null;
	}

	function validateContact(): string | null {
		const emailTrimmed = identity.email?.trim() ?? "";
		if (!emailTrimmed) return t("customer.wizard.validation.emailRequired");
		if (emailTrimmed.length > EMAIL_MAX_LEN) return t("customer.wizard.validation.emailTooLong");
		if (!isValidEmailFormat(emailTrimmed)) return t("customer.wizard.validation.emailInvalid");
		if (!phoneNational.trim()) return t("customer.wizard.validation.phoneRequired");
		const phoneRaw = composeInternationalPhone(phoneDialIso2, phoneNational).trim();
		if (!phoneRaw) return t("customer.wizard.validation.phoneRequired");
		if (phoneRaw.length > PHONE_MAX_LEN) return t("customer.wizard.validation.phoneTooLong");
		if (!PHONE_CHARS_REGEX.test(phoneRaw)) return t("customer.wizard.validation.phoneInvalid");
		if (countPhoneDigits(phoneRaw) < PHONE_MIN_DIGITS) return t("customer.wizard.validation.phoneDigitsTooFew");
		return null;
	}

	function validateProfile(): string | null {
		if (!profile.gender) return t("customer.wizard.validation.genderRequired");
		if (!profile.birthDate) return t("customer.wizard.validation.birthDateRequired");
		const birth = isValidBirthDateForBanking(profile.birthDate);
		if (birth.age === null) return t("customer.wizard.validation.birthDateInvalid");
		if (!birth.ok && birth.age < 18) return t("customer.wizard.validation.birthDateUnderage");
		if (!birth.ok) return t("customer.wizard.validation.birthDateUnrealistic");
		if (!profile.maritalStatus) return t("customer.wizard.validation.maritalStatusRequired");
		if (!profile.nationality?.trim()) return t("customer.wizard.validation.nationalityRequired");
		const nat = profile.nationality.trim().toUpperCase().slice(0, 2);
		if (!/^[A-Z]{2}$/.test(nat) || !nationalityOptions.some(o => o.code === nat)) {
			return t("customer.wizard.validation.nationalityInvalid");
		}
		const tax = profile.taxResidenceCountry.trim().toUpperCase().slice(0, 2);
		if (!tax) return t("customer.detail.profile.taxResidenceRequired");
		if (!/^[A-Z]{2}$/.test(tax) || !nationalityOptions.some(o => o.code === tax)) {
			return t("customer.detail.profile.taxResidenceInvalid");
		}
		if (profile.taxIdentificationNumber.trim().length > 64) {
			return t("customer.detail.profile.taxIdTooLong");
		}
		if (!profile.professionalActivity?.trim()) return t("customer.wizard.validation.professionalActivityRequired");
		if (!isPersonProfessionValue(profile.professionalActivity.trim())) {
			return t("customer.detail.profile.professionalActivityInvalid");
		}
		if (!profile.incomeSource?.trim()) return t("customer.wizard.validation.incomeSourceRequired");
		if (!isPersonIncomeSourceValue(profile.incomeSource.trim())) {
			return t("customer.detail.profile.incomeSourceInvalid");
		}
		if (profile.incomeSource.trim().length > 500) {
			return t("customer.wizard.validation.incomeSourceTooLong");
		}
		return null;
	}

	function validateAddress(): string | null {
		const line1 = address.line1.trim();
		if (!line1) return t("customer.wizard.validation.addressLine1Required");
		if (line1.length < ADDRESS_LINE_MIN) return t("customer.wizard.validation.addressLine1TooShort");
		if (line1.length > ADDRESS_LINE_MAX) return t("customer.wizard.validation.addressLine1TooLong");
		const line2 = (address.line2 ?? "").trim();
		if (line2.length > ADDRESS_LINE_MAX) return t("customer.wizard.validation.addressLine1TooLong");
		const city = address.city.trim();
		if (!city) return t("customer.wizard.validation.cityRequired");
		if (city.length < CITY_MIN_LEN) return t("customer.wizard.validation.cityTooShort");
		if (city.length > CITY_MAX_LEN) return t("customer.wizard.validation.cityTooLong");
		const pc = (address.postalCode ?? "").trim();
		if (!pc) return t("customer.wizard.validation.postalCodeRequired");
		if (pc.length < POSTAL_CODE_MIN_LEN || pc.length > POSTAL_CODE_MAX_LEN || !POSTAL_CODE_REGEX.test(pc)) {
			return t("customer.wizard.validation.postalCodeInvalid");
		}
		const country = (address.country || "").trim().toUpperCase().slice(0, 2);
		if (!country || !/^[A-Z]{2}$/.test(country)) return t("customer.wizard.validation.countryRequired");
		if (!nationalityOptions.some(o => o.code === country)) return t("customer.wizard.validation.countryInvalid");
		return null;
	}

	function uploadTooLarge(f: File | null): boolean {
		return f != null && !isFileSizeOk(f, MAX_UPLOAD_BYTES);
	}

	function validateDocuments(): string | null {
		if (!identityDocumentNumber.trim()) return t("customer.wizard.validation.identityDocumentNumberRequired");
		if (identityDocumentNumber.trim().length > IDENTITY_DOC_NUMBER_MAX) {
			return t("customer.wizard.validation.identityDocumentNumberTooLong");
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
		if (idDocType === "ID_CARD") {
			if (!idRectoFile) return t("customer.wizard.validation.idRectoRequired");
			if (!isImageFile(idRectoFile)) return t("customer.wizard.validation.idCardImageRequired");
			if (uploadTooLarge(idRectoFile) || uploadTooLarge(idVersoFile)) {
				return t("customer.wizard.validation.uploadFileTooLarge");
			}
			if (idVersoFile && !isImageFile(idVersoFile)) return t("customer.wizard.validation.idCardImageRequired");
		} else {
			if (!passportFile) return t("customer.wizard.validation.passportFileRequired");
			if (!isImageOrPdfFile(passportFile)) return t("customer.wizard.validation.passportFileTypeInvalid");
			if (uploadTooLarge(passportFile)) return t("customer.wizard.validation.uploadFileTooLarge");
		}
		if (!selfieFile) return t("customer.wizard.validation.selfieRequired");
		if (!isImageFile(selfieFile)) return t("customer.wizard.validation.selfieImageRequired");
		if (uploadTooLarge(selfieFile)) return t("customer.wizard.validation.uploadFileTooLarge");
		if (!poaFile) return t("customer.wizard.validation.proofOfAddressFileRequired");
		if (!isImageOrPdfFile(poaFile)) return t("customer.wizard.validation.proofOfAddressFileTypeInvalid");
		if (uploadTooLarge(poaFile)) return t("customer.wizard.validation.uploadFileTooLarge");
		return null;
	}

	function validateStepForNavigation(s: number): string | null {
		switch (s) {
			case 0:
				return validateIdentity();
			case 1:
				return validateContact();
			case 2:
				return validateProfile();
			case 3:
				return validateAddress();
			case 4:
				return validateDocuments();
			default:
				return null;
		}
	}

	function validateAll(): string | null {
		return validateIdentity() ?? validateContact() ?? validateProfile() ?? validateAddress() ?? validateDocuments() ?? null;
	}

	async function submitAllCustomer(): Promise<number> {
		const emailTrimmed = identity.email!.trim();
		const phone = composeInternationalPhone(phoneDialIso2, phoneNational).trim();
		const created = await customersApi.create({
			type: "PERSON",
			displayName: identity.displayName.trim(),
			firstName: identity.firstName?.trim(),
			lastName: identity.lastName?.trim(),
			email: emailTrimmed,
			phone
		});
		const id = created.id;

		const taxCc = profile.taxResidenceCountry.trim().toUpperCase().slice(0, 2);
		const updatePayload: UpdateCustomerRequest = {
			gender: profile.gender,
			birthDate: profile.birthDate,
			maritalStatus: profile.maritalStatus,
			nationality: profile.nationality.trim().toUpperCase(),
			taxResidenceCountry: taxCc,
			taxIdentificationNumber: profile.taxIdentificationNumber.trim() ? profile.taxIdentificationNumber.trim() : null,
			professionalActivity: profile.professionalActivity.trim(),
			incomeSource: profile.incomeSource.trim()
		};
		await customersApi.update(id, updatePayload);

		await customersApi.addAddress(id, {
			type: address.type,
			line1: address.line1.trim(),
			line2: address.line2?.trim() || undefined,
			city: address.city.trim(),
			state: address.state?.trim() || undefined,
			postalCode: address.postalCode?.trim() || undefined,
			country: address.country.trim().toUpperCase().slice(0, 2),
			primaryAddress: address.primaryAddress !== false
		});

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
		await customersApi.uploadDocument(id, "SELFIE", selfieFile!);
		await customersApi.uploadDocument(id, "PROOF_OF_ADDRESS", poaFile!);

		return id;
	}

	async function goNext() {
		setError(null);
		const recap = RECAP_STEP_INDEX;
		if (step < recap) {
			const err = validateStepForNavigation(step);
			if (err) {
				setError(err);
				return;
			}
			setStep(s => s + 1);
			return;
		}
		if (step === recap) {
			const err = validateAll();
			if (err) {
				setError(err);
				return;
			}
			setSubmitting(true);
			try {
				const id = await submitAllCustomer();
				setCreatedCustomerId(id);
				setWizardSuccess(true);
			} catch (e: unknown) {
				setError(e instanceof Error ? e.message : t("customer.wizard.validation.genericError"));
			} finally {
				setSubmitting(false);
			}
		}
	}

	function goPrev() {
		setError(null);
		if (step <= 0) return;
		setStep(s => Math.max(0, s - 1));
	}

	const progress = ((step + 1) / formStepCount()) * 100;
	const currentStepKey = stepTranslationKey(step);
	const isRecapStep = step === RECAP_STEP_INDEX;

	function RecapRow({ label, value }: { label: string; value: string }) {
		return (
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 py-1.5 border-b border-gray-100 last:border-0 text-sm">
				<dt className="text-gray-500 font-medium">{label}</dt>
				<dd className="sm:col-span-2 text-gray-900 break-words">{value || t("customer.wizard.recap.notProvided")}</dd>
			</div>
		);
	}

	return (
		<div className="flex w-full min-h-[calc(100vh-7rem)] flex-col gap-6">
			<div>
				<Link href="/customers" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("customer.wizard.backToList")}
				</Link>
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">{t("customer.wizard.titlePerson")}</h1>
						<p className="text-gray-600 mt-1">{t("customer.wizard.subtitlePerson")}</p>
					</div>
					<Link href="/customers/new/business" className="text-sm text-blue-600 hover:underline shrink-0">
						{t("customer.wizard.linkCompanyWizard")}
					</Link>
				</div>
			</div>

			{!wizardSuccess && (
				<div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
					<div className="flex justify-between text-sm text-gray-600 mb-2">
						<span>
							{t("customer.wizard.stepProgress", {
								current: step + 1,
								total: formStepCount()
							})}
						</span>
						<span className="font-medium text-gray-900">{t(`customer.wizard.steps.${currentStepKey}`)}</span>
					</div>
					<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
						<div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
					</div>
				</div>
			)}

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
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.identity.title")}</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.identity.displayName")} <span className="text-red-500">*</span>
							</label>
							<Input
								value={identity.displayName}
								onChange={e => updateIdentity("displayName", e.target.value)}
								placeholder={t("customer.wizard.identity.placeholderDisplayPerson")}
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.identity.firstName")} <span className="text-red-500">*</span>
							</label>
							<Input
								value={identity.firstName || ""}
								onChange={e => updateIdentity("firstName", e.target.value)}
								placeholder={t("customer.wizard.identity.placeholderFirstName")}
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.identity.lastName")} <span className="text-red-500">*</span>
							</label>
							<Input
								value={identity.lastName || ""}
								onChange={e => updateIdentity("lastName", e.target.value)}
								placeholder={t("customer.wizard.identity.placeholderLastName")}
							/>
						</div>
					</div>
				</div>
			)}

			{!wizardSuccess && step === 1 && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.contact.title")}</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.contact.email")} <span className="text-red-500">*</span>
							</label>
							<Input
								type="email"
								value={identity.email}
								onChange={e => updateIdentity("email", e.target.value)}
								placeholder={t("customer.wizard.contact.emailPlaceholder")}
								maxLength={EMAIL_MAX_LEN}
							/>
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.contact.phone")} <span className="text-red-500">*</span>
							</label>
							<div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
								<select
									className="w-full sm:w-[min(100%,280px)] shrink-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white text-sm"
									value={phoneDialIso2}
									onChange={e => setPhoneDialIso2(e.target.value.toUpperCase().slice(0, 2))}
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
									value={phoneNational}
									onChange={e => setPhoneNational(e.target.value)}
									placeholder={t("customer.wizard.contact.phoneNationalPlaceholder")}
									maxLength={PHONE_MAX_LEN}
								/>
							</div>
						</div>
					</div>
				</div>
			)}

			{!wizardSuccess && step === 2 && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.profile.title")}</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.profile.gender")} <span className="text-red-500">*</span>
							</label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
								value={profile.gender}
								onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))}
							>
								<option value="">{t("customer.wizard.profile.genderPlaceholder")}</option>
								<option value="MALE">{t("customer.wizard.profile.genderMale")}</option>
								<option value="FEMALE">{t("customer.wizard.profile.genderFemale")}</option>
								<option value="OTHER">{t("customer.wizard.profile.genderOther")}</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.profile.birthDate")} <span className="text-red-500">*</span>
							</label>
							<Input type="date" value={profile.birthDate} onChange={e => setProfile(p => ({ ...p, birthDate: e.target.value }))} />
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.profile.maritalStatus")} <span className="text-red-500">*</span>
							</label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
								value={profile.maritalStatus}
								onChange={e => setProfile(p => ({ ...p, maritalStatus: e.target.value }))}
							>
								<option value="">{t("customer.wizard.profile.maritalPlaceholder")}</option>
								<option value="SINGLE">{t("customer.wizard.profile.maritalSingle")}</option>
								<option value="MARRIED">{t("customer.wizard.profile.maritalMarried")}</option>
								<option value="DIVORCED">{t("customer.wizard.profile.maritalDivorced")}</option>
								<option value="WIDOWED">{t("customer.wizard.profile.maritalWidowed")}</option>
								<option value="OTHER">{t("customer.wizard.profile.maritalOther")}</option>
							</select>
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.profile.nationality")} <span className="text-red-500">*</span>
							</label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
								value={profile.nationality}
								onChange={e => setProfile(p => ({ ...p, nationality: e.target.value }))}
							>
								<option value="">{t("customer.wizard.profile.nationalityPlaceholder")}</option>
								{nationalityOptions.map(opt => (
									<option key={opt.code} value={opt.code}>
										{opt.label} ({opt.code})
									</option>
								))}
							</select>
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.detail.profile.taxResidence")} <span className="text-red-500">*</span>
							</label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-md"
								value={profile.taxResidenceCountry}
								onChange={e => setProfile(p => ({ ...p, taxResidenceCountry: e.target.value }))}
							>
								<option value="">{t("customer.wizard.profile.nationalityPlaceholder")}</option>
								{nationalityOptions.map(opt => (
									<option key={opt.code} value={opt.code}>
										{opt.label} ({opt.code})
									</option>
								))}
							</select>
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.detail.profile.taxIdentification")}</label>
							<Input
								value={profile.taxIdentificationNumber}
								onChange={e => setProfile(p => ({ ...p, taxIdentificationNumber: e.target.value }))}
								maxLength={64}
							/>
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.profile.professionalActivity")} <span className="text-red-500">*</span>
							</label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-md"
								value={profile.professionalActivity}
								onChange={e => setProfile(p => ({ ...p, professionalActivity: e.target.value }))}
							>
								<option value="">{t("customer.wizard.profile.selectFromList")}</option>
								{PERSON_PROFESSION_VALUES.map(code => (
									<option key={code} value={code}>
										{t(`customer.wizard.profile.profession.${code}`)}
									</option>
								))}
							</select>
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.profile.incomeSource")} <span className="text-red-500">*</span>
							</label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-md"
								value={profile.incomeSource}
								onChange={e => setProfile(p => ({ ...p, incomeSource: e.target.value }))}
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
				</div>
			)}

			{!wizardSuccess && step === 3 && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.address.title")}</h2>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.type")}</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md"
							value={address.type}
							onChange={e => setAddress(a => ({ ...a, type: e.target.value as AddAddressRequest["type"] }))}
						>
							<option value="RESIDENTIAL">{t("customer.wizard.address.typeResidential")}</option>
							<option value="BUSINESS">{t("customer.wizard.address.typeBusiness")}</option>
							<option value="MAILING">{t("customer.wizard.address.typeMailing")}</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							{t("customer.wizard.address.line1")} <span className="text-red-500">*</span>
						</label>
						<Input
							value={address.line1}
							onChange={e => setAddress(a => ({ ...a, line1: e.target.value }))}
							placeholder={t("customer.wizard.address.placeholderLine1")}
							maxLength={ADDRESS_LINE_MAX}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.line2")}</label>
						<Input
							value={address.line2 || ""}
							onChange={e => setAddress(a => ({ ...a, line2: e.target.value }))}
							placeholder={t("customer.wizard.address.placeholderLine2")}
							maxLength={ADDRESS_LINE_MAX}
						/>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.address.city")} <span className="text-red-500">*</span>
							</label>
							<Input
								value={address.city}
								onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
								maxLength={CITY_MAX_LEN}
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.state")}</label>
							<Input
								value={address.state || ""}
								onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}
								maxLength={100}
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.address.postalCode")} <span className="text-red-500">*</span>
							</label>
							<Input
								value={address.postalCode || ""}
								onChange={e => setAddress(a => ({ ...a, postalCode: e.target.value }))}
								maxLength={POSTAL_CODE_MAX_LEN}
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.address.country")} <span className="text-red-500">*</span>
							</label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								value={(() => {
									const c = (address.country || "").trim().toUpperCase().slice(0, 2);
									return nationalityOptions.some(o => o.code === c) ? c : "CM";
								})()}
								onChange={e => setAddress(a => ({ ...a, country: e.target.value }))}
							>
								{nationalityOptions.map(opt => (
									<option key={opt.code} value={opt.code}>
										{opt.label} ({opt.code})
									</option>
								))}
							</select>
						</div>
					</div>
					<label className="flex items-center gap-2 text-sm text-gray-700">
						<input
							type="checkbox"
							checked={address.primaryAddress !== false}
							onChange={e => setAddress(a => ({ ...a, primaryAddress: e.target.checked }))}
						/>
						{t("customer.wizard.address.primary")}
					</label>
				</div>
			)}

			{!wizardSuccess && step === 4 && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.documents.title")}</h2>
					<p className="text-sm text-gray-600">{t("customer.wizard.documents.formatsHint")}</p>
					<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									{t("customer.wizard.documents.idDocument")} <span className="text-red-500">*</span>
								</label>
								<div className="flex flex-wrap gap-3 mb-2">
									<label className="flex items-center gap-2 text-sm">
										<input
											type="radio"
											name="idt"
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
											name="idt"
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
												<input
													type="file"
													accept="image/*"
													className="sr-only"
													onChange={e => setIdRectoFile(e.target.files?.[0] ?? null)}
												/>
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
												<input
													type="file"
													accept="image/*"
													className="sr-only"
													onChange={e => setIdVersoFile(e.target.files?.[0] ?? null)}
												/>
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
					<div className="relative overflow-hidden rounded-2xl border border-violet-200/90 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/50 p-5 shadow-sm ring-1 ring-violet-900/[0.06]">
						<div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-violet-200/40 blur-2xl" aria-hidden />
						<div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
							<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 shadow-inner ring-1 ring-violet-200/70">
								<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.75}
										d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
									/>
								</svg>
							</div>
							<div className="min-w-0 flex-1 space-y-3">
								<div>
									<div className="flex flex-wrap items-center gap-2">
										<h3 className="text-base font-semibold tracking-tight text-slate-900">
											{t("customer.wizard.documents.selfie")} <span className="text-red-500">*</span>
										</h3>
									</div>
									<p className="mt-1 text-sm text-slate-600">{t("customer.wizard.documents.selfieHint")}</p>
									<p className="mt-1 text-xs text-slate-500">{t("customer.wizard.documents.selfieSub")}</p>
								</div>
								<label className="group flex cursor-pointer flex-col gap-3 rounded-xl border-2 border-dashed border-violet-200/95 bg-white/95 px-4 py-5 transition hover:border-violet-400 hover:bg-white focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/25">
									<input type="file" accept="image/*" className="sr-only" onChange={e => setSelfieFile(e.target.files?.[0] ?? null)} />
									<div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
										<span className="inline-flex h-9 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white shadow-sm transition group-hover:bg-violet-700">
											{t("customer.wizard.documents.proofOfAddressDropHint")}
										</span>
										<span className="text-xs text-slate-500">{t("customer.wizard.documents.idPhotoFormatsLine")}</span>
									</div>
									{selfieFile && (
										<div className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-900">
											<svg className="h-4 w-4 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
												<path
													fillRule="evenodd"
													d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
													clipRule="evenodd"
												/>
											</svg>
											<span className="min-w-0 break-all font-medium">{selfieFile.name}</span>
										</div>
									)}
								</label>
							</div>
						</div>
					</div>
					<div className="mt-6 border-t border-gray-100 pt-6">
						<div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
							<div
								className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-200/30 blur-2xl"
								aria-hidden
							/>
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
											<h3 className="text-base font-semibold tracking-tight text-slate-900">
												{t("customer.wizard.documents.proofOfAddress")}
											</h3>
											<span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-rose-700 ring-1 ring-rose-200/70">
												*
											</span>
										</div>
										<p className="mt-2 text-sm leading-relaxed text-slate-600">
											{t("customer.wizard.documents.proofOfAddressCardHint")}
										</p>
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
					</div>
				</div>
			)}

			{!wizardSuccess && isRecapStep && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-6">
					<div>
						<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.recap.title")}</h2>
						<p className="text-sm text-gray-600 mt-1">{t("customer.wizard.recap.intro")}</p>
					</div>

					<section>
						<h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-2">{t("customer.wizard.recap.sectionIdentity")}</h3>
						<dl className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
							<RecapRow label={t("customer.wizard.recap.type")} value={t("customer.types.PERSON")} />
							<RecapRow label={t("customer.wizard.recap.displayName")} value={identity.displayName} />
							<RecapRow label={t("customer.wizard.recap.firstName")} value={identity.firstName ?? ""} />
							<RecapRow label={t("customer.wizard.recap.lastName")} value={identity.lastName ?? ""} />
						</dl>
					</section>

					<section>
						<h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-2">{t("customer.wizard.recap.sectionContact")}</h3>
						<dl className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
							<RecapRow label={t("customer.wizard.recap.email")} value={identity.email ?? ""} />
							<RecapRow
								label={t("customer.wizard.recap.phone")}
								value={composeInternationalPhone(phoneDialIso2, phoneNational).trim()}
							/>
						</dl>
					</section>

					<section>
						<h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-2">{t("customer.wizard.recap.sectionProfile")}</h3>
						<dl className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
							<RecapRow label={t("customer.wizard.recap.gender")} value={genderLabel(t, profile.gender)} />
							<RecapRow label={t("customer.wizard.recap.birthDate")} value={profile.birthDate} />
							<RecapRow label={t("customer.wizard.recap.maritalStatus")} value={maritalLabel(t, profile.maritalStatus)} />
							<RecapRow
								label={t("customer.wizard.recap.nationality")}
								value={formatNationalityLabel(profile.nationality, i18n.language)}
							/>
							<RecapRow
								label={t("customer.wizard.recap.taxResidence")}
								value={formatNationalityLabel(profile.taxResidenceCountry, i18n.language)}
							/>
							<RecapRow label={t("customer.wizard.recap.taxIdentification")} value={profile.taxIdentificationNumber.trim() || "—"} />
							<RecapRow
								label={t("customer.wizard.recap.professionalActivity")}
								value={
									isPersonProfessionValue(profile.professionalActivity.trim())
										? t(`customer.wizard.profile.profession.${profile.professionalActivity.trim()}`)
										: profile.professionalActivity.trim()
								}
							/>
							<RecapRow
								label={t("customer.wizard.recap.incomeSource")}
								value={
									isPersonIncomeSourceValue(profile.incomeSource.trim())
										? t(`customer.wizard.profile.incomeSourceOption.${profile.incomeSource.trim()}`)
										: profile.incomeSource.trim()
								}
							/>
						</dl>
					</section>

					<section>
						<h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-2">{t("customer.wizard.recap.sectionAddress")}</h3>
						<dl className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
							<RecapRow label={t("customer.wizard.recap.addressType")} value={addressTypeLabel(t, address.type)} />
							<RecapRow label={t("customer.wizard.recap.line1")} value={address.line1} />
							<RecapRow label={t("customer.wizard.recap.line2")} value={address.line2 ?? ""} />
							<RecapRow label={t("customer.wizard.recap.city")} value={address.city} />
							<RecapRow label={t("customer.wizard.recap.state")} value={address.state ?? ""} />
							<RecapRow label={t("customer.wizard.recap.postalCode")} value={address.postalCode ?? ""} />
							<RecapRow
								label={t("customer.wizard.recap.country")}
								value={`${formatNationalityLabel(address.country, i18n.language)} (${(address.country || "").trim().toUpperCase().slice(0, 2) || "—"})`}
							/>
							<RecapRow
								label={t("customer.wizard.recap.primaryAddress")}
								value={address.primaryAddress !== false ? t("customer.wizard.recap.yes") : t("customer.wizard.recap.no")}
							/>
						</dl>
					</section>

					<section>
						<h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-2">{t("customer.wizard.recap.sectionDocuments")}</h3>
						<dl className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
							<RecapRow label={t("customer.wizard.recap.idDocumentType")} value={idDocTypeLabel(t, idDocType)} />
							<RecapRow label={t("customer.wizard.recap.identityDocumentNumber")} value={identityDocumentNumber.trim()} />
							<RecapRow label={t("customer.wizard.recap.identityDocumentExpiresOn")} value={identityDocumentExpiresOn.trim()} />
							{idDocType === "ID_CARD" ? (
								<>
									<RecapRow label={t("customer.wizard.recap.idRectoFile")} value={idRectoFile?.name ?? ""} />
									<RecapRow label={t("customer.wizard.recap.idVersoFile")} value={idVersoFile?.name ?? ""} />
								</>
							) : (
								<RecapRow label={t("customer.wizard.recap.passportFile")} value={passportFile?.name ?? ""} />
							)}
							<RecapRow label={t("customer.wizard.recap.selfieFile")} value={selfieFile?.name ?? ""} />
							<RecapRow label={t("customer.wizard.recap.proofOfAddressFile")} value={poaFile?.name ?? ""} />
						</dl>
					</section>
				</div>
			)}

			{wizardSuccess && createdCustomerId != null && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4 text-center">
					<div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
						<svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<h2 className="text-xl font-semibold text-gray-900">{t("customer.wizard.complete.title")}</h2>
					<p className="text-gray-600 text-sm">{t("customer.wizard.complete.message")}</p>
					<div className="flex flex-wrap justify-center gap-3 pt-2">
						<Button type="button" onClick={() => router.push(customerDetailPath(createdCustomerId, "PERSON"))}>
							{t("customer.wizard.complete.openRecord")}
						</Button>
						<Button type="button" variant="outline" onClick={() => router.push("/customers")}>
							{t("customer.wizard.complete.backToList")}
						</Button>
					</div>
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
					<div className="flex flex-wrap gap-2 justify-end">
						<Button type="button" onClick={() => void goNext()} disabled={submitting}>
							{submitting ? t("customer.wizard.nav.submitting") : step === maxStep ? t("customer.wizard.nav.finish") : t("customer.wizard.nav.next")}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
