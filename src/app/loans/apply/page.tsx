"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { accountsApi, customersApi, loanApplicationsApi, productsApi } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import type { Customer, Product, ProductPeriod, Account } from "@/types";

export default function ApplyLoanPage() {
	const { t, i18n } = useTranslation();
	const { showToast } = useToast();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [periods, setPeriods] = useState<ProductPeriod[]>([]);
	const [clientAccounts, setClientAccounts] = useState<Account[]>([]);
	const [client, setClient] = useState<Customer | null>(null);
	const [showClientModal, setShowClientModal] = useState(false);
	const [clientSearch, setClientSearch] = useState("");

	const clientIdParam = searchParams.get("clientId");

	const [form, setForm] = useState<{
		clientId: number | "";
		productId: number;
		openingAmount: number | undefined;
		periodId: number | undefined;
		currency: string | undefined;
		sourceAccountId: number | undefined;
	}>({
		clientId: clientIdParam ? Number(clientIdParam) : "",
		productId: 0,
		openingAmount: undefined,
		periodId: undefined,
		currency: undefined,
		sourceAccountId: undefined
	});

	useEffect(() => {
		async function load() {
			try {
				const [customersRes, productsRes] = await Promise.all([
					customersApi.list({ status: "VERIFIED", size: 1000 }),
					productsApi.list({ category: "LOAN", status: "ACTIVE", size: 100 })
				]);
				setCustomers(customersRes.content);
				setProducts(productsRes.content);
			} catch (e: any) {
				showToast(e?.message ?? t("loan.apply.loadError"), "error");
			}
		}
		load();
	}, []);

	useEffect(() => {
		if (!form.productId) {
			setPeriods([]);
			return;
		}
		productsApi.getPeriods(form.productId).then((p) => setPeriods(p.filter((x) => x.isActive))).catch(() => setPeriods([]));
	}, [form.productId]);

	useEffect(() => {
		if (form.clientId === "" || !form.clientId) {
			setClientAccounts([]);
			setForm((prev) => ({ ...prev, sourceAccountId: undefined }));
			return;
		}
		accountsApi.getClientAccounts(form.clientId).then((acc) => {
			setClientAccounts(acc.filter((a) => a.status === "ACTIVE" && a.product?.category === "CURRENT_ACCOUNT"));
		}).catch(() => setClientAccounts([]));
	}, [form.clientId]);

	useEffect(() => {
		const id = form.clientId;
		if (typeof id === "number" && id > 0) {
			const found = customers.find((c) => c.id === id);
			setClient(found ?? null);
		} else {
			setClient(null);
		}
	}, [form.clientId, customers]);

	const selectedProduct = products.find((p) => p.id === form.productId);
	const filteredCustomers = customers.filter((c) => {
		if (!clientSearch.trim()) return true;
		const q = clientSearch.toLowerCase();
		return c.displayName?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q);
	});

	function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
		setForm((prev) => {
			const next = { ...prev, [key]: value };
			if (key === "productId") {
				next.periodId = undefined;
				const p = products.find((x) => x.id === value);
				if (p?.currency) next.currency = p.currency;
			}
			return next;
		});
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (form.clientId === "" || !form.clientId || !form.productId || form.openingAmount == null || form.openingAmount <= 0) {
			showToast(t("loan.apply.errors.clientProductAmountRequired"), "error");
			return;
		}
		if (selectedProduct && (form.openingAmount < (selectedProduct.minBalance ?? 0) || form.openingAmount > (selectedProduct.maxBalance ?? Infinity))) {
			showToast("Le montant est hors des limites du produit.", "error");
			return;
		}
		if (periods.length > 0 && !form.periodId) {
			showToast(t("loan.apply.errors.selectDuration"), "error");
			return;
		}
		setLoading(true);
		try {
			await loanApplicationsApi.submit({
				clientId: form.clientId as number,
				productId: form.productId,
				openingAmount: form.openingAmount,
				periodId: form.periodId!,
				currency: form.currency || undefined,
				sourceAccountId: form.sourceAccountId && form.sourceAccountId > 0 ? form.sourceAccountId : undefined
			});
			showToast(t("loan.application.submitted") ?? "Demande enregistrée avec statut PENDING.", "success");
			router.push("/loans/applications");
		} catch (e: any) {
			showToast(e?.message ?? t("loan.apply.submitError"), "error");
		} finally {
			setLoading(false);
		}
	}

	const inputClass = "w-full h-10 px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

	return (
		<div className="space-y-6">
			<div>
				<Link href="/loans/applications" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
					{t("loan.application.backToList") ?? "Retour aux demandes"}
				</Link>
				<h1 className="text-3xl font-bold text-gray-900">{t("loan.application.title") ?? "Soumettre une demande de prêt"}</h1>
				<p className="text-gray-600 mt-1">{t("loan.application.subtitle") ?? "Demande enregistrée avec statut PENDING ; un opérateur pourra l'approuver ou la rejeter."}</p>
			</div>

			<form onSubmit={onSubmit} className="space-y-6">
				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center gap-2 mb-4">
						<div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
							<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">{t("account.new.client")}</h2>
					</div>
					{!client ? (
						<Button
							type="button"
							variant="outline"
							onClick={() => { setShowClientModal(true); setClientSearch(""); }}
							className="w-full justify-start h-12 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50"
						>
							<svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
							{t("transaction.form.client.searchAndSelect")}
						</Button>
					) : (
						<div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex items-start justify-between">
							<div>
								<div className="font-semibold text-gray-900">{client.displayName}</div>
								<div className="text-sm text-gray-600">{client.email} {client.phone}</div>
								<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">{t(`customer.statuses.${client.status}`)}</span>
							</div>
							<div className="flex gap-2">
								<button type="button" onClick={() => { setShowClientModal(true); setClientSearch(""); }} className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded-md">{t("loan.apply.changeClient")}</button>
								<button type="button" onClick={() => { update("clientId", ""); setClient(null); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
								</button>
							</div>
						</div>
					)}
				</div>

				<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("loan.apply.productLabel")}</label>
							<select className={inputClass} value={form.productId || ""} onChange={(e) => update("productId", Number(e.target.value))} required>
								<option value={0}>{t("loan.apply.selectProduct")}</option>
								{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
							</select>
							{selectedProduct && <p className="mt-1 text-xs text-gray-500">{t("loan.apply.amountRange", { min: selectedProduct.minBalance ?? 0, max: selectedProduct.maxBalance ?? 0, currency: selectedProduct.currency ?? "" })}</p>}
						</div>
						{periods.length > 0 && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">{t("loan.apply.durationLabel")}</label>
								<select className={inputClass} value={form.periodId ?? ""} onChange={(e) => update("periodId", e.target.value ? Number(e.target.value) : undefined)} required>
									<option value="">{t("loan.apply.selectPeriod")}</option>
									{periods.map((p) => <option key={p.id} value={p.id}>{p.periodName} – Taux {p.interestRate ?? 0} %</option>)}
								</select>
							</div>
						)}
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("loan.apply.amountLabel")}</label>
						<Input type="number" step="0.01" min={selectedProduct?.minBalance ?? 0} max={selectedProduct?.maxBalance ?? undefined} value={form.openingAmount ?? ""} onChange={(e) => update("openingAmount", e.target.value ? Number(e.target.value) : undefined)} placeholder={t("loan.apply.amountPlaceholder")} required className={inputClass} />
					</div>
				</div>

				{/* Compte source pour les frais (frais de dossier) */}
				{client && (
					<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
						<div className="flex items-center gap-2 mb-4">
							<div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
								<svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
								</svg>
							</div>
							<h2 className="text-lg font-semibold text-gray-900">{t("account.new.sourceAccount")}</h2>
						</div>
						{clientAccounts.length === 0 ? (
							<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
								<div className="flex items-start gap-2">
									<svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
									</svg>
									<p className="text-sm text-yellow-800">{t("account.new.noSourceAccountAvailable")}</p>
								</div>
							</div>
						) : (
							<>
								<select
									className={inputClass}
									value={form.sourceAccountId ?? ""}
									onChange={(e) => update("sourceAccountId", e.target.value ? Number(e.target.value) : undefined)}
								>
									<option value="">{t("loan.apply.noSourceAccount")}</option>
									{clientAccounts.map((a) => (
										<option key={a.id} value={a.id}>
											{a.accountNumber} – {Number(a.balance).toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {a.currency}
											{a.product?.name ? ` (${a.product.name})` : ""}
										</option>
									))}
								</select>
								{form.sourceAccountId && (
									<div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
										<div className="grid grid-cols-2 gap-3 text-sm">
											<div>
												<span className="text-gray-600">{t("transaction.form.account.account")}</span>
												<span className="ml-2 font-semibold text-gray-900">
													{clientAccounts.find((a) => a.id === form.sourceAccountId)?.accountNumber}
												</span>
											</div>
											<div>
												<span className="text-gray-600">{t("transaction.form.account.balance")}</span>
												<span className="ml-2 font-semibold text-green-700">
													{clientAccounts.find((a) => a.id === form.sourceAccountId)?.balance?.toFixed(2)} {clientAccounts.find((a) => a.id === form.sourceAccountId)?.currency}
												</span>
											</div>
										</div>
									</div>
								)}
								<p className="text-xs text-gray-500 mt-2">{t("account.new.sourceAccountHint")}</p>
							</>
						)}
					</div>
				)}

				<div className="flex gap-3 pt-4">
					<Button type="submit" disabled={loading || !form.clientId || !form.productId} className="flex items-center gap-2">
						{loading ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> {t("loan.apply.submitting")}</> : t("loan.apply.submitButton")}
					</Button>
					<Button type="button" variant="outline" onClick={() => router.back()}>{t("loan.apply.cancel")}</Button>
				</div>
			</form>

			{showClientModal && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => { setShowClientModal(false); setClientSearch(""); }} />
					<div className="flex min-h-full items-center justify-center p-4">
						<div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
							<div className="px-6 py-4 border-b flex justify-between items-center">
								<h3 className="text-lg font-semibold">{t("transaction.form.client.searchModal.title")}</h3>
								<button type="button" onClick={() => { setShowClientModal(false); setClientSearch(""); }} className="text-gray-400 hover:text-gray-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
							</div>
							<div className="px-6 py-4">
								<Input placeholder={t("transaction.form.client.searchModal.searchPlaceholder")} value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="w-full mb-4" autoFocus />
								<div className="max-h-96 overflow-y-auto divide-y">
									{filteredCustomers.length === 0 ? (
										<div className="p-6 text-center text-gray-500">{clientSearch ? t("transaction.form.client.searchModal.noResults") : t("transaction.form.client.searchModal.startTyping")}</div>
									) : (
										filteredCustomers.map((c) => (
											<button key={c.id} type="button" className="w-full px-4 py-3 text-left hover:bg-blue-50 flex justify-between" onClick={() => { update("clientId", c.id); setClient(c); setShowClientModal(false); setClientSearch(""); }}>
												<div><div className="font-medium">{c.displayName}</div><div className="text-sm text-gray-600">{c.email} {c.phone}</div></div>
												<span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">{t(`customer.statuses.${c.status}`)}</span>
											</button>
										))
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
