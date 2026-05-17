"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
	LayoutDashboard,
	Users,
	Package,
	Wallet,
	BookOpen,
	Repeat,
	FileText,
	ShieldAlert,
	RefreshCcw,
	CalendarCheck,
	KeyRound,
	UserCog,
	CheckCircle,
	ScrollText,
	ShieldCheck,
	Bell,
	BarChart3,
	Settings,
	ChevronRight,
	TrendingUp,
	TrendingDown,
	Move,
	DollarSign,
	Sparkles,
	Settings2,
	RotateCcw,
	Landmark,
	List,
	FolderOpen,
	PlusCircle,
	Calculator,
	ClipboardList,
	Server,
	CreditCard,
	Layers,
	Scale
} from "lucide-react";

const navFocus =
	"outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

/** Styles communs aux entrées de 1ᵉ niveau (liens directs ou groupes avec sous-menu). */
const navTierRootIdle =
	`${navFocus} border-transparent font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-950`;
const navTierRootActive = `${navFocus} border-transparent bg-sky-50/90 font-bold text-slate-950`;

/** Styles des liens imbriqués sous un groupe. */
const navTierNestedIdle =
	`${navFocus} border-transparent font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
const navTierNestedActive =
	`${navFocus} border-transparent bg-sky-50/95 font-semibold text-slate-950 ring-1 ring-sky-200/65`;

/** Icône alignée avec une ligne racine inactive (summary / NavLink tier root). */
const iconRootMuted = "text-slate-700 group-hover:text-slate-950 group-open:text-sky-900";

/** Thème clair : léger halo sur le groupe entier au survol. */
const navGroupClass = "group rounded-lg outline-none transition-colors hover:bg-white/80";
const summaryClass =
	`flex w-full cursor-pointer list-none items-center gap-2.5 rounded-lg py-2 text-[13px] leading-snug [&::-webkit-details-marker]:hidden ` +
	`${navTierRootIdle} group-open:bg-sky-50/90 group-open:text-slate-950`;

function Chevron() {
	return (
		<ChevronRight
			strokeWidth={2}
			aria-hidden
			className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform duration-200 group-open:text-sky-900 group-open:rotate-90"
		/>
	);
}

function NavLink({
	href,
	label,
	icon: Icon,
	collapsed,
	activeMatch = "exact",
	tier = "nested"
}: {
	href: string;
	label: string;
	icon: React.ElementType;
	collapsed?: boolean;
	tier?: "root" | "nested";
	/** `prefix` : actif pour les sous-routes (ex. /aml/alerts/42), sauf /new si le lien parent est la liste. */
	activeMatch?: "exact" | "prefix";
}) {
	const pathname = usePathname();
	const active =
		activeMatch === "prefix"
			? pathname === href || (pathname.startsWith(href + "/") && !pathname.startsWith(href + "/new"))
			: pathname === href;

	const rootWithChevron = tier === "root" && !collapsed;
	const sizing = collapsed
		? "mx-auto flex w-[2.625rem] max-w-full shrink-0 justify-center px-0 py-2.5"
		: rootWithChevron
			? "min-w-0 w-full justify-between px-3 py-2"
			: "min-w-0 justify-start px-3 py-2";
	const interaction = active
		? tier === "root"
			? navTierRootActive
			: navTierNestedActive
		: tier === "root"
			? navTierRootIdle
			: navTierNestedIdle;
	const iconMuted =
		active
			? tier === "root"
				? "text-sky-900"
				: "text-sky-800"
			: tier === "root"
				? iconRootMuted
				: "text-slate-500 group-hover:text-slate-800";

	return (
		<Link
			href={href}
			className={`group relative flex items-center rounded-lg border border-transparent text-[13px] leading-snug ${
				rootWithChevron ? "" : "gap-2.5"
			} ${sizing} ${interaction}`}
			title={collapsed ? label : undefined}
		>
			{rootWithChevron ? (
				<>
					<span className="flex min-w-0 flex-1 items-center gap-2.5">
						<Icon className={`relative z-[1] h-[18px] w-[18px] shrink-0 transition-colors ${iconMuted}`} aria-hidden />
						<span
							className={`relative z-[1] min-w-0 flex-1 truncate ${active ? "text-slate-950" : "text-inherit"}`}
						>
							{label}
						</span>
					</span>
					<Chevron />
				</>
			) : (
				<>
					<Icon className={`relative z-[1] h-[18px] w-[18px] shrink-0 transition-colors ${iconMuted}`} aria-hidden />
					{!collapsed && (
						<span
							className={`relative z-[1] min-w-0 flex-1 truncate ${active ? "text-slate-950" : tier === "nested" ? "text-inherit" : ""}`}
						>
							{label}
						</span>
					)}
				</>
			)}
		</Link>
	);
}

export default function AdminSidebar({ collapsed = false }: { collapsed?: boolean }) {
	const { t } = useTranslation();
	const labelClass = collapsed ? "sr-only" : "";
	const subNavClass = collapsed
		? "mt-1 flex flex-col items-center gap-0.5 pb-1"
		: "mt-1 space-y-0.5 border-l border-slate-200 py-1 pl-3 ml-2.5";
	return (
		<aside
			className={`relative sticky top-0 z-30 hidden shrink-0 flex-col overflow-hidden border-r border-slate-200/95 bg-gradient-to-b from-white via-white to-slate-50 md:flex md:h-dvh md:shadow-[1px_0_0_rgb(226,232,240),12px_0_24px_-12px_rgba(15,23,42,0.06)] ${
				collapsed ? "md:w-[5.25rem]" : "md:w-[17rem]"
			}`}
		>
			<div className="pointer-events-none absolute inset-y-14 right-0 z-10 hidden w-px md:block lg:inset-y-20" aria-hidden>
				<span className="block h-full w-full bg-gradient-to-b from-transparent via-sky-400/20 to-transparent" />
			</div>

			<div className="shrink-0 border-b border-slate-200/90 bg-white/85 px-3 pb-4 pt-5 backdrop-blur-sm md:pt-5">
				{collapsed ? (
					<div className="flex flex-col items-center gap-3">
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 shadow-md shadow-sky-900/15 ring-1 ring-sky-950/10 md:h-10 md:w-10">
							<LayoutDashboard className="h-[22px] w-[22px] text-white opacity-[0.98] md:h-5 md:w-5" aria-hidden strokeWidth={1.85} />
						</div>
						<span className="sr-only">{t("sidebar.coreAdmin")}</span>
					</div>
				) : (
					<div className="flex items-start gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 shadow-md shadow-sky-900/12 ring-1 ring-sky-950/10">
							<LayoutDashboard className="h-5 w-5 text-white opacity-[0.98]" aria-hidden strokeWidth={1.85} />
						</div>
						<div className="min-w-0 flex-1 space-y-1.5">
							<p className="whitespace-normal break-words text-pretty text-[17px] font-bold leading-snug tracking-tight text-slate-950 md:text-[18px]">{t("sidebar.coreAdmin")}</p>
							<p className="whitespace-normal break-words text-pretty text-[11px] font-medium tracking-[0.02em] text-slate-600 leading-snug normal-case md:text-[12px]">
								{t("sidebar.tailwindAdmin")}
							</p>
						</div>
					</div>
				)}
			</div>

			<div
				className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/35 px-2.5 py-4 [scrollbar-width:thin] [scrollbar-color:rgb(203_213_225/0.95)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-white [&::-webkit-scrollbar-thumb]:bg-slate-300/90 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/85"
				data-sidebar-scroll
			>
				<nav className="flex flex-col gap-1 pb-10">
					<NavLink href="/" label={t("sidebar.dashboard")} icon={LayoutDashboard} collapsed={collapsed} tier="root" />

					<details className={navGroupClass}>
						<summary className={`${summaryClass} ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
							<span className="flex min-w-0 items-center gap-2.5">
								<Users className={`h-[18px] w-[18px] shrink-0 ${iconRootMuted}`} aria-hidden />
								<span className={labelClass}>{t("sidebar.clientsKyc")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className={subNavClass}>
							<NavLink href="/customers" label={t("sidebar.clientDossiers")} icon={FolderOpen} collapsed={collapsed} activeMatch="prefix" />
							<NavLink href="/kyc/audit-trail" label={t("sidebar.kycAuditTrail")} icon={ScrollText} collapsed={collapsed} />
							<NavLink href="/kyc/rules" label={t("sidebar.kycRulesCatalog")} icon={Layers} collapsed={collapsed} />
						</div>
					</details>

					<details className={navGroupClass}>
						<summary className={`${summaryClass} ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
							<span className="flex min-w-0 items-center gap-2.5">
								<Scale className={`h-[18px] w-[18px] shrink-0 ${iconRootMuted}`} aria-hidden />
								<span className={labelClass}>{t("sidebar.amlMenu")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className={subNavClass}>
							<NavLink
								href="/aml/alerts"
								label={t("sidebar.amlAlerts")}
								icon={ShieldAlert}
								collapsed={collapsed}
								activeMatch="prefix"
							/>
							<NavLink href="/aml/rules" label={t("sidebar.amlRules")} icon={Layers} collapsed={collapsed} />
							<NavLink
								href="/aml/cases"
								label={t("sidebar.amlCases")}
								icon={FileText}
								collapsed={collapsed}
								activeMatch="prefix"
							/>
							<NavLink href="/aml/audit-trail" label={t("sidebar.amlAuditTrail")} icon={ScrollText} collapsed={collapsed} />
							<NavLink href="/compliance/vigilance" label={t("sidebar.complianceVigilance")} icon={RefreshCcw} collapsed={collapsed} />
						</div>
					</details>

					<NavLink href="/products" label={t("sidebar.productCatalog")} icon={Package} collapsed={collapsed} tier="root" />
					<NavLink href="/payment-methods" label={t("sidebar.paymentMethodsCatalog")} icon={CreditCard} collapsed={collapsed} tier="root" />

					<details className={navGroupClass}>
						<summary className={`${summaryClass} ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
							<span className="flex min-w-0 items-center gap-2.5">
								<Landmark className={`h-[18px] w-[18px] shrink-0 ${iconRootMuted}`} aria-hidden />
								<span className={labelClass}>{t("sidebar.loans")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className={subNavClass}>
							<NavLink href="/loans" label={t("sidebar.loansList")} icon={List} collapsed={collapsed} />
							<NavLink href="/loans/applications" label={t("sidebar.loanApplications")} icon={ClipboardList} collapsed={collapsed} />
							<NavLink href="/loans/new" label={t("sidebar.openLoan")} icon={PlusCircle} collapsed={collapsed} />
							<NavLink href="/loans/simulate" label={t("sidebar.loanSimulation")} icon={Calculator} collapsed={collapsed} />
						</div>
					</details>

					<details className={navGroupClass}>
						<summary className={`${summaryClass} ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
							<span className="flex min-w-0 items-center gap-2.5">
								<BookOpen className={`h-[18px] w-[18px] shrink-0 ${iconRootMuted}`} aria-hidden />
								<span className={labelClass}>{t("sidebar.accountsLedger")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className={subNavClass}>
							<NavLink href="/accounts" label={t("sidebar.customerAccounts")} icon={Wallet} collapsed={collapsed} />
							<NavLink href="/gl" label={t("sidebar.glAccounts")} icon={BookOpen} collapsed={collapsed} />
							<NavLink href="/chart-of-accounts" label={t("sidebar.chartOfAccounts")} icon={FileText} collapsed={collapsed} />
						</div>
					</details>

					<details className={navGroupClass}>
						<summary className={`${summaryClass} ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
							<span className="flex min-w-0 items-center gap-2.5">
								<Repeat className={`h-[18px] w-[18px] shrink-0 ${iconRootMuted}`} aria-hidden />
								<span className={labelClass}>{t("sidebar.transactions")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className={subNavClass}>
							<NavLink href="/transactions" label={t("sidebar.allTransactions")} icon={Repeat} collapsed={collapsed} />
							<NavLink href="/transactions/deposit" label={t("transaction.list.types.deposits")} icon={TrendingUp} collapsed={collapsed} />
							<NavLink href="/transactions/withdrawal" label={t("transaction.list.types.withdrawals")} icon={TrendingDown} collapsed={collapsed} />
							<NavLink href="/transactions/transfer" label={t("transaction.list.types.transfers")} icon={Move} collapsed={collapsed} />
							<NavLink href="/transactions/fee" label={t("transaction.list.types.fees")} icon={DollarSign} collapsed={collapsed} />
							<NavLink href="/transactions/interest" label={t("transaction.list.types.interests")} icon={Sparkles} collapsed={collapsed} />
							<NavLink href="/transactions/adjustment" label={t("transaction.list.types.adjustments")} icon={Settings2} collapsed={collapsed} />
							<NavLink href="/transactions/reversal" label={t("transaction.list.types.reversals")} icon={RotateCcw} collapsed={collapsed} />
							<NavLink href="/journal-batches" label={t("sidebar.journal")} icon={Repeat} collapsed={collapsed} />
							<NavLink href="/holds" label={t("sidebar.holds")} icon={CheckCircle} collapsed={collapsed} />
						</div>
					</details>

					<details className={navGroupClass}>
						<summary className={`${summaryClass} ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
							<span className="flex min-w-0 items-center gap-2.5">
								<FileText className={`h-[18px] w-[18px] shrink-0 ${iconRootMuted}`} aria-hidden />
								<span className={labelClass}>{t("sidebar.statementsExtracts")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className={subNavClass}>
							<NavLink href="/statements" label={t("sidebar.accountStatements")} icon={FileText} collapsed={collapsed} />
							<NavLink href="/exports" label={t("sidebar.pdfCsvExports")} icon={FileText} collapsed={collapsed} />
						</div>
					</details>

					<details className={navGroupClass}>
						<summary className={`${summaryClass} ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
							<span className="flex min-w-0 items-center gap-2.5">
								<RefreshCcw className={`h-[18px] w-[18px] shrink-0 ${iconRootMuted}`} aria-hidden />
								<span className={labelClass}>{t("sidebar.reconciliationClosure")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className={subNavClass}>
							<NavLink href="/reconciliation" label={t("sidebar.reconciliation")} icon={RefreshCcw} collapsed={collapsed} />
							<NavLink href="/closures" label={t("sidebar.closures")} icon={CalendarCheck} collapsed={collapsed} />
							<NavLink href="/balance-snapshots" label={t("sidebar.balanceSnapshots")} icon={Layers} collapsed={collapsed} />
						</div>
					</details>

					<details className={navGroupClass}>
						<summary className={`${summaryClass} ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
							<span className="flex min-w-0 items-center gap-2.5">
								<UserCog className={`h-[18px] w-[18px] shrink-0 ${iconRootMuted}`} aria-hidden />
								<span className={labelClass}>{t("sidebar.governance")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className={subNavClass}>
							<NavLink href="/users" label={t("sidebar.users")} icon={Users} collapsed={collapsed} />
							<NavLink href="/roles" label={t("sidebar.roles")} icon={KeyRound} collapsed={collapsed} />
							<NavLink href="/permissions" label={t("sidebar.permissions")} icon={ShieldCheck} collapsed={collapsed} />
							<NavLink href="/services" label={t("sidebar.services")} icon={Server} collapsed={collapsed} />
							<NavLink href="/audit" label={t("sidebar.auditCompliance")} icon={ScrollText} collapsed={collapsed} />
						</div>
					</details>

					<details className={navGroupClass}>
						<summary className={`${summaryClass} ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
							<span className="flex min-w-0 items-center gap-2.5">
								<Bell className={`h-[18px] w-[18px] shrink-0 ${iconRootMuted}`} aria-hidden />
								<span className={labelClass}>{t("sidebar.notifications")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className={subNavClass}>
							<NavLink href="/notifications/templates" label={t("sidebar.templates")} icon={Bell} collapsed={collapsed} />
							<NavLink href="/notifications/outbox" label={t("sidebar.outbox")} icon={Bell} collapsed={collapsed} />
						</div>
					</details>

					<details className={navGroupClass}>
						<summary className={`${summaryClass} ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
							<span className="flex min-w-0 items-center gap-2.5">
								<BarChart3 className={`h-[18px] w-[18px] shrink-0 ${iconRootMuted}`} aria-hidden />
								<span className={labelClass}>{t("sidebar.reports")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className={subNavClass}>
							<NavLink href="/reports/activity" label={t("sidebar.activity")} icon={BarChart3} collapsed={collapsed} />
							<NavLink href="/reports/balances" label={t("sidebar.balances")} icon={BarChart3} collapsed={collapsed} />
							<NavLink href="/reports/fees-interest" label={t("sidebar.feesInterest")} icon={BarChart3} collapsed={collapsed} />
						</div>
					</details>

					<div className="mt-3 border-t border-slate-200/95 bg-white/70 pt-4 backdrop-blur-[2px]">
						<div
							className={`flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 ${collapsed ? "justify-center px-2" : ""}`}
							role="presentation"
						>
							<Settings className="h-[17px] w-[17px] shrink-0 text-slate-600" aria-hidden />
							<span className={labelClass}>{t("sidebar.system")}</span>
						</div>
					</div>
				</nav>
			</div>
		</aside>
	);
}
