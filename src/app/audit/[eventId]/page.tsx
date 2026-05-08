"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auditApi } from "@/lib/api";
import type { AuditEvent } from "@/types";
import { AuditEventDetails } from "@/components/audit/AuditEventDetails";
import Button from "@/components/ui/Button";

export default function AuditEventDetailPage() {
	const params = useParams<{ eventId: string }>();
	const router = useRouter();
	const rawId = params?.eventId;
	const eventId = typeof rawId === "string" ? Number(rawId) : Number.NaN;

	const [event, setEvent] = useState<AuditEvent | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (rawId === undefined) return;
		if (Number.isNaN(eventId)) {
			setLoading(false);
			setError("Identifiant d’événement invalide");
			return;
		}

		let cancelled = false;
		(async () => {
			setLoading(true);
			setError(null);
			try {
				const ev = await auditApi.getEvent(eventId);
				if (!cancelled) setEvent(ev);
			} catch (e: unknown) {
				const msg = e instanceof Error ? e.message : "Erreur lors du chargement des détails";
				if (!cancelled) setError(msg);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [rawId, eventId]);

	if (loading && !event) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
				<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
				<p className="text-gray-600">Chargement de l&apos;événement…</p>
			</div>
		);
	}

	if (error || !event) {
		return (
			<div className="space-y-4">
				<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{error ?? "Événement introuvable"}</div>
				<Button variant="secondary" onClick={() => router.push("/audit")}>
					Retour à la liste
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<AuditEventDetails
				event={event}
				onBack={() => router.push("/audit")}
				onResourceTrace={(resourceType, resourceId) => {
					router.push(`/audit?resourceType=${encodeURIComponent(resourceType)}&resourceId=${resourceId}`);
				}}
			/>
		</div>
	);
}
