"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { AuditEvent } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import TablePagination, { OPS_TABLE_PAGE_SIZE_OPTIONS } from "@/components/ui/TablePagination";
import { formatAuditEventDate, getAuditActionBadge } from "@/components/audit/AuditEventDetails";
import {
	OpsEmptyState,
	OpsLoadingState,
	OpsTableCard,
	OPS_TD,
	OPS_TH,
	OPS_THEAD,
	OPS_TABLE,
	OPS_TABLE_WRAP,
	OPS_TR_HOVER
} from "@/components/ops";

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
	const { t } = useTranslation();

	const declaredTotal = Number(totalElements) || 0;
	const safeSize = Math.max(1, Number(pageSize) || 1);
	/** Tolère un total API à 0 alors que la page affiche encore des lignes. */
	const effectiveTotalElements = Math.max(declaredTotal, events.length);
	const apiPages = Math.max(0, Number(totalPages) || 0);
	const effectiveTotalPages =
		effectiveTotalElements > 0
			? Math.max(1, Math.ceil(effectiveTotalElements / safeSize))
			: apiPages;

	return (
		<OpsTableCard title={resultsHeading} className="overflow-visible">
			{loading ? (
				<OpsLoadingState embedded message={t("common.auditTableLoading")} />
			) : events.length === 0 ? (
				<OpsEmptyState embedded title={t("common.auditTableEmpty")} />
			) : (
				<>
					<div className={OPS_TABLE_WRAP}>
						<table className={OPS_TABLE}>
							<thead className={OPS_THEAD}>
								<tr>
									<th className={OPS_TH}>Date</th>
									{showUserColumn ? <th className={OPS_TH}>Utilisateur</th> : null}
									<th className={OPS_TH}>Action</th>
									<th className={OPS_TH}>Ressource</th>
									<th className={OPS_TH}>ID Ressource</th>
									<th className={OPS_TH}>IP</th>
									<th className={OPS_TH}>Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-ops-border bg-ops-surface text-sm">
								{events.map((event) => (
									<tr key={event.id} className={OPS_TR_HOVER}>
										<td className={`${OPS_TD} whitespace-nowrap`}>{formatAuditEventDate(event.createdAt)}</td>
										{showUserColumn && (
											<td className={OPS_TD}>
												{event.user ? (
													<Link
														href={`/audit/user/${event.user.id}`}
														className="font-medium text-ops-ring hover:underline"
													>
														{event.user.username}
													</Link>
												) : (
													<span className="text-ops-fg-muted">-</span>
												)}
											</td>
										)}
										<td className={OPS_TD}>{getAuditActionBadge(event.action)}</td>
										<td className={OPS_TD}>
											<Badge className="bg-ops-surface-muted text-ops-fg">{event.resourceType}</Badge>
										</td>
										<td className={`${OPS_TD} font-mono`}>
											{event.resourceId ? (
												<button
													type="button"
													onClick={() => onResourceTrace(event.resourceType, event.resourceId!)}
													className="text-ops-ring hover:underline"
												>
													{event.resourceId}
												</button>
											) : (
												"-"
											)}
										</td>
										<td className={`${OPS_TD} font-mono text-ops-fg-muted`}>{event.ipAddress || "-"}</td>
										<td className={OPS_TD}>
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
						totalPages={effectiveTotalPages}
						totalElements={effectiveTotalElements}
						pageSize={pageSize}
						onPageChange={onPageChange}
						resultsLabel="événements"
						showFirstLast
						sizeOptions={OPS_TABLE_PAGE_SIZE_OPTIONS}
						size={pageSize}
						onSizeChange={(s) => {
							onPageSizeChange(s);
						}}
					/>
				</>
			)}
		</OpsTableCard>
	);
}
