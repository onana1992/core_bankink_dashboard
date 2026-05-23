"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { OpsEmptyState, OpsLoadingState, OpsModal } from "@/components/ops";
import {
	OPS_CARD_HEADER,
	OPS_CARD_SHELL,
	OPS_TABLE,
	OPS_TABLE_WRAP,
	OPS_TD,
	OPS_TH,
	OPS_THEAD,
	OPS_TR_HOVER
} from "@/components/ops/opsClasses";
import { customersApi } from "@/lib/api";
import type { ComplianceTask, ComplianceTaskStatus, ComplianceTaskType } from "@/types";

type ToastPayload = { message: string; type: "success" | "error" };

type Props = {
	customerId: number;
	locale: string;
	onToast: (toast: ToastPayload) => void;
	refreshToken?: number;
};

function complianceTaskTypeLabel(t: TFunction, taskType: string): string {
	const key =
		taskType === "AML_REKYC_FOLLOWUP" ? "REINFORCED_KYC_AML_REVIEW" : taskType;
	return t(`customer.detail.compliance.tasks.taskType.${key}`);
}

function taskStatusBadgeVariant(status: ComplianceTaskStatus): "success" | "danger" | "warning" | "neutral" {
	if (status === "DONE") return "success";
	if (status === "CANCELLED") return "neutral";
	return "warning";
}

export function ComplianceTasksPanel({ customerId, locale, onToast, refreshToken = 0 }: Props) {
	const { t } = useTranslation();
	const [tasks, setTasks] = useState<ComplianceTask[]>([]);
	const [loading, setLoading] = useState(false);
	const [actionKey, setActionKey] = useState<string | null>(null);
	const [showCreate, setShowCreate] = useState(false);
	const [newType, setNewType] = useState<ComplianceTaskType>("EDD_REVIEW");
	const [newInstruction, setNewInstruction] = useState("");
	const [selectedTask, setSelectedTask] = useState<ComplianceTask | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [modalResolutionNote, setModalResolutionNote] = useState("");

	const loadTasks = useCallback(async () => {
		setLoading(true);
		try {
			const list = await customersApi.listComplianceTasks(customerId);
			setTasks(list);
			setSelectedTask(prev => {
				if (!prev) return null;
				return list.find(item => item.id === prev.id) ?? prev;
			});
		} catch (e) {
			onToast({
				message: e instanceof Error ? e.message : t("customer.detail.compliance.tasks.loadError"),
				type: "error"
			});
		} finally {
			setLoading(false);
		}
	}, [customerId, onToast, t]);

	useEffect(() => {
		void loadTasks();
	}, [loadTasks, refreshToken]);

	const openTasks = useMemo(() => tasks.filter(task => task.status === "OPEN"), [tasks]);
	const openEddCount = useMemo(
		() => openTasks.filter(task => task.taskType === "EDD_REVIEW").length,
		[openTasks]
	);

	const openTaskModal = (task: ComplianceTask) => {
		setSelectedTask(task);
		setModalResolutionNote("");
		setModalOpen(true);
	};

	const closeTaskModal = () => {
		setModalOpen(false);
		setSelectedTask(null);
		setModalResolutionNote("");
	};

	const handleCreate = async () => {
		setActionKey("create");
		try {
			await customersApi.createComplianceTask(customerId, {
				taskType: newType,
				instruction: newInstruction.trim() || undefined
			});
			setNewInstruction("");
			setShowCreate(false);
			await loadTasks();
			onToast({ message: t("customer.detail.compliance.tasks.created"), type: "success" });
		} catch (e) {
			onToast({ message: e instanceof Error ? e.message : String(e), type: "error" });
		} finally {
			setActionKey(null);
		}
	};

	const handlePatch = async (taskId: number, status: ComplianceTaskStatus) => {
		setActionKey(`patch-${taskId}-${status}`);
		try {
			await customersApi.patchComplianceTask(customerId, taskId, {
				status,
				resolutionNote: modalResolutionNote.trim() || undefined
			});
			await loadTasks();
			closeTaskModal();
			onToast({ message: t("customer.detail.compliance.tasks.updated"), type: "success" });
		} catch (e) {
			onToast({ message: e instanceof Error ? e.message : String(e), type: "error" });
		} finally {
			setActionKey(null);
		}
	};

	return (
		<div className="space-y-6" role="tabpanel" id="compliance-subpanel-complianceTasks" aria-labelledby="compliance-subtab-complianceTasks">
			{openEddCount > 0 ? (
				<div className="rounded-ops-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
					<p className="font-semibold">{t("customer.detail.compliance.tasks.openEddBannerTitle")}</p>
					<p className="mt-1 text-xs leading-relaxed">{t("customer.detail.compliance.tasks.openEddBannerHint", { count: openEddCount })}</p>
				</div>
			) : null}

			<section className={OPS_CARD_SHELL} aria-labelledby="compliance-tasks-title">
				<div className={`${OPS_CARD_HEADER} flex flex-wrap items-center justify-between gap-3`}>
					<div>
						<h3 id="compliance-tasks-title" className="text-sm font-semibold tracking-tight text-ops-fg">
							{t("customer.detail.compliance.tasks.title")}
						</h3>
						<p className="mt-0.5 text-xs text-ops-fg-muted">{t("customer.detail.compliance.tasks.subtitle")}</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void loadTasks()}>
							{t("customer.detail.compliance.refresh")}
						</Button>
						<Button type="button" size="sm" disabled={loading || actionKey !== null} onClick={() => setShowCreate(v => !v)}>
							{showCreate ? t("customer.detail.compliance.tasks.cancelCreate") : t("customer.detail.compliance.tasks.newTask")}
						</Button>
					</div>
				</div>

				{showCreate ? (
					<div className="border-b border-ops-border bg-ops-surface-muted/40 px-4 py-4 sm:px-6">
						<div className="grid max-w-2xl gap-3">
							<label className="block text-xs font-medium text-ops-fg">
								{t("customer.detail.compliance.tasks.createType")}
								<select
									className="mt-1 w-full rounded-ops-md border border-ops-border bg-ops-surface px-3 py-2 text-sm"
									value={newType}
									onChange={e => setNewType(e.target.value as ComplianceTaskType)}
								>
									<option value="EDD_REVIEW">{t("customer.detail.compliance.tasks.taskType.EDD_REVIEW")}</option>
									<option value="REINFORCED_KYC_AML_REVIEW">{t("customer.detail.compliance.tasks.taskType.REINFORCED_KYC_AML_REVIEW")}</option>
								</select>
							</label>
							<label className="block text-xs font-medium text-ops-fg">
								{t("customer.detail.compliance.tasks.createInstruction")}
								<textarea
									className="mt-1 w-full rounded-ops-md border border-ops-border bg-ops-surface px-3 py-2 text-sm"
									rows={3}
									value={newInstruction}
									onChange={e => setNewInstruction(e.target.value)}
									placeholder={t("customer.detail.compliance.tasks.createInstructionPlaceholder")}
								/>
							</label>
							<div>
								<Button type="button" size="sm" disabled={actionKey !== null} onClick={() => void handleCreate()}>
									{actionKey === "create" ? "…" : t("customer.detail.compliance.tasks.submitCreate")}
								</Button>
							</div>
						</div>
					</div>
				) : null}

				{loading ? (
					<div className="p-6">
						<OpsLoadingState embedded message={t("customer.detail.compliance.tasks.loading")} />
					</div>
				) : tasks.length === 0 ? (
					<div className="p-6">
						<OpsEmptyState title={t("customer.detail.compliance.tasks.emptyTitle")} description={t("customer.detail.compliance.tasks.empty")} />
					</div>
				) : (
					<div className={OPS_TABLE_WRAP}>
						<table className={OPS_TABLE}>
							<thead className={OPS_THEAD}>
								<tr>
									<th className={OPS_TH}>#</th>
									<th className={OPS_TH}>{t("customer.detail.compliance.tasks.columnType")}</th>
									<th className={OPS_TH}>{t("customer.detail.compliance.status")}</th>
									<th className={OPS_TH}>{t("customer.detail.compliance.tasks.columnCreated")}</th>
									<th className={OPS_TH}>{t("customer.detail.compliance.tasks.columnActions")}</th>
								</tr>
							</thead>
							<tbody>
								{tasks.map(task => (
									<tr key={task.id} className={OPS_TR_HOVER}>
										<td className={OPS_TD}>{task.id}</td>
										<td className={OPS_TD}>
											<span className="text-sm font-medium text-ops-fg">
												{complianceTaskTypeLabel(t, task.taskType)}
											</span>
										</td>
										<td className={OPS_TD}>
											<Badge variant={taskStatusBadgeVariant(task.status)}>
												{t(`customer.detail.compliance.tasks.status.${task.status}`)}
											</Badge>
										</td>
										<td className={OPS_TD}>
											<span className="text-xs text-ops-fg-muted">
												{task.createdAt ? new Date(task.createdAt).toLocaleString(locale) : "—"}
											</span>
											{task.resolvedAt ? (
												<p className="mt-0.5 text-[11px] text-ops-fg-muted">
													{t("customer.detail.compliance.tasks.resolvedAt")}{" "}
													{new Date(task.resolvedAt).toLocaleString(locale)}
												</p>
											) : null}
										</td>
										<td className={OPS_TD}>
											<Button type="button" size="sm" variant="outline" onClick={() => openTaskModal(task)}>
												{t("customer.detail.compliance.tasks.open")}
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<OpsModal
				open={modalOpen}
				onOpenChange={open => {
					if (!open) closeTaskModal();
					else setModalOpen(true);
				}}
				size="lg"
				className="!p-6 sm:!p-8"
				title={
					selectedTask
						? t("customer.detail.compliance.tasks.modalTitle", { id: selectedTask.id })
						: t("customer.detail.compliance.tasks.title")
				}
				description={
					selectedTask
						? complianceTaskTypeLabel(t, selectedTask.taskType)
						: undefined
				}
				footer={
					selectedTask?.status === "OPEN" ? (
						<>
							<Button
								type="button"
								variant="outline"
								disabled={actionKey !== null}
								onClick={() => void handlePatch(selectedTask.id, "CANCELLED")}
							>
								{actionKey === `patch-${selectedTask.id}-CANCELLED`
									? "…"
									: t("customer.detail.compliance.tasks.cancelTask")}
							</Button>
							<Button
								type="button"
								disabled={actionKey !== null}
								onClick={() => void handlePatch(selectedTask.id, "DONE")}
							>
								{actionKey === `patch-${selectedTask.id}-DONE`
									? "…"
									: t("customer.detail.compliance.tasks.markDone")}
							</Button>
						</>
					) : (
						<Button type="button" variant="outline" onClick={closeTaskModal}>
							{t("customer.detail.compliance.tasks.modalClose")}
						</Button>
					)
				}
			>
				{selectedTask ? (
					<div className="space-y-4 text-sm text-ops-fg">
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-xs text-ops-fg-muted">{t("customer.detail.compliance.status")}</span>
							<Badge variant={taskStatusBadgeVariant(selectedTask.status)}>
								{t(`customer.detail.compliance.tasks.status.${selectedTask.status}`)}
							</Badge>
						</div>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div className="rounded-lg border border-ops-border bg-ops-surface-muted/40 px-3 py-2">
								<p className="text-[10px] font-semibold uppercase tracking-wide text-ops-fg-muted">
									{t("customer.detail.compliance.tasks.columnCreated")}
								</p>
								<p className="mt-0.5 font-medium">
									{selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleString(locale) : "—"}
								</p>
							</div>
							{selectedTask.resolvedAt ? (
								<div className="rounded-lg border border-ops-border bg-ops-surface-muted/40 px-3 py-2">
									<p className="text-[10px] font-semibold uppercase tracking-wide text-ops-fg-muted">
										{t("customer.detail.compliance.tasks.resolvedAt")}
									</p>
									<p className="mt-0.5 font-medium">
										{new Date(selectedTask.resolvedAt).toLocaleString(locale)}
									</p>
								</div>
							) : null}
						</div>

						<div className="rounded-lg border border-ops-border bg-ops-surface-muted/40 px-3 py-3">
							<p className="text-[10px] font-semibold uppercase tracking-wide text-ops-fg-muted">
								{t("customer.detail.compliance.tasks.modalInstruction")}
							</p>
							<p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ops-fg">
								{selectedTask.instruction?.trim() || t("customer.detail.compliance.tasks.modalNoInstruction")}
							</p>
						</div>

						{selectedTask.resolutionNote ? (
							<div className="rounded-lg border border-ops-border bg-ops-surface-muted/40 px-3 py-3">
								<p className="text-[10px] font-semibold uppercase tracking-wide text-ops-fg-muted">
									{t("customer.detail.compliance.tasks.resolution")}
								</p>
								<p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ops-fg">
									{selectedTask.resolutionNote}
								</p>
							</div>
						) : null}

						{selectedTask.status === "OPEN" ? (
							<label className="block text-xs font-medium text-ops-fg">
								{t("customer.detail.compliance.tasks.resolutionPlaceholder")}
								<Input
									value={modalResolutionNote}
									onChange={e => setModalResolutionNote(e.target.value)}
									className="mt-1 text-sm"
								/>
							</label>
						) : null}
					</div>
				) : null}
			</OpsModal>
		</div>
	);
}
