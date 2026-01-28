import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface Review {
  id: string;
  entityId: string;
  entityType: string;
  userId: string;
  rating: number;
  title?: string;
  content?: string;
  pros?: string[];
  cons?: string[];
  images?: string[];
  verifiedPurchase: boolean;
  helpful: number;
  response?: { content: string; respondedAt: Date };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface Testimonial {
  id: string;
  organizationId?: string;
  customerName: string;
  customerTitle?: string;
  companyName?: string;
  content: string;
  rating?: number;
  photoUrl?: string;
  videoUrl?: string;
  featured: boolean;
  approved: boolean;
  createdAt: Date;
}

export interface Survey {
  id: string;
  name: string;
  organizationId?: string;
  type: 'NPS' | 'CSAT' | 'CES' | 'CUSTOM';
  question: string;
  followUpQuestions: any[];
  triggerEvent?: string;
  triggerDelay?: number;
  isActive: boolean;
  responseCount: number;
  averageScore: number;
  createdAt: Date;
}

export interface TrustBadge {
  id: string;
  name: string;
  organizationId?: string;
  type: string;
  iconUrl?: string;
  description?: string;
  linkUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  private reviews: Map<string, Review> = new Map();
  private testimonials: Map<string, Testimonial> = new Map();
  private surveys: Map<string, Survey> = new Map();
  private surveyResponses: Map<string, any[]> = new Map();
  private trustBadges: Map<string, TrustBadge> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  // Reviews
  async createReview(userId: string, data: Partial<Review>): Promise<Review> {
    const id = `review-${Date.now()}`;
    const review: Review = {
      id,
      entityId: data.entityId!,
      entityType: data.entityType!,
      userId,
      rating: data.rating!,
      title: data.title,
      content: data.content,
      pros: data.pros,
      cons: data.cons,
      images: data.images,
      verifiedPurchase: data.verifiedPurchase || false,
      helpful: 0,
      status: 'pending',
      createdAt: new Date(),
    };
    this.reviews.set(id, review);
    return review;
  }

  async getReviews(query: {
    entityId?: string;
    entityType?: string;
    minRating?: number;
    verifiedOnly?: boolean;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Review[]; total: number; averageRating: number }> {
    let items = Array.from(this.reviews.values()).filter(r => r.status === 'approved');

    if (query.entityId) items = items.filter(r => r.entityId === query.entityId);
    if (query.entityType) items = items.filter(r => r.entityType === query.entityType);
    if (query.minRating) items = items.filter(r => r.rating >= query.minRating!);
    if (query.verifiedOnly) items = items.filter(r => r.verifiedPurchase);

    const total = items.length;
    const averageRating = items.length > 0
      ? items.reduce((sum, r) => sum + r.rating, 0) / items.length
      : 0;

    if (query.sortBy === 'highest') items.sort((a, b) => b.rating - a.rating);
    else if (query.sortBy === 'lowest') items.sort((a, b) => a.rating - b.rating);
    else if (query.sortBy === 'helpful') items.sort((a, b) => b.helpful - a.helpful);
    else items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const page = query.page || 1;
    const limit = query.limit || 20;
    items = items.slice((page - 1) * limit, page * limit);

    return { items, total, averageRating };
  }

  async respondToReview(reviewId: string, content: string): Promise<Review> {
    const review = this.reviews.get(reviewId);
    if (!review) throw new NotFoundException(`Review ${reviewId} not found`);
    review.response = { content, respondedAt: new Date() };
    this.reviews.set(reviewId, review);
    return review;
  }

  async markReviewHelpful(reviewId: string): Promise<Review> {
    const review = this.reviews.get(reviewId);
    if (!review) throw new NotFoundException(`Review ${reviewId} not found`);
    review.helpful++;
    this.reviews.set(reviewId, review);
    return review;
  }

  async moderateReview(reviewId: string, status: 'approved' | 'rejected'): Promise<Review> {
    const review = this.reviews.get(reviewId);
    if (!review) throw new NotFoundException(`Review ${reviewId} not found`);
    review.status = status;
    this.reviews.set(reviewId, review);
    return review;
  }

  // Testimonials
  async createTestimonial(data: Partial<Testimonial>): Promise<Testimonial> {
    const id = `testimonial-${Date.now()}`;
    const testimonial: Testimonial = {
      id,
      organizationId: data.organizationId,
      customerName: data.customerName!,
      customerTitle: data.customerTitle,
      companyName: data.companyName,
      content: data.content!,
      rating: data.rating,
      photoUrl: data.photoUrl,
      videoUrl: data.videoUrl,
      featured: data.featured || false,
      approved: false,
      createdAt: new Date(),
    };
    this.testimonials.set(id, testimonial);
    return testimonial;
  }

  async getTestimonials(organizationId: string, featured?: boolean): Promise<Testimonial[]> {
    let items = Array.from(this.testimonials.values())
      .filter(t => t.organizationId === organizationId && t.approved);
    if (featured) items = items.filter(t => t.featured);
    return items;
  }

  async approveTestimonial(id: string, approved: boolean): Promise<Testimonial> {
    const testimonial = this.testimonials.get(id);
    if (!testimonial) throw new NotFoundException(`Testimonial ${id} not found`);
    testimonial.approved = approved;
    this.testimonials.set(id, testimonial);
    return testimonial;
  }

  // Surveys
  async createSurvey(data: Partial<Survey>): Promise<Survey> {
    const id = `survey-${Date.now()}`;
    const defaultQuestions: Record<string, string> = {
      NPS: 'How likely are you to recommend us to a friend or colleague?',
      CSAT: 'How satisfied are you with your experience?',
      CES: 'How easy was it to get your issue resolved?',
    };
    const survey: Survey = {
      id,
      name: data.name!,
      organizationId: data.organizationId,
      type: data.type!,
      question: data.question || defaultQuestions[data.type!] || '',
      followUpQuestions: data.followUpQuestions || [],
      triggerEvent: data.triggerEvent,
      triggerDelay: data.triggerDelay,
      isActive: true,
      responseCount: 0,
      averageScore: 0,
      createdAt: new Date(),
    };
    this.surveys.set(id, survey);
    this.surveyResponses.set(id, []);
    return survey;
  }

  async submitSurveyResponse(data: {
    surveyId: string;
    userId: string;
    score: number;
    feedback?: string;
    followUpResponses?: any[];
  }): Promise<void> {
    const survey = this.surveys.get(data.surveyId);
    if (!survey) throw new NotFoundException(`Survey ${data.surveyId} not found`);

    const responses = this.surveyResponses.get(data.surveyId) || [];
    responses.push({ ...data, submittedAt: new Date() });
    this.surveyResponses.set(data.surveyId, responses);

    survey.responseCount = responses.length;
    survey.averageScore = responses.reduce((sum, r) => sum + r.score, 0) / responses.length;
    this.surveys.set(data.surveyId, survey);
  }

  async getSurveyResults(surveyId: string): Promise<{
    survey: Survey;
    npsScore?: number;
    promoters?: number;
    passives?: number;
    detractors?: number;
    responses: any[];
  }> {
    const survey = this.surveys.get(surveyId);
    if (!survey) throw new NotFoundException(`Survey ${surveyId} not found`);

    const responses = this.surveyResponses.get(surveyId) || [];

    if (survey.type === 'NPS') {
      const promoters = responses.filter(r => r.score >= 9).length;
      const passives = responses.filter(r => r.score >= 7 && r.score <= 8).length;
      const detractors = responses.filter(r => r.score <= 6).length;
      const total = responses.length || 1;
      const npsScore = ((promoters - detractors) / total) * 100;
      return { survey, npsScore, promoters, passives, detractors, responses };
    }

    return { survey, responses };
  }

  // Trust Badges
  async createTrustBadge(data: Partial<TrustBadge>): Promise<TrustBadge> {
    const id = `badge-${Date.now()}`;
    const badge: TrustBadge = {
      id,
      name: data.name!,
      organizationId: data.organizationId,
      type: data.type!,
      iconUrl: data.iconUrl,
      description: data.description,
      linkUrl: data.linkUrl,
      displayOrder: data.displayOrder || 0,
      isActive: true,
    };
    this.trustBadges.set(id, badge);
    return badge;
  }

  async getTrustBadges(organizationId: string): Promise<TrustBadge[]> {
    return Array.from(this.trustBadges.values())
      .filter(b => b.organizationId === organizationId && b.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async updateTrustBadge(id: string, data: Partial<TrustBadge>): Promise<TrustBadge> {
    const badge = this.trustBadges.get(id);
    if (!badge) throw new NotFoundException(`Badge ${id} not found`);
    const updated = { ...badge, ...data };
    this.trustBadges.set(id, updated);
    return updated;
  }

  async deleteTrustBadge(id: string): Promise<void> {
    this.trustBadges.delete(id);
  }
}
