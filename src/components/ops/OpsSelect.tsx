"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { OPS_SELECT } from "@/components/ops/opsClasses";

export type OpsSelectProps = ComponentPropsWithoutRef<"select">;

export const OpsSelect = forwardRef<HTMLSelectElement, OpsSelectProps>(function OpsSelect(
	{ className, ...props },
	ref
) {
	return <select ref={ref} className={cn(OPS_SELECT, className)} {...props} />;
});
