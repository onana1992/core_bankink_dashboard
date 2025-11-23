import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & {
	variant?: "default" | "outline" | "ghost";
	size?: "sm" | "md";
};

export default function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
	const base =
		"inline-flex items-center justify-center rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
	const variants = {
		default: "bg-gray-900 text-white hover:bg-gray-800",
		outline: "border hover:bg-gray-50",
		ghost: "hover:bg-gray-100"
	};
	const sizes = {
		sm: "h-8 px-3",
		md: "h-9 px-3"
	};
	return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}


