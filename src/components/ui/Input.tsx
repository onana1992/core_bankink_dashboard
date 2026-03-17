import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

type InputProps = ComponentProps<"input"> & {
	label?: string;
};

export default function Input({ className, label, ...props }: InputProps) {
	const input = (
		<input
			className={cn(
				"w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300",
				className
			)}
			{...props}
		/>
	);
	if (label) {
		return (
			<div className="space-y-1">
				<label className="block text-sm font-medium text-gray-700">{label}</label>
				{input}
			</div>
		);
	}
	return input;
}


