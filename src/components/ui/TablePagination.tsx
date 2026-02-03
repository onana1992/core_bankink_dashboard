"use client";

import Button from "@/components/ui/Button";

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
	const total = Number(totalElements) || 0;
	const pages = Math.max(0, Number(totalPages) || 0);
	if (total === 0 && pages <= 1 && !sizeOptions?.length) return null;

	const from = total === 0 ? 0 : page * pageSize + 1;
	const to = Math.min((page + 1) * pageSize, total);
	const hasPrevious = page > 0;
	const hasNext = page < pages - 1;

	return (
		<div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 ${className}`}>
			<div className="flex items-center gap-4 flex-wrap">
				<p className="text-sm text-gray-700">
					Affichage de <span className="font-medium">{from}</span> à <span className="font-medium">{to}</span> sur{" "}
					<span className="font-medium">{total.toLocaleString()}</span> {resultsLabel}
				</p>
				{sizeOptions && size !== undefined && onSizeChange && (
					<div className="flex items-center gap-2">
						<label className="text-sm text-gray-600">Taille de page</label>
						<select
							className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							value={size}
							onChange={(e) => {
								onSizeChange(Number(e.target.value));
								onPageChange(0);
							}}
						>
							{sizeOptions.map((n) => (
								<option key={n} value={n}>{n}</option>
							))}
						</select>
					</div>
				)}
			</div>
			{pages > 1 && (
				<div className="flex items-center gap-2">
					{showFirstLast && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPageChange(0)}
							disabled={!hasPrevious}
							className="px-3 py-1 text-sm"
						>
							Premier
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(page - 1)}
						disabled={!hasPrevious}
						className="px-3 py-1 text-sm"
					>
						Précédent
					</Button>
					<span className="px-4 py-1 text-sm text-gray-700 whitespace-nowrap">
						Page {page + 1} sur {pages}
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onPageChange(page + 1)}
						disabled={!hasNext}
						className="px-3 py-1 text-sm"
					>
						Suivant
					</Button>
					{showFirstLast && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPageChange(pages - 1)}
							disabled={!hasNext}
							className="px-3 py-1 text-sm"
						>
							Dernier
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
