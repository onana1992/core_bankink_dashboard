"use client";

import { useTranslation } from "react-i18next";
import Button from "@/components/ui/Button";

/** Sélecteur « Taille de page » (ex. liste clients = page Événements d’audit). */
export const OPS_TABLE_PAGE_SIZE_OPTIONS: number[] = [10, 20, 50, 100];

export interface TablePaginationProps {
	/** Page courante (0-based). */
	page: number;
	/** Nombre total de pages. */
	totalPages: number;
	/** Nombre total d'éléments. */
	totalElements: number;
	/** Taille de la page. */
	pageSize: number;
	/** Callback pour changer de page. */
	onPageChange: (page: number) => void;
	/** Libellé pour "résultats" (ex: "événements", "utilisateurs"). Défaut: "résultats". */
	resultsLabel?: string;
	/** Afficher les boutons Premier / Dernier. Défaut: true. */
	showFirstLast?: boolean;
	/** Options de taille de page (ex: [10, 20, 50, 100]). Si défini, affiche le sélecteur. */
	sizeOptions?: number[];
	/** Taille actuelle (si sizeOptions fourni). */
	size?: number;
	/** Callback changement de taille (si sizeOptions fourni). */
	onSizeChange?: (size: number) => void;
	/** Classe CSS optionnelle pour le conteneur. */
	className?: string;
}

export default function TablePagination({
	page,
	totalPages,
	totalElements,
	pageSize,
	onPageChange,
	resultsLabel = "résultats",
	showFirstLast = true,
	sizeOptions,
	size,
	onSizeChange,
	className = ""
}: TablePaginationProps) {
	const { t } = useTranslation();
	const totalRaw = Number(totalElements);
	const total = Number.isFinite(totalRaw) && totalRaw >= 0 ? totalRaw : 0;
	/** Si `size` (sélecteur) diverge brièvement de `pageSize`, la dérivation du nombre de pages suit l’UI. */
	const ctl = size !== undefined ? Number(size) : NaN;
	const ctlOk = Number.isFinite(ctl) && ctl > 0;
	const fallbackPs = Number(pageSize);
	const safePageSize =
		ctlOk ? Math.floor(ctl) : Math.max(1, Number.isFinite(fallbackPs) && fallbackPs > 0 ? Math.floor(fallbackPs) : 1);
	const apiPagesRaw = Number(totalPages);
	const apiPages = Number.isFinite(apiPagesRaw) && apiPagesRaw >= 0 ? apiPagesRaw : 0;
	/**
	 * Dériver le nombre de pages à partir du total et de la taille affichée.
	 * Ne pas prendre Math.max(api, inferé) : l’API peut renvoyer un totalPages obsolète ou erroné
	 * après changement de taille ou bug serveur → affichage type « Page 1 sur 46 » pour 46 clients / 10.
	 */
	const pages =
		total > 0 ? Math.max(1, Math.ceil(total / safePageSize)) : Math.max(0, apiPages);
	if (total === 0 && pages <= 1 && !sizeOptions?.length) return null;

	const pageLabelTotal = pages > 0 ? pages : 1;
	const maxPageIdx = Math.max(0, pages - 1);
	const safePage =
		pages > 0 ? Math.min(Math.max(0, Number(page) || 0), maxPageIdx) : Math.max(0, Number(page) || 0);

	const from = total === 0 ? 0 : safePage * safePageSize + 1;
	const to = Math.min((safePage + 1) * safePageSize, total);
	const hasPrevious = pages > 0 && safePage > 0;
	const hasNext = pages > 0 && safePage < maxPageIdx;
	/** Liste clients / audit : lorsque le sélecteur de taille est présent, la rangée Premier–Suivant reste visible (évite métadonnées pagination à 0 côté API). */
	const showPageNav =
		pages > 0 ||
		total > 0 ||
		Boolean(sizeOptions?.length && onSizeChange);

	return (
		<div
			className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 px-4 sm:px-6 py-4 border-t border-ops-border bg-ops-surface-muted ${className}`}
		>
			<div className="flex w-full shrink-0 items-center gap-4 flex-wrap sm:w-auto justify-center sm:justify-start">
				<p className="text-sm text-ops-fg">
					{t("tablePagination.range", {
						from,
						to,
						total: total.toLocaleString(),
						resultsLabel
					})}
				</p>
				{sizeOptions && size !== undefined && onSizeChange && (
					<div className="flex items-center gap-2">
						<label className="text-sm text-ops-fg-muted">{t("tablePagination.pageSize")}</label>
						<select
							className="px-2 py-1 rounded-ops-md text-sm border border-ops-border bg-ops-surface focus:outline-none focus:ring-2 focus:ring-ops-ring/30 focus:border-ops-ring"
							value={size}
							onChange={(e) => {
								const next = Number(e.target.value);
								onSizeChange(next);
								/** Ne pas appeler `onPageChange(0)` ici : plusieurs écrans appelaient `load(0)`
								 * avant le rerender après `setPageSize`, requête avec l’ancienne taille puis course avec l’effect. */
							}}
						>
							{sizeOptions.map((n) => (
								<option key={n} value={n}>{n}</option>
							))}
						</select>
					</div>
				)}
			</div>
			{showPageNav && (
				<div
					className="flex w-full shrink-0 flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end"
					aria-label={t("tablePagination.pageControlsAria")}
				>
					{showFirstLast && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPageChange(0)}
							disabled={!hasPrevious}
							className="px-3 py-1 text-sm"
						>
							{t("tablePagination.first")}
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(safePage - 1)}
						disabled={!hasPrevious}
						className="px-3 py-1 text-sm"
					>
						{t("tablePagination.previous")}
					</Button>
					<span className="px-4 py-1 text-sm text-ops-fg whitespace-nowrap">
						{t("tablePagination.pageOf", { current: safePage + 1, total: pageLabelTotal })}
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(safePage + 1)}
						disabled={!hasNext}
						className="px-3 py-1 text-sm"
					>
						{t("tablePagination.next")}
					</Button>
					{showFirstLast && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPageChange(Math.max(0, pages - 1))}
							disabled={!hasNext}
							className="px-3 py-1 text-sm"
						>
							{t("tablePagination.last")}
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
