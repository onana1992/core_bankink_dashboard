"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { loanApplicationsApi } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import type { LoanApplication, LoanApplicationStatus } from "@/types";

export default function LoanApplicationDetailPage() {
	const { t, i18n } = useTranslation();
	const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
	const params = useParams();
	const router = useRouter();
	const { showToast } = useToast();
	const id = params.id as string;
	const [app, setApp] = useState<LoanApplication | null>(null);
	const [loading, setLoading] = useState(true);
	const [deciding, setDeciding] = useState(false);
	const [showRejectModal, setShowRejectModal] = useState(false);
	const [rejectionReason, setRejectionReason] = useState("");

	const load = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		try {
			const data = await loanApplicationsApi.get(id);
			setApp(data);
		} catch (e) {
			showToast(t("loan.application.detailNotFound"), "error");
			router.push("/loans/applications");
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		load();
	}, [load]);

	async function handleApprove() {
		if (!app || app.status !== "PENDING") return;
		setDeciding(true);
		try {
			await loanApplicationsApi.decide(app.id, { approved: true });
			showToast(t("loan.application.approved"), "success");
			load();
		} catch (e: any) {
			showToast(e?.message ?? t("loan.application.detailApproveError"), "error");
		} finally {
			setDeciding(false);
		}
	}

	async function handleReject() {
		if (!app || app.status !== "PENDING") return;
		setDeciding(true);
		try {
			await loanApplicationsApi.decide(app.id, { approved: false, rejectionReason: rejectionReason.trim() || "Non précisé." });
			showToast(t("loan.application.rejected"), "success");
			setShowRejectModal(false);
			setRejectionReason("");
			load();
		} catch (e: any) {
			showToast(e?.message ?? t("loan.application.detailRejectError"), "error");
		} finally {
			setDeciding(false);
		}
	}

	function statusBadge(status: LoanApplicationStatus) {
		const map: Record<LoanApplicationStatus, { className: string; label: string }> = {
			PENDING: { className: "bg-amber-100 text-amber-800", label: t("loan.application.statusPending") },
			APPROVED: { className: "bg-green-100 text-green-800", label: t("loan.application.statusApproved") },
			REJECTED: { className: "bg-red-100 text-red-800", label: t("loan.application.statusRejected") }
		};
		const s = map[status];
		return <Badge className={s.className}>{s.label}</Badge>;
	}

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
	}

	if (loading && !app) {
		return (
			<div className="space-y-6">
				<div>
					<div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-4" />
					<div className="h-9 w-72 bg-gray-200 rounded animate-pulse mb-2" />
					<div className="h-5 w-56 bg-gray-200 rounded animate-pulse" />
				</div>
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
					<div className="space-y-4">
						{[1, 2, 3, 4, 5].map((i) => (
							<div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
						))}
					</div>
				</div>
			</div>
		);
	}

	if (!app) {
		return null;
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div>
				<Link
					href="/loans/applications"
					className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("loan.application.backToList")}
				</Link>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							{t("loan.application.detailTitle", { number: app.applicationNumber })}
						</h1>
						<p className="text-gray-600 mt-1">{t("loan.application.detailSubtitle")}</p>
					</div>
					<div className="flex items-center gap-3">
						{statusBadge(app.status)}
						<Link href="/loans/applications">
							<Button variant="outline" size="sm">{t("loan.application.listLoansList")}</Button>
						</Link>
					</div>
				</div>
			</div>

			{/* Montant mis en avant */}
			<div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl shadow-sm border border-blue-200">
				<div className="text-sm font-medium text-blue-700 mb-1">{t("loan.application.detailRequestedAmount")}</div>
				<div className="text-2xl font-bold text-blue-900">
					{Number(app.requestedAmount).toLocaleString(locale)} {app.currency}
				</div>
			</div>

			{/* Carte Informations */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200 bg-gray-50">
					<div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
						<svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
						</svg>
					</div>
					<h2 className="text-lg font-semibold text-gray-900">{t("loan.application.detailInfoTitle")}</h2>
				</div>
				<dl className="divide-y divide-gray-200">
					<div className="px-6 py-4 flex flex-wrap justify-between items-center gap-2">
						<dt className="text-sm font-medium text-gray-500">{t("loan.application.detailClient")}</dt>
						<dd className="text-sm font-medium text-gray-900">{app.client?.displayName ?? `#${app.clientId}`}</dd>
					</div>
					<div className="px-6 py-4 flex flex-wrap justify-between items-center gap-2">
						<dt className="text-sm font-medium text-gray-500">{t("loan.application.detailProduct")}</dt>
						<dd className="text-sm font-medium text-gray-900">{app.product?.name ?? `#${app.productId}`}</dd>
					</div>
					<div className="px-6 py-4 flex flex-wrap justify-between items-center gap-2">
						<dt className="text-sm font-medium text-gray-500">{t("loan.application.detailPeriod")}</dt>
						<dd className="text-sm font-medium text-gray-900">{app.period?.periodName ?? `#${app.periodId}`}</dd>
					</div>
					<div className="px-6 py-4 flex flex-wrap justify-between items-center gap-2">
						<dt className="text-sm font-medium text-gray-500">{t("loan.application.detailRequestedAt")}</dt>
						<dd className="text-sm font-medium text-gray-900">{formatDate(app.requestedAt)}</dd>
					</div>
					{app.status !== "PENDING" && app.decidedAt && (
						<>
							<div className="px-6 py-4 flex flex-wrap justify-between items-center gap-2">
								<dt className="text-sm font-medium text-gray-500">{t("loan.application.detailDecidedAt")}</dt>
								<dd className="text-sm font-medium text-gray-900">{formatDate(app.decidedAt)}</dd>
							</div>
							{app.status === "REJECTED" && app.rejectionReason && (
								<div className="px-6 py-4">
									<dt className="text-sm font-medium text-gray-500 mb-2">{t("loan.application.detailRejectionReason")}</dt>
									<dd className="text-sm text-gray-900 bg-red-50 border border-red-200 p-4 rounded-lg">{app.rejectionReason}</dd>
								</div>
							)}
							{app.status === "APPROVED" && app.accountId && (
								<div className="px-6 py-4 flex flex-wrap justify-between items-center gap-2">
									<dt className="text-sm font-medium text-gray-500">{t("loan.application.detailLoanCreated")}</dt>
									<dd className="text-sm font-medium">
										<Link
											href={`/loans/${app.accountId}`}
											className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
										>
											{t("loan.application.detailViewLoan", { id: app.accountId })}
										</Link>
									</dd>
								</div>
							)}
						</>
					)}
				</dl>
			</div>

			{/* Actions (PENDING) */}
			{app.status === "PENDING" && (
				<div className="flex flex-wrap gap-3">
					<Button onClick={handleApprove} disabled={deciding} className="flex items-center gap-2">
						{deciding ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : null}
						{t("loan.application.detailApprove")}
					</Button>
					<Button variant="outline" onClick={() => setShowRejectModal(true)} disabled={deciding}>
						{t("loan.application.detailReject")}
					</Button>
				</div>
			)}

			{/* Modal Rejet */}
			{showRejectModal && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="fixed inset-0 bg-gray-500/75" onClick={() => setShowRejectModal(false)} />
					<div className="flex min-h-full items-center justify-center p-4">
						<div className="relative bg-white rounded-xl shadow-xl w-full max-w-md border border-gray-200">
							<div className="px-6 py-4 border-b border-gray-200">
								<h3 className="text-lg font-semibold text-gray-900">{t("loan.application.detailRejectModalTitle")}</h3>
								<p className="text-sm text-gray-500 mt-1">{t("loan.application.detailRejectModalDesc")}</p>
							</div>
							<div className="px-6 py-4">
								<label className="block text-sm font-medium text-gray-700 mb-2">{t("loan.application.detailRejectReasonLabel")}</label>
								<textarea
									rows={3}
									value={rejectionReason}
									onChange={(e) => setRejectionReason(e.target.value)}
									placeholder={t("loan.application.detailRejectReasonPlaceholder")}
									className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
								/>
							</div>
							<div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
								<Button variant="outline" onClick={() => { setShowRejectModal(false); setRejectionReason(""); }}>
									{t("loan.apply.cancel")}
								</Button>
								<Button
									variant="outline"
									className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
									onClick={handleReject}
									disabled={deciding}
								>
									{deciding ? t("loan.application.detailRejecting") : t("loan.application.detailReject")}
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
