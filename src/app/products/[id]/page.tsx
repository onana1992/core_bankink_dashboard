"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { productsApi } from "@/lib/api";
import {
	Edit2,
	Package,
	Tag,
	Currency,
	TrendingUp,
	Wallet,
	Info,
	BarChart3,
	Percent,
	DollarSign,
	Calendar,
	FileText,
	Trash2,
	AlertCircle,
	MoreVertical,
	Eye
} from "lucide-react";
import type {
	Product,
	ProductStatus,
	ProductInterestRate,
	ProductFee,
	ProductLimit,
	ProductPeriod,
	ProductPenalty,
	ProductEligibilityRule,
	CreateProductInterestRateRequest,
	CreateProductFeeRequest,
	CreateProductLimitRequest,
	CreateProductPeriodRequest,
	CreateProductPenaltyRequest,
	CreateProductEligibilityRuleRequest,
	RateType,
	CalculationMethod,
	CompoundingFrequency,
	FeeType,
	FeeCalculationBase,
	LimitType,
	PeriodType,
	PenaltyType,
	PenaltyCalculationBase,
	EligibilityRuleType,
	EligibilityOperator,
	EligibilityDataType
} from "@/types";

export default function ProductDetailPage() {
	const router = useRouter();
	const params = useParams();
	const id = params.id as string;

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [product, setProduct] = useState<Product | null>(null);
	const [activeTab, setActiveTab] = useState<"overview" | "rates" | "fees" | "limits" | "periods" | "penalties" | "eligibility">("overview");

	// Data states
	const [interestRates, setInterestRates] = useState<ProductInterestRate[]>([]);
	const [fees, setFees] = useState<ProductFee[]>([]);
	const [limits, setLimits] = useState<ProductLimit[]>([]);
	const [periods, setPeriods] = useState<ProductPeriod[]>([]);
	const [penalties, setPenalties] = useState<ProductPenalty[]>([]);
	const [eligibilityRules, setEligibilityRules] = useState<ProductEligibilityRule[]>([]);
	const [loadingConfigs, setLoadingConfigs] = useState(false);

	// Form states
	const [showRateForm, setShowRateForm] = useState(false);
	const [showFeeForm, setShowFeeForm] = useState(false);
	const [showLimitForm, setShowLimitForm] = useState(false);
	const [showPeriodForm, setShowPeriodForm] = useState(false);
	const [showPenaltyForm, setShowPenaltyForm] = useState(false);
	const [showRuleForm, setShowRuleForm] = useState(false);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const data = await productsApi.get(id);
			setProduct(data);
			await loadAllConfigurations();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement");
		} finally {
			setLoading(false);
		}
	}

	async function loadAllConfigurations() {
		setLoadingConfigs(true);
		try {
			console.log("Chargement des configurations pour le produit:", id);
			const [ratesData, feesData, limitsData, periodsData, penaltiesData, rulesData] = await Promise.all([
				productsApi.getInterestRates(id).catch(e => {
					console.error("Erreur lors du chargement des taux d'intérêt:", e);
					return [];
				}),
				productsApi.getFees(id).catch(e => {
					console.error("Erreur lors du chargement des frais:", e);
					return [];
				}),
				productsApi.getLimits(id).catch(e => {
					console.error("Erreur lors du chargement des limites:", e);
					return [];
				}),
				productsApi.getPeriods(id).catch(e => {
					console.error("Erreur lors du chargement des périodes:", e);
					return [];
				}),
				productsApi.getPenalties(id).catch(e => {
					console.error("Erreur lors du chargement des pénalités:", e);
					return [];
				}),
				productsApi.getEligibilityRules(id).catch(e => {
					console.error("Erreur lors du chargement des règles d'éligibilité:", e);
					return [];
				})
			]);
			console.log("Données chargées:", {
				rates: ratesData?.length || 0,
				fees: feesData?.length || 0,
				limits: limitsData?.length || 0,
				periods: periodsData?.length || 0,
				penalties: penaltiesData?.length || 0,
				rules: rulesData?.length || 0
			});
			setInterestRates(ratesData || []);
			setFees(feesData || []);
			setLimits(limitsData || []);
			setPeriods(periodsData || []);
			setPenalties(penaltiesData || []);
			setEligibilityRules(rulesData || []);
		} catch (e: any) {
			console.error("Erreur lors du chargement des configurations:", e);
			// S'assurer que les états sont initialisés même en cas d'erreur
			setInterestRates([]);
			setFees([]);
			setLimits([]);
			setPeriods([]);
			setPenalties([]);
			setEligibilityRules([]);
		} finally {
			setLoadingConfigs(false);
		}
	}

	useEffect(() => {
		if (id) load();
	}, [id]);

	useEffect(() => {
		if (id && product) {
			loadAllConfigurations();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab]);

	async function handleActivate() {
		if (!product) return;
		try {
			await productsApi.activate(product.id);
			await load();
		} catch (e: any) {
			alert(e?.message ?? "Erreur");
		}
	}

	async function handleDeactivate() {
		if (!product) return;
		try {
			await productsApi.deactivate(product.id);
			await load();
		} catch (e: any) {
			alert(e?.message ?? "Erreur");
		}
	}

	async function handleDelete() {
		if (!product) return;
		
		// Vérifier les dépendances
		const totalDependencies = 
			interestRates.length + 
			fees.length + 
			limits.length + 
			periods.length + 
			penalties.length + 
			eligibilityRules.length;
		
		if (totalDependencies > 0) {
			const message = `Impossible de supprimer le produit car il contient des configurations :\n` +
				(interestRates.length > 0 ? `- ${interestRates.length} taux d'intérêt\n` : '') +
				(fees.length > 0 ? `- ${fees.length} frais\n` : '') +
				(limits.length > 0 ? `- ${limits.length} limites\n` : '') +
				(periods.length > 0 ? `- ${periods.length} périodes\n` : '') +
				(penalties.length > 0 ? `- ${penalties.length} pénalités\n` : '') +
				(eligibilityRules.length > 0 ? `- ${eligibilityRules.length} règles d'éligibilité\n` : '') +
				`\nVeuillez supprimer toutes les configurations avant de supprimer le produit.`;
			alert(message);
			return;
		}
		
		if (!confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.name}" ?\n\nCette action est irréversible.`)) {
			return;
		}
		
		try {
			await productsApi.delete(product.id);
			router.push("/products");
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors de la suppression");
		}
	}

	async function handleDeleteRate(rateId: number) {
		if (!confirm("Êtes-vous sûr de vouloir supprimer ce taux d'intérêt ?")) return;
		try {
			await productsApi.deleteInterestRate(id, rateId);
			await loadAllConfigurations();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors de la suppression");
		}
	}

	async function handleDeleteFee(feeId: number) {
		if (!confirm("Êtes-vous sûr de vouloir supprimer ce frais ?")) return;
		try {
			await productsApi.deleteFee(id, feeId);
			await loadAllConfigurations();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors de la suppression");
		}
	}

	async function handleDeleteLimit(limitId: number) {
		if (!confirm("Êtes-vous sûr de vouloir supprimer cette limite ?")) return;
		try {
			await productsApi.deleteLimit(id, limitId);
			await loadAllConfigurations();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors de la suppression");
		}
	}

	async function handleDeletePeriod(periodId: number) {
		if (!confirm("Êtes-vous sûr de vouloir supprimer cette période ?")) return;
		try {
			await productsApi.deletePeriod(id, periodId);
			await loadAllConfigurations();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors de la suppression");
		}
	}

	async function handleDeletePenalty(penaltyId: number) {
		if (!confirm("Êtes-vous sûr de vouloir supprimer cette pénalité ?")) return;
		try {
			await productsApi.deletePenalty(id, penaltyId);
			await loadAllConfigurations();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors de la suppression");
		}
	}

	async function handleDeleteRule(ruleId: number) {
		if (!confirm("Êtes-vous sûr de vouloir supprimer cette règle ?")) return;
		try {
			await productsApi.deleteEligibilityRule(id, ruleId);
			await loadAllConfigurations();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors de la suppression");
		}
	}

	if (loading) {
		return <div className="p-4">Chargement...</div>;
	}

	if (error || !product) {
		return (
			<div className="p-4">
				<div className="text-red-600">{error ?? "Produit non trouvé"}</div>
				<Button onClick={() => router.push("/products")} className="mt-4">Retour à la liste</Button>
			</div>
		);
	}

	function statusBadgeVariant(status: ProductStatus): "neutral" | "success" | "warning" | "danger" {
		switch (status) {
			case "ACTIVE": return "success";
			case "DRAFT": return "warning";
			case "INACTIVE": return "danger";
			default: return "neutral";
		}
	}

	function categoryLabel(category: Product["category"]): string {
		const labels: Record<Product["category"], string> = {
			CURRENT_ACCOUNT: "Compte courant",
			SAVINGS_ACCOUNT: "Compte épargne",
			TERM_DEPOSIT: "Dépôt à terme",
			LOAN: "Prêt",
			CARD: "Carte"
		};
		return labels[category] || category;
	}

	const tabs = [
		{ id: "overview" as const, label: "Vue d'ensemble" },
		{ id: "rates" as const, label: `Taux d'intérêt (${interestRates.length})` },
		{ id: "fees" as const, label: `Frais (${fees.length})` },
		{ id: "limits" as const, label: `Limites (${limits.length})` },
		{ id: "periods" as const, label: `Périodes (${periods.length})` },
		{ id: "penalties" as const, label: `Pénalités (${penalties.length})` },
		{ id: "eligibility" as const, label: `Règles d'éligibilité (${eligibilityRules.length})` }
	];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<Link href="/products" className="text-sm text-gray-500 hover:text-gray-700">← Retour</Link>
					<h1 className="text-2xl font-semibold mt-1">{product.name}</h1>
					<div className="flex gap-2 mt-2">
						<Badge variant={statusBadgeVariant(product.status)}>{product.status}</Badge>
						<span className="text-sm text-gray-500">{categoryLabel(product.category)}</span>
					</div>
				</div>
				<div className="flex gap-2">
					{product.status === "ACTIVE" ? (
						<Button variant="outline" onClick={handleDeactivate}>Désactiver</Button>
					) : (
						<Button onClick={handleActivate}>Activer</Button>
					)}
					<Button variant="outline" onClick={load}>Actualiser</Button>
					{(() => {
						const totalDependencies = 
							interestRates.length + 
							fees.length + 
							limits.length + 
							periods.length + 
							penalties.length + 
							eligibilityRules.length;
						const canDelete = totalDependencies === 0;
						return (
							<Button 
								variant="outline" 
								onClick={handleDelete}
								disabled={!canDelete}
								className={!canDelete ? "opacity-50 cursor-not-allowed" : "text-red-600 hover:text-red-700 hover:bg-red-50"}
								title={!canDelete ? "Impossible de supprimer : le produit contient des configurations" : "Supprimer le produit"}
							>
								<Trash2 className="h-4 w-4 mr-2" />
								Supprimer
							</Button>
						);
					})()}
				</div>
			</div>

			{/* Tabs */}
			<div className="border-b">
				<div className="flex gap-4">
					{tabs.map(tab => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
								activeTab === tab.id
									? "border-blue-500 text-blue-600"
									: "border-transparent text-gray-500 hover:text-gray-700"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* Tab Content */}
			<div className="rounded-md border bg-white p-4">
				{activeTab === "overview" && (
					<ProductOverviewTab
						product={product}
						onUpdate={load}
						stats={{
							interestRates: interestRates.length,
							fees: fees.length,
							limits: limits.length,
							periods: periods.length,
							penalties: penalties.length,
							eligibilityRules: eligibilityRules.length
						}}
					/>
				)}

				{activeTab === "rates" && (
					<InterestRatesTab
						productId={id}
						rates={interestRates}
						loading={loadingConfigs}
						onAdd={() => setShowRateForm(true)}
						onDelete={handleDeleteRate}
						onRefresh={loadAllConfigurations}
						showForm={showRateForm}
						onCloseForm={() => setShowRateForm(false)}
					/>
				)}

				{activeTab === "fees" && (
					<FeesTab
						productId={id}
						fees={fees}
						loading={loadingConfigs}
						onAdd={() => setShowFeeForm(true)}
						onDelete={handleDeleteFee}
						onRefresh={loadAllConfigurations}
						showForm={showFeeForm}
						onCloseForm={() => setShowFeeForm(false)}
					/>
				)}

				{activeTab === "limits" && (
					<LimitsTab
						productId={id}
						limits={limits}
						loading={loadingConfigs}
						onAdd={() => setShowLimitForm(true)}
						onDelete={handleDeleteLimit}
						onRefresh={loadAllConfigurations}
						showForm={showLimitForm}
						onCloseForm={() => setShowLimitForm(false)}
					/>
				)}

				{activeTab === "periods" && (
					<PeriodsTab
						productId={id}
						periods={periods}
						loading={loadingConfigs}
						onAdd={() => setShowPeriodForm(true)}
						onDelete={handleDeletePeriod}
						onRefresh={loadAllConfigurations}
						showForm={showPeriodForm}
						onCloseForm={() => setShowPeriodForm(false)}
					/>
				)}

				{activeTab === "penalties" && (
					<PenaltiesTab
						productId={id}
						penalties={penalties}
						loading={loadingConfigs}
						onAdd={() => setShowPenaltyForm(true)}
						onDelete={handleDeletePenalty}
						onRefresh={loadAllConfigurations}
						showForm={showPenaltyForm}
						onCloseForm={() => setShowPenaltyForm(false)}
					/>
				)}

				{activeTab === "eligibility" && (
					<EligibilityRulesTab
						productId={id}
						rules={eligibilityRules}
						loading={loadingConfigs}
						onAdd={() => setShowRuleForm(true)}
						onDelete={handleDeleteRule}
						onRefresh={loadAllConfigurations}
						showForm={showRuleForm}
						onCloseForm={() => setShowRuleForm(false)}
					/>
				)}
			</div>
		</div>
	);
}

// Component for Product Overview Tab with Edit functionality
function ProductOverviewTab({
	product,
	onUpdate,
	stats
}: {
	product: Product;
	onUpdate: () => void;
	stats?: {
		interestRates: number;
		fees: number;
		limits: number;
		periods: number;
		penalties: number;
		eligibilityRules: number;
	};
}) {
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState<{
		name: string;
		description: string;
		status: ProductStatus;
		currency: string;
		minBalance: number | undefined;
		maxBalance: number | undefined;
		defaultInterestRate: number | undefined;
	}>({
		name: product.name,
		description: product.description || "",
		status: product.status,
		currency: product.currency,
		minBalance: product.minBalance ?? undefined,
		maxBalance: product.maxBalance ?? undefined,
		defaultInterestRate: product.defaultInterestRate ?? undefined
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await productsApi.update(product.id, form);
			setEditing(false);
			onUpdate();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la mise à jour");
		} finally {
			setSubmitting(false);
		}
	}

	if (editing) {
		return (
			<form onSubmit={handleSubmit} className="space-y-4">
				{error && (
					<div className="p-3 bg-red-50 border border-red-200 rounded-md">
						<div className="text-sm text-red-600">{error}</div>
					</div>
				)}
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="block text-sm mb-1">Code</label>
						<div className="font-mono text-sm text-gray-500">{product.code}</div>
						<p className="text-xs text-gray-400 mt-1">Le code ne peut pas être modifié</p>
					</div>
					<div>
						<label className="block text-sm mb-1">Catégorie</label>
						<div className="text-sm text-gray-500">{product.category}</div>
						<p className="text-xs text-gray-400 mt-1">La catégorie ne peut pas être modifiée</p>
					</div>
					<div>
						<label className="block text-sm mb-1">Nom *</label>
						<Input
							value={form.name}
							onChange={e => setForm({ ...form, name: e.target.value })}
							required
						/>
					</div>
					<div>
						<label className="block text-sm mb-1">Statut</label>
						<select
							className="w-full rounded-md border bg-white px-3 py-2 text-sm"
							value={form.status}
							onChange={e => setForm({ ...form, status: e.target.value as ProductStatus })}
						>
							<option value="DRAFT">DRAFT</option>
							<option value="ACTIVE">ACTIVE</option>
							<option value="INACTIVE">INACTIVE</option>
						</select>
					</div>
					<div>
						<label className="block text-sm mb-1">Devise</label>
						<Input
							value={form.currency}
							onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })}
							maxLength={3}
						/>
					</div>
					<div>
						<label className="block text-sm mb-1">Taux d'intérêt par défaut (%)</label>
						<Input
							type="number"
							step="0.0001"
							value={form.defaultInterestRate ?? ""}
							onChange={e => setForm({ ...form, defaultInterestRate: e.target.value ? parseFloat(e.target.value) : undefined })}
						/>
					</div>
					<div>
						<label className="block text-sm mb-1">Solde minimum</label>
						<Input
							type="number"
							step="0.01"
							value={form.minBalance ?? ""}
							onChange={e => setForm({ ...form, minBalance: e.target.value ? parseFloat(e.target.value) : undefined })}
						/>
					</div>
					<div>
						<label className="block text-sm mb-1">Solde maximum</label>
						<Input
							type="number"
							step="0.01"
							value={form.maxBalance ?? ""}
							onChange={e => setForm({ ...form, maxBalance: e.target.value ? parseFloat(e.target.value) : undefined })}
						/>
					</div>
					<div className="col-span-2">
						<label className="block text-sm mb-1">Description</label>
						<textarea
							className="w-full rounded-md border bg-white px-3 py-2 text-sm"
							value={form.description}
							onChange={e => setForm({ ...form, description: e.target.value })}
							rows={3}
						/>
					</div>
				</div>
				<div className="flex gap-2">
					<Button type="submit" disabled={submitting}>{submitting ? "Enregistrement..." : "Enregistrer"}</Button>
					<Button type="button" variant="outline" onClick={() => {
						setEditing(false);
						setForm({
							name: product.name,
							description: product.description || "",
							status: product.status,
							currency: product.currency,
							minBalance: product.minBalance ?? undefined,
							maxBalance: product.maxBalance ?? undefined,
							defaultInterestRate: product.defaultInterestRate ?? undefined
						});
						setError(null);
					}}>Annuler</Button>
				</div>
			</form>
		);
	}

	function categoryLabel(category: Product["category"]): string {
		const labels: Record<Product["category"], string> = {
			CURRENT_ACCOUNT: "Compte courant",
			SAVINGS_ACCOUNT: "Compte épargne",
			TERM_DEPOSIT: "Dépôt à terme",
			LOAN: "Prêt",
			CARD: "Carte"
		};
		return labels[category] || category;
	}

	return (
		<div className="space-y-6">
			{/* Header avec bouton modifier */}
			<div className="flex justify-between items-start">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">Informations générales</h2>
					<p className="text-sm text-gray-500 mt-1">Détails et configuration du produit</p>
				</div>
				<Button variant="outline" onClick={() => setEditing(true)} className="flex items-center gap-2">
					<Edit2 className="h-4 w-4" />
					Modifier
				</Button>
			</div>

			{/* Statistiques rapides */}
			{stats && (
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
					<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
						<div className="flex items-center gap-2 mb-2">
							<Percent className="h-4 w-4 text-blue-600" />
							<span className="text-xs font-medium text-blue-700">Taux d'intérêt</span>
						</div>
						<div className="text-2xl font-bold text-blue-900">{stats.interestRates}</div>
					</div>
					<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
						<div className="flex items-center gap-2 mb-2">
							<DollarSign className="h-4 w-4 text-green-600" />
							<span className="text-xs font-medium text-green-700">Frais</span>
						</div>
						<div className="text-2xl font-bold text-green-900">{stats.fees}</div>
					</div>
					<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
						<div className="flex items-center gap-2 mb-2">
							<BarChart3 className="h-4 w-4 text-purple-600" />
							<span className="text-xs font-medium text-purple-700">Limites</span>
						</div>
						<div className="text-2xl font-bold text-purple-900">{stats.limits}</div>
					</div>
					<div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
						<div className="flex items-center gap-2 mb-2">
							<Calendar className="h-4 w-4 text-orange-600" />
							<span className="text-xs font-medium text-orange-700">Périodes</span>
						</div>
						<div className="text-2xl font-bold text-orange-900">{stats.periods}</div>
					</div>
					<div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
						<div className="flex items-center gap-2 mb-2">
							<Info className="h-4 w-4 text-red-600" />
							<span className="text-xs font-medium text-red-700">Pénalités</span>
						</div>
						<div className="text-2xl font-bold text-red-900">{stats.penalties}</div>
					</div>
					<div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
						<div className="flex items-center gap-2 mb-2">
							<FileText className="h-4 w-4 text-indigo-600" />
							<span className="text-xs font-medium text-indigo-700">Règles</span>
						</div>
						<div className="text-2xl font-bold text-indigo-900">{stats.eligibilityRules}</div>
					</div>
				</div>
			)}

			{/* Informations principales */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Carte: Identité */}
				<div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
					<div className="flex items-center gap-2 mb-4">
						<Package className="h-5 w-5 text-gray-600" />
						<h3 className="font-semibold text-gray-900">Identité</h3>
					</div>
					<div className="space-y-3">
						<div>
							<label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Code produit</label>
							<div className="font-mono text-sm font-semibold text-gray-900 mt-1">{product.code}</div>
						</div>
						<div>
							<label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nom</label>
							<div className="text-sm font-medium text-gray-900 mt-1">{product.name}</div>
						</div>
						<div>
							<label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Catégorie</label>
							<div className="mt-1">
								<Badge variant="neutral" className="mt-1">
									{categoryLabel(product.category)}
								</Badge>
							</div>
						</div>
					</div>
				</div>

				{/* Carte: Statut */}
				<div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
					<div className="flex items-center gap-2 mb-4">
						<Tag className="h-5 w-5 text-gray-600" />
						<h3 className="font-semibold text-gray-900">Statut</h3>
					</div>
					<div className="space-y-3">
						<div>
							<label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Statut actuel</label>
							<div className="mt-1">
								<Badge variant={
									product.status === "ACTIVE" ? "success" :
									product.status === "DRAFT" ? "warning" : "danger"
								}>
									{product.status}
								</Badge>
							</div>
						</div>
						<div>
							<label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Devise</label>
							<div className="flex items-center gap-2 mt-1">
								<Currency className="h-4 w-4 text-gray-400" />
								<span className="text-sm font-semibold text-gray-900">{product.currency}</span>
							</div>
						</div>
					</div>
				</div>

				{/* Carte: Soldes */}
				<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-200">
					<div className="flex items-center gap-2 mb-4">
						<Wallet className="h-5 w-5 text-blue-600" />
						<h3 className="font-semibold text-gray-900">Soldes</h3>
					</div>
					<div className="space-y-3">
						<div>
							<label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Solde minimum</label>
							<div className="text-lg font-bold text-gray-900 mt-1">
								{product.minBalance != null ? (
									<span>{product.minBalance.toLocaleString()} <span className="text-sm font-normal text-gray-600">{product.currency}</span></span>
								) : (
									<span className="text-gray-400">Non défini</span>
								)}
							</div>
						</div>
						<div>
							<label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Solde maximum</label>
							<div className="text-lg font-bold text-gray-900 mt-1">
								{product.maxBalance != null ? (
									<span>{product.maxBalance.toLocaleString()} <span className="text-sm font-normal text-gray-600">{product.currency}</span></span>
								) : (
									<span className="text-gray-400">Non défini</span>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Carte: Taux d'intérêt */}
				<div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 border border-green-200">
					<div className="flex items-center gap-2 mb-4">
						<TrendingUp className="h-5 w-5 text-green-600" />
						<h3 className="font-semibold text-gray-900">Taux d'intérêt</h3>
					</div>
					<div>
						<label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Taux par défaut</label>
						<div className="text-2xl font-bold text-green-700 mt-1">
							{product.defaultInterestRate != null ? (
								<span>{product.defaultInterestRate}%</span>
							) : (
								<span className="text-gray-400 text-lg">Non défini</span>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Description */}
			{product.description && (
				<div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
					<div className="flex items-center gap-2 mb-3">
						<FileText className="h-5 w-5 text-gray-600" />
						<h3 className="font-semibold text-gray-900">Description</h3>
					</div>
					<p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{product.description}</p>
				</div>
			)}
		</div>
	);
}

// Component for Interest Rates Tab
function InterestRatesTab({
	productId,
	rates,
	loading,
	onAdd,
	onDelete,
	onRefresh,
	showForm,
	onCloseForm
}: {
	productId: string;
	rates: ProductInterestRate[];
	loading?: boolean;
	onAdd: () => void;
	onDelete: (id: number) => void;
	onRefresh: () => void;
	showForm: boolean;
	onCloseForm: () => void;
}) {
	const [form, setForm] = useState<CreateProductInterestRateRequest>({
		rateType: "DEPOSIT",
		rateValue: 0,
		calculationMethod: "SIMPLE",
		effectiveFrom: new Date().toISOString().split('T')[0],
		isActive: true
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedRate, setSelectedRate] = useState<ProductInterestRate | null>(null);
	const [showViewModal, setShowViewModal] = useState(false);
	const [showEditForm, setShowEditForm] = useState(false);
	const [openMenuId, setOpenMenuId] = useState<number | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
	const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await productsApi.addInterestRate(productId, form);
			onCloseForm();
			setForm({
				rateType: "DEPOSIT",
				rateValue: 0,
				calculationMethod: "SIMPLE",
				effectiveFrom: new Date().toISOString().split('T')[0],
				isActive: true
			});
			onRefresh();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de l'ajout");
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return <div className="text-sm text-gray-500 py-8 text-center">Chargement...</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Taux d'intérêt ({rates.length})</h3>
				{!showForm && !showEditForm && <Button onClick={onAdd}>+ Ajouter un taux</Button>}
			</div>

			{showForm && !showEditForm && (
				<form onSubmit={handleSubmit} className="border rounded-md p-4 space-y-4 bg-gray-50">
					{error && <div className="text-sm text-red-600">{error}</div>}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm mb-1">Type de taux *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.rateType}
								onChange={e => setForm({ ...form, rateType: e.target.value as RateType })}
								required
							>
								<option value="DEPOSIT">Dépôt</option>
								<option value="LENDING">Prêt</option>
								<option value="PENALTY">Pénalité</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Valeur du taux (%) *</label>
							<Input
								type="number"
								step="0.0001"
								value={form.rateValue}
								onChange={e => setForm({ ...form, rateValue: parseFloat(e.target.value) || 0 })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Montant minimum</label>
							<Input
								type="number"
								step="0.01"
								value={form.minAmount ?? ""}
								onChange={e => setForm({ ...form, minAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Montant maximum</label>
							<Input
								type="number"
								step="0.01"
								value={form.maxAmount ?? ""}
								onChange={e => setForm({ ...form, maxAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Période min (jours)</label>
							<Input
								type="number"
								value={form.minPeriodDays ?? ""}
								onChange={e => setForm({ ...form, minPeriodDays: e.target.value ? parseInt(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Période max (jours)</label>
							<Input
								type="number"
								value={form.maxPeriodDays ?? ""}
								onChange={e => setForm({ ...form, maxPeriodDays: e.target.value ? parseInt(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Méthode de calcul *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.calculationMethod}
								onChange={e => setForm({ ...form, calculationMethod: e.target.value as CalculationMethod })}
								required
							>
								<option value="SIMPLE">Simple</option>
								<option value="COMPOUND">Composé</option>
								<option value="FLOATING">Flottant</option>
							</select>
						</div>
						{form.calculationMethod === "COMPOUND" && (
							<div>
								<label className="block text-sm mb-1">Fréquence de capitalisation</label>
								<select
									className="w-full rounded-md border bg-white px-3 py-2 text-sm"
									value={form.compoundingFrequency ?? ""}
									onChange={e => setForm({ ...form, compoundingFrequency: e.target.value as CompoundingFrequency })}
								>
									<option value="">Sélectionner</option>
									<option value="DAILY">Quotidienne</option>
									<option value="MONTHLY">Mensuelle</option>
									<option value="QUARTERLY">Trimestrielle</option>
									<option value="YEARLY">Annuelle</option>
								</select>
							</div>
						)}
						<div>
							<label className="block text-sm mb-1">Date d'effet *</label>
							<Input
								type="date"
								value={form.effectiveFrom}
								onChange={e => setForm({ ...form, effectiveFrom: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Date de fin</label>
							<Input
								type="date"
								value={form.effectiveTo ?? ""}
								onChange={e => setForm({ ...form, effectiveTo: e.target.value || undefined })}
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={submitting}>{submitting ? "Ajout..." : "Ajouter"}</Button>
						<Button type="button" variant="outline" onClick={onCloseForm}>Annuler</Button>
					</div>
				</form>
			)}

			{/* Debug info - à retirer en production */}
			{process.env.NODE_ENV === 'development' && (
				<div className="text-xs text-gray-400 mb-2">
					Debug: {rates.length} taux chargés
				</div>
			)}

			{rates.length === 0 ? (
				<div className="text-sm text-gray-500 py-8 text-center">Aucun taux d'intérêt configuré</div>
			) : (
				<div className="overflow-x-auto overflow-y-visible">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-2 text-left">Type</th>
								<th className="px-4 py-2 text-left">Taux</th>
								<th className="px-4 py-2 text-left">Montant</th>
								<th className="px-4 py-2 text-left">Période</th>
								<th className="px-4 py-2 text-left">Méthode</th>
								<th className="px-4 py-2 text-left">Actif</th>
								<th className="px-4 py-2 text-left"></th>
							</tr>
						</thead>
						<tbody className="relative">
							{rates.map(rate => (
								<tr key={rate.id} className="border-t">
									<td className="px-4 py-2">{rate.rateType}</td>
									<td className="px-4 py-2">{rate.rateValue}%</td>
									<td className="px-4 py-2">
										{rate.minAmount != null || rate.maxAmount != null
											? `${rate.minAmount ?? "0"} - ${rate.maxAmount ?? "∞"}`
											: "-"}
									</td>
									<td className="px-4 py-2">
										{rate.minPeriodDays != null || rate.maxPeriodDays != null
											? `${rate.minPeriodDays ?? "0"} - ${rate.maxPeriodDays ?? "∞"} jours`
											: "-"}
									</td>
									<td className="px-4 py-2">
										{rate.calculationMethod}
										{rate.compoundingFrequency && ` (${rate.compoundingFrequency})`}
									</td>
									<td className="px-4 py-2">
										<Badge variant={rate.isActive ? "success" : "neutral"}>
											{rate.isActive ? "Oui" : "Non"}
										</Badge>
									</td>
									<td className="px-4 py-2 relative overflow-visible">
										<div className="relative z-[9999]">
											<button
												ref={(el) => { buttonRefs.current[rate.id] = el; }}
												type="button"
												onClick={(e) => {
													const button = e.currentTarget;
													const rect = button.getBoundingClientRect();
													setMenuPosition({
														top: rect.top - 8, // 8px au-dessus du bouton (mb-1 = 4px + espacement)
														right: window.innerWidth - rect.right
													});
													setOpenMenuId(openMenuId === rate.id ? null : rate.id);
												}}
												className="p-1 rounded-md hover:bg-gray-100 transition-colors relative z-[9999]"
											>
												<MoreVertical className="h-4 w-4 text-gray-600" />
											</button>
											{openMenuId === rate.id && menuPosition && (
												<>
													<div
														className="fixed inset-0 z-[9998]"
														onClick={() => {
															setOpenMenuId(null);
															setMenuPosition(null);
														}}
													/>
													<div 
														className="fixed w-48 bg-white rounded-md shadow-lg border border-gray-200 z-[9999]"
														style={{
															top: `${menuPosition.top}px`,
															right: `${menuPosition.right}px`,
															transform: 'translateY(-100%)'
														}}
													>
														<button
															type="button"
															onClick={() => {
																setSelectedRate(rate);
																setShowViewModal(true);
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
														>
															<Eye className="h-4 w-4" />
															Voir
														</button>
														<button
															type="button"
															onClick={() => {
																setSelectedRate(rate);
																setShowEditForm(true);
																onCloseForm(); // Fermer le formulaire d'ajout si ouvert
																setForm({
																	rateType: rate.rateType,
																	rateValue: rate.rateValue,
																	minAmount: rate.minAmount ?? undefined,
																	maxAmount: rate.maxAmount ?? undefined,
																	minPeriodDays: rate.minPeriodDays ?? undefined,
																	maxPeriodDays: rate.maxPeriodDays ?? undefined,
																	calculationMethod: rate.calculationMethod,
																	compoundingFrequency: rate.compoundingFrequency ?? undefined,
																	effectiveFrom: rate.effectiveFrom,
																	effectiveTo: rate.effectiveTo ?? undefined,
																	isActive: rate.isActive
																});
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
														>
															<Edit2 className="h-4 w-4" />
															Modifier
														</button>
														<button
															type="button"
															onClick={() => {
																setOpenMenuId(null);
																setMenuPosition(null);
																onDelete(rate.id);
															}}
															className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
														>
															<Trash2 className="h-4 w-4" />
															Supprimer
														</button>
													</div>
												</>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Modal pour voir les détails */}
			{showViewModal && selectedRate && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
					<div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold">Détails du taux d'intérêt</h3>
							<button
								type="button"
								onClick={() => setShowViewModal(false)}
								className="text-gray-400 hover:text-gray-600"
							>
								×
							</button>
						</div>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-sm font-medium text-gray-500">Type de taux</label>
									<div className="mt-1 text-sm">{selectedRate.rateType}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Valeur du taux</label>
									<div className="mt-1 text-sm font-semibold">{selectedRate.rateValue}%</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Montant minimum</label>
									<div className="mt-1 text-sm">{selectedRate.minAmount != null ? `${selectedRate.minAmount}` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Montant maximum</label>
									<div className="mt-1 text-sm">{selectedRate.maxAmount != null ? `${selectedRate.maxAmount}` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Période minimum (jours)</label>
									<div className="mt-1 text-sm">{selectedRate.minPeriodDays != null ? `${selectedRate.minPeriodDays}` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Période maximum (jours)</label>
									<div className="mt-1 text-sm">{selectedRate.maxPeriodDays != null ? `${selectedRate.maxPeriodDays}` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Méthode de calcul</label>
									<div className="mt-1 text-sm">{selectedRate.calculationMethod}</div>
								</div>
								{selectedRate.compoundingFrequency && (
									<div>
										<label className="text-sm font-medium text-gray-500">Fréquence de capitalisation</label>
										<div className="mt-1 text-sm">{selectedRate.compoundingFrequency}</div>
									</div>
								)}
								<div>
									<label className="text-sm font-medium text-gray-500">Date d'effet</label>
									<div className="mt-1 text-sm">{selectedRate.effectiveFrom}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Date de fin</label>
									<div className="mt-1 text-sm">{selectedRate.effectiveTo ?? "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Statut</label>
									<div className="mt-1">
										<Badge variant={selectedRate.isActive ? "success" : "neutral"}>
											{selectedRate.isActive ? "Actif" : "Inactif"}
										</Badge>
									</div>
								</div>
							</div>
						</div>
						<div className="mt-6 flex justify-end">
							<Button variant="outline" onClick={() => setShowViewModal(false)}>Fermer</Button>
						</div>
					</div>
				</div>
			)}

			{/* Formulaire de modification */}
			{showEditForm && selectedRate && (
				<form onSubmit={async (e) => {
					e.preventDefault();
					setSubmitting(true);
					setError(null);
					try {
						await productsApi.updateInterestRate(productId, selectedRate.id, form);
						setShowEditForm(false);
						setSelectedRate(null);
						onRefresh();
					} catch (e: any) {
						setError(e?.message ?? "Erreur lors de la modification");
					} finally {
						setSubmitting(false);
					}
				}} className="border rounded-md p-4 space-y-4 bg-gray-50 mt-4">
					<div className="flex justify-between items-center mb-2">
						<h4 className="font-semibold">Modifier le taux d'intérêt</h4>
						<button
							type="button"
							onClick={() => {
								setShowEditForm(false);
								setSelectedRate(null);
								setError(null);
							}}
							className="text-gray-400 hover:text-gray-600"
						>
							×
						</button>
					</div>
					{error && <div className="text-sm text-red-600">{error}</div>}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm mb-1">Type de taux *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.rateType}
								onChange={e => setForm({ ...form, rateType: e.target.value as RateType })}
								required
							>
								<option value="DEPOSIT">Dépôt</option>
								<option value="LENDING">Prêt</option>
								<option value="PENALTY">Pénalité</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Valeur du taux (%) *</label>
							<Input
								type="number"
								step="0.0001"
								value={form.rateValue}
								onChange={e => setForm({ ...form, rateValue: parseFloat(e.target.value) || 0 })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Montant minimum</label>
							<Input
								type="number"
								step="0.01"
								value={form.minAmount ?? ""}
								onChange={e => setForm({ ...form, minAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Montant maximum</label>
							<Input
								type="number"
								step="0.01"
								value={form.maxAmount ?? ""}
								onChange={e => setForm({ ...form, maxAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Période min (jours)</label>
							<Input
								type="number"
								value={form.minPeriodDays ?? ""}
								onChange={e => setForm({ ...form, minPeriodDays: e.target.value ? parseInt(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Période max (jours)</label>
							<Input
								type="number"
								value={form.maxPeriodDays ?? ""}
								onChange={e => setForm({ ...form, maxPeriodDays: e.target.value ? parseInt(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Méthode de calcul *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.calculationMethod}
								onChange={e => setForm({ ...form, calculationMethod: e.target.value as CalculationMethod })}
								required
							>
								<option value="SIMPLE">Simple</option>
								<option value="COMPOUND">Composé</option>
								<option value="FLOATING">Flottant</option>
							</select>
						</div>
						{form.calculationMethod === "COMPOUND" && (
							<div>
								<label className="block text-sm mb-1">Fréquence de capitalisation</label>
								<select
									className="w-full rounded-md border bg-white px-3 py-2 text-sm"
									value={form.compoundingFrequency ?? ""}
									onChange={e => setForm({ ...form, compoundingFrequency: e.target.value as CompoundingFrequency })}
								>
									<option value="">Sélectionner</option>
									<option value="DAILY">Quotidienne</option>
									<option value="MONTHLY">Mensuelle</option>
									<option value="QUARTERLY">Trimestrielle</option>
									<option value="YEARLY">Annuelle</option>
								</select>
							</div>
						)}
						<div>
							<label className="block text-sm mb-1">Date d'effet *</label>
							<Input
								type="date"
								value={form.effectiveFrom}
								onChange={e => setForm({ ...form, effectiveFrom: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Date de fin</label>
							<Input
								type="date"
								value={form.effectiveTo ?? ""}
								onChange={e => setForm({ ...form, effectiveTo: e.target.value || undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Actif</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.isActive ? "true" : "false"}
								onChange={e => setForm({ ...form, isActive: e.target.value === "true" })}
							>
								<option value="true">Oui</option>
								<option value="false">Non</option>
							</select>
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={submitting}>{submitting ? "Modification..." : "Modifier"}</Button>
						<Button type="button" variant="outline" onClick={() => {
							setShowEditForm(false);
							setSelectedRate(null);
							setError(null);
						}}>Annuler</Button>
					</div>
				</form>
			)}
		</div>
	);
}

// Component for Fees Tab
function FeesTab({
	productId,
	fees,
	loading,
	onAdd,
	onDelete,
	onRefresh,
	showForm,
	onCloseForm
}: {
	productId: string;
	fees: ProductFee[];
	loading?: boolean;
	onAdd: () => void;
	onDelete: (id: number) => void;
	onRefresh: () => void;
	showForm: boolean;
	onCloseForm: () => void;
}) {
	const [form, setForm] = useState<CreateProductFeeRequest>({
		feeType: "MONTHLY",
		feeName: "",
		feeCalculationBase: "FIXED",
		effectiveFrom: new Date().toISOString().split('T')[0],
		isActive: true
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedFee, setSelectedFee] = useState<ProductFee | null>(null);
	const [showViewModal, setShowViewModal] = useState(false);
	const [showEditForm, setShowEditForm] = useState(false);
	const [openMenuId, setOpenMenuId] = useState<number | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
	const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await productsApi.addFee(productId, form);
			onCloseForm();
			setForm({
				feeType: "MONTHLY",
				feeName: "",
				feeCalculationBase: "FIXED",
				effectiveFrom: new Date().toISOString().split('T')[0],
				isActive: true
			});
			onRefresh();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de l'ajout");
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return <div className="text-sm text-gray-500 py-8 text-center">Chargement...</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Frais ({fees.length})</h3>
				{!showForm && <Button onClick={onAdd}>+ Ajouter un frais</Button>}
			</div>

			{showForm && (
				<form onSubmit={handleSubmit} className="border rounded-md p-4 space-y-4 bg-gray-50">
					{error && <div className="text-sm text-red-600">{error}</div>}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm mb-1">Type de frais *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.feeType}
								onChange={e => setForm({ ...form, feeType: e.target.value as FeeType })}
								required
							>
								<option value="OPENING">Ouverture</option>
								<option value="MONTHLY">Mensuel</option>
								<option value="ANNUAL">Annuel</option>
								<option value="TRANSACTION">Transaction</option>
								<option value="WITHDRAWAL">Retrait</option>
								<option value="OVERDRAFT">Découvert</option>
								<option value="LATE_PAYMENT">Retard de paiement</option>
								<option value="EARLY_WITHDRAWAL">Retrait anticipé</option>
								<option value="CARD_ISSUANCE">Émission de carte</option>
								<option value="CARD_RENEWAL">Renouvellement de carte</option>
								<option value="OTHER">Autre</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Nom du frais *</label>
							<Input
								value={form.feeName}
								onChange={e => setForm({ ...form, feeName: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Base de calcul *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.feeCalculationBase}
								onChange={e => setForm({ ...form, feeCalculationBase: e.target.value as FeeCalculationBase })}
								required
							>
								<option value="FIXED">Fixe</option>
								<option value="BALANCE">Solde</option>
								<option value="TRANSACTION_AMOUNT">Montant transaction</option>
								<option value="OUTSTANDING_BALANCE">Solde impayé</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Montant fixe</label>
							<Input
								type="number"
								step="0.01"
								value={form.feeAmount ?? ""}
								onChange={e => setForm({ ...form, feeAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Pourcentage</label>
							<Input
								type="number"
								step="0.0001"
								value={form.feePercentage ?? ""}
								onChange={e => setForm({ ...form, feePercentage: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Frais minimum</label>
							<Input
								type="number"
								step="0.01"
								value={form.minFee ?? ""}
								onChange={e => setForm({ ...form, minFee: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Frais maximum</label>
							<Input
								type="number"
								step="0.01"
								value={form.maxFee ?? ""}
								onChange={e => setForm({ ...form, maxFee: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Dispensable</label>
							<input
								type="checkbox"
								checked={form.isWaivable ?? false}
								onChange={e => setForm({ ...form, isWaivable: e.target.checked })}
								className="rounded"
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Date d'effet *</label>
							<Input
								type="date"
								value={form.effectiveFrom}
								onChange={e => setForm({ ...form, effectiveFrom: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Date de fin</label>
							<Input
								type="date"
								value={form.effectiveTo ?? ""}
								onChange={e => setForm({ ...form, effectiveTo: e.target.value || undefined })}
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={submitting}>{submitting ? "Ajout..." : "Ajouter"}</Button>
						<Button type="button" variant="outline" onClick={onCloseForm}>Annuler</Button>
					</div>
				</form>
			)}

			{fees.length === 0 ? (
				<div className="text-sm text-gray-500 py-8 text-center">Aucun frais configuré</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-2 text-left">Type</th>
								<th className="px-4 py-2 text-left">Nom</th>
								<th className="px-4 py-2 text-left">Montant</th>
								<th className="px-4 py-2 text-left">Base</th>
								<th className="px-4 py-2 text-left">Dispensable</th>
								<th className="px-4 py-2 text-left">Actif</th>
								<th className="px-4 py-2 text-left"></th>
							</tr>
						</thead>
						<tbody>
							{fees.map(fee => (
								<tr key={fee.id} className="border-t">
									<td className="px-4 py-2">{fee.feeType}</td>
									<td className="px-4 py-2">{fee.feeName}</td>
									<td className="px-4 py-2">
										{fee.feeAmount != null ? `${fee.feeAmount} ${fee.currency}` : ""}
										{fee.feePercentage != null ? `${fee.feePercentage}%` : ""}
									</td>
									<td className="px-4 py-2">{fee.feeCalculationBase}</td>
									<td className="px-4 py-2">{fee.isWaivable ? "Oui" : "Non"}</td>
									<td className="px-4 py-2">
										<Badge variant={fee.isActive ? "success" : "neutral"}>
											{fee.isActive ? "Oui" : "Non"}
										</Badge>
									</td>
									<td className="px-4 py-2 relative overflow-visible">
										<div className="relative z-[9999]">
											<button
												ref={(el) => { buttonRefs.current[fee.id] = el; }}
												type="button"
												onClick={(e) => {
													const button = e.currentTarget;
													const rect = button.getBoundingClientRect();
													setMenuPosition({
														top: rect.top - 8,
														right: window.innerWidth - rect.right
													});
													setOpenMenuId(openMenuId === fee.id ? null : fee.id);
												}}
												className="p-1 rounded-md hover:bg-gray-100 transition-colors relative z-[9999]"
											>
												<MoreVertical className="h-4 w-4 text-gray-600" />
											</button>
											{openMenuId === fee.id && menuPosition && (
												<>
													<div
														className="fixed inset-0 z-[9998]"
														onClick={() => {
															setOpenMenuId(null);
															setMenuPosition(null);
														}}
													/>
													<div 
														className="fixed w-48 bg-white rounded-md shadow-lg border border-gray-200 z-[9999]"
														style={{
															top: `${menuPosition.top}px`,
															right: `${menuPosition.right}px`,
															transform: 'translateY(-100%)'
														}}
													>
														<button
															type="button"
															onClick={() => {
																setSelectedFee(fee);
																setShowViewModal(true);
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
														>
															<Eye className="h-4 w-4" />
															Voir
														</button>
														<button
															type="button"
															onClick={() => {
																setSelectedFee(fee);
																setShowEditForm(true);
																onCloseForm();
																setForm({
																	feeType: fee.feeType,
																	feeName: fee.feeName,
																	feeAmount: fee.feeAmount ?? undefined,
																	feePercentage: fee.feePercentage ?? undefined,
																	feeCalculationBase: fee.feeCalculationBase,
																	minFee: fee.minFee ?? undefined,
																	maxFee: fee.maxFee ?? undefined,
																	currency: fee.currency,
																	isWaivable: fee.isWaivable,
																	effectiveFrom: fee.effectiveFrom,
																	effectiveTo: fee.effectiveTo ?? undefined,
																	isActive: fee.isActive
																});
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
														>
															<Edit2 className="h-4 w-4" />
															Modifier
														</button>
														<button
															type="button"
															onClick={() => {
																if (confirm("Êtes-vous sûr de vouloir supprimer ce frais ?")) {
																	onDelete(fee.id);
																}
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
														>
															<Trash2 className="h-4 w-4" />
															Supprimer
														</button>
													</div>
												</>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Modal pour voir les détails */}
			{showViewModal && selectedFee && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
					<div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold">Détails du frais</h3>
							<button
								type="button"
								onClick={() => setShowViewModal(false)}
								className="text-gray-400 hover:text-gray-600"
							>
								×
							</button>
						</div>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-sm font-medium text-gray-500">Type de frais</label>
									<div className="mt-1 text-sm">{selectedFee.feeType}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Nom</label>
									<div className="mt-1 text-sm">{selectedFee.feeName}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Montant fixe</label>
									<div className="mt-1 text-sm">{selectedFee.feeAmount != null ? `${selectedFee.feeAmount} ${selectedFee.currency}` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Pourcentage</label>
									<div className="mt-1 text-sm">{selectedFee.feePercentage != null ? `${selectedFee.feePercentage}%` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Base de calcul</label>
									<div className="mt-1 text-sm">{selectedFee.feeCalculationBase}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Dispensable</label>
									<div className="mt-1 text-sm">{selectedFee.isWaivable ? "Oui" : "Non"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Frais minimum</label>
									<div className="mt-1 text-sm">{selectedFee.minFee != null ? `${selectedFee.minFee}` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Frais maximum</label>
									<div className="mt-1 text-sm">{selectedFee.maxFee != null ? `${selectedFee.maxFee}` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Date d'effet</label>
									<div className="mt-1 text-sm">{selectedFee.effectiveFrom}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Date de fin</label>
									<div className="mt-1 text-sm">{selectedFee.effectiveTo ?? "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Statut</label>
									<div className="mt-1">
										<Badge variant={selectedFee.isActive ? "success" : "neutral"}>
											{selectedFee.isActive ? "Actif" : "Inactif"}
										</Badge>
									</div>
								</div>
							</div>
						</div>
						<div className="mt-6 flex justify-end">
							<Button variant="outline" onClick={() => setShowViewModal(false)}>Fermer</Button>
						</div>
					</div>
				</div>
			)}

			{/* Formulaire de modification */}
			{showEditForm && selectedFee && (
				<div className="border rounded-md p-4 space-y-4 bg-gray-50 mt-4">
					<div className="flex justify-between items-center mb-2">
						<h4 className="font-semibold">Modifier le frais</h4>
						<button
							type="button"
							onClick={() => {
								setShowEditForm(false);
								setSelectedFee(null);
							}}
							className="text-gray-400 hover:text-gray-600"
						>
							×
						</button>
					</div>
					<div className="text-sm text-amber-600 mb-4">
						⚠️ La modification des frais n'est pas encore implémentée dans l'API. Cette fonctionnalité sera disponible prochainement.
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => {
							setShowEditForm(false);
							setSelectedFee(null);
						}}>Annuler</Button>
					</div>
				</div>
			)}
		</div>
	);
}

// Component for Limits Tab
function LimitsTab({
	productId,
	limits,
	loading,
	onAdd,
	onDelete,
	onRefresh,
	showForm,
	onCloseForm
}: {
	productId: string;
	limits: ProductLimit[];
	loading?: boolean;
	onAdd: () => void;
	onDelete: (id: number) => void;
	onRefresh: () => void;
	showForm: boolean;
	onCloseForm: () => void;
}) {
	const [form, setForm] = useState<CreateProductLimitRequest>({
		limitType: "DAILY_LIMIT",
		limitValue: 0,
		effectiveFrom: new Date().toISOString().split('T')[0],
		isActive: true
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedLimit, setSelectedLimit] = useState<ProductLimit | null>(null);
	const [showViewModal, setShowViewModal] = useState(false);
	const [showEditForm, setShowEditForm] = useState(false);
	const [openMenuId, setOpenMenuId] = useState<number | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
	const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await productsApi.addLimit(productId, form);
			onCloseForm();
			setForm({
				limitType: "DAILY_LIMIT",
				limitValue: 0,
				effectiveFrom: new Date().toISOString().split('T')[0],
				isActive: true
			});
			onRefresh();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de l'ajout");
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return <div className="text-sm text-gray-500 py-8 text-center">Chargement...</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Limites ({limits.length})</h3>
				{!showForm && <Button onClick={onAdd}>+ Ajouter une limite</Button>}
			</div>

			{showForm && (
				<form onSubmit={handleSubmit} className="border rounded-md p-4 space-y-4 bg-gray-50">
					{error && <div className="text-sm text-red-600">{error}</div>}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm mb-1">Type de limite *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.limitType}
								onChange={e => setForm({ ...form, limitType: e.target.value as LimitType })}
								required
							>
								<option value="MIN_BALANCE">Solde minimum</option>
								<option value="MAX_BALANCE">Solde maximum</option>
								<option value="MIN_TRANSACTION">Transaction minimum</option>
								<option value="MAX_TRANSACTION">Transaction maximum</option>
								<option value="DAILY_LIMIT">Limite quotidienne</option>
								<option value="MONTHLY_LIMIT">Limite mensuelle</option>
								<option value="ANNUAL_LIMIT">Limite annuelle</option>
								<option value="MIN_LOAN_AMOUNT">Prêt minimum</option>
								<option value="MAX_LOAN_AMOUNT">Prêt maximum</option>
								<option value="MIN_DEPOSIT_AMOUNT">Dépôt minimum</option>
								<option value="MAX_DEPOSIT_AMOUNT">Dépôt maximum</option>
								<option value="CARD_LIMIT">Limite de carte</option>
								<option value="WITHDRAWAL_LIMIT">Limite de retrait</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Valeur *</label>
							<Input
								type="number"
								step="0.01"
								value={form.limitValue}
								onChange={e => setForm({ ...form, limitValue: parseFloat(e.target.value) || 0 })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Période</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.periodType ?? ""}
								onChange={e => setForm({ ...form, periodType: e.target.value ? e.target.value as PeriodType : undefined })}
							>
								<option value="">Aucune</option>
								<option value="TRANSACTION">Par transaction</option>
								<option value="DAILY">Quotidien</option>
								<option value="WEEKLY">Hebdomadaire</option>
								<option value="MONTHLY">Mensuel</option>
								<option value="ANNUAL">Annuel</option>
								<option value="LIFETIME">À vie</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Date d'effet *</label>
							<Input
								type="date"
								value={form.effectiveFrom}
								onChange={e => setForm({ ...form, effectiveFrom: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Date de fin</label>
							<Input
								type="date"
								value={form.effectiveTo ?? ""}
								onChange={e => setForm({ ...form, effectiveTo: e.target.value || undefined })}
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={submitting}>{submitting ? "Ajout..." : "Ajouter"}</Button>
						<Button type="button" variant="outline" onClick={onCloseForm}>Annuler</Button>
					</div>
				</form>
			)}

			{limits.length === 0 ? (
				<div className="text-sm text-gray-500 py-8 text-center">Aucune limite configurée</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-2 text-left">Type</th>
								<th className="px-4 py-2 text-left">Valeur</th>
								<th className="px-4 py-2 text-left">Période</th>
								<th className="px-4 py-2 text-left">Actif</th>
								<th className="px-4 py-2 text-left"></th>
							</tr>
						</thead>
						<tbody>
							{limits.map(limit => (
								<tr key={limit.id} className="border-t">
									<td className="px-4 py-2">{limit.limitType}</td>
									<td className="px-4 py-2">{limit.limitValue} {limit.currency}</td>
									<td className="px-4 py-2">{limit.periodType ?? "-"}</td>
									<td className="px-4 py-2">
										<Badge variant={limit.isActive ? "success" : "neutral"}>
											{limit.isActive ? "Oui" : "Non"}
										</Badge>
									</td>
									<td className="px-4 py-2 relative overflow-visible">
										<div className="relative z-[9999]">
											<button
												ref={(el) => { buttonRefs.current[limit.id] = el; }}
												type="button"
												onClick={(e) => {
													const button = e.currentTarget;
													const rect = button.getBoundingClientRect();
													setMenuPosition({
														top: rect.top - 8,
														right: window.innerWidth - rect.right
													});
													setOpenMenuId(openMenuId === limit.id ? null : limit.id);
												}}
												className="p-1 rounded-md hover:bg-gray-100 transition-colors relative z-[9999]"
											>
												<MoreVertical className="h-4 w-4 text-gray-600" />
											</button>
											{openMenuId === limit.id && menuPosition && (
												<>
													<div
														className="fixed inset-0 z-[9998]"
														onClick={() => {
															setOpenMenuId(null);
															setMenuPosition(null);
														}}
													/>
													<div 
														className="fixed w-48 bg-white rounded-md shadow-lg border border-gray-200 z-[9999]"
														style={{
															top: `${menuPosition.top}px`,
															right: `${menuPosition.right}px`,
															transform: 'translateY(-100%)'
														}}
													>
														<button
															type="button"
															onClick={() => {
																setSelectedLimit(limit);
																setShowViewModal(true);
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
														>
															<Eye className="h-4 w-4" />
															Voir
														</button>
														<button
															type="button"
															onClick={() => {
																setSelectedLimit(limit);
																setShowEditForm(true);
																onCloseForm();
																setForm({
																	limitType: limit.limitType,
																	limitValue: limit.limitValue,
																	currency: limit.currency,
																	periodType: limit.periodType ?? undefined,
																	effectiveFrom: limit.effectiveFrom,
																	effectiveTo: limit.effectiveTo ?? undefined,
																	isActive: limit.isActive
																});
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
														>
															<Edit2 className="h-4 w-4" />
															Modifier
														</button>
														<button
															type="button"
															onClick={() => {
																if (confirm("Êtes-vous sûr de vouloir supprimer cette limite ?")) {
																	onDelete(limit.id);
																}
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
														>
															<Trash2 className="h-4 w-4" />
															Supprimer
														</button>
													</div>
												</>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Modal pour voir les détails */}
			{showViewModal && selectedLimit && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
					<div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold">Détails de la limite</h3>
							<button
								type="button"
								onClick={() => setShowViewModal(false)}
								className="text-gray-400 hover:text-gray-600"
							>
								×
							</button>
						</div>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-sm font-medium text-gray-500">Type de limite</label>
									<div className="mt-1 text-sm">{selectedLimit.limitType}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Valeur</label>
									<div className="mt-1 text-sm font-semibold">{selectedLimit.limitValue} {selectedLimit.currency}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Période</label>
									<div className="mt-1 text-sm">{selectedLimit.periodType ?? "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Date d'effet</label>
									<div className="mt-1 text-sm">{selectedLimit.effectiveFrom}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Date de fin</label>
									<div className="mt-1 text-sm">{selectedLimit.effectiveTo ?? "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Statut</label>
									<div className="mt-1">
										<Badge variant={selectedLimit.isActive ? "success" : "neutral"}>
											{selectedLimit.isActive ? "Actif" : "Inactif"}
										</Badge>
									</div>
								</div>
							</div>
						</div>
						<div className="mt-6 flex justify-end">
							<Button variant="outline" onClick={() => setShowViewModal(false)}>Fermer</Button>
						</div>
					</div>
				</div>
			)}

			{/* Formulaire de modification */}
			{showEditForm && selectedLimit && (
				<div className="border rounded-md p-4 space-y-4 bg-gray-50 mt-4">
					<div className="flex justify-between items-center mb-2">
						<h4 className="font-semibold">Modifier la limite</h4>
						<button
							type="button"
							onClick={() => {
								setShowEditForm(false);
								setSelectedLimit(null);
							}}
							className="text-gray-400 hover:text-gray-600"
						>
							×
						</button>
					</div>
					<div className="text-sm text-amber-600 mb-4">
						⚠️ La modification des limites n'est pas encore implémentée dans l'API. Cette fonctionnalité sera disponible prochainement.
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => {
							setShowEditForm(false);
							setSelectedLimit(null);
						}}>Annuler</Button>
					</div>
				</div>
			)}
		</div>
	);
}

// Component for Periods Tab
function PeriodsTab({
	productId,
	periods,
	loading,
	onAdd,
	onDelete,
	onRefresh,
	showForm,
	onCloseForm
}: {
	productId: string;
	periods: ProductPeriod[];
	loading?: boolean;
	onAdd: () => void;
	onDelete: (id: number) => void;
	onRefresh: () => void;
	showForm: boolean;
	onCloseForm: () => void;
}) {
	const [form, setForm] = useState<CreateProductPeriodRequest>({
		periodName: "",
		periodDays: 0,
		displayOrder: 0,
		isActive: true
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedPeriod, setSelectedPeriod] = useState<ProductPeriod | null>(null);
	const [showViewModal, setShowViewModal] = useState(false);
	const [showEditForm, setShowEditForm] = useState(false);
	const [openMenuId, setOpenMenuId] = useState<number | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
	const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await productsApi.addPeriod(productId, form);
			onCloseForm();
			setForm({
				periodName: "",
				periodDays: 0,
				displayOrder: 0,
				isActive: true
			});
			onRefresh();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de l'ajout");
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return <div className="text-sm text-gray-500 py-8 text-center">Chargement...</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Périodes ({periods.length})</h3>
				{!showForm && <Button onClick={onAdd}>+ Ajouter une période</Button>}
			</div>

			{showForm && (
				<form onSubmit={handleSubmit} className="border rounded-md p-4 space-y-4 bg-gray-50">
					{error && <div className="text-sm text-red-600">{error}</div>}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm mb-1">Nom de la période *</label>
							<Input
								value={form.periodName}
								onChange={e => setForm({ ...form, periodName: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Durée en jours *</label>
							<Input
								type="number"
								value={form.periodDays}
								onChange={e => setForm({ ...form, periodDays: parseInt(e.target.value) || 0 })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Durée en mois</label>
							<Input
								type="number"
								value={form.periodMonths ?? ""}
								onChange={e => setForm({ ...form, periodMonths: e.target.value ? parseInt(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Durée en années</label>
							<Input
								type="number"
								value={form.periodYears ?? ""}
								onChange={e => setForm({ ...form, periodYears: e.target.value ? parseInt(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Taux d'intérêt (%)</label>
							<Input
								type="number"
								step="0.0001"
								value={form.interestRate ?? ""}
								onChange={e => setForm({ ...form, interestRate: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Montant minimum</label>
							<Input
								type="number"
								step="0.01"
								value={form.minAmount ?? ""}
								onChange={e => setForm({ ...form, minAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Montant maximum</label>
							<Input
								type="number"
								step="0.01"
								value={form.maxAmount ?? ""}
								onChange={e => setForm({ ...form, maxAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Ordre d'affichage</label>
							<Input
								type="number"
								value={form.displayOrder ?? 0}
								onChange={e => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={submitting}>{submitting ? "Ajout..." : "Ajouter"}</Button>
						<Button type="button" variant="outline" onClick={onCloseForm}>Annuler</Button>
					</div>
				</form>
			)}

			{periods.length === 0 ? (
				<div className="text-sm text-gray-500 py-8 text-center">Aucune période configurée</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-2 text-left">Nom</th>
								<th className="px-4 py-2 text-left">Durée</th>
								<th className="px-4 py-2 text-left">Taux</th>
								<th className="px-4 py-2 text-left">Montant</th>
								<th className="px-4 py-2 text-left">Ordre</th>
								<th className="px-4 py-2 text-left">Actif</th>
								<th className="px-4 py-2 text-left"></th>
							</tr>
						</thead>
						<tbody>
							{periods.map(period => (
								<tr key={period.id} className="border-t">
									<td className="px-4 py-2">{period.periodName}</td>
									<td className="px-4 py-2">
										{period.periodDays} jours
										{period.periodMonths && ` (${period.periodMonths} mois)`}
										{period.periodYears && ` (${period.periodYears} ans)`}
									</td>
									<td className="px-4 py-2">{period.interestRate != null ? `${period.interestRate}%` : "-"}</td>
									<td className="px-4 py-2">
										{period.minAmount != null || period.maxAmount != null
											? `${period.minAmount ?? "0"} - ${period.maxAmount ?? "∞"}`
											: "-"}
									</td>
									<td className="px-4 py-2">{period.displayOrder}</td>
									<td className="px-4 py-2">
										<Badge variant={period.isActive ? "success" : "neutral"}>
											{period.isActive ? "Oui" : "Non"}
										</Badge>
									</td>
									<td className="px-4 py-2 relative overflow-visible">
										<div className="relative z-[9999]">
											<button
												ref={(el) => { buttonRefs.current[period.id] = el; }}
												type="button"
												onClick={(e) => {
													const button = e.currentTarget;
													const rect = button.getBoundingClientRect();
													setMenuPosition({
														top: rect.top - 8,
														right: window.innerWidth - rect.right
													});
													setOpenMenuId(openMenuId === period.id ? null : period.id);
												}}
												className="p-1 rounded-md hover:bg-gray-100 transition-colors relative z-[9999]"
											>
												<MoreVertical className="h-4 w-4 text-gray-600" />
											</button>
											{openMenuId === period.id && menuPosition && (
												<>
													<div
														className="fixed inset-0 z-[9998]"
														onClick={() => {
															setOpenMenuId(null);
															setMenuPosition(null);
														}}
													/>
													<div 
														className="fixed w-48 bg-white rounded-md shadow-lg border border-gray-200 z-[9999]"
														style={{
															top: `${menuPosition.top}px`,
															right: `${menuPosition.right}px`,
															transform: 'translateY(-100%)'
														}}
													>
														<button
															type="button"
															onClick={() => {
																setSelectedPeriod(period);
																setShowViewModal(true);
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
														>
															<Eye className="h-4 w-4" />
															Voir
														</button>
														<button
															type="button"
															onClick={() => {
																setSelectedPeriod(period);
																setShowEditForm(true);
																onCloseForm();
																setForm({
																	periodName: period.periodName,
																	periodDays: period.periodDays,
																	periodMonths: period.periodMonths ?? undefined,
																	periodYears: period.periodYears ?? undefined,
																	interestRate: period.interestRate ?? undefined,
																	minAmount: period.minAmount ?? undefined,
																	maxAmount: period.maxAmount ?? undefined,
																	isActive: period.isActive,
																	displayOrder: period.displayOrder
																});
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
														>
															<Edit2 className="h-4 w-4" />
															Modifier
														</button>
														<button
															type="button"
															onClick={() => {
																if (confirm("Êtes-vous sûr de vouloir supprimer cette période ?")) {
																	onDelete(period.id);
																}
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
														>
															<Trash2 className="h-4 w-4" />
															Supprimer
														</button>
													</div>
												</>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Modal pour voir les détails */}
			{showViewModal && selectedPeriod && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
					<div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold">Détails de la période</h3>
							<button
								type="button"
								onClick={() => setShowViewModal(false)}
								className="text-gray-400 hover:text-gray-600"
							>
								×
							</button>
						</div>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-sm font-medium text-gray-500">Nom</label>
									<div className="mt-1 text-sm">{selectedPeriod.periodName}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Durée (jours)</label>
									<div className="mt-1 text-sm">{selectedPeriod.periodDays}</div>
								</div>
								{selectedPeriod.periodMonths && (
									<div>
										<label className="text-sm font-medium text-gray-500">Durée (mois)</label>
										<div className="mt-1 text-sm">{selectedPeriod.periodMonths}</div>
									</div>
								)}
								{selectedPeriod.periodYears && (
									<div>
										<label className="text-sm font-medium text-gray-500">Durée (années)</label>
										<div className="mt-1 text-sm">{selectedPeriod.periodYears}</div>
									</div>
								)}
								<div>
									<label className="text-sm font-medium text-gray-500">Taux d'intérêt</label>
									<div className="mt-1 text-sm">{selectedPeriod.interestRate != null ? `${selectedPeriod.interestRate}%` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Montant minimum</label>
									<div className="mt-1 text-sm">{selectedPeriod.minAmount != null ? `${selectedPeriod.minAmount}` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Montant maximum</label>
									<div className="mt-1 text-sm">{selectedPeriod.maxAmount != null ? `${selectedPeriod.maxAmount}` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Ordre d'affichage</label>
									<div className="mt-1 text-sm">{selectedPeriod.displayOrder}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Statut</label>
									<div className="mt-1">
										<Badge variant={selectedPeriod.isActive ? "success" : "neutral"}>
											{selectedPeriod.isActive ? "Actif" : "Inactif"}
										</Badge>
									</div>
								</div>
							</div>
						</div>
						<div className="mt-6 flex justify-end">
							<Button variant="outline" onClick={() => setShowViewModal(false)}>Fermer</Button>
						</div>
					</div>
				</div>
			)}

			{/* Formulaire de modification */}
			{showEditForm && selectedPeriod && (
				<div className="border rounded-md p-4 space-y-4 bg-gray-50 mt-4">
					<div className="flex justify-between items-center mb-2">
						<h4 className="font-semibold">Modifier la période</h4>
						<button
							type="button"
							onClick={() => {
								setShowEditForm(false);
								setSelectedPeriod(null);
							}}
							className="text-gray-400 hover:text-gray-600"
						>
							×
						</button>
					</div>
					<div className="text-sm text-amber-600 mb-4">
						⚠️ La modification des périodes n'est pas encore implémentée dans l'API. Cette fonctionnalité sera disponible prochainement.
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => {
							setShowEditForm(false);
							setSelectedPeriod(null);
						}}>Annuler</Button>
					</div>
				</div>
			)}
		</div>
	);
}

// Component for Penalties Tab
function PenaltiesTab({
	productId,
	penalties,
	loading,
	onAdd,
	onDelete,
	onRefresh,
	showForm,
	onCloseForm
}: {
	productId: string;
	penalties: ProductPenalty[];
	loading?: boolean;
	onAdd: () => void;
	onDelete: (id: number) => void;
	onRefresh: () => void;
	showForm: boolean;
	onCloseForm: () => void;
}) {
	const [form, setForm] = useState<CreateProductPenaltyRequest>({
		penaltyType: "LATE_PAYMENT",
		penaltyName: "",
		calculationBase: "FIXED",
		effectiveFrom: new Date().toISOString().split('T')[0],
		isActive: true
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedPenalty, setSelectedPenalty] = useState<ProductPenalty | null>(null);
	const [showViewModal, setShowViewModal] = useState(false);
	const [showEditForm, setShowEditForm] = useState(false);
	const [openMenuId, setOpenMenuId] = useState<number | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
	const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await productsApi.addPenalty(productId, form);
			onCloseForm();
			setForm({
				penaltyType: "LATE_PAYMENT",
				penaltyName: "",
				calculationBase: "FIXED",
				effectiveFrom: new Date().toISOString().split('T')[0],
				isActive: true
			});
			onRefresh();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de l'ajout");
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return <div className="text-sm text-gray-500 py-8 text-center">Chargement...</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Pénalités ({penalties.length})</h3>
				{!showForm && <Button onClick={onAdd}>+ Ajouter une pénalité</Button>}
			</div>

			{showForm && (
				<form onSubmit={handleSubmit} className="border rounded-md p-4 space-y-4 bg-gray-50">
					{error && <div className="text-sm text-red-600">{error}</div>}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm mb-1">Type de pénalité *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.penaltyType}
								onChange={e => setForm({ ...form, penaltyType: e.target.value as PenaltyType })}
								required
							>
								<option value="EARLY_WITHDRAWAL">Retrait anticipé</option>
								<option value="OVERDRAFT">Découvert</option>
								<option value="LATE_PAYMENT">Retard de paiement</option>
								<option value="MIN_BALANCE_VIOLATION">Violation solde minimum</option>
								<option value="EXCESS_TRANSACTION">Transaction excessive</option>
								<option value="PREPAYMENT">Prépaiement</option>
								<option value="OTHER">Autre</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Nom de la pénalité *</label>
							<Input
								value={form.penaltyName}
								onChange={e => setForm({ ...form, penaltyName: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Base de calcul *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.calculationBase}
								onChange={e => setForm({ ...form, calculationBase: e.target.value as PenaltyCalculationBase })}
								required
							>
								<option value="FIXED">Fixe</option>
								<option value="PRINCIPAL">Principal</option>
								<option value="INTEREST">Intérêt</option>
								<option value="BALANCE">Solde</option>
								<option value="TRANSACTION_AMOUNT">Montant transaction</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Montant fixe</label>
							<Input
								type="number"
								step="0.01"
								value={form.penaltyAmount ?? ""}
								onChange={e => setForm({ ...form, penaltyAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Pourcentage</label>
							<Input
								type="number"
								step="0.0001"
								value={form.penaltyPercentage ?? ""}
								onChange={e => setForm({ ...form, penaltyPercentage: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Pénalité minimum</label>
							<Input
								type="number"
								step="0.01"
								value={form.minPenalty ?? ""}
								onChange={e => setForm({ ...form, minPenalty: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Pénalité maximum</label>
							<Input
								type="number"
								step="0.01"
								value={form.maxPenalty ?? ""}
								onChange={e => setForm({ ...form, maxPenalty: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Période de grâce (jours)</label>
							<Input
								type="number"
								value={form.gracePeriodDays ?? ""}
								onChange={e => setForm({ ...form, gracePeriodDays: e.target.value ? parseInt(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Date d'effet *</label>
							<Input
								type="date"
								value={form.effectiveFrom}
								onChange={e => setForm({ ...form, effectiveFrom: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Date de fin</label>
							<Input
								type="date"
								value={form.effectiveTo ?? ""}
								onChange={e => setForm({ ...form, effectiveTo: e.target.value || undefined })}
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={submitting}>{submitting ? "Ajout..." : "Ajouter"}</Button>
						<Button type="button" variant="outline" onClick={onCloseForm}>Annuler</Button>
					</div>
				</form>
			)}

			{penalties.length === 0 ? (
				<div className="text-sm text-gray-500 py-8 text-center">Aucune pénalité configurée</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-2 text-left">Type</th>
								<th className="px-4 py-2 text-left">Nom</th>
								<th className="px-4 py-2 text-left">Montant</th>
								<th className="px-4 py-2 text-left">Base</th>
								<th className="px-4 py-2 text-left">Période de grâce</th>
								<th className="px-4 py-2 text-left">Actif</th>
								<th className="px-4 py-2 text-left"></th>
							</tr>
						</thead>
						<tbody>
							{penalties.map(penalty => (
								<tr key={penalty.id} className="border-t">
									<td className="px-4 py-2">{penalty.penaltyType}</td>
									<td className="px-4 py-2">{penalty.penaltyName}</td>
									<td className="px-4 py-2">
										{penalty.penaltyAmount != null ? `${penalty.penaltyAmount} ${penalty.currency}` : ""}
										{penalty.penaltyPercentage != null ? `${penalty.penaltyPercentage}%` : ""}
									</td>
									<td className="px-4 py-2">{penalty.calculationBase}</td>
									<td className="px-4 py-2">{penalty.gracePeriodDays != null ? `${penalty.gracePeriodDays} jours` : "-"}</td>
									<td className="px-4 py-2">
										<Badge variant={penalty.isActive ? "success" : "neutral"}>
											{penalty.isActive ? "Oui" : "Non"}
										</Badge>
									</td>
									<td className="px-4 py-2 relative overflow-visible">
										<div className="relative z-[9999]">
											<button
												ref={(el) => { buttonRefs.current[penalty.id] = el; }}
												type="button"
												onClick={(e) => {
													const button = e.currentTarget;
													const rect = button.getBoundingClientRect();
													setMenuPosition({
														top: rect.top - 8,
														right: window.innerWidth - rect.right
													});
													setOpenMenuId(openMenuId === penalty.id ? null : penalty.id);
												}}
												className="p-1 rounded-md hover:bg-gray-100 transition-colors relative z-[9999]"
											>
												<MoreVertical className="h-4 w-4 text-gray-600" />
											</button>
											{openMenuId === penalty.id && menuPosition && (
												<>
													<div
														className="fixed inset-0 z-[9998]"
														onClick={() => {
															setOpenMenuId(null);
															setMenuPosition(null);
														}}
													/>
													<div 
														className="fixed w-48 bg-white rounded-md shadow-lg border border-gray-200 z-[9999]"
														style={{
															top: `${menuPosition.top}px`,
															right: `${menuPosition.right}px`,
															transform: 'translateY(-100%)'
														}}
													>
														<button
															type="button"
															onClick={() => {
																setSelectedPenalty(penalty);
																setShowViewModal(true);
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
														>
															<Eye className="h-4 w-4" />
															Voir
														</button>
														<button
															type="button"
															onClick={() => {
																setSelectedPenalty(penalty);
																setShowEditForm(true);
																onCloseForm();
																setForm({
																	penaltyType: penalty.penaltyType,
																	penaltyName: penalty.penaltyName,
																	penaltyAmount: penalty.penaltyAmount ?? undefined,
																	penaltyPercentage: penalty.penaltyPercentage ?? undefined,
																	calculationBase: penalty.calculationBase,
																	minPenalty: penalty.minPenalty ?? undefined,
																	maxPenalty: penalty.maxPenalty ?? undefined,
																	currency: penalty.currency,
																	gracePeriodDays: penalty.gracePeriodDays ?? undefined,
																	effectiveFrom: penalty.effectiveFrom,
																	effectiveTo: penalty.effectiveTo ?? undefined,
																	isActive: penalty.isActive
																});
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
														>
															<Edit2 className="h-4 w-4" />
															Modifier
														</button>
														<button
															type="button"
															onClick={() => {
																if (confirm("Êtes-vous sûr de vouloir supprimer cette pénalité ?")) {
																	onDelete(penalty.id);
																}
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
														>
															<Trash2 className="h-4 w-4" />
															Supprimer
														</button>
													</div>
												</>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Modal pour voir les détails */}
			{showViewModal && selectedPenalty && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
					<div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold">Détails de la pénalité</h3>
							<button
								type="button"
								onClick={() => setShowViewModal(false)}
								className="text-gray-400 hover:text-gray-600"
							>
								×
							</button>
						</div>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-sm font-medium text-gray-500">Type de pénalité</label>
									<div className="mt-1 text-sm">{selectedPenalty.penaltyType}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Nom</label>
									<div className="mt-1 text-sm">{selectedPenalty.penaltyName}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Montant fixe</label>
									<div className="mt-1 text-sm">{selectedPenalty.penaltyAmount != null ? `${selectedPenalty.penaltyAmount} ${selectedPenalty.currency}` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Pourcentage</label>
									<div className="mt-1 text-sm">{selectedPenalty.penaltyPercentage != null ? `${selectedPenalty.penaltyPercentage}%` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Base de calcul</label>
									<div className="mt-1 text-sm">{selectedPenalty.calculationBase}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Pénalité minimum</label>
									<div className="mt-1 text-sm">{selectedPenalty.minPenalty != null ? `${selectedPenalty.minPenalty}` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Pénalité maximum</label>
									<div className="mt-1 text-sm">{selectedPenalty.maxPenalty != null ? `${selectedPenalty.maxPenalty}` : "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Période de grâce (jours)</label>
									<div className="mt-1 text-sm">{selectedPenalty.gracePeriodDays ?? "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Date d'effet</label>
									<div className="mt-1 text-sm">{selectedPenalty.effectiveFrom}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Date de fin</label>
									<div className="mt-1 text-sm">{selectedPenalty.effectiveTo ?? "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Statut</label>
									<div className="mt-1">
										<Badge variant={selectedPenalty.isActive ? "success" : "neutral"}>
											{selectedPenalty.isActive ? "Actif" : "Inactif"}
										</Badge>
									</div>
								</div>
							</div>
						</div>
						<div className="mt-6 flex justify-end">
							<Button variant="outline" onClick={() => setShowViewModal(false)}>Fermer</Button>
						</div>
					</div>
				</div>
			)}

			{/* Formulaire de modification */}
			{showEditForm && selectedPenalty && (
				<div className="border rounded-md p-4 space-y-4 bg-gray-50 mt-4">
					<div className="flex justify-between items-center mb-2">
						<h4 className="font-semibold">Modifier la pénalité</h4>
						<button
							type="button"
							onClick={() => {
								setShowEditForm(false);
								setSelectedPenalty(null);
							}}
							className="text-gray-400 hover:text-gray-600"
						>
							×
						</button>
					</div>
					<div className="text-sm text-amber-600 mb-4">
						⚠️ La modification des pénalités n'est pas encore implémentée dans l'API. Cette fonctionnalité sera disponible prochainement.
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => {
							setShowEditForm(false);
							setSelectedPenalty(null);
						}}>Annuler</Button>
					</div>
				</div>
			)}
		</div>
	);
}

// Component for Eligibility Rules Tab
function EligibilityRulesTab({
	productId,
	rules,
	loading,
	onAdd,
	onDelete,
	onRefresh,
	showForm,
	onCloseForm
}: {
	productId: string;
	rules: ProductEligibilityRule[];
	loading?: boolean;
	onAdd: () => void;
	onDelete: (id: number) => void;
	onRefresh: () => void;
	showForm: boolean;
	onCloseForm: () => void;
}) {
	const [form, setForm] = useState<CreateProductEligibilityRuleRequest>({
		ruleType: "MIN_AGE",
		ruleName: "",
		operator: "GREATER_THAN_OR_EQUAL",
		ruleValue: "",
		dataType: "NUMBER",
		isMandatory: true,
		effectiveFrom: new Date().toISOString().split('T')[0],
		isActive: true
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedRule, setSelectedRule] = useState<ProductEligibilityRule | null>(null);
	const [showViewModal, setShowViewModal] = useState(false);
	const [showEditForm, setShowEditForm] = useState(false);
	const [openMenuId, setOpenMenuId] = useState<number | null>(null);
	const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
	const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await productsApi.addEligibilityRule(productId, form);
			onCloseForm();
			setForm({
				ruleType: "MIN_AGE",
				ruleName: "",
				operator: "GREATER_THAN_OR_EQUAL",
				ruleValue: "",
				dataType: "NUMBER",
				isMandatory: true,
				effectiveFrom: new Date().toISOString().split('T')[0],
				isActive: true
			});
			onRefresh();
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de l'ajout");
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return <div className="text-sm text-gray-500 py-8 text-center">Chargement...</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">Règles d'éligibilité ({rules.length})</h3>
				{!showForm && <Button onClick={onAdd}>+ Ajouter une règle</Button>}
			</div>

			{showForm && (
				<form onSubmit={handleSubmit} className="border rounded-md p-4 space-y-4 bg-gray-50">
					{error && <div className="text-sm text-red-600">{error}</div>}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm mb-1">Type de règle *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.ruleType}
								onChange={e => setForm({ ...form, ruleType: e.target.value as EligibilityRuleType })}
								required
							>
								<option value="MIN_AGE">Âge minimum</option>
								<option value="MAX_AGE">Âge maximum</option>
								<option value="MIN_INCOME">Revenu minimum</option>
								<option value="MIN_BALANCE">Solde minimum</option>
								<option value="CLIENT_TYPE">Type de client</option>
								<option value="CLIENT_STATUS">Statut client</option>
								<option value="RESIDENCY">Résidence</option>
								<option value="KYC_LEVEL">Niveau KYC</option>
								<option value="RISK_SCORE">Score de risque</option>
								<option value="PEP_FLAG">Flag PEP</option>
								<option value="OTHER">Autre</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Nom de la règle *</label>
							<Input
								value={form.ruleName}
								onChange={e => setForm({ ...form, ruleName: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Opérateur *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.operator}
								onChange={e => setForm({ ...form, operator: e.target.value as EligibilityOperator })}
								required
							>
								<option value="EQUALS">Égal à</option>
								<option value="NOT_EQUALS">Différent de</option>
								<option value="GREATER_THAN">Supérieur à</option>
								<option value="GREATER_THAN_OR_EQUAL">Supérieur ou égal à</option>
								<option value="LESS_THAN">Inférieur à</option>
								<option value="LESS_THAN_OR_EQUAL">Inférieur ou égal à</option>
								<option value="IN">Dans la liste</option>
								<option value="NOT_IN">Pas dans la liste</option>
								<option value="CONTAINS">Contient</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Type de données *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.dataType}
								onChange={e => setForm({ ...form, dataType: e.target.value as EligibilityDataType })}
								required
							>
								<option value="STRING">Chaîne</option>
								<option value="NUMBER">Nombre</option>
								<option value="BOOLEAN">Booléen</option>
								<option value="DATE">Date</option>
								<option value="ENUM">Énumération</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">Valeur *</label>
							<Input
								value={form.ruleValue}
								onChange={e => setForm({ ...form, ruleValue: e.target.value })}
								placeholder={form.operator === "IN" || form.operator === "NOT_IN" ? '["valeur1", "valeur2"]' : "Valeur"}
								required
							/>
							{form.operator === "IN" || form.operator === "NOT_IN" ? (
								<p className="text-xs text-gray-500 mt-1">Format JSON: ["valeur1", "valeur2"]</p>
							) : null}
						</div>
						<div>
							<label className="block text-sm mb-1">Obligatoire</label>
							<input
								type="checkbox"
								checked={form.isMandatory ?? true}
								onChange={e => setForm({ ...form, isMandatory: e.target.checked })}
								className="rounded"
							/>
							<p className="text-xs text-gray-500 mt-1">Si coché, la règle doit être satisfaite</p>
						</div>
						<div className="col-span-2">
							<label className="block text-sm mb-1">Message d'erreur</label>
							<textarea
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.errorMessage ?? ""}
								onChange={e => setForm({ ...form, errorMessage: e.target.value || undefined })}
								rows={2}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Date d'effet *</label>
							<Input
								type="date"
								value={form.effectiveFrom}
								onChange={e => setForm({ ...form, effectiveFrom: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Date de fin</label>
							<Input
								type="date"
								value={form.effectiveTo ?? ""}
								onChange={e => setForm({ ...form, effectiveTo: e.target.value || undefined })}
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={submitting}>{submitting ? "Ajout..." : "Ajouter"}</Button>
						<Button type="button" variant="outline" onClick={onCloseForm}>Annuler</Button>
					</div>
				</form>
			)}

			{rules.length === 0 ? (
				<div className="text-sm text-gray-500 py-8 text-center">Aucune règle d'éligibilité configurée</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-2 text-left">Type</th>
								<th className="px-4 py-2 text-left">Nom</th>
								<th className="px-4 py-2 text-left">Opérateur</th>
								<th className="px-4 py-2 text-left">Valeur</th>
								<th className="px-4 py-2 text-left">Obligatoire</th>
								<th className="px-4 py-2 text-left">Actif</th>
								<th className="px-4 py-2 text-left"></th>
							</tr>
						</thead>
						<tbody>
							{rules.map(rule => (
								<tr key={rule.id} className="border-t">
									<td className="px-4 py-2">{rule.ruleType}</td>
									<td className="px-4 py-2">{rule.ruleName}</td>
									<td className="px-4 py-2">{rule.operator}</td>
									<td className="px-4 py-2 font-mono text-xs">{rule.ruleValue}</td>
									<td className="px-4 py-2">
										<Badge variant={rule.isMandatory ? "warning" : "neutral"}>
											{rule.isMandatory ? "Oui" : "Non"}
										</Badge>
									</td>
									<td className="px-4 py-2">
										<Badge variant={rule.isActive ? "success" : "neutral"}>
											{rule.isActive ? "Oui" : "Non"}
										</Badge>
									</td>
									<td className="px-4 py-2 relative overflow-visible">
										<div className="relative z-[9999]">
											<button
												ref={(el) => { buttonRefs.current[rule.id] = el; }}
												type="button"
												onClick={(e) => {
													const button = e.currentTarget;
													const rect = button.getBoundingClientRect();
													setMenuPosition({
														top: rect.top - 8,
														right: window.innerWidth - rect.right
													});
													setOpenMenuId(openMenuId === rule.id ? null : rule.id);
												}}
												className="p-1 rounded-md hover:bg-gray-100 transition-colors relative z-[9999]"
											>
												<MoreVertical className="h-4 w-4 text-gray-600" />
											</button>
											{openMenuId === rule.id && menuPosition && (
												<>
													<div
														className="fixed inset-0 z-[9998]"
														onClick={() => {
															setOpenMenuId(null);
															setMenuPosition(null);
														}}
													/>
													<div 
														className="fixed w-48 bg-white rounded-md shadow-lg border border-gray-200 z-[9999]"
														style={{
															top: `${menuPosition.top}px`,
															right: `${menuPosition.right}px`,
															transform: 'translateY(-100%)'
														}}
													>
														<button
															type="button"
															onClick={() => {
																setSelectedRule(rule);
																setShowViewModal(true);
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
														>
															<Eye className="h-4 w-4" />
															Voir
														</button>
														<button
															type="button"
															onClick={() => {
																setSelectedRule(rule);
																setShowEditForm(true);
																onCloseForm();
																setForm({
																	ruleType: rule.ruleType,
																	ruleName: rule.ruleName,
																	operator: rule.operator,
																	ruleValue: rule.ruleValue,
																	dataType: rule.dataType,
																	isMandatory: rule.isMandatory,
																	errorMessage: rule.errorMessage ?? undefined,
																	effectiveFrom: rule.effectiveFrom,
																	effectiveTo: rule.effectiveTo ?? undefined,
																	isActive: rule.isActive
																});
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
														>
															<Edit2 className="h-4 w-4" />
															Modifier
														</button>
														<button
															type="button"
															onClick={() => {
																if (confirm("Êtes-vous sûr de vouloir supprimer cette règle d'éligibilité ?")) {
																	onDelete(rule.id);
																}
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
														>
															<Trash2 className="h-4 w-4" />
															Supprimer
														</button>
													</div>
												</>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Modal pour voir les détails */}
			{showViewModal && selectedRule && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
					<div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold">Détails de la règle d'éligibilité</h3>
							<button
								type="button"
								onClick={() => setShowViewModal(false)}
								className="text-gray-400 hover:text-gray-600"
							>
								×
							</button>
						</div>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-sm font-medium text-gray-500">Type de règle</label>
									<div className="mt-1 text-sm">{selectedRule.ruleType}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Nom</label>
									<div className="mt-1 text-sm">{selectedRule.ruleName}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Opérateur</label>
									<div className="mt-1 text-sm">{selectedRule.operator}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Valeur</label>
									<div className="mt-1 text-sm">{selectedRule.ruleValue}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Type de données</label>
									<div className="mt-1 text-sm">{selectedRule.dataType}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Obligatoire</label>
									<div className="mt-1 text-sm">{selectedRule.isMandatory ? "Oui" : "Non"}</div>
								</div>
								{selectedRule.errorMessage && (
									<div className="col-span-2">
										<label className="text-sm font-medium text-gray-500">Message d'erreur</label>
										<div className="mt-1 text-sm">{selectedRule.errorMessage}</div>
									</div>
								)}
								<div>
									<label className="text-sm font-medium text-gray-500">Date d'effet</label>
									<div className="mt-1 text-sm">{selectedRule.effectiveFrom}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Date de fin</label>
									<div className="mt-1 text-sm">{selectedRule.effectiveTo ?? "-"}</div>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Statut</label>
									<div className="mt-1">
										<Badge variant={selectedRule.isActive ? "success" : "neutral"}>
											{selectedRule.isActive ? "Actif" : "Inactif"}
										</Badge>
									</div>
								</div>
							</div>
						</div>
						<div className="mt-6 flex justify-end">
							<Button variant="outline" onClick={() => setShowViewModal(false)}>Fermer</Button>
						</div>
					</div>
				</div>
			)}

			{/* Formulaire de modification */}
			{showEditForm && selectedRule && (
				<div className="border rounded-md p-4 space-y-4 bg-gray-50 mt-4">
					<div className="flex justify-between items-center mb-2">
						<h4 className="font-semibold">Modifier la règle d'éligibilité</h4>
						<button
							type="button"
							onClick={() => {
								setShowEditForm(false);
								setSelectedRule(null);
							}}
							className="text-gray-400 hover:text-gray-600"
						>
							×
						</button>
					</div>
					<div className="text-sm text-amber-600 mb-4">
						⚠️ La modification des règles d'éligibilité n'est pas encore implémentée dans l'API. Cette fonctionnalité sera disponible prochainement.
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => {
							setShowEditForm(false);
							setSelectedRule(null);
						}}>Annuler</Button>
					</div>
				</div>
			)}
		</div>
	);
}
