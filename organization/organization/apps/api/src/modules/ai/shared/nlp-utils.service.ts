import { Injectable, Logger } from '@nestjs/common';

/**
 * NLP Utilities Service
 * Lightweight NLP implementations that don't require heavy ML dependencies
 * Provides: tokenization, stemming, spell checking, TF-IDF, and text similarity
 */
@Injectable()
export class NlpUtilsService {
  private readonly logger = new Logger(NlpUtilsService.name);

  // Common English stop words
  private readonly stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'the', 'this', 'but', 'they',
    'have', 'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'can', 'should', 'now', 'i', 'me',
    'my', 'myself', 'we', 'our', 'ours', 'you', 'your', 'yours',
  ]);

  // Common misspellings dictionary for e-commerce
  private readonly commonMisspellings: Map<string, string> = new Map([
    ['sheos', 'shoes'],
    ['shose', 'shoes'],
    ['shoos', 'shoes'],
    ['jackt', 'jacket'],
    ['jaket', 'jacket'],
    ['shirtt', 'shirt'],
    ['shrit', 'shirt'],
    ['tshrit', 'tshirt'],
    ['headfones', 'headphones'],
    ['headphons', 'headphones'],
    ['heaphones', 'headphones'],
    ['laoptop', 'laptop'],
    ['latop', 'laptop'],
    ['laptpo', 'laptop'],
    ['iphon', 'iphone'],
    ['samung', 'samsung'],
    ['samsng', 'samsung'],
    ['nikee', 'nike'],
    ['addidas', 'adidas'],
    ['wireles', 'wireless'],
    ['wirelss', 'wireless'],
    ['bluetooth', 'bluetooth'],
    ['bluetoth', 'bluetooth'],
    ['electroincs', 'electronics'],
    ['electrnics', 'electronics'],
    ['clothign', 'clothing'],
    ['cloting', 'clothing'],
    ['accesories', 'accessories'],
    ['acessories', 'accessories'],
    ['batery', 'battery'],
    ['battrey', 'battery'],
    ['chargr', 'charger'],
    ['charger', 'charger'],
    ['cancelling', 'canceling'],
    ['colour', 'color'],
    ['favourite', 'favorite'],
  ]);

  // Porter Stemmer suffix rules (simplified)
  private readonly suffixRules = [
    { suffix: 'ational', replacement: 'ate' },
    { suffix: 'tional', replacement: 'tion' },
    { suffix: 'ization', replacement: 'ize' },
    { suffix: 'fulness', replacement: 'ful' },
    { suffix: 'ousness', replacement: 'ous' },
    { suffix: 'iveness', replacement: 'ive' },
    { suffix: 'ement', replacement: '' },
    { suffix: 'ment', replacement: '' },
    { suffix: 'ness', replacement: '' },
    { suffix: 'able', replacement: '' },
    { suffix: 'ible', replacement: '' },
    { suffix: 'ance', replacement: '' },
    { suffix: 'ence', replacement: '' },
    { suffix: 'tion', replacement: '' },
    { suffix: 'sion', replacement: '' },
    { suffix: 'ling', replacement: '' },
    { suffix: 'ally', replacement: '' },
    { suffix: 'ator', replacement: '' },
    { suffix: 'ing', replacement: '' },
    { suffix: 'ies', replacement: 'y' },
    { suffix: 'ful', replacement: '' },
    { suffix: 'ive', replacement: '' },
    { suffix: 'ous', replacement: '' },
    { suffix: 'ize', replacement: '' },
    { suffix: 'ise', replacement: '' },
    { suffix: 'ate', replacement: '' },
    { suffix: 'ion', replacement: '' },
    { suffix: 'ant', replacement: '' },
    { suffix: 'ent', replacement: '' },
    { suffix: 'ism', replacement: '' },
    { suffix: 'ist', replacement: '' },
    { suffix: 'ity', replacement: '' },
    { suffix: 'ive', replacement: '' },
    { suffix: 'ely', replacement: '' },
    { suffix: 'er', replacement: '' },
    { suffix: 'es', replacement: '' },
    { suffix: 'ed', replacement: '' },
    { suffix: 'ly', replacement: '' },
    { suffix: 's', replacement: '' },
  ];

  /**
   * Tokenize text into words
   */
  tokenize(text: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Remove stop words from tokens
   */
  removeStopWords(tokens: string[]): string[] {
    return tokens.filter(token => !this.stopWords.has(token.toLowerCase()));
  }

  /**
   * Stem a word using simplified Porter Stemmer
   */
  stem(word: string): string {
    if (word.length < 3) return word;

    let stemmed = word.toLowerCase();

    for (const rule of this.suffixRules) {
      if (stemmed.endsWith(rule.suffix) && stemmed.length > rule.suffix.length + 2) {
        stemmed = stemmed.slice(0, -rule.suffix.length) + rule.replacement;
        break;
      }
    }

    return stemmed;
  }

  /**
   * Stem all tokens
   */
  stemTokens(tokens: string[]): string[] {
    return tokens.map(token => this.stem(token));
  }

  /**
   * Correct spelling using dictionary and Levenshtein distance
   */
  correctSpelling(word: string): { corrected: string; isCorrection: boolean } {
    const lowerWord = word.toLowerCase();

    // Check dictionary first
    if (this.commonMisspellings.has(lowerWord)) {
      return {
        corrected: this.commonMisspellings.get(lowerWord)!,
        isCorrection: true,
      };
    }

    return { corrected: word, isCorrection: false };
  }

  /**
   * Correct spelling for entire query
   */
  correctQuery(query: string): { corrected: string; hadCorrections: boolean } {
    const tokens = this.tokenize(query);
    let hadCorrections = false;

    const correctedTokens = tokens.map(token => {
      const result = this.correctSpelling(token);
      if (result.isCorrection) hadCorrections = true;
      return result.corrected;
    });

    return {
      corrected: correctedTokens.join(' '),
      hadCorrections,
    };
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Calculate string similarity (0-1)
   */
  stringSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;

    const distance = this.levenshteinDistance(a.toLowerCase(), b.toLowerCase());
    const maxLength = Math.max(a.length, b.length);

    return 1 - distance / maxLength;
  }

  /**
   * Calculate TF-IDF scores for documents
   */
  calculateTfIdf(
    documents: string[],
    query: string,
  ): { docIndex: number; score: number }[] {
    const queryTokens = this.removeStopWords(this.tokenize(query));
    const stemmedQuery = this.stemTokens(queryTokens);

    // Calculate document frequencies
    const docFrequencies = new Map<string, number>();
    const tokenizedDocs: string[][] = [];

    for (const doc of documents) {
      const tokens = this.stemTokens(this.removeStopWords(this.tokenize(doc)));
      tokenizedDocs.push(tokens);

      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        docFrequencies.set(token, (docFrequencies.get(token) || 0) + 1);
      }
    }

    const numDocs = documents.length;
    const scores: { docIndex: number; score: number }[] = [];

    for (let i = 0; i < tokenizedDocs.length; i++) {
      const docTokens = tokenizedDocs[i];
      const termFrequencies = new Map<string, number>();

      for (const token of docTokens) {
        termFrequencies.set(token, (termFrequencies.get(token) || 0) + 1);
      }

      let score = 0;
      for (const queryToken of stemmedQuery) {
        const tf = (termFrequencies.get(queryToken) || 0) / (docTokens.length || 1);
        const df = docFrequencies.get(queryToken) || 0;
        const idf = df > 0 ? Math.log(numDocs / df) : 0;
        score += tf * idf;
      }

      scores.push({ docIndex: i, score });
    }

    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate cosine similarity between two text strings
   */
  cosineSimilarity(text1: string, text2: string): number {
    const tokens1 = this.stemTokens(this.removeStopWords(this.tokenize(text1)));
    const tokens2 = this.stemTokens(this.removeStopWords(this.tokenize(text2)));

    // Build vocabulary
    const vocab = new Set([...tokens1, ...tokens2]);

    // Create frequency vectors
    const freq1 = new Map<string, number>();
    const freq2 = new Map<string, number>();

    for (const token of tokens1) {
      freq1.set(token, (freq1.get(token) || 0) + 1);
    }
    for (const token of tokens2) {
      freq2.set(token, (freq2.get(token) || 0) + 1);
    }

    // Calculate dot product and magnitudes
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const term of vocab) {
      const v1 = freq1.get(term) || 0;
      const v2 = freq2.get(term) || 0;
      dotProduct += v1 * v2;
      magnitude1 += v1 * v1;
      magnitude2 += v2 * v2;
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Extract key phrases from text
   */
  extractKeyPhrases(text: string, maxPhrases: number = 5): string[] {
    const tokens = this.removeStopWords(this.tokenize(text));
    const frequencies = new Map<string, number>();

    // Count frequencies
    for (const token of tokens) {
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
    }

    // Sort by frequency
    const sorted = Array.from(frequencies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxPhrases)
      .map(([phrase]) => phrase);

    return sorted;
  }

  /**
   * Expand query with synonyms
   */
  expandQuery(query: string): string[] {
    const synonyms: Record<string, string[]> = {
      // Product types
      phone: ['smartphone', 'mobile', 'cellphone', 'handset'],
      laptop: ['notebook', 'computer', 'macbook', 'chromebook', 'pc'],
      tv: ['television', 'smart tv', 'display', 'monitor'],
      headphones: ['earphones', 'earbuds', 'headset', 'airpods'],
      shoes: ['sneakers', 'footwear', 'boots', 'sandals', 'trainers'],
      shirt: ['tshirt', 't-shirt', 'top', 'blouse', 'polo'],
      pants: ['trousers', 'jeans', 'slacks', 'bottoms'],
      jacket: ['coat', 'blazer', 'hoodie', 'sweater', 'cardigan'],
      bag: ['backpack', 'purse', 'handbag', 'satchel', 'tote'],
      watch: ['smartwatch', 'wristwatch', 'timepiece'],

      // Attributes
      cheap: ['affordable', 'budget', 'inexpensive', 'low-cost', 'value'],
      expensive: ['premium', 'luxury', 'high-end', 'designer'],
      best: ['top', 'highest-rated', 'popular', 'recommended', 'trending'],
      new: ['latest', 'newest', 'recent', 'fresh', 'just-arrived'],
      wireless: ['bluetooth', 'cordless', 'wifi'],
      waterproof: ['water-resistant', 'weatherproof', 'splash-proof'],
      fast: ['quick', 'rapid', 'speedy', 'express'],

      // Colors
      red: ['crimson', 'scarlet', 'burgundy', 'maroon'],
      blue: ['navy', 'azure', 'cobalt', 'sapphire', 'royal blue'],
      green: ['olive', 'emerald', 'forest', 'lime', 'mint'],
      black: ['onyx', 'jet', 'ebony', 'charcoal'],
      white: ['ivory', 'cream', 'pearl', 'snow'],
    };

    const tokens = this.tokenize(query);
    const expanded: Set<string> = new Set([query]);

    for (const token of tokens) {
      const syns = synonyms[token];
      if (syns) {
        for (const syn of syns) {
          expanded.add(query.replace(token, syn));
        }
      }
    }

    return Array.from(expanded);
  }

  /**
   * Detect language (simplified - just checks for common patterns)
   */
  detectLanguage(text: string): string {
    // This is a very simplified detection
    // In production, use a proper library like franc or langdetect
    const lowerText = text.toLowerCase();

    // Check for Spanish patterns
    if (/[áéíóúñ¿¡]/.test(lowerText) || /\b(el|la|los|las|un|una|de|en|que)\b/.test(lowerText)) {
      return 'es';
    }

    // Check for French patterns
    if (/[àâäéèêëïîôùûüç]/.test(lowerText) || /\b(le|la|les|un|une|de|du|des)\b/.test(lowerText)) {
      return 'fr';
    }

    // Check for German patterns
    if (/[äöüß]/.test(lowerText) || /\b(der|die|das|ein|eine|und|ist)\b/.test(lowerText)) {
      return 'de';
    }

    return 'en';
  }

  /**
   * N-gram generation
   */
  generateNgrams(text: string, n: number = 2): string[] {
    const tokens = this.tokenize(text);
    const ngrams: string[] = [];

    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }

    return ngrams;
  }
}
