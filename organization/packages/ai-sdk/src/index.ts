/**
 * CitadelBuy AI SDK
 * Client libraries for AI-powered services
 */

export * from './recommendation';
export * from './search';
export * from './personalization';
export * from './fraud';
export * from './chatbot';
export * from './analytics';

import { RecommendationClient } from './recommendation';
import { SearchClient } from './search';
import { PersonalizationClient } from './personalization';
import { FraudDetectionClient } from './fraud';
import { ChatbotClient } from './chatbot';
import { AnalyticsClient } from './analytics';

export interface AIConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export class CitadelBuyAI {
  public recommendation: RecommendationClient;
  public search: SearchClient;
  public personalization: PersonalizationClient;
  public fraud: FraudDetectionClient;
  public chatbot: ChatbotClient;
  public analytics: AnalyticsClient;

  constructor(config: AIConfig) {
    this.recommendation = new RecommendationClient(config);
    this.search = new SearchClient(config);
    this.personalization = new PersonalizationClient(config);
    this.fraud = new FraudDetectionClient(config);
    this.chatbot = new ChatbotClient(config);
    this.analytics = new AnalyticsClient(config);
  }
}

export default CitadelBuyAI;
