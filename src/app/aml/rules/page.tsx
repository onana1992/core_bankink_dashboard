"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { amlApi } from "@/lib/api";
import type { AmlRuleDefinitionResponse, AmlRuleVersionResponse, AmlRuleCategory } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

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

export default function AmlRulesPage() {
	const { t } = useTranslation();
	const [rules, setRules] = useState<AmlRuleDefinitionResponse[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const [versions, setVersions] = useState<Record<number, AmlRuleVersionResponse[]>>({});
	const [loadingVersions, setLoadingVersions] = useState<number | null>(null);

	const [showCreate, setShowCreate] = useState(false);
	const [newCode, setNewCode] = useState("");
	const [newName, setNewName] = useState("");
	const [newCategory, setNewCategory] = useState<AmlRuleCategory>("AMOUNT");
	const [newDesc, setNewDesc] = useState("");

	const [publishFor, setPublishFor] = useState<number | null>(null);
	const [pubFrom, setPubFrom] = useState(() => new Date().toISOString().slice(0, 10));
	const [pubJson, setPubJson] = useState("{}");
	const [pubEnabled, setPubEnabled] = useState(true);

	const stats = useMemo(() => {
		const categories = new Set(rules.map((r) => r.category));
		return {
			total: rules.length,
			categories: categories.size,
			amount: rules.filter((r) => r.category === "AMOUNT").length,
			custom: rules.filter((r) => r.category === "CUSTOM").length
		};
	}, [rules]);

	async function loadRules() {
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
	}

	useEffect(() => {
		loadRules();
	}, []);

	async function toggleExpand(ruleId: number) {
		if (expandedId === ruleId) {
			setExpandedId(null);
			return;
		}
		setExpandedId(ruleId);
		if (!versions[ruleId]) {
			setLoadingVersions(ruleId);
			try {
				const v = await amlApi.listRuleVersions(ruleId);
				setVersions((prev) => ({ ...prev, [ruleId]: v ?? [] }));
			} catch {
				setVersions((prev) => ({ ...prev, [ruleId]: [] }));
			} finally {
				setLoadingVersions(null);
			}
		}
	}

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
			setShowCreate(false);
			setNewCode("");
			setNewName("");
			setNewDesc("");
			await loadRules();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Error");
		}
	}

	async function publishVersion(e: React.FormEvent) {
		e.preventDefault();
		if (publishFor == null) return;
		const ruleDefinitionId = publishFor;
		setError(null);
		try {
			await amlApi.publishRuleVersion(ruleDefinitionId, {
				effectiveFrom: pubFrom,
				parametersJson: pubJson,
				enabled: pubEnabled
			});
			setPublishFor(null);
			setPubJson("{}");
			const v = await amlApi.listRuleVersions(ruleDefinitionId);
			setVersions((prev) => ({ ...prev, [ruleDefinitionId]: v ?? [] }));
			await loadRules();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Error");
		}
	}

	async function toggleVersionEnabled(versionId: number, current: boolean) {
		setError(null);
		try {
			await amlApi.patchRuleVersion(versionId, !current);
			await loadRules();
			if (expandedId != null) {
				const v = await amlApi.listRuleVersions(expandedId);
				setVersions((prev) => ({ ...prev, [expandedId]: v ?? [] }));
			}
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Error");
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("aml.rules.title")}</h1>
					<p className="text-gray-600 mt-1">{t("aml.rules.subtitle")}</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button type="button" variant="outline" className="flex items-center gap-2" onClick={() => void loadRules()} disabled={loading}>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						{t("common.refresh")}
					</Button>
					<Button type="button" variant={showCreate ? "secondary" : "default"} onClick={() => setShowCreate((s) => !s)}>
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
							<Input className="h-10" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
						</div>
					</div>
					<Button type="submit">{t("aml.rules.submitCreate")}</Button>
				</form>
			)}

			{publishFor != null && (
				<form onSubmit={publishVersion} className="bg-amber-50/80 p-6 rounded-xl shadow-sm border border-amber-200 space-y-4">
					<h2 className="text-lg font-semibold text-gray-900">
						{t("aml.rules.publishVersion")} #{publishFor}
					</h2>
					<div className="grid sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.rules.effectiveFrom")}</label>
							<Input type="date" className="h-10" value={pubFrom} onChange={(e) => setPubFrom(e.target.value)} required />
						</div>
						<div className="flex items-end pb-1">
							<label className="flex items-center gap-2 text-sm text-gray-700">
								<input type="checkbox" className="rounded border-gray-300" checked={pubEnabled} onChange={(e) => setPubEnabled(e.target.checked)} />
								{t("aml.rules.enabled")}
							</label>
						</div>
						<div className="sm:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">parametersJson</label>
							<textarea
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
								value={pubJson}
								onChange={(e) => setPubJson(e.target.value)}
								spellCheck={false}
							/>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button type="submit">{t("aml.rules.publish")}</Button>
						<Button type="button" variant="outline" onClick={() => setPublishFor(null)}>
							{t("aml.actions.cancel")}
						</Button>
					</div>
				</form>
			)}

			{loading ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
					<p className="mt-4 text-gray-600">{t("aml.loading")}</p>
				</div>
			) : rules.length === 0 ? (
				<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
					<p className="text-gray-500 text-lg font-medium">{t("aml.empty")}</p>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.rules.code")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.rules.name")}</th>
									<th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.rules.category")}</th>
									<th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t("aml.table.actions")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 text-sm">
								{rules.map((r) => (
									<Fragment key={r.id}>
										<tr className="hover:bg-gray-50 transition-colors">
											<td className="px-6 py-4 font-mono text-xs text-gray-900">{r.code}</td>
											<td className="px-6 py-4 text-gray-900">{r.name}</td>
											<td className="px-6 py-4 text-gray-700">{r.category}</td>
											<td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
												<Button type="button" variant="outline" size="sm" onClick={() => void toggleExpand(r.id)}>
													{expandedId === r.id ? t("aml.rules.hideVersions") : t("aml.rules.versions")}
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => {
														setPublishFor(r.id);
														setPubFrom(new Date().toISOString().slice(0, 10));
													}}
												>
													{t("aml.rules.newVersion")}
												</Button>
											</td>
										</tr>
										{expandedId === r.id && (
											<tr className="bg-gray-50">
												<td colSpan={4} className="px-6 py-4">
													{loadingVersions === r.id ? (
														<p className="text-gray-600">{t("aml.loading")}</p>
													) : (
														<ul className="space-y-2 text-xs">
															{(versions[r.id] ?? []).map((v) => (
																<li
																	key={v.id}
																	className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
																>
																	<span className="text-gray-800">
																		v{v.version} — {v.effectiveFrom}
																		{v.effectiveTo ? ` → ${v.effectiveTo}` : ""} — {v.enabled ? t("aml.rules.on") : t("aml.rules.off")}
																	</span>
																	<Button type="button" size="sm" variant="outline" onClick={() => void toggleVersionEnabled(v.id, v.enabled)}>
																		{v.enabled ? t("aml.rules.disable") : t("aml.rules.enable")}
																	</Button>
																</li>
															))}
														</ul>
													)}
												</td>
											</tr>
										)}
									</Fragment>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
