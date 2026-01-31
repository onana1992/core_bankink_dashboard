"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { usersApi, rolesApi } from "@/lib/api";
import type { CreateUserRequest, Role, UserStatus } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

export default function NewUserPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [form, setForm] = useState<CreateUserRequest>({
		username: "",
		email: "",
		password: "",
		firstName: "",
		lastName: "",
		status: "ACTIVE",
		roleIds: []
	});
	const [roles, setRoles] = useState<Role[]>([]);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadRoles();
	}, []);

	async function loadRoles() {
		setLoading(true);
		try {
			const data = await rolesApi.list();
			setRoles(data);
		} catch (e: any) {
			setError(e?.message ?? t("user.new.errors.loadRolesError"));
		} finally {
			setLoading(false);
		}
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);

		try {
			await usersApi.create(form);
			router.push("/users");
		} catch (e: any) {
			setError(e?.message ?? t("user.new.errors.createError"));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div className="flex items-center justify-between">
				<div>
					<Link href="/users" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-flex items-center gap-1">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						{t("user.new.backToList")}
					</Link>
					<h1 className="text-3xl font-bold text-gray-900">{t("user.new.title")}</h1>
					<p className="text-gray-600 mt-1">{t("user.new.description")}</p>
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

			{/* Formulaire */}
			<form onSubmit={onSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
				{/* Informations de base */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							{t("user.new.form.username")} <span className="text-red-500">{t("user.new.form.usernameRequired")}</span>
						</label>
						<Input
							value={form.username}
							onChange={(e) => setForm({ ...form, username: e.target.value })}
							required
							placeholder={t("user.new.form.usernamePlaceholder")}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							{t("user.new.form.email")} <span className="text-red-500">{t("user.new.form.emailRequired")}</span>
						</label>
						<Input
							type="email"
							value={form.email}
							onChange={(e) => setForm({ ...form, email: e.target.value })}
							required
							placeholder={t("user.new.form.emailPlaceholder")}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							{t("user.new.form.password")} <span className="text-red-500">{t("user.new.form.passwordRequired")}</span>
						</label>
						<Input
							type="password"
							value={form.password}
							onChange={(e) => setForm({ ...form, password: e.target.value })}
							required
							placeholder={t("user.new.form.passwordPlaceholder")}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("user.new.form.status")}</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={form.status}
							onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
						>
							<option value="ACTIVE">{t("user.statuses.ACTIVE")}</option>
							<option value="INACTIVE">{t("user.statuses.INACTIVE")}</option>
							<option value="LOCKED">{t("user.statuses.LOCKED")}</option>
							<option value="EXPIRED">{t("user.statuses.EXPIRED")}</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("user.new.form.firstName")}</label>
						<Input
							value={form.firstName || ""}
							onChange={(e) => setForm({ ...form, firstName: e.target.value })}
							placeholder={t("user.new.form.firstNamePlaceholder")}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("user.new.form.lastName")}</label>
						<Input
							value={form.lastName || ""}
							onChange={(e) => setForm({ ...form, lastName: e.target.value })}
							placeholder={t("user.new.form.lastNamePlaceholder")}
						/>
					</div>
				</div>

				{/* Rôles */}
				<div>
					<div className="flex items-center gap-2 mb-2">
						<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
						<label className="block text-sm font-medium text-gray-700">{t("user.new.form.roles")}</label>
						{form.roleIds && form.roleIds.length > 0 && (
							<Badge variant="info" className="ml-2">
								{form.roleIds.length} {form.roleIds.length > 1 ? t("user.new.form.selectedPlural") : t("user.new.form.selected")}
							</Badge>
						)}
					</div>
					{loading ? (
						<div className="border border-gray-200 rounded-md p-4 text-center">
							<div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
							<p className="mt-2 text-sm text-gray-600">{t("common.loading")}</p>
						</div>
					) : roles.length === 0 ? (
						<div className="border border-gray-200 rounded-md p-4 text-center bg-gray-50">
							<p className="text-sm text-gray-400">{t("role.table.noRoles")}</p>
						</div>
					) : (
						<div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md p-4 space-y-2 bg-gray-50">
							{roles.map(role => (
								<label key={role.id} className="flex items-center space-x-2 p-2 hover:bg-white rounded cursor-pointer transition-colors">
									<input
										type="checkbox"
										checked={form.roleIds?.includes(role.id) || false}
										onChange={(e) => {
											const roleIds = form.roleIds || [];
											if (e.target.checked) {
												setForm({ ...form, roleIds: [...roleIds, role.id] });
											} else {
												setForm({ ...form, roleIds: roleIds.filter(id => id !== role.id) });
											}
										}}
										className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
									/>
									<span className="text-sm text-gray-700">{role.name}</span>
								</label>
							))}
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
					<Link href="/users">
						<Button type="button" variant="outline">
							{t("user.new.form.cancel")}
						</Button>
					</Link>
					<Button type="submit" disabled={submitting} className="flex items-center gap-2">
						{submitting ? (
							<>
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
								{t("user.new.form.creating")}
							</>
						) : (
							<>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
								{t("user.new.form.create")}
							</>
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}
