"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import Toast, { ToastType } from "@/components/ui/Toast";
import { translateApiError } from "@/lib/translateApiError";

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
	const { t } = useTranslation();
	const [toast, setToast] = useState<ToastMessage | null>(null);

	const showToast = useCallback((message: string, type: ToastType = "error") => {
		setToast({ message: translateApiError(message, t), type });
	}, [t]);

	useEffect(() => {
		const handleToastEvent = (event: Event) => {
			const customEvent = event as CustomEvent<{ message: string; type: ToastType }>;
			if (customEvent.detail) {
				const rawMessage = customEvent.detail.message;
				setToast({
					message: translateApiError(rawMessage, t),
					type: customEvent.detail.type || "error"
				});
			}
		};

		window.addEventListener(TOAST_EVENT_NAME, handleToastEvent as EventListener);

		return () => {
			window.removeEventListener(TOAST_EVENT_NAME, handleToastEvent as EventListener);
		};
	}, [t]);

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

