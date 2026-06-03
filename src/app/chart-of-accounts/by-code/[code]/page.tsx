"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { chartOfAccountsApi } from "@/lib/api";
import type { ChartOfAccount, AccountType } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function ChartOfAccountByCodePage() {
	const { t, i18n } = useTranslation();
	const params = useParams();
	const router = useRouter();
	const code = params.code as string;
	const [account, setAccount] = useState<ChartOfAccount | null>(null);
	const [children, setChildren] = useState<ChartOfAccount[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const locale = i18n.language === "fr" ? "fr-FR" : "en-US";

	useEffect(() => {
		// Re-render when language changes
	}, [i18n.language]);

	useEffect(() => {
		if (code) {
			loadAccount();
		}
	}, [code]);

	async function loadAccount() {
		setLoading(true);
		setError(null);
		try {
			const data = await chartOfAccountsApi.getByCode(code);
			setAccount(data);
			if (data.code) {
				try {
					const childrenData = await chartOfAccountsApi.getChildren(data.code);
					setChildren(childrenData);
				} catch {
					setChildren([]);
				}
			}
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : undefined;
			setError(message ?? t("chartOfAccount.byCode.loadError"));
		} finally {
			setLoading(false);
		}
	}

	function getAccountTypeLabel(type: AccountType | string): string {
		return t(`chartOfAccount.accountTypes.${type}`, { defaultValue: type });
	}

	function getAccountTypeColor(type: string) {
		const colors: Record<string, string> = {
			ASSET: "bg-blue-100 text-blue-800",
			LIABILITY: "bg-red-100 text-red-800",
			EQUITY: "bg-green-100 text-green-800",
			REVENUE: "bg-purple-100 text-purple-800",
			EXPENSE: "bg-orange-100 text-orange-800"
		};
		return colors[type] || "bg-gray-100 text-gray-800";
	}

	if (loading) {
		return <div className="p-6 text-center">{t("chartOfAccount.byCode.loading")}</div>;
	}

	if (error || !account) {
		return (
			<div className="p-6">
				<div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
					{error || t("chartOfAccount.byCode.notFound")}
				</div>
				<div className="mt-4">
					<Button variant="outline" onClick={() => router.push("/chart-of-accounts")}>
						{t("chartOfAccount.byCode.backToList")}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 max-w-5xl mx-auto">
			<div className="mb-6">
				<Link href="/chart-of-accounts" className="text-blue-600 hover:text-blue-800 text-sm">
					{t("chartOfAccount.byCode.backLink")}
				</Link>
			</div>

			<div className="bg-white rounded-lg shadow p-6 mb-6">
				<div className="flex justify-between items-start mb-4">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
						<p className="text-gray-600 mt-1">{t("chartOfAccount.byCode.codeLabel", { code: account.code })}</p>
					</div>
					<Badge className={getAccountTypeColor(account.accountType)}>
						{getAccountTypeLabel(account.accountType)}
					</Badge>
				</div>

				<div className="grid grid-cols-2 gap-4 mt-6">
					<div>
						<dt className="text-sm font-medium text-gray-500">{t("chartOfAccount.byCode.description")}</dt>
						<dd className="mt-1 text-sm text-gray-900">{account.description || "-"}</dd>
					</div>
					<div>
						<dt className="text-sm font-medium text-gray-500">{t("chartOfAccount.byCode.category")}</dt>
						<dd className="mt-1 text-sm text-gray-900">{account.category || "-"}</dd>
					</div>
					<div>
						<dt className="text-sm font-medium text-gray-500">{t("chartOfAccount.byCode.level")}</dt>
						<dd className="mt-1 text-sm text-gray-900">{account.level}</dd>
					</div>
					<div>
						<dt className="text-sm font-medium text-gray-500">{t("chartOfAccount.byCode.parentAccount")}</dt>
						<dd className="mt-1 text-sm text-gray-900">
							{account.parentCode ? (
								<Link href={`/chart-of-accounts/by-code/${account.parentCode}`} className="text-blue-600 hover:text-blue-800">
									{account.parentCode}
								</Link>
							) : (
								"-"
							)}
						</dd>
					</div>
					<div>
						<dt className="text-sm font-medium text-gray-500">{t("chartOfAccount.byCode.status")}</dt>
						<dd className="mt-1">
							<Badge variant={account.isActive ? "success" : "neutral"}>
								{account.isActive ? t("chartOfAccount.byCode.active") : t("chartOfAccount.byCode.inactive")}
							</Badge>
						</dd>
					</div>
					<div>
						<dt className="text-sm font-medium text-gray-500">{t("chartOfAccount.byCode.createdAt")}</dt>
						<dd className="mt-1 text-sm text-gray-900">
							{new Date(account.createdAt).toLocaleDateString(locale)}
						</dd>
					</div>
				</div>

				<div className="mt-6 flex gap-2">
					<Link href={`/chart-of-accounts/${account.id}`}>
						<Button variant="outline">{t("chartOfAccount.byCode.viewFullDetails")}</Button>
					</Link>
				</div>
			</div>

			{children.length > 0 && (
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">{t("chartOfAccount.byCode.subAccounts")}</h2>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("chartOfAccount.table.code")}</th>
									<th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("chartOfAccount.table.name")}</th>
									<th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("chartOfAccount.table.level")}</th>
									<th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("chartOfAccount.table.status")}</th>
									<th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{t("chartOfAccount.table.actions")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 text-sm">
								{children.map(child => (
									<tr key={child.id} className="hover:bg-gray-50">
										<td className="px-4 py-3 text-sm font-mono font-medium">{child.code}</td>
										<td className="px-4 py-3 text-sm">{child.name}</td>
										<td className="px-4 py-3 text-sm">{child.level}</td>
										<td className="px-4 py-3 text-sm">
											<Badge variant={child.isActive ? "success" : "neutral"}>
												{child.isActive ? t("chartOfAccount.byCode.active") : t("chartOfAccount.byCode.inactive")}
											</Badge>
										</td>
										<td className="px-4 py-3 text-sm">
											<Link href={`/chart-of-accounts/${child.id}`} className="text-blue-600 hover:text-blue-800">
												{t("chartOfAccount.byCode.view")}
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
