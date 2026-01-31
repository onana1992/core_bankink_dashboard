"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { KeyRound, ShieldCheck, RefreshCw, Plus, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import { rolesApi } from "@/lib/api";
import type { Role } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function RolesPage() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [roles, setRoles] = useState<Role[]>([]);

	useEffect(() => {
		load();
	}, []);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const data = await rolesApi.list();
			setRoles(data);
		} catch (e: any) {
			setError(e?.message ?? t("role.errors.loadError"));
		} finally {
			setLoading(false);
		}
	}

	const roleList = Array.isArray(roles) ? roles : [];

	const stats = useMemo(() => {
		const totalPermissions = roleList.reduce((acc, role) => acc + (role.permissions?.length || 0), 0);
		return {
			total: roleList.length,
			totalPermissions
		};
	}, [roles]);

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
						{t("sidebar.roles")}
					</h1>
					<p className="text-gray-500 mt-1">{t("role.description")}</p>
				</div>
				<div className="flex gap-3">
					<Button onClick={load} variant="outline" className="gap-2" disabled={loading}>
						<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
						{t("common.refresh")}
					</Button>
					<Link href="/roles/new">
						<Button className="gap-2">
							<Plus className="w-5 h-5" />
							{t("role.new.title")}
						</Button>
					</Link>
				</div>
			</div>

			{/* Statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 overflow-hidden">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-500">{t("role.stats.total")}</p>
							<p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
						</div>
						<div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center">
							<KeyRound className="w-7 h-7 text-indigo-600" />
						</div>
					</div>
				</div>
				<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 overflow-hidden">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-500">{t("role.stats.totalPermissions")}</p>
							<p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalPermissions}</p>
						</div>
						<div className="w-14 h-14 rounded-xl bg-teal-100 flex items-center justify-center">
							<ShieldCheck className="w-7 h-7 text-teal-600" />
						</div>
					</div>
				</div>
			</div>

			{/* Erreur */}
			{error && (
				<div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
					<AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
					<span className="font-medium">{error}</span>
				</div>
			)}

			{/* Liste */}
			{loading ? (
				<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
					<Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
					<p className="mt-4 text-gray-600 font-medium">{t("common.loading")}</p>
				</div>
			) : roleList.length === 0 ? (
				<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center max-w-md mx-auto">
					<div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
						<KeyRound className="w-8 h-8 text-gray-400" />
					</div>
					<p className="text-gray-700 text-lg font-semibold">{t("role.table.noRoles")}</p>
					<p className="text-gray-500 text-sm mt-1">{t("role.table.noRolesHint")}</p>
					<Link href="/roles/new" className="mt-6 inline-flex">
						<Button className="gap-2">
							<Plus className="w-4 h-4" />
							{t("role.new.title")}
						</Button>
					</Link>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{roleList.map((role) => (
						<Link key={role.id} href={`/roles/${role.id}`} className="group block h-full">
							<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col hover:shadow-md hover:border-indigo-200/60 transition-all duration-200">
								{/* En-tête de la carte */}
								<div className="bg-gradient-to-r from-indigo-50/80 to-transparent px-5 pt-5 pb-3">
									<div className="flex items-start gap-3">
										<div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-200/80 transition-colors">
											<KeyRound className="w-5 h-5 text-indigo-600" />
										</div>
										<div className="min-w-0 flex-1">
											<h3 className="text-lg font-semibold text-gray-900 truncate">
												{role.name}
											</h3>
											{role.permissions && role.permissions.length > 0 && (
												<Badge variant="info" className="mt-1.5 text-xs">
													{role.permissions.length} {t("role.table.permissions").toLowerCase()}
												</Badge>
											)}
										</div>
										<ChevronRight className="w-5 h-5 text-gray-400 shrink-0 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
									</div>
								</div>
								{/* Corps */}
								<div className="p-5 pt-2 flex flex-col flex-1">
									{role.description ? (
										<p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
											{role.description}
										</p>
									) : (
										<p className="text-gray-400 text-sm italic mb-4 flex-1">
											{t("role.detail.noDescription")}
										</p>
									)}
									<div className="flex flex-wrap gap-1.5">
										{role.permissions && role.permissions.length > 0 ? (
											role.permissions.slice(0, 4).map((permission) => (
												<Badge
													key={permission.id}
													variant="success"
													className="text-xs font-medium"
												>
													{permission.name}
												</Badge>
											))
										) : null}
										{role.permissions && role.permissions.length > 4 && (
											<Badge variant="neutral" className="text-xs">
												+{role.permissions.length - 4}
											</Badge>
										)}
									</div>
									{role.permissions && role.permissions.length === 0 && (
										<span className="text-gray-400 text-sm">{t("role.table.noPermissions")}</span>
									)}
								</div>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
