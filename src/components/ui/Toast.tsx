"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
	message: string;
	type: ToastType;
	onClose: () => void;
	duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
	const displayMessage = typeof message === "string" ? message : "";
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose();
		}, duration);

		return () => clearTimeout(timer);
	}, [onClose, duration]);

	const bgColor = {
		success: "border-[var(--ops-toast-success-border)] bg-[var(--ops-toast-success-bg)] text-[var(--ops-toast-success-fg)]",
		error: "border-[var(--ops-toast-error-border)] bg-[var(--ops-toast-error-bg)] text-[var(--ops-toast-error-fg)]",
		info: "border-[var(--ops-toast-info-border)] bg-[var(--ops-toast-info-bg)] text-[var(--ops-toast-info-fg)]",
		warning: "border-[var(--ops-toast-warning-border)] bg-[var(--ops-toast-warning-bg)] text-[var(--ops-toast-warning-fg)]"
	}[type];

	return (
		<div
			className={`fixed top-4 right-4 z-50 max-w-[min(100vw-2rem,28rem)] px-4 py-3 rounded-ops-lg border shadow-ops-overlay ${bgColor} transition-all duration-300 ease-in-out`}
			role="alert"
			style={{
				animation: "slideIn 0.3s ease-out"
			}}
		>
			<div className="flex items-center gap-2">
				<span className="font-medium">{displayMessage}</span>
				<button
					onClick={onClose}
					className="ml-2 text-current opacity-70 hover:opacity-100 text-xl leading-none font-bold"
					aria-label="Fermer"
				>
					×
				</button>
			</div>
		</div>
	);
}

