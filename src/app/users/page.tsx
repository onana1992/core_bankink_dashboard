"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usersApi } from "@/lib/api";
import type { User, UserStatus } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import TablePagination from "@/components/ui/TablePagination";

const DEFAULT_PAGE_SIZE = 20;

export default function UsersPage() {
	const { t } = useTranslation();
	const { isAuthenticated } = useAuth();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [users, setUsers] = useState<User[]>([]);
	const [totalElements, setTotalElements] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [currentPage, setCurrentPage] = useState(0);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [filterStatus, setFilterStatus] = useState<"ALL" | UserStatus>("ALL");
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		if (isAuthenticated) {
			load(0);
		}
	}, [isAuthenticated, filterStatus, pageSize]);

	function goToPage(page: number) {
		if (page < 0 || page >= totalPages) return;
		load(page);
	}

	async function load(page: number) {
		setLoading(true);
		setError(null);
		try {
			const res = await usersApi.list({
				...(filterStatus !== "ALL" && { status: filterStatus }),
				page,
				size: pageSize
			});
			setUsers(res.content ?? []);
			setTotalElements(res.totalElements ?? 0);
			setTotalPages(res.totalPages ?? 0);
			setCurrentPage(res.number ?? 0);
		} catch (e: any) {
			setError(e?.message ?? t("user.errors.loadError"));
		} finally {
			setLoading(false);
		}
	}

	const filtered = (users ?? []).filter(u =>
		(u.username ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
		(u.email ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
		`${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const stats = useMemo(() => {
		const list = users ?? [];
		const by: Record<string, number> = {};
		for (const u of list) {
			by[u.status] = (by[u.status] ?? 0) + 1;
		}
		return {
			total: totalElements,
			active: by["ACTIVE"] ?? 0,
			inactive: by["INACTIVE"] ?? 0,
			locked: by["LOCKED"] ?? 0,
			expired: by["EXPIRED"] ?? 0
		};
	}, [users, totalElements]);

	function statusBadgeVariant(status: UserStatus): "neutral" | "success" | "warning" | "danger" | "info" {
		switch (status) {
			case "ACTIVE":
				return "success";
			case "LOCKED":
				return "danger";
			case "EXPIRED":
				return "warning";
			case "INACTIVE":
			default:
				return "neutral";
		}
	}

	if (!isAuthenticated) {
		return null;
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("common.users")}</h1>
					<p className="text-gray-600 mt-1">{t("user.description")}</p>
				</div>
				<div className="flex gap-3">
					<Button onClick={() => load(currentPage)} variant="outline" className="flex items-center gap-2">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						{t("common.refresh")}
					</Button>
					<Link href="/users/new">
						<Button className="flex items-center gap-2">
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
							{t("user.new.title")}
						</Button>
					</Link>
				</div>
			</div>

			{/* Statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">{t("user.stats.total")}</div>
							<div className="text-3xl font-bold text-blue-900">{stats.total}</div>
						</div>
						<div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl shadow-sm border border-green-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-green-700 mb-1">{t("user.stats.active")}</div>
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
							<div className="text-sm font-medium text-gray-700 mb-1">{t("user.stats.inactive")}</div>
							<div className="text-3xl font-bold text-gray-900">{stats.inactive}</div>
						</div>
						<div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl shadow-sm border border-red-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-red-700 mb-1">{t("user.stats.locked")}</div>
							<div className="text-3xl font-bold text-red-900">{stats.locked}</div>
						</div>
						<div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl shadow-sm border border-yellow-200">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm font-medium text-yellow-700 mb-1">{t("user.stats.expired")}</div>
							<div className="text-3xl font-bold text-yellow-900">{stats.expired}</div>
						</div>
						<div className="w-12 h-12 bg-yellow-200 rounded-lg flex items-center justify-center">
							<svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
					<h2 className="text-lg font-semibold text-gray-900">{t("user.filters.title")}</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("user.filters.search")}</label>
						<div className="relative">
							<Input
								placeholder={t("user.filters.searchPlaceholder")}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10"
							/>
							<svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("user.filters.status")}</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value as "ALL" | UserStatus)}
						>
							<option value="ALL">{t("common.all")}</option>
							<option value="ACTIVE">{t("user.statuses.ACTIVE")}</option>
							<option value="INACTIVE">{t("user.statuses.INACTIVE")}</option>
							<option value="LOCKED">{t("user.statuses.LOCKED")}</option>
							<option value="EXPIRED">{t("user.statuses.EXPIRED")}</option>
						</select>
					</div>
				</div>
			</div>

			{/* Erreur */}
			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			{/* Liste */}
			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p className="mt-4 text-gray-600">{t("common.loading")}</p>
				</div>
			) : filtered.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
					</svg>
					<p className="text-gray-500 text-lg font-medium">{t("user.table.noUsers")}</p>
					<p className="text-gray-400 text-sm mt-2">{t("user.table.noUsersHint")}</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("common.id")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("user.table.username")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("common.email")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("common.name")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("common.status")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("user.table.roles")}</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("user.table.actions")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{filtered.map(user => (
									<tr key={user.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="font-mono font-medium text-gray-900">{user.id}</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Link href={`/users/${user.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
												{user.username}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-700">
											{user.email}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-gray-700">
											{user.firstName || user.lastName
												? `${user.firstName || ""} ${user.lastName || ""}`.trim()
												: "-"}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge variant={statusBadgeVariant(user.status)}>
												{t(`user.statuses.${user.status}`)}
											</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											{user.roles && user.roles.length > 0 ? (
												<div className="flex flex-wrap gap-1">
													{user.roles.map(role => (
														<Badge key={role.id} variant="info">
															{role.name}
														</Badge>
													))}
												</div>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<Link href={`/users/${user.id}`}>
												<Button variant="outline" size="sm" className="flex items-center gap-1">
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
													{t("user.table.view")}
												</Button>
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{(totalElements > 0 || filtered.length > 0) && (
						<TablePagination
							page={currentPage}
							totalPages={totalPages}
							totalElements={totalElements}
							pageSize={pageSize}
							onPageChange={(p) => goToPage(p)}
							resultsLabel={t("user.table.pagination.users")}
							showFirstLast
							sizeOptions={[10, 20, 50, 100]}
							size={pageSize}
							onSizeChange={(s) => {
								setPageSize(s);
								load(0);
							}}
						/>
					)}
				</div>
			)}
		</div>
	);
}











