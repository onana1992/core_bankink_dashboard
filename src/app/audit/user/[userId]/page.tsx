"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { auditApi, usersApi } from "@/lib/api";
import type { AuditEvent, User } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { AuditEventsTable } from "@/components/audit/AuditEventsTable";

export default function AuditUserActivityPage() {
	const params = useParams<{ userId: string }>();
	const router = useRouter();
	const rawId = params?.userId;
	const userId = typeof rawId === "string" ? Number(rawId) : Number.NaN;

	const [user, setUser] = useState<User | null>(null);
	const [events, setEvents] = useState<AuditEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(0);
	const [pageSize, setPageSize] = useState(20);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");

	useEffect(() => {
		if (rawId === undefined) return;
		if (Number.isNaN(userId) || userId <= 0) {
			setLoading(false);
			setError("Identifiant utilisateur invalide");
			return;
		}

		let cancelled = false;
		(async () => {
			try {
				const u = await usersApi.get(userId);
				if (!cancelled) setUser(u);
			} catch {
				if (!cancelled) setUser(null);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [rawId, userId]);

	useEffect(() => {
		if (rawId === undefined) return;
		if (Number.isNaN(userId) || userId <= 0) return;

		let cancelled = false;
		(async () => {
			setLoading(true);
			setError(null);
			try {
				const data = await auditApi.getEvents({
					userId,
					fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
					toDate: toDate ? new Date(toDate).toISOString() : undefined,
					page: currentPage,
					size: pageSize
				});
				if (!cancelled) {
					setEvents(data.content ?? []);
					setTotalPages(data.totalPages ?? 0);
					setTotalElements(data.totalElements ?? 0);
				}
			} catch (e: unknown) {
				const msg = e instanceof Error ? e.message : "Erreur lors du chargement des événements";
				if (!cancelled) {
					setError(msg);
					setEvents([]);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [rawId, userId, currentPage, pageSize, fromDate, toDate]);

	async function handleExport() {
		if (Number.isNaN(userId) || userId <= 0) return;
		try {
			setLoading(true);
			const blob = await auditApi.exportEvents({
				userId,
				fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
				toDate: toDate ? new Date(toDate).toISOString() : undefined
			});
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `audit_user_${userId}_${new Date().toISOString().split("T")[0]}.csv`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Erreur lors de l'export");
		} finally {
			setLoading(false);
		}
	}

	function handleResourceTrace(resourceType: string, resourceId: number) {
		router.push(`/audit?resourceType=${encodeURIComponent(resourceType)}&resourceId=${resourceId}`);
	}

	if (rawId !== undefined && (Number.isNaN(userId) || userId <= 0)) {
		return (
			<div className="space-y-4">
				<p className="text-red-600">Identifiant utilisateur invalide.</p>
				<Link href="/audit" className="text-blue-600 hover:underline">
					← Retour à l&apos;audit
				</Link>
			</div>
		);
	}

	const displayName = user?.username ?? `Utilisateur #${userId}`;

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
				<div>
					<Link href="/audit" className="text-sm text-blue-600 hover:text-blue-800 hover:underline mb-2 inline-block">
						← Retour à l&apos;audit
					</Link>
					<h1 className="text-3xl font-bold text-gray-900">Activité d&apos;audit — {displayName}</h1>
					<p className="text-gray-600 mt-1">
						Tous les événements d&apos;audit enregistrés pour cet utilisateur (API&nbsp;
						<code className="text-xs bg-gray-100 px-1 rounded">GET /api/ops/audit/events?userId=…</code>
						, pagination serveur).
					</p>
					<p className="text-sm text-gray-500 mt-1">ID&nbsp;: {userId}</p>
				</div>
				<Button onClick={handleExport} variant="secondary" disabled={loading} className="shrink-0">
					Exporter CSV (cet utilisateur)
				</Button>
			</div>

			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
				<h2 className="text-lg font-semibold text-gray-900 mb-4">Période (optionnel)</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:items-end">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
						<Input
							type="datetime-local"
							value={fromDate}
							onChange={(e) => {
								setFromDate(e.target.value);
								setCurrentPage(0);
							}}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
						<Input
							type="datetime-local"
							value={toDate}
							onChange={(e) => {
								setToDate(e.target.value);
								setCurrentPage(0);
							}}
						/>
					</div>
					<div>
						<Button
							type="button"
							variant="secondary"
							className="w-full md:w-auto"
							onClick={() => {
								setFromDate("");
								setToDate("");
								setCurrentPage(0);
							}}
						>
							Effacer les dates
						</Button>
					</div>
				</div>
			</div>

			{error && <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{error}</div>}

			<AuditEventsTable
				events={events}
				loading={loading}
				totalPages={totalPages}
				totalElements={totalElements}
				currentPage={currentPage}
				pageSize={pageSize}
				resultsHeading={`Événements (${(totalElements ?? 0).toLocaleString()} au total)`}
				onPageChange={(p) => {
					setCurrentPage(p);
					window.scrollTo({ top: 0, behavior: "smooth" });
				}}
				onPageSizeChange={(s) => {
					setPageSize(s);
					setCurrentPage(0);
				}}
				onEventDetails={(eventId) => router.push(`/audit/${eventId}`)}
				onResourceTrace={handleResourceTrace}
				showUserColumn={false}
			/>
		</div>
	);
}
