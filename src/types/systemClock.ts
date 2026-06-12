export type SystemClockStatus = {
	enabled: boolean;
	zone: string;
	effectiveDateTime: string;
	systemDateTime: string;
	simulated: boolean;
};

export type UpdateSystemClockRequest = {
	enabled?: boolean;
	dateTime?: string;
};
