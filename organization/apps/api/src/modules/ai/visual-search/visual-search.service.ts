import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as sharp from 'sharp';
import axios from 'axios';
import {
  ImageLabel,
  DominantColor,
  SimilarProduct,
  ImageFeaturesDto,
  SearchMetadata,
} from './dto/visual-search.dto';

// Color name mapping for common colors
const COLOR_NAMES: Record<string, string> = {
  '#FF0000': 'Red',
  '#00FF00': 'Green',
  '#0000FF': 'Blue',
  '#FFFF00': 'Yellow',
  '#FF00FF': 'Magenta',
  '#00FFFF': 'Cyan',
  '#FFFFFF': 'White',
  '#000000': 'Black',
  '#808080': 'Gray',
  '#800000': 'Maroon',
  '#808000': 'Olive',
  '#008000': 'Dark Green',
  '#800080': 'Purple',
  '#008080': 'Teal',
  '#000080': 'Navy',
  '#FFA500': 'Orange',
  '#A52A2A': 'Brown',
  '#FFC0CB': 'Pink',
  '#F5F5DC': 'Beige',
};

interface ProductImageIndex {
  productId: string;
  imageUrl: string;
  perceptualHash: string;
  averageHash: string;
  colorHistogram: number[];
  dominantColors: DominantColor[];
  indexedAt: Date;
}

@Injectable()
export class VisualSearchService {
  private readonly logger = new Logger(VisualSearchService.name);

  // In-memory index for product images (use Redis/PostgreSQL in production)
  private productImageIndex: Map<string, ProductImageIndex> = new Map();

  // AWS Rekognition client (optional)
  private rekognitionClient: any = null;
  private useCloudVision: boolean = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.initializeCloudVision();
  }

  /**
   * Initialize cloud vision service if credentials are available
   */
  private async initializeCloudVision() {
    try {
      const awsAccessKey = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const awsSecretKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
      const awsRegion = this.configService.get<string>('AWS_REGION', 'us-east-1');

      if (awsAccessKey && awsSecretKey) {
        const AWS = await import('aws-sdk');
        this.rekognitionClient = new AWS.Rekognition({
          region: awsRegion,
          accessKeyId: awsAccessKey,
          secretAccessKey: awsSecretKey,
        });
        this.useCloudVision = true;
        this.logger.log('AWS Rekognition initialized for visual search');
      } else {
        this.logger.log('Cloud vision not configured - using perceptual hashing only');
      }
    } catch (error) {
      this.logger.warn('Failed to initialize cloud vision, falling back to perceptual hashing', error);
      this.useCloudVision = false;
    }
  }

  /**
   * Search for products by uploaded image
   */
  async searchByImage(file: Express.Multer.File, options?: {
    limit?: number;
    minSimilarity?: number;
    categoryId?: string;
  }) {
    const startTime = Date.now();
    const { limit = 10, minSimilarity = 0.5, categoryId } = options || {};

    try {
      if (!file || !file.buffer) {
        throw new BadRequestException('No valid image file provided');
      }

      // Extract features from uploaded image
      const features = await this.extractFeaturesFromBuffer(file.buffer);

      // Get labels (either from cloud or local analysis)
      let labels: ImageLabel[] = [];
      if (this.useCloudVision && this.rekognitionClient) {
        labels = await this.getCloudLabels(file.buffer);
      } else {
        labels = this.getLocalLabels(features);
      }

      // Find similar products
      const similarProducts = await this.findSimilarProducts(features, {
        limit,
        minSimilarity,
        categoryId,
        searchLabels: labels,
      });

      const processingTimeMs = Date.now() - startTime;

      return {
        success: true,
        labels,
        dominantColors: features.dominantColors,
        similarProducts,
        metadata: {
          imageDimensions: features.dimensions,
          processingTimeMs,
          searchMethod: this.useCloudVision ? 'cloud_vision' : 'perceptual_hash',
          processedAt: new Date().toISOString(),
        } as SearchMetadata,
      };
    } catch (error) {
      this.logger.error('Visual search by image failed', error);
      throw error;
    }
  }

  /**
   * Search for products by image URL
   */
  async searchByImageUrl(imageUrl: string, options?: {
    limit?: number;
    minSimilarity?: number;
    categoryId?: string;
  }) {
    const startTime = Date.now();

    try {
      // Download image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        maxContentLength: 10 * 1024 * 1024, // 10MB max
      });

      const imageBuffer = Buffer.from(response.data);

      // Use the same logic as searchByImage
      const mockFile = {
        buffer: imageBuffer,
        mimetype: response.headers['content-type'] || 'image/jpeg',
      } as Express.Multer.File;

      const result = await this.searchByImage(mockFile, options);

      // Update metadata with URL info
      result.metadata.processingTimeMs = Date.now() - startTime;

      return result;
    } catch (error) {
      this.logger.error(`Visual search by URL failed: ${imageUrl}`, error);
      throw new BadRequestException('Failed to fetch or process image from URL');
    }
  }

  /**
   * Find products similar to a given product
   */
  async findSimilarByProductId(productId: string, options?: {
    limit?: number;
    sameCategoryOnly?: boolean;
  }) {
    const startTime = Date.now();
    const { limit = 10, sameCategoryOnly = false } = options || {};

    try {
      // Get the product
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: { category: true },
      });

      if (!product) {
        throw new NotFoundException(`Product not found: ${productId}`);
      }

      // Get the first image URL
      const imageUrl = product.images?.[0];
      if (!imageUrl) {
        // Fall back to category-based recommendations
        return this.getCategoryBasedRecommendations(product, limit);
      }

      // Check if we have indexed features for this product
      let features: ImageFeaturesDto | null = null;
      const indexedData = this.productImageIndex.get(productId);

      if (indexedData) {
        features = {
          perceptualHash: indexedData.perceptualHash,
          averageHash: indexedData.averageHash,
          colorHistogram: indexedData.colorHistogram,
          dominantColors: indexedData.dominantColors,
          dimensions: { width: 0, height: 0 },
          aspectRatio: 1,
        };
      } else {
        // Download and extract features
        try {
          const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
          });
          features = await this.extractFeaturesFromBuffer(Buffer.from(response.data));
        } catch {
          // Fall back to category-based recommendations
          return this.getCategoryBasedRecommendations(product, limit);
        }
      }

      // Find similar products
      const categoryId = sameCategoryOnly ? product.categoryId : undefined;
      const similarProducts = await this.findSimilarProducts(features, {
        limit: limit + 1, // Get one extra to exclude self
        minSimilarity: 0.3,
        categoryId,
        excludeProductId: productId,
      });

      const processingTimeMs = Date.now() - startTime;

      return {
        success: true,
        productId,
        product: {
          id: product.id,
          name: product.name,
          images: product.images,
          category: product.category,
        },
        similarProducts: similarProducts.slice(0, limit),
        metadata: {
          algorithm: 'perceptual_hash_similarity',
          processingTimeMs,
          processedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Finding similar products failed for: ${productId}`, error);
      throw error;
    }
  }

  /**
   * Extract features from an image buffer
   */
  async extractFeaturesFromBuffer(imageBuffer: Buffer): Promise<ImageFeaturesDto> {
    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();

      // Resize for consistent processing
      const resizedBuffer = await sharp(imageBuffer)
        .resize(256, 256, { fit: 'cover' })
        .removeAlpha()
        .toBuffer();

      // Calculate perceptual hash (pHash)
      const perceptualHash = await this.calculatePerceptualHash(resizedBuffer);

      // Calculate average hash (aHash)
      const averageHash = await this.calculateAverageHash(resizedBuffer);

      // Calculate color histogram
      const colorHistogram = await this.calculateColorHistogram(resizedBuffer);

      // Extract dominant colors
      const dominantColors = await this.extractDominantColors(resizedBuffer);

      return {
        perceptualHash,
        averageHash,
        colorHistogram,
        dominantColors,
        dimensions: {
          width: metadata.width || 0,
          height: metadata.height || 0,
        },
        aspectRatio: (metadata.width || 1) / (metadata.height || 1),
      };
    } catch (error) {
      this.logger.error('Feature extraction failed', error);
      throw new BadRequestException('Failed to extract features from image');
    }
  }

  /**
   * Extract features from an image URL
   */
  async extractFeaturesFromUrl(imageUrl: string): Promise<ImageFeaturesDto> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      return this.extractFeaturesFromBuffer(Buffer.from(response.data));
    } catch (error) {
      this.logger.error(`Feature extraction from URL failed: ${imageUrl}`, error);
      throw new BadRequestException('Failed to fetch or process image from URL');
    }
  }

  /**
   * Index a product's images for faster similarity search
   */
  async indexProductImage(productId: string, forceReindex: boolean = false): Promise<boolean> {
    try {
      // Check if already indexed
      if (this.productImageIndex.has(productId) && !forceReindex) {
        return true;
      }

      // Get product
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, images: true },
      });

      if (!product || !product.images?.length) {
        return false;
      }

      const imageUrl = product.images[0];

      try {
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
        });

        const features = await this.extractFeaturesFromBuffer(Buffer.from(response.data));

        this.productImageIndex.set(productId, {
          productId,
          imageUrl,
          perceptualHash: features.perceptualHash,
          averageHash: features.averageHash,
          colorHistogram: features.colorHistogram,
          dominantColors: features.dominantColors,
          indexedAt: new Date(),
        });

        this.logger.debug(`Indexed product image: ${productId}`);
        return true;
      } catch (error) {
        this.logger.warn(`Failed to index image for product ${productId}:`, error);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to index product ${productId}`, error);
      return false;
    }
  }

  /**
   * Batch index products
   */
  async batchIndexProducts(options?: {
    categoryId?: string;
    limit?: number;
  }): Promise<{ indexed: number; failed: number; total: number }> {
    const { categoryId, limit = 100 } = options || {};

    const where: any = { isActive: true };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const products = await this.prisma.product.findMany({
      where,
      select: { id: true },
      take: limit,
    });

    let indexed = 0;
    let failed = 0;

    for (const product of products) {
      const success = await this.indexProductImage(product.id);
      if (success) {
        indexed++;
      } else {
        failed++;
      }
    }

    return {
      indexed,
      failed,
      total: products.length,
    };
  }

  /**
   * Calculate perceptual hash using DCT (Discrete Cosine Transform approximation)
   */
  private async calculatePerceptualHash(imageBuffer: Buffer): Promise<string> {
    try {
      // Resize to 32x32 for DCT
      const smallBuffer = await sharp(imageBuffer)
        .resize(32, 32, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer();

      // Calculate DCT-like transformation (simplified for performance)
      const pixels = new Uint8Array(smallBuffer);
      const size = 32;
      const dctSize = 8;
      const dctValues: number[] = [];

      // Calculate low-frequency DCT coefficients
      for (let u = 0; u < dctSize; u++) {
        for (let v = 0; v < dctSize; v++) {
          let sum = 0;
          for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
              const pixel = pixels[y * size + x];
              const cosU = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * size));
              const cosV = Math.cos(((2 * y + 1) * v * Math.PI) / (2 * size));
              sum += pixel * cosU * cosV;
            }
          }
          dctValues.push(sum);
        }
      }

      // Skip DC coefficient and get median
      const acValues = dctValues.slice(1);
      const sortedAc = [...acValues].sort((a, b) => a - b);
      const median = sortedAc[Math.floor(sortedAc.length / 2)];

      // Create hash based on whether values are above/below median
      let hash = '';
      for (const value of acValues) {
        hash += value > median ? '1' : '0';
      }

      // Convert binary to hex
      const hexHash = parseInt(hash.slice(0, 32), 2).toString(16).padStart(8, '0') +
                      parseInt(hash.slice(32, 64) || '0', 2).toString(16).padStart(8, '0');

      return hexHash;
    } catch (error) {
      this.logger.warn('Perceptual hash calculation failed, using fallback', error);
      return '0000000000000000';
    }
  }

  /**
   * Calculate average hash
   */
  private async calculateAverageHash(imageBuffer: Buffer): Promise<string> {
    try {
      // Resize to 8x8 and convert to grayscale
      const smallBuffer = await sharp(imageBuffer)
        .resize(8, 8, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer();

      const pixels = new Uint8Array(smallBuffer);

      // Calculate average
      let sum = 0;
      for (const pixel of pixels) {
        sum += pixel;
      }
      const avg = sum / pixels.length;

      // Create hash
      let hash = '';
      for (const pixel of pixels) {
        hash += pixel > avg ? '1' : '0';
      }

      // Convert to hex
      return parseInt(hash, 2).toString(16).padStart(16, '0');
    } catch (error) {
      this.logger.warn('Average hash calculation failed', error);
      return '0000000000000000';
    }
  }

  /**
   * Calculate color histogram
   */
  private async calculateColorHistogram(imageBuffer: Buffer): Promise<number[]> {
    try {
      const { data, info } = await sharp(imageBuffer)
        .resize(64, 64, { fit: 'fill' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = new Uint8Array(data);
      const bins = 16; // 16 bins per channel = 4096 total bins
      const binSize = 256 / bins;
      const histogram = new Array(bins * bins * bins).fill(0);

      for (let i = 0; i < pixels.length; i += info.channels) {
        const r = Math.floor(pixels[i] / binSize);
        const g = Math.floor(pixels[i + 1] / binSize);
        const b = Math.floor(pixels[i + 2] / binSize);
        const index = r * bins * bins + g * bins + b;
        histogram[index]++;
      }

      // Normalize
      const total = 64 * 64;
      return histogram.map(count => count / total);
    } catch (error) {
      this.logger.warn('Color histogram calculation failed', error);
      return new Array(4096).fill(0);
    }
  }

  /**
   * Extract dominant colors from image
   */
  private async extractDominantColors(imageBuffer: Buffer): Promise<DominantColor[]> {
    try {
      // Use sharp's stats to get dominant colors
      const { dominant, channels } = await sharp(imageBuffer)
        .resize(64, 64, { fit: 'fill' })
        .stats();

      const dominantColor = {
        r: dominant.r,
        g: dominant.g,
        b: dominant.b,
      };

      // Also extract colors using k-means-like approach
      const { data, info } = await sharp(imageBuffer)
        .resize(32, 32, { fit: 'fill' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = new Uint8Array(data);
      const colorCounts: Map<string, { count: number; r: number; g: number; b: number }> = new Map();

      for (let i = 0; i < pixels.length; i += info.channels) {
        // Quantize colors to reduce palette
        const r = Math.round(pixels[i] / 32) * 32;
        const g = Math.round(pixels[i + 1] / 32) * 32;
        const b = Math.round(pixels[i + 2] / 32) * 32;
        const key = `${r},${g},${b}`;

        const existing = colorCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          colorCounts.set(key, { count: 1, r, g, b });
        }
      }

      // Sort by frequency and get top colors
      const sortedColors = Array.from(colorCounts.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);

      const totalPixels = 32 * 32;
      const dominantColors: DominantColor[] = sortedColors.map(([key, value]) => {
        const hex = this.rgbToHex(value.r, value.g, value.b);
        return {
          hex,
          name: this.getColorName(hex),
          percentage: (value.count / totalPixels) * 100,
        };
      });

      return dominantColors;
    } catch (error) {
      this.logger.warn('Dominant color extraction failed', error);
      return [];
    }
  }

  /**
   * Convert RGB to hex
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
  }

  /**
   * Get color name from hex
   */
  private getColorName(hex: string): string {
    // Check exact match
    if (COLOR_NAMES[hex]) {
      return COLOR_NAMES[hex];
    }

    // Find closest color
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    let closestName = 'Unknown';
    let closestDistance = Infinity;

    for (const [colorHex, name] of Object.entries(COLOR_NAMES)) {
      const cr = parseInt(colorHex.slice(1, 3), 16);
      const cg = parseInt(colorHex.slice(3, 5), 16);
      const cb = parseInt(colorHex.slice(5, 7), 16);

      const distance = Math.sqrt(
        Math.pow(r - cr, 2) + Math.pow(g - cg, 2) + Math.pow(b - cb, 2)
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestName = name;
      }
    }

    return closestName;
  }

  /**
   * Calculate Hamming distance between two hashes
   */
  private hammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      return Infinity;
    }

    // Convert hex to binary
    const bin1 = parseInt(hash1, 16).toString(2).padStart(64, '0');
    const bin2 = parseInt(hash2, 16).toString(2).padStart(64, '0');

    let distance = 0;
    for (let i = 0; i < bin1.length; i++) {
      if (bin1[i] !== bin2[i]) {
        distance++;
      }
    }

    return distance;
  }

  /**
   * Calculate histogram similarity using cosine similarity
   */
  private histogramSimilarity(hist1: number[], hist2: number[]): number {
    if (hist1.length !== hist2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < hist1.length; i++) {
      dotProduct += hist1[i] * hist2[i];
      norm1 += hist1[i] * hist1[i];
      norm2 += hist2[i] * hist2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Find similar products based on image features
   */
  private async findSimilarProducts(
    queryFeatures: ImageFeaturesDto,
    options: {
      limit: number;
      minSimilarity: number;
      categoryId?: string;
      excludeProductId?: string;
      searchLabels?: ImageLabel[];
    },
  ): Promise<SimilarProduct[]> {
    const { limit, minSimilarity, categoryId, excludeProductId, searchLabels } = options;

    // Build product query
    const where: any = { isActive: true };
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (excludeProductId) {
      where.id = { not: excludeProductId };
    }

    // Get products with images
    const products = await this.prisma.product.findMany({
      where: {
        ...where,
        images: { isEmpty: false },
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
      take: 100, // Process up to 100 products
    });

    const similarProducts: (SimilarProduct & { combinedScore: number })[] = [];

    for (const product of products) {
      // Check if we have indexed features
      let productFeatures: ProductImageIndex | null = this.productImageIndex.get(product.id) || null;

      if (!productFeatures && product.images.length > 0) {
        // Try to index on-the-fly (with timeout)
        try {
          const response = await axios.get(product.images[0], {
            responseType: 'arraybuffer',
            timeout: 5000,
          });

          const features = await this.extractFeaturesFromBuffer(Buffer.from(response.data));
          productFeatures = {
            productId: product.id,
            imageUrl: product.images[0],
            perceptualHash: features.perceptualHash,
            averageHash: features.averageHash,
            colorHistogram: features.colorHistogram,
            dominantColors: features.dominantColors,
            indexedAt: new Date(),
          };

          this.productImageIndex.set(product.id, productFeatures);
        } catch {
          continue; // Skip products with inaccessible images
        }
      }

      if (!productFeatures) {
        continue;
      }

      // Calculate similarity scores
      const pHashDistance = this.hammingDistance(queryFeatures.perceptualHash, productFeatures.perceptualHash);
      const aHashDistance = this.hammingDistance(queryFeatures.averageHash, productFeatures.averageHash);
      const histSimilarity = this.histogramSimilarity(queryFeatures.colorHistogram, productFeatures.colorHistogram);

      // Convert hash distances to similarity (max distance is 64 bits)
      const pHashSimilarity = 1 - (pHashDistance / 64);
      const aHashSimilarity = 1 - (aHashDistance / 64);

      // Calculate color similarity from dominant colors
      let colorSimilarity = 0;
      if (queryFeatures.dominantColors.length > 0 && productFeatures.dominantColors.length > 0) {
        const queryColors = new Set(queryFeatures.dominantColors.map(c => c.name));
        const productColors = new Set(productFeatures.dominantColors.map(c => c.name));
        const intersection = [...queryColors].filter(c => productColors.has(c)).length;
        colorSimilarity = intersection / Math.max(queryColors.size, productColors.size);
      }

      // Combined similarity score (weighted average)
      const combinedScore =
        (pHashSimilarity * 0.35) +
        (aHashSimilarity * 0.25) +
        (histSimilarity * 0.25) +
        (colorSimilarity * 0.15);

      if (combinedScore >= minSimilarity) {
        similarProducts.push({
          id: product.id,
          name: product.name,
          price: product.price,
          images: product.images,
          similarity: Math.round(combinedScore * 100) / 100,
          category: product.category ? {
            id: product.category.id,
            name: product.category.name,
          } : undefined,
          combinedScore,
        });
      }
    }

    // Sort by similarity and return top results
    similarProducts.sort((a, b) => b.combinedScore - a.combinedScore);

    return similarProducts.slice(0, limit).map(({ combinedScore, ...product }) => product);
  }

  /**
   * Get labels using AWS Rekognition
   */
  private async getCloudLabels(imageBuffer: Buffer): Promise<ImageLabel[]> {
    if (!this.rekognitionClient) {
      return [];
    }

    try {
      const params = {
        Image: {
          Bytes: imageBuffer,
        },
        MaxLabels: 20,
        MinConfidence: 50,
      };

      const result = await this.rekognitionClient.detectLabels(params).promise();

      return (result.Labels || []).map((label: any) => ({
        name: label.Name,
        confidence: label.Confidence / 100,
      }));
    } catch (error) {
      this.logger.warn('AWS Rekognition label detection failed', error);
      return [];
    }
  }

  /**
   * Get local labels based on color and feature analysis
   */
  private getLocalLabels(features: ImageFeaturesDto): ImageLabel[] {
    const labels: ImageLabel[] = [];

    // Add dominant color labels
    for (const color of features.dominantColors.slice(0, 3)) {
      labels.push({
        name: `${color.name} colored`,
        confidence: Math.min(color.percentage / 50, 1),
      });
    }

    // Add aspect ratio based labels
    if (features.aspectRatio > 1.5) {
      labels.push({ name: 'Landscape', confidence: 0.8 });
    } else if (features.aspectRatio < 0.67) {
      labels.push({ name: 'Portrait', confidence: 0.8 });
    } else {
      labels.push({ name: 'Square', confidence: 0.8 });
    }

    return labels;
  }

  /**
   * Get category-based recommendations as fallback
   */
  private async getCategoryBasedRecommendations(product: any, limit: number): Promise<any> {
    const similarProducts = await this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isActive: true,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      productId: product.id,
      product: {
        id: product.id,
        name: product.name,
        images: product.images,
        category: product.category,
      },
      similarProducts: similarProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        images: p.images,
        similarity: 0.5, // Default similarity for category-based
        category: p.category ? {
          id: p.category.id,
          name: p.category.name,
        } : undefined,
      })),
      metadata: {
        algorithm: 'category_based',
        processedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Get index statistics
   */
  getIndexStats(): { totalIndexed: number; indexedProducts: string[] } {
    return {
      totalIndexed: this.productImageIndex.size,
      indexedProducts: Array.from(this.productImageIndex.keys()),
    };
  }

  /**
   * Clear the index
   */
  clearIndex(): void {
    this.productImageIndex.clear();
    this.logger.log('Visual search index cleared');
  }
}
