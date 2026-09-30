/**
 * Product Q&A Domain Service
 *
 * Implements customer pre-sale inquiries, official seller answers with strict
 * tenant isolation, community upvoting, and administrative moderation.
 *
 * Invariant: Zero customer PII leakage (names redacted, contact details stripped).
 * Invariant: Apply sellerId scope inside repository/service queries, not after data retrieval.
 * Invariant: Prevent cross-tenant answer mutations or unauthorized answer masquerading.
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { NotFoundError, ValidationError, AuthorizationError } from '@/shared/errors/app-error';
import { ProductQuestionDTO, ProductAnswerDTO, ProductQnaSummaryDTO } from '../types/qna.types';
import {
  CreateQuestionInput,
  CreateAnswerInput,
  UpdateQuestionInput,
  UpdateAnswerInput,
  AdminModerateQnaInput,
  ListProductQuestionsQueryInput,
  ListProductQuestionsQuerySchema,
} from '../validators/qna.validators';

export class ProductQnaService {
  private db = prisma;

  /**
   * Submits a customer inquiry on a product.
   */
  public async createQuestion(
    userId: string,
    input: CreateQuestionInput
  ): Promise<ProductQuestionDTO> {
    const product = await (this.db as any).product.findFirst({
      where: { id: input.productId, deletedAt: null },
      select: { id: true, title: true, sellerId: true },
    });

    if (!product) {
      throw new NotFoundError(`Product '${input.productId}' not found.`);
    }

    const user = await (this.db as any).user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!user) {
      throw new NotFoundError(`User '${userId}' not found.`);
    }

    const questionId = `q_${Math.random().toString(36).substring(2, 10)}`;

    const question = await (this.db as any).productQuestion.create({
      data: {
        id: questionId,
        productId: input.productId,
        userId,
        question: input.question,
        status: 'APPROVED', // Default approved, subject to moderation
        isAnswered: false,
        upvotesCount: 0,
      },
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, title: true } },
        answers: true,
      },
    });

    await this.recordOutboxEvent('product.question_submitted', questionId, {
      questionId,
      productId: input.productId,
      sellerId: product.sellerId,
      userId,
    });

    return this.mapQuestionToDTO(question);
  }

  /**
   * Retrieves paginated approved questions and answers for a product with zero PII.
   */
  public async getProductQuestions(
    productId: string,
    query: ListProductQuestionsQueryInput,
    currentUserId?: string
  ): Promise<{
    questions: ProductQuestionDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const parsedQuery = ListProductQuestionsQuerySchema.parse(query);
    const page = parsedQuery.page || 1;
    const limit = parsedQuery.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      productId,
      status: 'APPROVED',
      deletedAt: null,
      ...(parsedQuery.answeredOnly ? { isAnswered: true } : {}),
      ...(parsedQuery.search
        ? { question: { contains: parsedQuery.search, mode: 'insensitive' } }
        : {}),
    };

    let orderBy: any = { createdAt: 'desc' };
    if (parsedQuery.sortBy === 'upvotes') {
      orderBy = { upvotesCount: 'desc' };
    } else if (parsedQuery.sortBy === 'unanswered') {
      orderBy = [{ isAnswered: 'asc' }, { createdAt: 'desc' }];
    }

    const [questions, total] = await Promise.all([
      (this.db as any).productQuestion.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: { select: { id: true, name: true } },
          product: { select: { id: true, title: true } },
          answers: {
            where: { status: 'APPROVED', deletedAt: null },
            orderBy: [{ isOfficialSeller: 'desc' }, { upvotesCount: 'desc' }, { createdAt: 'asc' }],
            include: {
              seller: { select: { id: true, businessName: true } },
              user: { select: { id: true, name: true } },
              votes: currentUserId ? { where: { userId: currentUserId } } : false,
            },
          },
          votes: currentUserId ? { where: { userId: currentUserId } } : false,
        },
      }),
      (this.db as any).productQuestion.count({ where }),
    ]);

    const mapped = questions.map((q: any) => {
      const userVote = q.votes?.[0];
      return {
        ...this.mapQuestionToDTO(q),
        currentUserVoted: Boolean(userVote),
        answers: (q.answers || []).map((ans: any) => ({
          ...this.mapAnswerToDTO(ans),
          currentUserVoted: Boolean(ans.votes?.[0]),
        })),
      };
    });

    return {
      questions: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves summary counts of questions and answers for a product.
   */
  public async getProductQnaSummary(productId: string): Promise<ProductQnaSummaryDTO> {
    const [totalQuestions, answeredQuestions] = await Promise.all([
      (this.db as any).productQuestion.count({
        where: { productId, status: 'APPROVED', deletedAt: null },
      }),
      (this.db as any).productQuestion.count({
        where: { productId, status: 'APPROVED', isAnswered: true, deletedAt: null },
      }),
    ]);

    return {
      productId,
      totalQuestions,
      answeredQuestions,
      unansweredQuestions: Math.max(0, totalQuestions - answeredQuestions),
    };
  }

  /**
   * Official answer to a customer question.
   * Invariant: Applies sellerId scope inside repository/service queries, not after data retrieval!
   */
  public async answerQuestion(
    questionId: string,
    answeringUserId: string,
    sellerId: string | null,
    input: CreateAnswerInput
  ): Promise<ProductAnswerDTO> {
    if (!sellerId) {
      throw new AuthorizationError(
        'Only authorized sellers can answer customer pre-sale questions.'
      );
    }

    // Strict tenant isolation: verify question belongs to product owned by sellerId
    const question = await (this.db as any).productQuestion.findFirst({
      where: {
        id: questionId,
        product: { sellerId, deletedAt: null },
        deletedAt: null,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            sellerId: true,
            seller: { select: { businessName: true } },
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundError(
        `Question '${questionId}' not found for your seller storefront. Cross-tenant access forbidden.`
      );
    }

    const answerId = `ans_${Math.random().toString(36).substring(2, 10)}`;

    const answer = await (this.db as any).productAnswer.create({
      data: {
        id: answerId,
        questionId,
        sellerId,
        userId: answeringUserId,
        answer: input.answer,
        isOfficialSeller: true,
        status: 'APPROVED',
        upvotesCount: 0,
      },
      include: {
        seller: { select: { id: true, businessName: true } },
        user: { select: { id: true, name: true } },
      },
    });

    // Mark question as answered
    await (this.db as any).productQuestion.update({
      where: { id: questionId },
      data: { isAnswered: true, version: { increment: 1 } },
    });

    await this.recordOutboxEvent('product.question_answered', answerId, {
      answerId,
      questionId,
      sellerId,
      answeringUserId,
      questionAuthorId: question.userId,
    });

    return this.mapAnswerToDTO(answer);
  }

  /**
   * Lists questions for a seller's products (for seller portal operational view).
   * Invariant: Strictly queries scoped by product.sellerId.
   */
  public async listSellerQuestions(
    sellerId: string,
    filters: { answered?: boolean; page?: number; limit?: number }
  ): Promise<{
    questions: ProductQuestionDTO[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      product: { sellerId, deletedAt: null },
      deletedAt: null,
      ...(filters.answered !== undefined ? { isAnswered: filters.answered } : {}),
    };

    const [questions, total] = await Promise.all([
      (this.db as any).productQuestion.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isAnswered: 'asc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, name: true } },
          product: { select: { id: true, title: true } },
          answers: {
            where: { deletedAt: null },
            include: {
              seller: { select: { id: true, businessName: true } },
              user: { select: { id: true, name: true } },
            },
          },
        },
      }),
      (this.db as any).productQuestion.count({ where }),
    ]);

    return {
      questions: questions.map((q: any) => this.mapQuestionToDTO(q)),
      total,
      page,
      limit,
    };
  }

  /**
   * Community upvote on a question.
   */
  public async voteQuestion(questionId: string, userId: string): Promise<{ upvotesCount: number }> {
    const question = await (this.db as any).productQuestion.findFirst({
      where: { id: questionId, deletedAt: null },
    });

    if (!question) {
      throw new NotFoundError(`Question '${questionId}' not found.`);
    }

    if (question.userId === userId) {
      throw new ValidationError('You cannot upvote your own question.');
    }

    const existingVote = await (this.db as any).productQuestionVote.findFirst({
      where: { questionId, userId },
    });

    if (existingVote) {
      // Toggle off upvote
      await (this.db as any).productQuestionVote.delete({
        where: { id: existingVote.id },
      });
      const updated = await (this.db as any).productQuestion.update({
        where: { id: questionId },
        data: { upvotesCount: { decrement: 1 } },
      });
      return { upvotesCount: Math.max(0, updated.upvotesCount) };
    }

    await (this.db as any).productQuestionVote.create({
      data: {
        id: `qv_${Math.random().toString(36).substring(2, 10)}`,
        questionId,
        userId,
      },
    });

    const updated = await (this.db as any).productQuestion.update({
      where: { id: questionId },
      data: { upvotesCount: { increment: 1 } },
    });

    return { upvotesCount: updated.upvotesCount };
  }

  /**
   * Community upvote on an answer.
   */
  public async voteAnswer(answerId: string, userId: string): Promise<{ upvotesCount: number }> {
    const answer = await (this.db as any).productAnswer.findFirst({
      where: { id: answerId, deletedAt: null },
    });

    if (!answer) {
      throw new NotFoundError(`Answer '${answerId}' not found.`);
    }

    if (answer.userId === userId) {
      throw new ValidationError('You cannot upvote your own answer.');
    }

    const existingVote = await (this.db as any).productAnswerVote.findFirst({
      where: { answerId, userId },
    });

    if (existingVote) {
      // Toggle off upvote
      await (this.db as any).productAnswerVote.delete({
        where: { id: existingVote.id },
      });
      const updated = await (this.db as any).productAnswer.update({
        where: { id: answerId },
        data: { upvotesCount: { decrement: 1 } },
      });
      return { upvotesCount: Math.max(0, updated.upvotesCount) };
    }

    await (this.db as any).productAnswerVote.create({
      data: {
        id: `av_${Math.random().toString(36).substring(2, 10)}`,
        answerId,
        userId,
      },
    });

    const updated = await (this.db as any).productAnswer.update({
      where: { id: answerId },
      data: { upvotesCount: { increment: 1 } },
    });

    return { upvotesCount: updated.upvotesCount };
  }

  /**
   * Platform Admin moderates question status.
   */
  public async adminModerateQuestion(
    questionId: string,
    adminUserId: string,
    input: AdminModerateQnaInput
  ): Promise<ProductQuestionDTO> {
    const question = await (this.db as any).productQuestion.findFirst({
      where: { id: questionId, deletedAt: null },
    });

    if (!question) {
      throw new NotFoundError(`Question '${questionId}' not found.`);
    }

    const updated = await (this.db as any).productQuestion.update({
      where: { id: questionId },
      data: {
        status: input.status,
        rejectionReason: input.rejectionReason || null,
        version: { increment: 1 },
      },
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, title: true } },
        answers: true,
      },
    });

    await this.recordOutboxEvent('product.question_moderated', questionId, {
      questionId,
      status: input.status,
      adminUserId,
      rejectionReason: input.rejectionReason || null,
    });

    return this.mapQuestionToDTO(updated);
  }

  /**
   * Platform Admin moderates answer status.
   */
  public async adminModerateAnswer(
    answerId: string,
    adminUserId: string,
    input: AdminModerateQnaInput
  ): Promise<ProductAnswerDTO> {
    const answer = await (this.db as any).productAnswer.findFirst({
      where: { id: answerId, deletedAt: null },
    });

    if (!answer) {
      throw new NotFoundError(`Answer '${answerId}' not found.`);
    }

    const updated = await (this.db as any).productAnswer.update({
      where: { id: answerId },
      data: {
        status: input.status,
        rejectionReason: input.rejectionReason || null,
        version: { increment: 1 },
      },
      include: {
        seller: { select: { id: true, businessName: true } },
        user: { select: { id: true, name: true } },
      },
    });

    await this.recordOutboxEvent('product.answer_moderated', answerId, {
      answerId,
      status: input.status,
      adminUserId,
      rejectionReason: input.rejectionReason || null,
    });

    return this.mapAnswerToDTO(updated);
  }

  // ----------------------------------------------------------------------------
  // Helper & Mapping Methods
  // ----------------------------------------------------------------------------

  private mapQuestionToDTO(q: any): ProductQuestionDTO {
    return {
      id: q.id,
      productId: q.productId,
      productTitle: q.product?.title,
      authorDisplayName: this.redactAuthorName(q.user?.name),
      question: q.question,
      status: q.status,
      isAnswered: q.isAnswered,
      upvotesCount: q.upvotesCount || 0,
      answers: (q.answers || []).map((ans: any) => this.mapAnswerToDTO(ans)),
      answersCount: q.answers?.length || 0,
      createdAt: q.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: q.updatedAt?.toISOString?.() || new Date().toISOString(),
    };
  }

  private mapAnswerToDTO(ans: any): ProductAnswerDTO {
    return {
      id: ans.id,
      questionId: ans.questionId,
      sellerId: ans.sellerId,
      authorDisplayName: ans.isOfficialSeller
        ? ans.seller?.businessName || 'Official Store Representative'
        : this.redactAuthorName(ans.user?.name),
      answer: ans.answer,
      isOfficialSeller: ans.isOfficialSeller,
      status: ans.status,
      upvotesCount: ans.upvotesCount || 0,
      createdAt: ans.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: ans.updatedAt?.toISOString?.() || new Date().toISOString(),
    };
  }

  private redactAuthorName(name: string | null | undefined): string {
    if (!name || name.trim().length === 0) {
      return 'Verified Shopper';
    }
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0];
    }
    const first = parts[0];
    const lastInitial = parts[parts.length - 1][0].toUpperCase();
    return `${first} ${lastInitial}.`;
  }

  private async recordOutboxEvent(
    eventType: string,
    aggregateId: string,
    payload: any
  ): Promise<void> {
    try {
      await (this.db as any).outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
          eventType,
          aggregateType: 'PRODUCT_QNA',
          aggregateId,
          payload: payload ?? {},
          status: 'PENDING',
          attempts: 0,
          version: 1,
        },
      });
    } catch (err) {
      console.warn('Non-fatal outbox record error:', err);
    }
  }
}

export const productQnaService = new ProductQnaService();
