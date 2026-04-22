"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import { showToast } from "@/lib/toast";
import { paymentMethodsApi, productsApi } from "@/lib/api";
import type { PaymentMethod, ProductPaymentMethod } from "@/types";

export default function ProductPaymentMethodsTab({
	productId,
	links,
	loading,
	onRefresh
}: {
	productId: string;
	links: ProductPaymentMethod[];
	loading: boolean;
	onRefresh: () => void;
}) {
	const { t } = useTranslation();
	const [showForm, setShowForm] = useState(false);
	const [catalog, setCatalog] = useState<PaymentMethod[]>([]);
	const [loadingCatalog, setLoadingCatalog] = useState(false);
	const [paymentMethodId, setPaymentMethodId] = useState<number | "">("");
	const [allowedDeposit, setAllowedDeposit] = useState(false);
	const [allowedWithdrawal, setAllowedWithdrawal] = useState(false);
	const [allowedLoanRepayment, setAllowedLoanRepayment] = useState(false);
	const [displayOrder, setDisplayOrder] = useState("0");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!showForm) return;
		let cancelled = false;
		(async () => {
			setLoadingCatalog(true);
			try {
				const all = await paymentMethodsApi.list({ activeOnly: true });
				if (!cancelled) setCatalog(all);
			} catch {
				if (!cancelled) setCatalog([]);
			} finally {
				if (!cancelled) setLoadingCatalog(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [showForm]);

	const linkedIds = new Set(links.map((l) => l.paymentMethod?.id).filter(Boolean) as number[]);
	const availableCatalog = catalog.filter((m) => !linkedIds.has(m.id));

	function resetForm() {
		setPaymentMethodId("");
		setAllowedDeposit(false);
		setAllowedWithdrawal(false);
		setAllowedLoanRepayment(false);
		setDisplayOrder("0");
	}

	async function handleAdd(e: React.FormEvent) {
		e.preventDefault();
		if (paymentMethodId === "") return;
		if (!allowedDeposit && !allowedWithdrawal && !allowedLoanRepayment) {
			showToast(t("product.detail.paymentMethods.flagsError"), "error");
			return;
		}
		setSubmitting(true);
		try {
			await productsApi.addProductPaymentMethod(productId, {
				paymentMethodId: paymentMethodId as number,
				allowedDeposit,
				allowedWithdrawal,
				allowedLoanRepayment,
				displayOrder: parseInt(displayOrder, 10) || 0
			});
			setShowForm(false);
			resetForm();
			await onRefresh();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : t("product.detail.paymentMethods.addError");
			showToast(msg, "error");
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDelete(linkId: number) {
		if (!confirm(t("product.detail.paymentMethods.confirmDelete"))) return;
		try {
			await productsApi.deleteProductPaymentMethod(productId, linkId);
			await onRefresh();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : t("product.detail.paymentMethods.deleteError");
			showToast(msg, "error");
		}
	}

	async function toggleFlag(
		link: ProductPaymentMethod,
		field: "allowedDeposit" | "allowedWithdrawal" | "allowedLoanRepayment",
		next: boolean
	) {
		const nextDep = field === "allowedDeposit" ? next : link.allowedDeposit;
		const nextWdr = field === "allowedWithdrawal" ? next : link.allowedWithdrawal;
		const nextLnr = field === "allowedLoanRepayment" ? next : link.allowedLoanRepayment;
		if (!nextDep && !nextWdr && !nextLnr) {
			showToast(t("product.detail.paymentMethods.flagsError"), "error");
			return;
		}
		try {
			await productsApi.updateProductPaymentMethod(productId, link.id, {
				allowedDeposit: nextDep,
				allowedWithdrawal: nextWdr,
				allowedLoanRepayment: nextLnr
			});
			await onRefresh();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : t("product.detail.paymentMethods.updateError");
			showToast(msg, "error");
		}
	}

	if (loading) {
		return <div className="text-sm text-gray-500 py-8 text-center">{t("product.detail.paymentMethods.loading")}</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">{t("product.detail.paymentMethods.title", { count: links.length })}</h3>
				{!showForm && (
					<Button type="button" onClick={() => setShowForm(true)}>
						{t("product.detail.paymentMethods.add")}
					</Button>
				)}
			</div>

			{showForm && (
				<form onSubmit={handleAdd} className="border rounded-lg p-4 bg-gray-50 space-y-3">
					<div className="flex justify-between items-center">
						<span className="font-medium">{t("product.detail.paymentMethods.formTitle")}</span>
						<button
							type="button"
							className="text-sm text-gray-600 hover:text-gray-900"
							onClick={() => {
								setShowForm(false);
								resetForm();
							}}
						>
							{t("product.detail.paymentMethods.cancel")}
						</button>
					</div>
					<div>
						<label className="block text-sm mb-1">{t("product.detail.paymentMethods.selectMethod")}</label>
						<select
							className="w-full border rounded-md px-3 py-2"
							value={paymentMethodId === "" ? "" : String(paymentMethodId)}
							onChange={(e) => setPaymentMethodId(e.target.value ? parseInt(e.target.value, 10) : "")}
							required
							disabled={loadingCatalog}
						>
							<option value="">{loadingCatalog ? "…" : t("product.detail.paymentMethods.selectPlaceholder")}</option>
							{availableCatalog.map((m) => (
								<option key={m.id} value={String(m.id)}>
									{m.code} — {m.name}
								</option>
							))}
						</select>
					</div>
					<div className="flex flex-wrap gap-4 text-sm">
						<label className="flex items-center gap-2">
							<input type="checkbox" checked={allowedDeposit} onChange={(e) => setAllowedDeposit(e.target.checked)} />
							{t("product.detail.paymentMethods.flagDeposit")}
						</label>
						<label className="flex items-center gap-2">
							<input type="checkbox" checked={allowedWithdrawal} onChange={(e) => setAllowedWithdrawal(e.target.checked)} />
							{t("product.detail.paymentMethods.flagWithdrawal")}
						</label>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={allowedLoanRepayment}
								onChange={(e) => setAllowedLoanRepayment(e.target.checked)}
							/>
							{t("product.detail.paymentMethods.flagLoanRepay")}
						</label>
					</div>
					<div>
						<label className="block text-sm mb-1">{t("product.detail.paymentMethods.displayOrder")}</label>
						<input
							type="number"
							className="w-32 border rounded-md px-3 py-2"
							value={displayOrder}
							onChange={(e) => setDisplayOrder(e.target.value)}
						/>
					</div>
					<Button type="submit" disabled={submitting}>
						{submitting ? t("product.detail.paymentMethods.saving") : t("product.detail.paymentMethods.save")}
					</Button>
				</form>
			)}

			{links.length === 0 && !showForm ? (
				<p className="text-sm text-gray-500">{t("product.detail.paymentMethods.empty")}</p>
			) : (
				<div className="overflow-x-auto border rounded-lg">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="text-left p-2">{t("product.detail.paymentMethods.colMethod")}</th>
								<th className="text-center p-2">{t("product.detail.paymentMethods.colDeposit")}</th>
								<th className="text-center p-2">{t("product.detail.paymentMethods.colWithdrawal")}</th>
								<th className="text-center p-2">{t("product.detail.paymentMethods.colLoan")}</th>
								<th className="text-right p-2">{t("product.detail.paymentMethods.colActions")}</th>
							</tr>
						</thead>
						<tbody>
							{links.map((row) => (
								<tr key={row.id} className="border-t">
									<td className="p-2">
										<div className="font-medium">{row.paymentMethod?.name ?? "—"}</div>
										<div className="text-xs text-gray-500">{row.paymentMethod?.code}</div>
									</td>
									<td className="text-center p-2">
										<input
											type="checkbox"
											checked={row.allowedDeposit}
											onChange={(e) => toggleFlag(row, "allowedDeposit", e.target.checked)}
										/>
									</td>
									<td className="text-center p-2">
										<input
											type="checkbox"
											checked={row.allowedWithdrawal}
											onChange={(e) => toggleFlag(row, "allowedWithdrawal", e.target.checked)}
										/>
									</td>
									<td className="text-center p-2">
										<input
											type="checkbox"
											checked={row.allowedLoanRepayment}
											onChange={(e) => toggleFlag(row, "allowedLoanRepayment", e.target.checked)}
										/>
									</td>
									<td className="text-right p-2">
										<Button type="button" variant="outline" className="text-red-600" onClick={() => handleDelete(row.id)}>
											{t("product.detail.paymentMethods.remove")}
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
