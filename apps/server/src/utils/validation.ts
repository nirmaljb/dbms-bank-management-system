import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().trim().min(2, { message: 'Name must be at least 2 characters long' }),
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export function validateSignupInput(data: unknown) {
  return signupSchema.safeParse(data);
}

export function validateLoginInput(data: unknown) {
  return loginSchema.safeParse(data);
}

// Amounts travel as strings so no precision is lost before Postgres sees
// them. Range and decimal-place rules are enforced by fn_assert_amount.
export const amountSchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d+(\.\d+)?$/.test(v), { message: 'Enter a valid amount, e.g. 1500.00' });

export const amountBodySchema = z.object({ amount: amountSchema });

export const loanRequestSchema = z.object({
  amount: amountSchema,
  purpose: z.string().trim().min(3, { message: 'Purpose must be at least 3 characters' }).max(200),
});

export const sanctionLoanSchema = z.object({
  rate: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim()))
    .refine((v) => v === null || /^\d+(\.\d+)?$/.test(v), { message: 'Enter a valid interest rate' }),
});

export const reasonSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const accountStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'FROZEN']),
});

export const noticeSchema = z.object({
  title: z.string().trim().min(3, { message: 'Title must be at least 3 characters' }).max(120),
  body: z.string().trim().min(3, { message: 'Message must be at least 3 characters' }).max(2000),
  recipientUserId: z.string().uuid().nullable().optional(),
});

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Dates must be YYYY-MM-DD' })
  .optional();

export const statementQuerySchema = z.object({
  from: dateString,
  to: dateString,
});

export const transactionFilterSchema = z.object({
  customer: z.string().trim().max(100).optional(),
  type: z
    .enum(['DEPOSIT', 'WITHDRAWAL', 'REVERSAL', 'LOAN_DISBURSAL', 'INTEREST_PAYMENT', 'PRINCIPAL_REPAYMENT'])
    .optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'REJECTED', 'REVERSED']).optional(),
  from: dateString,
  to: dateString,
});

export const loanFilterSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'CLOSED', 'DEFAULTED']).optional(),
});

/** Returns parsed data, or sends a 400 and returns null. */
export function parseOr400<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  res: { status: (code: number) => { json: (body: unknown) => unknown } }
): z.infer<T> | null {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message || 'Invalid input' });
    return null;
  }
  return result.data;
}
