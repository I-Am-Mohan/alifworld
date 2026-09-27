import { describe, expect, it, beforeEach } from 'bun:test';
import { ProductQnaService } from '@/features/qna/services/product-qna.service';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from '@/shared/errors/app-error';

class MockPrismaQnaDb {
  public questions: any[] = [];
  public answers: any[] = [];
  public questionVotes: any[] = [];
  public answerVotes: any[] = [];
  public products: any[] = [];
  public users: any[] = [];
  public outboxEvents: any[] = [];

  public productQuestion = {
    findFirst: async ({ where }: any) => {
      const q = this.questions.find((item) => {
        if (where.id && item.id !== where.id) return false;
        if (where.userId && item.userId !== where.userId) return false;
        if (where.productId && item.productId !== where.productId) return false;
        if (where.product?.sellerId) {
          const prod = this.products.find((p) => p.id === item.productId);
          if (prod?.sellerId !== where.product.sellerId) return false;
        }
        if (where.deletedAt === null && item.deletedAt !== null) return false;
        return true;
      });
      if (!q) return null;
      const user = this.users.find((u) => u.id === q.userId);
      const product = this.products.find((p) => p.id === q.productId);
      return { ...q, user, product };
    },
    create: async ({ data }: any) => {
      const question = {
        ...data,
        isAnswered: false,
        upvotesCount: 0,
        version: 1,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.questions.push(question);
      const user = this.users.find((u) => u.id === question.userId);
      const product = this.products.find((p) => p.id === question.productId);
      return { ...question, user, product, answers: [] };
    },
    update: async ({ where, data }: any) => {
      const idx = this.questions.findIndex((q) => q.id === where.id);
      if (idx === -1) throw new Error('Not found');
      const current = this.questions[idx];
      let upvotes = current.upvotesCount;
      if (data.upvotesCount?.increment !== undefined) upvotes += data.upvotesCount.increment;
      if (data.upvotesCount?.decrement !== undefined) upvotes -= data.upvotesCount.decrement;

      this.questions[idx] = {
        ...current,
        ...data,
        upvotesCount: upvotes,
        version: (current.version || 1) + 1,
        updatedAt: new Date(),
      };
      const user = this.users.find((u) => u.id === this.questions[idx].userId);
      const product = this.products.find((p) => p.id === this.questions[idx].productId);
      return { ...this.questions[idx], user, product, answers: [] };
    },
    findMany: async ({ where }: any) => {
      return this.questions
        .filter((q) => {
          if (where.productId && q.productId !== where.productId) return false;
          if (where.product?.sellerId && q.product?.sellerId !== where.product.sellerId)
            return false;
          if (where.status && q.status !== where.status) return false;
          if (where.isAnswered !== undefined && q.isAnswered !== where.isAnswered) return false;
          return !q.deletedAt;
        })
        .map((q) => {
          const user = this.users.find((u) => u.id === q.userId);
          const product = this.products.find((p) => p.id === q.productId);
          const ans = this.answers.filter((a) => a.questionId === q.id && !a.deletedAt);
          return { ...q, user, product, answers: ans };
        });
    },
    count: async ({ where }: any) => {
      return this.questions.filter((q) => {
        if (where.productId && q.productId !== where.productId) return false;
        if (where.product?.sellerId && q.product?.sellerId !== where.product.sellerId)
          return false;
        if (where.status && q.status !== where.status) return false;
        if (where.isAnswered !== undefined && q.isAnswered !== where.isAnswered) return false;
        return !q.deletedAt;
      }).length;
    },
  };

  public productAnswer = {
    findFirst: async ({ where }: any) => {
      return (
        this.answers.find((a) => {
          if (where.id && a.id !== where.id) return false;
          if (where.questionId && a.questionId !== where.questionId) return false;
          if (where.deletedAt === null && a.deletedAt !== null) return false;
          return true;
        }) || null
      );
    },
    create: async ({ data }: any) => {
      const answer = {
        ...data,
        upvotesCount: 0,
        version: 1,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.answers.push(answer);
      const user = this.users.find((u) => u.id === answer.userId);
      return { ...answer, user };
    },
    update: async ({ where, data }: any) => {
      const idx = this.answers.findIndex((a) => a.id === where.id);
      if (idx === -1) throw new Error('Not found');
      const current = this.answers[idx];
      let upvotes = current.upvotesCount;
      if (data.upvotesCount?.increment !== undefined) upvotes += data.upvotesCount.increment;
      if (data.upvotesCount?.decrement !== undefined) upvotes -= data.upvotesCount.decrement;

      this.answers[idx] = {
        ...current,
        ...data,
        upvotesCount: upvotes,
        version: (current.version || 1) + 1,
        updatedAt: new Date(),
      };
      return this.answers[idx];
    },
  };

  public productQuestionVote = {
    findFirst: async ({ where }: any) => {
      return (
        this.questionVotes.find(
          (v) => v.questionId === where.questionId && v.userId === where.userId
        ) || null
      );
    },
    create: async ({ data }: any) => {
      const vote = { ...data, createdAt: new Date() };
      this.questionVotes.push(vote);
      return vote;
    },
    delete: async ({ where }: any) => {
      const idx = this.questionVotes.findIndex((v) => v.id === where.id);
      if (idx !== -1) {
        return this.questionVotes.splice(idx, 1)[0];
      }
      return null;
    },
  };

  public productAnswerVote = {
    findFirst: async ({ where }: any) => {
      return (
        this.answerVotes.find(
          (v) => v.answerId === where.answerId && v.userId === where.userId
        ) || null
      );
    },
    create: async ({ data }: any) => {
      const vote = { ...data, createdAt: new Date() };
      this.answerVotes.push(vote);
      return vote;
    },
    delete: async ({ where }: any) => {
      const idx = this.answerVotes.findIndex((v) => v.id === where.id);
      if (idx !== -1) {
        return this.answerVotes.splice(idx, 1)[0];
      }
      return null;
    },
  };

  public product = {
    findFirst: async ({ where }: any) => {
      return this.products.find((p) => p.id === where.id && !p.deletedAt) || null;
    },
  };

  public user = {
    findFirst: async ({ where }: any) => {
      return this.users.find((u) => u.id === where.id && !u.deletedAt) || null;
    },
  };

  public outboxEvent = {
    create: async ({ data }: any) => {
      this.outboxEvents.push(data);
      return data;
    },
  };
}

describe('Milestone 126: Product Q&A & Seller Moderation Unit Tests', () => {
  let mockDb: MockPrismaQnaDb;
  let service: ProductQnaService;

  beforeEach(() => {
    mockDb = new MockPrismaQnaDb();
    service = new ProductQnaService();
    (service as any).db = mockDb;

    mockDb.users.push({
      id: 'usr_customer_01',
      name: 'Ariful Karim',
      email: 'arif@example.com',
      deletedAt: null,
    });
    mockDb.users.push({
      id: 'usr_customer_02',
      name: 'Sadia Rahman',
      email: 'sadia@example.com',
      deletedAt: null,
    });
    mockDb.users.push({
      id: 'usr_seller_staff',
      name: 'Walton Support Rep',
      deletedAt: null,
    });

    mockDb.products.push({
      id: 'prod_smartphone_01',
      title: 'Walton Primo S8 Pro',
      sellerId: 'sel_walton_store',
      seller: { id: 'sel_walton_store', businessName: 'Walton Official Store' },
      deletedAt: null,
    });
  });

  describe('1. Question Submission & Privacy Redaction', () => {
    it('creates customer question and redacts author name for zero PII leakage', async () => {
      const question = await service.createQuestion('usr_customer_01', {
        productId: 'prod_smartphone_01',
        question: 'Is this phone covered under 1 year official manufacturer warranty?',
      });

      expect(question.question).toBe(
        'Is this phone covered under 1 year official manufacturer warranty?'
      );
      expect(question.authorDisplayName).toBe('Ariful K.'); // Privacy protected!
      expect(question.status).toBe('APPROVED');
      expect(question.isAnswered).toBe(false);
    });
  });

  describe('2. Official Seller Answers & Strict Tenant Isolation', () => {
    it('allows verified seller owning product to post official answer and marks isAnswered', async () => {
      // Seed question
      const q = await service.createQuestion('usr_customer_01', {
        productId: 'prod_smartphone_01',
        question: 'Does the package include a fast charger?',
      });

      // Seller answers
      const answer = await service.answerQuestion(
        q.id,
        'usr_seller_staff',
        'sel_walton_store', // Matching seller tenant
        { answer: 'Yes, an official 33W fast charger is included in the box.' }
      );

      expect(answer.isOfficialSeller).toBe(true);
      expect(answer.answer).toBe('Yes, an official 33W fast charger is included in the box.');

      // Verify question is now marked answered
      const updatedQ = mockDb.questions.find((x) => x.id === q.id);
      expect(updatedQ.isAnswered).toBe(true);
    });

    it('rejects answer from a different seller tenant (enforcing sellerId scope in query)', async () => {
      const q = await service.createQuestion('usr_customer_01', {
        productId: 'prod_smartphone_01',
        question: 'Does the package include a fast charger?',
      });

      // Different seller tenant attempts cross-tenant response
      await expect(
        service.answerQuestion(
          q.id,
          'usr_other_seller',
          'sel_apex_store', // Wrong seller tenant!
          { answer: 'Unauthorized answer attempt.' }
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('3. Upvoting Questions & Self-Vote Protection', () => {
    it('records question upvote and prevents author self-upvoting', async () => {
      const q = await service.createQuestion('usr_customer_01', {
        productId: 'prod_smartphone_01',
        question: 'Can this run heavy 3D games smoothly?',
      });

      // Author self-upvote must fail
      await expect(service.voteQuestion(q.id, 'usr_customer_01')).rejects.toThrow(
        ValidationError
      );

      // Other customer upvotes
      const res = await service.voteQuestion(q.id, 'usr_customer_02');
      expect(res.upvotesCount).toBe(1);

      // Toggling off
      const resToggle = await service.voteQuestion(q.id, 'usr_customer_02');
      expect(resToggle.upvotesCount).toBe(0);
    });
  });

  describe('4. Administrative Moderation', () => {
    it('allows platform admin to moderate question status', async () => {
      const q = await service.createQuestion('usr_customer_01', {
        productId: 'prod_smartphone_01',
        question: 'Inappropriate or spam promotional text...',
      });

      const moderated = await service.adminModerateQuestion(q.id, 'usr_admin', {
        status: 'REJECTED',
        rejectionReason: 'Violates community guidelines.',
      });

      expect(moderated.status).toBe('REJECTED');
    });
  });
});
