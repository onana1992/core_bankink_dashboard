export interface PaymentMethod {
	id: number;
	code: string;
	name: string;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export interface ProductPaymentMethod {
	id: number;
	paymentMethod: PaymentMethod;
	allowedDeposit: boolean;
	allowedWithdrawal: boolean;
	allowedLoanRepayment: boolean;
	displayOrder: number;
	createdAt?: string;
	updatedAt?: string;
}

export type PaymentMethodOperation = "DEPOSIT" | "WITHDRAWAL" | "LOAN_REPAYMENT";

export interface CreatePaymentMethodRequest {
	code: string;
	name: string;
	isActive?: boolean;
}

export interface UpdatePaymentMethodRequest {
	name?: string;
	isActive?: boolean;
}

export interface CreateProductPaymentMethodRequest {
	paymentMethodId: number;
	allowedDeposit?: boolean;
	allowedWithdrawal?: boolean;
	allowedLoanRepayment?: boolean;
	displayOrder?: number;
}

export interface UpdateProductPaymentMethodRequest {
	allowedDeposit?: boolean;
	allowedWithdrawal?: boolean;
	allowedLoanRepayment?: boolean;
	displayOrder?: number;
}
