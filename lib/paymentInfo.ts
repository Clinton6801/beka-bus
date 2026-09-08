/**
 * Payment Information Configuration
 * Fill in with actual school bank details
 */

export const paymentInfo = {
  bankName: "First Bank Nigeria",
  accountName: "BEKA Academy Student Transit",
  accountNumber: "1234567890",
  accountEmail: "accounts@beka.ng",
  accountPhone: "+234 123 456 7890",
  paymentNote:
    "Use the student's Reference Code as the payment reference for tracking purposes.",
};

export type PaymentInfo = typeof paymentInfo;
