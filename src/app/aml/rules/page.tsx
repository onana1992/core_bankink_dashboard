"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Eye, Hash, Layers, Pencil, Trash2, X } from "lucide-react";
import { amlApi } from "@/lib/api";
import type { AmlRuleDefinitionResponse, AmlRuleVersionResponse, AmlRuleCategory } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TablePagination, { OPS_TABLE_PAGE_SIZE_OPTIONS } from "@/components/ui/TablePagination";

const CATEGORIES: AmlRuleCategory[] = [
	"AMOUNT",
	"VELOCITY",
	"STRUCTURING",
	"COUNTERPARTY",
	"GEO",
	"CHANNEL",
	"CREDIT",
	"CUSTOM"
];

const SELECT_CLASS =
	"w-full h-10 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

const TEXTAREA_CLASS =
	"w-full min-h-[5.5rem] resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

function categoryBadgeClass(cat: AmlRuleCategory): string {
	switch (cat) {
		case "AMOUNT":
			return "bg-amber-50 text-amber-900 ring-amber-200/80";
		case "VELOCITY":
			return "bg-sky-50 text-sky-900 ring-sky-200/80";
		case "STRUCTURING":
			return "bg-rose-50 text-rose-900 ring-rose-200/80";
		case "COUNTERPARTY":
			return "bg-teal-50 text-teal-900 ring-teal-200/80";
		case "GEO":
			return "bg-emerald-50 text-emerald-900 ring-emerald-200/80";
		case "CHANNEL":
			return "bg-indigo-50 text-indigo-900 ring-indigo-200/80";
		case "CREDIT":
			return "bg-orange-50 text-orange-900 ring-orange-200/80";
		default:
			return "bg-slate-50 text-slate-800 ring-slate-200/80";
	}
}

function initEditDraft(r: AmlRuleDefinitionResponse) {
	return {
		name: r.name,
		category: r.category,
		description: r.description ?? ""
	};
}

type EditDraft = ReturnType<typeof initEditDraft>;

type AmlRuleDetailModalProps = {
	rule: AmlRuleDefinitionResponse;
	onClose: () => void;
	onVersionsChanged: () => void;
	onSaved: (updated: AmlRuleDefinitionResponse) => void;
};

function AmlRuleDetailModal({ rule, onClose, onVersionsChanged, onSaved }: AmlRuleDetailModalProps) {
	const { t } = useTranslation();
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [draft, setDraft] = useState<EditDraft>(() => initEditDraft(rule));

	const [versions, setVersions] = useState<AmlRuleVersionResponse[] | null>(null);
	const [loadingVersions, setLoadingVersions] = useState(true);
	const [versionBusyId, setVersionBusyId] = useState<number | null>(null);
	const [showPublish, setShowPublish] = useState(false);
	const [pubFrom, setPubFrom] = useState(() => new Date().toISOString().slice(0, 10));
	const [pubEnabled, setPubEnabled] = useState(true);
	const [publishSaving, setPublishSaving] = useState(false);
	const [sectionError, setSectionError] = useState<string | null>(null);

	useEffect(() => {
		setEditing(false);
		setSaveError(null);
		setDraft(initEditDraft(rule));
	}, [rule.id]);

	const displayCategory = editing ? draft.category : rule.category;
	const displayName = editing ? draft.name.trim() || "—" : rule.name;

	const loadVersions = useCallback(async () => {
		setLoadingVersions(true);
		setSectionError(null);
		try {
			const v = await amlApi.listRuleVersions(rule.id);
			setVersions(v ?? []);
		} catch {
			setVersions([]);
			setSectionError(t("aml.rules.versionsLoadError"));
		} finally {
			setLoadingVersions(false);
		}
	}, [rule.id, t]);

	useEffect(() => {
		setShowPublish(false);
		setPubFrom(new Date().toISOString().slice(0, 10));
		setPubEnabled(true);
		setSectionError(null);
		void loadVersions();
	}, [loadVersions]);

	function enterEdit() {
		setDraft(initEditDraft(rule));
		setSaveError(null);
		setEditing(true);
	}

	function cancelEdit() {
		setDraft(initEditDraft(rule));
		setSaveError(null);
		setEditing(false);
	}

	async function handleDefinitionSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSaveError(null);
		const name = draft.name.trim();
		if (!name) return;
		setSaving(true);
		try {
			const updated = await amlApi.updateRule(rule.id, {
				name,
				category: draft.category,
				description: draft.description.trim() || null
			});
			onSaved(updated);
			setDraft(initEditDraft(updated));
			setEditing(false);
		} catch (err: unknown) {
			setSaveError(err instanceof Error ? err.message : "Error");
		} finally {
			setSaving(false);
		}
	}

	async function handlePublish(e: React.FormEvent) {
		e.preventDefault();
		setSectionError(null);
		setPublishSaving(true);
		try {
			await amlApi.publishRuleVersion(rule.id, { effectiveFrom: pubFrom, enabled: pubEnabled });
			setShowPublish(false);
			await loadVersions();
			onVersionsChanged();
		} catch (err: unknown) {
			setSectionError(err instanceof Error ? err.message : "Error");
		} finally {
			setPublishSaving(false);
		}
	}

	async function toggleVersionEnabled(versionId: number, current: boolean) {
		setSectionError(null);
		setVersionBusyId(versionId);
		try {
			await amlApi.patchRuleVersion(versionId, !current);
			await loadVersions();
			onVersionsChanged();
		} catch (err: unknown) {
			setSectionError(err instanceof Error ? err.message : "Error");
		} finally {
			setVersionBusyId(null);
		}
	}

	const versionsLocked = editing || saving;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="aml-rule-modal-title">
			<button
				type="button"
				className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
				aria-label={t("aml.rules.modalClose")}
				onClick={onClose}
			/>
			<div className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
				<header className="shrink-0 border-b border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 px-5 py-4 sm:px-6">
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0 flex-1 space-y-2">
							<p id="aml-rule-modal-title" className="text-xs font-medium uppercase tracking-wide text-indigo-800">
								{t("aml.rules.modalTitle")}
							</p>
							<p className="break-all font-mono text-sm font-semibold text-indigo-900">{rule.code}</p>
							<h3 className="text-base font-semibold leading-snug text-indigo-900">{displayName}</h3>
							<span
								className={`inline-flex w-fit items-center rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${categoryBadgeClass(displayCategory)}`}
							>
								{displayCategory}
							</span>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="shrink-0 rounded-lg p-2 text-indigo-700 transition-colors hover:bg-indigo-200/60 hover:text-indigo-900"
							aria-label={t("aml.rules.modalClose")}
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</header>

				<div className="flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-gray-50/95 to-white">
					<div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
						{saveError ? (
							<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
								{saveError}
							</div>
						) : null}
						{sectionError && !saveError ? (
							<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
								{sectionError}
							</div>
						) : null}

						{editing ? (
							<form id="aml-rule-edit-form" className="space-y-4" onSubmit={handleDefinitionSubmit}>
								<div>
									<label className="mb-1 block text-xs font-medium text-gray-600">{t("aml.rules.name")}</label>
									<Input className="h-10 w-full" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} required />
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium text-gray-600">{t("aml.rules.category")}</label>
									<select
										className={SELECT_CLASS}
										value={draft.category}
										onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as AmlRuleCategory }))}
									>
										{CATEGORIES.map((c) => (
											<option key={c} value={c}>
												{c}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium text-gray-600">{t("aml.rules.description")}</label>
									<textarea
										className={TEXTAREA_CLASS}
										value={draft.description}
										onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
										rows={4}
									/>
								</div>
							</form>
						) : (
							<>
								<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-900/[0.04]">
									<div className="mb-3 flex items-center gap-2 text-gray-500">
										<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
											<Hash className="h-4 w-4" aria-hidden />
										</div>
										<span className="text-[11px] font-bold uppercase tracking-wide">{t("aml.rules.definitionId")}</span>
									</div>
									<p className="text-sm font-semibold tabular-nums text-gray-900">{rule.id}</p>
								</div>

								{rule.description ? (
									<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-900/[0.04]">
										<div className="mb-3 flex items-center gap-2 text-gray-500">
											<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
												<BookOpen className="h-4 w-4" aria-hidden />
											</div>
											<span className="text-[11px] font-bold uppercase tracking-wide">{t("aml.rules.description")}</span>
										</div>
										<p className="text-sm leading-relaxed text-gray-800">{rule.description}</p>
									</div>
								) : null}
							</>
						)}

						<div className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-900/[0.04] ${versionsLocked ? "pointer-events-none opacity-60" : ""}`}>
							<div className="mb-3 flex items-center justify-between gap-2 text-gray-500">
								<div className="flex items-center gap-2">
									<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
										<Layers className="h-4 w-4" aria-hidden />
									</div>
									<span className="text-[11px] font-bold uppercase tracking-wide">{t("aml.rules.versionsSection")}</span>
								</div>
								<Button type="button" variant="outline" size="sm" className="shrink-0" disabled={versionsLocked} onClick={() => setShowPublish((s) => !s)}>
									{showPublish ? t("aml.rules.hidePublish") : t("aml.rules.newVersion")}
								</Button>
							</div>

							{showPublish ? (
								<form onSubmit={handlePublish} className="mb-4 space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
									<p className="text-xs text-gray-600">{t("aml.rules.publishHint")}</p>
									<div className="grid gap-3 sm:grid-cols-2">
										<div>
											<label className="mb-1 block text-xs font-medium text-gray-600">{t("aml.rules.effectiveFrom")}</label>
											<Input type="date" className="h-10" value={pubFrom} onChange={(e) => setPubFrom(e.target.value)} required disabled={versionsLocked} />
										</div>
										<div className="flex items-end pb-1">
											<label className="flex items-center gap-2 text-sm text-gray-700">
												<input
													type="checkbox"
													className="rounded border-gray-300"
													checked={pubEnabled}
													onChange={(e) => setPubEnabled(e.target.checked)}
													disabled={versionsLocked}
												/>
												{t("aml.rules.enabled")}
											</label>
										</div>
									</div>
									<Button type="submit" size="sm" disabled={publishSaving || versionsLocked}>
										{publishSaving ? t("aml.saving") : t("aml.rules.publish")}
									</Button>
								</form>
							) : null}

							{loadingVersions ? (
								<p className="text-sm text-gray-600">{t("aml.loading")}</p>
							) : (versions?.length ?? 0) === 0 ? (
								<p className="text-sm text-gray-500">{t("aml.rules.noVersions")}</p>
							) : (
								<ul className="space-y-2">
									{(versions ?? []).map((v) => (
										<li
											key={v.id}
											className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-xs text-gray-800"
										>
											<span>
												v{v.version} — {v.effectiveFrom}
												{v.effectiveTo ? ` → ${v.effectiveTo}` : ""} — {v.enabled ? t("aml.rules.on") : t("aml.rules.off")}
											</span>
											<Button
												type="button"
												size="sm"
												variant="outline"
												disabled={versionBusyId !== null || versionsLocked}
												onClick={() => void toggleVersionEnabled(v.id, v.enabled)}
											>
												{versionBusyId === v.id ? (
													<span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" aria-hidden />
												) : v.enabled ? (
													t("aml.rules.disable")
												) : (
													t("aml.rules.enable")
												)}
											</Button>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>

					<div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 bg-white/90 px-5 py-4 backdrop-blur-sm sm:px-6">
						{editing ? (
							<>
								<Button type="button" variant="outline" onClick={cancelEdit} disabled={saving} className="min-w-[7rem] border-gray-200">
									{t("common.cancel")}
								</Button>
								<Button type="submit" form="aml-rule-edit-form" disabled={saving} className="min-w-[7rem]">
									{saving ? t("aml.rules.saving") : t("aml.rules.saveChanges")}
								</Button>
							</>
						) : (
							<>
								<Button type="button" variant="default" onClick={enterEdit} className="inline-flex min-w-[7rem] items-center justify-center gap-2">
									<Pencil className="h-4 w-4 shrink-0" aria-hidden />
									{t("common.edit")}
								</Button>
								<Button type="button" variant="outline" onClick={onClose} className="min-w-[7rem] border-gray-200">
									{t("aml.rules.modalClose")}
								</Button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default function AmlRulesPage() {
	const { t } = useTranslation();
	const [rules, setRules] = useState<AmlRuleDefinitionResponse[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<"" | AmlRuleCategory>("");
	const [page, setPage] = useState(0);
	const [pageSize, setPageSize] = useState(10);

	const [showCreate, setShowCreate] = useState(false);
	const [newCode, setNewCode] = useState("");
	const [newName, setNewName] = useState("");
	const [newCategory, setNewCategory] = useState<AmlRuleCategory>("AMOUNT");
	const [newDesc, setNewDesc] = useState("");

	const [detailRule, setDetailRule] = useState<AmlRuleDefinitionResponse | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const filteredRules = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return rules.filter((r) => {
			if (categoryFilter && r.category !== categoryFilter) return false;
			if (!q) return true;
			return r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
		});
	}, [rules, searchQuery, categoryFilter]);

	const totalFiltered = filteredRules.length;
	const totalPages = totalFiltered === 0 ? 0 : Math.ceil(totalFiltered / pageSize);

	const paginatedRules = useMemo(() => {
		const start = page * pageSize;
		return filteredRules.slice(start, start + pageSize);
	}, [filteredRules, page, pageSize]);

	useEffect(() => {
		setPage(0);
	}, [searchQuery, categoryFilter]);

	useEffect(() => {
		if (!detailRule) return;
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setDetailRule(null);
		};
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = prevOverflow;
			window.removeEventListener("keydown", onKey);
		};
	}, [detailRule]);

	const stats = useMemo(() => {
		const categories = new Set(rules.map((r) => r.category));
		return {
			total: rules.length,
			categories: categories.size,
			amount: rules.filter((r) => r.category === "AMOUNT").length,
			custom: rules.filter((r) => r.category === "CUSTOM").length
		};
	}, [rules]);

	const loadRules = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const list = await amlApi.listRules();
			setRules(list ?? []);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
			setRules([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadRules();
	}, [loadRules]);

	const safePage = totalPages > 0 ? Math.min(page, totalPages - 1) : 0;
	useEffect(() => {
		if (page !== safePage) setPage(safePage);
	}, [page, safePage]);

	const cancelCreateForm = useCallback(() => {
		setShowCreate(false);
		setError(null);
		setNewCode("");
		setNewName("");
		setNewDesc("");
		setNewCategory("AMOUNT");
	}, []);

	const handleDeleteRule = useCallback(
		async (r: AmlRuleDefinitionResponse) => {
			if (typeof window !== "undefined" && !window.confirm(t("aml.rules.deleteConfirm", { code: r.code }))) {
				return;
			}
			setError(null);
			setDeletingId(r.id);
			try {
				await amlApi.deleteRule(r.id);
				setRules((prev) => prev.filter((x) => x.id !== r.id));
				setDetailRule((cur) => (cur?.id === r.id ? null : cur));
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Error");
			} finally {
				setDeletingId(null);
			}
		},
		[t]
	);

	async function createRule(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		try {
			await amlApi.createRule({
				code: newCode.trim(),
				name: newName.trim(),
				category: newCategory,
				description: newDesc.trim() || undefined
			});
			cancelCreateForm();
			await loadRules();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Error");
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("aml.rules.title")}</h1>
					<p className="text-gray-600 mt-2 max-w-3xl text-sm leading-relaxed sm:text-base">{t("aml.rules.subtitle")}</p>
				</div>
				<div className="flex flex-wrap gap-3 items-center">
					<Button type="button" variant="outline" className="flex items-center gap-2" onClick={() => void loadRules()} disabled={loading}>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						{t("common.refresh")}
					</Button>
					<Button type="button" variant={showCreate ? "secondary" : "default"} onClick={() => (showCreate ? cancelCreateForm() : setShowCreate(true))}>
						{showCreate ? t("aml.actions.cancel") : t("aml.rules.createDefinition")}
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200">
					<div className="flex items-center justify-between gap-2">
						<div>
							<div className="text-sm font-medium text-blue-700 mb-1">{t("aml.rules.stats.total")}</div>
							<div className="text-3xl font-bold text-blue-900">{stats.total}</div>
						</div>
						<div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-sky-50 to-sky-100 p-5 rounded-xl shadow-sm border border-sky-200">
					<div className="flex items-center justify-between gap-2">
						<div>
							<div className="text-sm font-medium text-sky-700 mb-1">{t("aml.rules.stats.categories")}</div>
							<div className="text-3xl font-bold text-sky-900">{stats.categories}</div>
						</div>
						<div className="w-12 h-12 bg-sky-200 rounded-lg flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-xl shadow-sm border border-amber-200">
					<div className="flex items-center justify-between gap-2">
						<div>
							<div className="text-sm font-medium text-amber-800 mb-1">{t("aml.rules.stats.amount")}</div>
							<div className="text-3xl font-bold text-amber-900">{stats.amount}</div>
						</div>
						<div className="w-12 h-12 bg-amber-200 rounded-lg flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
				</div>
				<div className="bg-gradient-to-br from-violet-50 to-violet-100 p-5 rounded-xl shadow-sm border border-violet-200">
					<div className="flex items-center justify-between gap-2">
						<div>
							<div className="text-sm font-medium text-violet-700 mb-1">{t("aml.rules.stats.custom")}</div>
							<div className="text-3xl font-bold text-violet-900">{stats.custom}</div>
						</div>
						<div className="w-12 h-12 bg-violet-200 rounded-lg flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-violet-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
						</div>
					</div>
				</div>
			</div>

			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			{showCreate && (
				<form onSubmit={createRule} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">{t("aml.rules.createDefinition")}</h2>
					<div className="grid sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.rules.code")}</label>
							<Input className="font-mono text-sm h-10" value={newCode} onChange={(e) => setNewCode(e.target.value)} required />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.rules.name")}</label>
							<Input className="h-10" value={newName} onChange={(e) => setNewName(e.target.value)} required />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.rules.category")}</label>
							<select className={SELECT_CLASS} value={newCategory} onChange={(e) => setNewCategory(e.target.value as AmlRuleCategory)}>
								{CATEGORIES.map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</select>
						</div>
						<div className="sm:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.rules.description")}</label>
							<textarea className={TEXTAREA_CLASS} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} />
						</div>
					</div>
					<div className="flex flex-wrap gap-2 pt-1">
						<Button type="button" variant="outline" onClick={cancelCreateForm}>
							{t("common.cancel")}
						</Button>
						<Button type="submit">{t("aml.rules.submitCreate")}</Button>
					</div>
				</form>
			)}

			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">{t("aml.loading")}</p>
				</div>
			) : filteredRules.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<p className="text-gray-500 text-lg font-medium">{t("aml.empty")}</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="border-b border-gray-200 bg-gray-50/90 px-4 py-4 sm:px-6">
						<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
							<h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{t("aml.rules.tableFilters")}</h2>
						</div>
						<div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<div className="min-w-0 lg:col-span-2">
								<label className="mb-1 block text-xs font-medium text-gray-600">{t("aml.rules.search")}</label>
								<Input
									type="search"
									className="h-10 w-full"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder={t("aml.rules.searchPlaceholder")}
									autoComplete="off"
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs font-medium text-gray-600">{t("aml.rules.filterCategory")}</label>
								<select
									className={SELECT_CLASS}
									value={categoryFilter}
									onChange={(e) => setCategoryFilter((e.target.value || "") as "" | AmlRuleCategory)}
								>
									<option value="">{t("aml.rules.allCategories")}</option>
									{CATEGORIES.map((c) => (
										<option key={c} value={c}>
											{c}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>

					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.rules.code")}</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.rules.name")}</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.rules.category")}</th>
									<th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.rules.actions")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 text-sm">
								{paginatedRules.map((r) => (
									<tr key={r.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-4 py-3 font-mono text-xs text-gray-900 whitespace-nowrap">{r.code}</td>
										<td className="px-4 py-3 text-gray-900">{r.name}</td>
										<td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.category}</td>
										<td className="px-4 py-3 text-right whitespace-nowrap">
											<div className="inline-flex flex-wrap items-center justify-end gap-2">
												<Button
													type="button"
													variant="outline"
													size="sm"
													className="inline-flex items-center gap-1.5"
													onClick={() => setDetailRule(r)}
													disabled={deletingId !== null}
												>
													<Eye className="h-4 w-4 shrink-0 text-gray-600" aria-hidden />
													{t("aml.rules.view")}
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													className="inline-flex items-center gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
													onClick={() => void handleDeleteRule(r)}
													disabled={deletingId !== null}
													aria-label={t("aml.rules.delete")}
												>
													{deletingId === r.id ? (
														<span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-red-300 border-t-red-700" aria-hidden />
													) : (
														<Trash2 className="h-4 w-4 shrink-0" aria-hidden />
													)}
													{t("aml.rules.delete")}
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<TablePagination
						page={safePage}
						totalPages={totalPages}
						totalElements={totalFiltered}
						pageSize={pageSize}
						onPageChange={setPage}
						resultsLabel={t("aml.rules.paginationRules")}
						showFirstLast
						sizeOptions={OPS_TABLE_PAGE_SIZE_OPTIONS}
						size={pageSize}
						onSizeChange={(s) => {
							setPageSize(s);
							setPage(0);
						}}
						className="!border-t-gray-200 !bg-gray-50/90 [&_.text-ops-fg]:text-gray-800 [&_.text-ops-fg-muted]:text-gray-600 [&_select]:border-gray-300 [&_select]:bg-white"
					/>
				</div>
			)}

			{detailRule ? (
				<AmlRuleDetailModal
					rule={detailRule}
					onClose={() => setDetailRule(null)}
					onVersionsChanged={() => void loadRules()}
					onSaved={(r) => {
						setDetailRule(r);
						setRules((prev) => prev.map((x) => (x.id === r.id ? r : x)));
					}}
				/>
			) : null}
		</div>
	);
}
