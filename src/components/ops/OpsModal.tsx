"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { OpsModalSize } from "@/types/ui";

const sizeClass: Record<OpsModalSize, string> = {
	sm: "max-w-md",
	md: "max-w-lg",
	lg: "max-w-2xl",
	xl: "max-w-4xl"
};

type OpsModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description?: ReactNode;
	size?: OpsModalSize;
	children: ReactNode;
	footer?: ReactNode;
	className?: string;
};

/** Modale standard Radix — focus trap, overlay, fermeture clavier. */
export function OpsModal({
	open,
	onOpenChange,
	title,
	description,
	size = "md",
	children,
	footer,
	className
}: OpsModalProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-[100] bg-black/40" />
				<Dialog.Content
					className={cn(
						"fixed left-1/2 top-1/2 z-[101] w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-ops-xl border border-ops-border bg-ops-surface p-6 shadow-ops-overlay focus:outline-none",
						sizeClass[size],
						className
					)}
				>
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0">
							<Dialog.Title className="text-lg font-semibold text-ops-fg pr-8">{title}</Dialog.Title>
							{description ? (
								<Dialog.Description className="mt-1 text-sm text-ops-fg-muted">
									{description}
								</Dialog.Description>
							) : null}
						</div>
						<Dialog.Close
							className="rounded-ops-md p-1.5 text-ops-fg-muted hover:bg-ops-surface-muted hover:text-ops-fg shrink-0"
							aria-label="Fermer"
						>
							<Cross2Icon className="h-4 w-4" />
						</Dialog.Close>
					</div>
					<div className="mt-4 max-h-[min(70vh,640px)] overflow-y-auto">{children}</div>
					{footer ? <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-ops-border pt-4">{footer}</div> : null}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
