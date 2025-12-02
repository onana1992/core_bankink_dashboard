"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
	LayoutDashboard,
	Users,
	IdCard,
	Package,
	BadgePercent,
	Banknote,
	Wallet,
	BookOpen,
	Repeat,
	ArrowLeftRight,
	Percent,
	FileText,
	ShieldAlert,
	Gauge,
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
	ChevronRight
} from "lucide-react";

function Chevron() {
	return (
		<ChevronRight className="h-4 w-4 text-gray-700 transition-transform group-open:rotate-90" />
	);
}

function NavLink({
	href,
	label,
	icon: Icon,
	collapsed
}: {
	href: string;
	label: string;
	icon: React.ElementType;
	collapsed?: boolean;
}) {
	const pathname = usePathname();
	const active = href === "/" ? pathname === href : pathname.startsWith(href);
	return (
		<Link
			href={href}
			className={
				"flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-black transition-colors " +
				(active ? "bg-gray-200" : "hover:bg-gray-100")
			}
			title={collapsed ? label : undefined}
		>
			<Icon className={active ? "h-4 w-4 text-gray-900" : "h-4 w-4 text-gray-700"} />
			{!collapsed && <span>{label}</span>}
		</Link>
	);
}

export default function AdminSidebar({ collapsed = false }: { collapsed?: boolean }) {
	const { t } = useTranslation();
	const labelClass = collapsed ? "hidden" : "";
	return (
		<aside className={`hidden md:flex ${collapsed ? "md:w-20" : "md:w-64"} border-r bg-white min-h-screen`}>
			<div className="w-full p-4 overflow-y-auto">
				<div className="px-2 py-3">
					<div className={`text-xl font-semibold ${labelClass}`}>{t("sidebar.coreAdmin")}</div>
					<div className={`text-xs text-gray-500 ${labelClass}`}>{t("sidebar.tailwindAdmin")}</div>
				</div>

				<nav className="mt-4 space-y-2">
					<NavLink href="/" label={t("sidebar.dashboard")} icon={LayoutDashboard} collapsed={collapsed} />

					<details className="group rounded-md" open>
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<Users className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>{t("sidebar.clientsKyc")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/customers" label={t("sidebar.clients")} icon={Users} collapsed={collapsed} />
							<NavLink href="/kyc" label={t("sidebar.kycChecks")} icon={IdCard} collapsed={collapsed} />
						</div>
					</details>

					<NavLink href="/products" label={t("sidebar.productCatalog")} icon={Package} collapsed={collapsed} />


					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<BookOpen className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>{t("sidebar.accountsLedger")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/accounts" label={t("sidebar.customerAccounts")} icon={Wallet} collapsed={collapsed} />
							<NavLink href="/gl" label={t("sidebar.glAccounts")} icon={BookOpen} collapsed={collapsed} />
							<NavLink href="/chart-of-accounts" label={t("sidebar.chartOfAccounts")} icon={FileText} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<Repeat className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>{t("sidebar.transactions")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/transactions/journal" label={t("sidebar.journal")} icon={Repeat} collapsed={collapsed} />
							<NavLink href="/transfers" label={t("sidebar.transfers")} icon={ArrowLeftRight} collapsed={collapsed} />
							<NavLink href="/holds" label={t("sidebar.holds")} icon={CheckCircle} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<ArrowLeftRight className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>{t("sidebar.payments")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/payments/outgoing" label={t("sidebar.outgoingTransfers")} icon={ArrowLeftRight} collapsed={collapsed} />
							<NavLink href="/payments/incoming" label={t("sidebar.incomingTransfers")} icon={ArrowLeftRight} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<Percent className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>{t("sidebar.interestFees")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/interest/accruals" label={t("sidebar.calculationAccrual")} icon={Percent} collapsed={collapsed} />
							<NavLink href="/fees/apply" label={t("sidebar.feeApplication")} icon={Banknote} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<FileText className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>{t("sidebar.statementsExtracts")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/statements" label={t("sidebar.accountStatements")} icon={FileText} collapsed={collapsed} />
							<NavLink href="/exports" label={t("sidebar.pdfCsvExports")} icon={FileText} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<ShieldAlert className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>{t("sidebar.riskCompliance")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/risk/limits" label={t("sidebar.limits")} icon={Gauge} collapsed={collapsed} />
							<NavLink href="/risk/sanctions" label={t("sidebar.sanctionsWatchlists")} icon={ShieldAlert} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<RefreshCcw className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>{t("sidebar.reconciliationClosure")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/reconciliation" label={t("sidebar.reconciliation")} icon={RefreshCcw} collapsed={collapsed} />
							<NavLink href="/close/day" label={t("sidebar.dailyClosure")} icon={CalendarCheck} collapsed={collapsed} />
							<NavLink href="/close/month" label={t("sidebar.monthlyClosure")} icon={CalendarCheck} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<UserCog className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>{t("sidebar.governance")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/users" label={t("common.users")} icon={Users} collapsed={collapsed} />
							<NavLink href="/roles" label={t("sidebar.roles")} icon={KeyRound} collapsed={collapsed} />
							<NavLink href="/approvals" label={t("sidebar.approvals")} icon={CheckCircle} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<ScrollText className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>{t("sidebar.auditCompliance")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/audit/events" label={t("sidebar.auditEvents")} icon={ScrollText} collapsed={collapsed} />
							<NavLink href="/audit/access" label={t("sidebar.accessLogs")} icon={ShieldCheck} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<Bell className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>{t("sidebar.notifications")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/notifications/templates" label={t("sidebar.templates")} icon={Bell} collapsed={collapsed} />
							<NavLink href="/notifications/outbox" label={t("sidebar.outbox")} icon={Bell} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<BarChart3 className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>{t("sidebar.reports")}</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/reports/activity" label={t("sidebar.activity")} icon={BarChart3} collapsed={collapsed} />
							<NavLink href="/reports/balances" label={t("sidebar.balances")} icon={BarChart3} collapsed={collapsed} />
							<NavLink href="/reports/fees-interest" label={t("sidebar.feesInterest")} icon={BarChart3} collapsed={collapsed} />
						</div>
					</details>

					<div className="pt-2">
						<div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-2">
							<Settings className="h-4 w-4 text-gray-700" />
							{!collapsed && <span>{t("sidebar.system")}</span>}
						</div>
					</div>
				</nav>
			</div>
		</aside>
	);
}
