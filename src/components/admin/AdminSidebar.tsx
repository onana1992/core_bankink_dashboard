"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
	const labelClass = collapsed ? "hidden" : "";
	return (
		<aside className={`hidden md:flex ${collapsed ? "md:w-20" : "md:w-64"} border-r bg-white min-h-screen`}>
			<div className="w-full p-4 overflow-y-auto">
				<div className="px-2 py-3">
					<div className={`text-xl font-semibold ${labelClass}`}>Core Admin</div>
					<div className={`text-xs text-gray-500 ${labelClass}`}>Tailwind CSS Admin</div>
				</div>

				<nav className="mt-4 space-y-2">
					<NavLink href="/" label="Dashboard" icon={LayoutDashboard} collapsed={collapsed} />

					<details className="group rounded-md" open>
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<Users className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>Clients & KYC</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/customers" label="Clients" icon={Users} collapsed={collapsed} />
							<NavLink href="/kyc" label="KYC Checks" icon={IdCard} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<Package className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>Catalogue produits</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/products" label="Produits" icon={Package} collapsed={collapsed} />
							<NavLink href="/pricing" label="Règles de tarification" icon={BadgePercent} collapsed={collapsed} />
							<NavLink href="/fees" label="Frais" icon={Banknote} collapsed={collapsed} />
							<NavLink href="/interest-schemes" label="Schémas d’intérêts" icon={Percent} collapsed={collapsed} />
							<NavLink href="/limits" label="Profils de limites" icon={Gauge} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<BookOpen className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>Comptes & Grand Livre</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/accounts" label="Comptes clients" icon={Wallet} collapsed={collapsed} />
							<NavLink href="/gl" label="Comptes GL" icon={BookOpen} collapsed={collapsed} />
							<NavLink href="/chart-of-accounts" label="Plan comptable" icon={FileText} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<Repeat className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>Transactions</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/transactions/journal" label="Journal" icon={Repeat} collapsed={collapsed} />
							<NavLink href="/transfers" label="Transferts" icon={ArrowLeftRight} collapsed={collapsed} />
							<NavLink href="/holds" label="Réservations (holds)" icon={CheckCircle} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<ArrowLeftRight className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>Paiements</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/payments/outgoing" label="Virements sortants" icon={ArrowLeftRight} collapsed={collapsed} />
							<NavLink href="/payments/incoming" label="Virements entrants" icon={ArrowLeftRight} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<Percent className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>Intérêts & Frais</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/interest/accruals" label="Calcul/Accumulation" icon={Percent} collapsed={collapsed} />
							<NavLink href="/fees/apply" label="Application de frais" icon={Banknote} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<FileText className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>Relevés & Extraits</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/statements" label="Relevés de compte" icon={FileText} collapsed={collapsed} />
							<NavLink href="/exports" label="Exports PDF/CSV" icon={FileText} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<ShieldAlert className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>Risques & Conformité</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/risk/limits" label="Limites" icon={Gauge} collapsed={collapsed} />
							<NavLink href="/risk/sanctions" label="Sanctions/Watchlists" icon={ShieldAlert} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<RefreshCcw className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>Rapprochement & Clôture</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/reconciliation" label="Rapprochement" icon={RefreshCcw} collapsed={collapsed} />
							<NavLink href="/close/day" label="Clôture journalière" icon={CalendarCheck} collapsed={collapsed} />
							<NavLink href="/close/month" label="Clôture mensuelle" icon={CalendarCheck} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<UserCog className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>Gouvernance</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/users" label="Utilisateurs" icon={Users} collapsed={collapsed} />
							<NavLink href="/roles" label="Rôles" icon={KeyRound} collapsed={collapsed} />
							<NavLink href="/approvals" label="Approbations (4 yeux)" icon={CheckCircle} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<ScrollText className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>Audit & conformité</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/audit/events" label="Événements d’audit" icon={ScrollText} collapsed={collapsed} />
							<NavLink href="/audit/access" label="Journaux d’accès" icon={ShieldCheck} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<Bell className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>Notifications</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/notifications/templates" label="Modèles" icon={Bell} collapsed={collapsed} />
							<NavLink href="/notifications/outbox" label="Envois" icon={Bell} collapsed={collapsed} />
						</div>
					</details>

					<details className="group rounded-md">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-black flex items-center justify-between rounded-md hover:bg-gray-100">
							<span className="flex items-center gap-2">
								<BarChart3 className="h-4 w-4 text-gray-700" />
								<span className={labelClass}>Rapports</span>
							</span>
							{!collapsed && <Chevron />}
						</summary>
						<div className="mt-1 space-y-1 pl-3">
							<NavLink href="/reports/activity" label="Activité" icon={BarChart3} collapsed={collapsed} />
							<NavLink href="/reports/balances" label="Soldes" icon={BarChart3} collapsed={collapsed} />
							<NavLink href="/reports/fees-interest" label="Frais/Intérêts" icon={BarChart3} collapsed={collapsed} />
						</div>
					</details>

					<div className="pt-2">
						<div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-2">
							<Settings className="h-4 w-4 text-gray-700" />
							{!collapsed && <span>Système</span>}
						</div>
					</div>
				</nav>
			</div>
		</aside>
	);
}
