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
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose();
		}, duration);

		return () => clearTimeout(timer);
	}, [onClose, duration]);

	const bgColor = {
		success: "bg-green-50 border-green-200 text-green-800",
		error: "bg-red-50 border-red-200 text-red-800",
		info: "bg-blue-50 border-blue-200 text-blue-800",
		warning: "bg-yellow-50 border-yellow-200 text-yellow-800"
	}[type];

	return (
		<div
			className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md border shadow-lg ${bgColor} transition-all duration-300 ease-in-out`}
			role="alert"
			style={{
				animation: "slideIn 0.3s ease-out"
			}}
		>
			<div className="flex items-center gap-2">
				<span className="font-medium">{message}</span>
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

