import { Injectable, Logger } from '@nestjs/common';

export interface SentimentResult {
  score: number; // -1 to 1 (negative to positive)
  magnitude: number; // 0 to 1 (strength of sentiment)
  label: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  aspects?: AspectSentiment[];
  keywords?: { word: string; sentiment: number }[];
}

export interface AspectSentiment {
  aspect: string;
  sentiment: number;
  mentions: number;
}

/**
 * Sentiment Analysis Service
 * Lightweight lexicon-based sentiment analysis for product reviews
 * No external ML dependencies required
 */
@Injectable()
export class SentimentAnalysisService {
  private readonly logger = new Logger(SentimentAnalysisService.name);

  // AFINN-like sentiment lexicon (word -> score from -5 to +5)
  private readonly lexicon: Map<string, number> = new Map([
    // Positive words
    ['amazing', 4],
    ['awesome', 4],
    ['excellent', 4],
    ['fantastic', 4],
    ['incredible', 4],
    ['outstanding', 4],
    ['perfect', 5],
    ['wonderful', 4],
    ['superb', 4],
    ['brilliant', 4],
    ['great', 3],
    ['good', 2],
    ['nice', 2],
    ['love', 3],
    ['loved', 3],
    ['loving', 3],
    ['like', 2],
    ['liked', 2],
    ['enjoy', 2],
    ['enjoyed', 2],
    ['happy', 3],
    ['pleased', 2],
    ['satisfied', 2],
    ['recommend', 3],
    ['recommended', 3],
    ['best', 3],
    ['better', 2],
    ['beautiful', 3],
    ['pretty', 2],
    ['comfortable', 2],
    ['comfy', 2],
    ['durable', 2],
    ['sturdy', 2],
    ['reliable', 2],
    ['quality', 2],
    ['value', 2],
    ['worth', 2],
    ['fast', 2],
    ['quick', 2],
    ['easy', 2],
    ['simple', 1],
    ['smooth', 2],
    ['clean', 1],
    ['sleek', 2],
    ['stylish', 2],
    ['elegant', 2],
    ['impressive', 3],
    ['helpful', 2],
    ['useful', 2],
    ['convenient', 2],
    ['affordable', 2],
    ['cheap', 1],
    ['bargain', 2],
    ['deal', 1],
    ['exceeds', 3],
    ['exceeded', 3],
    ['expectations', 1],
    ['works', 1],
    ['working', 1],
    ['functional', 1],
    ['effective', 2],
    ['efficient', 2],
    ['powerful', 2],
    ['solid', 2],
    ['authentic', 2],
    ['genuine', 2],
    ['premium', 2],
    ['luxury', 2],
    ['soft', 1],
    ['bright', 1],
    ['clear', 1],
    ['crisp', 2],
    ['sharp', 1],
    ['loud', 1],
    ['quiet', 1],

    // Negative words
    ['terrible', -4],
    ['horrible', -4],
    ['awful', -4],
    ['worst', -4],
    ['bad', -3],
    ['poor', -3],
    ['disappointing', -3],
    ['disappointed', -3],
    ['disappointment', -3],
    ['hate', -4],
    ['hated', -4],
    ['dislike', -2],
    ['regret', -3],
    ['waste', -3],
    ['wasted', -3],
    ['useless', -3],
    ['worthless', -4],
    ['broken', -3],
    ['defective', -3],
    ['damaged', -3],
    ['faulty', -3],
    ['cheap', -1],
    ['flimsy', -2],
    ['fragile', -1],
    ['weak', -2],
    ['slow', -2],
    ['sluggish', -2],
    ['difficult', -2],
    ['hard', -1],
    ['complicated', -2],
    ['confusing', -2],
    ['frustrating', -3],
    ['annoying', -3],
    ['annoyed', -3],
    ['irritating', -3],
    ['ugly', -3],
    ['uncomfortable', -2],
    ['unreliable', -3],
    ['inconsistent', -2],
    ['overpriced', -3],
    ['expensive', -1],
    ['ripoff', -4],
    ['scam', -5],
    ['fake', -4],
    ['counterfeit', -4],
    ['return', -1],
    ['returned', -2],
    ['refund', -2],
    ['refunded', -2],
    ['complaint', -2],
    ['complained', -2],
    ['problem', -2],
    ['problems', -2],
    ['issue', -2],
    ['issues', -2],
    ['failed', -3],
    ['fail', -3],
    ['failure', -3],
    ['error', -2],
    ['errors', -2],
    ['bug', -2],
    ['bugs', -2],
    ['crash', -3],
    ['crashed', -3],
    ['missing', -2],
    ['wrong', -2],
    ['incorrect', -2],
    ['inaccurate', -2],
    ['misleading', -3],
    ['false', -3],
    ['lie', -4],
    ['lies', -4],
    ['never', -1],
    ['noisy', -2],
    ['loud', -1],
    ['dirty', -2],
    ['stinks', -3],
    ['smells', -2],
    ['odor', -2],
    ['cheap', -2],

    // Intensifiers
    ['very', 0],
    ['really', 0],
    ['extremely', 0],
    ['highly', 0],
    ['totally', 0],
    ['absolutely', 0],
    ['completely', 0],
    ['quite', 0],
    ['somewhat', 0],
    ['slightly', 0],
    ['barely', 0],
    ['hardly', 0],

    // Negators (handled separately)
    ['not', 0],
    ['no', 0],
    ['never', 0],
    ['none', 0],
    ['nothing', 0],
    ['neither', 0],
    ['nobody', 0],
    ['nowhere', 0],
    ["don't", 0],
    ["doesn't", 0],
    ["didn't", 0],
    ["won't", 0],
    ["wouldn't", 0],
    ["couldn't", 0],
    ["shouldn't", 0],
    ["isn't", 0],
    ["aren't", 0],
    ["wasn't", 0],
    ["weren't", 0],
  ]);

  private readonly negators = new Set([
    'not', 'no', 'never', 'none', 'nothing', 'neither', 'nobody', 'nowhere',
    "don't", "doesn't", "didn't", "won't", "wouldn't", "couldn't", "shouldn't",
    "isn't", "aren't", "wasn't", "weren't", "cannot", "cant", "wont",
  ]);

  private readonly intensifiers: Map<string, number> = new Map([
    ['very', 1.5],
    ['really', 1.5],
    ['extremely', 2.0],
    ['highly', 1.5],
    ['totally', 1.5],
    ['absolutely', 2.0],
    ['completely', 1.5],
    ['quite', 1.25],
    ['somewhat', 0.75],
    ['slightly', 0.5],
    ['barely', 0.25],
    ['hardly', 0.25],
    ['so', 1.5],
    ['too', 1.25],
    ['most', 1.5],
    ['much', 1.25],
    ['super', 1.75],
    ['incredibly', 2.0],
    ['amazingly', 2.0],
  ]);

  // E-commerce specific aspect keywords
  private readonly aspectKeywords: Map<string, string[]> = new Map([
    ['quality', ['quality', 'build', 'construction', 'material', 'materials', 'durability', 'durable', 'sturdy', 'solid', 'well-made', 'well made', 'craftsmanship']],
    ['price', ['price', 'cost', 'value', 'money', 'expensive', 'cheap', 'affordable', 'overpriced', 'worth', 'deal', 'bargain']],
    ['shipping', ['shipping', 'delivery', 'arrived', 'package', 'packaging', 'shipped', 'fast', 'slow', 'damaged', 'box']],
    ['service', ['service', 'support', 'customer', 'help', 'response', 'staff', 'seller', 'vendor', 'communication']],
    ['fit', ['fit', 'size', 'sizing', 'fits', 'tight', 'loose', 'comfortable', 'snug', 'true to size', 'runs small', 'runs large']],
    ['appearance', ['look', 'looks', 'color', 'colour', 'design', 'style', 'beautiful', 'ugly', 'pretty', 'appearance', 'aesthetic']],
    ['functionality', ['works', 'working', 'function', 'functional', 'performance', 'performs', 'features', 'useful', 'useless']],
  ]);

  /**
   * Analyze sentiment of a text
   */
  analyze(text: string): SentimentResult {
    if (!text || text.trim().length === 0) {
      return {
        score: 0,
        magnitude: 0,
        label: 'neutral',
        confidence: 0,
      };
    }

    const tokens = this.tokenize(text);
    let totalScore = 0;
    let wordCount = 0;
    const keywords: { word: string; sentiment: number }[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].toLowerCase();
      let score = this.lexicon.get(token);

      if (score !== undefined && score !== 0) {
        // Check for negation in previous 3 words
        let negated = false;
        for (let j = Math.max(0, i - 3); j < i; j++) {
          if (this.negators.has(tokens[j].toLowerCase())) {
            negated = true;
            break;
          }
        }

        // Check for intensifier in previous word
        let intensifier = 1;
        if (i > 0) {
          const prevWord = tokens[i - 1].toLowerCase();
          intensifier = this.intensifiers.get(prevWord) || 1;
        }

        // Apply negation and intensifier
        if (negated) {
          score = -score * 0.75; // Negation reverses but slightly weakens
        }
        score = score * intensifier;

        totalScore += score;
        wordCount++;
        keywords.push({ word: token, sentiment: score });
      }
    }

    // Calculate normalized score (-1 to 1)
    const normalizedScore = wordCount > 0
      ? Math.max(-1, Math.min(1, totalScore / (wordCount * 3)))
      : 0;

    // Calculate magnitude (0 to 1)
    const magnitude = wordCount > 0
      ? Math.min(1, Math.abs(totalScore) / (wordCount * 2))
      : 0;

    // Determine label
    let label: SentimentResult['label'];
    if (Math.abs(normalizedScore) < 0.1) {
      label = 'neutral';
    } else if (normalizedScore >= 0.1) {
      label = 'positive';
    } else {
      label = 'negative';
    }

    // Check for mixed sentiment (both positive and negative keywords)
    const positiveCount = keywords.filter(k => k.sentiment > 0).length;
    const negativeCount = keywords.filter(k => k.sentiment < 0).length;
    if (positiveCount > 0 && negativeCount > 0 && Math.abs(positiveCount - negativeCount) < 2) {
      label = 'mixed';
    }

    // Calculate confidence based on word coverage
    const confidence = Math.min(1, 0.5 + (wordCount / tokens.length) * 0.5);

    // Extract aspect sentiments
    const aspects = this.extractAspectSentiments(text);

    return {
      score: Number(normalizedScore.toFixed(3)),
      magnitude: Number(magnitude.toFixed(3)),
      label,
      confidence: Number(confidence.toFixed(3)),
      aspects: aspects.length > 0 ? aspects : undefined,
      keywords: keywords.length > 0 ? keywords.slice(0, 10) : undefined,
    };
  }

  /**
   * Analyze multiple reviews and aggregate results
   */
  analyzeReviews(reviews: { text: string; rating?: number }[]): {
    overall: SentimentResult;
    distribution: { positive: number; negative: number; neutral: number; mixed: number };
    aspectSummary: AspectSentiment[];
    topPositive: string[];
    topNegative: string[];
  } {
    if (reviews.length === 0) {
      return {
        overall: { score: 0, magnitude: 0, label: 'neutral', confidence: 0 },
        distribution: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
        aspectSummary: [],
        topPositive: [],
        topNegative: [],
      };
    }

    const results = reviews.map(r => this.analyze(r.text));
    const distribution = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
    const allKeywords: { word: string; sentiment: number }[] = [];
    const aspectMap = new Map<string, { total: number; count: number }>();

    let totalScore = 0;
    let totalMagnitude = 0;

    for (const result of results) {
      totalScore += result.score;
      totalMagnitude += result.magnitude;
      distribution[result.label]++;

      if (result.keywords) {
        allKeywords.push(...result.keywords);
      }

      if (result.aspects) {
        for (const aspect of result.aspects) {
          const existing = aspectMap.get(aspect.aspect);
          if (existing) {
            existing.total += aspect.sentiment * aspect.mentions;
            existing.count += aspect.mentions;
          } else {
            aspectMap.set(aspect.aspect, { total: aspect.sentiment * aspect.mentions, count: aspect.mentions });
          }
        }
      }
    }

    // Calculate overall sentiment
    const avgScore = totalScore / results.length;
    const avgMagnitude = totalMagnitude / results.length;

    let overallLabel: SentimentResult['label'];
    if (Math.abs(avgScore) < 0.1) {
      overallLabel = 'neutral';
    } else if (avgScore >= 0.1) {
      overallLabel = 'positive';
    } else {
      overallLabel = 'negative';
    }

    // Aggregate aspects
    const aspectSummary: AspectSentiment[] = Array.from(aspectMap.entries()).map(([aspect, data]) => ({
      aspect,
      sentiment: Number((data.total / data.count).toFixed(3)),
      mentions: data.count,
    })).sort((a, b) => b.mentions - a.mentions);

    // Get top positive and negative keywords
    const keywordCounts = new Map<string, { count: number; sentiment: number }>();
    for (const kw of allKeywords) {
      const existing = keywordCounts.get(kw.word);
      if (existing) {
        existing.count++;
        existing.sentiment += kw.sentiment;
      } else {
        keywordCounts.set(kw.word, { count: 1, sentiment: kw.sentiment });
      }
    }

    const sortedKeywords = Array.from(keywordCounts.entries())
      .map(([word, data]) => ({ word, avgSentiment: data.sentiment / data.count, count: data.count }))
      .sort((a, b) => b.count - a.count);

    const topPositive = sortedKeywords
      .filter(k => k.avgSentiment > 0)
      .slice(0, 5)
      .map(k => k.word);

    const topNegative = sortedKeywords
      .filter(k => k.avgSentiment < 0)
      .slice(0, 5)
      .map(k => k.word);

    return {
      overall: {
        score: Number(avgScore.toFixed(3)),
        magnitude: Number(avgMagnitude.toFixed(3)),
        label: overallLabel,
        confidence: results.length > 5 ? 0.9 : 0.7,
      },
      distribution,
      aspectSummary,
      topPositive,
      topNegative,
    };
  }

  /**
   * Extract aspect-based sentiments
   */
  private extractAspectSentiments(text: string): AspectSentiment[] {
    const lowerText = text.toLowerCase();
    const aspects: AspectSentiment[] = [];

    for (const [aspect, keywords] of this.aspectKeywords.entries()) {
      let mentions = 0;
      let sentimentSum = 0;

      for (const keyword of keywords) {
        // Find all occurrences
        let index = lowerText.indexOf(keyword);
        while (index !== -1) {
          mentions++;

          // Get surrounding context (20 chars before and after)
          const start = Math.max(0, index - 30);
          const end = Math.min(lowerText.length, index + keyword.length + 30);
          const context = lowerText.substring(start, end);

          // Analyze sentiment of context
          const contextResult = this.analyzeContext(context);
          sentimentSum += contextResult;

          index = lowerText.indexOf(keyword, index + 1);
        }
      }

      if (mentions > 0) {
        aspects.push({
          aspect,
          sentiment: Number((sentimentSum / mentions).toFixed(3)),
          mentions,
        });
      }
    }

    return aspects;
  }

  /**
   * Quick sentiment analysis for a small context
   */
  private analyzeContext(context: string): number {
    const tokens = this.tokenize(context);
    let score = 0;
    let count = 0;

    for (let i = 0; i < tokens.length; i++) {
      const wordScore = this.lexicon.get(tokens[i]);
      if (wordScore !== undefined && wordScore !== 0) {
        let finalScore = wordScore;

        // Check for negation
        if (i > 0 && this.negators.has(tokens[i - 1])) {
          finalScore = -finalScore * 0.75;
        }

        score += finalScore;
        count++;
      }
    }

    return count > 0 ? score / count / 3 : 0;
  }

  /**
   * Simple tokenizer
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);
  }

  /**
   * Get sentiment for a product based on its reviews
   */
  async getProductSentiment(reviews: { comment: string; rating: number }[]): Promise<{
    sentiment: SentimentResult;
    summary: {
      distribution: { positive: number; negative: number; neutral: number; mixed: number };
      aspectSummary: AspectSentiment[];
      topPositive: string[];
      topNegative: string[];
    };
  }> {
    const reviewTexts = reviews.map(r => ({ text: r.comment, rating: r.rating }));
    const analysis = this.analyzeReviews(reviewTexts);

    return {
      sentiment: analysis.overall,
      summary: {
        distribution: analysis.distribution,
        aspectSummary: analysis.aspectSummary,
        topPositive: analysis.topPositive,
        topNegative: analysis.topNegative,
      },
    };
  }
}
