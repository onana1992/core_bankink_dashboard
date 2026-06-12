"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, PanelLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SystemClockWidget from "@/components/admin/SystemClockWidget";
import type { LoginResponse } from "@/types";

function initials(user: NonNullable<LoginResponse["user"]>): string {
	const fn = user.firstName?.trim();
	const ln = user.lastName?.trim();
	if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
	if (fn) return (fn.length >= 2 ? fn.slice(0, 2) : fn[0]).toUpperCase();
	if (ln) return (ln.length >= 2 ? ln.slice(0, 2) : ln[0]).toUpperCase();
	const u = user.username.trim();
	if (u.length >= 2) return u.slice(0, 2).toUpperCase();
	return u.slice(0, 1).toUpperCase() || "?";
}

function userSubtitle(user: NonNullable<LoginResponse["user"]>): string {
	const mail = user.email?.trim();
	if (mail) return mail;
	return `@${user.username}`;
}

export default function AdminTopbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
	const { t } = useTranslation();
	const { logout, user } = useAuth();

	async function handleLogout() {
		try {
			await logout();
		} catch {
			/* ignore */
		}
		window.location.href = "/login";
	}

	return (
		<header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
			<div className="flex h-14 items-center justify-between gap-4 px-4 md:h-[3.75rem] md:px-6">
				<div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
					<button
						type="button"
						aria-label={t("topbar.toggleSidebar")}
						onClick={onToggleSidebar}
						className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
					>
						<PanelLeft className="h-[1.125rem] w-[1.125rem] transition group-hover:scale-105" />
					</button>
					<div className="hidden h-6 w-px shrink-0 bg-slate-200 md:block" aria-hidden />
					<div className="hidden min-w-0 md:block">
						<p className="truncate text-xs font-medium uppercase tracking-wider text-slate-400">{t("topbar.sessionLabel")}</p>
						<p className="truncate text-sm font-semibold text-slate-800">{t("topbar.sessionValue")}</p>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-2 md:gap-3">
					<SystemClockWidget />
					<div className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
					<LanguageSwitcher
						buttonClassName="h-10 gap-2 rounded-xl border-slate-200/90 bg-white px-3 py-0 text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
					/>
					<div className="h-6 w-px bg-slate-200" aria-hidden />

					{user && (
						<DropdownMenu.Root>
							<DropdownMenu.Trigger asChild>
								<button
									type="button"
									aria-label={t("topbar.userMenu")}
									className="flex h-10 max-w-[min(18rem,calc(100vw-10rem))] items-center gap-2 rounded-full border border-slate-200/90 bg-white py-0 pl-0.5 pr-2 text-left shadow-sm outline-none transition hover:border-slate-300 hover:bg-slate-50/90 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 sm:pl-1 sm:pr-2.5"
								>
									<span
										className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-950 text-[11px] font-bold tracking-tight text-white shadow-inner"
										aria-hidden
									>
										{initials(user)}
									</span>
									<span className="hidden min-w-0 flex-1 sm:block">
										<span className="block truncate text-sm font-semibold leading-tight text-slate-900">{user.username}</span>
										<span className="mt-0.5 block truncate text-[11px] leading-tight text-slate-500">{userSubtitle(user)}</span>
									</span>
									<ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" strokeWidth={2} aria-hidden />
								</button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Portal>
								<DropdownMenu.Content
									align="end"
									sideOffset={10}
									className="z-[100] w-[min(calc(100vw-1.5rem),20rem)] overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xl shadow-slate-300/20 outline-none"
								>
									<div className="border-b border-slate-100 px-4 py-3">
										<p className="truncate text-sm font-semibold leading-tight text-slate-900">{user.username}</p>
										<p className="mt-0.5 break-all text-[11px] leading-tight text-slate-500">{userSubtitle(user)}</p>
									</div>
									<div className="p-1.5">
										<DropdownMenu.Item
											className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 outline-none data-[highlighted]:bg-red-50"
											onSelect={(event) => {
												event.preventDefault();
												void handleLogout();
											}}
										>
											<LogOut className="h-4 w-4 shrink-0 opacity-90" />
											{t("topbar.logout")}
										</DropdownMenu.Item>
									</div>
								</DropdownMenu.Content>
							</DropdownMenu.Portal>
						</DropdownMenu.Root>
					)}
				</div>
			</div>
		</header>
	);
}
