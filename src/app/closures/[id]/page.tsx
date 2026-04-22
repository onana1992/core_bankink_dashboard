"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
	ArrowLeft,
	CheckCircle2,
	ClipboardList,
	Loader2,
	OctagonAlert,
	Scale,
	XCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { closuresApi } from "@/lib/api";
import type { Closure, ClosureValidationResponse } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const TYPE_LABELS: Record<string, string> = {
	DAILY: "Journalière",
	MONTHLY: "Mensuelle",
	YEARLY: "Annuelle"
};

const STATUS_LABELS: Record<string, string> = {
	IN_PROGRESS: "En cours",
	COMPLETED: "Complétée",
	FAILED: "Échouée"
};

const STATUS_COLORS: Record<string, string> = {
	IN_PROGRESS: "bg-amber-100 text-amber-900 border-amber-200",
	COMPLETED: "bg-emerald-100 text-emerald-900 border-emerald-200",
	FAILED: "bg-red-100 text-red-900 border-red-200"
};

export default function ClosureDetailPage() {
	const params = useParams();
	const router = useRouter();
	const closureId = params.id as string;
	const { isAuthenticated, loading: authLoading } = useAuth();

	const [closure, setClosure] = useState<Closure | null>(null);
	const [validation, setValidation] = useState<ClosureValidationResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [validating, setValidating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (authLoading) return;
		if (!isAuthenticated) return;
		if (closureId) {
			loadClosure();
		}
	}, [closureId, authLoading, isAuthenticated]);

	async function loadClosure() {
		setLoading(true);
		setError(null);
		try {
			const data = await closuresApi.getClosure(closureId);
			setClosure(data);
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Erreur lors du chargement de la clôture";
			setError(msg);
		} finally {
			setLoading(false);
		}
	}

	async function handleValidate() {
		if (!closure) return;
		setValidating(true);
		setError(null);
		try {
			const validationResult = await closuresApi.validateClosure(closureId);
			setValidation(validationResult);
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Erreur lors de la validation";
			setError(msg);
		} finally {
			setValidating(false);
		}
	}

	if (authLoading) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
			</div>
		);
	}

	if (!isAuthenticated) {
		router.push("/login");
		return null;
	}

	if (loading) {
		return (
			<div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
				<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
				<p className="text-gray-600">Chargement de la clôture…</p>
			</div>
		);
	}

	if (!closure) {
		return (
			<div className="space-y-4">
				<div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
					<OctagonAlert className="mt-0.5 h-5 w-5 shrink-0" />
					<p className="text-sm">{error || "Clôture non trouvée"}</p>
				</div>
				<Link
					href="/closures"
					className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
				>
					<ArrowLeft className="h-4 w-4" />
					Retour à la liste
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<Link
						href="/closures"
						className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
					>
						<ArrowLeft className="h-4 w-4" />
						Retour aux clôtures
					</Link>
					<h1 className="mt-3 text-3xl font-bold text-gray-900">Clôture #{closure.id}</h1>
					<p className="mt-1 text-gray-600">
						{TYPE_LABELS[closure.closureType] ?? closure.closureType} — {closure.closureDate}
					</p>
				</div>
				<Button onClick={handleValidate} disabled={validating} className="flex items-center gap-2 shrink-0">
					{validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
					{validating ? "Validation…" : "Relancer les contrôles"}
				</Button>
			</div>

			{error && (
				<div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
					<OctagonAlert className="mt-0.5 h-5 w-5 shrink-0" />
					<p className="text-sm">{error}</p>
				</div>
			)}

			<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
				<div className="mb-4 flex items-center gap-2">
					<ClipboardList className="h-5 w-5 text-gray-600" />
					<h2 className="text-lg font-semibold text-gray-900">Informations générales</h2>
				</div>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-gray-500">Statut</p>
						<div className="mt-1">
							<Badge className={`border ${STATUS_COLORS[closure.status]}`}>
								{STATUS_LABELS[closure.status]}
							</Badge>
						</div>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-gray-500">Date de création</p>
						<p className="mt-1 text-sm font-medium text-gray-900">
							{new Date(closure.createdAt).toLocaleString("fr-FR")}
						</p>
					</div>
					{closure.completedAt && (
						<div>
							<p className="text-xs font-medium uppercase tracking-wide text-gray-500">Finalisation</p>
							<p className="mt-1 text-sm font-medium text-gray-900">
								{new Date(closure.completedAt).toLocaleString("fr-FR")}
							</p>
						</div>
					)}
					{closure.description && (
						<div className="sm:col-span-2 lg:col-span-3">
							<p className="text-xs font-medium uppercase tracking-wide text-gray-500">Commentaire</p>
							<p className="mt-1 text-sm text-gray-800">{closure.description}</p>
						</div>
					)}
					{closure.errorMessage && (
						<div className="sm:col-span-2 lg:col-span-3">
							<p className="text-xs font-medium uppercase tracking-wide text-red-700">Message d&apos;erreur</p>
							<p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
								{closure.errorMessage}
							</p>
						</div>
					)}
				</div>
			</div>

			<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
				<div className="mb-4 flex items-center gap-2">
					<Scale className="h-5 w-5 text-gray-600" />
					<h2 className="text-lg font-semibold text-gray-900">Totaux (période enregistrée)</h2>
				</div>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total débit</p>
						<p className="mt-1 font-mono text-2xl font-bold text-gray-900">
							{closure.totalDebit.toLocaleString("fr-FR", {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2
							})}
						</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total crédit</p>
						<p className="mt-1 font-mono text-2xl font-bold text-gray-900">
							{closure.totalCredit.toLocaleString("fr-FR", {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2
							})}
						</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-gray-500">Contrôle équilibre</p>
						<div className="mt-1">
							{closure.balanceCheck ? (
								<Badge className="border border-emerald-200 bg-emerald-100 text-emerald-900">
									<CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
									Équilibré
								</Badge>
							) : (
								<Badge className="border border-red-200 bg-red-100 text-red-900">
									<XCircle className="mr-1 inline h-3.5 w-3.5" />
									À vérifier
								</Badge>
							)}
						</div>
						{!closure.balanceCheck && (
							<p className="mt-2 text-sm text-red-600">
								Écart :{" "}
								{Math.abs(closure.totalDebit - closure.totalCredit).toLocaleString("fr-FR", {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2
								})}
							</p>
						)}
					</div>
				</div>
			</div>

			{validation && (
				<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
					<h2 className="mb-4 text-lg font-semibold text-gray-900">Résultat des contrôles</h2>
					<div className="space-y-4">
						<div>
							<p className="text-xs font-medium uppercase tracking-wide text-gray-500">Synthèse</p>
							<div className="mt-1">
								{validation.isValid ? (
									<Badge className="border border-emerald-200 bg-emerald-100 text-emerald-900">
										Valide
									</Badge>
								) : (
									<Badge className="border border-red-200 bg-red-100 text-red-900">Invalide</Badge>
								)}
							</div>
						</div>
						<div>
							<p className="text-xs font-medium uppercase tracking-wide text-gray-500">Message</p>
							<p className="mt-1 text-sm text-gray-800">{validation.message}</p>
						</div>
						{validation.errors.length > 0 && (
							<div>
								<p className="text-xs font-medium uppercase tracking-wide text-red-700">Erreurs</p>
								<ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-900">
									{validation.errors.map((err, index) => (
										<li key={index}>{err}</li>
									))}
								</ul>
							</div>
						)}
						{validation.warnings.length > 0 && (
							<div>
								<p className="text-xs font-medium uppercase tracking-wide text-amber-800">Avertissements</p>
								<ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-900">
									{validation.warnings.map((w, index) => (
										<li key={index}>{w}</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
