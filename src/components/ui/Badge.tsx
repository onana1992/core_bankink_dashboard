import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

type BadgeProps = ComponentProps<"span"> & {
	variant?: "neutral" | "success" | "warning" | "danger" | "info";
};

export default function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
	const variants = {
		neutral: "bg-gray-100 text-gray-700",
		success: "bg-emerald-100 text-emerald-700",
		warning: "bg-amber-100 text-amber-700",
		danger: "bg-rose-100 text-rose-700",
		info: "bg-sky-100 text-sky-700"
	};
	return <span className={cn("px-2 py-1 rounded-full text-xs", variants[variant], className)} {...props} />;
}


