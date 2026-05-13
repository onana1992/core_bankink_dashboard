"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";

function buildHref(path: string, accountId: string | null): string {
	if (!accountId) return path;
	return `${path}?accountId=${encodeURIComponent(accountId)}`;
}

export default function NewTransactionHubPage() {
	const { t } = useTranslation();
	const searchParams = useSearchParams();
	const accountId = searchParams.get("accountId");

	const types = [
		{ key: "deposit", href: "/transactions/deposit/new", className: "from-green-500 to-emerald-600" },
		{ key: "withdrawal", href: "/transactions/withdrawal/new", className: "from-amber-500 to-orange-600" },
		{ key: "transfer", href: "/transactions/transfer/new", className: "from-blue-500 to-cyan-600" },
		{ key: "interest", href: "/transactions/interest/new", className: "from-violet-500 to-purple-600" },
		{ key: "adjustment", href: "/transactions/adjustment/new", className: "from-slate-500 to-gray-700" }
	] as const;

	return (
		<div className="w-full min-w-0 space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">{t("transaction.newHub.title")}</h1>
					<p className="text-gray-600 mt-1">
						{accountId
							? t("transaction.newHub.description")
							: t("transaction.newHub.descriptionNoAccount")}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{accountId ? (
						<Link href={`/accounts/${accountId}`}>
							<Button variant="outline" size="sm">
								{t("transaction.newHub.backToAccount")}
							</Button>
						</Link>
					) : null}
					<Link href="/transactions">
						<Button variant="outline" size="sm">
							{t("transaction.newHub.backToTransactions")}
						</Button>
					</Link>
				</div>
			</div>

			<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
				<ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
					{types.map(({ key, href, className }) => (
						<li key={key}>
							<Link
								href={buildHref(href, accountId)}
								className="flex h-full min-h-[5.5rem] items-center gap-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4 shadow-sm transition hover:border-blue-300 hover:bg-white hover:shadow-md"
							>
								<div
									className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white ${className}`}
								>
									<span className="text-lg font-semibold">+</span>
								</div>
								<span className="font-medium text-gray-900">{t(`transaction.newHub.types.${key}`)}</span>
							</Link>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
