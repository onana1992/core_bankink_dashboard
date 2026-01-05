"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
	IN_PROGRESS: "bg-yellow-100 text-yellow-800",
	COMPLETED: "bg-green-100 text-green-800",
	FAILED: "bg-red-100 text-red-800"
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
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors du chargement de la clôture");
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
		} catch (e: any) {
			setError(e?.message ?? "Erreur lors de la validation");
		} finally {
			setValidating(false);
		}
	}

	if (authLoading) {
		return <div className="p-6">Chargement...</div>;
	}

	if (!isAuthenticated) {
		router.push("/login");
		return null;
	}

	if (loading) {
		return <div className="p-6">Chargement de la clôture...</div>;
	}

	if (!closure) {
		return (
			<div className="p-6">
				<div className="rounded bg-red-50 p-4 text-red-800">
					{error || "Clôture non trouvée"}
				</div>
				<Link href="/closures" className="mt-4 text-blue-600 hover:underline">
					← Retour à la liste
				</Link>
			</div>
		);
	}

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<Link href="/closures" className="text-blue-600 hover:underline">
						← Retour à la liste
					</Link>
					<h1 className="mt-2 text-2xl font-bold">Détails de la Clôture #{closure.id}</h1>
				</div>
				<Button
					onClick={handleValidate}
					disabled={validating}
					className="bg-blue-600 hover:bg-blue-700"
				>
					{validating ? "Validation..." : "Valider la clôture"}
				</Button>
			</div>

			{error && (
				<div className="mb-4 rounded bg-red-50 p-4 text-red-800">
					{error}
				</div>
			)}

			{/* Informations générales */}
			<div className="mb-6 rounded-lg border bg-white p-6 shadow">
				<h2 className="mb-4 text-xl font-semibold">Informations Générales</h2>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="text-sm font-medium text-gray-700">ID</label>
						<p className="text-lg">{closure.id}</p>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700">Date de clôture</label>
						<p className="text-lg">{closure.closureDate}</p>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700">Type</label>
						<p className="text-lg">{TYPE_LABELS[closure.closureType]}</p>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700">Statut</label>
						<div className="mt-1">
							<Badge className={STATUS_COLORS[closure.status]}>
								{STATUS_LABELS[closure.status]}
							</Badge>
						</div>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700">Date de création</label>
						<p className="text-lg">{new Date(closure.createdAt).toLocaleString("fr-FR")}</p>
					</div>
					{closure.completedAt && (
						<div>
							<label className="text-sm font-medium text-gray-700">Date de finalisation</label>
							<p className="text-lg">{new Date(closure.completedAt).toLocaleString("fr-FR")}</p>
						</div>
					)}
					{closure.description && (
						<div className="col-span-2">
							<label className="text-sm font-medium text-gray-700">Description</label>
							<p className="text-lg">{closure.description}</p>
						</div>
					)}
					{closure.errorMessage && (
						<div className="col-span-2">
							<label className="text-sm font-medium text-red-700">Message d'erreur</label>
							<p className="rounded bg-red-50 p-3 text-red-800">{closure.errorMessage}</p>
						</div>
					)}
				</div>
			</div>

			{/* Totaux comptables */}
			<div className="mb-6 rounded-lg border bg-white p-6 shadow">
				<h2 className="mb-4 text-xl font-semibold">Totaux Comptables</h2>
				<div className="grid grid-cols-3 gap-4">
					<div>
						<label className="text-sm font-medium text-gray-700">Total Débit</label>
						<p className="text-2xl font-bold">
							{closure.totalDebit.toLocaleString("fr-FR", {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2
							})}
						</p>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700">Total Crédit</label>
						<p className="text-2xl font-bold">
							{closure.totalCredit.toLocaleString("fr-FR", {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2
							})}
						</p>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-700">Équilibre</label>
						<div className="mt-1">
							{closure.balanceCheck ? (
								<Badge className="bg-green-100 text-green-800">✓ Équilibré</Badge>
							) : (
								<Badge className="bg-red-100 text-red-800">✗ Déséquilibré</Badge>
							)}
						</div>
						{!closure.balanceCheck && (
							<p className="mt-2 text-sm text-red-600">
								Différence:{" "}
								{Math.abs(closure.totalDebit - closure.totalCredit).toLocaleString("fr-FR", {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2
								})}
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Résultats de validation */}
			{validation && (
				<div className="mb-6 rounded-lg border bg-white p-6 shadow">
					<h2 className="mb-4 text-xl font-semibold">Résultats de Validation</h2>
					<div className="space-y-4">
						<div>
							<label className="text-sm font-medium text-gray-700">Statut</label>
							<div className="mt-1">
								{validation.isValid ? (
									<Badge className="bg-green-100 text-green-800">✓ Valide</Badge>
								) : (
									<Badge className="bg-red-100 text-red-800">✗ Invalide</Badge>
								)}
							</div>
						</div>
						<div>
							<label className="text-sm font-medium text-gray-700">Message</label>
							<p className="mt-1">{validation.message}</p>
						</div>
						{validation.errors.length > 0 && (
							<div>
								<label className="text-sm font-medium text-red-700">Erreurs</label>
								<ul className="mt-1 list-disc list-inside space-y-1">
									{validation.errors.map((error, index) => (
										<li key={index} className="text-red-800">{error}</li>
									))}
								</ul>
							</div>
						)}
						{validation.warnings.length > 0 && (
							<div>
								<label className="text-sm font-medium text-yellow-700">Avertissements</label>
								<ul className="mt-1 list-disc list-inside space-y-1">
									{validation.warnings.map((warning, index) => (
										<li key={index} className="text-yellow-800">{warning}</li>
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


