"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { productsApi, productGLMappingsApi } from "@/lib/api";
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
	TransactionType,
	PenaltyCalculationBase,
	EligibilityRuleType,
	EligibilityOperator,
	EligibilityDataType
} from "@/types";

export default function ProductDetailPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const params = useParams();
	const id = params.id as string;

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [product, setProduct] = useState<Product | null>(null);
	const [activeTab, setActiveTab] = useState<"overview" | "rates" | "fees" | "limits" | "periods" | "penalties" | "eligibility" | "gl-mappings">("overview");

	// Data states
	const [interestRates, setInterestRates] = useState<ProductInterestRate[]>([]);
	const [fees, setFees] = useState<ProductFee[]>([]);
	const [limits, setLimits] = useState<ProductLimit[]>([]);
	const [periods, setPeriods] = useState<ProductPeriod[]>([]);
	const [penalties, setPenalties] = useState<ProductPenalty[]>([]);
	const [eligibilityRules, setEligibilityRules] = useState<ProductEligibilityRule[]>([]);
	const [glMappings, setGlMappings] = useState<import("@/types").ProductGLMapping[]>([]);
	const [loadingConfigs, setLoadingConfigs] = useState(false);

	// Form states
	const [showRateForm, setShowRateForm] = useState(false);
	const [showFeeForm, setShowFeeForm] = useState(false);
	const [showLimitForm, setShowLimitForm] = useState(false);
	const [showPeriodForm, setShowPeriodForm] = useState(false);
	const [showPenaltyForm, setShowPenaltyForm] = useState(false);
	const [showRuleForm, setShowRuleForm] = useState(false);
	const [showMappingForm, setShowMappingForm] = useState(false);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const data = await productsApi.get(id);
			setProduct(data);
			await loadAllConfigurations();
		} catch (e: any) {
			setError(e?.message ?? t("product.detail.error"));
		} finally {
			setLoading(false);
		}
	}

	async function loadAllConfigurations() {
		setLoadingConfigs(true);
		try {
			console.log("Chargement des configurations pour le produit:", id);
			const [ratesData, feesData, limitsData, periodsData, penaltiesData, rulesData, mappingsData] = await Promise.all([
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
				}),
				productGLMappingsApi.list(id).catch(e => {
					console.error("Erreur lors du chargement des mappings GL:", e);
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
			setGlMappings(mappingsData || []);
		} catch (e: any) {
			console.error("Erreur lors du chargement des configurations:", e);
			// S'assurer que les états sont initialisés même en cas d'erreur
			setInterestRates([]);
			setFees([]);
			setLimits([]);
			setPeriods([]);
			setPenalties([]);
			setEligibilityRules([]);
			setGlMappings([]);
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
		
		// Compter les configurations pour informer l'utilisateur
		const totalConfigurations = 
			interestRates.length + 
			fees.length + 
			limits.length + 
			periods.length + 
			penalties.length + 
			eligibilityRules.length;
		
		const configurationsMessage = totalConfigurations > 0 
			? `\n\nAttention: Toutes les configurations associées seront également supprimées :\n` +
				(interestRates.length > 0 ? `- ${interestRates.length} taux d'intérêt\n` : '') +
				(fees.length > 0 ? `- ${fees.length} frais\n` : '') +
				(limits.length > 0 ? `- ${limits.length} limites\n` : '') +
				(periods.length > 0 ? `- ${periods.length} périodes\n` : '') +
				(penalties.length > 0 ? `- ${penalties.length} pénalités\n` : '') +
				(eligibilityRules.length > 0 ? `- ${eligibilityRules.length} règles d'éligibilité\n` : '')
			: '';
		
		if (!confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.name}" ?${configurationsMessage}\n\nCette action est irréversible.\n\nNote: Le produit ne peut pas être supprimé s'il existe des comptes ouverts avec ce produit.`)) {
			return;
		}
		
		try {
			await productsApi.delete(product.id);
			router.push("/products");
		} catch (e: any) {
			// Le backend vérifie les comptes et retourne un message d'erreur approprié
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

	async function handleDeleteMapping(mappingId: number) {
		if (!confirm("Êtes-vous sûr de vouloir supprimer ce mapping GL ?")) return;
		try {
			const { productGLMappingsApi } = await import("@/lib/api");
			await productGLMappingsApi.delete(id, mappingId);
			await loadAllConfigurations();
		} catch (e: any) {
			alert(e?.message ?? "Erreur lors de la suppression");
		}
	}

	if (loading) {
		return <div className="p-4">{t("product.detail.loading")}</div>;
	}

	if (error || !product) {
		return (
			<div className="space-y-4">
				<div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-r-md flex items-start gap-3">
					<svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
					</svg>
					<div>
						<div className="font-medium">{t("product.detail.error")}</div>
						<div className="text-sm mt-1">{error ?? t("product.detail.notFound")}</div>
					</div>
				</div>
				<Link href="/products">
					<Button className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						{t("product.detail.backToList")}
					</Button>
				</Link>
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
		{ id: "overview" as const, label: t("product.detail.tabs.overview") },
		{ id: "rates" as const, label: `${t("product.detail.tabs.rates")} (${interestRates.length})` },
		{ id: "fees" as const, label: `${t("product.detail.tabs.fees")} (${fees.length})` },
		{ id: "limits" as const, label: `${t("product.detail.tabs.limits")} (${limits.length})` },
		{ id: "periods" as const, label: `${t("product.detail.tabs.periods")} (${periods.length})` },
		{ id: "penalties" as const, label: `${t("product.detail.tabs.penalties")} (${penalties.length})` },
		{ id: "eligibility" as const, label: `${t("product.detail.tabs.eligibility")} (${eligibilityRules.length})` },
		{ id: "gl-mappings" as const, label: `${t("product.detail.tabs.glMappings")} (${glMappings.length})` }
	];

	return (
		<div className="space-y-6">
			{/* En-tête amélioré */}
			<div>
				<Link href="/products" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("product.detail.backToList")}
				</Link>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
							<Package className="w-7 h-7 text-white" />
						</div>
						<div>
							<h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
							<p className="text-gray-600 mt-1">{t("product.detail.subtitle")}</p>
							<div className="flex gap-2 mt-2">
								<Badge variant={statusBadgeVariant(product.status)}>{product.status}</Badge>
								<span className="text-sm text-gray-500">{categoryLabel(product.category)}</span>
							</div>
						</div>
					</div>
					<div className="flex gap-2">
						{product.status === "ACTIVE" ? (
							<Button variant="outline" onClick={handleDeactivate} className="flex items-center gap-2">
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
								</svg>
								{t("product.detail.deactivate")}
							</Button>
						) : (
							<Button onClick={handleActivate} className="flex items-center gap-2">
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								{t("product.detail.activate")}
							</Button>
						)}
						<Button variant="outline" onClick={load} className="flex items-center gap-2">
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							{t("product.detail.refresh")}
						</Button>
						<Button 
							variant="outline" 
							onClick={handleDelete}
							className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
							title={t("product.detail.deleteTitle")}
						>
							<Trash2 className="h-4 w-4" />
							{t("product.detail.delete")}
						</Button>
					</div>
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
						productCurrency={product?.currency}
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

				{activeTab === "gl-mappings" && (
					<ProductGLMappingsTab
						productId={id}
						mappings={glMappings}
						loading={loadingConfigs}
						onAdd={() => setShowMappingForm(true)}
						onDelete={handleDeleteMapping}
						onRefresh={loadAllConfigurations}
						showForm={showMappingForm}
						onCloseForm={() => setShowMappingForm(false)}
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
	const { t } = useTranslation();
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
			setError(e?.message ?? t("product.detail.overview.updateError"));
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
						<label className="block text-sm mb-1">{t("product.detail.overview.code")}</label>
						<div className="font-mono text-sm text-gray-500">{product.code}</div>
						<p className="text-xs text-gray-400 mt-1">{t("product.detail.overview.codeHint")}</p>
					</div>
					<div>
						<label className="block text-sm mb-1">{t("product.detail.overview.category")}</label>
						<div className="text-sm text-gray-500">{product.category}</div>
						<p className="text-xs text-gray-400 mt-1">{t("product.detail.overview.categoryHint")}</p>
					</div>
					<div>
						<label className="block text-sm mb-1">{t("product.detail.overview.name")} *</label>
						<Input
							value={form.name}
							onChange={e => setForm({ ...form, name: e.target.value })}
							required
						/>
					</div>
					<div>
						<label className="block text-sm mb-1">{t("product.detail.overview.status")}</label>
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
						<label className="block text-sm mb-1">{t("product.detail.overview.currency")}</label>
						<Input
							value={form.currency}
							onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })}
							maxLength={3}
						/>
					</div>
					<div>
						<label className="block text-sm mb-1">{t("product.detail.overview.defaultInterestRate")}</label>
						<Input
							type="number"
							step="0.0001"
							value={form.defaultInterestRate ?? ""}
							onChange={e => setForm({ ...form, defaultInterestRate: e.target.value ? parseFloat(e.target.value) : undefined })}
						/>
					</div>
					<div>
						<label className="block text-sm mb-1">{t("product.detail.overview.minBalance")}</label>
						<Input
							type="number"
							step="0.01"
							value={form.minBalance ?? ""}
							onChange={e => setForm({ ...form, minBalance: e.target.value ? parseFloat(e.target.value) : undefined })}
						/>
					</div>
					<div>
						<label className="block text-sm mb-1">{t("product.detail.overview.maxBalance")}</label>
						<Input
							type="number"
							step="0.01"
							value={form.maxBalance ?? ""}
							onChange={e => setForm({ ...form, maxBalance: e.target.value ? parseFloat(e.target.value) : undefined })}
						/>
					</div>
					<div className="col-span-2">
						<label className="block text-sm mb-1">{t("product.detail.overview.description")}</label>
						<textarea
							className="w-full rounded-md border bg-white px-3 py-2 text-sm"
							value={form.description}
							onChange={e => setForm({ ...form, description: e.target.value })}
							rows={3}
						/>
					</div>
				</div>
				<div className="flex gap-2">
					<Button type="submit" disabled={submitting}>{submitting ? t("product.detail.overview.saving") : t("product.detail.overview.save")}</Button>
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
					}}>{t("product.detail.overview.cancel")}</Button>
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
					<h2 className="text-2xl font-bold text-gray-900">{t("product.detail.overview.edit")}</h2>
					<p className="text-gray-600 mt-1">{t("product.detail.subtitle")}</p>
				</div>
				<Button variant="outline" onClick={() => setEditing(true)} className="flex items-center gap-2">
					<Edit2 className="h-4 w-4" />
					{t("product.detail.overview.edit")}
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
				<div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl shadow-sm overflow-hidden">
					<div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
								<Package className="h-6 w-6 text-white" />
							</div>
							<div>
								<h3 className="text-lg font-bold text-white">Identité</h3>
								<p className="text-xs text-purple-100">Informations de base</p>
							</div>
						</div>
					</div>
					<div className="p-6 space-y-4">
						<div className="bg-white rounded-lg p-4 border border-purple-100">
							<label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
								<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
								</svg>
								Code produit
							</label>
							<div className="font-mono font-bold text-lg text-gray-900 mt-1">{product.code}</div>
						</div>
						<div className="flex items-center justify-between py-2 border-t border-gray-200">
							<dt className="text-sm text-gray-600 flex items-center gap-2">
								<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
								</svg>
								Nom
							</dt>
							<dd className="font-semibold text-gray-900">{product.name}</dd>
						</div>
						<div className="flex items-center justify-between py-2 border-t border-gray-200">
							<dt className="text-sm text-gray-600 flex items-center gap-2">
								<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
								</svg>
								Catégorie
							</dt>
							<dd>
								<Badge variant="neutral">
									{categoryLabel(product.category)}
								</Badge>
							</dd>
						</div>
					</div>
				</div>

				{/* Carte: Statut */}
				<div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm overflow-hidden">
					<div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
								<Tag className="h-6 w-6 text-white" />
							</div>
							<div>
								<h3 className="text-lg font-bold text-white">Statut</h3>
								<p className="text-xs text-blue-100">État et devise</p>
							</div>
						</div>
					</div>
					<div className="p-6 space-y-4">
						<div className="flex items-center justify-between py-2">
							<dt className="text-sm text-gray-600 flex items-center gap-2">
								<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Statut actuel
							</dt>
							<dd>
								<Badge variant={
									product.status === "ACTIVE" ? "success" :
									product.status === "DRAFT" ? "warning" : "danger"
								}>
									{product.status}
								</Badge>
							</dd>
						</div>
						<div className="flex items-center justify-between py-2 border-t border-gray-200">
							<dt className="text-sm text-gray-600 flex items-center gap-2">
								<Currency className="h-4 w-4 text-gray-400" />
								Devise
							</dt>
							<dd>
								<span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
									{product.currency}
								</span>
							</dd>
						</div>
					</div>
				</div>

				{/* Carte: Soldes */}
				<div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm overflow-hidden">
					<div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
								<Wallet className="h-6 w-6 text-white" />
							</div>
							<div>
								<h3 className="text-lg font-bold text-white">Soldes</h3>
								<p className="text-xs text-green-100">Limites min/max</p>
							</div>
						</div>
					</div>
					<div className="p-6">
						<div className="grid grid-cols-2 gap-3">
							<div className="bg-white rounded-lg p-4 border border-green-200">
								<label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
									<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									Minimum
								</label>
								<div className="font-bold text-lg text-gray-900">
									{product.minBalance != null ? (
										<span>{product.minBalance.toLocaleString()} <span className="text-sm font-normal text-gray-600">{product.currency}</span></span>
									) : (
										<span className="text-gray-400 text-sm">Non défini</span>
									)}
								</div>
							</div>
							<div className="bg-white rounded-lg p-4 border border-green-200">
								<label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
									<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									Maximum
								</label>
								<div className="font-bold text-lg text-gray-900">
									{product.maxBalance != null ? (
										<span>{product.maxBalance.toLocaleString()} <span className="text-sm font-normal text-gray-600">{product.currency}</span></span>
									) : (
										<span className="text-gray-400 text-sm">Non défini</span>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Carte: Taux d'intérêt */}
				<div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl shadow-sm overflow-hidden">
					<div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
								<TrendingUp className="h-6 w-6 text-white" />
							</div>
							<div>
								<h3 className="text-lg font-bold text-white">Taux d'intérêt</h3>
								<p className="text-xs text-orange-100">Taux par défaut</p>
							</div>
						</div>
					</div>
					<div className="p-6">
						<div className="bg-white rounded-lg p-4 border border-orange-100">
							<label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
								<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
								</svg>
								Taux par défaut
							</label>
							<div className="text-2xl font-bold text-orange-700 mt-1">
								{product.defaultInterestRate != null ? (
									<span>{product.defaultInterestRate}%</span>
								) : (
									<span className="text-gray-400 text-lg">Non défini</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Description */}
			{product.description && (
				<div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
					<div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b border-gray-200">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
								<FileText className="h-5 w-5 text-gray-600" />
							</div>
							<h3 className="text-lg font-bold text-gray-900">Description</h3>
						</div>
					</div>
					<div className="p-6">
						<p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{product.description}</p>
					</div>
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
					<div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
						{/* En-tête avec gradient */}
						<div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
										<TrendingUp className="h-6 w-6 text-white" />
									</div>
									<div>
										<h3 className="text-xl font-bold text-white">Détails du taux d'intérêt</h3>
										<p className="text-sm text-blue-100 mt-0.5">{selectedRate.rateType}</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setShowViewModal(false)}
									className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
								>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						</div>

						{/* Contenu scrollable */}
						<div className="overflow-y-auto p-6 space-y-6">
							{/* Informations principales */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
									<label className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
										</svg>
										Type de taux
									</label>
									<div className="mt-1 font-semibold text-gray-900">{selectedRate.rateType}</div>
								</div>
								<div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-4 border border-cyan-200">
									<label className="text-xs font-medium text-cyan-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<Percent className="w-3 h-3" />
										Valeur du taux
									</label>
									<div className="mt-1 font-semibold text-gray-900">
										<span className="text-2xl text-cyan-700">{selectedRate.rateValue}%</span>
									</div>
								</div>
								<div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
									<label className="text-xs font-medium text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
										</svg>
										Montant minimum
									</label>
									<div className="mt-1 font-semibold text-gray-900">
										{selectedRate.minAmount != null ? (
											<span className="text-lg">{selectedRate.minAmount}</span>
										) : (
											<span className="text-gray-400">-</span>
										)}
									</div>
								</div>
								<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
									<label className="text-xs font-medium text-purple-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
										</svg>
										Montant maximum
									</label>
									<div className="mt-1 font-semibold text-gray-900">
										{selectedRate.maxAmount != null ? (
											<span className="text-lg">{selectedRate.maxAmount}</span>
										) : (
											<span className="text-gray-400">-</span>
										)}
									</div>
								</div>
								<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
									<label className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<Calendar className="w-3 h-3" />
										Période minimum (jours)
									</label>
									<div className="mt-1 font-semibold text-gray-900">
										{selectedRate.minPeriodDays != null ? (
											<span className="text-lg">{selectedRate.minPeriodDays}</span>
										) : (
											<span className="text-gray-400">-</span>
										)}
									</div>
								</div>
								<div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 border border-teal-200">
									<label className="text-xs font-medium text-teal-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<Calendar className="w-3 h-3" />
										Période maximum (jours)
									</label>
									<div className="mt-1 font-semibold text-gray-900">
										{selectedRate.maxPeriodDays != null ? (
											<span className="text-lg">{selectedRate.maxPeriodDays}</span>
										) : (
											<span className="text-gray-400">-</span>
										)}
									</div>
								</div>
								<div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
									<label className="text-xs font-medium text-orange-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<BarChart3 className="w-3 h-3" />
										Méthode de calcul
									</label>
									<div className="mt-1 font-semibold text-gray-900">{selectedRate.calculationMethod}</div>
								</div>
								{selectedRate.compoundingFrequency && (
									<div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
										<label className="text-xs font-medium text-yellow-700 uppercase tracking-wide mb-2 flex items-center gap-1">
											<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											Fréquence de capitalisation
										</label>
										<div className="mt-1 font-semibold text-gray-900">{selectedRate.compoundingFrequency}</div>
									</div>
								)}
							</div>

							{/* Dates et statut */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										Date d'effet
									</dt>
									<dd className="font-semibold text-gray-900">{selectedRate.effectiveFrom}</dd>
								</div>
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										Date de fin
									</dt>
									<dd className="font-semibold text-gray-900">{selectedRate.effectiveTo ?? "-"}</dd>
								</div>
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										Statut
									</dt>
									<dd>
										<Badge variant={selectedRate.isActive ? "success" : "neutral"}>
											{selectedRate.isActive ? "Actif" : "Inactif"}
										</Badge>
									</dd>
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
							<Button variant="outline" onClick={() => setShowViewModal(false)} className="flex items-center gap-2">
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
								Fermer
							</Button>
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
	productCurrency,
	fees,
	loading,
	onAdd,
	onDelete,
	onRefresh,
	showForm,
	onCloseForm
}: {
	productId: string;
	productCurrency?: string;
	fees: ProductFee[];
	loading?: boolean;
	onAdd: () => void;
	onDelete: (id: number) => void;
	onRefresh: () => void;
	showForm: boolean;
	onCloseForm: () => void;
}) {
	const { t } = useTranslation();
	const [form, setForm] = useState<CreateProductFeeRequest>({
		feeType: "MONTHLY",
		transactionType: null,
		feeName: "",
		feeCalculationBase: "FIXED",
		currency: productCurrency ?? "USD",
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
			// Préparer les données en mettant à null les champs non pertinents
			const submitData: CreateProductFeeRequest = {
				...form,
				// Si base de calcul est FIXED, mettre feePercentage à null
				feePercentage: form.feeCalculationBase === "FIXED" ? undefined : form.feePercentage,
				// Si base de calcul est TRANSACTION_AMOUNT, mettre feeAmount à null
				feeAmount: form.feeCalculationBase === "TRANSACTION_AMOUNT" ? undefined : form.feeAmount
			};
			await productsApi.addFee(productId, submitData);
			onCloseForm();
			setForm({
				feeType: "MONTHLY",
				transactionType: null,
				feeName: "",
				feeCalculationBase: "FIXED",
				currency: productCurrency ?? "USD",
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
		return <div className="text-sm text-gray-500 py-8 text-center">{t("product.detail.fees.loading")}</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">{t("product.detail.fees.count", { count: fees.length })}</h3>
				{!showForm && <Button onClick={onAdd}>{t("product.detail.fees.addButton")}</Button>}
			</div>

			{showForm && (
				<form onSubmit={handleSubmit} className="border rounded-md p-4 space-y-4 bg-gray-50">
					{error && <div className="text-sm text-red-600">{error}</div>}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.feeType")}</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.feeType}
								onChange={e => {
									const newFeeType = e.target.value as FeeType;
									// Réinitialiser transactionType si on change de type de frais
									const newTransactionType = newFeeType === "TRANSACTION" ? form.transactionType : null;
									// Si le type de transaction devient TRANSFER, ajuster la base de calcul si nécessaire
									let newCalculationBase = form.feeCalculationBase;
									if (newFeeType === "TRANSACTION" && newTransactionType === "TRANSFER") {
										// Si la base de calcul actuelle n'est pas valide pour TRANSFER, la réinitialiser à FIXED
										if (newCalculationBase !== "FIXED" && newCalculationBase !== "TRANSACTION_AMOUNT") {
											newCalculationBase = "FIXED";
										}
									}
									setForm({ 
										...form, 
										feeType: newFeeType,
										transactionType: newTransactionType,
										feeCalculationBase: newCalculationBase
									});
								}}
								required
							>
								<option value="OPENING">{t("product.detail.fees.feeTypes.OPENING")}</option>
								<option value="MONTHLY">{t("product.detail.fees.feeTypes.MONTHLY")}</option>
								<option value="ANNUAL">{t("product.detail.fees.feeTypes.ANNUAL")}</option>
								<option value="TRANSACTION">{t("product.detail.fees.feeTypes.TRANSACTION")}</option>
								<option value="OVERDRAFT">{t("product.detail.fees.feeTypes.OVERDRAFT")}</option>
								<option value="LATE_PAYMENT">{t("product.detail.fees.feeTypes.LATE_PAYMENT")}</option>
								<option value="EARLY_WITHDRAWAL">{t("product.detail.fees.feeTypes.EARLY_WITHDRAWAL")}</option>
								<option value="CARD_ISSUANCE">{t("product.detail.fees.feeTypes.CARD_ISSUANCE")}</option>
								<option value="CARD_RENEWAL">{t("product.detail.fees.feeTypes.CARD_RENEWAL")}</option>
								<option value="OTHER">{t("product.detail.fees.feeTypes.OTHER")}</option>
							</select>
						</div>
						{form.feeType === "TRANSACTION" && (
							<div>
								<label className="block text-sm mb-1">{t("product.detail.fees.form.transactionType")}</label>
								<select
									className="w-full rounded-md border bg-white px-3 py-2 text-sm"
									value={form.transactionType ?? ""}
									onChange={e => {
										const newTransactionType = e.target.value ? (e.target.value as TransactionType) : null;
										// Si le type de transaction devient TRANSFER, ajuster la base de calcul si nécessaire
										let newCalculationBase = form.feeCalculationBase;
										if (newTransactionType === "TRANSFER") {
											// Si la base de calcul actuelle n'est pas valide pour TRANSFER, la réinitialiser à FIXED
											if (newCalculationBase !== "FIXED" && newCalculationBase !== "TRANSACTION_AMOUNT") {
												newCalculationBase = "FIXED";
											}
										}
										setForm({ 
											...form, 
											transactionType: newTransactionType,
											feeCalculationBase: newCalculationBase
										});
									}}
								>
									<option value="">{t("product.detail.fees.form.transactionTypeAll")}</option>
									<option value="DEPOSIT">{t("product.detail.fees.transactionTypes.DEPOSIT")}</option>
									<option value="WITHDRAWAL">{t("product.detail.fees.transactionTypes.WITHDRAWAL")}</option>
									<option value="TRANSFER">{t("product.detail.fees.transactionTypes.TRANSFER")}</option>
									<option value="FEE">{t("product.detail.fees.transactionTypes.FEE")}</option>
									<option value="INTEREST">{t("product.detail.fees.transactionTypes.INTEREST")}</option>
									<option value="ADJUSTMENT">{t("product.detail.fees.transactionTypes.ADJUSTMENT")}</option>
									<option value="REVERSAL">{t("product.detail.fees.transactionTypes.REVERSAL")}</option>
								</select>
								<p className="text-xs text-gray-500 mt-1">
									{t("product.detail.fees.form.transactionTypeHint")}
								</p>
							</div>
						)}
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.feeName")}</label>
							<Input
								value={form.feeName}
								onChange={e => setForm({ ...form, feeName: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.calculationBase")}</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.feeCalculationBase}
								onChange={e => {
									const newBase = e.target.value as FeeCalculationBase;
									// Mettre à null les champs non pertinents selon la base de calcul
									if (newBase === "FIXED") {
										setForm({ ...form, feeCalculationBase: newBase, feePercentage: undefined });
									} else if (newBase === "TRANSACTION_AMOUNT") {
										setForm({ ...form, feeCalculationBase: newBase, feeAmount: undefined });
									} else {
										setForm({ ...form, feeCalculationBase: newBase });
									}
								}}
								required
							>
								{/* Si type de transaction est TRANSFER, afficher uniquement FIXED et TRANSACTION_AMOUNT */}
								{form.feeType === "TRANSACTION" && form.transactionType === "TRANSFER" ? (
									<>
										<option value="FIXED">{t("product.detail.fees.calculationBases.FIXED")}</option>
										<option value="TRANSACTION_AMOUNT">{t("product.detail.fees.calculationBases.TRANSACTION_AMOUNT")}</option>
									</>
								) : (
									<>
										<option value="FIXED">{t("product.detail.fees.calculationBases.FIXED")}</option>
										<option value="BALANCE">{t("product.detail.fees.calculationBases.BALANCE")}</option>
										<option value="TRANSACTION_AMOUNT">{t("product.detail.fees.calculationBases.TRANSACTION_AMOUNT")}</option>
										<option value="OUTSTANDING_BALANCE">{t("product.detail.fees.calculationBases.OUTSTANDING_BALANCE")}</option>
									</>
								)}
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.feeAmount")}</label>
							<Input
								type="number"
								step="0.01"
								value={form.feeAmount ?? ""}
								onChange={e => setForm({ ...form, feeAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
								disabled={form.feeCalculationBase === "TRANSACTION_AMOUNT"}
								className={form.feeCalculationBase === "TRANSACTION_AMOUNT" ? "bg-gray-100 cursor-not-allowed" : ""}
							/>
							{form.feeCalculationBase === "TRANSACTION_AMOUNT" && (
								<p className="text-xs text-gray-500 mt-1">{t("product.detail.fees.form.feeAmountDisabled")}</p>
							)}
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.feePercentage")}</label>
							<Input
								type="number"
								step="0.0001"
								value={form.feePercentage ?? ""}
								onChange={e => setForm({ ...form, feePercentage: e.target.value ? parseFloat(e.target.value) : undefined })}
								disabled={form.feeCalculationBase === "FIXED"}
								className={form.feeCalculationBase === "FIXED" ? "bg-gray-100 cursor-not-allowed" : ""}
							/>
							{form.feeCalculationBase === "FIXED" && (
								<p className="text-xs text-gray-500 mt-1">{t("product.detail.fees.form.feePercentageDisabled")}</p>
							)}
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.minFee")}</label>
							<Input
								type="number"
								step="0.01"
								value={form.minFee ?? ""}
								onChange={e => setForm({ ...form, minFee: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.maxFee")}</label>
							<Input
								type="number"
								step="0.01"
								value={form.maxFee ?? ""}
								onChange={e => setForm({ ...form, maxFee: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.effectiveFrom")}</label>
							<Input
								type="date"
								value={form.effectiveFrom}
								onChange={e => setForm({ ...form, effectiveFrom: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.effectiveTo")}</label>
							<Input
								type="date"
								value={form.effectiveTo ?? ""}
								onChange={e => setForm({ ...form, effectiveTo: e.target.value || undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.currency")}</label>
							<Input
								value={form.currency ?? productCurrency ?? "USD"}
								onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })}
								maxLength={3}
								placeholder="USD"
								required
							/>
							<p className="text-xs text-gray-500 mt-1">
								{t("product.detail.fees.form.currencyHint", { currency: productCurrency ?? "N/A" })}
							</p>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.isWaivable")}</label>
							<input
								type="checkbox"
								checked={form.isWaivable ?? false}
								onChange={e => setForm({ ...form, isWaivable: e.target.checked })}
								className="rounded"
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={submitting}>{submitting ? t("product.detail.fees.form.adding") : t("product.detail.fees.form.add")}</Button>
						<Button type="button" variant="outline" onClick={onCloseForm}>{t("product.detail.fees.form.cancel")}</Button>
					</div>
				</form>
			)}

			{fees.length === 0 ? (
				<div className="text-sm text-gray-500 py-8 text-center">{t("product.detail.fees.noFees")}</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-2 text-left">{t("product.detail.fees.table.type")}</th>
								<th className="px-4 py-2 text-left">{t("product.detail.fees.table.name")}</th>
								<th className="px-4 py-2 text-left">{t("product.detail.fees.table.amount")}</th>
								<th className="px-4 py-2 text-left">{t("product.detail.fees.table.base")}</th>
								<th className="px-4 py-2 text-left">{t("product.detail.fees.table.waivable")}</th>
								<th className="px-4 py-2 text-left">{t("product.detail.fees.form.isActive")}</th>
								<th className="px-4 py-2 text-left">{t("product.detail.fees.table.actions")}</th>
							</tr>
						</thead>
						<tbody>
							{fees.map(fee => (
								<tr key={fee.id} className="border-t">
									<td className="px-4 py-2">
										{t(`product.detail.fees.feeTypes.${fee.feeType}`)}
										{fee.feeType === "TRANSACTION" && fee.transactionType && (
											<span className="text-xs text-gray-500 ml-1">({t(`product.detail.fees.transactionTypes.${fee.transactionType}`)})</span>
										)}
									</td>
									<td className="px-4 py-2">{fee.feeName}</td>
									<td className="px-4 py-2">
										{fee.feeAmount != null ? `${fee.feeAmount} ${fee.currency}` : ""}
										{fee.feePercentage != null ? `${fee.feePercentage}%` : ""}
									</td>
									<td className="px-4 py-2">{t(`product.detail.fees.calculationBases.${fee.feeCalculationBase}`)}</td>
									<td className="px-4 py-2">{fee.isWaivable ? t("common.yes") : t("common.no")}</td>
									<td className="px-4 py-2">
										<Badge variant={fee.isActive ? "success" : "neutral"}>
											{fee.isActive ? t("common.yes") : t("common.no")}
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
															{t("product.detail.fees.menu.view")}
														</button>
														<button
															type="button"
															onClick={() => {
																setSelectedFee(fee);
																setShowEditForm(true);
																onCloseForm();
																setForm({
																	feeType: fee.feeType,
																	transactionType: fee.transactionType ?? null,
																	feeName: fee.feeName,
																	// Mettre feeAmount à null si la base de calcul est TRANSACTION_AMOUNT
																	feeAmount: fee.feeCalculationBase === "TRANSACTION_AMOUNT" ? undefined : (fee.feeAmount ?? undefined),
																	// Mettre feePercentage à null si la base de calcul est FIXED
																	feePercentage: fee.feeCalculationBase === "FIXED" ? undefined : (fee.feePercentage ?? undefined),
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
															{t("product.detail.fees.menu.edit")}
														</button>
														<button
															type="button"
															onClick={() => {
																onDelete(fee.id);
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
														>
															<Trash2 className="h-4 w-4" />
															{t("product.detail.fees.menu.delete")}
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
					<div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
						{/* En-tête avec gradient */}
						<div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
										<DollarSign className="h-6 w-6 text-white" />
									</div>
									<div>
										<h3 className="text-xl font-bold text-white">Détails du frais</h3>
										<p className="text-sm text-emerald-100 mt-0.5">{selectedFee.feeName}</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setShowViewModal(false)}
									className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
								>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						</div>

						{/* Contenu scrollable */}
						<div className="overflow-y-auto p-6 space-y-6">
							{/* Informations principales */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
									<label className="text-xs font-medium text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
										</svg>
										Type de frais
									</label>
									<div className="mt-1 font-semibold text-gray-900">
										{selectedFee.feeType}
										{selectedFee.feeType === "TRANSACTION" && selectedFee.transactionType && (
											<span className="text-xs text-gray-500 ml-2">({selectedFee.transactionType})</span>
										)}
									</div>
								</div>
								{selectedFee.feeType === "TRANSACTION" && (
									<div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
										<label className="text-xs font-medium text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-1">
											<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
											</svg>
											Type de transaction
										</label>
										<div className="mt-1 font-semibold text-gray-900">
											{selectedFee.transactionType || "Tous les types"}
										</div>
									</div>
								)}
								<div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 border border-teal-200">
									<label className="text-xs font-medium text-teal-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
										</svg>
										Nom
									</label>
									<div className="mt-1 font-semibold text-gray-900">{selectedFee.feeName}</div>
								</div>
								<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
									<label className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										Montant fixe
									</label>
									<div className="mt-1 font-semibold text-gray-900">
										{selectedFee.feeAmount != null ? (
											<span className="text-lg">{selectedFee.feeAmount} <span className="text-sm text-gray-600">{selectedFee.currency}</span></span>
										) : (
											<span className="text-gray-400">-</span>
										)}
									</div>
								</div>
								<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
									<label className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
										</svg>
										Pourcentage
									</label>
									<div className="mt-1 font-semibold text-gray-900">
										{selectedFee.feePercentage != null ? (
											<span className="text-lg text-blue-700">{selectedFee.feePercentage}%</span>
										) : (
											<span className="text-gray-400">-</span>
										)}
									</div>
								</div>
								<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
									<label className="text-xs font-medium text-purple-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
										</svg>
										Base de calcul
									</label>
									<div className="mt-1 font-semibold text-gray-900">{selectedFee.feeCalculationBase}</div>
								</div>
								<div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
									<label className="text-xs font-medium text-yellow-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
										</svg>
										Dispensable
									</label>
									<div className="mt-1">
										<Badge variant={selectedFee.isWaivable ? "warning" : "neutral"}>
											{selectedFee.isWaivable ? "Oui" : "Non"}
										</Badge>
									</div>
								</div>
							</div>

							{/* Limites min/max */}
							{(selectedFee.minFee != null || selectedFee.maxFee != null) && (
								<div className="grid grid-cols-2 gap-4">
									<div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
										<label className="text-xs font-medium text-orange-700 uppercase tracking-wide mb-2 flex items-center gap-1">
											<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
											</svg>
											Frais minimum
										</label>
										<div className="mt-1 font-semibold text-gray-900">
											{selectedFee.minFee != null ? (
												<span className="text-lg">{selectedFee.minFee} <span className="text-sm text-gray-600">{selectedFee.currency}</span></span>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</div>
									</div>
									<div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
										<label className="text-xs font-medium text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-1">
											<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
											</svg>
											Frais maximum
										</label>
										<div className="mt-1 font-semibold text-gray-900">
											{selectedFee.maxFee != null ? (
												<span className="text-lg">{selectedFee.maxFee} <span className="text-sm text-gray-600">{selectedFee.currency}</span></span>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</div>
									</div>
								</div>
							)}

							{/* Dates et statut */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										Date d'effet
									</dt>
									<dd className="font-semibold text-gray-900">{selectedFee.effectiveFrom}</dd>
								</div>
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										Date de fin
									</dt>
									<dd className="font-semibold text-gray-900">{selectedFee.effectiveTo ?? "-"}</dd>
								</div>
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										Statut
									</dt>
									<dd>
										<Badge variant={selectedFee.isActive ? "success" : "neutral"}>
											{selectedFee.isActive ? "Actif" : "Inactif"}
										</Badge>
									</dd>
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
							<Button variant="outline" onClick={() => setShowViewModal(false)} className="flex items-center gap-2">
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
								Fermer
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Formulaire de modification */}
			{showEditForm && selectedFee && (
				<form onSubmit={async (e) => {
					e.preventDefault();
					setSubmitting(true);
					setError(null);
					try {
						// Préparer les données en mettant à null les champs non pertinents
						const submitData: CreateProductFeeRequest = {
							...form,
							// Si base de calcul est FIXED, mettre feePercentage à null
							feePercentage: form.feeCalculationBase === "FIXED" ? undefined : form.feePercentage,
							// Si base de calcul est TRANSACTION_AMOUNT, mettre feeAmount à null
							feeAmount: form.feeCalculationBase === "TRANSACTION_AMOUNT" ? undefined : form.feeAmount
						};
						await productsApi.updateFee(productId, selectedFee.id, submitData);
						setShowEditForm(false);
						setSelectedFee(null);
						onRefresh();
					} catch (e: any) {
						setError(e?.message ?? "Erreur lors de la modification");
					} finally {
						setSubmitting(false);
					}
				}} className="border rounded-md p-4 space-y-4 bg-gray-50 mt-4">
					<div className="flex justify-between items-center mb-2">
						<h4 className="font-semibold">{t("product.detail.fees.form.editTitle")}</h4>
						<button
							type="button"
							onClick={() => {
								setShowEditForm(false);
								setSelectedFee(null);
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
							<label className="block text-sm mb-1">{t("product.detail.fees.form.feeType")}</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.feeType}
								onChange={e => {
									const newFeeType = e.target.value as FeeType;
									setForm({ 
										...form, 
										feeType: newFeeType,
										// Réinitialiser transactionType si on change de type de frais
										transactionType: newFeeType === "TRANSACTION" ? form.transactionType : null
									});
								}}
								required
							>
								<option value="OPENING">{t("product.detail.fees.feeTypes.OPENING")}</option>
								<option value="MONTHLY">{t("product.detail.fees.feeTypes.MONTHLY")}</option>
								<option value="ANNUAL">{t("product.detail.fees.feeTypes.ANNUAL")}</option>
								<option value="TRANSACTION">{t("product.detail.fees.feeTypes.TRANSACTION")}</option>
								<option value="OVERDRAFT">{t("product.detail.fees.feeTypes.OVERDRAFT")}</option>
								<option value="LATE_PAYMENT">{t("product.detail.fees.feeTypes.LATE_PAYMENT")}</option>
								<option value="EARLY_WITHDRAWAL">{t("product.detail.fees.feeTypes.EARLY_WITHDRAWAL")}</option>
								<option value="CARD_ISSUANCE">{t("product.detail.fees.feeTypes.CARD_ISSUANCE")}</option>
								<option value="CARD_RENEWAL">{t("product.detail.fees.feeTypes.CARD_RENEWAL")}</option>
								<option value="OTHER">{t("product.detail.fees.feeTypes.OTHER")}</option>
							</select>
						</div>
						{form.feeType === "TRANSACTION" && (
							<div>
								<label className="block text-sm mb-1">{t("product.detail.fees.form.transactionType")}</label>
								<select
									className="w-full rounded-md border bg-white px-3 py-2 text-sm"
									value={form.transactionType ?? ""}
									onChange={e => {
										const newTransactionType = e.target.value ? (e.target.value as TransactionType) : null;
										// Si le type de transaction devient TRANSFER, ajuster la base de calcul si nécessaire
										let newCalculationBase = form.feeCalculationBase;
										if (newTransactionType === "TRANSFER") {
											// Si la base de calcul actuelle n'est pas valide pour TRANSFER, la réinitialiser à FIXED
											if (newCalculationBase !== "FIXED" && newCalculationBase !== "TRANSACTION_AMOUNT") {
												newCalculationBase = "FIXED";
											}
										}
										setForm({ 
											...form, 
											transactionType: newTransactionType,
											feeCalculationBase: newCalculationBase
										});
									}}
								>
									<option value="">{t("product.detail.fees.form.transactionTypeAll")}</option>
									<option value="DEPOSIT">{t("product.detail.fees.transactionTypes.DEPOSIT")}</option>
									<option value="WITHDRAWAL">{t("product.detail.fees.transactionTypes.WITHDRAWAL")}</option>
									<option value="TRANSFER">{t("product.detail.fees.transactionTypes.TRANSFER")}</option>
									<option value="FEE">{t("product.detail.fees.transactionTypes.FEE")}</option>
									<option value="INTEREST">{t("product.detail.fees.transactionTypes.INTEREST")}</option>
									<option value="ADJUSTMENT">{t("product.detail.fees.transactionTypes.ADJUSTMENT")}</option>
									<option value="REVERSAL">{t("product.detail.fees.transactionTypes.REVERSAL")}</option>
								</select>
								<p className="text-xs text-gray-500 mt-1">
									{t("product.detail.fees.form.transactionTypeHint")}
								</p>
							</div>
						)}
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.feeName")}</label>
							<Input
								value={form.feeName}
								onChange={e => setForm({ ...form, feeName: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.calculationBase")}</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.feeCalculationBase}
								onChange={e => {
									const newBase = e.target.value as FeeCalculationBase;
									// Mettre à null les champs non pertinents selon la base de calcul
									if (newBase === "FIXED") {
										setForm({ ...form, feeCalculationBase: newBase, feePercentage: undefined });
									} else if (newBase === "TRANSACTION_AMOUNT") {
										setForm({ ...form, feeCalculationBase: newBase, feeAmount: undefined });
									} else {
										setForm({ ...form, feeCalculationBase: newBase });
									}
								}}
								required
							>
								{/* Si type de transaction est TRANSFER, afficher uniquement FIXED et TRANSACTION_AMOUNT */}
								{form.feeType === "TRANSACTION" && form.transactionType === "TRANSFER" ? (
									<>
										<option value="FIXED">{t("product.detail.fees.calculationBases.FIXED")}</option>
										<option value="TRANSACTION_AMOUNT">{t("product.detail.fees.calculationBases.TRANSACTION_AMOUNT")}</option>
									</>
								) : (
									<>
										<option value="FIXED">{t("product.detail.fees.calculationBases.FIXED")}</option>
										<option value="BALANCE">{t("product.detail.fees.calculationBases.BALANCE")}</option>
										<option value="TRANSACTION_AMOUNT">{t("product.detail.fees.calculationBases.TRANSACTION_AMOUNT")}</option>
										<option value="OUTSTANDING_BALANCE">{t("product.detail.fees.calculationBases.OUTSTANDING_BALANCE")}</option>
									</>
								)}
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.feeAmount")}</label>
							<Input
								type="number"
								step="0.01"
								value={form.feeAmount ?? ""}
								onChange={e => setForm({ ...form, feeAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
								disabled={form.feeCalculationBase === "TRANSACTION_AMOUNT"}
								className={form.feeCalculationBase === "TRANSACTION_AMOUNT" ? "bg-gray-100 cursor-not-allowed" : ""}
							/>
							{form.feeCalculationBase === "TRANSACTION_AMOUNT" && (
								<p className="text-xs text-gray-500 mt-1">{t("product.detail.fees.form.feeAmountDisabled")}</p>
							)}
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.feePercentage")}</label>
							<Input
								type="number"
								step="0.0001"
								value={form.feePercentage ?? ""}
								onChange={e => setForm({ ...form, feePercentage: e.target.value ? parseFloat(e.target.value) : undefined })}
								disabled={form.feeCalculationBase === "FIXED"}
								className={form.feeCalculationBase === "FIXED" ? "bg-gray-100 cursor-not-allowed" : ""}
							/>
							{form.feeCalculationBase === "FIXED" && (
								<p className="text-xs text-gray-500 mt-1">{t("product.detail.fees.form.feePercentageDisabled")}</p>
							)}
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.minFee")}</label>
							<Input
								type="number"
								step="0.01"
								value={form.minFee ?? ""}
								onChange={e => setForm({ ...form, minFee: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.maxFee")}</label>
							<Input
								type="number"
								step="0.01"
								value={form.maxFee ?? ""}
								onChange={e => setForm({ ...form, maxFee: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.effectiveFrom")}</label>
							<Input
								type="date"
								value={form.effectiveFrom}
								onChange={e => setForm({ ...form, effectiveFrom: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.effectiveTo")}</label>
							<Input
								type="date"
								value={form.effectiveTo ?? ""}
								onChange={e => setForm({ ...form, effectiveTo: e.target.value || undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.currency")}</label>
							<Input
								value={form.currency ?? productCurrency ?? "USD"}
								onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })}
								maxLength={3}
								placeholder="USD"
								required
							/>
							<p className="text-xs text-gray-500 mt-1">
								{t("product.detail.fees.form.currencyHint", { currency: productCurrency ?? "N/A" })}
							</p>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.isActive")}</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.isActive ? "true" : "false"}
								onChange={e => setForm({ ...form, isActive: e.target.value === "true" })}
							>
								<option value="true">{t("common.yes", { defaultValue: "Oui" })}</option>
								<option value="false">{t("common.no", { defaultValue: "Non" })}</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.fees.form.isWaivable")}</label>
							<input
								type="checkbox"
								checked={form.isWaivable ?? false}
								onChange={e => setForm({ ...form, isWaivable: e.target.checked })}
								className="rounded"
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={submitting}>{submitting ? t("product.detail.fees.form.editing") : t("product.detail.fees.form.edit")}</Button>
						<Button type="button" variant="outline" onClick={() => {
							setShowEditForm(false);
							setSelectedFee(null);
							setError(null);
						}}>{t("product.detail.fees.form.cancel")}</Button>
					</div>
				</form>
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
	const [editForm, setEditForm] = useState<CreateProductLimitRequest>({
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

	useEffect(() => {
		if (selectedLimit && showEditForm) {
			setEditForm({
				limitType: selectedLimit.limitType,
				limitValue: selectedLimit.limitValue,
				currency: selectedLimit.currency,
				periodType: selectedLimit.periodType,
				effectiveFrom: selectedLimit.effectiveFrom,
				effectiveTo: selectedLimit.effectiveTo,
				isActive: selectedLimit.isActive ?? true
			});
		}
	}, [selectedLimit, showEditForm]);

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
																onDelete(limit.id);
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
					<div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
						{/* En-tête avec gradient */}
						<div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
										<BarChart3 className="h-6 w-6 text-white" />
									</div>
									<div>
										<h3 className="text-xl font-bold text-white">Détails de la limite</h3>
										<p className="text-sm text-purple-100 mt-0.5">{selectedLimit.limitType}</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setShowViewModal(false)}
									className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
								>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						</div>

						{/* Contenu scrollable */}
						<div className="overflow-y-auto p-6 space-y-6">
							{/* Informations principales */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
									<label className="text-xs font-medium text-purple-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
										</svg>
										Type de limite
									</label>
									<div className="mt-1 font-semibold text-gray-900">{selectedLimit.limitType}</div>
								</div>
								<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
									<label className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										Valeur
									</label>
									<div className="mt-1 font-bold text-xl text-gray-900">
										{selectedLimit.limitValue} <span className="text-sm font-normal text-gray-600">{selectedLimit.currency}</span>
									</div>
								</div>
								<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
									<label className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										Période
									</label>
									<div className="mt-1 font-semibold text-gray-900">{selectedLimit.periodType ?? "-"}</div>
								</div>
							</div>

							{/* Dates et statut */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										Date d'effet
									</dt>
									<dd className="font-semibold text-gray-900">{selectedLimit.effectiveFrom}</dd>
								</div>
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										Date de fin
									</dt>
									<dd className="font-semibold text-gray-900">{selectedLimit.effectiveTo ?? "-"}</dd>
								</div>
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										Statut
									</dt>
									<dd>
										<Badge variant={selectedLimit.isActive ? "success" : "neutral"}>
											{selectedLimit.isActive ? "Actif" : "Inactif"}
										</Badge>
									</dd>
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
							<Button variant="outline" onClick={() => setShowViewModal(false)} className="flex items-center gap-2">
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
								Fermer
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Formulaire de modification */}
			{showEditForm && selectedLimit && (
				<form onSubmit={async (e) => {
					e.preventDefault();
					setSubmitting(true);
					setError(null);
					try {
						await productsApi.updateLimit(productId, selectedLimit.id!, {
							limitType: editForm.limitType,
							limitValue: editForm.limitValue,
							currency: editForm.currency,
							periodType: editForm.periodType,
							effectiveFrom: editForm.effectiveFrom,
							effectiveTo: editForm.effectiveTo || undefined,
							isActive: editForm.isActive
						});
						setShowEditForm(false);
						setSelectedLimit(null);
						onRefresh();
					} catch (e: any) {
						setError(e?.message ?? "Erreur lors de la modification");
					} finally {
						setSubmitting(false);
					}
				}} className="border rounded-md p-4 space-y-4 bg-gray-50 mt-4">
					<div className="flex justify-between items-center mb-2">
						<h4 className="font-semibold">Modifier la limite</h4>
						<button
							type="button"
							onClick={() => {
								setShowEditForm(false);
								setSelectedLimit(null);
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
							<label className="block text-sm mb-1">Type de limite *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={editForm.limitType}
								onChange={e => setEditForm({ ...editForm, limitType: e.target.value as LimitType })}
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
								value={editForm.limitValue}
								onChange={e => setEditForm({ ...editForm, limitValue: parseFloat(e.target.value) || 0 })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Devise</label>
							<Input
								value={editForm.currency ?? "USD"}
								onChange={e => setEditForm({ ...editForm, currency: e.target.value })}
								maxLength={3}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Période</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={editForm.periodType ?? ""}
								onChange={e => setEditForm({ ...editForm, periodType: e.target.value ? e.target.value as PeriodType : undefined })}
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
								value={editForm.effectiveFrom}
								onChange={e => setEditForm({ ...editForm, effectiveFrom: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Date de fin</label>
							<Input
								type="date"
								value={editForm.effectiveTo ?? ""}
								onChange={e => setEditForm({ ...editForm, effectiveTo: e.target.value || undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Actif</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={editForm.isActive ? "true" : "false"}
								onChange={e => setEditForm({ ...editForm, isActive: e.target.value === "true" })}
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
							setSelectedLimit(null);
							setError(null);
						}}>Annuler</Button>
					</div>
				</form>
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
	const [editForm, setEditForm] = useState<CreateProductPeriodRequest>({
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

	useEffect(() => {
		if (selectedPeriod && showEditForm) {
			setEditForm({
				periodName: selectedPeriod.periodName,
				periodDays: selectedPeriod.periodDays,
				periodMonths: selectedPeriod.periodMonths ?? undefined,
				periodYears: selectedPeriod.periodYears ?? undefined,
				interestRate: selectedPeriod.interestRate ?? undefined,
				minAmount: selectedPeriod.minAmount ?? undefined,
				maxAmount: selectedPeriod.maxAmount ?? undefined,
				isActive: selectedPeriod.isActive ?? true,
				displayOrder: selectedPeriod.displayOrder
			});
		}
	}, [selectedPeriod, showEditForm]);

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
																onDelete(period.id);
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
				<form onSubmit={async (e) => {
					e.preventDefault();
					setSubmitting(true);
					setError(null);
					try {
						await productsApi.updatePeriod(productId, selectedPeriod.id, {
							periodName: editForm.periodName,
							periodDays: editForm.periodDays,
							periodMonths: editForm.periodMonths,
							periodYears: editForm.periodYears,
							interestRate: editForm.interestRate,
							minAmount: editForm.minAmount,
							maxAmount: editForm.maxAmount,
							isActive: editForm.isActive,
							displayOrder: editForm.displayOrder
						});
						setShowEditForm(false);
						setSelectedPeriod(null);
						onRefresh();
					} catch (e: any) {
						setError(e?.message ?? "Erreur lors de la modification");
					} finally {
						setSubmitting(false);
					}
				}} className="border rounded-md p-4 space-y-4 bg-gray-50 mt-4">
					<div className="flex justify-between items-center mb-2">
						<h4 className="font-semibold">Modifier la période</h4>
						<button
							type="button"
							onClick={() => {
								setShowEditForm(false);
								setSelectedPeriod(null);
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
							<label className="block text-sm mb-1">Nom de la période *</label>
							<Input
								value={editForm.periodName}
								onChange={e => setEditForm({ ...editForm, periodName: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Durée en jours *</label>
							<Input
								type="number"
								value={editForm.periodDays}
								onChange={e => setEditForm({ ...editForm, periodDays: parseInt(e.target.value) || 0 })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Durée en mois</label>
							<Input
								type="number"
								value={editForm.periodMonths ?? ""}
								onChange={e => setEditForm({ ...editForm, periodMonths: e.target.value ? parseInt(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Durée en années</label>
							<Input
								type="number"
								value={editForm.periodYears ?? ""}
								onChange={e => setEditForm({ ...editForm, periodYears: e.target.value ? parseInt(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Taux d'intérêt (%)</label>
							<Input
								type="number"
								step="0.0001"
								value={editForm.interestRate ?? ""}
								onChange={e => setEditForm({ ...editForm, interestRate: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Montant minimum</label>
							<Input
								type="number"
								step="0.01"
								value={editForm.minAmount ?? ""}
								onChange={e => setEditForm({ ...editForm, minAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Montant maximum</label>
							<Input
								type="number"
								step="0.01"
								value={editForm.maxAmount ?? ""}
								onChange={e => setEditForm({ ...editForm, maxAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Ordre d'affichage</label>
							<Input
								type="number"
								value={editForm.displayOrder ?? 0}
								onChange={e => setEditForm({ ...editForm, displayOrder: parseInt(e.target.value) || 0 })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Actif</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={editForm.isActive ? "true" : "false"}
								onChange={e => setEditForm({ ...editForm, isActive: e.target.value === "true" })}
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
							setSelectedPeriod(null);
							setError(null);
						}}>Annuler</Button>
					</div>
				</form>
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
	const [editForm, setEditForm] = useState<CreateProductPenaltyRequest>({
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

	useEffect(() => {
		if (selectedPenalty && showEditForm) {
			setEditForm({
				penaltyType: selectedPenalty.penaltyType,
				penaltyName: selectedPenalty.penaltyName,
				penaltyAmount: selectedPenalty.penaltyAmount ?? undefined,
				penaltyPercentage: selectedPenalty.penaltyPercentage ?? undefined,
				calculationBase: selectedPenalty.calculationBase,
				minPenalty: selectedPenalty.minPenalty ?? undefined,
				maxPenalty: selectedPenalty.maxPenalty ?? undefined,
				currency: selectedPenalty.currency,
				gracePeriodDays: selectedPenalty.gracePeriodDays ?? undefined,
				effectiveFrom: selectedPenalty.effectiveFrom,
				effectiveTo: selectedPenalty.effectiveTo ?? undefined,
				isActive: selectedPenalty.isActive ?? true
			});
		}
	}, [selectedPenalty, showEditForm]);

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
																onDelete(penalty.id);
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
					<div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
						{/* En-tête avec gradient */}
						<div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
										<AlertCircle className="h-6 w-6 text-white" />
									</div>
									<div>
										<h3 className="text-xl font-bold text-white">Détails de la pénalité</h3>
										<p className="text-sm text-red-100 mt-0.5">{selectedPenalty.penaltyName}</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setShowViewModal(false)}
									className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
								>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						</div>

						{/* Contenu scrollable */}
						<div className="overflow-y-auto p-6 space-y-6">
							{/* Informations principales */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
									<label className="text-xs font-medium text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
										</svg>
										Type de pénalité
									</label>
									<div className="mt-1 font-semibold text-gray-900">{selectedPenalty.penaltyType}</div>
								</div>
								<div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
									<label className="text-xs font-medium text-orange-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
										</svg>
										Nom
									</label>
									<div className="mt-1 font-semibold text-gray-900">{selectedPenalty.penaltyName}</div>
								</div>
								<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
									<label className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										Montant fixe
									</label>
									<div className="mt-1 font-semibold text-gray-900">
										{selectedPenalty.penaltyAmount != null ? (
											<span className="text-lg">{selectedPenalty.penaltyAmount} <span className="text-sm text-gray-600">{selectedPenalty.currency}</span></span>
										) : (
											<span className="text-gray-400">-</span>
										)}
									</div>
								</div>
								<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
									<label className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
										</svg>
										Pourcentage
									</label>
									<div className="mt-1 font-semibold text-gray-900">
										{selectedPenalty.penaltyPercentage != null ? (
											<span className="text-lg text-blue-700">{selectedPenalty.penaltyPercentage}%</span>
										) : (
											<span className="text-gray-400">-</span>
										)}
									</div>
								</div>
								<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
									<label className="text-xs font-medium text-purple-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
										</svg>
										Base de calcul
									</label>
									<div className="mt-1 font-semibold text-gray-900">{selectedPenalty.calculationBase}</div>
								</div>
								<div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
									<label className="text-xs font-medium text-yellow-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										Période de grâce (jours)
									</label>
									<div className="mt-1 font-semibold text-gray-900">{selectedPenalty.gracePeriodDays ?? "-"}</div>
								</div>
							</div>

							{/* Limites min/max */}
							{(selectedPenalty.minPenalty != null || selectedPenalty.maxPenalty != null) && (
								<div className="grid grid-cols-2 gap-4">
									<div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 border border-teal-200">
										<label className="text-xs font-medium text-teal-700 uppercase tracking-wide mb-2 flex items-center gap-1">
											<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
											</svg>
											Pénalité minimum
										</label>
										<div className="mt-1 font-semibold text-gray-900">
											{selectedPenalty.minPenalty != null ? (
												<span className="text-lg">{selectedPenalty.minPenalty} <span className="text-sm text-gray-600">{selectedPenalty.currency}</span></span>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</div>
									</div>
									<div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
										<label className="text-xs font-medium text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-1">
											<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
											</svg>
											Pénalité maximum
										</label>
										<div className="mt-1 font-semibold text-gray-900">
											{selectedPenalty.maxPenalty != null ? (
												<span className="text-lg">{selectedPenalty.maxPenalty} <span className="text-sm text-gray-600">{selectedPenalty.currency}</span></span>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</div>
									</div>
								</div>
							)}

							{/* Dates et statut */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										Date d'effet
									</dt>
									<dd className="font-semibold text-gray-900">{selectedPenalty.effectiveFrom}</dd>
								</div>
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										Date de fin
									</dt>
									<dd className="font-semibold text-gray-900">{selectedPenalty.effectiveTo ?? "-"}</dd>
								</div>
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										Statut
									</dt>
									<dd>
										<Badge variant={selectedPenalty.isActive ? "success" : "neutral"}>
											{selectedPenalty.isActive ? "Actif" : "Inactif"}
										</Badge>
									</dd>
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
							<Button variant="outline" onClick={() => setShowViewModal(false)} className="flex items-center gap-2">
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
								Fermer
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Formulaire de modification */}
			{showEditForm && selectedPenalty && (
				<form onSubmit={async (e) => {
					e.preventDefault();
					setSubmitting(true);
					setError(null);
					try {
						await productsApi.updatePenalty(productId, selectedPenalty.id, {
							penaltyType: editForm.penaltyType,
							penaltyName: editForm.penaltyName,
							penaltyAmount: editForm.penaltyAmount,
							penaltyPercentage: editForm.penaltyPercentage,
							calculationBase: editForm.calculationBase,
							minPenalty: editForm.minPenalty,
							maxPenalty: editForm.maxPenalty,
							currency: editForm.currency,
							gracePeriodDays: editForm.gracePeriodDays,
							effectiveFrom: editForm.effectiveFrom,
							effectiveTo: editForm.effectiveTo,
							isActive: editForm.isActive
						});
						setShowEditForm(false);
						setSelectedPenalty(null);
						onRefresh();
					} catch (e: any) {
						setError(e?.message ?? "Erreur lors de la modification");
					} finally {
						setSubmitting(false);
					}
				}} className="border rounded-md p-4 space-y-4 bg-gray-50 mt-4">
					<div className="flex justify-between items-center mb-2">
						<h4 className="font-semibold">Modifier la pénalité</h4>
						<button
							type="button"
							onClick={() => {
								setShowEditForm(false);
								setSelectedPenalty(null);
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
							<label className="block text-sm mb-1">Type de pénalité *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={editForm.penaltyType}
								onChange={e => setEditForm({ ...editForm, penaltyType: e.target.value as PenaltyType })}
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
								value={editForm.penaltyName}
								onChange={e => setEditForm({ ...editForm, penaltyName: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Base de calcul *</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={editForm.calculationBase}
								onChange={e => setEditForm({ ...editForm, calculationBase: e.target.value as PenaltyCalculationBase })}
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
								value={editForm.penaltyAmount ?? ""}
								onChange={e => setEditForm({ ...editForm, penaltyAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Pourcentage</label>
							<Input
								type="number"
								step="0.0001"
								value={editForm.penaltyPercentage ?? ""}
								onChange={e => setEditForm({ ...editForm, penaltyPercentage: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Pénalité minimum</label>
							<Input
								type="number"
								step="0.01"
								value={editForm.minPenalty ?? ""}
								onChange={e => setEditForm({ ...editForm, minPenalty: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Pénalité maximum</label>
							<Input
								type="number"
								step="0.01"
								value={editForm.maxPenalty ?? ""}
								onChange={e => setEditForm({ ...editForm, maxPenalty: e.target.value ? parseFloat(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Devise</label>
							<Input
								value={editForm.currency ?? "USD"}
								onChange={e => setEditForm({ ...editForm, currency: e.target.value })}
								maxLength={3}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Période de grâce (jours)</label>
							<Input
								type="number"
								value={editForm.gracePeriodDays ?? ""}
								onChange={e => setEditForm({ ...editForm, gracePeriodDays: e.target.value ? parseInt(e.target.value) : undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Date d'effet *</label>
							<Input
								type="date"
								value={editForm.effectiveFrom}
								onChange={e => setEditForm({ ...editForm, effectiveFrom: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Date de fin</label>
							<Input
								type="date"
								value={editForm.effectiveTo ?? ""}
								onChange={e => setEditForm({ ...editForm, effectiveTo: e.target.value || undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">Actif</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={editForm.isActive ? "true" : "false"}
								onChange={e => setEditForm({ ...editForm, isActive: e.target.value === "true" })}
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
							setSelectedPenalty(null);
							setError(null);
						}}>Annuler</Button>
					</div>
				</form>
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
	const { t } = useTranslation();
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
	const [editForm, setEditForm] = useState<CreateProductEligibilityRuleRequest>({
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

	useEffect(() => {
		if (selectedRule && showEditForm) {
			setEditForm({
				ruleType: selectedRule.ruleType,
				ruleName: selectedRule.ruleName,
				operator: selectedRule.operator,
				ruleValue: selectedRule.ruleValue,
				dataType: selectedRule.dataType,
				isMandatory: selectedRule.isMandatory ?? true,
				errorMessage: selectedRule.errorMessage ?? undefined,
				effectiveFrom: selectedRule.effectiveFrom,
				effectiveTo: selectedRule.effectiveTo ?? undefined,
				isActive: selectedRule.isActive ?? true
			});
		}
	}, [selectedRule, showEditForm]);

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
		return <div className="text-sm text-gray-500 py-8 text-center">{t("product.detail.eligibility.loading")}</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">{t("product.detail.eligibility.rulesCount", { count: rules.length })}</h3>
				{!showForm && <Button onClick={onAdd}>{t("product.detail.eligibility.addButton")}</Button>}
			</div>

			{showForm && (
				<form onSubmit={handleSubmit} className="border rounded-md p-4 space-y-4 bg-gray-50">
					{error && <div className="text-sm text-red-600">{error}</div>}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.ruleType")}</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.ruleType}
								onChange={e => setForm({ ...form, ruleType: e.target.value as EligibilityRuleType })}
								required
							>
								<option value="MIN_AGE">{t("product.detail.eligibility.ruleTypes.MIN_AGE")}</option>
								<option value="MAX_AGE">{t("product.detail.eligibility.ruleTypes.MAX_AGE")}</option>
								<option value="MIN_INCOME">{t("product.detail.eligibility.ruleTypes.MIN_INCOME")}</option>
								<option value="MIN_BALANCE">{t("product.detail.eligibility.ruleTypes.MIN_BALANCE")}</option>
								<option value="CLIENT_TYPE">{t("product.detail.eligibility.ruleTypes.CLIENT_TYPE")}</option>
								<option value="CLIENT_STATUS">{t("product.detail.eligibility.ruleTypes.CLIENT_STATUS")}</option>
								<option value="RESIDENCY">{t("product.detail.eligibility.ruleTypes.RESIDENCY")}</option>
								<option value="KYC_LEVEL">{t("product.detail.eligibility.ruleTypes.KYC_LEVEL")}</option>
								<option value="RISK_SCORE">{t("product.detail.eligibility.ruleTypes.RISK_SCORE")}</option>
								<option value="PEP_FLAG">{t("product.detail.eligibility.ruleTypes.PEP_FLAG")}</option>
								<option value="OTHER">{t("product.detail.eligibility.ruleTypes.OTHER")}</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.ruleName")}</label>
							<Input
								value={form.ruleName}
								onChange={e => setForm({ ...form, ruleName: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.operator")}</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.operator}
								onChange={e => setForm({ ...form, operator: e.target.value as EligibilityOperator })}
								required
							>
								<option value="EQUALS">{t("product.detail.eligibility.operators.EQUALS")}</option>
								<option value="NOT_EQUALS">{t("product.detail.eligibility.operators.NOT_EQUALS")}</option>
								<option value="GREATER_THAN">{t("product.detail.eligibility.operators.GREATER_THAN")}</option>
								<option value="GREATER_THAN_OR_EQUAL">{t("product.detail.eligibility.operators.GREATER_THAN_OR_EQUAL")}</option>
								<option value="LESS_THAN">{t("product.detail.eligibility.operators.LESS_THAN")}</option>
								<option value="LESS_THAN_OR_EQUAL">{t("product.detail.eligibility.operators.LESS_THAN_OR_EQUAL")}</option>
								<option value="IN">{t("product.detail.eligibility.operators.IN")}</option>
								<option value="NOT_IN">{t("product.detail.eligibility.operators.NOT_IN")}</option>
								<option value="CONTAINS">{t("product.detail.eligibility.operators.CONTAINS")}</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.dataType")}</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.dataType}
								onChange={e => setForm({ ...form, dataType: e.target.value as EligibilityDataType })}
								required
							>
								<option value="STRING">{t("product.detail.eligibility.dataTypes.STRING")}</option>
								<option value="NUMBER">{t("product.detail.eligibility.dataTypes.NUMBER")}</option>
								<option value="BOOLEAN">{t("product.detail.eligibility.dataTypes.BOOLEAN")}</option>
								<option value="DATE">{t("product.detail.eligibility.dataTypes.DATE")}</option>
								<option value="ENUM">{t("product.detail.eligibility.dataTypes.ENUM")}</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.value")}</label>
							<Input
								value={form.ruleValue}
								onChange={e => setForm({ ...form, ruleValue: e.target.value })}
								placeholder={form.operator === "IN" || form.operator === "NOT_IN" ? '["valeur1", "valeur2"]' : t("product.detail.eligibility.form.valuePlaceholder")}
								required
							/>
							{form.operator === "IN" || form.operator === "NOT_IN" ? (
								<p className="text-xs text-gray-500 mt-1">{t("product.detail.eligibility.form.valueJsonHint")}</p>
							) : null}
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.isMandatory")}</label>
							<input
								type="checkbox"
								checked={form.isMandatory ?? true}
								onChange={e => setForm({ ...form, isMandatory: e.target.checked })}
								className="rounded"
							/>
							<p className="text-xs text-gray-500 mt-1">{t("product.detail.eligibility.form.isMandatoryHint")}</p>
						</div>
						<div className="col-span-2">
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.errorMessage")}</label>
							<textarea
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={form.errorMessage ?? ""}
								onChange={e => setForm({ ...form, errorMessage: e.target.value || undefined })}
								rows={2}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.effectiveFrom")}</label>
							<Input
								type="date"
								value={form.effectiveFrom}
								onChange={e => setForm({ ...form, effectiveFrom: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.effectiveTo")}</label>
							<Input
								type="date"
								value={form.effectiveTo ?? ""}
								onChange={e => setForm({ ...form, effectiveTo: e.target.value || undefined })}
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={submitting}>{submitting ? t("product.detail.eligibility.form.adding") : t("product.detail.eligibility.form.add")}</Button>
						<Button type="button" variant="outline" onClick={onCloseForm}>{t("product.detail.eligibility.form.cancel")}</Button>
					</div>
				</form>
			)}

			{rules.length === 0 ? (
				<div className="text-sm text-gray-500 py-8 text-center">{t("product.detail.eligibility.noRules")}</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-2 text-left">{t("product.detail.eligibility.table.type")}</th>
								<th className="px-4 py-2 text-left">{t("product.detail.eligibility.table.name")}</th>
								<th className="px-4 py-2 text-left">{t("product.detail.eligibility.table.operator")}</th>
								<th className="px-4 py-2 text-left">{t("product.detail.eligibility.table.value")}</th>
								<th className="px-4 py-2 text-left">{t("product.detail.eligibility.table.mandatory")}</th>
								<th className="px-4 py-2 text-left">{t("product.detail.eligibility.table.active")}</th>
								<th className="px-4 py-2 text-left"></th>
							</tr>
						</thead>
						<tbody>
							{rules.map(rule => (
								<tr key={rule.id} className="border-t">
									<td className="px-4 py-2">{t(`product.detail.eligibility.ruleTypes.${rule.ruleType}`) || rule.ruleType}</td>
									<td className="px-4 py-2">{rule.ruleName}</td>
									<td className="px-4 py-2">{t(`product.detail.eligibility.operators.${rule.operator}`) || rule.operator}</td>
									<td className="px-4 py-2 font-mono text-xs">{rule.ruleValue}</td>
									<td className="px-4 py-2">
										<Badge variant={rule.isMandatory ? "warning" : "neutral"}>
											{rule.isMandatory ? t("product.detail.eligibility.table.yes") : t("product.detail.eligibility.table.no")}
										</Badge>
									</td>
									<td className="px-4 py-2">
										<Badge variant={rule.isActive ? "success" : "neutral"}>
											{rule.isActive ? t("product.detail.eligibility.table.yes") : t("product.detail.eligibility.table.no")}
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
															{t("product.detail.eligibility.menu.view")}
														</button>
														<button
															type="button"
															onClick={() => {
																setSelectedRule(rule);
																setShowEditForm(true);
																onCloseForm();
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
														>
															<Edit2 className="h-4 w-4" />
															{t("product.detail.eligibility.menu.edit")}
														</button>
														<button
															type="button"
															onClick={() => {
																onDelete(rule.id);
																setOpenMenuId(null);
																setMenuPosition(null);
															}}
															className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
														>
															<Trash2 className="h-4 w-4" />
															{t("product.detail.eligibility.menu.delete")}
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
					<div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
						{/* En-tête avec gradient */}
						<div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
										<FileText className="h-6 w-6 text-white" />
									</div>
									<div>
										<h3 className="text-xl font-bold text-white">{t("product.detail.eligibility.modal.title")}</h3>
										<p className="text-sm text-indigo-100 mt-0.5">{selectedRule.ruleName}</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setShowViewModal(false)}
									className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
								>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						</div>

						{/* Contenu scrollable */}
						<div className="overflow-y-auto p-6 space-y-6">
							{/* Informations principales */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
									<label className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
										</svg>
										{t("product.detail.eligibility.modal.ruleType")}
									</label>
									<div className="mt-1 font-semibold text-gray-900">{t(`product.detail.eligibility.ruleTypes.${selectedRule.ruleType}`) || selectedRule.ruleType}</div>
								</div>
								<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
									<label className="text-xs font-medium text-purple-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
										</svg>
										{t("product.detail.eligibility.modal.name")}
									</label>
									<div className="mt-1 font-semibold text-gray-900">{selectedRule.ruleName}</div>
								</div>
								<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
									<label className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
										</svg>
										{t("product.detail.eligibility.modal.operator")}
									</label>
									<div className="mt-1 font-semibold text-gray-900">{t(`product.detail.eligibility.operators.${selectedRule.operator}`) || selectedRule.operator}</div>
								</div>
								<div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
									<label className="text-xs font-medium text-orange-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
										</svg>
										{t("product.detail.eligibility.modal.value")}
									</label>
									<div className="mt-1 font-mono font-semibold text-gray-900 break-all">{selectedRule.ruleValue}</div>
								</div>
								<div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 border border-teal-200">
									<label className="text-xs font-medium text-teal-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
										</svg>
										{t("product.detail.eligibility.modal.dataType")}
									</label>
									<div className="mt-1 font-semibold text-gray-900">{t(`product.detail.eligibility.dataTypes.${selectedRule.dataType}`) || selectedRule.dataType}</div>
								</div>
								<div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
									<label className="text-xs font-medium text-yellow-700 uppercase tracking-wide mb-2 flex items-center gap-1">
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
										</svg>
										{t("product.detail.eligibility.modal.mandatory")}
									</label>
									<div className="mt-1">
										<Badge variant={selectedRule.isMandatory ? "warning" : "neutral"}>
											{selectedRule.isMandatory ? t("product.detail.eligibility.table.yes") : t("product.detail.eligibility.table.no")}
										</Badge>
									</div>
								</div>
							</div>

							{/* Message d'erreur */}
							{selectedRule.errorMessage && (
								<div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
									<div className="flex items-start gap-3">
										<svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<div className="flex-1">
											<label className="text-xs font-medium text-red-700 uppercase tracking-wide mb-1 block">{t("product.detail.eligibility.modal.errorMessage")}</label>
											<div className="text-sm text-red-800 mt-1">{selectedRule.errorMessage}</div>
										</div>
									</div>
								</div>
							)}

							{/* Dates et statut */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										{t("product.detail.eligibility.modal.effectiveFrom")}
									</dt>
									<dd className="font-semibold text-gray-900">{selectedRule.effectiveFrom}</dd>
								</div>
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										{t("product.detail.eligibility.modal.effectiveTo")}
									</dt>
									<dd className="font-semibold text-gray-900">{selectedRule.effectiveTo ?? "-"}</dd>
								</div>
								<div className="flex items-center justify-between py-2">
									<dt className="text-sm text-gray-600 flex items-center gap-2">
										<svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										{t("product.detail.eligibility.modal.status")}
									</dt>
									<dd>
										<Badge variant={selectedRule.isActive ? "success" : "neutral"}>
											{selectedRule.isActive ? t("product.detail.eligibility.modal.active") : t("product.detail.eligibility.modal.inactive")}
										</Badge>
									</dd>
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
							<Button variant="outline" onClick={() => setShowViewModal(false)} className="flex items-center gap-2">
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
								{t("product.detail.eligibility.modal.close")}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Formulaire de modification */}
			{showEditForm && selectedRule && (
				<form onSubmit={async (e) => {
					e.preventDefault();
					setSubmitting(true);
					setError(null);
					try {
						await productsApi.updateEligibilityRule(productId, selectedRule.id, {
							ruleType: editForm.ruleType,
							ruleName: editForm.ruleName,
							operator: editForm.operator,
							ruleValue: editForm.ruleValue,
							dataType: editForm.dataType,
							isMandatory: editForm.isMandatory,
							errorMessage: editForm.errorMessage,
							effectiveFrom: editForm.effectiveFrom,
							effectiveTo: editForm.effectiveTo,
							isActive: editForm.isActive
						});
						setShowEditForm(false);
						setSelectedRule(null);
						onRefresh();
					} catch (e: any) {
						setError(e?.message ?? t("product.detail.eligibility.updateError"));
					} finally {
						setSubmitting(false);
					}
				}} className="border rounded-md p-4 space-y-4 bg-gray-50 mt-4">
					<div className="flex justify-between items-center mb-2">
						<h4 className="font-semibold">{t("product.detail.eligibility.form.editTitle")}</h4>
						<button
							type="button"
							onClick={() => {
								setShowEditForm(false);
								setSelectedRule(null);
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
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.ruleType")}</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={editForm.ruleType}
								onChange={e => setEditForm({ ...editForm, ruleType: e.target.value as EligibilityRuleType })}
								required
							>
								<option value="MIN_AGE">{t("product.detail.eligibility.ruleTypes.MIN_AGE")}</option>
								<option value="MAX_AGE">{t("product.detail.eligibility.ruleTypes.MAX_AGE")}</option>
								<option value="MIN_INCOME">{t("product.detail.eligibility.ruleTypes.MIN_INCOME")}</option>
								<option value="MIN_BALANCE">{t("product.detail.eligibility.ruleTypes.MIN_BALANCE")}</option>
								<option value="CLIENT_TYPE">{t("product.detail.eligibility.ruleTypes.CLIENT_TYPE")}</option>
								<option value="CLIENT_STATUS">{t("product.detail.eligibility.ruleTypes.CLIENT_STATUS")}</option>
								<option value="RESIDENCY">{t("product.detail.eligibility.ruleTypes.RESIDENCY")}</option>
								<option value="KYC_LEVEL">{t("product.detail.eligibility.ruleTypes.KYC_LEVEL")}</option>
								<option value="RISK_SCORE">{t("product.detail.eligibility.ruleTypes.RISK_SCORE")}</option>
								<option value="PEP_FLAG">{t("product.detail.eligibility.ruleTypes.PEP_FLAG")}</option>
								<option value="OTHER">{t("product.detail.eligibility.ruleTypes.OTHER")}</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.ruleName")}</label>
							<Input
								value={editForm.ruleName}
								onChange={e => setEditForm({ ...editForm, ruleName: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.operator")}</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={editForm.operator}
								onChange={e => setEditForm({ ...editForm, operator: e.target.value as EligibilityOperator })}
								required
							>
								<option value="EQUALS">{t("product.detail.eligibility.operators.EQUALS")}</option>
								<option value="NOT_EQUALS">{t("product.detail.eligibility.operators.NOT_EQUALS")}</option>
								<option value="GREATER_THAN">{t("product.detail.eligibility.operators.GREATER_THAN")}</option>
								<option value="GREATER_THAN_OR_EQUAL">{t("product.detail.eligibility.operators.GREATER_THAN_OR_EQUAL")}</option>
								<option value="LESS_THAN">{t("product.detail.eligibility.operators.LESS_THAN")}</option>
								<option value="LESS_THAN_OR_EQUAL">{t("product.detail.eligibility.operators.LESS_THAN_OR_EQUAL")}</option>
								<option value="IN">{t("product.detail.eligibility.operators.IN")}</option>
								<option value="NOT_IN">{t("product.detail.eligibility.operators.NOT_IN")}</option>
								<option value="CONTAINS">{t("product.detail.eligibility.operators.CONTAINS")}</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.dataType")}</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={editForm.dataType}
								onChange={e => setEditForm({ ...editForm, dataType: e.target.value as EligibilityDataType })}
								required
							>
								<option value="STRING">{t("product.detail.eligibility.dataTypes.STRING")}</option>
								<option value="NUMBER">{t("product.detail.eligibility.dataTypes.NUMBER")}</option>
								<option value="BOOLEAN">{t("product.detail.eligibility.dataTypes.BOOLEAN")}</option>
								<option value="DATE">{t("product.detail.eligibility.dataTypes.DATE")}</option>
								<option value="ENUM">{t("product.detail.eligibility.dataTypes.ENUM")}</option>
							</select>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.value")}</label>
							<Input
								value={editForm.ruleValue}
								onChange={e => setEditForm({ ...editForm, ruleValue: e.target.value })}
								placeholder={editForm.operator === "IN" || editForm.operator === "NOT_IN" ? '["valeur1", "valeur2"]' : t("product.detail.eligibility.form.valuePlaceholder")}
								required
							/>
							{editForm.operator === "IN" || editForm.operator === "NOT_IN" ? (
								<p className="text-xs text-gray-500 mt-1">{t("product.detail.eligibility.form.valueJsonHint")}</p>
							) : null}
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.isMandatory")}</label>
							<input
								type="checkbox"
								checked={editForm.isMandatory ?? true}
								onChange={e => setEditForm({ ...editForm, isMandatory: e.target.checked })}
								className="rounded"
							/>
							<p className="text-xs text-gray-500 mt-1">{t("product.detail.eligibility.form.isMandatoryHint")}</p>
						</div>
						<div className="col-span-2">
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.errorMessage")}</label>
							<textarea
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={editForm.errorMessage ?? ""}
								onChange={e => setEditForm({ ...editForm, errorMessage: e.target.value || undefined })}
								rows={2}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.effectiveFrom")}</label>
							<Input
								type="date"
								value={editForm.effectiveFrom}
								onChange={e => setEditForm({ ...editForm, effectiveFrom: e.target.value })}
								required
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.effectiveTo")}</label>
							<Input
								type="date"
								value={editForm.effectiveTo ?? ""}
								onChange={e => setEditForm({ ...editForm, effectiveTo: e.target.value || undefined })}
							/>
						</div>
						<div>
							<label className="block text-sm mb-1">{t("product.detail.eligibility.form.isActive")}</label>
							<select
								className="w-full rounded-md border bg-white px-3 py-2 text-sm"
								value={editForm.isActive ? "true" : "false"}
								onChange={e => setEditForm({ ...editForm, isActive: e.target.value === "true" })}
							>
								<option value="true">{t("product.detail.eligibility.table.yes")}</option>
								<option value="false">{t("product.detail.eligibility.table.no")}</option>
							</select>
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={submitting}>{submitting ? t("product.detail.eligibility.form.editing") : t("product.detail.eligibility.form.edit")}</Button>
						<Button type="button" variant="outline" onClick={() => {
							setShowEditForm(false);
							setSelectedRule(null);
							setError(null);
						}}>{t("product.detail.eligibility.form.cancel")}</Button>
					</div>
				</form>
			)}
		</div>
	);
}

// Component for Product GL Mappings Tab
function ProductGLMappingsTab({
	productId,
	mappings,
	loading,
	onAdd,
	onDelete,
	onRefresh,
	showForm,
	onCloseForm
}: {
	productId: string;
	mappings: import("@/types").ProductGLMapping[];
	loading?: boolean;
	onAdd: () => void;
	onDelete: (id: number) => void;
	onRefresh: () => void;
	showForm: boolean;
	onCloseForm: () => void;
}) {
	const [form, setForm] = useState<import("@/types").CreateProductGLMappingRequest>({
		mappingType: "ASSET_ACCOUNT",
		ledgerAccountId: 0
	});
	const [editingMapping, setEditingMapping] = useState<import("@/types").ProductGLMapping | null>(null);
	const [ledgerAccounts, setLedgerAccounts] = useState<import("@/types").LedgerAccount[]>([]);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		loadLedgerAccounts();
	}, []);

	useEffect(() => {
		if (editingMapping) {
			setForm({
				mappingType: editingMapping.mappingType,
				ledgerAccountId: editingMapping.ledgerAccountId
			});
			onAdd(); // Ouvrir le formulaire
		}
	}, [editingMapping]);

	async function loadLedgerAccounts() {
		try {
			const { ledgerAccountsApi } = await import("@/lib/api");
			const data = await ledgerAccountsApi.list({ status: "ACTIVE" });
			setLedgerAccounts(data);
		} catch (e: any) {
			console.error("Erreur lors du chargement des comptes GL:", e);
		}
	}

	function validateForm(): boolean {
		const errors: Record<string, string> = {};

		if (!form.ledgerAccountId || form.ledgerAccountId === 0) {
			errors.ledgerAccountId = "Un compte GL doit être sélectionné";
		} else {
			const selectedAccount = ledgerAccounts.find(a => a.id === form.ledgerAccountId);
			if (!selectedAccount) {
				errors.ledgerAccountId = "Le compte GL sélectionné n'existe pas";
			} else if (selectedAccount.status !== "ACTIVE") {
				errors.ledgerAccountId = "Le compte GL doit être actif";
			} else {
				// Vérifier la cohérence du type
				const requiredTypes: Record<import("@/types").MappingType, import("@/types").AccountType[]> = {
					ASSET_ACCOUNT: ["ASSET"],
					LIABILITY_ACCOUNT: ["LIABILITY"],
					FEE_ACCOUNT: ["EXPENSE", "REVENUE"],
					INTEREST_ACCOUNT: ["EXPENSE", "REVENUE"],
					REVENUE_ACCOUNT: ["REVENUE"],
					EXPENSE_ACCOUNT: ["EXPENSE"]
				};

				const allowedTypes = requiredTypes[form.mappingType];
				if (!allowedTypes.includes(selectedAccount.accountType)) {
					errors.ledgerAccountId = `Le compte GL doit être de type ${allowedTypes.join(" ou ")} pour un mapping ${form.mappingType}`;
				}
			}
		}

		// Vérifier l'unicité du type de mapping
		const existingMapping = mappings.find(m => m.mappingType === form.mappingType && (!editingMapping || m.id !== editingMapping.id));
		if (existingMapping) {
			errors.mappingType = "Un mapping de ce type existe déjà pour ce produit";
		}

		setValidationErrors(errors);
		return Object.keys(errors).length === 0;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!validateForm()) {
			return;
		}

		setSubmitting(true);
		setError(null);
		setValidationErrors({});
		try {
			const { productGLMappingsApi } = await import("@/lib/api");
			if (editingMapping) {
				await productGLMappingsApi.update(productId, editingMapping.id, {
					mappingType: form.mappingType,
					ledgerAccountId: form.ledgerAccountId
				});
			} else {
				await productGLMappingsApi.create(productId, form);
			}
			setForm({ mappingType: "ASSET_ACCOUNT", ledgerAccountId: 0 });
			setEditingMapping(null);
			onCloseForm();
			onRefresh();
		} catch (e: any) {
			setError(e?.message ?? `Erreur lors de la ${editingMapping ? "modification" : "création"}`);
		} finally {
			setSubmitting(false);
		}
	}

	function getRequiredAccountTypes(mappingType: import("@/types").MappingType): string {
		const types: Record<import("@/types").MappingType, string> = {
			ASSET_ACCOUNT: "ASSET",
			LIABILITY_ACCOUNT: "LIABILITY",
			FEE_ACCOUNT: "EXPENSE ou REVENUE",
			INTEREST_ACCOUNT: "EXPENSE ou REVENUE",
			REVENUE_ACCOUNT: "REVENUE",
			EXPENSE_ACCOUNT: "EXPENSE"
		};
		return types[mappingType] || "";
	}

	function filterLedgerAccountsByMappingType(mappingType: import("@/types").MappingType): import("@/types").LedgerAccount[] {
		const requiredTypes: Record<import("@/types").MappingType, import("@/types").AccountType[]> = {
			ASSET_ACCOUNT: ["ASSET"],
			LIABILITY_ACCOUNT: ["LIABILITY"],
			FEE_ACCOUNT: ["EXPENSE", "REVENUE"],
			INTEREST_ACCOUNT: ["EXPENSE", "REVENUE"],
			REVENUE_ACCOUNT: ["REVENUE"],
			EXPENSE_ACCOUNT: ["EXPENSE"]
		};

		const allowedTypes = requiredTypes[mappingType] || [];
		return ledgerAccounts.filter(account => 
			account.status === "ACTIVE" && allowedTypes.includes(account.accountType)
		);
	}

	function getMappingTypeLabel(type: import("@/types").MappingType) {
		const labels: Record<import("@/types").MappingType, string> = {
			ASSET_ACCOUNT: "Compte actif",
			LIABILITY_ACCOUNT: "Compte passif",
			FEE_ACCOUNT: "Compte frais",
			INTEREST_ACCOUNT: "Compte intérêts",
			REVENUE_ACCOUNT: "Compte revenus",
			EXPENSE_ACCOUNT: "Compte charges"
		};
		return labels[type] || type;
	}

	function getAccountTypeLabel(type: import("@/types").AccountType): string {
		const labels: Record<import("@/types").AccountType, string> = {
			ASSET: "Actif",
			LIABILITY: "Passif",
			EQUITY: "Capitaux propres",
			REVENUE: "Produit",
			EXPENSE: "Charge"
		};
		return labels[type] || type;
	}

	if (loading) {
		return (
			<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
				<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				<p className="mt-4 text-gray-600">Chargement des mappings GL...</p>
			</div>
		);
	}

	// Validation des mappings obligatoires
	const requiredMappings: import("@/types").MappingType[] = ["LIABILITY_ACCOUNT"]; // Exemple: les comptes courants nécessitent un LIABILITY_ACCOUNT
	const missingMappings = requiredMappings.filter(
		reqType => !mappings.some(m => m.mappingType === reqType)
	);

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h3 className="text-lg font-semibold text-gray-900">Mappings Grand Livre</h3>
					<p className="text-sm text-gray-600 mt-1">Association des comptes GL aux produits bancaires</p>
					{missingMappings.length > 0 && (
						<div className="mt-3 p-3 bg-orange-50 border-l-4 border-orange-400 rounded-r-md">
							<p className="text-sm text-orange-800 flex items-center gap-2">
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
								Mappings manquants: {missingMappings.map(t => getMappingTypeLabel(t)).join(", ")}
							</p>
						</div>
					)}
				</div>
				{!showForm && (
					<Button onClick={onAdd} className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						Ajouter un mapping
					</Button>
				)}
			</div>

			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			{showForm && (
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<div className="flex justify-between items-center mb-4">
						<h4 className="text-lg font-semibold text-gray-900">
							{editingMapping ? "Modifier le mapping GL" : "Nouveau mapping GL"}
						</h4>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								onCloseForm();
								setEditingMapping(null);
								setForm({ mappingType: "ASSET_ACCOUNT", ledgerAccountId: 0 });
								setValidationErrors({});
							}}
						>
							✕
						</Button>
					</div>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Type de mapping *</label>
								<div className="relative">
									<select
										className={`w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md bg-white text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none ${
											editingMapping 
												? "bg-gray-100 cursor-not-allowed text-gray-500" 
												: "hover:border-gray-400"
										} ${validationErrors.mappingType ? "border-red-300 focus:ring-red-500 focus:border-red-500" : ""}`}
										value={form.mappingType}
										onChange={e => {
											const newType = e.target.value as import("@/types").MappingType;
											setForm({ ...form, mappingType: newType, ledgerAccountId: 0 }); // Réinitialiser le compte GL
											if (validationErrors.mappingType) {
												setValidationErrors({ ...validationErrors, mappingType: "" });
											}
										}}
										required
										disabled={!!editingMapping}
									>
										<option value="ASSET_ACCOUNT">Compte actif</option>
										<option value="LIABILITY_ACCOUNT">Compte passif</option>
										<option value="FEE_ACCOUNT">Compte frais</option>
										<option value="INTEREST_ACCOUNT">Compte intérêts</option>
										<option value="REVENUE_ACCOUNT">Compte revenus</option>
										<option value="EXPENSE_ACCOUNT">Compte charges</option>
									</select>
									<div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
										<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</div>
								</div>
								{validationErrors.mappingType && (
									<p className="text-xs text-red-600 mt-1">{validationErrors.mappingType}</p>
								)}
								<p className="text-xs text-gray-500 mt-1">
									Comptes GL requis: <span className="font-medium">{getRequiredAccountTypes(form.mappingType)}</span>
								</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Compte GL *</label>
								<div className="relative">
									<select
										className={`w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md bg-white text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none ${
											validationErrors.ledgerAccountId ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "hover:border-gray-400"
										}`}
										value={form.ledgerAccountId}
										onChange={e => {
											setForm({ ...form, ledgerAccountId: parseInt(e.target.value) });
											if (validationErrors.ledgerAccountId) {
												setValidationErrors({ ...validationErrors, ledgerAccountId: "" });
											}
										}}
										required
									>
										<option value={0} disabled>Sélectionner un compte GL</option>
										{filterLedgerAccountsByMappingType(form.mappingType).map(account => (
											<option key={account.id} value={account.id}>
												{account.code} - {account.name} ({account.currency}) - {getAccountTypeLabel(account.accountType)}
											</option>
										))}
									</select>
									<div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
										<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
									</div>
								</div>
								{validationErrors.ledgerAccountId && (
									<p className="text-xs text-red-600 mt-1">{validationErrors.ledgerAccountId}</p>
								)}
								{filterLedgerAccountsByMappingType(form.mappingType).length === 0 && (
									<p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
										</svg>
										Aucun compte GL actif disponible pour ce type de mapping
									</p>
								)}
							</div>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									onCloseForm();
									setEditingMapping(null);
									setForm({ mappingType: "ASSET_ACCOUNT", ledgerAccountId: 0 });
									setValidationErrors({});
								}}
							>
								Annuler
							</Button>
							<Button type="submit" disabled={submitting}>
								{submitting ? (editingMapping ? "Modification..." : "Création...") : (editingMapping ? "Modifier" : "Créer")}
							</Button>
						</div>
					</form>
				</div>
			)}

			{mappings.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">Aucun mapping GL configuré</p>
					<p className="text-gray-400 text-sm mt-2">Ajoutez un mapping pour associer ce produit à un compte GL</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type de mapping</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Compte GL</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Devise</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type de compte</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{mappings.map(mapping => {
									const account = ledgerAccounts.find(a => a.id === mapping.ledgerAccountId);
									return (
										<tr key={mapping.id} className="hover:bg-gray-50 transition-colors">
											<td className="px-6 py-4 whitespace-nowrap">
												<Badge variant={
													mapping.mappingType === "ASSET_ACCOUNT" ? "info" :
													mapping.mappingType === "LIABILITY_ACCOUNT" ? "danger" :
													mapping.mappingType === "REVENUE_ACCOUNT" ? "success" :
													mapping.mappingType === "EXPENSE_ACCOUNT" ? "warning" : "neutral"
												}>
													{getMappingTypeLabel(mapping.mappingType)}
												</Badge>
											</td>
											<td className="px-6 py-4">
												{account ? (
													<Link href={`/ledger-accounts/${account.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
														{account.code} - {account.name}
													</Link>
												) : (
													<span className="text-gray-500">ID: {mapping.ledgerAccountId}</span>
												)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												{account ? (
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
														{account.currency}
													</span>
												) : (
													<span className="text-gray-400">-</span>
												)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												{account ? (
													<Badge variant={
														account.accountType === "ASSET" ? "info" :
														account.accountType === "LIABILITY" ? "danger" :
														account.accountType === "EQUITY" ? "success" :
														account.accountType === "REVENUE" ? "success" : "warning"
													}>
														{getAccountTypeLabel(account.accountType)}
													</Badge>
												) : (
													<span className="text-gray-400">-</span>
												)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-right">
												<div className="flex items-center justify-end gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => setEditingMapping(mapping)}
														className="flex items-center gap-1"
													>
														<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
														</svg>
														Modifier
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() => {
															if (confirm("Êtes-vous sûr de vouloir supprimer ce mapping ?")) {
																onDelete(mapping.id);
															}
														}}
														className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
													>
														<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
														</svg>
														Supprimer
													</Button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					{mappings.length > 0 && (
						<div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
							<p className="text-sm text-gray-600">
								Affichage de <span className="font-semibold">{mappings.length}</span> mapping{mappings.length > 1 ? "s" : ""}
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
