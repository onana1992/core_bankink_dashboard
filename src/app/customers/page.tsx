"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { customersApi } from "@/lib/api";
import type { Customer } from "@/types";

export default function CustomersPage() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [customers, setCustomers] = useState<Customer[]>([]);

	// Filtres
	const [q, setQ] = useState("");
	const [filterStatus, setFilterStatus] = useState<
		"ALL" | "DRAFT" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED" | "BLOCKED"
	>("ALL");
	const [filterType, setFilterType] = useState<"ALL" | "PERSON" | "BUSINESS">("ALL");

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const data = await customersApi.list();
			setCustomers(data);
		} catch (e: any) {
			setError(e?.message ?? t("customer.errors.unknown"));
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, []);

	const stats = useMemo(() => {
		const total = customers.length;
		const by: Record<string, number> = {};
		for (const c of customers) {
			by[c.status] = (by[c.status] ?? 0) + 1;
		}
		return {
			total,
			draft: by["DRAFT"] ?? 0,
			pending: by["PENDING_REVIEW"] ?? 0,
			verified: by["VERIFIED"] ?? 0,
			rejected: by["REJECTED"] ?? 0,
			blocked: by["BLOCKED"] ?? 0
		};
	}, [customers]);

	function statusBadgeVariant(status: Customer["status"]): "neutral" | "success" | "warning" | "danger" | "info" {
		switch (status) {
			case "VERIFIED":
				return "success";
			case "DRAFT":
				return "warning";
			case "REJECTED":
			case "BLOCKED":
				return "danger";
			case "PENDING_REVIEW":
			default:
				return "info";
		}
	}

	function riskBadgeVariant(score?: number | null): "neutral" | "success" | "warning" | "danger" {
		if (typeof score !== "number") return "neutral";
		if (score >= 70) return "danger";
		if (score >= 40) return "warning";
		return "success";
	}

	const filteredCustomers = useMemo(() => {
		const query = q.trim().toLowerCase();
		return customers.filter(c => {
			if (filterStatus !== "ALL" && c.status !== filterStatus) return false;
			if (filterType !== "ALL" && c.type !== filterType) return false;
			if (query) {
				const hay = `${c.displayName ?? ""} ${c.email ?? ""}`.toLowerCase();
				if (!hay.includes(query)) return false;
			}
			return true;
		});
	}, [customers, q, filterStatus, filterType]);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">{t("common.customers")}</h1>
				<div className="flex gap-2">
					<Button onClick={load} variant="outline">{t("common.refresh")}</Button>
					<Link href="/customers/new">
						<Button>+ {t("customer.new")}</Button>
					</Link>
				</div>
			</div>

			{error && <div className="text-sm text-red-600">{error}</div>}

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
				<div className="rounded-md border bg-gray-50 border-gray-200 p-4">
					<div className="text-xs text-gray-500">{t("customer.stats.total")}</div>
					<div className="mt-1 text-2xl font-semibold">{stats.total}</div>
				</div>
				<div className="rounded-md border bg-amber-50 border-amber-200 p-4">
					<div className="text-xs text-gray-500">{t("customer.stats.drafts")}</div>
					<div className="mt-1 text-2xl font-semibold">{stats.draft}</div>
				</div>
				<div className="rounded-md border bg-sky-50 border-sky-200 p-4">
					<div className="text-xs text-gray-500">{t("customer.stats.pending")}</div>
					<div className="mt-1 text-2xl font-semibold">{stats.pending}</div>
				</div>
				<div className="rounded-md border bg-emerald-50 border-emerald-200 p-4">
					<div className="text-xs text-gray-500">{t("customer.stats.verified")}</div>
					<div className="mt-1 text-2xl font-semibold">{stats.verified}</div>
				</div>
				<div className="rounded-md border bg-rose-50 border-rose-200 p-4">
					<div className="text-xs text-gray-500">{t("customer.stats.rejected")}</div>
					<div className="mt-1 text-2xl font-semibold">{stats.rejected}</div>
				</div>
				<div className="rounded-md border bg-slate-50 border-slate-200 p-4">
					<div className="text-xs text-gray-500">{t("customer.stats.blocked")}</div>
					<div className="mt-1 text-2xl font-semibold">{stats.blocked}</div>
				</div>
			</div>

			{/* Filtres - placés sous les cards */}
			<div className="rounded-md border bg-white p-4">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
					<div className="md:col-span-2">
						<label className="block text-sm mb-1 text-gray-600">{t("customer.filters.search")}</label>
						<Input
							placeholder={t("customer.filters.searchPlaceholder")}
							value={q}
							onChange={e => setQ(e.target.value)}
						/>
					</div>
					<div>
						<label className="block text-sm mb-1 text-gray-600">{t("customer.filters.status")}</label>
						<select
							className="w-full rounded-md border bg-white px-3 py-2 text-sm"
							value={filterStatus}
							onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
						>
							<option value="ALL">{t("common.all")}</option>
							<option value="DRAFT">{t("customer.statuses.DRAFT")}</option>
							<option value="PENDING_REVIEW">{t("customer.statuses.PENDING_REVIEW")}</option>
							<option value="VERIFIED">{t("customer.statuses.VERIFIED")}</option>
							<option value="REJECTED">{t("customer.statuses.REJECTED")}</option>
							<option value="BLOCKED">{t("customer.statuses.BLOCKED")}</option>
						</select>
					</div>
					<div>
						<label className="block text-sm mb-1 text-gray-600">{t("customer.filters.type")}</label>
						<select
							className="w-full rounded-md border bg-white px-3 py-2 text-sm"
							value={filterType}
							onChange={e => setFilterType(e.target.value as typeof filterType)}
						>
							<option value="ALL">{t("common.all")}</option>
							<option value="PERSON">{t("customer.types.PERSON")}</option>
							<option value="BUSINESS">{t("customer.types.BUSINESS")}</option>
						</select>
					</div>
				</div>
				<div className="mt-3 flex gap-2">
					<Button variant="outline" onClick={() => { setQ(""); setFilterStatus("ALL"); setFilterType("ALL"); }}>
						{t("common.reset")}
					</Button>
				</div>
			</div>

			<div className="overflow-x-auto rounded-md border bg-white">
				<table className="min-w-full text-sm">
					<thead className="bg-gray-50">
						<tr className="text-left">
							<th className="px-4 py-2">{t("common.id")}</th>
							<th className="px-4 py-2">{t("common.name")}</th>
							<th className="px-4 py-2">{t("common.type")}</th>
							<th className="px-4 py-2">{t("common.status")}</th>
							<th className="px-4 py-2">{t("common.email")}</th>
							<th className="px-4 py-2">{t("common.risk")}</th>
							<th className="px-4 py-2"></th>
						</tr>
					</thead>
					<tbody>
						{loading && (
							<tr>
								<td className="px-4 py-3" colSpan={7}>{t("common.loading")}</td>
							</tr>
						)}
						{!loading && filteredCustomers.length === 0 && (
							<tr>
								<td className="px-4 py-6 text-gray-500" colSpan={7}>
									{t("customer.table.noCustomers")}
								</td>
							</tr>
						)}
						{filteredCustomers.map(c => (
							<tr key={c.id} className="border-t">
								<td className="px-4 py-3">{c.id}</td>
								<td className="px-4 py-3">{c.displayName}</td>
								<td className="px-4 py-3">{t(`customer.types.${c.type}`)}</td>
								<td className="px-4 py-3">
									<Badge variant={statusBadgeVariant(c.status)}>{t(`customer.statuses.${c.status}`)}</Badge>
								</td>
								<td className="px-4 py-3">{c.email ?? "-"}</td>
								<td className="px-4 py-3">
									{typeof c.riskScore === "number" ? (
										<Badge variant={riskBadgeVariant(c.riskScore)}>{c.riskScore}</Badge>
									) : (
										"-"
									)}
								</td>
								<td className="px-4 py-3">
									<Link href={`/customers/${c.id}`}>
										<Button size="sm" variant="ghost">{t("customer.table.view")}</Button>
									</Link>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
