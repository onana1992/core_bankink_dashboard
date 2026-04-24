"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { customersApi } from "@/lib/api";
import { customerDetailPath } from "@/lib/customerRoutes";
import { formatNationalityLabel, getNationalitySelectOptions } from "@/lib/nationalityOptions";
import { ANNUAL_REVENUE_BAND_OPTIONS, LEGAL_FORM_OPTIONS } from "@/data/legalFormOptions";
import type { AddAddressRequest, AddRelatedPersonRequest, CreateCustomerRequest, UpdateCustomerRequest } from "@/types";

const PHONE_REGEX = /^[+]?[0-9\s\-()]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DirectorRow = { firstName: string; lastName: string; dateOfBirth: string; nationalId: string; pepFlag: boolean };
type UboRow = DirectorRow & {
	ownershipPercent: string;
	nationality: string;
	residenceLine1: string;
	residenceCity: string;
	residencePostalCode: string;
	residenceCountry: string;
	email: string;
	phone: string;
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
		phone: ""
	};
}

const RECAP_STEP = 8;

const STEP_KEYS = ["entity", "seat", "mailing", "contact", "directors", "ubos", "financial", "documents", "recap"] as const;

export default function NewBusinessCustomerPage() {
	const { t, i18n } = useTranslation();
	const router = useRouter();
	const nationalityOptions = useMemo(() => getNationalitySelectOptions(i18n.language), [i18n.language]);

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

	const [contact, setContact] = useState({ email: "", phone: "", website: "" });

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
	const [idDocType, setIdDocType] = useState<"ID_CARD" | "PASSPORT">("ID_CARD");
	const [identityDocumentNumber, setIdentityDocumentNumber] = useState("");
	const [identityDocumentExpiresOn, setIdentityDocumentExpiresOn] = useState("");
	const [idRectoFile, setIdRectoFile] = useState<File | null>(null);
	const [idVersoFile, setIdVersoFile] = useState<File | null>(null);
	const [passportFile, setPassportFile] = useState<File | null>(null);

	function isImageFile(f: File | null): boolean {
		return f != null && (f.type?.startsWith("image/") ?? false);
	}

	function validateCountry(code: string): boolean {
		const c = code.trim().toUpperCase().slice(0, 2);
		return /^[A-Z]{2}$/.test(c) && nationalityOptions.some(o => o.code === c);
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
			if (!contact.phone.trim()) return t("customer.wizard.validation.phoneRequired");
			if (!PHONE_REGEX.test(contact.phone.trim())) return t("customer.wizard.validation.phoneInvalid");
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
				if (u.phone.trim() && !PHONE_REGEX.test(u.phone.trim())) return t("customer.wizard.validation.phoneInvalid");
			}
		}
		if (s === 6) {
			if (!financial.annualRevenueBand) return t("customer.wizard.business.validation.revenueBandRequired");
			if (!financial.fundsSource.trim()) return t("customer.wizard.business.validation.fundsSourceRequired");
			if (!financial.accountOpeningPurpose.trim()) return t("customer.wizard.business.validation.openingPurposeRequired");
		}
		if (s === 7) {
			if (!identityDocumentNumber.trim()) return t("customer.wizard.validation.identityDocumentNumberRequired");
			if (!identityDocumentExpiresOn.trim()) return t("customer.wizard.validation.identityDocumentExpiresRequired");
			if (Number.isNaN(Date.parse(identityDocumentExpiresOn))) return t("customer.wizard.validation.identityDocumentExpiresInvalid");
			if (!statutesFile) return t("customer.wizard.business.validation.statutesRequired");
			if (idDocType === "ID_CARD") {
				if (!idRectoFile || !isImageFile(idRectoFile)) return t("customer.wizard.validation.idRectoRequired");
				if (idVersoFile && !isImageFile(idVersoFile)) return t("customer.wizard.validation.idCardImageRequired");
			} else {
				if (!passportFile) return t("customer.wizard.validation.passportFileRequired");
			}
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
			phone: u.phone.trim() || undefined
		};
	}

	async function submitAll(): Promise<number> {
		const createPayload: CreateCustomerRequest = {
			type: "BUSINESS",
			displayName: entity.displayName.trim(),
			email: contact.email.trim(),
			phone: contact.phone.trim()
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
		const err = validateStep(7);
		if (err) {
			setError(err);
			return;
		}
		setSubmitting(true);
		try {
			const newId = await submitAll();
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

	const progress = ((step + 1) / (RECAP_STEP + 1)) * 100;
	const stepKey = STEP_KEYS[step] ?? "recap";

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
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">{t("customer.wizard.business.title")}</h1>
						<p className="text-gray-600 mt-1">{t("customer.wizard.business.subtitle")}</p>
					</div>
					<Link href="/customers/new" className="text-sm text-blue-600 hover:underline">
						{t("customer.wizard.business.linkPersonWizard")}
					</Link>
				</div>
			</div>

			{!wizardSuccess && (
				<div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
					<div className="flex justify-between text-sm text-gray-600 mb-2">
						<span>
							{t("customer.wizard.stepProgress", { current: step + 1, total: RECAP_STEP + 1 })}
						</span>
						<span className="font-medium text-gray-900">{t(`customer.wizard.business.steps.${stepKey}`)}</span>
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
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.contact.phone")} *</label>
							<Input type="tel" value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: e.target.value }))} />
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
								<div>
									<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.contact.phone")}</label>
									<Input type="tel" value={u.phone} onChange={e => setUbos(rows => rows.map((r, i) => (i === idx ? { ...r, phone: e.target.value } : r)))} />
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
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.financial.currencies")}</label>
							<Input value={financial.currenciesUsed} onChange={e => setFinancial(f => ({ ...f, currenciesUsed: e.target.value }))} placeholder="EUR, XAF, USD…" />
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
					<p className="text-sm text-gray-600">{t("customer.wizard.business.documents.intro")}</p>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.documents.statutes")} *</label>
						<input type="file" className="text-sm w-full" onChange={e => setStatutesFile(e.target.files?.[0] ?? null)} />
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("customer.wizard.business.documents.kbisOptional")}</label>
						<input type="file" className="text-sm w-full" onChange={e => setKbisFile(e.target.files?.[0] ?? null)} />
					</div>
					<div className="border-t border-gray-100 pt-4 space-y-3">
						<label className="block text-sm font-medium text-gray-700">{t("customer.wizard.business.documents.repId")} *</label>
						<div className="flex flex-wrap gap-3">
							<label className="flex items-center gap-2 text-sm">
								<input type="radio" name="idt" checked={idDocType === "ID_CARD"} onChange={() => { setIdDocType("ID_CARD"); setPassportFile(null); }} />
								{t("customer.wizard.documents.idCardShort")}
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input type="radio" name="idt" checked={idDocType === "PASSPORT"} onChange={() => { setIdDocType("PASSPORT"); setIdRectoFile(null); setIdVersoFile(null); }} />
								{t("customer.wizard.documents.passport")}
							</label>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.documents.identityNumber")} *</label>
								<input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={identityDocumentNumber} onChange={e => setIdentityDocumentNumber(e.target.value)} maxLength={64} />
							</div>
							<div>
								<label className="block text-xs text-gray-600 mb-1">{t("customer.wizard.documents.identityExpires")} *</label>
								<input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={identityDocumentExpiresOn} onChange={e => setIdentityDocumentExpiresOn(e.target.value)} />
							</div>
						</div>
						{idDocType === "ID_CARD" ? (
							<div className="space-y-2">
								<label className="block text-xs text-gray-600">{t("customer.wizard.documents.idRecto")} *</label>
								<input type="file" accept="image/*" className="text-sm w-full" onChange={e => setIdRectoFile(e.target.files?.[0] ?? null)} />
								<label className="block text-xs text-gray-600">{t("customer.wizard.documents.idVerso")}</label>
								<input type="file" accept="image/*" className="text-sm w-full" onChange={e => setIdVersoFile(e.target.files?.[0] ?? null)} />
							</div>
						) : (
							<div>
								<label className="block text-xs text-gray-600">{t("customer.wizard.documents.passportScan")} *</label>
								<input type="file" className="text-sm w-full" onChange={e => setPassportFile(e.target.files?.[0] ?? null)} />
							</div>
						)}
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
							<RecapRow label={t("customer.wizard.business.entity.activityDescription")} value={entity.activityDescription} />
						</dl>
					</section>
					<section>
						<h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-2">{t("customer.wizard.recap.sectionContact")}</h3>
						<dl className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
							<RecapRow label={t("customer.wizard.recap.email")} value={contact.email} />
							<RecapRow label={t("customer.wizard.recap.phone")} value={contact.phone} />
							<RecapRow label={t("customer.wizard.business.contact.website")} value={contact.website} />
						</dl>
					</section>
					<section>
						<h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-2">{t("customer.wizard.recap.sectionDocuments")}</h3>
						<dl className="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
							<RecapRow label={t("customer.wizard.business.documents.statutes")} value={statutesFile?.name ?? ""} />
							<RecapRow label={t("customer.wizard.business.documents.kbisOptional")} value={kbisFile?.name ?? ""} />
							<RecapRow label={t("customer.wizard.recap.idDocumentType")} value={idDocType} />
						</dl>
					</section>
				</div>
			)}

			{wizardSuccess && createdCustomerId != null && (
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4 text-center">
					<h2 className="text-xl font-semibold text-gray-900">{t("customer.wizard.complete.title")}</h2>
					<p className="text-gray-600 text-sm">{t("customer.wizard.complete.message")}</p>
					<div className="flex flex-wrap justify-center gap-3 pt-2">
						<Button type="button" onClick={() => router.push(customerDetailPath(createdCustomerId, "BUSINESS"))}>
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
					<Button type="button" onClick={() => void goNext()} disabled={submitting}>
						{submitting ? t("customer.wizard.nav.submitting") : step === RECAP_STEP ? t("customer.wizard.nav.finish") : t("customer.wizard.nav.next")}
					</Button>
				</div>
			)}
		</div>
	);
}
