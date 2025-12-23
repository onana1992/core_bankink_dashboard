"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Toast from "@/components/ui/Toast";
import { customersApi, accountsApi } from "@/lib/api";
import type {
	AddAddressRequest,
	AddRelatedPersonRequest,
	Address,
	Customer,
	Document,
	DocumentType,
	RelatedPerson,
	RelatedPersonRole,
	Account
} from "@/types";

export default function CustomerDetailPage() {
	const { t } = useTranslation();
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const id = useMemo(() => Number(params?.id), [params]);

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
	const [docFile, setDocFile] = useState<File | null>(null);
	const [docSubmitting, setDocSubmitting] = useState(false);
	const [reviewingDocId, setReviewingDocId] = useState<number | null>(null);
	const [reviewNote, setReviewNote] = useState<string>("");
	const [reviewSubmitting, setReviewSubmitting] = useState(false);

	const [kycSubmitting, setKycSubmitting] = useState<null | "submit" | "verify" | "reject">(null);
	const [verifyRisk, setVerifyRisk] = useState<number>(20);
	const [verifyPep, setVerifyPep] = useState<boolean>(false);
	const [rejectionReason, setRejectionReason] = useState<string>("");
	const [showRejectForm, setShowRejectForm] = useState<boolean>(false);

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

	const tabs = [
		{ id: "overview", label: t("customer.detail.tabs.overview") },
		{ id: "documents", label: t("customer.detail.tabs.documents") },
		{ id: "addresses", label: t("customer.detail.tabs.addresses") },
		...(customer?.type === "BUSINESS" ? [{ id: "related-persons", label: t("customer.detail.tabs.relatedPersons") }] : []),
		{ id: "kyc-actions", label: t("customer.detail.tabs.kycActions") },
		{ id: "accounts", label: t("customer.detail.tabs.accounts") }
	];

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

	// Trouver le document selfie
	const selfieDocument = documents.find(doc => doc.type === "SELFIE");
	const [selfieFile, setSelfieFile] = useState<File | null>(null);
	const [selfieUploading, setSelfieUploading] = useState(false);
	const [selfieError, setSelfieError] = useState(false);
	const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

	async function loadSelfieImage(documentId: number) {
		if (!id) return;
		try {
			const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
			const headers: HeadersInit = {};
			if (token) {
				headers["Authorization"] = `Bearer ${token}`;
			}
			const url = customersApi.getDocumentUrl(id, documentId);
			const response = await fetch(url, { headers });
			if (!response.ok) {
				throw new Error('Failed to load image');
			}
			const blob = await response.blob();
			const blobUrl = URL.createObjectURL(blob);
			setSelfieUrl(blobUrl);
			setSelfieError(false);
		} catch (e) {
			console.error('Error loading selfie image:', e);
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
			
			// Charger les personnes liées uniquement pour les clients BUSINESS
			if (customerData.type === "BUSINESS") {
				try {
					const rpData = await customersApi.getRelatedPersons(id);
					setRelatedPersons(rpData);
				} catch (e) {
					// Ignorer les erreurs si l'endpoint n'est pas disponible
					console.warn("Impossible de charger les personnes liées:", e);
				}
			}
			setFormData({
				displayName: customerData.displayName ?? "",
				firstName: customerData.firstName ?? "",
				lastName: customerData.lastName ?? "",
				email: customerData.email ?? "",
				phone: customerData.phone ?? ""
			});
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

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

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
			await customersApi.uploadDocument(id, docType, docFile);
			await load();
			setDocFile(null);
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
			const c = await customersApi.verifyKyc(id, { riskScore: verifyRisk, pep: verifyPep });
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
			setShowRejectForm(false);
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
			const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
			const headers: HeadersInit = {};
			if (token) {
				headers["Authorization"] = `Bearer ${token}`;
			}
			const url = customersApi.getDocumentUrl(id, documentId);
			const response = await fetch(url, { headers });
			if (!response.ok) {
				throw new Error('Failed to load document');
			}
			const blob = await response.blob();
			const blobUrl = URL.createObjectURL(blob);
			window.open(blobUrl, '_blank');
			// Nettoyer le blob URL après un délai pour libérer la mémoire
			setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
		} catch (e) {
			console.error('Error loading document:', e);
			const errorMsg = t("customer.detail.documents.uploadError");
			setError(errorMsg);
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
			<div className="flex items-center justify-center py-20">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
					<p className="text-gray-600">{t("customer.detail.loading")}</p>
				</div>
			</div>
		);
	}

	if (error && !customer) {
		return (
			<div className="space-y-4">
				<div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-r-md flex items-start gap-3">
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

	return (
		<div className="space-y-6">
			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					onClose={() => setToast(null)}
				/>
			)}
			
			{/* En-tête amélioré */}
			<div>
				<Link href="/customers" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("customer.detail.backToList")}
				</Link>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
							<svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
						</div>
						<div>
							<h1 className="text-3xl font-bold text-gray-900">
								{customer?.displayName || `${t("common.customers")} #${id}`}
							</h1>
							<p className="text-gray-600 mt-1">{t("customer.detail.subtitle")}</p>
						</div>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
							</svg>
							{t("customer.detail.back")}
						</Button>
						<Button variant="outline" onClick={load} className="flex items-center gap-2">
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							{t("common.refresh")}
						</Button>
					</div>
				</div>
				{error && (
					<div className="mt-4 bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{error}
					</div>
				)}
			</div>

			{/* Tabs */}
			<div className="border-b border-gray-200">
				<div className="flex gap-4 overflow-x-auto">
					{tabs.map(tab => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
								activeTab === tab.id
									? "border-gray-900 text-gray-900"
									: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* Tab Content */}
			<div className="mt-6">
				{activeTab === "overview" && (
					<div className="space-y-6">
						{/* Carte Selfie améliorée */}
			{customer && (
				<div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
					<div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
								<svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
								</svg>
							</div>
							<div>
								<h2 className="text-lg font-semibold text-gray-900">{t("customer.detail.photo.title")}</h2>
								<p className="text-xs text-gray-500">{t("customer.detail.photo.subtitle")}</p>
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
											className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-lg"
											onError={() => setSelfieError(true)}
											onLoad={() => setSelfieError(false)}
										/>
										{selfieDocument?.status === "APPROVED" && (
											<div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1.5 border-2 border-white shadow-md">
												<svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
													<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
												</svg>
											</div>
										)}
									</div>
								) : (
									<div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-gray-200 shadow-lg flex items-center justify-center">
										<svg className="w-20 h-20 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
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
												className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
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
											className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
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
						<div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-6">
					<div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
									<svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<div>
									<h2 className="text-lg font-semibold text-gray-900">{t("customer.detail.generalInfo.title")}</h2>
									<p className="text-xs text-gray-500">{t("customer.detail.generalInfo.subtitle")}</p>
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
						{loading && <div className="text-sm text-gray-500 text-center py-4">{t("common.loading")}</div>}
						{customer && (
							<>
								{!isEditing ? (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										{/* Colonne gauche */}
										<div className="space-y-4">
											{/* Nom affiché - Mise en avant */}
											<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
												<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t("customer.detail.generalInfo.displayName")}</dt>
												<dd className="font-semibold text-lg text-gray-900 mt-1">{customer.displayName}</dd>
											</div>
											
											{/* Identité */}
											<div className="space-y-3">
												{customer.type === "PERSON" && (customer.firstName || customer.lastName) && (
													<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
														<dt className="text-sm font-medium text-gray-700">{t("customer.detail.generalInfo.fullName")}</dt>
														<dd className="text-sm font-semibold text-gray-900">
															{customer.firstName} {customer.lastName}
														</dd>
													</div>
												)}
												<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
													<dt className="text-sm font-medium text-gray-700">Type</dt>
													<dd>
														<Badge variant={customer.type === "PERSON" ? "info" : "warning"}>{customer.type}</Badge>
													</dd>
												</div>
											</div>

											{/* Contact */}
											<div className="space-y-3">
												{customer.email && (
													<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
														<dt className="text-sm font-medium text-gray-700 flex items-center gap-2">
															<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
															</svg>
															{t("common.email")}
														</dt>
														<dd>
															<a
																href={`mailto:${customer.email}`}
																className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
															>
																{customer.email}
															</a>
														</dd>
													</div>
												)}
												{customer.phone && (
													<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
														<dt className="text-sm font-medium text-gray-700 flex items-center gap-2">
															<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
															</svg>
															{t("customer.detail.generalInfo.phone")}
														</dt>
														<dd>
															<a
																href={`tel:${customer.phone}`}
																className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
															>
																{customer.phone}
															</a>
														</dd>
													</div>
												)}
											</div>
										</div>

										{/* Colonne droite */}
										<div className="space-y-4">
											{/* KYC & Conformité */}
											<div className="space-y-3">
												<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
													<dt className="text-sm font-medium text-gray-700">Statut</dt>
													<dd>
														<Badge variant={statusBadgeVariant(customer.status)}>{customer.status}</Badge>
													</dd>
												</div>
												{typeof customer.riskScore === "number" && (
													<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
														<dt className="text-sm font-medium text-gray-700">{t("customer.detail.generalInfo.riskScore")}</dt>
														<dd>
															<Badge variant={riskBadgeVariant(customer.riskScore)}>{customer.riskScore}/100</Badge>
														</dd>
													</div>
												)}
												<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
													<dt className="text-sm font-medium text-gray-700">{t("customer.detail.generalInfo.pepPerson")}</dt>
													<dd>
														<Badge variant={customer.pepFlag ? "danger" : "success"}>
															{customer.pepFlag ? t("customer.detail.generalInfo.yes") : t("customer.detail.generalInfo.no")}
														</Badge>
													</dd>
												</div>
											</div>

											{/* Métadonnées */}
											{(customer.createdAt || customer.updatedAt) && (
												<div className="space-y-3 pt-3 border-t border-gray-200">
													{customer.createdAt && (
														<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
															<dt className="text-sm font-medium text-gray-700 flex items-center gap-2">
																<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
																</svg>
																{t("customer.detail.generalInfo.createdAt")}
															</dt>
															<dd className="text-sm text-gray-600">
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
														<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
															<dt className="text-sm font-medium text-gray-700 flex items-center gap-2">
																<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
																</svg>
																{t("customer.detail.generalInfo.updatedAt")}
															</dt>
															<dd className="text-sm text-gray-600">
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
												<div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
													<label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
													<div className="text-sm text-gray-900">{customer.type}</div>
												</div>
												<div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
													<label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
													<Badge variant={statusBadgeVariant(customer.status)}>{customer.status}</Badge>
												</div>
											</div>
										</div>
										<div className="flex gap-2 pt-2 border-t border-gray-200">
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

				{activeTab === "documents" && (
					<div className="space-y-6">
						{/* Carte Documents */}
						<div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
							<div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
								<svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
							</div>
							<div>
								<h2 className="text-lg font-semibold text-gray-900">{t("customer.detail.documents.title")}</h2>
								<p className="text-xs text-gray-500">{t("customer.detail.documents.subtitle")}</p>
							</div>
						</div>
					</div>
					<div className="p-6 space-y-6">
						{/* Formulaire d'upload - Pleine largeur */}
						<div>
							<h3 className="text-sm font-semibold text-gray-700 mb-3">{t("customer.detail.documents.upload")}</h3>
							<form onSubmit={submitDocument} className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div>
										<label className="block text-sm mb-1">{t("customer.detail.documents.fileType")}</label>
										<select
											className="w-full rounded-md border bg-white px-3 py-2 text-sm"
											value={docType}
											onChange={e => setDocType(e.target.value as DocumentType)}
										>
											<option value="ID_CARD">ID_CARD</option>
											<option value="PASSPORT">PASSPORT</option>
											<option value="PROOF_OF_ADDRESS">PROOF_OF_ADDRESS</option>
											<option value="REGISTRATION_DOC">REGISTRATION_DOC</option>
											<option value="SELFIE">SELFIE</option>
										</select>
									</div>
									<div>
										<label className="block text-sm mb-1">{t("customer.detail.documents.file")}</label>
										<div className="relative">
											<input
												type="file"
												id="file-upload"
												accept={docType === "SELFIE" ? "image/*" : undefined}
												onChange={e => setDocFile(e.target.files?.[0] ?? null)}
												className="hidden"
											/>
											<label
												htmlFor="file-upload"
												className="flex items-center justify-center w-full h-9 px-3 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
											>
												<svg
													className="w-4 h-4 mr-2"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													xmlns="http://www.w3.org/2000/svg"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
													/>
												</svg>
												{docFile ? docFile.name : t("customer.detail.documents.chooseFile")}
											</label>
										</div>
										{docFile && (
											<div className="mt-2 text-xs text-gray-600">
												{t("customer.detail.documents.fileSelected")}: <span className="font-medium">{docFile.name}</span>
											</div>
										)}
									</div>
									<div className="flex items-end">
										<Button type="submit" disabled={!docFile || docSubmitting} className="w-full">
											{docSubmitting ? t("customer.detail.documents.uploading") : t("customer.detail.documents.uploadButton")}
										</Button>
									</div>
								</div>
							</form>
						</div>

						{/* Liste des documents - 2 colonnes */}
						<div>
							<h3 className="text-sm font-semibold text-gray-700 mb-3">{t("customer.detail.documents.saved")}</h3>
							{documents.length === 0 ? (
								<div className="text-sm text-gray-500 py-4">{t("customer.detail.documents.none")}</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{documents.map(doc => (
									<div key={doc.id} className="bg-white rounded-lg p-4 border border-gray-200">
										<div className="flex items-start justify-between mb-3">
											<div className="flex items-center gap-2">
												<Badge variant={documentStatusBadgeVariant(doc.status)}>
													{doc.status}
												</Badge>
												<Badge variant="info">{doc.type}</Badge>
											</div>
											{doc.status === "PENDING" && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														setReviewingDocId(doc.id);
														setReviewNote("");
													}}
													disabled={reviewSubmitting}
												>
													{t("customer.detail.documents.review")}
												</Button>
											)}
										</div>
										<div className="space-y-3">
											<div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
												<div className="flex items-center gap-2 mb-2">
													<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
													</svg>
													<span className="font-semibold text-gray-900">{doc.fileName || t("customer.detail.documents.noName")}</span>
												</div>
												<button
													onClick={() => openDocument(doc.id)}
													className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
												>
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
													{t("customer.detail.documents.view")}
												</button>
											</div>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
												{doc.contentType && (
													<div className="flex items-center gap-2 text-gray-600">
														<svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
														</svg>
														<span>{t("customer.detail.documents.type")}: {doc.contentType}</span>
													</div>
												)}
												{doc.uploadedAt && (
													<div className="flex items-center gap-2 text-gray-600">
														<svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
														</svg>
														<span>{t("customer.detail.documents.uploadedAt")}: {new Date(doc.uploadedAt).toLocaleDateString("fr-FR", {
															year: "numeric",
															month: "short",
															day: "numeric",
															hour: "2-digit",
															minute: "2-digit"
														})}</span>
													</div>
												)}
												{doc.reviewedAt && (
													<div className="flex items-center gap-2 text-gray-600">
														<svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
														<span>{t("customer.detail.documents.reviewedAt")}: {new Date(doc.reviewedAt).toLocaleDateString("fr-FR", {
															year: "numeric",
															month: "short",
															day: "numeric",
															hour: "2-digit",
															minute: "2-digit"
														})}</span>
													</div>
												)}
											</div>
											{doc.reviewerNote && (
												<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
													<div className="flex items-start gap-2">
														<svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
														</svg>
														<div className="text-xs">
															<div className="font-semibold text-blue-900 mb-1">{t("customer.detail.documents.reviewerNote")}</div>
															<div className="text-blue-800">{doc.reviewerNote}</div>
														</div>
													</div>
												</div>
											)}
										</div>
										
										{/* Interface de revue */}
										{reviewingDocId === doc.id && (
											<div className="mt-3 pt-3 border-t border-gray-200">
												<div className="space-y-3">
													<div>
														<label className="block text-xs font-medium mb-1 text-gray-700">
															{t("customer.detail.documents.reviewerNote")}
														</label>
														<textarea
															value={reviewNote}
															onChange={e => setReviewNote(e.target.value)}
															placeholder={t("customer.detail.documents.reviewerNotePlaceholder")}
															className="w-full rounded-md border bg-white px-2 py-1.5 text-xs resize-none"
															rows={3}
														/>
													</div>
													<div className="flex gap-2">
									<Button
										size="sm"
										onClick={() => reviewDocument(doc.id, "APPROVED")}
										disabled={reviewSubmitting}
									>
										{reviewSubmitting ? "..." : t("customer.detail.documents.approve")}
									</Button>
														<Button
															size="sm"
															variant="outline"
															onClick={() => reviewDocument(doc.id, "REJECTED")}
															disabled={reviewSubmitting}
															className="border-red-300 text-red-700 hover:bg-red-50"
														>
															{reviewSubmitting ? "..." : t("customer.detail.documents.reject")}
														</Button>
														<Button
															size="sm"
															variant="ghost"
															onClick={() => {
																setReviewingDocId(null);
																setReviewNote("");
															}}
															disabled={reviewSubmitting}
														>
															{t("customer.detail.generalInfo.cancel")}
														</Button>
													</div>
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

				{activeTab === "addresses" && (
					<div className="space-y-6">
						<div className="grid gap-6 md:grid-cols-2">
							{/* Carte Adresses */}
							<div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
								<div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
											<svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
											</svg>
										</div>
										<div>
											<h2 className="text-lg font-semibold text-gray-900">{t("customer.detail.addresses.title")}</h2>
											<p className="text-xs text-gray-500">{t("customer.detail.addresses.subtitle")}</p>
										</div>
									</div>
								</div>
								<div className="p-6">
									{addresses.length === 0 ? (
										<div className="text-sm text-gray-500 py-4">{t("customer.detail.addresses.none")}</div>
									) : (
										<div className="space-y-3">
											{addresses.map(addr => (
												<div key={addr.id} className="border rounded-md p-3 bg-gray-50">
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
															<div className="bg-white rounded-lg p-4 border border-gray-200 space-y-2">
																<div className="flex items-center gap-2">
																	<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
																	</svg>
																	<span className="font-semibold text-gray-900">{addr.line1}</span>
																</div>
																{addr.line2 && (
																	<div className="text-sm text-gray-600 pl-6">{addr.line2}</div>
																)}
																<div className="text-sm text-gray-600 pl-6">
																	{addr.city}
																	{addr.state && `, ${addr.state}`}
																	{addr.postalCode && ` ${addr.postalCode}`}
																</div>
																<div className="flex items-center gap-2 pl-6">
																	<svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
																	</svg>
																	<span className="text-xs font-medium text-gray-500">{addr.country}</span>
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
							<form onSubmit={submitAddress} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
								<div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
											<svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
											</svg>
										</div>
										<div>
											<h2 className="text-lg font-semibold text-gray-900">{t("customer.detail.addresses.add")}</h2>
											<p className="text-xs text-gray-500">{t("customer.detail.addresses.addSubtitle")}</p>
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
				)}

				{activeTab === "related-persons" && customer && customer.type === "BUSINESS" && (
					<div className="space-y-6">
						{/* Section Related Persons */}
						<div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
							<div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
										<svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
										</svg>
									</div>
									<div>
										<h2 className="text-lg font-semibold text-gray-900">{t("customer.detail.relatedPersons.title")}</h2>
										<p className="text-xs text-gray-500">{t("customer.detail.relatedPersons.subtitle")}</p>
									</div>
								</div>
							</div>
							<div className="p-6">
								{/* Formulaire d'ajout */}
								<div className="border-b border-gray-200 pb-4 mb-4">
									<h3 className="text-sm font-semibold text-gray-700 mb-3">
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
								<h3 className="text-sm font-semibold text-gray-700 mb-3">{t("customer.detail.relatedPersons.saved")}</h3>
								{relatedPersons.length === 0 ? (
									<div className="text-sm text-gray-500 py-4">{t("customer.detail.relatedPersons.none")}</div>
								) : (
									<div className="space-y-3">
										{relatedPersons.map(rp => (
											<div key={rp.id} className="bg-white rounded-lg p-4 border border-gray-200">
												<div className="flex items-start justify-between mb-3">
													<div className="flex items-center gap-2">
														<Badge variant="info">{rp.role}</Badge>
														<span className="text-sm font-semibold text-gray-900">
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
												<div className="bg-gray-50 rounded-lg p-3 border border-gray-100 space-y-2">
													{rp.dateOfBirth && (
														<div className="flex items-center gap-2 text-xs text-gray-600">
															<svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
															</svg>
															<span>{t("customer.detail.relatedPersons.dateOfBirth")}: {new Date(rp.dateOfBirth).toLocaleDateString("fr-FR")}</span>
														</div>
													)}
													{rp.nationalId && (
														<div className="flex items-center gap-2 text-xs text-gray-600">
															<svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
															</svg>
															<span>{t("customer.detail.relatedPersons.nationalId")}: {rp.nationalId}</span>
														</div>
													)}
													{rp.ownershipPercent !== null && rp.ownershipPercent !== undefined && (
														<div className="flex items-center gap-2 text-xs text-gray-600">
															<svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
															</svg>
															<span>{t("customer.detail.relatedPersons.ownershipPercent")}: <span className="font-semibold">{rp.ownershipPercent}%</span></span>
														</div>
													)}
													<div className="flex items-center gap-2 text-xs">
														<svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
														</svg>
														<span className="text-gray-600">PEP: </span>
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

				{activeTab === "kyc-actions" && (
					<div className="space-y-6">
						{/* Carte Actions KYC */}
						<div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
					<div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
								<svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
							</div>
							<div>
								<h2 className="text-lg font-semibold text-gray-900">{t("customer.detail.kyc.title")}</h2>
								<p className="text-xs text-gray-500">{t("customer.detail.kyc.subtitle")}</p>
							</div>
						</div>
					</div>
					<div className="p-6 space-y-6">
						{/* Section: Soumettre KYC */}
						<div className="bg-white rounded-lg p-4 border border-gray-200">
							<div className="flex items-center gap-2 mb-3">
								<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
								<h3 className="text-sm font-semibold text-gray-900">{t("customer.detail.kyc.submit.title")}</h3>
							</div>
							<p className="text-xs text-gray-600 mb-4">{t("customer.detail.kyc.submit.description")}</p>
							<Button onClick={doSubmitKyc} disabled={kycSubmitting !== null} className="w-full md:w-auto">
								{kycSubmitting === "submit" ? t("customer.detail.kyc.submit.submitting") : t("customer.detail.kyc.submit.button")}
							</Button>
						</div>

						{/* Section: Vérifier KYC */}
						<div className="bg-white rounded-lg p-4 border border-gray-200">
							<div className="flex items-center gap-2 mb-3">
								<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<h3 className="text-sm font-semibold text-gray-900">{t("customer.detail.kyc.verify.title")}</h3>
							</div>
							<p className="text-xs text-gray-600 mb-4">{t("customer.detail.kyc.verify.description")}</p>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label className="block text-xs font-medium mb-2 text-gray-700 flex items-center gap-1">
										<svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
										</svg>
										{t("customer.detail.kyc.verify.riskScore")}
									</label>
									<Input
										type="number"
										min="0"
										max="100"
										value={verifyRisk}
										onChange={e => setVerifyRisk(Number(e.target.value))}
										className="w-full"
									/>
								</div>
								<div className="flex items-end">
									<div className="flex items-center gap-2 w-full p-3 bg-gray-50 rounded-lg border border-gray-200">
										<input
											type="checkbox"
											id="pep-flag"
											checked={verifyPep}
											onChange={e => setVerifyPep(e.target.checked)}
											className="w-4 h-4 text-blue-600"
										/>
										<label htmlFor="pep-flag" className="text-xs font-medium text-gray-700 cursor-pointer">
											{t("customer.detail.kyc.verify.pepFlag")}
										</label>
									</div>
								</div>
								<div className="flex items-end">
									<Button 
										onClick={doVerifyKyc} 
										disabled={kycSubmitting !== null}
										className="w-full"
									>
										{kycSubmitting === "verify" ? t("customer.detail.kyc.verify.verifying") : t("customer.detail.kyc.verify.button")}
									</Button>
								</div>
							</div>
						</div>

						{/* Section: Rejeter KYC */}
						<div className="bg-white rounded-lg p-4 border border-gray-200">
							<div className="flex items-center gap-2 mb-3">
								<svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
								<h3 className="text-sm font-semibold text-gray-900">{t("customer.detail.kyc.reject.title")}</h3>
							</div>
							<p className="text-xs text-gray-600 mb-4">{t("customer.detail.kyc.reject.description")}</p>
							{!showRejectForm ? (
								<Button 
									variant="outline" 
									onClick={() => setShowRejectForm(true)} 
									disabled={kycSubmitting !== null}
									className="border-red-300 text-red-700 hover:bg-red-50 w-full md:w-auto"
								>
									{t("customer.detail.kyc.reject.button")}
								</Button>
							) : (
								<div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
									<div>
										<label className="block text-xs font-medium mb-2 text-gray-700 flex items-center gap-1">
											{t("customer.detail.kyc.reject.reason")} <span className="text-red-600">*</span>
										</label>
										<textarea
											value={rejectionReason}
											onChange={e => setRejectionReason(e.target.value)}
											placeholder={t("customer.detail.kyc.reject.reasonPlaceholder")}
											className="w-full rounded-md border bg-white px-3 py-2 text-sm resize-none"
											rows={3}
										/>
										<p className="text-xs text-gray-500 mt-1">{t("customer.detail.kyc.reject.reasonHint")}</p>
									</div>
									<div className="flex gap-2">
										<Button 
											onClick={doRejectKyc} 
											disabled={kycSubmitting !== null || !rejectionReason.trim()}
											variant="outline"
											className="border-red-300 text-red-700 hover:bg-red-50"
										>
											{kycSubmitting === "reject" ? t("customer.detail.kyc.reject.rejecting") : t("customer.detail.kyc.reject.confirm")}
										</Button>
										<Button 
											variant="outline" 
											onClick={() => {
												setShowRejectForm(false);
												setRejectionReason("");
											}} 
											disabled={kycSubmitting !== null}
										>
											{t("customer.detail.generalInfo.cancel")}
										</Button>
									</div>
								</div>
							)}
						</div>

						{/* Affichage du motif de refus précédent */}
						{customer?.rejectionReason && (
							<div className="bg-white rounded-lg p-4 border border-red-200">
								<div className="flex items-center gap-2 mb-3">
									<svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
									</svg>
									<h3 className="text-sm font-semibold text-gray-900">{t("customer.detail.kyc.reject.previousReason")}</h3>
								</div>
								<div className="text-sm text-gray-700 p-3 bg-red-50 border border-red-200 rounded-lg">
									{customer.rejectionReason}
								</div>
							</div>
						)}
					</div>
				</div>
					</div>
				)}

				{activeTab === "accounts" && (
					<div className="space-y-6">
						{/* Section Comptes */}
						<div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
				<div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
								<svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
								</svg>
							</div>
							<div>
								<h2 className="text-lg font-semibold text-gray-900">{t("customer.detail.accounts.title")}</h2>
								<p className="text-xs text-gray-500">{t("customer.detail.accounts.subtitle")}</p>
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
						<div className="text-sm text-gray-500 py-8 text-center">
							<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
							</svg>
							<p className="text-gray-500 text-lg font-medium">{t("customer.detail.accounts.none")}</p>
							<p className="text-gray-400 text-sm mt-2">{t("customer.detail.accounts.noneHint")}</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											{t("customer.detail.accounts.accountNumber")}
										</th>
										<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											{t("common.status")}
										</th>
										<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											{t("customer.detail.accounts.currency")}
										</th>
										<th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
											{t("customer.detail.accounts.balance")}
										</th>
										<th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
											{t("customer.detail.accounts.availableBalance")}
										</th>
										<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											{t("customer.detail.accounts.openingDate")}
										</th>
										<th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
											{t("customer.table.actions")}
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{accounts.map((account) => {
										const statusColors: Record<Account["status"], string> = {
											ACTIVE: "bg-green-100 text-green-800",
											CLOSED: "bg-gray-100 text-gray-800",
											FROZEN: "bg-blue-100 text-blue-800",
											SUSPENDED: "bg-yellow-100 text-yellow-800"
										};
										const statusLabels: Record<Account["status"], string> = {
											ACTIVE: t("common.status") + " - ACTIVE",
											CLOSED: t("common.status") + " - CLOSED",
											FROZEN: t("common.status") + " - FROZEN",
											SUSPENDED: t("common.status") + " - SUSPENDED"
										};
										return (
											<tr key={account.id} className="hover:bg-gray-50 transition-colors">
												<td className="px-6 py-4 whitespace-nowrap">
													<Link
														href={`/accounts/${account.id}`}
														className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium"
													>
														{account.accountNumber}
													</Link>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<Badge className={statusColors[account.status]}>
														{statusLabels[account.status]}
													</Badge>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
														{account.currency}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right">
													<span className={`font-mono font-semibold ${account.balance >= 0 ? "text-gray-900" : "text-red-600"}`}>
														{new Intl.NumberFormat("fr-FR", {
															style: "currency",
															currency: account.currency || "XAF"
														}).format(account.balance)}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right">
													<span className={`font-mono font-semibold ${account.availableBalance >= 0 ? "text-gray-900" : "text-red-600"}`}>
														{new Intl.NumberFormat("fr-FR", {
															style: "currency",
															currency: account.currency || "XAF"
														}).format(account.availableBalance)}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-gray-600">
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
	);
}


