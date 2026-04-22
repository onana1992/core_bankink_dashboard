"use client";

import { useMemo, useState } from "react";
import { formatNationalityLabel, getNationalitySelectOptions } from "@/lib/nationalityOptions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { customersApi } from "@/lib/api";
import { customerDetailPath } from "@/lib/customerRoutes";
import type { AddAddressRequest, CreateCustomerRequest, UpdateCustomerRequest } from "@/types";

const PHONE_REGEX = /^[+]?[0-9\s\-()]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function isImageFile(f: File | null): boolean {
	return f != null && (f.type?.startsWith("image/") ?? false);
}

export default function NewCustomerPage() {
	const { t, i18n } = useTranslation();
	const nationalityOptions = useMemo(() => getNationalitySelectOptions(i18n.language), [i18n.language]);
	const router = useRouter();
	const [step, setStep] = useState(0);
	const [wizardSuccess, setWizardSuccess] = useState(false);
	const [createdCustomerId, setCreatedCustomerId] = useState<number | null>(null);

	const [identity, setIdentity] = useState<CreateCustomerRequest>({
		type: "PERSON",
		displayName: "",
		firstName: "",
		lastName: "",
		email: "",
		phone: ""
	}); // Assistant réservé aux clients personne physique ; entreprise : /customers/new/business

	const [profile, setProfile] = useState({
		gender: "",
		birthDate: "",
		maritalStatus: "",
		nationality: "",
		professionalActivity: "",
		incomeSource: ""
	});

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
		if (!identity.displayName.trim()) return t("customer.wizard.validation.displayNameRequired");
		if (!identity.firstName?.trim()) return t("customer.wizard.validation.firstNameRequired");
		if (!identity.lastName?.trim()) return t("customer.wizard.validation.lastNameRequired");
		return null;
	}

	function validateContact(): string | null {
		const emailTrimmed = identity.email?.trim() ?? "";
		if (!emailTrimmed) return t("customer.wizard.validation.emailRequired");
		if (!EMAIL_REGEX.test(emailTrimmed)) return t("customer.wizard.validation.emailInvalid");
		if (!identity.phone?.trim()) return t("customer.wizard.validation.phoneRequired");
		if (!PHONE_REGEX.test(identity.phone.trim())) return t("customer.wizard.validation.phoneInvalid");
		return null;
	}

	function validateProfile(): string | null {
		if (!profile.gender) return t("customer.wizard.validation.genderRequired");
		if (!profile.birthDate) return t("customer.wizard.validation.birthDateRequired");
		if (!profile.maritalStatus) return t("customer.wizard.validation.maritalStatusRequired");
		if (!profile.nationality?.trim()) return t("customer.wizard.validation.nationalityRequired");
		if (!profile.professionalActivity?.trim()) return t("customer.wizard.validation.professionalActivityRequired");
		if (profile.professionalActivity.trim().length > 255) {
			return t("customer.wizard.validation.professionalActivityTooLong");
		}
		if (profile.incomeSource.trim().length > 500) {
			return t("customer.wizard.validation.incomeSourceTooLong");
		}
		return null;
	}

	function validateAddress(): string | null {
		if (!address.line1.trim()) return t("customer.wizard.validation.addressLine1Required");
		if (!address.city.trim()) return t("customer.wizard.validation.cityRequired");
		if (!address.postalCode?.trim()) return t("customer.wizard.validation.postalCodeRequired");
		const country = (address.country || "").trim().toUpperCase().slice(0, 2);
		if (!country || !/^[A-Z]{2}$/.test(country)) return t("customer.wizard.validation.countryRequired");
		if (!nationalityOptions.some(o => o.code === country)) return t("customer.wizard.validation.countryInvalid");
		return null;
	}

	function validateDocuments(): string | null {
		if (!identityDocumentNumber.trim()) return t("customer.wizard.validation.identityDocumentNumberRequired");
		if (!identityDocumentExpiresOn.trim()) return t("customer.wizard.validation.identityDocumentExpiresRequired");
		if (Number.isNaN(Date.parse(identityDocumentExpiresOn))) {
			return t("customer.wizard.validation.identityDocumentExpiresInvalid");
		}
		if (identityDocumentNumber.trim().length > 64) return t("customer.wizard.validation.identityDocumentNumberTooLong");
		if (idDocType === "ID_CARD") {
			if (!idRectoFile) return t("customer.wizard.validation.idRectoRequired");
			if (!isImageFile(idRectoFile)) return t("customer.wizard.validation.idCardImageRequired");
			if (idVersoFile && !isImageFile(idVersoFile)) return t("customer.wizard.validation.idCardImageRequired");
		} else {
			if (!passportFile) return t("customer.wizard.validation.passportFileRequired");
		}
		if (!selfieFile) return t("customer.wizard.validation.selfieRequired");
		if (!isImageFile(selfieFile)) return t("customer.wizard.validation.selfieImageRequired");
		if (!poaFile) return t("customer.wizard.validation.proofOfAddressFileRequired");
		return null;
	}

	function validateAll(): string | null {
		return validateIdentity() ?? validateContact() ?? validateProfile() ?? validateAddress() ?? validateDocuments() ?? null;
	}

	async function submitAllCustomer(): Promise<number> {
		const emailTrimmed = identity.email!.trim();
		const phone = (identity.phone ?? "").trim();
		const created = await customersApi.create({
			type: "PERSON",
			displayName: identity.displayName.trim(),
			firstName: identity.firstName?.trim(),
			lastName: identity.lastName?.trim(),
			email: emailTrimmed,
			phone
		});
		const id = created.id;

		const updatePayload: UpdateCustomerRequest = {
			gender: profile.gender,
			birthDate: profile.birthDate,
			maritalStatus: profile.maritalStatus,
			nationality: profile.nationality.trim().toUpperCase(),
			professionalActivity: profile.professionalActivity.trim(),
			incomeSource: profile.incomeSource.trim() ? profile.incomeSource.trim() : null
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
			/* Étape adresse (ex. 4/6 personne physique) : contrôle des champs obligatoires avant de continuer */
			if (step === 3) {
				const err = validateAddress();
				if (err) {
					setError(err);
					return;
				}
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
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.contact.phone")} <span className="text-red-500">*</span>
							</label>
							<Input
								type="tel"
								value={identity.phone}
								onChange={e => updateIdentity("phone", e.target.value)}
								placeholder={t("customer.wizard.contact.phonePlaceholder")}
							/>
						</div>
					</div>
				</div>
			)}

			{!wizardSuccess && step === 2 && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">{t("customer.wizard.profile.title")}</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.profile.gender")}</label>
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
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.profile.birthDate")}</label>
							<Input type="date" value={profile.birthDate} onChange={e => setProfile(p => ({ ...p, birthDate: e.target.value }))} />
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.profile.maritalStatus")}</label>
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
								{t("customer.wizard.profile.professionalActivity")} <span className="text-red-500">*</span>
							</label>
							<Input
								value={profile.professionalActivity}
								onChange={e => setProfile(p => ({ ...p, professionalActivity: e.target.value }))}
								maxLength={255}
								placeholder={t("customer.wizard.profile.professionalActivityPlaceholder")}
							/>
						</div>
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.profile.incomeSource")}
							</label>
							<Input
								value={profile.incomeSource}
								onChange={e => setProfile(p => ({ ...p, incomeSource: e.target.value }))}
								maxLength={500}
								placeholder={t("customer.wizard.profile.incomeSourcePlaceholder")}
							/>
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
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.line2")}</label>
						<Input
							value={address.line2 || ""}
							onChange={e => setAddress(a => ({ ...a, line2: e.target.value }))}
							placeholder={t("customer.wizard.address.placeholderLine2")}
						/>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.address.city")} <span className="text-red-500">*</span>
							</label>
							<Input value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.address.state")}</label>
							<Input value={address.state || ""} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								{t("customer.wizard.address.postalCode")} <span className="text-red-500">*</span>
							</label>
							<Input value={address.postalCode || ""} onChange={e => setAddress(a => ({ ...a, postalCode: e.target.value }))} />
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
											maxLength={64}
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
									<div className="space-y-3">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												{t("customer.wizard.documents.idRecto")} <span className="text-red-500">*</span>
											</label>
											<input
												type="file"
												accept="image/*"
												className="text-sm w-full"
												onChange={e => setIdRectoFile(e.target.files?.[0] ?? null)}
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">{t("customer.wizard.documents.idVerso")}</label>
											<input
												type="file"
												accept="image/*"
												className="text-sm w-full"
												onChange={e => setIdVersoFile(e.target.files?.[0] ?? null)}
											/>
										</div>
									</div>
								) : (
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											{t("customer.wizard.documents.passportScan")} <span className="text-red-500">*</span>
										</label>
										<input type="file" className="text-sm w-full" onChange={e => setPassportFile(e.target.files?.[0] ?? null)} />
									</div>
								)}
							</div>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							{t("customer.wizard.documents.selfie")} <span className="text-red-500">*</span>
						</label>
						<p className="text-xs text-gray-500 mb-1">{t("customer.wizard.documents.selfieHint")}</p>
						<input type="file" accept="image/*" className="text-sm w-full" onChange={e => setSelfieFile(e.target.files?.[0] ?? null)} />
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							{t("customer.wizard.documents.proofOfAddress")} <span className="text-red-500">*</span>
						</label>
						<input type="file" className="text-sm w-full" onChange={e => setPoaFile(e.target.files?.[0] ?? null)} />
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
							<RecapRow label={t("customer.wizard.recap.phone")} value={identity.phone ?? ""} />
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
							<RecapRow label={t("customer.wizard.recap.professionalActivity")} value={profile.professionalActivity.trim()} />
							<RecapRow label={t("customer.wizard.recap.incomeSource")} value={profile.incomeSource.trim()} />
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
