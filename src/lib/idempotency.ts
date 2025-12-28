/**
 * Génère une clé d'idempotence unique pour les transactions
 * @param prefix Préfixe pour identifier le type de transaction (ex: "deposit", "withdrawal", "transfer")
 * @returns Une clé d'idempotence unique
 */
export function generateIdempotencyKey(prefix: string): string {
	// Utiliser crypto.randomUUID() si disponible (navigateurs modernes)
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return `${prefix}-${crypto.randomUUID()}`;
	}
	// Fallback pour les environnements sans crypto.randomUUID
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 15);
	return `${prefix}-${timestamp}-${random}`;
}

