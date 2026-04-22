"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Filter, Layers, Loader2, OctagonAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { balanceSnapshotsApi, ledgerAccountsApi } from "@/lib/api";
import type { BalanceSnapshot, LedgerAccount } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TablePagination from "@/components/ui/TablePagination";

const selectClass =
	"w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white";

export default function BalanceSnapshotsPage() {
	const router = useRouter();
	const { isAuthenticated, loading: authLoading } = useAuth();
	const [snapshotDate, setSnapshotDate] = useState(() => new Date().toISOString().split("T")[0]);
	const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
	const [filterLedgerId, setFilterLedgerId] = useState<string>("");
	const [rows, setRows] = useState<BalanceSnapshot[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingAccounts, setLoadingAccounts] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(20);

	const loadLedgerAccounts = useCallback(async () => {
		setLoadingAccounts(true);
		try {
			const list = await ledgerAccountsApi.list();
			setLedgerAccounts(list);
		} catch {
			setLedgerAccounts([]);
		} finally {
			setLoadingAccounts(false);
		}
	}, []);

	const loadSnapshots = useCallback(async () => {
		setLoading(true);
		setError(null);
		setPage(0);
		try {
			if (filterLedgerId) {
				const id = Number(filterLedgerId);
				const data = await balanceSnapshotsApi.listByLedgerAccount(id, snapshotDate, snapshotDate);
				setRows(data);
			} else {
				const data = await balanceSnapshotsApi.listByDate(snapshotDate);
				setRows(data);
			}
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Impossible de charger les snapshots";
			setError(msg);
			setRows([]);
		} finally {
			setLoading(false);
		}
	}, [snapshotDate, filterLedgerId]);

	useEffect(() => {
		if (authLoading || !isAuthenticated) return;
		loadLedgerAccounts();
	}, [authLoading, isAuthenticated, loadLedgerAccounts]);

	useEffect(() => {
		if (authLoading || !isAuthenticated) return;
		loadSnapshots();
	}, [authLoading, isAuthenticated, loadSnapshots]);

	const paginated = useMemo(() => {
		const start = page * size;
		return rows.slice(start, start + size);
	}, [rows, page, size]);

	const totalPages = Math.max(1, Math.ceil(rows.length / size));

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

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Snapshots GL</h1>
					<p className="mt-1 text-gray-600">
						Soldes figés par compte du grand livre et par date (générés lors des clôtures journalières ou mensuelles).
					</p>
				</div>
				<Link href="/closures">
					<Button variant="outline" className="flex items-center gap-2">
						<Layers className="h-4 w-4" />
						Clôtures
					</Button>
				</Link>
			</div>

			<div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
				<div className="mb-4 flex items-center gap-2">
					<Filter className="h-5 w-5 text-gray-500" />
					<h2 className="text-lg font-semibold text-gray-900">Critères</h2>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div>
						<Input
							label="Date de situation"
							type="date"
							value={snapshotDate}
							onChange={(e) => setSnapshotDate(e.target.value)}
						/>
					</div>
					<div>
						<label className="mb-2 block text-sm font-medium text-gray-700">Compte GL (optionnel)</label>
						<select
							className={selectClass}
							value={filterLedgerId}
							onChange={(e) => setFilterLedgerId(e.target.value)}
							disabled={loadingAccounts}
						>
							<option value="">Tous les comptes</option>
							{ledgerAccounts.map((a) => (
								<option key={a.id} value={String(a.id)}>
									{a.code} — {a.name}
								</option>
							))}
						</select>
					</div>
					<div className="flex items-end">
						<Button className="w-full flex items-center justify-center gap-2" onClick={() => loadSnapshots()}>
							{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
							Actualiser
						</Button>
					</div>
				</div>
			</div>

			{error && (
				<div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
					<OctagonAlert className="mt-0.5 h-5 w-5 shrink-0" />
					<p className="text-sm">{error}</p>
				</div>
			)}

			{loading && rows.length === 0 ? (
				<div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
					<Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
					<p className="mt-4 text-gray-600">Chargement des snapshots…</p>
				</div>
			) : rows.length === 0 ? (
				<div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
					<Camera className="mx-auto mb-4 h-16 w-16 text-gray-300" />
					<p className="text-lg font-medium text-gray-600">Aucun snapshot pour cette date</p>
					<p className="mt-2 text-sm text-gray-500">
						Effectuez une clôture journalière ou mensuelle pour cette date, ou choisissez une autre date.
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
										Compte GL
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
										Devise
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
										Ouverture
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
										Clôture
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
										Débit jour
									</th>
									<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
										Crédit jour
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
										Créé le
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 bg-white text-sm">
								{paginated.map((s) => (
									<tr key={s.id} className="hover:bg-gray-50">
										<td className="px-4 py-3">
											<Link
												href={`/ledger-accounts/${s.ledgerAccountId}`}
												className="font-mono text-blue-600 hover:underline"
											>
												{s.ledgerAccountCode ?? `#${s.ledgerAccountId}`}
											</Link>
											{s.ledgerAccountName && (
												<div className="text-xs text-gray-600">{s.ledgerAccountName}</div>
											)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap">{s.currency}</td>
										<td className="px-4 py-3 text-right font-mono">
											{s.openingBalance.toLocaleString("fr-FR", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2
											})}
										</td>
										<td className="px-4 py-3 text-right font-mono font-medium">
											{s.closingBalance.toLocaleString("fr-FR", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2
											})}
										</td>
										<td className="px-4 py-3 text-right font-mono text-gray-700">
											{s.totalDebit.toLocaleString("fr-FR", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2
											})}
										</td>
										<td className="px-4 py-3 text-right font-mono text-gray-700">
											{s.totalCredit.toLocaleString("fr-FR", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2
											})}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-gray-600">
											{new Date(s.createdAt).toLocaleString("fr-FR")}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{rows.length > size && (
						<TablePagination
							page={page}
							totalPages={totalPages}
							totalElements={rows.length}
							pageSize={size}
							onPageChange={setPage}
							resultsLabel={rows.length > 1 ? "snapshots" : "snapshot"}
							showFirstLast
							sizeOptions={[10, 20, 50, 100]}
							size={size}
							onSizeChange={(s) => {
								setSize(s);
								setPage(0);
							}}
						/>
					)}
				</div>
			)}
		</div>
	);
}
