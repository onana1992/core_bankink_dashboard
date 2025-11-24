"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Toast from "@/components/ui/Toast";
import { customersApi } from "@/lib/api";
import type {
	AddAddressRequest,
	AddRelatedPersonRequest,
	Address,
	Customer,
	Document,
	DocumentType,
	RelatedPerson,
	RelatedPersonRole
} from "@/types";

export default function CustomerDetailPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const id = useMemo(() => Number(params?.id), [params]);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [customer, setCustomer] = useState<Customer | null>(null);
	const [addresses, setAddresses] = useState<Address[]>([]);
	const [documents, setDocuments] = useState<Document[]>([]);
	const [relatedPersons, setRelatedPersons] = useState<RelatedPerson[]>([]);
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
	const selfieUrl = selfieDocument ? customersApi.getDocumentUrl(id!, selfieDocument.id) : null;
	const [selfieFile, setSelfieFile] = useState<File | null>(null);
	const [selfieUploading, setSelfieUploading] = useState(false);

	async function load() {
		if (!id) return;
		setLoading(true);
		setError(null);
		try {
			const [customerData, addressesData, documentsData] = await Promise.all([
				customersApi.get(id),
				customersApi.getAddresses(id),
				customersApi.getDocuments(id)
			]);
			setCustomer(customerData);
			setAddresses(addressesData);
			setDocuments(documentsData);
			
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
			setError(e?.message ?? "Erreur inconnue");
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
			setError(e?.message ?? "Erreur lors de la sauvegarde");
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

	async function submitAddress(e: React.FormEvent) {
		e.preventDefault();
		if (!id) return;
		
		// Validation côté client
		if (!addr.line1?.trim()) {
			setError("La ligne 1 est requise");
			return;
		}
		if (!addr.city?.trim()) {
			setError("La ville est requise");
			return;
		}
		if (!addr.country?.trim()) {
			setError("Le pays est requis");
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
			setError(e?.message ?? "Erreur lors de l'ajout de l'adresse");
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
			setError("La ligne 1 est requise");
			return;
		}
		if (!editAddr.city?.trim()) {
			setError("La ville est requise");
			return;
		}
		if (!editAddr.country?.trim()) {
			setError("Le pays est requis");
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
			setError(e?.message ?? "Erreur lors de la modification de l'adresse");
		} finally {
			setAddrSubmitting(false);
		}
	}

	async function submitDocument(e: React.FormEvent) {
		e.preventDefault();
		if (!id || !docFile) return;
		
		// Validation: le selfie doit être une image
		if (docType === "SELFIE" && !docFile.type.startsWith("image/")) {
			setError("Le selfie doit être une image (JPEG, PNG, etc.)");
			setToast({ message: "Le selfie doit être une image", type: "error" });
			return;
		}
		
		setDocSubmitting(true);
		setError(null);
		try {
			await customersApi.uploadDocument(id, docType, docFile);
			await load();
			setDocFile(null);
			setToast({ message: "Document uploadé avec succès", type: "success" });
		} catch (e: any) {
			const errorMessage = e?.message ?? "Erreur lors de l'upload du document";
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
			setError("Le selfie doit être une image (JPEG, PNG, etc.)");
			setToast({ message: "Le selfie doit être une image", type: "error" });
			return;
		}
		
		setSelfieUploading(true);
		setError(null);
		try {
			await customersApi.uploadDocument(id, "SELFIE", selfieFile);
			await load();
			setSelfieFile(null);
			setToast({ message: "Selfie uploadé avec succès", type: "success" });
		} catch (e: any) {
			const errorMessage = e?.message ?? "Erreur lors de l'upload du selfie";
			setError(errorMessage);
			setToast({ message: errorMessage, type: "error" });
		} finally {
			setSelfieUploading(false);
		}
	}

	async function doSubmitKyc() {
		if (!id) return;
		setKycSubmitting("submit");
		try {
			const c = await customersApi.submitKyc(id);
			setCustomer(c);
		} finally {
			setKycSubmitting(null);
		}
	}
	async function doVerifyKyc() {
		if (!id) return;
		setKycSubmitting("verify");
		try {
			const c = await customersApi.verifyKyc(id, { riskScore: verifyRisk, pep: verifyPep });
			setCustomer(c);
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
			setToast({ message: "KYC rejeté avec succès", type: "success" });
		} catch (e: any) {
			const errorMessage = e?.message ?? "Erreur lors du rejet du KYC";
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
			setError("Le prénom est requis");
			return;
		}
		if (!rpForm.lastName?.trim()) {
			setError("Le nom de famille est requis");
			return;
		}
		if (rpForm.role === "UBO" && !rpForm.ownershipPercent) {
			setError("Le pourcentage de détention est requis pour un UBO");
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
			setToast({ message: "Personne liée ajoutée avec succès", type: "success" });
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de l'ajout de la personne liée");
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
			setError("Le prénom est requis");
			return;
		}
		if (!editRpForm.lastName?.trim()) {
			setError("Le nom de famille est requis");
			return;
		}
		if (editRpForm.role === "UBO" && !editRpForm.ownershipPercent) {
			setError("Le pourcentage de détention est requis pour un UBO");
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
			setToast({ message: "Personne liée mise à jour avec succès", type: "success" });
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la modification de la personne liée");
		} finally {
			setRpSubmitting(false);
		}
	}

	async function deleteRelatedPerson(rpId: number) {
		if (!id) return;
		if (!confirm("Êtes-vous sûr de vouloir supprimer cette personne liée ?")) return;
		
		setRpSubmitting(true);
		setError(null);
		try {
			await customersApi.deleteRelatedPerson(id, rpId);
			const updated = await customersApi.getRelatedPersons(id);
			setRelatedPersons(updated);
			setToast({ message: "Personne liée supprimée avec succès", type: "success" });
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la suppression de la personne liée");
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
				message: status === "APPROVED" ? "Document approuvé avec succès" : "Document rejeté", 
				type: "success" 
			});
		} catch (e: any) {
			const errorMessage = e?.message ?? "Erreur lors de la revue du document";
			setError(errorMessage);
			setToast({ message: errorMessage, type: "error" });
		} finally {
			setReviewSubmitting(false);
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

	return (
		<div className="space-y-6">
			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					onClose={() => setToast(null)}
				/>
			)}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Client #{id}</h1>
					{error && (
						<div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
							<div className="text-sm font-medium text-red-800">Erreur</div>
							<div className="text-sm text-red-600 mt-1">{error}</div>
						</div>
					)}
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => router.back()}>Retour</Button>
					<Button variant="outline" onClick={load}>Rafraîchir</Button>
				</div>
			</div>

			{/* Carte Selfie */}
			{customer && (
				<div className="rounded-md border bg-white p-6">
					<div className="flex items-center gap-6">
						<div className="flex-shrink-0">
							{selfieUrl && id ? (
								<div className="relative">
									<img
										src={selfieUrl}
										alt="Selfie du client"
										className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
									/>
									{selfieDocument?.status === "APPROVED" && (
										<div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1.5 border-2 border-white">
											<svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
												<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
											</svg>
										</div>
									)}
								</div>
							) : (
								<div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-gray-200 flex items-center justify-center">
									<svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
								</div>
							)}
						</div>
						<div className="flex-1">
							<h2 className="text-lg font-semibold mb-2">
								{customer.displayName || "Client"}
							</h2>
							<div className="flex items-center gap-2 mb-4">
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
											className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
										>
											<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
											</svg>
											{selfieFile ? selfieFile.name : "Uploader un selfie"}
										</label>
									</div>
									{selfieFile && (
										<Button type="submit" disabled={selfieUploading} size="sm">
											{selfieUploading ? "Upload..." : "Envoyer"}
										</Button>
									)}
								</form>
							) : (
								<div className="flex items-center gap-2">
									<a
										href={selfieUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="text-sm text-blue-600 hover:text-blue-800 underline"
									>
										Voir le selfie
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
			)}

			<div className="grid gap-6 md:grid-cols-2">
				<div className="space-y-4 rounded-md border bg-white p-4">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-medium">Informations</h2>
						{!isEditing && customer && (
							<Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
								Modifier
							</Button>
						)}
					</div>
					{loading && <div className="text-sm text-gray-500">Chargement...</div>}
					{customer && (
						<>
							{!isEditing ? (
								<div className="space-y-6">
									{/* Section Identité */}
									<div className="space-y-3">
										<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Identité</h3>
										<div className="grid grid-cols-1 gap-4 pl-2">
											<div className="flex items-start justify-between py-2 border-b border-gray-100">
												<span className="text-sm font-medium text-gray-600 min-w-[140px]">Nom affiché</span>
												<span className="text-sm text-gray-900 font-semibold text-right flex-1">{customer.displayName}</span>
											</div>
											{customer.type === "PERSON" && (customer.firstName || customer.lastName) && (
												<div className="flex items-start justify-between py-2 border-b border-gray-100">
													<span className="text-sm font-medium text-gray-600 min-w-[140px]">Nom complet</span>
													<span className="text-sm text-gray-900 text-right flex-1">
														{customer.firstName} {customer.lastName}
													</span>
												</div>
											)}
											<div className="flex items-start justify-between py-2 border-b border-gray-100">
												<span className="text-sm font-medium text-gray-600 min-w-[140px]">Type</span>
												<span className="text-sm text-gray-900 text-right flex-1">
													<Badge variant={customer.type === "PERSON" ? "info" : "warning"}>{customer.type}</Badge>
												</span>
											</div>
										</div>
									</div>

									{/* Section Contact */}
									<div className="space-y-3">
										<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact</h3>
										<div className="grid grid-cols-1 gap-4 pl-2">
											{customer.email && (
												<div className="flex items-start justify-between py-2 border-b border-gray-100">
													<span className="text-sm font-medium text-gray-600 min-w-[140px]">Email</span>
													<a
														href={`mailto:${customer.email}`}
														className="text-sm text-blue-600 hover:text-blue-800 text-right flex-1 break-all"
													>
														{customer.email}
													</a>
												</div>
											)}
											{customer.phone && (
												<div className="flex items-start justify-between py-2 border-b border-gray-100">
													<span className="text-sm font-medium text-gray-600 min-w-[140px]">Téléphone</span>
													<a
														href={`tel:${customer.phone}`}
														className="text-sm text-blue-600 hover:text-blue-800 text-right flex-1"
													>
														{customer.phone}
													</a>
												</div>
											)}
										</div>
									</div>

									{/* Section KYC & Conformité */}
									<div className="space-y-3">
										<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">KYC & Conformité</h3>
										<div className="grid grid-cols-1 gap-4 pl-2">
											<div className="flex items-start justify-between py-2 border-b border-gray-100">
												<span className="text-sm font-medium text-gray-600 min-w-[140px]">Statut</span>
												<span className="text-right flex-1">
													<Badge variant={statusBadgeVariant(customer.status)}>{customer.status}</Badge>
												</span>
											</div>
											{typeof customer.riskScore === "number" && (
												<div className="flex items-start justify-between py-2 border-b border-gray-100">
													<span className="text-sm font-medium text-gray-600 min-w-[140px]">Score de risque</span>
													<span className="text-right flex-1">
														<Badge variant={riskBadgeVariant(customer.riskScore)}>{customer.riskScore}/100</Badge>
													</span>
												</div>
											)}
											<div className="flex items-start justify-between py-2 border-b border-gray-100">
												<span className="text-sm font-medium text-gray-600 min-w-[140px]">Personne PEP</span>
												<span className="text-right flex-1">
													<Badge variant={customer.pepFlag ? "danger" : "success"}>
														{customer.pepFlag ? "Oui" : "Non"}
													</Badge>
												</span>
											</div>
										</div>
									</div>

									{/* Section Métadonnées */}
									{(customer.createdAt || customer.updatedAt) && (
										<div className="space-y-3 pt-2 border-t border-gray-200">
											<h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Métadonnées</h3>
											<div className="grid grid-cols-1 gap-4 pl-2">
												{customer.createdAt && (
													<div className="flex items-start justify-between py-2">
														<span className="text-sm font-medium text-gray-600 min-w-[140px]">Créé le</span>
														<span className="text-sm text-gray-500 text-right flex-1">
															{new Date(customer.createdAt).toLocaleDateString("fr-FR", {
																year: "numeric",
																month: "long",
																day: "numeric",
																hour: "2-digit",
																minute: "2-digit"
															})}
														</span>
													</div>
												)}
												{customer.updatedAt && (
													<div className="flex items-start justify-between py-2">
														<span className="text-sm font-medium text-gray-600 min-w-[140px]">Modifié le</span>
														<span className="text-sm text-gray-500 text-right flex-1">
															{new Date(customer.updatedAt).toLocaleDateString("fr-FR", {
																year: "numeric",
																month: "long",
																day: "numeric",
																hour: "2-digit",
																minute: "2-digit"
															})}
														</span>
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							) : (
								<form
									onSubmit={e => {
										e.preventDefault();
										handleSave();
									}}
									className="space-y-4"
								>
									<div className="grid grid-cols-1 gap-4">
										<div>
											<label className="block text-sm font-medium mb-1">Nom affiché *</label>
											<Input
												value={formData.displayName}
												onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
												required
											/>
										</div>
										{customer.type === "PERSON" && (
											<>
												<div>
													<label className="block text-sm font-medium mb-1">Prénom</label>
													<Input
														value={formData.firstName}
														onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
													/>
												</div>
												<div>
													<label className="block text-sm font-medium mb-1">Nom de famille</label>
													<Input
														value={formData.lastName}
														onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
													/>
												</div>
											</>
										)}
										<div>
											<label className="block text-sm font-medium mb-1">Email</label>
											<Input
												type="email"
												value={formData.email}
												onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
											/>
										</div>
										<div>
											<label className="block text-sm font-medium mb-1">Téléphone</label>
											<Input
												value={formData.phone}
												onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
											/>
										</div>
										<div className="text-sm text-gray-500">
											<div className="font-medium mb-1">Type</div>
											<div>{customer.type}</div>
										</div>
										<div className="text-sm text-gray-500">
											<div className="font-medium mb-1">Statut</div>
											<Badge variant={statusBadgeVariant(customer.status)}>{customer.status}</Badge>
										</div>
									</div>
									<div className="flex gap-2 pt-2">
										<Button type="submit" disabled={saving}>
											{saving ? "Sauvegarde..." : "Enregistrer"}
										</Button>
										<Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
											Annuler
										</Button>
									</div>
								</form>
							)}
						</>
					)}
				</div>

				<div className="space-y-4 rounded-md border bg-white p-4">
					<h2 className="text-lg font-medium">Documents</h2>
					
					{/* Formulaire d'upload */}
					<div className="border-b border-gray-200 pb-4 mb-4">
						<h3 className="text-sm font-semibold text-gray-700 mb-3">Uploader un document</h3>
						<form onSubmit={submitDocument} className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm mb-1">Type</label>
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
									<label className="block text-sm mb-1">Fichier</label>
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
											{docFile ? docFile.name : "Choisir un fichier"}
										</label>
									</div>
									{docFile && (
										<div className="mt-2 text-xs text-gray-600">
											Fichier sélectionné: <span className="font-medium">{docFile.name}</span>
										</div>
									)}
								</div>
							</div>
							<div className="flex gap-2">
								<Button type="submit" disabled={!docFile || docSubmitting}>
									{docSubmitting ? "Envoi..." : "Uploader"}
								</Button>
							</div>
						</form>
					</div>

					{/* Liste des documents */}
					<div>
						<h3 className="text-sm font-semibold text-gray-700 mb-3">Documents enregistrés</h3>
						{documents.length === 0 ? (
							<div className="text-sm text-gray-500 py-4">Aucun document enregistré</div>
						) : (
							<div className="space-y-3">
								{documents.map(doc => (
									<div key={doc.id} className="border rounded-md p-3 bg-gray-50">
										<div className="flex items-start justify-between mb-2">
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
													Réviser
												</Button>
											)}
										</div>
										<div className="text-sm space-y-1">
											<div className="flex items-center gap-2">
												<span className="font-medium">{doc.fileName || "Sans nom"}</span>
												<a
													href={customersApi.getDocumentUrl(id!, doc.id)}
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-600 hover:text-blue-800 text-xs underline"
												>
													Voir
												</a>
											</div>
											{doc.contentType && (
												<div className="text-gray-600 text-xs">Type: {doc.contentType}</div>
											)}
											{doc.uploadedAt && (
												<div className="text-gray-500 text-xs">
													Uploadé le: {new Date(doc.uploadedAt).toLocaleDateString("fr-FR", {
														year: "numeric",
														month: "long",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit"
													})}
												</div>
											)}
											{doc.reviewedAt && (
												<div className="text-gray-500 text-xs">
													Révisé le: {new Date(doc.reviewedAt).toLocaleDateString("fr-FR", {
														year: "numeric",
														month: "long",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit"
													})}
												</div>
											)}
											{doc.reviewerNote && (
												<div className="text-gray-600 text-xs mt-2 p-2 bg-white rounded border">
													<strong>Note du réviseur:</strong> {doc.reviewerNote}
												</div>
											)}
										</div>
										
										{/* Interface de revue */}
										{reviewingDocId === doc.id && (
											<div className="mt-3 pt-3 border-t border-gray-200">
												<div className="space-y-3">
													<div>
														<label className="block text-xs font-medium mb-1 text-gray-700">
															Note du réviseur (optionnelle)
														</label>
														<textarea
															value={reviewNote}
															onChange={e => setReviewNote(e.target.value)}
															placeholder="Ajouter une note explicative..."
															className="w-full rounded-md border bg-white px-2 py-1.5 text-xs resize-none"
															rows={3}
														/>
													</div>
													<div className="flex gap-2">
														<Button
															size="sm"
															onClick={() => reviewDocument(doc.id, "APPROVED")}
															disabled={reviewSubmitting}
															className="bg-green-600 hover:bg-green-700"
														>
															{reviewSubmitting ? "..." : "Approuver"}
														</Button>
														<Button
															size="sm"
															variant="outline"
															onClick={() => reviewDocument(doc.id, "REJECTED")}
															disabled={reviewSubmitting}
															className="border-red-300 text-red-700 hover:bg-red-50"
														>
															{reviewSubmitting ? "..." : "Rejeter"}
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
															Annuler
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

				{/* Section Related Persons (uniquement pour BUSINESS) */}
				{customer && customer.type === "BUSINESS" && (
					<div className="space-y-4 rounded-md border bg-white p-4">
						<h2 className="text-lg font-medium">Personnes liées</h2>
						
						{/* Formulaire d'ajout */}
						<div className="border-b border-gray-200 pb-4 mb-4">
							<h3 className="text-sm font-semibold text-gray-700 mb-3">
								{editingRpId ? "Modifier une personne liée" : "Ajouter une personne liée"}
							</h3>
							{editingRpId && editRpForm ? (
								<form onSubmit={submitEditRelatedPerson} className="space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm mb-1">Rôle *</label>
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
											<label className="block text-sm mb-1">Prénom *</label>
											<Input
												value={editRpForm.firstName}
												onChange={e => setEditRpForm(prev => prev ? ({ ...prev, firstName: e.target.value }) : null)}
												required
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">Nom de famille *</label>
											<Input
												value={editRpForm.lastName}
												onChange={e => setEditRpForm(prev => prev ? ({ ...prev, lastName: e.target.value }) : null)}
												required
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">Date de naissance</label>
											<Input
												type="date"
												value={editRpForm.dateOfBirth}
												onChange={e => setEditRpForm(prev => prev ? ({ ...prev, dateOfBirth: e.target.value }) : null)}
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">Identifiant national</label>
											<Input
												value={editRpForm.nationalId || ""}
												onChange={e => setEditRpForm(prev => prev ? ({ ...prev, nationalId: e.target.value }) : null)}
											/>
										</div>
										{editRpForm.role === "UBO" && (
											<div>
												<label className="block text-sm mb-1">Pourcentage de détention *</label>
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
												Personne politiquement exposée (PEP)
											</label>
										</div>
									</div>
									<div className="flex gap-2">
										<Button type="submit" disabled={rpSubmitting}>
											{rpSubmitting ? "Sauvegarde..." : "Enregistrer"}
										</Button>
										<Button type="button" variant="outline" onClick={cancelEditRelatedPerson} disabled={rpSubmitting}>
											Annuler
										</Button>
									</div>
								</form>
							) : (
								<form onSubmit={submitRelatedPerson} className="space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm mb-1">Rôle *</label>
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
											<label className="block text-sm mb-1">Prénom *</label>
											<Input
												value={rpForm.firstName}
												onChange={e => setRpForm(prev => ({ ...prev, firstName: e.target.value }))}
												required
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">Nom de famille *</label>
											<Input
												value={rpForm.lastName}
												onChange={e => setRpForm(prev => ({ ...prev, lastName: e.target.value }))}
												required
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">Date de naissance</label>
											<Input
												type="date"
												value={rpForm.dateOfBirth}
												onChange={e => setRpForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
											/>
										</div>
										<div>
											<label className="block text-sm mb-1">Identifiant national</label>
											<Input
												value={rpForm.nationalId}
												onChange={e => setRpForm(prev => ({ ...prev, nationalId: e.target.value }))}
											/>
										</div>
										{rpForm.role === "UBO" && (
											<div>
												<label className="block text-sm mb-1">Pourcentage de détention *</label>
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
												Personne politiquement exposée (PEP)
											</label>
										</div>
									</div>
									<div className="flex gap-2">
										<Button type="submit" disabled={rpSubmitting}>
											{rpSubmitting ? "Ajout..." : "Ajouter"}
										</Button>
									</div>
								</form>
							)}
						</div>

						{/* Liste des personnes liées */}
						<div>
							<h3 className="text-sm font-semibold text-gray-700 mb-3">Personnes liées enregistrées</h3>
							{relatedPersons.length === 0 ? (
								<div className="text-sm text-gray-500 py-4">Aucune personne liée enregistrée</div>
							) : (
								<div className="space-y-3">
									{relatedPersons.map(rp => (
										<div key={rp.id} className="border rounded-md p-3 bg-gray-50">
											<div className="flex items-start justify-between mb-2">
												<div className="flex items-center gap-2">
													<Badge variant="info">{rp.role}</Badge>
													<span className="text-sm font-medium">
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
														Modifier
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() => deleteRelatedPerson(rp.id)}
														disabled={rpSubmitting}
														className="border-red-300 text-red-700 hover:bg-red-50"
													>
														Supprimer
													</Button>
												</div>
											</div>
											<div className="text-xs text-gray-600 space-y-1">
												{rp.dateOfBirth && (
													<div>Date de naissance: {new Date(rp.dateOfBirth).toLocaleDateString("fr-FR")}</div>
												)}
												{rp.nationalId && <div>ID National: {rp.nationalId}</div>}
												{rp.ownershipPercent !== null && rp.ownershipPercent !== undefined && (
													<div>Détention: {rp.ownershipPercent}%</div>
												)}
												<div>PEP: {rp.pepFlag ? "Oui" : "Non"}</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<div className="space-y-4 rounded-md border bg-white p-4">
					<h2 className="text-lg font-medium">Adresses enregistrées</h2>
					{addresses.length === 0 ? (
						<div className="text-sm text-gray-500 py-4">Aucune adresse enregistrée</div>
					) : (
						<div className="space-y-3">
							{addresses.map(addr => (
								<div key={addr.id} className="border rounded-md p-3 bg-gray-50">
									{editingAddressId === addr.id && editAddr ? (
										<form onSubmit={submitEditAddress} className="space-y-3">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
												<div>
													<label className="block text-xs mb-1">Type</label>
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
													<label className="block text-xs mb-1">Ligne 1 *</label>
													<Input 
														value={editAddr.line1} 
														onChange={e => setEditAddr(prev => prev ? ({ ...prev, line1: e.target.value }) : null)}
														required
														className="text-xs"
													/>
												</div>
												<div>
													<label className="block text-xs mb-1">Ligne 2</label>
													<Input 
														value={editAddr.line2} 
														onChange={e => setEditAddr(prev => prev ? ({ ...prev, line2: e.target.value }) : null)}
														className="text-xs"
													/>
												</div>
												<div>
													<label className="block text-xs mb-1">Ville *</label>
													<Input 
														value={editAddr.city} 
														onChange={e => setEditAddr(prev => prev ? ({ ...prev, city: e.target.value }) : null)}
														required
														className="text-xs"
													/>
												</div>
												<div>
													<label className="block text-xs mb-1">État/Province</label>
													<Input 
														value={editAddr.state} 
														onChange={e => setEditAddr(prev => prev ? ({ ...prev, state: e.target.value }) : null)}
														className="text-xs"
													/>
												</div>
												<div>
													<label className="block text-xs mb-1">Code postal</label>
													<Input 
														value={editAddr.postalCode} 
														onChange={e => setEditAddr(prev => prev ? ({ ...prev, postalCode: e.target.value }) : null)}
														className="text-xs"
													/>
												</div>
												<div>
													<label className="block text-xs mb-1">Pays *</label>
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
													<label className="text-xs">Adresse principale</label>
												</div>
											</div>
											<div className="flex gap-2 pt-2">
												<Button type="submit" size="sm" disabled={addrSubmitting}>
													{addrSubmitting ? "Enregistrement..." : "Enregistrer"}
												</Button>
												<Button type="button" variant="outline" size="sm" onClick={cancelEditAddress} disabled={addrSubmitting}>
													Annuler
												</Button>
											</div>
										</form>
									) : (
										<>
											<div className="flex items-start justify-between mb-2">
												<div className="flex items-center gap-2">
													<Badge variant={addr.primaryAddress ? "success" : "neutral"}>
														{addr.type}
													</Badge>
													{addr.primaryAddress && (
														<Badge variant="info">Principale</Badge>
													)}
												</div>
												<Button variant="outline" size="sm" onClick={() => startEditAddress(addr)}>
													Modifier
												</Button>
											</div>
											<div className="text-sm space-y-1">
												<div className="font-medium">{addr.line1}</div>
												{addr.line2 && <div>{addr.line2}</div>}
												<div>
													{addr.city}
													{addr.state && `, ${addr.state}`}
													{addr.postalCode && ` ${addr.postalCode}`}
												</div>
												<div className="text-gray-600">{addr.country}</div>
											</div>
										</>
									)}
								</div>
							))}
						</div>
					)}
				</div>

				<form onSubmit={submitAddress} className="space-y-4 rounded-md border bg-white p-4">
					<h2 className="text-lg font-medium">Ajouter une adresse</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm mb-1">Type</label>
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
							<label className="block text-sm mb-1">Ligne 1 *</label>
							<Input 
								value={addr.line1} 
								onChange={e => setAddr(prev => ({ ...prev, line1: e.target.value }))}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Ligne 2</label>
							<Input value={addr.line2} onChange={e => setAddr(prev => ({ ...prev, line2: e.target.value }))} />
						</div>
						<div>
							<label className="block text-sm mb-1">Ville *</label>
							<Input 
								value={addr.city} 
								onChange={e => setAddr(prev => ({ ...prev, city: e.target.value }))}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">État/Province</label>
							<Input 
								value={addr.state} 
								onChange={e => setAddr(prev => ({ ...prev, state: e.target.value }))}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Code postal</label>
							<Input 
								value={addr.postalCode} 
								onChange={e => setAddr(prev => ({ ...prev, postalCode: e.target.value }))}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Pays (ISO-2) *</label>
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
							<label htmlFor="primaryAddress" className="text-sm">Adresse principale</label>
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={addrSubmitting}>
							{addrSubmitting ? "Ajout..." : "Ajouter l’adresse"}
						</Button>
					</div>
				</form>

				<div className="space-y-4 rounded-md border bg-white p-4">
					<h2 className="text-lg font-medium">Actions KYC</h2>
					
					{/* Section: Soumettre KYC */}
					<div className="space-y-2 pb-4 border-b border-gray-200">
						<h3 className="text-sm font-semibold text-gray-700">Soumission</h3>
						<p className="text-xs text-gray-500">Soumettre le dossier pour revue (DRAFT/REJECTED → PENDING_REVIEW)</p>
						<Button onClick={doSubmitKyc} disabled={kycSubmitting !== null}>
							{kycSubmitting === "submit" ? "Soumission..." : "Soumettre KYC"}
						</Button>
					</div>

					{/* Section: Vérifier KYC */}
					<div className="space-y-3 pb-4 border-b border-gray-200">
						<h3 className="text-sm font-semibold text-gray-700">Vérification</h3>
						<p className="text-xs text-gray-500">Approuver le KYC avec score de risque et indicateur PEP</p>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div>
								<label className="block text-xs font-medium mb-1 text-gray-600">Score de risque</label>
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
								<div className="flex items-center gap-2 w-full">
									<input
										type="checkbox"
										id="pep-flag"
										checked={verifyPep}
										onChange={e => setVerifyPep(e.target.checked)}
										className="w-4 h-4"
									/>
									<label htmlFor="pep-flag" className="text-xs font-medium text-gray-600 cursor-pointer">
										Personne PEP
									</label>
								</div>
							</div>
							<div className="flex items-end">
								<Button 
									onClick={doVerifyKyc} 
									disabled={kycSubmitting !== null}
									className="w-full"
								>
									{kycSubmitting === "verify" ? "Vérification..." : "Vérifier"}
								</Button>
							</div>
						</div>
					</div>

					{/* Section: Rejeter KYC */}
					<div className="space-y-3">
						<h3 className="text-sm font-semibold text-gray-700">Rejet</h3>
						<p className="text-xs text-gray-500">Rejeter le KYC avec motif de refus (pour audit)</p>
						{!showRejectForm ? (
							<Button 
								variant="outline" 
								onClick={() => setShowRejectForm(true)} 
								disabled={kycSubmitting !== null}
								className="border-red-300 text-red-700 hover:bg-red-50"
							>
								Rejeter KYC
							</Button>
						) : (
							<div className="space-y-3 p-3 bg-red-50 border border-red-200 rounded-md">
								<div>
									<label className="block text-xs font-medium mb-1 text-gray-700">
										Motif de refus <span className="text-red-600">*</span>
									</label>
									<textarea
										value={rejectionReason}
										onChange={e => setRejectionReason(e.target.value)}
										placeholder="Indiquer le motif du rejet du KYC (obligatoire pour l'audit)..."
										className="w-full rounded-md border bg-white px-3 py-2 text-sm resize-none"
										rows={3}
									/>
									<p className="text-xs text-gray-500 mt-1">Ce motif sera enregistré pour traçabilité et audit</p>
								</div>
								<div className="flex gap-2">
									<Button 
										onClick={doRejectKyc} 
										disabled={kycSubmitting !== null || !rejectionReason.trim()}
										className="bg-red-600 hover:bg-red-700 text-white"
									>
										{kycSubmitting === "reject" ? "Rejet..." : "Confirmer le rejet"}
									</Button>
									<Button 
										variant="outline" 
										onClick={() => {
											setShowRejectForm(false);
											setRejectionReason("");
										}} 
										disabled={kycSubmitting !== null}
									>
										Annuler
									</Button>
								</div>
							</div>
						)}
					</div>

					{/* Affichage du motif de refus précédent */}
					{customer?.rejectionReason && (
						<div className="mt-4 pt-4 border-t border-gray-200">
							<div className="text-sm">
								<div className="font-medium text-gray-700 mb-2">Motif de refus précédent</div>
								<div className="text-gray-600 p-3 bg-red-50 border border-red-200 rounded-md">
									{customer.rejectionReason}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}


