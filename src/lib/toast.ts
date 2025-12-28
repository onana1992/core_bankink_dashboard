// Système de toast global utilisant des événements DOM
// Permet d'afficher des toasts depuis n'importe où, même en dehors des composants React

type ToastType = "success" | "error" | "info" | "warning";

interface ToastEvent {
	message: string;
	type: ToastType;
}

const TOAST_EVENT_NAME = "show-toast";

export function showToast(message: string, type: ToastType = "error") {
	if (typeof window === "undefined") {
		// Côté serveur, juste logger
		console.error(`[Toast] ${type}: ${message}`);
		return;
	}

	// Émettre un événement personnalisé
	const event = new CustomEvent<ToastEvent>(TOAST_EVENT_NAME, {
		detail: { message, type }
	});
	window.dispatchEvent(event);
}

// Fonction utilitaire pour obtenir le listener d'événement
export function getToastEventListener() {
	return (event: Event) => {
		const customEvent = event as CustomEvent<ToastEvent>;
		// Cet événement sera écouté par le ToastProvider
	};
