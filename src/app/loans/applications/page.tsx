"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import TablePagination from "@/components/ui/TablePagination";
import { loanApplicationsApi, customersApi } from "@/lib/api";
import type { LoanApplication, LoanApplicationStatus, Customer } from "@/types";

export default function LoanApplicationsPage() {
	const { t, i18n } = useTranslation();
	const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
	const [loading, setLoading] = useState(true);
	const [applications, setApplications] = useState<LoanApplication[]>([]);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(20);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const [filterClientId, setFilterClientId] = useState<number | null>(null);
	const [filterStatus, setFilterStatus] = useState<LoanApplicationStatus | "">("");

	async function load() {
		setLoading(true);
		try {
			const [res, customersRes] = await Promise.all([
				loanApplicationsApi.list({
					clientId: filterClientId ?? undefined,
					status: filterStatus || undefined,
					page,
					size
				}),
				customersApi.list({ size: 1000 })
			]);
			setApplications(res.content);
			setTotalPages(res.totalPages);
			setTotalElements(res.totalElements);
			setCustomers(customersRes.content);
		} catch (e) {
			console.error(e);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, [filterClientId, filterStatus, page, size]);

	const stats = useMemo(() => {
		const by: Record<LoanApplicationStatus, number> = {
			PENDING: 0,
			APPROVED: 0,
			REJECTED: 0
		};
		applications.forEach((app) => {
			by[app.status]++;
		});
		return {
			total: totalElements,
			pending: by.PENDING,
			approved: by.APPROVED,
			rejected: by.REJECTED
		};
	}, [applications, totalElements]);

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
	}

	function statusBadge(status: LoanApplicationStatus) {
		const map: Record<LoanApplicationStatus, { className: string; label: string }> = {
			PENDING: { className: "bg-amber-100 text-amber-800", label: t("loan.application.statusPending") ?? "En attente" },
			APPROVED: { className: "bg-green-100 text-green-800", label: t("loan.application.statusApproved") ?? "Approuvée" },
			REJECTED: { className: "bg-red-100 text-red-800", label: t("loan.application.statusRejected") ?? "Rejetée" }
		};
		const s = map[status];
		return <Badge className={s.className}>{s.label}</Badge>;
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("loan.application.listTitle") ?? "Demandes de prêt"}</h1>
					<p className="text-gray-600 mt-1">{t("loan.application.listSubtitle") ?? "Soumettre une demande (PENDING) ou approuver / rejeter (UC-L08)."}</p>
				</div>
				<div className="flex gap-3">
					<Link href="/loans/apply">
						<Button className="flex items-center gap-2">{t("loan.application.submitNew") ?? "Soumettre une demande"}</Button>
					</Link>
					<Link href="/loans">
						<Button variant="outline" className="flex items-center gap-2">{t("loan.application.listLoansList") ?? "Liste des prêts"}</Button>
					</Link>
				</div>
			</div>

			{/* Cartes de statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">{t("loan.application.listStats.total") ?? "Total"}</div>
							<div className="text-3xl font-bold text-blue-900">{stats.total}</div>
						</div>
						<div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-xl shadow-sm border border-amber-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-amber-700 mb-1">{t("loan.application.listStats.pending") ?? "En attente"}</div>
							<div className="text-3xl font-bold text-amber-900">{stats.pending}</div>
						</div>
						<div className="w-12 h-12 bg-amber-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl shadow-sm border border-green-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-green-700 mb-1">{t("loan.application.listStats.approved") ?? "Approuvées"}</div>
							<div className="text-3xl font-bold text-green-900">{stats.approved}</div>
						</div>
						<div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl shadow-sm border border-red-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-red-700 mb-1">{t("loan.application.listStats.rejected") ?? "Rejetées"}</div>
							<div className="text-3xl font-bold text-red-900">{stats.rejected}</div>
						</div>
						<div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
			</div>

			{/* Filtres */}
			<div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
				<div className="flex items-center gap-2 mb-4">
					<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
					</svg>
					<h2 className="text-lg font-semibold text-gray-900">{t("loan.list.filtersTitle")}</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
					<div className="min-w-0">
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("loan.list.client")}</label>
						<select
							className="w-full h-10 px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
							value={filterClientId ?? ""}
							onChange={(e) => { setFilterClientId(e.target.value ? Number(e.target.value) : null); setPage(0); }}
						>
							<option value="">{t("loan.list.allClients")}</option>
							{customers.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
						</select>
					</div>
					<div className="min-w-0">
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("loan.application.listStatus")}</label>
						<select
							className="w-full h-10 px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
							value={filterStatus}
							onChange={(e) => { setFilterStatus(e.target.value as LoanApplicationStatus | ""); setPage(0); }}
						>
							<option value="">{t("loan.application.listAllStatuses")}</option>
							<option value="PENDING">{t("loan.application.statusPending")}</option>
							<option value="APPROVED">{t("loan.application.statusApproved")}</option>
							<option value="REJECTED">{t("loan.application.statusRejected")}</option>
						</select>
					</div>
				</div>
			</div>

			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				{loading ? (
					<div className="p-8 text-center text-gray-500">{t("loan.list.loading")}</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("loan.application.listTable.applicationNumber")}</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("loan.application.listTable.client")}</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("loan.application.listTable.amount")}</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("loan.application.listTable.status")}</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("loan.application.listTable.requestedAt")}</th>
										<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("loan.application.listTable.actions")}</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200 text-sm">
									{applications.length === 0 ? (
										<tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t("loan.application.listNoApplications")}</td></tr>
									) : (
										applications.map((app) => (
											<tr key={app.id} className="hover:bg-gray-50">
												<td className="px-4 py-3 text-sm font-medium text-gray-900">{app.applicationNumber}</td>
												<td className="px-4 py-3 text-sm text-gray-600">{app.client?.displayName ?? "Client #" + app.clientId}</td>
												<td className="px-4 py-3 text-sm text-gray-900">{Number(app.requestedAmount).toLocaleString(locale)} {app.currency}</td>
												<td className="px-4 py-3">{statusBadge(app.status)}</td>
												<td className="px-4 py-3 text-sm text-gray-600">{formatDate(app.requestedAt)}</td>
												<td className="px-4 py-3 text-right">
													<Link href={"/loans/applications/" + app.id}>
														<Button variant="outline" size="sm">{t("loan.application.listDetail")}</Button>
													</Link>
													{app.status === "PENDING" && (
														<Link href={"/loans/applications/" + app.id} className="ml-2">
															<Button size="sm">{t("loan.application.listApproveReject")}</Button>
														</Link>
													)}
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						<TablePagination page={page} pageSize={size} size={size} totalElements={totalElements} totalPages={totalPages} onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0); }} sizeOptions={[10, 20, 50]} />
					</>
				)}
			</div>
		</div>
	);
}
