import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { DistributedLockService } from '@/common/redis/lock.service';
import { REDIS_KEYS, CACHE_TTL } from '@/common/redis/keys';
import { QUEUES, TRANSLATION_STATUS } from '@/common/queue/queue.constants';
import {
  TranslationJobData,
  TranslationJobResult,
  BatchTranslationJobData,
  BatchTranslationResult,
  TranslationProvider,
  TranslationContentType,
  TRANSLATION_JOB_NAMES,
  TRANSLATION_PROMPTS,
  TRANSLATION_QUALITY,
} from './translation.job';

/**
 * Translation Processor
 *
 * Background worker that auto-translates product content using LLM.
 *
 * Features:
 * - Auto-translate product content using Anthropic/OpenAI
 * - Status lifecycle: DRAFT -> AUTO_TRANSLATED -> VENDOR_APPROVED -> PUBLISHED
 * - Support batch translation
 * - Preserve HTML/markdown formatting
 * - Handle translation failures gracefully
 * - Quality scoring and review flagging
 */
@Injectable()
@Processor(QUEUES.TRANSLATION)
export class TranslationProcessor {
  private readonly logger = new Logger(TranslationProcessor.name);

  constructor(
    @InjectQueue(QUEUES.TRANSLATION)
    private readonly translationQueue: Queue<TranslationJobData>,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly lockService: DistributedLockService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Process single translation job
   */
  @Process(TRANSLATION_JOB_NAMES.TRANSLATE_SINGLE)
  async handleSingleTranslation(job: Job<TranslationJobData>): Promise<TranslationJobResult> {
    const { jobId, tenantId, sourceLocale, targetLocale, content, provider, preserveFormatting } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing translation: ${content.entityId} from ${sourceLocale} to ${targetLocale}`);

    try {
      // Update status to IN_PROGRESS
      await this.updateTranslationStatus(content.entityId, targetLocale, TRANSLATION_STATUS.IN_PROGRESS);

      // Check cache first
      const cacheKey = REDIS_KEYS.PRODUCT_TRANSLATION(content.entityId, targetLocale);
      const cachedTranslation = await this.redis.get<string>(cacheKey);

      if (cachedTranslation) {
        this.logger.debug(`Using cached translation for ${content.entityId}:${targetLocale}`);
        return {
          success: true,
          jobId,
          entityId: content.entityId,
          sourceLocale,
          targetLocale,
          translatedText: cachedTranslation,
          status: TRANSLATION_STATUS.AUTO_TRANSLATED,
          provider: TranslationProvider.MOCK,
          qualityScore: 100,
          durationMs: Date.now() - startTime,
        };
      }

      // Select provider
      const selectedProvider = provider || this.selectProvider();

      // Translate content
      const translatedText = await this.translateContent(
        content.sourceText,
        sourceLocale,
        targetLocale,
        content.type,
        selectedProvider,
        preserveFormatting ?? true,
        job.data.context,
      );

      // Quality check
      const qualityScore = await this.assessQuality(
        content.sourceText,
        translatedText,
        sourceLocale,
        targetLocale,
      );

      // Determine status based on quality
      const status = qualityScore >= TRANSLATION_QUALITY.REVIEW_THRESHOLD
        ? TRANSLATION_STATUS.AUTO_TRANSLATED
        : TRANSLATION_STATUS.VENDOR_REVIEW;

      // Cache translation
      await this.redis.set(cacheKey, translatedText, CACHE_TTL.DAY);

      // Save to database
      await this.saveTranslation({
        entityId: content.entityId,
        entityType: content.type,
        fieldName: content.fieldName,
        tenantId,
        sourceLocale,
        targetLocale,
        sourceText: content.sourceText,
        translatedText,
        status,
        qualityScore,
        provider: selectedProvider,
      });

      // Update job progress
      await job.progress(100);

      return {
        success: true,
        jobId,
        entityId: content.entityId,
        sourceLocale,
        targetLocale,
        translatedText,
        status,
        provider: selectedProvider,
        qualityScore,
        durationMs: Date.now() - startTime,
        warnings: qualityScore < TRANSLATION_QUALITY.REVIEW_THRESHOLD
          ? ['Quality score below threshold, flagged for review']
          : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Translation failed for ${content.entityId}: ${errorMessage}`, error);

      // Update status to FAILED
      await this.updateTranslationStatus(content.entityId, targetLocale, TRANSLATION_STATUS.FAILED);

      return {
        success: false,
        jobId,
        entityId: content.entityId,
        sourceLocale,
        targetLocale,
        status: TRANSLATION_STATUS.FAILED,
        provider: provider || TranslationProvider.MOCK,
        durationMs: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Process batch translation job
   */
  @Process(TRANSLATION_JOB_NAMES.TRANSLATE_BATCH)
  async handleBatchTranslation(job: Job<BatchTranslationJobData>): Promise<BatchTranslationResult> {
    const { batchId, tenantId, sourceLocale, targetLocales, items, provider } = job.data;
    const startTime = Date.now();
    const results: TranslationJobResult[] = [];

    this.logger.log(`Processing batch translation: ${batchId} with ${items.length} items to ${targetLocales.length} locales`);

    const totalTasks = items.length * targetLocales.length;
    let completedTasks = 0;

    for (const targetLocale of targetLocales) {
      for (const item of items) {
        const singleJobData: TranslationJobData = {
          jobId: `${batchId}:${item.entityId}:${targetLocale}`,
          tenantId,
          sourceLocale,
          targetLocale,
          content: item,
          provider,
          preserveFormatting: job.data.preserveFormatting,
          context: job.data.context,
          triggeredBy: job.data.triggeredBy,
        };

        const result = await this.handleSingleTranslation({
          ...job,
          data: singleJobData,
        } as Job<TranslationJobData>);

        results.push(result);
        completedTasks++;

        // Update progress
        await job.progress((completedTasks / totalTasks) * 100);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return {
      batchId,
      totalItems: totalTasks,
      successCount,
      failureCount,
      results,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Translate product (all fields)
   */
  @Process(TRANSLATION_JOB_NAMES.TRANSLATE_PRODUCT)
  async handleProductTranslation(job: Job<{
    productId: string;
    tenantId: string;
    sourceLocale: string;
    targetLocales: string[];
  }>) {
    const { productId, tenantId, sourceLocale, targetLocales } = job.data;

    // Get product from database
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        description: true,
        // features: true,
      },
    });

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Create batch job for all product fields
    const items = [
      {
        type: TranslationContentType.PRODUCT_TITLE,
        entityId: productId,
        fieldName: 'name',
        sourceText: product.name,
      },
    ];

    if (product.description) {
      items.push({
        type: TranslationContentType.PRODUCT_DESCRIPTION,
        entityId: productId,
        fieldName: 'description',
        sourceText: product.description,
      });
    }

    return this.handleBatchTranslation({
      ...job,
      data: {
        batchId: `product:${productId}:${Date.now()}`,
        tenantId,
        sourceLocale,
        targetLocales,
        items,
        provider: TranslationProvider.ANTHROPIC,
        preserveFormatting: true,
      },
    } as Job<BatchTranslationJobData>);
  }

  /**
   * Translate content using LLM
   */
  private async translateContent(
    sourceText: string,
    sourceLocale: string,
    targetLocale: string,
    contentType: TranslationContentType,
    provider: TranslationProvider,
    preserveFormatting: boolean,
    context?: string,
  ): Promise<string> {
    // Get the appropriate prompt template
    const promptTemplate = TRANSLATION_PROMPTS[contentType] || TRANSLATION_PROMPTS[TranslationContentType.UI_STRING];

    // Build the prompt
    let prompt = promptTemplate
      .replace('{source_locale}', this.getLocaleName(sourceLocale))
      .replace('{target_locale}', this.getLocaleName(targetLocale))
      .replace('{text}', sourceText);

    if (context) {
      prompt = `Context: ${context}\n\n${prompt}`;
    }

    if (preserveFormatting) {
      prompt += '\n\nIMPORTANT: Preserve all HTML tags, markdown formatting, and special characters exactly as they appear in the source.';
    }

    // Call the appropriate provider
    switch (provider) {
      case TranslationProvider.ANTHROPIC:
        return this.translateWithAnthropic(prompt);
      case TranslationProvider.OPENAI:
        return this.translateWithOpenAI(prompt);
      case TranslationProvider.MOCK:
      default:
        return this.mockTranslate(sourceText, targetLocale);
    }
  }

  /**
   * Translate using Anthropic Claude
   */
  private async translateWithAnthropic(prompt: string): Promise<string> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey) {
      this.logger.warn('Anthropic API key not configured, using mock translation');
      return this.mockTranslate(prompt, 'target');
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307', // Use Haiku for translations (fast + cheap)
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0]?.text?.trim() || '';
    } catch (error) {
      this.logger.error('Anthropic translation failed:', error);
      throw error;
    }
  }

  /**
   * Translate using OpenAI
   */
  private async translateWithOpenAI(prompt: string): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured, using mock translation');
      return this.mockTranslate(prompt, 'target');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Fast and cost-effective
          messages: [
            {
              role: 'system',
              content: 'You are an expert translator for e-commerce content. Provide only the translation, no explanations.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower temperature for consistent translations
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      this.logger.error('OpenAI translation failed:', error);
      throw error;
    }
  }

  /**
   * Mock translation for development
   */
  private mockTranslate(text: string, targetLocale: string): string {
    // Simple mock: just prefix with locale code
    return `[${targetLocale.toUpperCase()}] ${text}`;
  }

  /**
   * Select the best available provider
   */
  private selectProvider(): TranslationProvider {
    if (this.configService.get<string>('ANTHROPIC_API_KEY')) {
      return TranslationProvider.ANTHROPIC;
    }
    if (this.configService.get<string>('OPENAI_API_KEY')) {
      return TranslationProvider.OPENAI;
    }
    return TranslationProvider.MOCK;
  }

  /**
   * Get locale display name
   */
  private getLocaleName(locale: string): string {
    const localeNames: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      nl: 'Dutch',
      ru: 'Russian',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean',
      ar: 'Arabic',
      sw: 'Swahili',
    };
    return localeNames[locale] || locale;
  }

  /**
   * Assess translation quality
   */
  private async assessQuality(
    sourceText: string,
    translatedText: string,
    sourceLocale: string,
    targetLocale: string,
  ): Promise<number> {
    // Basic quality checks
    let score = 100;

    // Check if translation is empty
    if (!translatedText || translatedText.trim() === '') {
      return 0;
    }

    // Check length ratio
    const lengthRatio = translatedText.length / sourceText.length;
    if (lengthRatio > TRANSLATION_QUALITY.MAX_LENGTH_RATIO) {
      score -= 20;
    } else if (lengthRatio < TRANSLATION_QUALITY.MIN_LENGTH_RATIO) {
      score -= 30;
    }

    // Check if translation is same as source (probably failed)
    if (translatedText === sourceText && sourceLocale !== targetLocale) {
      score -= 50;
    }

    // Check for preserved formatting (if HTML/markdown present in source)
    if (sourceText.includes('<') && !translatedText.includes('<')) {
      score -= 15;
    }

    // Check for placeholder preservation
    const sourcePlaceholders = (sourceText.match(/\{\{[^}]+\}\}/g) || []).sort();
    const translatedPlaceholders = (translatedText.match(/\{\{[^}]+\}\}/g) || []).sort();
    if (JSON.stringify(sourcePlaceholders) !== JSON.stringify(translatedPlaceholders)) {
      score -= 25;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Update translation status
   */
  private async updateTranslationStatus(
    entityId: string,
    targetLocale: string,
    status: string,
  ): Promise<void> {
    try {
      await this.prisma.productTranslation.updateMany({
        where: {
          productId: entityId,
          locale: targetLocale,
        },
        data: {
          status,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn(`Could not update translation status: ${error}`);
    }
  }

  /**
   * Save translation to database
   */
  private async saveTranslation(data: {
    entityId: string;
    entityType: TranslationContentType;
    fieldName: string;
    tenantId: string;
    sourceLocale: string;
    targetLocale: string;
    sourceText: string;
    translatedText: string;
    status: string;
    qualityScore: number;
    provider: TranslationProvider;
  }): Promise<void> {
    try {
      await this.prisma.productTranslation.upsert({
        where: {
          productId_locale_field: {
            productId: data.entityId,
            locale: data.targetLocale,
            field: data.fieldName,
          },
        },
        create: {
          productId: data.entityId,
          locale: data.targetLocale,
          field: data.fieldName,
          value: data.translatedText,
          status: data.status,
          autoTranslated: true,
          qualityScore: data.qualityScore,
        },
        update: {
          value: data.translatedText,
          status: data.status,
          autoTranslated: true,
          qualityScore: data.qualityScore,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save translation: ${error}`);
      // Don't throw - translation was successful, just save failed
    }
  }

  // ==================== Queue Event Handlers ====================

  @OnQueueActive()
  onActive(job: Job<TranslationJobData>) {
    this.logger.debug(`Processing translation job ${job.id}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<TranslationJobData>, result: TranslationJobResult) {
    this.logger.log(
      `Translation job ${job.id} completed: ${result.entityId} ${result.sourceLocale}->${result.targetLocale}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<TranslationJobData>, error: Error) {
    this.logger.error(`Translation job ${job.id} failed: ${error.message}`);
  }
}
