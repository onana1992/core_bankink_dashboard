"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { amlApi } from "@/lib/api";
import type { AmlCaseDetailResponse, AmlCaseStatus } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const CASE_STATUSES: AmlCaseStatus[] = ["OPEN", "IN_REVIEW", "ESCALATED", "CLOSED"];

const SELECT_CLASS =
	"w-full h-10 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

export default function AmlCaseDetailPage() {
	const { t } = useTranslation();
	const params = useParams();
	const id = params?.id as string;
	const [c, setC] = useState<AmlCaseDetailResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [noteBody, setNoteBody] = useState("");
	const [nextStatus, setNextStatus] = useState<AmlCaseStatus | "">("");
	const [statusComment, setStatusComment] = useState("");
	const [outcomeCode, setOutcomeCode] = useState("");
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		setError(null);
		try {
			const data = await amlApi.getCase(id);
			setC(data);
			setNextStatus(data.status);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
			setC(null);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		load();
	}, [load]);

	async function addNote(e: React.FormEvent) {
		e.preventDefault();
		if (!noteBody.trim()) return;
		setBusy(true);
		try {
			await amlApi.addCaseNote(id, { body: noteBody.trim() });
			setNoteBody("");
			await load();
		} finally {
			setBusy(false);
		}
	}

	async function patchStatus(e: React.FormEvent) {
		e.preventDefault();
		if (!nextStatus || !c || nextStatus === c.status) return;
		setBusy(true);
		try {
			await amlApi.patchCaseStatus(id, {
				status: nextStatus,
				comment: statusComment.trim() || undefined,
				outcomeCode: outcomeCode.trim() || undefined
			});
			setStatusComment("");
			await load();
		} finally {
			setBusy(false);
		}
	}

	async function declaration() {
		setBusy(true);
		setError(null);
		try {
			const r = await amlApi.createDeclaration(id);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("show-toast", {
						detail: { message: `${t("aml.cases.declarationCreated")} #${r.id}`, type: "success" }
					})
				);
			}
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Error");
		} finally {
			setBusy(false);
		}
	}

	if (loading && !c) {
		return (
			<div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
				<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
				<p className="mt-4 text-gray-600">{t("aml.loading")}</p>
			</div>
		);
	}

	if (!c) {
		return (
			<div className="space-y-6 max-w-2xl">
				{error && (
					<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
						<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{error}
					</div>
				)}
				<Link href="/aml/cases" className="text-blue-600 hover:text-blue-800 hover:underline text-sm inline-flex items-center gap-1">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					{t("aml.cases.back")}
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<Link href="/aml/cases" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mb-3 inline-flex items-center gap-1">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						{t("aml.cases.back")}
					</Link>
					<h1 className="text-3xl font-bold text-gray-900 font-mono tracking-tight">{c.publicRef}</h1>
					<p className="text-gray-600 mt-2">
						{t("aml.filters.status")}: <span className="font-medium text-gray-900">{c.status}</span> — {t("aml.detail.client")}{" "}
						<Link href={`/customers/${c.clientId}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
							{c.clientId}
						</Link>
					</p>
				</div>
				<Button type="button" variant="outline" className="flex items-center gap-2 shrink-0 h-10" onClick={() => void load()} disabled={loading || busy}>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					{t("common.refresh")}
				</Button>
			</div>

			{error && (
				<div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded flex items-center gap-2">
					<svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			)}

			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
				<h2 className="text-lg font-semibold text-gray-900 mb-3">{t("aml.cases.linkedAlerts")}</h2>
				<ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
					{c.alertIds.map((aid) => (
						<li key={aid} className="px-4 py-3 text-sm hover:bg-gray-50">
							<Link href={`/aml/alerts/${aid}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
								{t("aml.table.ref")} #{aid}
							</Link>
						</li>
					))}
				</ul>
			</div>

			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
				<h2 className="text-lg font-semibold text-gray-900">{t("aml.cases.notes")}</h2>
				<ul className="space-y-3 text-sm">
					{(c.notes ?? []).length === 0 ? (
						<li className="text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-lg">{t("aml.empty")}</li>
					) : (
						(c.notes ?? []).map((n) => (
							<li key={n.id} className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
								<div className="text-xs text-gray-500">
									{t("aml.cases.author")} {n.authorUserId} — {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
								</div>
								<p className="mt-2 whitespace-pre-wrap text-gray-900">{n.body}</p>
							</li>
						))
					)}
				</ul>
				<form onSubmit={addNote} className="space-y-3 pt-4 border-t border-gray-100">
					<textarea
						className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[88px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
						value={noteBody}
						onChange={(e) => setNoteBody(e.target.value)}
						placeholder={t("aml.cases.notePlaceholder")}
						aria-label={t("aml.cases.notePlaceholder")}
					/>
					<Button type="submit" size="sm" disabled={busy}>
						{t("aml.cases.addNote")}
					</Button>
				</form>
			</div>

			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
				<h2 className="text-lg font-semibold text-gray-900">{t("aml.cases.statusSection")}</h2>
				<form onSubmit={patchStatus} className="flex flex-wrap gap-3 items-end">
					<div className="min-w-[160px]">
						<label className="block text-sm font-medium text-gray-700 mb-2">{t("aml.filters.status")}</label>
						<select className={SELECT_CLASS} value={nextStatus || c.status} onChange={(e) => setNextStatus(e.target.value as AmlCaseStatus)}>
							{CASE_STATUSES.map((s) => (
								<option key={s} value={s}>
									{s}
								</option>
							))}
						</select>
					</div>
					<Input
						className="flex-1 min-w-[180px] h-10"
						placeholder={t("aml.cases.statusComment")}
						value={statusComment}
						onChange={(e) => setStatusComment(e.target.value)}
					/>
					<div className="flex flex-col gap-1">
						<Input className="w-40 h-10" placeholder={t("aml.cases.outcomeCode")} value={outcomeCode} onChange={(e) => setOutcomeCode(e.target.value)} />
						<p className="text-xs text-gray-500 max-w-xs">{t("aml.cases.outcomeCodeHint")}</p>
					</div>
					<Button type="submit" variant="outline" className="h-10" disabled={busy}>
						{t("aml.cases.updateStatus")}
					</Button>
				</form>
			</div>

			<div className="bg-amber-50/90 p-6 rounded-xl shadow-sm border border-amber-200">
				<h2 className="text-lg font-semibold text-gray-900">{t("aml.cases.declarationSection")}</h2>
				<p className="text-sm text-gray-700 mt-2 mb-4">{t("aml.cases.declarationHint")}</p>
				<Button type="button" variant="secondary" onClick={declaration} disabled={busy}>
					{t("aml.cases.createDeclaration")}
				</Button>
			</div>
		</div>
	);
}
