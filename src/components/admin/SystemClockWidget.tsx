"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Clock, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { systemClockApi } from "@/lib/api";
import type { SystemClockStatus } from "@/types/systemClock";
import { cn } from "@/lib/utils";

const DEFAULT_TIME_ZONE = "America/Toronto";

function toInputValue(iso: string | undefined): string {
	if (!iso) return "";
	const match = iso.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
	return match ? match[1] : iso.slice(0, 19);
}

function toApiDateTime(input: string): string {
	if (!input) return "";
	return input.length === 16 ? `${input}:00` : input;
}

function wallClockNowIso(timeZone: string): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false
	}).formatToParts(new Date());
	const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00";
	return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}:${pick("second")}`;
}

function formatDisplay(iso: string, locale: string, timeZone: string): string {
	try {
		const hasOffset = /[Zz]$|[+-]\d{2}:\d{2}$/.test(iso);
		const d = new Date(hasOffset ? iso : `${iso}Z`);
		if (Number.isNaN(d.getTime())) {
			const wall = iso.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
			return wall ? wall[1].replace("T", " ") : iso;
		}
		const loc = locale === "fr" ? "fr-FR" : "en-US";
		return d.toLocaleString(loc, {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
			timeZone
		});
	} catch {
		return iso;
	}
}

export default function SystemClockWidget() {
	const { t, i18n } = useTranslation();
	const { isAuthenticated, loading: authLoading } = useAuth();
	const [status, setStatus] = useState<SystemClockStatus | null>(null);
	const [inputValue, setInputValue] = useState("");
	const [enabled, setEnabled] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [offline, setOffline] = useState(false);
	const [localTick, setLocalTick] = useState(wallClockNowIso(DEFAULT_TIME_ZONE));
	const displayZone = status?.zone ?? DEFAULT_TIME_ZONE;

	const load = useCallback(
		async (silent = true) => {
			if (!isAuthenticated || authLoading) return;
			try {
				const data = await systemClockApi.getStatus({ silent });
				if (!data) {
					setOffline(true);
					return;
				}
				setStatus(data);
				setEnabled(data.enabled);
				setInputValue(toInputValue(data.effectiveDateTime));
				setOffline(false);
				setError(null);
			} catch (e) {
				setOffline(true);
				if (!silent) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}
		},
		[isAuthenticated, authLoading]
	);

	useEffect(() => {
		if (authLoading || !isAuthenticated) return;
		void load(true);
		const id = window.setInterval(() => void load(true), 5000);
		return () => window.clearInterval(id);
	}, [load, authLoading, isAuthenticated]);

	useEffect(() => {
		const id = window.setInterval(() => setLocalTick(wallClockNowIso(displayZone)), 1000);
		return () => window.clearInterval(id);
	}, [displayZone]);

	const displayTime = useMemo(() => {
		const iso = status?.effectiveDateTime ?? localTick;
		return formatDisplay(iso, i18n.language || "fr", displayZone);
	}, [status, localTick, i18n.language, displayZone]);

	async function handleApply() {
		setLoading(true);
		setError(null);
		try {
			const data = await systemClockApi.update({
				enabled: true,
				dateTime: toApiDateTime(inputValue)
			});
			if (!data) throw new Error(t("systemClock.unavailable"));
			setStatus(data);
			setEnabled(data.enabled);
			setInputValue(toInputValue(data.effectiveDateTime));
			setOffline(false);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}

	async function handleToggle(next: boolean) {
		setLoading(true);
		setError(null);
		try {
			const data = await systemClockApi.update({
				enabled: next,
				dateTime: next ? toApiDateTime(inputValue) : undefined
			});
			if (!data) throw new Error(t("systemClock.unavailable"));
			setStatus(data);
			setEnabled(data.enabled);
			setInputValue(toInputValue(data.effectiveDateTime));
			setOffline(false);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}

	async function handleReset() {
		setLoading(true);
		setError(null);
		try {
			const data = await systemClockApi.reset();
			if (!data) throw new Error(t("systemClock.unavailable"));
			setStatus(data);
			setEnabled(false);
			setInputValue(toInputValue(data.systemDateTime));
			setOffline(false);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}

	if (authLoading || !isAuthenticated) {
		return null;
	}

	const simulated = status?.simulated ?? false;

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<button
					type="button"
					aria-label={t("systemClock.ariaLabel")}
					className={cn(
						"flex h-10 max-w-[14rem] items-center gap-2 rounded-xl border px-2.5 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 sm:max-w-[18rem] sm:px-3",
						simulated
							? "border-amber-300/90 bg-amber-50 text-amber-950 hover:border-amber-400 hover:bg-amber-100/80"
							: offline
								? "border-slate-200/90 bg-slate-50 text-slate-600"
								: "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
					)}
				>
					<Clock className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
					<span className="min-w-0 flex-1 truncate font-mono text-xs sm:text-[13px]">{displayTime}</span>
					{simulated && (
						<span className="hidden rounded-full bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 sm:inline">
							{t("systemClock.simulatedBadge")}
						</span>
					)}
				</button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					sideOffset={10}
					className="z-[100] w-[min(calc(100vw-1.5rem),22rem)] rounded-xl border border-slate-200/90 bg-white p-4 shadow-xl shadow-slate-300/20 outline-none"
					onCloseAutoFocus={(e) => e.preventDefault()}
				>
					<div className="space-y-4">
						<div>
							<p className="text-sm font-semibold text-slate-900">{t("systemClock.title")}</p>
							<p className="mt-0.5 text-xs text-slate-500">{t("systemClock.subtitle")}</p>
						</div>

						{offline && (
							<p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
								{t("systemClock.offlineHint")}
							</p>
						)}

						<label className="block space-y-1.5">
							<span className="text-xs font-medium text-slate-600">{t("systemClock.dateTimeLabel")}</span>
							<input
								type="datetime-local"
								step={1}
								value={inputValue}
								onChange={(e) => setInputValue(e.target.value)}
								onKeyDown={(e) => e.stopPropagation()}
								onClick={(e) => e.stopPropagation()}
								className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
							/>
						</label>

						<label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
							<span className="text-sm font-medium text-slate-800">{t("systemClock.enabledLabel")}</span>
							<input
								type="checkbox"
								checked={enabled}
								disabled={loading}
								onChange={(e) => void handleToggle(e.target.checked)}
								onClick={(e) => e.stopPropagation()}
								className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
							/>
						</label>

						{status && (
							<div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs text-slate-600">
								<p>
									<span className="font-medium text-slate-700">{t("systemClock.systemTime")}:</span>{" "}
									<span className="font-mono">{formatDisplay(status.systemDateTime, i18n.language || "fr", displayZone)}</span>
								</p>
								<p className="mt-1">
									<span className="font-medium text-slate-700">{t("systemClock.zone")}:</span> {status.zone}
								</p>
							</div>
						)}

						{error && <p className="text-xs text-red-600">{error}</p>}

						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								disabled={loading || !inputValue}
								onClick={(e) => {
									e.preventDefault();
									void handleApply();
								}}
								className="inline-flex flex-1 items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{t("systemClock.apply")}
							</button>
							<button
								type="button"
								disabled={loading}
								onClick={(e) => {
									e.preventDefault();
									void handleReset();
								}}
								className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<RotateCcw className="h-3.5 w-3.5" aria-hidden />
								{t("systemClock.reset")}
							</button>
						</div>
					</div>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
