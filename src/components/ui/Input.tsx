import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

type InputProps = ComponentProps<"input">;

export default function Input({ className, ...props }: InputProps) {
	return (
		<input
			className={cn(
				"w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300",
				className
			)}
			{...props}
		/>
	);
}


