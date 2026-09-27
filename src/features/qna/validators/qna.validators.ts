/**
 * Product Q&A Validators
 */

import { z } from 'zod';

export const CreateQuestionSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  question: z
    .string()
    .min(10, 'Question must be at least 10 characters long')
    .max(1000, 'Question cannot exceed 1000 characters'),
});

export const CreateAnswerSchema = z.object({
  answer: z
    .string()
    .min(5, 'Answer must be at least 5 characters long')
    .max(2000, 'Answer cannot exceed 2000 characters'),
});

export const UpdateQuestionSchema = z.object({
  question: z
    .string()
    .min(10, 'Question must be at least 10 characters long')
    .max(1000, 'Question cannot exceed 1000 characters'),
});

export const UpdateAnswerSchema = z.object({
  answer: z
    .string()
    .min(5, 'Answer must be at least 5 characters long')
    .max(2000, 'Answer cannot exceed 2000 characters'),
});

export const AdminModerateQnaSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'FLAGGED']),
  rejectionReason: z.string().max(500).optional().nullable(),
});

export const ListProductQuestionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  answeredOnly: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((val) => val === true || val === 'true'),
  sortBy: z.enum(['recent', 'upvotes', 'unanswered']).default('recent'),
  search: z.string().max(100).optional(),
});

export type CreateQuestionInput = z.input<typeof CreateQuestionSchema>;
export type CreateAnswerInput = z.infer<typeof CreateAnswerSchema>;
export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;
export type UpdateAnswerInput = z.infer<typeof UpdateAnswerSchema>;
export type AdminModerateQnaInput = z.infer<typeof AdminModerateQnaSchema>;
export type ListProductQuestionsQueryInput = z.input<typeof ListProductQuestionsQuerySchema>;
export type ListProductQuestionsQuery = z.infer<typeof ListProductQuestionsQuerySchema>;
