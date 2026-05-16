/**
 * Chaînes Tailwind réutilisables — tableaux, filtres, surfaces OPS.
 * Préférez ces constantes aux copier-coller dans les pages KYC/AML/audit.
 */

export const OPS_CARD_SHELL =
	"bg-ops-surface rounded-ops-xl shadow-ops-card border border-ops-border overflow-hidden";

export const OPS_CARD_HEADER = "px-6 py-4 border-b border-ops-border bg-ops-surface-muted";

export const OPS_TABLE_WRAP = "overflow-x-auto";

export const OPS_TABLE = "min-w-full divide-y divide-ops-border";

export const OPS_THEAD = "bg-ops-surface-muted";

export const OPS_TH =
	"px-6 py-3 text-left text-xs font-bold text-ops-fg uppercase tracking-wider";

export const OPS_TR_HOVER = "hover:bg-ops-surface-muted/80 transition-colors";

export const OPS_TD = "px-6 py-4 whitespace-nowrap text-sm text-ops-fg";

/** Select natif harmonisé (filtres + pagination taille de page). */
export const OPS_SELECT =
	"w-full px-3 py-2 text-sm rounded-ops-md border border-ops-border bg-ops-surface text-ops-fg shadow-sm focus:outline-none focus:ring-2 focus:ring-ops-ring/30 focus:border-ops-ring";

/** Grille filtres responsive par défaut. */
export const OPS_FILTER_GRID =
	"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";

/** Conteneur page — colonne avec espacement vertical standard. */
export const OPS_PAGE_STACK = "space-y-6";
