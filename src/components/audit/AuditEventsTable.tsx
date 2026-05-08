"use client";

import Link from "next/link";
import type { AuditEvent } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import TablePagination from "@/components/ui/TablePagination";
import { formatAuditEventDate, getAuditActionBadge } from "@/components/audit/AuditEventDetails";

type AuditEventsTableProps = {
	events: AuditEvent[];
	loading: boolean;
	totalPages: number;
	totalElements: number;
	currentPage: number;
	pageSize: number;
	resultsHeading: string;
	onPageChange: (page: number) => void;
	onPageSizeChange: (size: number) => void;
	onEventDetails: (eventId: number) => void;
	onResourceTrace: (resourceType: string, resourceId: number) => void;
	/** Si true, colonne utilisateur avec lien vers /audit/user/:id */
	showUserColumn?: boolean;
};

export function AuditEventsTable({
	events,
	loading,
	totalPages,
	totalElements,
	currentPage,
	pageSize,
	resultsHeading,
	onPageChange,
	onPageSizeChange,
	onEventDetails,
	onResourceTrace,
	showUserColumn = true
}: AuditEventsTableProps) {
	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
			<div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
				<h2 className="text-lg font-semibold text-gray-900">{resultsHeading}</h2>
			</div>

			{loading ? (
				<div className="p-12 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">Chargement des événements…</p>
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
									{showUserColumn && (
										<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
											Utilisateur
										</th>
									)}
									<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
									<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ressource</th>
									<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID Ressource</th>
									<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">IP</th>
									<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 text-sm">
								{events.map(event => (
									<tr key={event.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatAuditEventDate(event.createdAt)}</td>
										{showUserColumn && (
											<td className="px-6 py-4 whitespace-nowrap">
												{event.user ? (
													<Link
														href={`/audit/user/${event.user.id}`}
														className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
													>
														{event.user.username}
													</Link>
												) : (
													<span className="text-gray-400">-</span>
												)}
											</td>
										)}
										<td className="px-6 py-4 whitespace-nowrap">{getAuditActionBadge(event.action)}</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Badge className="bg-gray-100 text-gray-800">{event.resourceType}</Badge>
										</td>
										<td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
											{event.resourceId ? (
												<button
													type="button"
													onClick={() => onResourceTrace(event.resourceType, event.resourceId!)}
													className="text-blue-600 hover:text-blue-800 underline"
												>
													{event.resourceId}
												</button>
											) : (
												"-"
											)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-600">{event.ipAddress || "-"}</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<Button onClick={() => onEventDetails(event.id)} variant="secondary" className="text-xs">
												Détails
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<TablePagination
						page={currentPage}
						totalPages={totalPages}
						totalElements={totalElements ?? 0}
						pageSize={pageSize}
						onPageChange={onPageChange}
						resultsLabel="événements"
						showFirstLast
						sizeOptions={[10, 20, 50, 100]}
						size={pageSize}
						onSizeChange={(s) => {
							onPageSizeChange(s);
						}}
					/>
				</>
			)}
		</div>
	);
}
