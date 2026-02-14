"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Toast from "@/components/ui/Toast";
import { holdsApi, accountsApi } from "@/lib/api";
import { formatAmount } from "@/lib/utils";
import { CloudDownload } from "lucide-react";
import type { Hold, Account } from "@/types";

const HOLD_STATUS_CLASS: Record<string, string> = {
	PENDING: "bg-yellow-100 text-yellow-800",
	APPLIED: "bg-green-100 text-green-800",
	RELEASED: "bg-gray-100 text-gray-800",
	EXPIRED: "bg-red-100 text-red-800"
};

export default function HoldDetailPage() {
	const { t, i18n } = useTranslation();
	const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
	const params = useParams();
	const id = params.id as string;

	const [hold, setHold] = useState<Hold | null>(null);
	const [account, setAccount] = useState<Account | null>(null);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

	function formatCurrency(amount: number, currency: string) {
		return formatAmount(amount, currency || "XAF", locale);
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleString(locale, {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	}

	useEffect(() => {
		async function load() {
			if (!id) return;
			setLoading(true);
			try {
				const holdData = await holdsApi.get(Number(id));
				setHold(holdData);
				if (holdData.accountId) {
					const acc = await accountsApi.get(holdData.accountId).catch(() => null);
					setAccount(acc ?? null);
				}
			} catch (e: any) {
				setToast({ message: e?.message ?? t("hold.detail.errors.loadFailed"), type: "error" });
			} finally {
				setLoading(false);
			}
		}
		load();
	}, [id]);

	async function handleRelease() {
		if (!hold || hold.status !== "PENDING") return;
		setActionLoading(true);
		try {
			await holdsApi.release(hold.id);
			setToast({ message: t("hold.list.releaseSuccess"), type: "success" });
			setHold((prev) => (prev ? { ...prev, status: "RELEASED" as const } : null));
		} catch (e: any) {
			setToast({ message: e?.message ?? t("hold.list.errors.releaseFailed"), type: "error" });
		} finally {
			setActionLoading(false);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mb-4" />
					<p className="text-gray-600">{t("common.loading")}</p>
				</div>
			</div>
		);
	}

	if (!hold) {
		return (
			<div className="space-y-4">
				<div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-r-md flex items-start gap-3">
					<svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
					</svg>
					<div>
						<div className="font-medium">{t("common.error")}</div>
						<div className="text-sm mt-1">{t("hold.detail.notFound")}</div>
					</div>
				</div>
				<Link href="/holds">
					<Button className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						{t("hold.detail.backToList")}
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-4xl mx-auto">
			{/* En-tête */}
			<div>
				<Link
					href="/holds"
					className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("hold.detail.backToList")}
				</Link>
				<div className="flex items-center justify-between flex-wrap gap-4">
					<div className="flex items-center gap-4">
						<div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
							<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div>
							<h1 className="text-3xl font-bold text-gray-900">{t("hold.detail.title")} #{hold.id}</h1>
							<p className="text-gray-600 mt-1">{t("hold.detail.subtitle")}</p>
						</div>
					</div>
					{hold.status === "PENDING" && (
						<Button
							variant="outline"
							className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
							onClick={handleRelease}
							disabled={actionLoading}
						>
							<CloudDownload className="w-4 h-4" />
							{actionLoading ? t("common.loading") : t("hold.list.release")}
						</Button>
					)}
				</div>
			</div>

			{toast && (
				<Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
			)}

			{/* Carte Informations */}
			<div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl shadow-sm overflow-hidden">
				<div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
							<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div>
							<h2 className="text-lg font-bold text-white">{t("hold.detail.info")}</h2>
							<p className="text-xs text-amber-100">{t("hold.detail.subtitle")}</p>
						</div>
					</div>
				</div>
				<div className="p-6 space-y-4">
					<div className="bg-white rounded-lg p-4 border border-amber-100">
						<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t("hold.list.amount")}</dt>
						<dd className="text-2xl font-bold text-amber-900 mt-1">
							{formatCurrency(hold.amount, hold.currency)}
						</dd>
					</div>
					<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
						<dt className="text-sm font-medium text-gray-700">{t("hold.list.status")}</dt>
						<dd>
							<Badge className={HOLD_STATUS_CLASS[hold.status] ?? "bg-gray-100 text-gray-800"}>
								{t(`hold.status.${hold.status}`)}
							</Badge>
						</dd>
					</div>
					<div className="bg-white rounded-lg p-4 border border-gray-200">
						<dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t("hold.list.reason")}</dt>
						<dd className="text-sm text-gray-700">{hold.reason}</dd>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
							<dt className="text-sm font-medium text-gray-700">{t("common.createdAt")}</dt>
							<dd className="text-sm text-gray-900">{hold.createdAt ? formatDate(hold.createdAt) : "—"}</dd>
						</div>
						<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
							<dt className="text-sm font-medium text-gray-700">{t("hold.list.expiresAt")}</dt>
							<dd className="text-sm text-gray-900">{hold.expiresAt ? formatDate(hold.expiresAt) : "—"}</dd>
						</div>
					</div>
					{hold.releasedAt && (
						<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
							<dt className="text-sm font-medium text-gray-700">{t("hold.detail.releasedAt")}</dt>
							<dd className="text-sm text-gray-900">{formatDate(hold.releasedAt)}</dd>
						</div>
					)}
					{account && (
						<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
							<dt className="text-sm font-medium text-gray-700">{t("hold.detail.account")}</dt>
							<dd className="text-sm">
								<Link
									href={`/accounts/${account.id}`}
									className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium"
								>
									{account.accountNumber || account.id} — {account.currency}
								</Link>
							</dd>
						</div>
					)}
					{hold.status === "APPLIED" && hold.transactionId && (
						<div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
							<dt className="text-sm font-medium text-gray-700">{t("hold.detail.transaction")}</dt>
							<dd className="text-sm">
								<Link
									href={`/transactions/${hold.transactionId}`}
									className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium"
								>
									{t("hold.list.viewTransaction")} #{hold.transactionId}
								</Link>
							</dd>
						</div>
					)}
				</div>
			</div>

			{/* Actions rapides */}
			<div className="flex flex-wrap gap-3">
				<Link href={`/accounts/${hold.accountId}`}>
					<Button variant="outline" className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
						</svg>
						{t("hold.list.viewAccount")}
					</Button>
				</Link>
				<Link href="/holds">
					<Button variant="outline" className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
						</svg>
						{t("hold.detail.backToList")}
					</Button>
				</Link>
			</div>
		</div>
	);
}
