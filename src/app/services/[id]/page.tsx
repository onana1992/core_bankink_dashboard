"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { servicesApi } from "@/lib/api";
import type { ServiceRegistry, ServiceToken, GenerateServiceTokenRequest } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import TablePagination from "@/components/ui/TablePagination";
import { Eye, EyeOff, Copy } from "lucide-react";

export default function ServiceDetailPage() {
	const { t } = useTranslation();
	const { isAuthenticated } = useAuth();
	const params = useParams();
	const router = useRouter();
	const id = params?.id as string;
	const [service, setService] = useState<ServiceRegistry | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [tokens, setTokens] = useState<ServiceToken[]>([]);
	const [tokenTotal, setTokenTotal] = useState(0);
	const [tokenPage, setTokenPage] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [creatingUser, setCreatingUser] = useState(false);
	const [modalOpen, setModalOpen] = useState(false);
	const [generateForm, setGenerateForm] = useState<Pick<GenerateServiceTokenRequest, "name" | "expiresInSeconds">>({
		name: "",
		expiresInSeconds: 315360000
	});
	const [generatedToken, setGeneratedToken] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [revealedTokenId, setRevealedTokenId] = useState<number | null>(null);

	useEffect(() => {
		if (isAuthenticated && id) {
			loadService();
			loadTokens(0);
		}
	}, [isAuthenticated, id]);

	function loadService() {
		if (!id) return;
		setLoading(true);
		setError(null);
		servicesApi
			.get(id)
			.then(setService)
			.catch((e: unknown) => setError(e instanceof Error ? e.message : t("service.errors.loadError")))
			.finally(() => setLoading(false));
	}

	function loadTokens(page: number) {
		if (!id) return;
		servicesApi
			.listTokens(id, { page, size: 10 })
			.then((res) => {
				setTokens(res.content ?? []);
				setTokenTotal(res.totalElements ?? 0);
				setTokenPage(res.number ?? 0);
			})
			.catch(() => {});
	}

	async function handleCreateServiceUser() {
		if (!id) return;
		setCreatingUser(true);
		setError(null);
		try {
			const updated = await servicesApi.createServiceUser(id);
			setService(updated);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : t("service.errors.createError"));
		} finally {
			setCreatingUser(false);
		}
	}

	function handleRevoke(tokenId: number) {
		if (!id || !confirm(t("service.detail.revokeToken") + " ?")) return;
		servicesApi
			.revokeToken(id, tokenId)
			.then(() => loadTokens(tokenPage))
			.catch((e: unknown) => alert(e instanceof Error ? e.message : t("service.errors.revokeError")));
	}

	function handleGenerateSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!id || !service?.linkedUserId) return;
		setSubmitting(true);
		setGeneratedToken(null);
		servicesApi
			.generateToken(id, {
				name: generateForm.name || undefined,
				expiresInSeconds: generateForm.expiresInSeconds || undefined
			})
			.then((res) => {
				setGeneratedToken(res.accessToken);
				loadTokens(0);
			})
			.catch((e: unknown) => alert(e instanceof Error ? e.message : t("service.errors.generateError")))
			.finally(() => setSubmitting(false));
	}

	function copyToken() {
		if (generatedToken) {
			navigator.clipboard.writeText(generatedToken);
		}
	}

	function copyTokenValue(token: ServiceToken) {
		if (token.tokenValue) {
			navigator.clipboard.writeText(token.tokenValue);
		}
	}

	function maskToken(value: string): string {
		if (value.length <= 20) return "••••••••";
		return value.slice(0, 12) + "…" + value.slice(-4);
	}

	function closeModal() {
		setModalOpen(false);
		setGeneratedToken(null);
		setGenerateForm({ name: "", expiresInSeconds: 315360000 });
	}

	function tokenStatusVariant(s: string): "success" | "neutral" | "danger" {
		switch (s) {
			case "ACTIVE": return "success";
			case "REVOKED": return "danger";
			default: return "neutral";
		}
	}

	async function handleDeleteService() {
		if (!id || !service || !confirm(t("service.delete.confirm", { name: service.name }))) return;
		setDeleting(true);
		setError(null);
		try {
			await servicesApi.delete(id);
			router.push("/services");
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : t("service.errors.deleteError"));
		} finally {
			setDeleting(false);
		}
	}

	if (!isAuthenticated) return null;
	if (loading && !service) {
		return <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>;
	}
	if (error || !service) {
		return (
			<div className="p-8">
				<Link href="/services" className="text-blue-600 hover:underline">{t("service.backToList")}</Link>
				<p className="mt-4 text-red-600">{error || t("service.table.noServices")}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<Link href="/services" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-flex items-center gap-1">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
						{t("service.backToList")}
					</Link>
					<h1 className="text-3xl font-bold text-gray-900">{service.name}</h1>
					<p className="text-gray-600 mt-1 font-mono text-sm">{service.slug}</p>
					<div className="mt-2">
						<Badge variant={service.status === "ACTIVE" ? "success" : "neutral"}>{t(`service.statuses.${service.status}`)}</Badge>
					</div>
				</div>
				<Button
					variant="outline"
					size="sm"
					className="text-red-600 border-red-200 hover:bg-red-50"
					onClick={handleDeleteService}
					disabled={deleting}
				>
					{deleting ? t("common.loading") : t("service.detail.deleteService")}
				</Button>
			</div>

			{service.description && (
				<div className="bg-white p-4 rounded-xl border border-gray-200">
					<p className="text-sm text-gray-700">{service.description}</p>
				</div>
			)}

			{/* Utilisateur du service = le service lui-même */}
			<div className={`rounded-lg p-4 flex items-center justify-between border ${service.linkedUserId ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}>
				<div>
					<p className={`font-medium ${service.linkedUserId ? "text-green-900" : "text-blue-900"}`}>
						{service.linkedUserId
							? t("service.detail.serviceUserLinked")
							: t("service.detail.createServiceUser")}
					</p>
					<p className={`text-sm mt-1 ${service.linkedUserId ? "text-green-700" : "text-blue-700"}`}>
						{service.linkedUserId
							? `svc-${service.slug}`
							: t("service.detail.createServiceUserHint")}
					</p>
				</div>
				{!service.linkedUserId && (
					<Button variant="outline" size="sm" onClick={handleCreateServiceUser} disabled={creatingUser}>
						{creatingUser ? t("common.loading") : t("service.detail.createServiceUser")}
					</Button>
				)}
			</div>

			{/* Tokens */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
					<h2 className="text-lg font-semibold text-gray-900">{t("service.detail.tokens")}</h2>
					<Button size="sm" onClick={() => setModalOpen(true)} disabled={!service.linkedUserId}>
						{t("service.detail.generateToken")}
					</Button>
				</div>
				{tokens.length === 0 ? (
					<div className="p-8 text-center text-gray-500">
						<p>{t("service.detail.noTokens")}</p>
						<Button className="mt-3" onClick={() => setModalOpen(true)} disabled={!service.linkedUserId}>
							{t("service.detail.generateToken")}
						</Button>
					</div>
				) : (
					<>
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("common.id")}</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("service.detail.tokenName")}</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("service.detail.tokenValue")}</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("service.detail.tokenExpires")}</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("common.status")}</th>
									<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("common.actions")}</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{tokens.map((tok) => (
									<tr key={tok.id} className="hover:bg-gray-50">
										<td className="px-4 py-3 text-sm font-mono text-gray-600">{tok.id}</td>
										<td className="px-4 py-3 text-sm text-gray-900">{tok.name || "-"}</td>
										<td className="px-4 py-3 text-sm">
											{tok.tokenValue ? (
												<div className="flex items-center gap-2">
													<code className={`font-mono text-xs bg-slate-100 px-2 py-1 rounded block break-all ${revealedTokenId === tok.id ? "max-w-[360px] overflow-x-auto" : "max-w-[180px] truncate"}`} title={revealedTokenId === tok.id ? undefined : tok.tokenValue}>
														{revealedTokenId === tok.id ? tok.tokenValue : maskToken(tok.tokenValue)}
													</code>
													<button
														type="button"
														onClick={() => setRevealedTokenId((prev) => (prev === tok.id ? null : tok.id))}
														className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600"
														title={revealedTokenId === tok.id ? t("service.detail.hideToken") : t("service.detail.showToken")}
													>
														{revealedTokenId === tok.id ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
													</button>
													<button
														type="button"
														onClick={() => copyTokenValue(tok)}
														className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600"
														title={t("service.generateToken.copyToken")}
													>
														<Copy className="h-3.5 w-3.5" />
													</button>
												</div>
											) : (
												<span className="text-slate-400 text-xs">{t("service.detail.tokenNotStored")}</span>
											)}
										</td>
										<td className="px-4 py-3 text-sm text-gray-600">
											{tok.expiresAt ? new Date(tok.expiresAt).toLocaleDateString() : "-"}
										</td>
										<td className="px-4 py-3">
											<Badge variant={tokenStatusVariant(tok.status)}>{t(`service.tokenStatuses.${tok.status}`)}</Badge>
										</td>
										<td className="px-4 py-3 text-right">
											{tok.status === "ACTIVE" && (
												<Button variant="outline" size="sm" onClick={() => handleRevoke(tok.id)}>
													{t("service.detail.revokeToken")}
												</Button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
						{tokenTotal > 10 && (
							<TablePagination
								page={tokenPage}
								totalPages={Math.ceil(tokenTotal / 10)}
								totalElements={tokenTotal}
								pageSize={10}
								onPageChange={loadTokens}
								resultsLabel="tokens"
							/>
						)}
					</>
				)}
			</div>

			{/* Modal Générer token */}
			{modalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
					<div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
						<h3 className="text-xl font-semibold text-gray-900 mb-4">{t("service.generateToken.title")}</h3>
						{generatedToken ? (
							<>
								<p className="text-sm text-amber-700 mb-3">{t("service.generateToken.tokenShownOnce")}</p>
								<textarea
									readOnly
									className="w-full h-24 p-3 border rounded-md font-mono text-xs bg-gray-50"
									value={generatedToken}
								/>
								<div className="flex gap-2 mt-4">
									<Button onClick={copyToken}>{t("service.generateToken.copyToken")}</Button>
									<Button variant="outline" onClick={closeModal}>{t("common.cancel")}</Button>
								</div>
							</>
						) : !service.linkedUserId ? (
							<div className="space-y-4">
								<p className="text-amber-700 text-sm">{t("service.detail.createServiceUserFirst")}</p>
								<Button variant="outline" onClick={closeModal}>{t("common.cancel")}</Button>
							</div>
						) : (
							<form onSubmit={handleGenerateSubmit} className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">{t("service.generateToken.name")}</label>
									<Input
										value={generateForm.name ?? ""}
										onChange={(e) => setGenerateForm({ ...generateForm, name: e.target.value })}
										placeholder={t("service.generateToken.namePlaceholder")}
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">{t("service.generateToken.expiresIn")}</label>
									<Input
										type="number"
										value={generateForm.expiresInSeconds ?? ""}
										onChange={(e) => setGenerateForm({ ...generateForm, expiresInSeconds: e.target.value ? Number(e.target.value) : undefined })}
										placeholder={t("service.generateToken.expiresInPlaceholder")}
									/>
								</div>
								<div className="flex gap-2 pt-2">
									<Button type="submit" disabled={submitting}>
										{submitting ? t("service.generateToken.generating") : t("service.generateToken.generate")}
									</Button>
									<Button type="button" variant="outline" onClick={closeModal}>{t("common.cancel")}</Button>
								</div>
							</form>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
