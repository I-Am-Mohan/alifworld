import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import {
  GET as listQuestionsRoute,
  POST as createQuestionRoute,
} from '@/app/api/v1/catalog/products/[id]/questions/route';
import { GET as getSummaryRoute } from '@/app/api/v1/catalog/products/[id]/questions/summary/route';
import { POST as answerQuestionRoute } from '@/app/api/v1/questions/[id]/answers/route';
import { POST as voteQuestionRoute } from '@/app/api/v1/questions/[id]/vote/route';
import { POST as voteAnswerRoute } from '@/app/api/v1/answers/[id]/vote/route';
import { GET as listSellerQuestionsRoute } from '@/app/api/v1/seller/questions/route';
import { POST as moderateQuestionRoute } from '@/app/api/v1/admin/questions/[id]/moderate/route';
import { productQnaService } from '@/features/qna';
import { NextRequest } from 'next/server';

describe('Milestone 126: Product Q&A & Seller Moderation REST API Integration Tests', () => {
  afterEach(() => mock.restore());
  const customerActor = {
    userId: 'usr_customer_01',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const sellerActor = {
    userId: 'usr_seller_01',
    roles: ['SELLER'],
    permissions: [],
    sellerId: 'sel_walton_store',
  };

  const adminActor = {
    userId: 'usr_admin_01',
    roles: ['ADMIN'],
    permissions: [],
    sellerId: null,
  };

  const mockQuestion = {
    id: 'q_101',
    productId: 'prod_smartphone_01',
    productTitle: 'Walton Primo S8 Pro',
    authorDisplayName: 'Tanvir H.',
    question: 'Is this phone covered under 1 year official manufacturer warranty?',
    status: 'APPROVED' as const,
    isAnswered: true,
    upvotesCount: 3,
    answers: [],
    answersCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockAnswer = {
    id: 'ans_201',
    questionId: 'q_101',
    sellerId: 'sel_walton_store',
    authorDisplayName: 'Walton Official Store',
    answer: 'Yes, 1 year official warranty is included.',
    isOfficialSeller: true,
    status: 'APPROVED' as const,
    upvotesCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);

    spyOn(productQnaService, 'getProductQuestions').mockResolvedValue({
      questions: [mockQuestion],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    spyOn(productQnaService, 'createQuestion').mockResolvedValue(mockQuestion);

    spyOn(productQnaService, 'getProductQnaSummary').mockResolvedValue({
      productId: 'prod_smartphone_01',
      totalQuestions: 5,
      answeredQuestions: 4,
      unansweredQuestions: 1,
    });

    spyOn(productQnaService, 'answerQuestion').mockResolvedValue(mockAnswer);

    spyOn(productQnaService, 'voteQuestion').mockResolvedValue({ upvotesCount: 4 });

    spyOn(productQnaService, 'voteAnswer').mockResolvedValue({ upvotesCount: 3 });

    spyOn(productQnaService, 'listSellerQuestions').mockResolvedValue({
      questions: [mockQuestion],
      total: 1,
      page: 1,
      limit: 10,
    });

    spyOn(productQnaService, 'adminModerateQuestion').mockResolvedValue({
      ...mockQuestion,
      status: 'APPROVED',
    });
  });

  it('GET /api/v1/catalog/products/[id]/questions returns public questions list', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/catalog/products/prod_smartphone_01/questions'
    );
    const res = await listQuestionsRoute(req, {
      params: Promise.resolve({ id: 'prod_smartphone_01' }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].authorDisplayName).toBe('Tanvir H.');
  });

  it('POST /api/v1/catalog/products/[id]/questions submits customer inquiry', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/catalog/products/prod_smartphone_01/questions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Is this phone covered under 1 year official manufacturer warranty?',
        }),
      }
    );
    const res = await createQuestionRoute(req, {
      params: Promise.resolve({ id: 'prod_smartphone_01' }),
    });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.question).toBe(
      'Is this phone covered under 1 year official manufacturer warranty?'
    );
  });

  it('GET /api/v1/catalog/products/[id]/questions/summary returns counts', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/catalog/products/prod_smartphone_01/questions/summary'
    );
    const res = await getSummaryRoute(req, {
      params: Promise.resolve({ id: 'prod_smartphone_01' }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalQuestions).toBe(5);
  });

  it('POST /api/v1/questions/[id]/answers allows seller to post official answer', async () => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);

    const req = new NextRequest('http://localhost:3000/api/v1/questions/q_101/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answer: 'Yes, 1 year official warranty is included.',
      }),
    });
    const res = await answerQuestionRoute(req, {
      params: Promise.resolve({ id: 'q_101' }),
    });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.isOfficialSeller).toBe(true);
  });

  it('POST /api/v1/questions/[id]/vote toggles question upvote', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/questions/q_101/vote', {
      method: 'POST',
    });
    const res = await voteQuestionRoute(req, {
      params: Promise.resolve({ id: 'q_101' }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.upvotesCount).toBe(4);
  });

  it('GET /api/v1/seller/questions lists questions for seller tenant', async () => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);

    const req = new NextRequest('http://localhost:3000/api/v1/seller/questions?answered=false');
    const res = await listSellerQuestionsRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
  });

  it('POST /api/v1/admin/questions/[id]/moderate updates status', async () => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);

    const req = new NextRequest('http://localhost:3000/api/v1/admin/questions/q_101/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    const res = await moderateQuestionRoute(req, {
      params: Promise.resolve({ id: 'q_101' }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('APPROVED');
  });
});
