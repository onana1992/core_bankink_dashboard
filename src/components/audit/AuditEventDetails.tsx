"use client";

import type { AuditEvent } from "@/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { getAuditActionBadgeClass } from "@/components/ops/auditActionBadgeClasses";

export function getAuditActionBadge(action: string) {
	return <Badge className={getAuditActionBadgeClass(action)}>{action}</Badge>;
}

export function formatAuditEventDate(dateString: string) {
	return new Date(dateString).toLocaleString("fr-FR", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	});
}

type AuditEventDetailsProps = {
	event: AuditEvent;
	onBack: () => void;
	onResourceTrace: (resourceType: string, resourceId: number) => void;
};

export function AuditEventDetails({ event, onBack, onResourceTrace }: AuditEventDetailsProps) {
	return (
		<div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
			<div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
				<div className="flex justify-between items-start">
					<div className="flex items-center gap-3">
						<div className="bg-white/20 rounded-lg p-2">
							<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</div>
						<div>
							<h2 className="text-2xl font-bold text-white">Détails de l&apos;événement</h2>
							<p className="text-blue-100 text-sm mt-1">ID: #{event.id}</p>
						</div>
					</div>
					<Button onClick={onBack} variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
						</svg>
						Retour
					</Button>
				</div>
			</div>

			<div className="p-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					<div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
						<div className="flex items-center gap-2 mb-2">
							<svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Date et heure</h3>
						</div>
						<p className="text-gray-900 font-medium">{formatAuditEventDate(event.createdAt)}</p>
					</div>

					<div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
						<div className="flex items-center gap-2 mb-2">
							<svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
							<h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide">Utilisateur</h3>
						</div>
						<p className="text-gray-900 font-medium">
							{event.user ? (
								<span className="flex items-center gap-2">
									<span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">{event.user.username}</span>
								</span>
							) : (
								<span className="text-gray-400 italic">Non disponible</span>
							)}
						</p>
					</div>

					<div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
						<div className="flex items-center gap-2 mb-2">
							<svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
							<h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Action</h3>
						</div>
						<div>{getAuditActionBadge(event.action)}</div>
					</div>

					<div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-100">
						<div className="flex items-center gap-2 mb-2">
							<svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
							</svg>
							<h3 className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Type de ressource</h3>
						</div>
						<p className="text-gray-900 font-medium">
							<Badge className="bg-orange-100 text-orange-800">{event.resourceType}</Badge>
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					<div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
						<h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">ID Ressource</h3>
						{event.resourceId ? (
							<div className="flex items-center gap-2">
								<code className="bg-gray-200 px-3 py-1.5 rounded font-mono text-sm text-gray-900">{event.resourceId}</code>
								<Button
									onClick={() => onResourceTrace(event.resourceType, event.resourceId!)}
									variant="secondary"
									className="text-xs px-2 py-1"
								>
									<svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
									</svg>
									Traçabilité
								</Button>
							</div>
						) : (
							<p className="text-gray-400 italic">-</p>
						)}
					</div>

					<div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
						<h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Adresse IP</h3>
						<p className="text-gray-900 font-mono text-sm">
							{event.ipAddress ? (
								<span className="bg-gray-200 px-3 py-1.5 rounded inline-block">{event.ipAddress}</span>
							) : (
								<span className="text-gray-400 italic">-</span>
							)}
						</p>
					</div>
				</div>

				{event.userAgent && (
					<div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
						<h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-2">
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
							</svg>
							User Agent
						</h3>
						<p className="text-gray-700 text-sm break-all bg-white p-3 rounded border border-gray-200">{event.userAgent}</p>
					</div>
				)}

				{event.details && <AuditEventDetailsJson details={event.details} />}
			</div>
		</div>
	);
}

function AuditEventDetailsJson({ details }: { details: string }) {
	let parsedDetails: unknown = null;
	let isJson = false;
	try {
		parsedDetails = JSON.parse(details);
		isJson = true;
	} catch {
		// plain text
	}

	return (
		<div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide flex items-center gap-2">
					<svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
					</svg>
					{isJson ? "Détails (JSON)" : "Détails"}
				</h3>
				{isJson && (
					<Badge className="bg-green-500/20 text-green-400 border border-green-500/30">JSON Valide</Badge>
				)}
			</div>
			{isJson ? (
				<div className="bg-gray-950 p-4 rounded-lg border border-gray-800 overflow-x-auto">
					<pre className="text-green-400 text-sm font-mono leading-relaxed">{JSON.stringify(parsedDetails, null, 2)}</pre>
				</div>
			) : (
				<div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
					<pre className="text-gray-300 text-sm font-mono leading-relaxed whitespace-pre-wrap break-words">{details}</pre>
				</div>
			)}
			{isJson && parsedDetails !== null && typeof parsedDetails === "object" && (
				<div className="mt-4 pt-4 border-t border-gray-700">
					<h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Vue structurée</h4>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{Object.entries(parsedDetails as Record<string, unknown>).map(([key, value]) => (
							<div key={key} className="bg-gray-800/50 p-3 rounded border border-gray-700">
								<div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{key}</div>
								<div className="text-gray-200 text-sm font-medium">
									{typeof value === "object" ? JSON.stringify(value) : String(value)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
