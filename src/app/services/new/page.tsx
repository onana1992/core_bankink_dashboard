"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { servicesApi } from "@/lib/api";
import type { CreateServiceRegistryRequest } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ArrowLeft, Server, AlertCircle, Plus, Loader2 } from "lucide-react";

export default function NewServicePage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [form, setForm] = useState<CreateServiceRegistryRequest>({
		name: "",
		slug: "",
		description: "",
		metadata: undefined,
		createServiceUser: true
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			const created = await servicesApi.create(form);
			router.push(`/services/${created.id}`);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : t("service.errors.createError"));
		} finally {
			setSubmitting(false);
		}
	}

	function slugFromName(value: string): string {
		return value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
	}

	function onNameChange(name: string) {
		setForm((prev) => {
			const derivedFromPrev = slugFromName(prev.name ?? "");
			const slugWasAuto = !prev.slug || prev.slug === derivedFromPrev;
			const newSlug = slugWasAuto ? slugFromName(name) : prev.slug;
			return { ...prev, name, slug: newSlug ?? "" };
		});
	}

	return (
		<div className="space-y-6">
			{/* En-tête */}
			<div>
				<Link
					href="/services"
					className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
				>
					<ArrowLeft className="h-4 w-4" />
					{t("service.backToList")}
				</Link>
				<div className="flex items-center gap-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">
						<Server className="h-6 w-6" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("service.new")}</h1>
						<p className="mt-0.5 text-sm text-slate-500">{t("service.newDescription")}</p>
					</div>
				</div>
			</div>

			{error && (
				<div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
					<AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
					<span>{error}</span>
				</div>
			)}

			{/* Formulaire */}
			<form onSubmit={onSubmit} className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
				<div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
					<h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
						{t("service.form.details")}
					</h2>
				</div>
				<div className="space-y-6 p-6">
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div>
							<label className="mb-2 block text-sm font-medium text-slate-700">
								{t("service.form.name")} <span className="text-rose-500">*</span>
							</label>
							<Input
								value={form.name}
								onChange={(e) => onNameChange(e.target.value)}
								required
								placeholder={t("service.form.namePlaceholder")}
								className="rounded-lg border-slate-300 focus:border-slate-400 focus:ring-slate-200"
							/>
						</div>
						<div>
							<label className="mb-2 block text-sm font-medium text-slate-700">
								{t("service.form.slug")} <span className="text-rose-500">*</span>
							</label>
							<Input
								value={form.slug}
								onChange={(e) => setForm({ ...form, slug: e.target.value })}
								required
								placeholder={t("service.form.slugPlaceholder")}
								className="font-mono rounded-lg border-slate-300 focus:border-slate-400 focus:ring-slate-200"
							/>
						</div>
						<div className="md:col-span-2">
							<label className="mb-2 block text-sm font-medium text-slate-700">{t("service.form.description")}</label>
							<textarea
								className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								rows={3}
								value={form.description ?? ""}
								onChange={(e) => setForm({ ...form, description: e.target.value || undefined })}
								placeholder={t("service.form.description")}
							/>
						</div>
						<div className="md:col-span-2 flex items-start gap-3">
							<input
								type="checkbox"
								id="createServiceUser"
								checked={form.createServiceUser !== false}
								onChange={(e) => setForm({ ...form, createServiceUser: e.target.checked })}
								className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
							/>
							<label htmlFor="createServiceUser" className="text-sm text-slate-700">
								<span className="font-medium">{t("service.detail.createServiceUser")}</span>
								<span className="mt-1 block text-slate-500">{t("service.detail.createServiceUserHint")}</span>
							</label>
						</div>
					</div>
				</div>

				<div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50/30 px-6 py-4">
					<Link href="/services">
						<Button type="button" variant="outline">
							{t("common.cancel")}
						</Button>
					</Link>
					<Button
						type="submit"
						disabled={submitting}
						className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800"
					>
						{submitting ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								{t("service.form.creating")}
							</>
						) : (
							<>
								<Plus className="h-4 w-4" />
								{t("service.form.create")}
							</>
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}
