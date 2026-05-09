"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Cpu, Eye, FileCode, Gauge, Pencil, Trash2, X } from "lucide-react";
import { kycCatalogApi } from "@/lib/api";
import type { KycRuleDefinitionResponse, KycRuleCategory } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TablePagination, { OPS_TABLE_PAGE_SIZE_OPTIONS } from "@/components/ui/TablePagination";

const CATEGORIES: KycRuleCategory[] = ["SCORING", "OVERRIDE", "DECISION", "CUSTOM"];

const SELECT_CLASS =
	"w-full h-10 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

const TEXTAREA_CLASS =
	"w-full min-h-[5.5rem] resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

function initEditDraft(r: KycRuleDefinitionResponse) {
	return {
		name: r.name,
		category: r.category,
		description: r.description ?? "",
		drlFile: r.drlFile ?? "",
		salience: r.salience != null ? String(r.salience) : "0",
		algorithmVersion: r.algorithmVersion ?? ""
	};
}

type EditDraft = ReturnType<typeof initEditDraft>;

function parseOptionalSalience(raw: string): { ok: true; value: number | null } | { ok: false } {
	const salStr = raw.trim();
	if (salStr === "" || salStr === "-") {
		return { ok: true, value: null };
	}
	const n = parseInt(salStr, 10);
	if (Number.isNaN(n) || String(n) !== salStr) {
		return { ok: false };
	}
	return { ok: true, value: n };
}

function categoryBadgeClass(cat: KycRuleCategory): string {
	switch (cat) {
		case "SCORING":
			return "bg-sky-50 text-sky-900 ring-sky-200/80";
		case "OVERRIDE":
			return "bg-rose-50 text-rose-900 ring-rose-200/80";
		case "DECISION":
			return "bg-violet-50 text-violet-900 ring-violet-200/80";
		default:
			return "bg-slate-50 text-slate-800 ring-slate-200/80";
	}
}

type KycRuleDetailModalProps = {
	rule: KycRuleDefinitionResponse;
	onClose: () => void;
	onSaved: (updated: KycRuleDefinitionResponse) => void;
};

function KycRuleDetailModal({ rule, onClose, onSaved }: KycRuleDetailModalProps) {
	const { t } = useTranslation();
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [draft, setDraft] = useState<EditDraft>(() => initEditDraft(rule));

	useEffect(() => {
		setEditing(false);
		setSaveError(null);
		setDraft(initEditDraft(rule));
	}, [rule.id]);

	const displayCategory = editing ? draft.category : rule.category;
	const displayName = editing ? draft.name.trim() || "—" : rule.name;

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

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSaveError(null);
		const salParsed = parseOptionalSalience(draft.salience);
		if (!salParsed.ok) {
			setSaveError(t("kycCatalog.rules.invalidSalience"));
			return;
		}
		const salience = salParsed.value;
		const name = draft.name.trim();
		if (!name) return;

		setSaving(true);
		try {
			const updated = await kycCatalogApi.updateRule(rule.id, {
				name,
				category: draft.category,
				description: draft.description.trim() || null,
				drlFile: draft.drlFile.trim() || null,
				salience,
				algorithmVersion: draft.algorithmVersion.trim() || null,
				ruleText: rule.ruleText?.trim() ? rule.ruleText.trim() : null
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

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="kyc-rule-modal-title">
			<button
				type="button"
				className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
				aria-label={t("kycCatalog.rules.modalClose")}
				onClick={onClose}
			/>
			<div className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
				<header className="shrink-0 border-b border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 px-5 py-4 sm:px-6">
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0 flex-1 space-y-2">
							<p id="kyc-rule-modal-title" className="text-xs font-medium uppercase tracking-wide text-emerald-800">
								{t("kycCatalog.rules.modalTitle")}
							</p>
							<p className="break-all font-mono text-sm font-semibold text-emerald-900">{rule.code}</p>
							<h3 className="text-base font-semibold leading-snug text-emerald-900">{displayName}</h3>
							<span
								className={`inline-flex w-fit items-center rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${categoryBadgeClass(displayCategory)}`}
							>
								{displayCategory}
							</span>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="shrink-0 rounded-lg p-2 text-emerald-700 transition-colors hover:bg-emerald-200/60 hover:text-emerald-900"
							aria-label={t("kycCatalog.rules.modalClose")}
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

						{editing ? (
							<form id="kyc-rule-edit-form" className="space-y-4" onSubmit={handleSubmit}>
								<div>
									<label className="mb-1 block text-xs font-medium text-gray-600">{t("kycCatalog.rules.name")}</label>
									<Input className="h-10 w-full" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} required />
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium text-gray-600">{t("kycCatalog.rules.category")}</label>
									<select
										className={SELECT_CLASS}
										value={draft.category}
										onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as KycRuleCategory }))}
									>
										{CATEGORIES.map((c) => (
											<option key={c} value={c}>
												{c}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium text-gray-600">{t("kycCatalog.rules.description")}</label>
									<textarea
										className={TEXTAREA_CLASS}
										value={draft.description}
										onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
										rows={3}
									/>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium text-gray-600">{t("kycCatalog.rules.drlFile")}</label>
									<Input className="h-10 w-full font-mono text-sm" value={draft.drlFile} onChange={(e) => setDraft((d) => ({ ...d, drlFile: e.target.value }))} />
								</div>
								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<label className="mb-1 block text-xs font-medium text-gray-600">{t("kycCatalog.rules.salience")}</label>
										<Input
											type="number"
											step={1}
											className="h-10 w-full tabular-nums"
											value={draft.salience}
											onChange={(e) => setDraft((d) => ({ ...d, salience: e.target.value }))}
											placeholder="—"
										/>
									</div>
									<div>
										<label className="mb-1 block text-xs font-medium text-gray-600">{t("kycCatalog.rules.algorithm")}</label>
										<Input className="h-10 w-full font-mono text-sm" value={draft.algorithmVersion} onChange={(e) => setDraft((d) => ({ ...d, algorithmVersion: e.target.value }))} />
									</div>
								</div>
							</form>
						) : (
							<>
								<div className="grid gap-3 sm:grid-cols-2">
									<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-900/[0.04]">
										<div className="mb-3 flex items-center gap-2 text-gray-500">
											<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
												<Gauge className="h-4 w-4" aria-hidden />
											</div>
											<span className="text-[11px] font-bold uppercase tracking-wide">{t("kycCatalog.rules.salience")}</span>
										</div>
										<p className="text-sm font-semibold tabular-nums text-gray-900">{rule.salience != null ? rule.salience : "—"}</p>
									</div>
									<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-900/[0.04]">
										<div className="mb-3 flex items-center gap-2 text-gray-500">
											<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
												<Cpu className="h-4 w-4" aria-hidden />
											</div>
											<span className="text-[11px] font-bold uppercase tracking-wide">{t("kycCatalog.rules.algorithm")}</span>
										</div>
										<p className="break-all font-mono text-xs font-medium leading-relaxed text-gray-900">{rule.algorithmVersion ?? "—"}</p>
									</div>
								</div>

								{rule.drlFile ? (
									<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-900/[0.04]">
										<div className="mb-3 flex items-center gap-2 text-gray-500">
											<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
												<FileCode className="h-4 w-4" aria-hidden />
											</div>
											<span className="text-[11px] font-bold uppercase tracking-wide">{t("kycCatalog.rules.drlFile")}</span>
										</div>
										<p className="break-all rounded-lg bg-slate-50/80 px-3 py-2.5 font-mono text-xs leading-relaxed text-slate-800 ring-1 ring-slate-200/60">
											{rule.drlFile}
										</p>
									</div>
								) : null}

								{rule.description ? (
									<div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-900/[0.04]">
										<div className="mb-3 flex items-center gap-2 text-gray-500">
											<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
												<BookOpen className="h-4 w-4" aria-hidden />
											</div>
											<span className="text-[11px] font-bold uppercase tracking-wide">{t("kycCatalog.rules.description")}</span>
										</div>
										<p className="text-sm leading-relaxed text-gray-800">{rule.description}</p>
									</div>
								) : null}
							</>
						)}
					</div>

					<div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 bg-white/90 px-5 py-4 backdrop-blur-sm sm:px-6">
						{editing ? (
							<>
								<Button type="button" variant="outline" onClick={cancelEdit} disabled={saving} className="min-w-[7rem] border-gray-200">
									{t("common.cancel")}
								</Button>
								<Button type="submit" form="kyc-rule-edit-form" disabled={saving} className="min-w-[7rem]">
									{saving ? t("kycCatalog.rules.saving") : t("kycCatalog.rules.saveChanges")}
								</Button>
							</>
						) : (
							<>
								<Button type="button" variant="default" onClick={enterEdit} className="inline-flex min-w-[7rem] items-center justify-center gap-2">
									<Pencil className="h-4 w-4 shrink-0" aria-hidden />
									{t("common.edit")}
								</Button>
								<Button type="button" variant="outline" onClick={onClose} className="min-w-[7rem] border-gray-200">
									{t("kycCatalog.rules.modalClose")}
								</Button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default function KycRulesCatalogPage() {
	const { t } = useTranslation();
	const [rules, setRules] = useState<KycRuleDefinitionResponse[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<"" | KycRuleCategory>("");
	const [page, setPage] = useState(0);
	const [pageSize, setPageSize] = useState(10);

	const [showCreate, setShowCreate] = useState(false);
	const [newCode, setNewCode] = useState("");
	const [newName, setNewName] = useState("");
	const [newCategory, setNewCategory] = useState<KycRuleCategory>("CUSTOM");
	const [newDesc, setNewDesc] = useState("");
	const [newDrlFile, setNewDrlFile] = useState("");
	const [newSalience, setNewSalience] = useState("0");

	const [detailRule, setDetailRule] = useState<KycRuleDefinitionResponse | null>(null);
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
		return {
			total: rules.length,
			scoring: rules.filter((r) => r.category === "SCORING").length,
			override: rules.filter((r) => r.category === "OVERRIDE").length,
			decision: rules.filter((r) => r.category === "DECISION").length
		};
	}, [rules]);

	const loadRules = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const list = await kycCatalogApi.listRules();
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
		setNewDrlFile("");
		setNewSalience("0");
		setNewCategory("CUSTOM");
	}, []);

	const handleDeleteRule = useCallback(
		async (r: KycRuleDefinitionResponse) => {
			if (typeof window !== "undefined" && !window.confirm(t("kycCatalog.rules.deleteConfirm", { code: r.code }))) {
				return;
			}
			setError(null);
			setDeletingId(r.id);
			try {
				await kycCatalogApi.deleteRule(r.id);
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
		const salParsed = parseOptionalSalience(newSalience);
		if (!salParsed.ok) {
			setError(t("kycCatalog.rules.invalidSalience"));
			return;
		}
		try {
			await kycCatalogApi.createRule({
				code: newCode.trim(),
				name: newName.trim(),
				category: newCategory,
				description: newDesc.trim() || undefined,
				drlFile: newDrlFile.trim() || undefined,
				salience: salParsed.value
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
					<h1 className="text-3xl font-bold text-gray-900">{t("kycCatalog.rules.title")}</h1>
					<p className="text-gray-600 mt-2 max-w-3xl text-sm leading-relaxed">{t("kycCatalog.rules.intro")}</p>
				</div>
				<div className="flex flex-wrap gap-3 items-center">
					<Button type="button" variant="outline" className="flex items-center gap-2" onClick={() => void loadRules()} disabled={loading}>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						{t("common.refresh")}
					</Button>
					<Button type="button" variant={showCreate ? "secondary" : "default"} onClick={() => (showCreate ? cancelCreateForm() : setShowCreate(true))}>
						{showCreate ? t("aml.actions.cancel") : t("kycCatalog.rules.createDefinition")}
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-xl shadow-sm border border-emerald-200">
					<div className="text-sm font-medium text-emerald-800 mb-1">{t("kycCatalog.rules.stats.total")}</div>
					<div className="text-3xl font-bold text-emerald-900">{stats.total}</div>
				</div>
				<div className="bg-gradient-to-br from-sky-50 to-sky-100 p-5 rounded-xl shadow-sm border border-sky-200">
					<div className="text-sm font-medium text-sky-800 mb-1">{t("kycCatalog.rules.stats.scoring")}</div>
					<div className="text-3xl font-bold text-sky-900">{stats.scoring}</div>
				</div>
				<div className="bg-gradient-to-br from-rose-50 to-rose-100 p-5 rounded-xl shadow-sm border border-rose-200">
					<div className="text-sm font-medium text-rose-800 mb-1">{t("kycCatalog.rules.stats.override")}</div>
					<div className="text-3xl font-bold text-rose-900">{stats.override}</div>
				</div>
				<div className="bg-gradient-to-br from-violet-50 to-violet-100 p-5 rounded-xl shadow-sm border border-violet-200">
					<div className="text-sm font-medium text-violet-800 mb-1">{t("kycCatalog.rules.stats.decision")}</div>
					<div className="text-3xl font-bold text-violet-900">{stats.decision}</div>
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
					<h2 className="text-lg font-semibold text-gray-900">{t("kycCatalog.rules.createDefinition")}</h2>
					<div className="grid sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("kycCatalog.rules.code")}</label>
							<Input className="font-mono text-sm h-10" value={newCode} onChange={(e) => setNewCode(e.target.value)} required />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("kycCatalog.rules.name")}</label>
							<Input className="h-10" value={newName} onChange={(e) => setNewName(e.target.value)} required />
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("kycCatalog.rules.category")}</label>
							<select className={SELECT_CLASS} value={newCategory} onChange={(e) => setNewCategory(e.target.value as KycRuleCategory)}>
								{CATEGORIES.map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("kycCatalog.rules.salience")}</label>
							<Input
								type="number"
								step={1}
								className="h-10 tabular-nums"
								value={newSalience}
								onChange={(e) => setNewSalience(e.target.value)}
								placeholder="—"
							/>
						</div>
						<div className="sm:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("kycCatalog.rules.drlFile")}</label>
							<Input className="h-10 w-full font-mono text-sm" value={newDrlFile} onChange={(e) => setNewDrlFile(e.target.value)} />
						</div>
						<div className="sm:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("kycCatalog.rules.description")}</label>
							<textarea
								className={TEXTAREA_CLASS}
								value={newDesc}
								onChange={(e) => setNewDesc(e.target.value)}
								rows={4}
							/>
						</div>
					</div>
					<div className="flex flex-wrap gap-2 pt-1">
						<Button type="button" variant="outline" onClick={cancelCreateForm}>
							{t("common.cancel")}
						</Button>
						<Button type="submit">{t("kycCatalog.rules.submitCreate")}</Button>
					</div>
				</form>
			)}

			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
					<p className="mt-4 text-gray-600">{t("kycCatalog.loading")}</p>
				</div>
			) : filteredRules.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<p className="text-gray-500 text-lg font-medium">{t("kycCatalog.empty")}</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="border-b border-gray-200 bg-gray-50/90 px-4 py-4 sm:px-6">
						<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
							<h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{t("kycCatalog.rules.tableFilters")}</h2>
						</div>
						<div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<div className="min-w-0 lg:col-span-2">
								<label className="mb-1 block text-xs font-medium text-gray-600">{t("kycCatalog.rules.search")}</label>
								<Input
									type="search"
									className="h-10 w-full"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder={t("kycCatalog.rules.searchPlaceholder")}
									autoComplete="off"
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs font-medium text-gray-600">{t("kycCatalog.rules.filterCategory")}</label>
								<select
									className={SELECT_CLASS}
									value={categoryFilter}
									onChange={(e) => setCategoryFilter((e.target.value || "") as "" | KycRuleCategory)}
								>
									<option value="">{t("kycCatalog.rules.allCategories")}</option>
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
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("kycCatalog.rules.code")}</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("kycCatalog.rules.name")}</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("kycCatalog.rules.category")}</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
										{t("kycCatalog.rules.salience")}
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("kycCatalog.rules.actions")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 text-sm">
								{paginatedRules.map((r) => (
									<tr key={r.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-4 py-3 font-mono text-xs text-gray-900 whitespace-nowrap">{r.code}</td>
										<td className="px-4 py-3 text-gray-900">{r.name}</td>
										<td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.category}</td>
										<td className="px-4 py-3 text-gray-700 hidden sm:table-cell">{r.salience ?? "—"}</td>
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
													{t("kycCatalog.rules.view")}
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													className="inline-flex items-center gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
													onClick={() => void handleDeleteRule(r)}
													disabled={deletingId !== null}
													aria-label={t("kycCatalog.rules.delete")}
												>
													{deletingId === r.id ? (
														<span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-red-300 border-t-red-700" aria-hidden />
													) : (
														<Trash2 className="h-4 w-4 shrink-0" aria-hidden />
													)}
													{t("kycCatalog.rules.delete")}
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
						resultsLabel={t("kycCatalog.rules.paginationRules")}
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
				<KycRuleDetailModal
					rule={detailRule}
					onClose={() => setDetailRule(null)}
					onSaved={(r) => {
						setDetailRule(r);
						setRules((prev) => prev.map((x) => (x.id === r.id ? r : x)));
					}}
				/>
			) : null}
		</div>
	);
}
