"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { holdsApi, accountsApi } from "@/lib/api";
import type { Account } from "@/types";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";

export default function NewHoldPage() {
	const { t } = useTranslation();
	const searchParams = useSearchParams();
	const preselectedAccountId = searchParams.get("accountId");

	const [accounts, setAccounts] = useState<Account[]>([]);
	const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
	const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
	const [amount, setAmount] = useState("");
	const [currency, setCurrency] = useState("");
	const [reason, setReason] = useState("");
	const [expiresAt, setExpiresAt] = useState("");
	const [loading, setLoading] = useState(false);
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

	const loadAccounts = useCallback(async () => {
		try {
			const response = await accountsApi.list({ size: 1000 });
			const active = response.content.filter((a) => a.status === "ACTIVE");
			setAccounts(active);
			return active;
		} catch (e) {
			setToast({ message: e instanceof Error ? e.message : t("hold.list.errors.loadAccounts"), type: "error" });
			return [];
		}
	}, [t]);

	useEffect(() => {
		loadAccounts();
	}, [loadAccounts]);

	useEffect(() => {
		if (!preselectedAccountId || accounts.length === 0) return;
		const id = parseInt(preselectedAccountId, 10);
		if (!isNaN(id) && accounts.some((a) => a.id === id)) {
			setSelectedAccountId(id);
			const acc = accounts.find((a) => a.id === id);
			if (acc) {
				setSelectedAccount(acc);
				setCurrency(acc.currency ?? "");
			}
		}
	}, [preselectedAccountId, accounts]);

	useEffect(() => {
		if (selectedAccountId && accounts.length > 0) {
			const acc = accounts.find((a) => a.id === selectedAccountId) ?? null;
			setSelectedAccount(acc);
			if (acc) setCurrency(acc.currency ?? "");
		} else {
			setSelectedAccount(null);
		}
	}, [selectedAccountId, accounts]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedAccountId) {
			setToast({ message: t("transaction.form.account.noAccountsAvailable"), type: "error" });
			return;
		}
		const amountNum = parseFloat(amount);
		if (!amount || isNaN(amountNum) || amountNum <= 0) {
			setToast({ message: t("transaction.form.amount.placeholder"), type: "error" });
			return;
		}
		if (!reason.trim()) {
			setToast({ message: t("hold.form.reason"), type: "error" });
			return;
		}
		setLoading(true);
		try {
			// datetime-local donne "YYYY-MM-DDTHH:mm" ; le backend attend un Instant ISO-8601
			const expiresAtIso = expiresAt ? new Date(expiresAt).toISOString() : undefined;
			const hold = await holdsApi.create(selectedAccountId, {
				amount: amountNum,
				currency: currency || undefined,
				reason: reason.trim(),
				expiresAt: expiresAtIso
			});
			window.location.href = `/holds/${hold.id}`;
		} catch (e: any) {
			setToast({ message: e?.message ?? t("hold.list.errors.createFailed"), type: "error" });
			setLoading(false);
		}
	};

	return (
		<div className="max-w-4xl mx-auto">
			<Link
				href="/holds"
				className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1"
			>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
				</svg>
				{t("hold.detail.backToList")}
			</Link>

			{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				{/* Header */}
				<div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 border-b border-gray-200">
					<div className="flex items-center gap-4">
						<div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
							<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div className="flex-1">
							<h1 className="text-2xl font-bold text-gray-900">{t("hold.list.createHold")}</h1>
							<p className="text-sm text-gray-600 mt-1">{t("hold.list.description")}</p>
						</div>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					{/* Compte */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							{t("hold.list.orSelect")} <span className="text-red-500">*</span>
						</label>
						<select
							value={selectedAccountId || ""}
							onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value, 10) : 0)}
							className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							required
							disabled={accounts.length === 0}
						>
							<option value="">
								{accounts.length === 0 ? t("transaction.form.account.noAccountsAvailable") : t("transaction.form.account.selectAccount")}
							</option>
							{accounts.map((acc) => (
								<option key={acc.id} value={acc.id}>
									{acc.accountNumber} — {acc.currency} ({t("hold.list.balance")}: {Number(acc.balance ?? 0).toFixed(2)})
								</option>
							))}
						</select>
						{selectedAccount && (
							<div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
								<span className="text-gray-600">{t("hold.list.available")}:</span>
								<span className="ml-2 font-semibold text-green-700">
									{Number(selectedAccount.availableBalance ?? selectedAccount.balance ?? 0).toFixed(2)} {selectedAccount.currency}
								</span>
							</div>
						)}
					</div>

					{/* Montant */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							{t("hold.form.amount")} <span className="text-red-500">*</span>
						</label>
						<Input
							type="number"
							step="0.01"
							min="0.01"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="0.00"
							required
							className="w-full"
						/>
					</div>

					{/* Devise */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">{t("hold.form.currency")}</label>
						<Input
							value={currency}
							onChange={(e) => setCurrency(e.target.value)}
							placeholder="XAF"
							disabled={!!selectedAccount}
							className="w-full"
						/>
					</div>

					{/* Raison */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">
							{t("hold.form.reason")} <span className="text-red-500">*</span>
						</label>
						<textarea
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							rows={3}
							placeholder={t("hold.form.reasonPlaceholder")}
							required
						/>
					</div>

					{/* Date d'expiration */}
					<div>
						<label className="block text-sm font-semibold text-gray-900 mb-2">{t("hold.form.expiresAt")}</label>
						<Input
							type="datetime-local"
							value={expiresAt}
							onChange={(e) => setExpiresAt(e.target.value)}
							className="w-full"
						/>
					</div>

					<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
						<Link href="/holds">
							<Button type="button" variant="outline" disabled={loading}>
								{t("common.cancel")}
							</Button>
						</Link>
						<Button type="submit" disabled={loading || !selectedAccountId || !amount || !reason.trim()}>
							{loading ? t("common.loading") : t("hold.form.submit")}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
