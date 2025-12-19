export type TransferStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface Transfer {
	id: number;
	transferNumber: string;
	fromAccountId: number;
	toAccountId: number;
	amount: number;
	currency: string;
	status: TransferStatus;
	description?: string;
	reference?: string;
	feeAmount: number;
	feeTransactionId?: number;
	fromTransactionId?: number;
	toTransactionId?: number;
	metadata?: string;
	valueDate: string;
	executionDate?: string;
	createdBy?: number;
	createdAt: string;
	updatedAt: string;
}

export interface CreateTransferRequest {
	fromAccountId: number;
	toAccountId: number;
	amount: number;
	currency?: string;
	description?: string;
	reference?: string;
	valueDate?: string;
	metadata?: string;
}

export interface CancelTransferRequest {
	reason: string;
}












