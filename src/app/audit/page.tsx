"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useSearchParams } from "next/navigation";
import { auditApi, usersApi } from "@/lib/api";
import { resolveApiExceptionMessage } from "@/lib/resolveApiException";
import { AUDIT_ACTION_CODES, type AuditEvent, type User, type AuditStatisticsResponse } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getAuditActionBadge } from "@/components/audit/AuditEventDetails";
import { AuditEventsTable } from "@/components/audit/AuditEventsTable";
import {
	OpsField,
	OpsFilterPanel,
	OpsInlineAlert,
	OpsLoadingState,
	OpsPageHeader,
	OPS_PAGE_STACK,
	OpsSelect
} from "@/components/ops";

function AuditPageContent() {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const traceSearchKey = searchParams.toString();
	const skipNextLoadEventsRef = useRef(false);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [events, setEvents] = useState<AuditEvent[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const userList = Array.isArray(users) ? users : [];
	const eventList = Array.isArray(events) ? events : [];
	const [statistics, setStatistics] = useState<AuditStatisticsResponse | null>(null);
	const [currentPage, setCurrentPage] = useState(0);
	const [pageSize, setPageSize] = useState(20);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const [filters, setFilters] = useState({
		userId: "",
		action: "",
		resourceType: "",
		fromDate: "",
		toDate: ""
	});

	useEffect(() => {
		loadUsers();
		loadStatistics();
	}, []);

	useEffect(() => {
		const rt = searchParams.get("resourceType");
		const rid = searchParams.get("resourceId");
		if (rt && rid) {
			const n = Number(rid);
			if (!Number.isNaN(n)) {
				void (async () => {
					await handleViewResourceTrace(rt, n);
					skipNextLoadEventsRef.current = true;
					router.replace("/audit", { scroll: false });
				})();
				return;
			}
		}
		if (skipNextLoadEventsRef.current) {
			skipNextLoadEventsRef.current = false;
			return;
		}
		loadEvents();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- loadEvents reflects filters/page; trace URL uses ref to skip one list fetch after replace
	}, [filters, currentPage, pageSize, traceSearchKey]);

	async function loadUsers() {
		try {
			const data = await usersApi.list({ page: 0, size: 500 });
			setUsers(data.content ?? []);
		} catch (e: any) {
			console.error("Erreur lors du chargement des utilisateurs:", e);
		}
	}

	async function loadEvents() {
		setLoading(true);
		setError(null);
		try {
			const data = await auditApi.getEvents({
				userId: filters.userId ? Number(filters.userId) : undefined,
				action: filters.action || undefined,
				resourceType: filters.resourceType || undefined,
				fromDate: filters.fromDate ? new Date(filters.fromDate).toISOString() : undefined,
				toDate: filters.toDate ? new Date(filters.toDate).toISOString() : undefined,
				page: currentPage,
				size: pageSize
			});
			setEvents(data.content ?? []);
			setTotalPages(data.totalPages ?? 0);
			setTotalElements(data.totalElements ?? 0);
		} catch (e: unknown) {
			setError(resolveApiExceptionMessage(e, t));
			setEvents([]);
		} finally {
			setLoading(false);
		}
	}

	async function loadStatistics() {
		try {
			const data = await auditApi.getStatistics();
			setStatistics(data);
		} catch (e: any) {
			console.error("Erreur lors du chargement des statistiques:", e);
		}
	}

	async function handleExport() {
		try {
			setLoading(true);
			const blob = await auditApi.exportEvents({
				userId: filters.userId ? Number(filters.userId) : undefined,
				action: filters.action || undefined,
				resourceType: filters.resourceType || undefined,
				fromDate: filters.fromDate ? new Date(filters.fromDate).toISOString() : undefined,
				toDate: filters.toDate ? new Date(filters.toDate).toISOString() : undefined
			});
			
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `audit_export_${new Date().toISOString().split('T')[0]}.csv`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de l'export");
		} finally {
			setLoading(false);
		}
	}

	function handleViewEventDetails(eventId: number) {
		router.push(`/audit/${eventId}`);
	}

	async function handleViewResourceTrace(resourceType: string, resourceId: number) {
		try {
			setLoading(true);
			setError(null);
			const trace = await auditApi.getResourceTrace(resourceType, resourceId);
			setEvents(trace.events);
			setCurrentPage(0);
		} catch (e: unknown) {
			setError(resolveApiExceptionMessage(e, t));
		} finally {
			setLoading(false);
		}
	}

	function handlePageChange(newPage: number) {
		setCurrentPage(newPage);
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	function userIdFromStatsUsername(username: string): number | undefined {
		return userList.find(u => u.username === username)?.id;
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Audit d'accès</h1>
					<p className="text-gray-600 mt-1">Consultation et analyse des événements d'audit</p>
				</div>
				<Button
					onClick={handleExport}
					variant="secondary"
					disabled={loading}
					className="flex items-center gap-2"
				>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					Exporter CSV
				</Button>
			</div>

			{/* Statistiques */}
			{statistics && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-sm border border-blue-200">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-sm font-medium text-blue-700">Total d'événements</h3>
								<p className="text-3xl font-bold text-blue-900 mt-2">{(statistics.totalEvents ?? 0).toLocaleString()}</p>
							</div>
							<div className="bg-blue-200 rounded-full p-3">
								<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
							</div>
						</div>
					</div>
					<div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-sm border border-green-200">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-sm font-medium text-green-700">Dernières 24h</h3>
								<p className="text-3xl font-bold text-green-900 mt-2">{statistics.eventsLast24Hours.toLocaleString()}</p>
							</div>
							<div className="bg-green-200 rounded-full p-3">
								<svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
						</div>
					</div>
					<div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-sm border border-purple-200">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-sm font-medium text-purple-700">7 derniers jours</h3>
								<p className="text-3xl font-bold text-purple-900 mt-2">{statistics.eventsLast7Days.toLocaleString()}</p>
							</div>
							<div className="bg-purple-200 rounded-full p-3">
								<svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
							</div>
						</div>
					</div>
					<div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-sm border border-orange-200">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-sm font-medium text-orange-700">30 derniers jours</h3>
								<p className="text-3xl font-bold text-orange-900 mt-2">{statistics.eventsLast30Days.toLocaleString()}</p>
							</div>
							<div className="bg-orange-200 rounded-full p-3">
								<svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Graphiques de statistiques */}
			{statistics && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
							Événements par action
						</h3>
						<div className="space-y-3">
							{Object.entries(statistics.eventsByAction ?? {})
								.sort(([, a], [, b]) => b - a)
								.map(([action, count]) => (
									<div key={action} className="flex items-center justify-between">
										<div className="flex items-center gap-2 flex-1">
											{getAuditActionBadge(action)}
											<div className="flex-1 bg-gray-200 rounded-full h-2.5">
												<div 
													className="bg-blue-600 h-2.5 rounded-full transition-all"
													style={{ width: `${((statistics.totalEvents ?? 0) > 0 ? (count / (statistics.totalEvents ?? 1)) : 0) * 100}%` }}
												></div>
											</div>
										</div>
										<span className="font-semibold text-gray-900 ml-4">{count.toLocaleString()}</span>
									</div>
								))}
						</div>
					</div>
					<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
						<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
							</svg>
							Événements par type de ressource
						</h3>
						<div className="space-y-3">
							{Object.entries(statistics.eventsByResourceType)
								.sort(([, a], [, b]) => b - a)
								.slice(0, 8)
								.map(([resourceType, count]) => (
									<div key={resourceType} className="flex items-center justify-between">
										<span className="text-sm text-gray-700 font-medium">{resourceType}</span>
										<span className="font-semibold text-gray-900">{count.toLocaleString()}</span>
									</div>
								))}
						</div>
					</div>
				</div>
			)}

			{statistics && statistics.eventsByUser && Object.keys(statistics.eventsByUser).length > 0 && (
				<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
					<h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
						<svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
						Activité par utilisateur
					</h3>
					<p className="text-sm text-gray-600 mb-4">
						Cliquez sur un nom pour ouvrir l&apos;historique d&apos;audit de cet utilisateur (pagination côté serveur).
					</p>
					<div className="space-y-2 max-h-64 overflow-y-auto">
						{Object.entries(statistics.eventsByUser)
							.sort(([, a], [, b]) => b - a)
							.slice(0, 25)
							.map(([username, count]) => {
								const uid = userIdFromStatsUsername(username);
								return (
									<div key={username} className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0">
										{uid !== undefined ? (
											<button
												type="button"
												onClick={() => router.push(`/audit/user/${uid}`)}
												className="text-sm text-left text-blue-600 hover:text-blue-800 hover:underline font-medium truncate"
											>
												{username}
											</button>
										) : (
											<span className="text-sm text-gray-700 font-medium truncate" title={username}>
												{username}
												<span className="ml-2 text-xs font-normal text-gray-400">(ID inconnu dans la liste chargée)</span>
											</span>
										)}
										<span className="text-sm font-semibold text-gray-900 shrink-0">{count.toLocaleString()}</span>
									</div>
								);
							})}
					</div>
				</div>
			)}

			{/* Liste des événements */}
			<>
					{/* Filtres */}
					<OpsFilterPanel
						title="Filtres"
						icon={
							<svg className="w-5 h-5 text-ops-fg-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
							</svg>
						}
						gridClassName="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6"
					>
							<OpsField label="Utilisateur">
								{userList.length > 0 ? (
									<OpsSelect
										value={filters.userId}
										onChange={(e) => {
											setFilters({ ...filters, userId: e.target.value });
											setCurrentPage(0);
										}}
									>
										<option value="">Tous les utilisateurs</option>
										{userList.map((user) => (
											<option key={user.id} value={user.id}>
												{user.username}
											</option>
										))}
									</OpsSelect>
								) : (
									<Input
										type="number"
										value={filters.userId}
										onChange={(e) => {
											setFilters({ ...filters, userId: e.target.value });
											setCurrentPage(0);
										}}
										placeholder="ID utilisateur (ex: 1)"
									/>
								)}
								{filters.userId ? (
									<button
										type="button"
										onClick={() => {
											const id = Number(filters.userId);
											if (Number.isFinite(id) && id > 0) router.push(`/audit/user/${id}`);
										}}
										className="mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
									>
										Ouvrir la page « activité de cet utilisateur »
									</button>
								) : null}
							</OpsField>
							<OpsField label="Action">
								<OpsSelect
									value={filters.action}
									onChange={(e) => {
										setFilters({ ...filters, action: e.target.value });
										setCurrentPage(0);
									}}
								>
									<option value="">Toutes les actions</option>
									{AUDIT_ACTION_CODES.map((action) => (
										<option key={action} value={action}>
											{action}
										</option>
									))}
								</OpsSelect>
							</OpsField>
							<OpsField label="Type de ressource">
								<Input
									value={filters.resourceType}
									onChange={(e) => {
										setFilters({ ...filters, resourceType: e.target.value });
										setCurrentPage(0);
									}}
									placeholder="User, Account, etc."
								/>
							</OpsField>
							<OpsField label="Date de début">
								<Input
									type="datetime-local"
									value={filters.fromDate}
									onChange={(e) => {
										setFilters({ ...filters, fromDate: e.target.value });
										setCurrentPage(0);
									}}
								/>
							</OpsField>
							<OpsField label="Date de fin">
								<Input
									type="datetime-local"
									value={filters.toDate}
									onChange={(e) => {
										setFilters({ ...filters, toDate: e.target.value });
										setCurrentPage(0);
									}}
								/>
							</OpsField>
							<div className="flex items-end">
								<Button
									onClick={() => {
										setFilters({
											userId: "",
											action: "",
											resourceType: "",
											fromDate: "",
											toDate: ""
										});
										setCurrentPage(0);
									}}
									variant="secondary"
									className="w-full"
								>
									Réinitialiser
								</Button>
							</div>
					</OpsFilterPanel>

					{error && <OpsInlineAlert variant="error">{error}</OpsInlineAlert>}

					<AuditEventsTable
						events={eventList}
						loading={loading}
						totalPages={totalPages}
						totalElements={totalElements ?? 0}
						currentPage={currentPage}
						pageSize={pageSize}
						resultsHeading={`Événements d'audit (${(totalElements ?? 0).toLocaleString()})`}
						onPageChange={handlePageChange}
						onPageSizeChange={(s) => {
							setPageSize(s);
							setCurrentPage(0);
						}}
						onEventDetails={handleViewEventDetails}
						onResourceTrace={handleViewResourceTrace}
						showUserColumn
					/>
			</>
		</div>
	);
}

export default function AuditPage() {
	return (
		<Suspense fallback={<OpsLoadingState message="Chargement…" />}>
			<AuditPageContent />
		</Suspense>
	);
}
