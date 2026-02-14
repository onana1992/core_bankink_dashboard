"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import TablePagination from "@/components/ui/TablePagination";
import { loansApi, customersApi } from "@/lib/api";
import { formatAmount } from "@/lib/utils";
import type { Account, AccountStatus, Customer } from "@/types";

export default function LoansPage() {
	const { t, i18n } = useTranslation();
	const locale = i18n.language === "fr" ? "fr-FR" : "en-US";
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loans, setLoans] = useState<Account[]>([]);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(20);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const [filterClientId, setFilterClientId] = useState<number | null>(null);
	const [q, setQ] = useState("");

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const [loansRes, customersRes] = await Promise.all([
				loansApi.list({ clientId: filterClientId ?? undefined, page, size }),
				customersApi.list({ size: 1000 })
			]);
			setLoans(loansRes.content);
			setTotalPages(loansRes.totalPages);
			setTotalElements(loansRes.totalElements);
			setCustomers(customersRes.content);
		} catch (e: any) {
			setError(e?.message ?? t("loan.list.loadError"));
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, [filterClientId, page, size]);

	const stats = useMemo(() => {
		const by: Record<AccountStatus, number> = {
			ACTIVE: 0,
			CLOSED: 0,
			FROZEN: 0,
			SUSPENDED: 0
		};
		loans.forEach((loan) => {
			by[loan.status]++;
		});
		return {
			total: totalElements,
			active: by.ACTIVE,
			closed: by.CLOSED,
			frozen: by.FROZEN,
			suspended: by.SUSPENDED
		};
	}, [loans, totalElements]);

	const filteredLoans = useMemo(() => {
		const query = q.trim().toLowerCase();
		if (!query) return loans;
		return loans.filter((loan) => {
			const hay = `${loan.accountNumber ?? ""} ${loan.client?.displayName ?? ""} ${loan.product?.name ?? ""}`.toLowerCase();
			return hay.includes(query);
		});
	}, [loans, q]);

	function getStatusBadge(status: AccountStatus) {
		const colors: Record<AccountStatus, string> = {
			ACTIVE: "bg-green-100 text-green-800",
			CLOSED: "bg-gray-100 text-gray-800",
			FROZEN: "bg-red-100 text-red-800",
			SUSPENDED: "bg-yellow-100 text-yellow-800"
		};
		const labels: Record<AccountStatus, string> = {
			ACTIVE: t("loan.list.statusActive"),
			CLOSED: t("loan.list.statusClosed"),
			FROZEN: t("loan.list.statusFrozen"),
			SUSPENDED: t("loan.list.statusSuspended")
		};
		return <Badge className={colors[status]}>{labels[status]}</Badge>;
	}

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return "—";
		return new Date(dateStr).toLocaleDateString(locale);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("sidebar.loansList")}</h1>
					<p className="text-gray-600 mt-1">{t("loan.list.subtitle")}</p>
				</div>
				<div className="flex gap-3">
					<Link href="/loans/new">
						<Button className="flex items-center gap-2">{t("sidebar.openLoan")}</Button>
					</Link>
					<Link href="/loans/simulate">
						<Button variant="outline" className="flex items-center gap-2">{t("sidebar.loanSimulation")}</Button>
					</Link>
				</div>
			</div>

			{/* Cartes de statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">{t("loan.list.stats.total")}</div>
							<div className="text-3xl font-bold text-blue-900">{stats.total}</div>
						</div>
						<div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl shadow-sm border border-green-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-green-700 mb-1">Actifs</div>
							<div className="text-3xl font-bold text-green-900">{stats.active}</div>
						</div>
						<div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl shadow-sm border border-gray-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-gray-700 mb-1">{t("loan.list.stats.closed")}</div>
							<div className="text-3xl font-bold text-gray-900">{stats.closed}</div>
						</div>
						<div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl shadow-sm border border-red-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-red-700 mb-1">Gelés</div>
							<div className="text-3xl font-bold text-red-900">{stats.frozen}</div>
						</div>
						<div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl shadow-sm border border-yellow-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-yellow-700 mb-1">{t("loan.list.stats.suspended")}</div>
							<div className="text-3xl font-bold text-yellow-900">{stats.suspended}</div>
						</div>
						<div className="w-12 h-12 bg-yellow-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("loan.list.search")}</label>
						<div className="relative">
							<Input
								placeholder={t("loan.list.searchPlaceholder")}
								value={q}
								onChange={(e) => setQ(e.target.value)}
								className="h-10 pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
							<svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
					</div>
					<div className="min-w-0">
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("loan.list.client")}</label>
						<select
							className="w-full h-10 px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
							value={filterClientId ?? ""}
							onChange={(e) => {
								const v = e.target.value;
								setFilterClientId(v ? Number(v) : null);
								setPage(0);
							}}
						>
							<option value="">{t("loan.list.allClients")}</option>
							{customers.map((c) => (
								<option key={c.id} value={c.id}>{c.displayName}</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
			)}

			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				{loading ? (
					<div className="p-8 text-center text-gray-500">{t("loan.list.loading")}</div>
				) : loans.length === 0 ? (
					<div className="p-8 text-center text-gray-500">{t("loan.list.noLoans")}</div>
				) : filteredLoans.length === 0 ? (
					<div className="p-8 text-center text-gray-500">{t("loan.list.noMatch")}</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("loan.list.table.accountNumber")}</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("loan.list.table.clientId")}</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("loan.list.table.product")}</th>
										<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("loan.list.table.balance")}</th>
										<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("loan.list.table.rate")}</th>
										<th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t("loan.list.table.maturity")}</th>
										<th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t("loan.list.table.status")}</th>
										<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("loan.list.table.actions")}</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{filteredLoans.map((loan) => (
										<tr key={loan.id} className="hover:bg-gray-50">
											<td className="px-4 py-3 text-sm font-medium text-gray-900">{loan.accountNumber}</td>
											<td className="px-4 py-3 text-sm">
												{(loan.clientId ?? loan.client?.id) != null ? (
													<Link href={`/customers/${loan.clientId ?? loan.client?.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-mono">
														{loan.clientId ?? loan.client?.id}
													</Link>
												) : (
													<span className="text-gray-500">—</span>
												)}
											</td>
											<td className="px-4 py-3 text-sm text-gray-600">{loan.product?.name ?? "—"}</td>
											<td className="px-4 py-3 text-sm text-right font-medium">{formatAmount(loan.balance, loan.currency, locale)}</td>
											<td className="px-4 py-3 text-sm text-right">{loan.interestRate != null ? `${Number(loan.interestRate)} %` : "—"}</td>
											<td className="px-4 py-3 text-sm text-center">{formatDate(loan.maturityDate)}</td>
											<td className="px-4 py-3 text-center">{getStatusBadge(loan.status)}</td>
											<td className="px-4 py-3 text-right">
												<Link href={`/loans/${loan.id}`}>
													<Button variant="outline" size="sm">{t("loan.list.detailSchedule")}</Button>
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<TablePagination
							page={page}
							pageSize={size}
							size={size}
							totalElements={totalElements}
							totalPages={totalPages}
							onPageChange={setPage}
							onSizeChange={(s) => { setSize(s); setPage(0); }}
						/>
					</>
				)}
			</div>
		</div>
	);
}
