"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import Toast, { ToastType } from "@/components/ui/Toast";

interface ToastMessage {
	message: string;
	type: ToastType;
}

interface ToastContextType {
	showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_EVENT_NAME = "show-toast";

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toast, setToast] = useState<ToastMessage | null>(null);

	const showToast = (message: string, type: ToastType = "error") => {
		setToast({ message, type });
	};

	useEffect(() => {
		// Écouter les événements de toast depuis n'importe où dans l'application
		const handleToastEvent = (event: Event) => {
			const customEvent = event as CustomEvent<{ message: string; type: ToastType }>;
			if (customEvent.detail) {
				setToast({
					message: customEvent.detail.message,
					type: customEvent.detail.type || "error"
				});
			}
		};

		window.addEventListener(TOAST_EVENT_NAME, handleToastEvent as EventListener);

		return () => {
			window.removeEventListener(TOAST_EVENT_NAME, handleToastEvent as EventListener);
		};
	}, []);

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					onClose={() => setToast(null)}
				/>
			)}
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		// Fallback si le contexte n'est pas disponible (pour compatibilité)
		return {
			showToast: (message: string, type?: ToastType) => {
				console.error(`[Toast] ${type || "error"}: ${message}`);
			}
		};
	}
	return context;
}

