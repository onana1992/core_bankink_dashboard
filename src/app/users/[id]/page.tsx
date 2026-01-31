"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
	ArrowLeft,
	User,
	Info,
	Pencil,
	X,
	Check,
	AlertCircle,
	Loader2,
	FileQuestion,
	KeyRound,
	Mail,
	Calendar,
	LogIn
} from "lucide-react";
import { usersApi, rolesApi } from "@/lib/api";
import type { User as UserType, Role, UserStatus } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

export default function UserDetailPage() {
	const { t } = useTranslation();
	const params = useParams();
	const userId = Number(params.id);
	const [user, setUser] = useState<UserType | null>(null);
	const [roles, setRoles] = useState<Role[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState<Partial<UserType>>({});

	useEffect(() => {
		if (userId) {
			load();
			loadRoles();
		}
	}, [userId]);

	async function load() {
		setLoading(true);
		setError(null);
		try {
			const data = await usersApi.get(userId);
			setUser(data);
			setForm({
				email: data.email,
				firstName: data.firstName,
				lastName: data.lastName,
				status: data.status
			});
		} catch (e: any) {
			setError(e?.message ?? t("user.detail.errors.loadError"));
		} finally {
			setLoading(false);
		}
	}

	async function loadRoles() {
		try {
			const data = await rolesApi.list();
			setRoles(data);
		} catch (e: any) {
			console.error("Erreur lors du chargement des rôles:", e);
		}
	}

	async function handleUpdate() {
		if (!user) return;
		setLoading(true);
		setError(null);
		try {
			await usersApi.update(userId, {
				email: form.email,
				firstName: form.firstName || null,
				lastName: form.lastName || null,
				status: form.status
			});
			setEditing(false);
			await load();
		} catch (e: any) {
			setError(e?.message ?? t("user.detail.errors.updateError"));
		} finally {
			setLoading(false);
		}
	}

	async function handleAssignRole(roleId: number) {
		if (!user) return;
		setLoading(true);
		setError(null);
		try {
			await usersApi.assignRole(userId, { roleId });
			await load();
		} catch (e: any) {
			setError(e?.message ?? t("user.detail.errors.assignError"));
		} finally {
			setLoading(false);
		}
	}

	async function handleRevokeRole(roleId: number) {
		if (!user) return;
		setLoading(true);
		setError(null);
		try {
			await usersApi.revokeRole(userId, roleId);
			await load();
		} catch (e: any) {
			setError(e?.message ?? t("user.detail.errors.revokeError"));
		} finally {
			setLoading(false);
		}
	}

	function getStatusBadge(status: UserStatus) {
		const variant: Record<UserStatus, "success" | "neutral" | "danger" | "warning"> = {
			ACTIVE: "success",
			INACTIVE: "neutral",
			LOCKED: "danger",
			EXPIRED: "warning"
		};
		return <Badge variant={variant[status]}>{t(`user.statuses.${status}`)}</Badge>;
	}

	function formatDate(value: string | null | undefined) {
		if (!value) return null;
		try {
			const d = new Date(value);
			return d.toLocaleDateString(undefined, {
				dateStyle: "medium",
				timeStyle: "short"
			});
		} catch {
			return value;
		}
	}

	if (loading && !user) {
		return (
			<div className="flex items-center justify-center min-h-[50vh]">
				<div className="text-center">
					<Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
					<p className="mt-4 text-gray-600 font-medium">{t("common.loading")}</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="space-y-6">
				<div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center max-w-md mx-auto">
					<div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
						<FileQuestion className="w-8 h-8 text-gray-400" />
					</div>
					<p className="text-gray-700 text-lg font-semibold">{t("user.detail.notFound")}</p>
					<p className="text-gray-500 text-sm mt-1">{t("user.detail.notFoundHint")}</p>
					<Link href="/users" className="mt-6 inline-flex">
						<Button variant="outline" className="gap-2">
							<ArrowLeft className="w-4 h-4" />
							{t("user.detail.backToList")}
						</Button>
					</Link>
				</div>
			</div>
		);
	}

	const displayName =
		[user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
	const availableRoles = roles.filter((r) => !user.roles?.some((ur) => ur.id === r.id));

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent px-6 py-5 sm:px-8 sm:py-6">
					<Link
						href="/users"
						className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-4"
					>
						<ArrowLeft className="w-4 h-4" />
						{t("user.detail.backToList")}
					</Link>
					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
						<div className="flex items-start gap-4">
							<div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
								<User className="w-7 h-7 text-indigo-600" />
							</div>
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
									{user.username}
								</h1>
								<p className="text-gray-500 mt-1">{t("user.detail.title")}</p>
								{(displayName !== user.username || user.id) && (
									<div className="flex flex-wrap items-center gap-2 mt-2">
										{displayName !== user.username && (
											<span className="text-sm text-gray-600">{displayName}</span>
										)}
										{user.id && (
											<span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
												ID {user.id}
											</span>
										)}
									</div>
								)}
							</div>
						</div>
						<div className="flex gap-2 shrink-0">
							{editing ? (
								<>
									<Button
										variant="outline"
										onClick={() => {
											setEditing(false);
											load();
										}}
										className="gap-2"
									>
										<X className="w-4 h-4" />
										{t("user.detail.cancel")}
									</Button>
									<Button onClick={handleUpdate} disabled={loading} className="gap-2">
										{loading ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<Check className="w-4 h-4" />
										)}
										{t("user.detail.save")}
									</Button>
								</>
							) : (
								<Button variant="outline" onClick={() => setEditing(true)} className="gap-2">
									<Pencil className="w-4 h-4" />
									{t("user.detail.edit")}
								</Button>
							)}
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

			{/* Contenu */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Informations */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="bg-gradient-to-r from-indigo-50 to-transparent border-b border-indigo-100/60 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
								<Info className="w-5 h-5 text-indigo-600" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-gray-900">
									{t("user.detail.information")}
								</h2>
								<p className="text-xs text-gray-500 mt-0.5">Profil et identité</p>
							</div>
						</div>
					</div>
					<div className="p-5 space-y-3">
						<div className="rounded-xl bg-gray-50/80 p-4 border border-gray-100">
							<label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1.5">
								{t("user.detail.username")}
							</label>
							<p className="font-semibold text-gray-900">{user.username}</p>
						</div>
						<div className="rounded-xl bg-gray-50/80 p-4 border border-gray-100">
							<label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1.5">
								{t("user.detail.email")}
							</label>
							{editing ? (
								<Input
									type="email"
									value={form.email || ""}
									onChange={(e) => setForm({ ...form, email: e.target.value })}
									className="bg-white"
								/>
							) : (
								<p className="text-gray-800 flex items-center gap-2 font-medium">
									<Mail className="w-4 h-4 text-indigo-500 shrink-0" />
									{user.email || "—"}
								</p>
							)}
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div className="rounded-xl bg-gray-50/80 p-4 border border-gray-100">
								<label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1.5">
									{t("user.detail.firstName")}
								</label>
								{editing ? (
									<Input
										value={form.firstName || ""}
										onChange={(e) => setForm({ ...form, firstName: e.target.value })}
										className="bg-white"
									/>
								) : (
									<p className="font-medium text-gray-900">{user.firstName || "—"}</p>
								)}
							</div>
							<div className="rounded-xl bg-gray-50/80 p-4 border border-gray-100">
								<label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1.5">
									{t("user.detail.lastName")}
								</label>
								{editing ? (
									<Input
										value={form.lastName || ""}
										onChange={(e) => setForm({ ...form, lastName: e.target.value })}
										className="bg-white"
									/>
								) : (
									<p className="font-medium text-gray-900">{user.lastName || "—"}</p>
								)}
							</div>
						</div>
						<div className="rounded-xl bg-gray-50/80 p-4 border border-gray-100">
							<label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1.5">
								{t("user.detail.status")}
							</label>
							{editing ? (
								<select
									className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
									value={form.status}
									onChange={(e) =>
										setForm({ ...form, status: e.target.value as UserStatus })
									}
								>
									<option value="ACTIVE">{t("user.statuses.ACTIVE")}</option>
									<option value="INACTIVE">{t("user.statuses.INACTIVE")}</option>
									<option value="LOCKED">{t("user.statuses.LOCKED")}</option>
									<option value="EXPIRED">{t("user.statuses.EXPIRED")}</option>
								</select>
							) : (
								getStatusBadge(user.status)
							)}
						</div>
						{(user.lastLoginAt !== undefined || user.createdAt) && (
							<div className="rounded-xl bg-indigo-50/50 p-4 border border-indigo-100/60 space-y-3 pt-4 mt-1">
								{user.lastLoginAt !== undefined && (
									<div className="flex items-center gap-3 text-sm">
										<div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-indigo-100">
											<LogIn className="w-4 h-4 text-indigo-500" />
										</div>
										<div>
											<span className="block text-xs font-medium text-gray-500">{t("user.detail.lastLogin")}</span>
											<span className="font-medium text-gray-800">{formatDate(user.lastLoginAt) ?? t("user.detail.never")}</span>
										</div>
									</div>
								)}
								{user.createdAt && (
									<div className="flex items-center gap-3 text-sm">
										<div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-indigo-100">
											<Calendar className="w-4 h-4 text-indigo-500" />
										</div>
										<div>
											<span className="block text-xs font-medium text-gray-500">{t("user.detail.createdAt")}</span>
											<span className="font-medium text-gray-800">{formatDate(user.createdAt) ?? "—"}</span>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Rôles */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="bg-gradient-to-r from-indigo-50 to-transparent border-b border-indigo-100/60 px-6 py-4">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
								<KeyRound className="w-5 h-5 text-indigo-600" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-gray-900">
									{t("user.detail.roles")}
								</h2>
								<p className="text-xs text-gray-500 mt-0.5">
									{user.roles && user.roles.length > 0
										? `${user.roles.length} ${user.roles.length === 1 ? "rôle assigné" : "rôles assignés"}`
										: "Rôles et accès"}
								</p>
							</div>
							{user.roles && user.roles.length > 0 && (
								<Badge variant="info" className="ml-auto">
									{user.roles.length}
								</Badge>
							)}
						</div>
					</div>
					<div className="p-5 space-y-4">
						{/* Rôles assignés */}
						<div className="rounded-xl bg-gray-50/80 p-4 border border-gray-100">
							<h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
								{t("user.detail.assignedRoles")}
							</h3>
							{user.roles && user.roles.length > 0 ? (
								<div className="flex flex-wrap gap-2">
									{user.roles.map((role) => (
										<div
											key={role.id}
											className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-800 rounded-xl pl-3 pr-2 py-2 border border-indigo-100"
										>
											<KeyRound className="w-4 h-4 text-indigo-600 shrink-0" />
											<span className="text-sm font-medium">{role.name}</span>
											<button
												type="button"
												onClick={() => handleRevokeRole(role.id)}
												disabled={loading}
												className="p-1.5 rounded-lg hover:bg-indigo-200/80 text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
												title={t("user.detail.revoke")}
											>
												<X className="w-4 h-4" />
											</button>
										</div>
									))}
								</div>
							) : (
								<div className="rounded-lg border border-dashed border-gray-200 bg-white/50 py-8 text-center">
									<KeyRound className="w-10 h-10 text-gray-300 mx-auto mb-2" />
									<p className="text-gray-500 text-sm font-medium">
										{t("user.detail.noRolesAssigned")}
									</p>
									<p className="text-gray-400 text-xs mt-1">{t("user.detail.assignRole")} ci-dessous</p>
								</div>
							)}
						</div>

						{/* Assigner un rôle */}
						<div className="rounded-xl bg-indigo-50/50 p-4 border border-indigo-100/60">
							<h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
								{t("user.detail.assignRole")}
							</h3>
							{availableRoles.length > 0 ? (
								<select
									className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
									value=""
									onChange={(e) => {
										const v = e.target.value;
										if (v) {
											handleAssignRole(Number(v));
											e.target.value = "";
										}
									}}
									disabled={loading}
								>
									<option value="">{t("user.detail.selectRole")}</option>
									{availableRoles.map((role) => (
										<option key={role.id} value={role.id}>
											{role.name}
										</option>
									))}
								</select>
							) : (
								<div className="rounded-lg border border-indigo-100 bg-white/80 py-4 text-center">
									<Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
									<p className="text-gray-700 text-sm font-medium">
										{t("user.detail.allRolesAssigned")}
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
