"use client";

import { useEffect, useState } from "react";
import { auditApi, usersApi } from "@/lib/api";
import type { AuditEvent, User, AuditStatisticsResponse } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

type ViewMode = "list" | "details";

export default function AuditPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [events, setEvents] = useState<AuditEvent[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [statistics, setStatistics] = useState<AuditStatisticsResponse | null>(null);
	const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>("list");
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
		loadEvents();
	}, []);

	useEffect(() => {
		if (viewMode === "list") {
			loadEvents();
		}
	}, [filters, currentPage, pageSize, viewMode]);

	async function loadUsers() {
		try {
			const data = await usersApi.list();
			setUsers(data);
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
			setEvents(data.content);
			setTotalPages(data.totalPages);
			setTotalElements(data.totalElements);
		} catch (e: any) {
			const errorMessage = e?.message || "Erreur lors du chargement des événements";
			if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
				setError("Impossible de se connecter au serveur. Vérifiez que le backend est démarré et accessible.");
			} else {
				setError(errorMessage);
			}
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

	async function handleViewEventDetails(eventId: number) {
		try {
			const event = await auditApi.getEvent(eventId);
			setSelectedEvent(event);
			setViewMode("details");
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement des détails");
		}
	}

	async function handleViewResourceTrace(resourceType: string, resourceId: number) {
		try {
			setLoading(true);
			const trace = await auditApi.getResourceTrace(resourceType, resourceId);
			setEvents(trace.events);
			setViewMode("list");
			setCurrentPage(0);
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement de la traçabilité");
		} finally {
			setLoading(false);
		}
	}

	function getActionBadge(action: string) {
		const colors: Record<string, string> = {
			LOGIN: "bg-green-100 text-green-800",
			LOGOUT: "bg-gray-100 text-gray-800",
			CREATE: "bg-blue-100 text-blue-800",
			UPDATE: "bg-yellow-100 text-yellow-800",
			DELETE: "bg-red-100 text-red-800",
			READ: "bg-purple-100 text-purple-800",
			EXECUTE: "bg-indigo-100 text-indigo-800",
			REFRESH_TOKEN: "bg-pink-100 text-pink-800"
		};
		return <Badge className={colors[action] || "bg-gray-100 text-gray-800"}>{action}</Badge>;
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleString('fr-FR', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function handlePageChange(newPage: number) {
		setCurrentPage(newPage);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Audit et Conformité</h1>
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
								<p className="text-3xl font-bold text-blue-900 mt-2">{statistics.totalEvents.toLocaleString()}</p>
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
							{Object.entries(statistics.eventsByAction)
								.sort(([, a], [, b]) => b - a)
								.map(([action, count]) => (
									<div key={action} className="flex items-center justify-between">
										<div className="flex items-center gap-2 flex-1">
											{getActionBadge(action)}
											<div className="flex-1 bg-gray-200 rounded-full h-2.5">
												<div 
													className="bg-blue-600 h-2.5 rounded-full transition-all"
													style={{ width: `${(count / statistics.totalEvents) * 100}%` }}
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

			{/* Vue détails */}
			{viewMode === "details" && selectedEvent && (
				<div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
					{/* Header avec gradient */}
					<div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
						<div className="flex justify-between items-start">
							<div className="flex items-center gap-3">
								<div className="bg-white/20 rounded-lg p-2">
									<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
								</div>
								<div>
									<h2 className="text-2xl font-bold text-white">Détails de l'événement</h2>
									<p className="text-blue-100 text-sm mt-1">ID: #{selectedEvent.id}</p>
								</div>
							</div>
							<Button 
								onClick={() => {
									setViewMode("list");
									setSelectedEvent(null);
								}} 
								variant="secondary"
								className="bg-white/20 hover:bg-white/30 text-white border-white/30"
							>
								<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
								</svg>
								Retour
							</Button>
						</div>
					</div>

					{/* Contenu */}
					<div className="p-6">
						{/* Informations principales */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
							<div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
								<div className="flex items-center gap-2 mb-2">
									<svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Date et heure</h3>
								</div>
								<p className="text-gray-900 font-medium">{formatDate(selectedEvent.createdAt)}</p>
							</div>

							<div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
								<div className="flex items-center gap-2 mb-2">
									<svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
									<h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide">Utilisateur</h3>
								</div>
								<p className="text-gray-900 font-medium">
									{selectedEvent.user ? (
										<span className="flex items-center gap-2">
											<span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">
												{selectedEvent.user.username}
											</span>
										</span>
									) : (
										<span className="text-gray-400 italic">Non disponible</span>
									)}
								</p>
							</div>

							<div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
								<div className="flex items-center gap-2 mb-2">
									<svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
									<h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Action</h3>
								</div>
								<div>{getActionBadge(selectedEvent.action)}</div>
							</div>

							<div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-100">
								<div className="flex items-center gap-2 mb-2">
									<svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
									</svg>
									<h3 className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Type de ressource</h3>
								</div>
								<p className="text-gray-900 font-medium">
									<Badge className="bg-orange-100 text-orange-800">{selectedEvent.resourceType}</Badge>
								</p>
							</div>
						</div>

						{/* Informations secondaires */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
							<div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
								<h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">ID Ressource</h3>
								{selectedEvent.resourceId ? (
									<div className="flex items-center gap-2">
										<code className="bg-gray-200 px-3 py-1.5 rounded font-mono text-sm text-gray-900">
											{selectedEvent.resourceId}
										</code>
										<Button
											onClick={() => handleViewResourceTrace(selectedEvent.resourceType, selectedEvent.resourceId!)}
											variant="secondary"
											className="text-xs px-2 py-1"
										>
											<svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
											</svg>
											Traçabilité
										</Button>
									</div>
								) : (
									<p className="text-gray-400 italic">-</p>
								)}
							</div>

							<div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
								<h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Adresse IP</h3>
								<p className="text-gray-900 font-mono text-sm">
									{selectedEvent.ipAddress ? (
										<span className="bg-gray-200 px-3 py-1.5 rounded inline-block">
											{selectedEvent.ipAddress}
										</span>
									) : (
										<span className="text-gray-400 italic">-</span>
									)}
								</p>
							</div>
						</div>

						{/* User Agent */}
						{selectedEvent.userAgent && (
							<div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
								<h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-2">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
									User Agent
								</h3>
								<p className="text-gray-700 text-sm break-all bg-white p-3 rounded border border-gray-200">
									{selectedEvent.userAgent}
								</p>
							</div>
						)}

						{/* Détails JSON */}
						{selectedEvent.details && (() => {
							let parsedDetails: any = null;
							let isJson = false;
							try {
								parsedDetails = JSON.parse(selectedEvent.details);
								isJson = true;
							} catch (e) {
								// Ce n'est pas du JSON valide, afficher comme texte
							}
							
							return (
								<div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide flex items-center gap-2">
											<svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
											</svg>
											{isJson ? "Détails (JSON)" : "Détails"}
										</h3>
										{isJson && (
											<Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
												JSON Valide
											</Badge>
										)}
									</div>
									{isJson ? (
										<div className="bg-gray-950 p-4 rounded-lg border border-gray-800 overflow-x-auto">
											<pre className="text-green-400 text-sm font-mono leading-relaxed">
												{JSON.stringify(parsedDetails, null, 2)}
											</pre>
										</div>
									) : (
										<div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
											<pre className="text-gray-300 text-sm font-mono leading-relaxed whitespace-pre-wrap break-words">
												{selectedEvent.details}
											</pre>
										</div>
									)}
									{isJson && parsedDetails && (
										<div className="mt-4 pt-4 border-t border-gray-700">
											<h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Vue structurée</h4>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
												{Object.entries(parsedDetails).map(([key, value]) => (
													<div key={key} className="bg-gray-800/50 p-3 rounded border border-gray-700">
														<div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
															{key}
														</div>
														<div className="text-gray-200 text-sm font-medium">
															{typeof value === 'object' ? JSON.stringify(value) : String(value)}
														</div>
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							);
						})()}
					</div>
				</div>
			)}

			{/* Liste des événements */}
			{viewMode === "list" && (
				<>
					{/* Filtres */}
					<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
						<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							<svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
							</svg>
							Filtres
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Utilisateur</label>
								{users.length > 0 ? (
									<select
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										value={filters.userId}
										onChange={(e) => {
											setFilters({ ...filters, userId: e.target.value });
											setCurrentPage(0);
										}}
									>
										<option value="">Tous les utilisateurs</option>
										{users.map(user => (
											<option key={user.id} value={user.id}>{user.username}</option>
										))}
									</select>
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
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
								<select
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									value={filters.action}
									onChange={(e) => {
										setFilters({ ...filters, action: e.target.value });
										setCurrentPage(0);
									}}
								>
									<option value="">Toutes les actions</option>
									<option value="LOGIN">LOGIN</option>
									<option value="LOGOUT">LOGOUT</option>
									<option value="CREATE">CREATE</option>
									<option value="UPDATE">UPDATE</option>
									<option value="DELETE">DELETE</option>
									<option value="READ">READ</option>
									<option value="EXECUTE">EXECUTE</option>
									<option value="REFRESH_TOKEN">REFRESH_TOKEN</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Type de ressource</label>
								<Input
									value={filters.resourceType}
									onChange={(e) => {
										setFilters({ ...filters, resourceType: e.target.value });
										setCurrentPage(0);
									}}
									placeholder="User, Account, etc."
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
								<Input
									type="datetime-local"
									value={filters.fromDate}
									onChange={(e) => {
										setFilters({ ...filters, fromDate: e.target.value });
										setCurrentPage(0);
									}}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
								<Input
									type="datetime-local"
									value={filters.toDate}
									onChange={(e) => {
										setFilters({ ...filters, toDate: e.target.value });
										setCurrentPage(0);
									}}
								/>
							</div>
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
						</div>
					</div>

					{error && (
						<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
							{error}
						</div>
					)}

					{/* Tableau des événements */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
						<div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
							<div className="flex justify-between items-center">
								<h2 className="text-lg font-semibold text-gray-900">
									Événements d'audit ({totalElements.toLocaleString()})
								</h2>
								<div className="flex items-center gap-2">
									<label className="text-sm text-gray-700">Taille de page:</label>
									<select
										className="px-3 py-1 border border-gray-300 rounded-md text-sm"
										value={pageSize}
										onChange={(e) => {
											setPageSize(Number(e.target.value));
											setCurrentPage(0);
										}}
									>
										<option value="10">10</option>
										<option value="20">20</option>
										<option value="50">50</option>
										<option value="100">100</option>
									</select>
								</div>
							</div>
						</div>

						{loading ? (
							<div className="p-12 text-center">
								<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
								<p className="mt-4 text-gray-600">Chargement des événements...</p>
							</div>
						) : events.length === 0 ? (
							<div className="p-12 text-center">
								<p className="text-gray-500 text-lg font-medium">Aucun événement trouvé</p>
							</div>
						) : (
							<>
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
												<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Utilisateur</th>
												<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
												<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ressource</th>
												<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID Ressource</th>
												<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">IP</th>
												<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{events.map(event => (
												<tr key={event.id} className="hover:bg-gray-50 transition-colors">
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														{formatDate(event.createdAt)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														{event.user ? (
															<span className="font-medium text-gray-900">{event.user.username}</span>
														) : (
															<span className="text-gray-400">-</span>
														)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														{getActionBadge(event.action)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<Badge className="bg-gray-100 text-gray-800">{event.resourceType}</Badge>
													</td>
													<td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
														{event.resourceId ? (
															<button
																onClick={() => handleViewResourceTrace(event.resourceType, event.resourceId!)}
																className="text-blue-600 hover:text-blue-800 underline"
															>
																{event.resourceId}
															</button>
														) : (
															"-"
														)}
													</td>
													<td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-600">
														{event.ipAddress || "-"}
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<Button
															onClick={() => handleViewEventDetails(event.id)}
															variant="secondary"
															className="text-xs"
														>
															Détails
														</Button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>

								{/* Pagination */}
								{totalPages > 1 && (
									<div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
										<div className="flex items-center justify-between">
											<div className="text-sm text-gray-700">
												Affichage de <span className="font-medium">{(currentPage * pageSize) + 1}</span> à{" "}
												<span className="font-medium">{Math.min((currentPage + 1) * pageSize, totalElements)}</span> sur{" "}
												<span className="font-medium">{totalElements}</span> résultats
											</div>
											<div className="flex items-center gap-2">
												<Button
													variant="secondary"
													onClick={() => handlePageChange(0)}
													disabled={currentPage === 0}
													className="px-3 py-1 text-sm"
												>
													Premier
												</Button>
												<Button
													variant="secondary"
													onClick={() => handlePageChange(currentPage - 1)}
													disabled={currentPage === 0}
													className="px-3 py-1 text-sm"
												>
													Précédent
												</Button>
												<span className="px-4 py-1 text-sm text-gray-700">
													Page {currentPage + 1} sur {totalPages}
												</span>
												<Button
													variant="secondary"
													onClick={() => handlePageChange(currentPage + 1)}
													disabled={currentPage >= totalPages - 1}
													className="px-3 py-1 text-sm"
												>
													Suivant
												</Button>
												<Button
													variant="secondary"
													onClick={() => handlePageChange(totalPages - 1)}
													disabled={currentPage >= totalPages - 1}
													className="px-3 py-1 text-sm"
												>
													Dernier
												</Button>
											</div>
										</div>
									</div>
								)}
							</>
						)}
					</div>
				</>
			)}
		</div>
	);
}
