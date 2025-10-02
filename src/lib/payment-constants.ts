// Payment status constants to ensure consistency across the application
export const PAYMENT_STATUS = {
  SUCCESS: 'success',
  SUCCESSFUL: 'successful',
  COMPLETED: 'completed',
  PENDING: 'pending',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

// Helper to check if a payment status is successful
export const isSuccessfulPayment = (status: string): boolean => {
  const successStatuses = [
    PAYMENT_STATUS.SUCCESS,
    PAYMENT_STATUS.SUCCESSFUL,
    PAYMENT_STATUS.COMPLETED,
  ];
  return successStatuses.includes(status as any);
};

// Helper to get all successful payment statuses
export const getSuccessfulStatuses = (): string[] => {
  return [
    PAYMENT_STATUS.SUCCESS,
    PAYMENT_STATUS.SUCCESSFUL,
    PAYMENT_STATUS.COMPLETED,
  ];
};
