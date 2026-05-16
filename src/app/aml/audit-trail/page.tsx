"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { auditApi } from "@/lib/api";
import { resolveApiExceptionMessage } from "@/lib/resolveApiException";
import type { AuditEvent } from "@/types";
import Input from "@/components/ui/Input";
import { AuditEventsTable } from "@/components/audit/AuditEventsTable";
import { OpsInlineAlert, OpsPageHeader, OPS_PAGE_STACK } from "@/components/ops";

export default function AmlAuditTrailPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [events, setEvents] = useState<AuditEvent[]>([]);
	const [currentPage, setCurrentPage] = useState(0);
	const [pageSize, setPageSize] = useState(20);
	const [totalPages, setTotalPages] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const [filters, setFilters] = useState({ userId: "", fromDate: "", toDate: "" });

	const userIdParam =
		filters.userId.trim() !== "" &&
		Number.isFinite(Number(filters.userId)) &&
		Number(filters.userId) > 0
			? Number(filters.userId)
			: undefined;

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			setLoading(true);
			setError(null);
			try {
				const data = await auditApi.getAmlAuditEvents({
					userId: userIdParam,
					fromDate: filters.fromDate ? new Date(filters.fromDate).toISOString() : undefined,
					toDate: filters.toDate ? new Date(filters.toDate).toISOString() : undefined,
					page: currentPage,
					size: pageSize
				});
				if (!cancelled) {
					setEvents(data.content ?? []);
					setTotalPages(data.totalPages ?? 0);
					setTotalElements(data.totalElements ?? 0);
				}
			} catch (e: unknown) {
				if (!cancelled) {
					setError(resolveApiExceptionMessage(e, t));
					setEvents([]);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- `t` only affects error copy; avoid refetch on i18n instance churn
	}, [currentPage, pageSize, userIdParam, filters.fromDate, filters.toDate]);

	return (
		<div className={OPS_PAGE_STACK}>
			<OpsPageHeader
				title={t("amlAuditTrailPage.title")}
				description={t("amlAuditTrailPage.subtitle")}
				actions={
					<Link
						href="/audit"
						className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-ops-border bg-ops-surface px-3 text-sm font-medium text-ops-fg transition hover:bg-ops-surface-muted"
					>
						{t("amlAuditTrailPage.linkGlobalAudit")}
					</Link>
				}
			/>

			{error ? (
				<OpsInlineAlert variant="error">
					<span className="text-sm">{error}</span>
				</OpsInlineAlert>
			) : null}

			<div className="flex flex-col gap-3 rounded-ops-xl border border-ops-border bg-ops-surface p-4 sm:flex-row sm:flex-wrap sm:items-end">
				<div className="min-w-[8rem] flex-1">
					<label className="mb-1 block text-xs font-medium text-ops-fg-muted">{t("amlAuditTrailPage.userIdPlaceholder")}</label>
					<Input
						type="number"
						min={1}
						value={filters.userId}
						onChange={(e) => {
							setFilters((f) => ({ ...f, userId: e.target.value }));
							setCurrentPage(0);
						}}
						placeholder="—"
						className="w-full"
					/>
				</div>
				<div className="min-w-[10rem] flex-1">
					<label className="mb-1 block text-xs font-medium text-ops-fg-muted">{t("amlAuditTrailPage.fromDate")}</label>
					<Input
						type="datetime-local"
						value={filters.fromDate}
						onChange={(e) => {
							setFilters((f) => ({ ...f, fromDate: e.target.value }));
							setCurrentPage(0);
						}}
						className="w-full"
					/>
				</div>
				<div className="min-w-[10rem] flex-1">
					<label className="mb-1 block text-xs font-medium text-ops-fg-muted">{t("amlAuditTrailPage.toDate")}</label>
					<Input
						type="datetime-local"
						value={filters.toDate}
						onChange={(e) => {
							setFilters((f) => ({ ...f, toDate: e.target.value }));
							setCurrentPage(0);
						}}
						className="w-full"
					/>
				</div>
			</div>

			<AuditEventsTable
				events={events}
				loading={loading}
				totalPages={totalPages}
				totalElements={totalElements}
				currentPage={currentPage}
				pageSize={pageSize}
				resultsHeading={t("amlAuditTrailPage.resultsHeading")}
				onPageChange={(p) => {
					setCurrentPage(p);
					window.scrollTo({ top: 0, behavior: "smooth" });
				}}
				onPageSizeChange={(s) => {
					setPageSize(s);
					setCurrentPage(0);
				}}
				onEventDetails={(id) => router.push(`/audit/${id}`)}
				onResourceTrace={(resourceType, resourceId) => {
					router.push(`/audit?resourceType=${encodeURIComponent(resourceType)}&resourceId=${resourceId}`);
				}}
			/>
		</div>
	);
}
