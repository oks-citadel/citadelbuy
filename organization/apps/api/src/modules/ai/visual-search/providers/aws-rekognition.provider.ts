import { Logger } from '@nestjs/common';
import {
  IVisionProvider,
  ImageFeatures,
  ImageLabel,
  DetectedObject,
  DetectedColor,
  VISION_PROVIDER_CONFIG,
} from './vision-provider.interface';

/**
 * AWS Rekognition Provider
 *
 * Uses AWS Rekognition API for image analysis.
 * Requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION environment variables.
 */
export class AwsRekognitionProvider implements IVisionProvider {
  readonly name = 'aws-rekognition';
  private readonly logger = new Logger(AwsRekognitionProvider.name);
  private rekognitionClient: any = null;
  private isInitialized = false;

  constructor(
    private readonly accessKeyId: string,
    private readonly secretAccessKey: string,
    private readonly region: string = 'us-east-1'
  ) {
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    if (this.isInitialized || !this.accessKeyId || !this.secretAccessKey) {
      return;
    }

    try {
      // Dynamic import to avoid requiring aws-sdk when not used
      const AWS = await import('aws-sdk');
      this.rekognitionClient = new AWS.Rekognition({
        region: this.region,
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      });
      this.isInitialized = true;
      this.logger.log('AWS Rekognition client initialized');
    } catch (error: any) {
      this.logger.warn('Failed to initialize AWS Rekognition:', error.message);
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.rekognitionClient;
  }

  async analyzeImage(imageBuffer: Buffer): Promise<ImageFeatures> {
    await this.ensureInitialized();

    if (!this.isAvailable()) {
      throw new Error('AWS Rekognition not configured');
    }

    try {
      // Run all detections in parallel
      const [labelsResult, objectsResult, moderationResult] = await Promise.all([
        this.rekognitionClient
          .detectLabels({
            Image: { Bytes: imageBuffer },
            MaxLabels: VISION_PROVIDER_CONFIG.defaultMaxLabels,
            MinConfidence: VISION_PROVIDER_CONFIG.defaultMinConfidence * 100,
          })
          .promise(),
        this.rekognitionClient
          .detectLabels({
            Image: { Bytes: imageBuffer },
            MaxLabels: 10,
            MinConfidence: 50,
            Features: ['GENERAL_LABELS'],
          })
          .promise(),
        this.rekognitionClient
          .detectModerationLabels({
            Image: { Bytes: imageBuffer },
            MinConfidence: 50,
          })
          .promise(),
      ]);

      const labels = this.parseLabels(labelsResult.Labels || []);
      const objects = this.parseObjects(labelsResult.Labels || []);
      const dominantColors = await this.extractColors(imageBuffer);
      const safeSearch = this.parseModerationLabels(moderationResult.ModerationLabels || []);

      return {
        labels,
        objects,
        dominantColors,
        safeSearch,
        textAnnotations: [],
        webEntities: [],
      };
    } catch (error: any) {
      this.logger.error('AWS Rekognition analyzeImage error:', error.message);
      throw new Error(`AWS Rekognition error: ${error.message}`);
    }
  }

  async analyzeImageUrl(imageUrl: string): Promise<ImageFeatures> {
    // AWS Rekognition requires S3 URLs or direct bytes, so download the image first
    const axios = (await import('axios')).default;
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    return this.analyzeImage(Buffer.from(response.data));
  }

  async getLabels(imageBuffer: Buffer): Promise<ImageLabel[]> {
    await this.ensureInitialized();

    if (!this.isAvailable()) {
      throw new Error('AWS Rekognition not configured');
    }

    try {
      const result = await this.rekognitionClient
        .detectLabels({
          Image: { Bytes: imageBuffer },
          MaxLabels: VISION_PROVIDER_CONFIG.defaultMaxLabels,
          MinConfidence: VISION_PROVIDER_CONFIG.defaultMinConfidence * 100,
        })
        .promise();

      return this.parseLabels(result.Labels || []);
    } catch (error: any) {
      this.logger.error('AWS Rekognition getLabels error:', error.message);
      throw new Error(`AWS Rekognition error: ${error.message}`);
    }
  }

  async detectObjects(imageBuffer: Buffer): Promise<DetectedObject[]> {
    await this.ensureInitialized();

    if (!this.isAvailable()) {
      throw new Error('AWS Rekognition not configured');
    }

    try {
      const result = await this.rekognitionClient
        .detectLabels({
          Image: { Bytes: imageBuffer },
          MaxLabels: 10,
          MinConfidence: 50,
        })
        .promise();

      return this.parseObjects(result.Labels || []);
    } catch (error: any) {
      this.logger.error('AWS Rekognition detectObjects error:', error.message);
      throw new Error(`AWS Rekognition error: ${error.message}`);
    }
  }

  async extractColors(imageBuffer: Buffer): Promise<DetectedColor[]> {
    // AWS Rekognition doesn't have direct color extraction
    // We'll use sharp for local color extraction
    try {
      const sharp = (await import('sharp')).default;

      const { dominant } = await sharp(imageBuffer).resize(64, 64, { fit: 'fill' }).stats();

      const dominantColor: DetectedColor = {
        hex: this.rgbToHex(dominant.r, dominant.g, dominant.b),
        name: this.getColorName(dominant.r, dominant.g, dominant.b),
        score: 1.0,
        pixelFraction: 0.5,
      };

      // Extract more colors using quantization
      const { data, info } = await sharp(imageBuffer)
        .resize(32, 32, { fit: 'fill' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = new Uint8Array(data);
      const colorCounts: Map<string, { count: number; r: number; g: number; b: number }> = new Map();

      for (let i = 0; i < pixels.length; i += info.channels) {
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

      const totalPixels = 32 * 32;
      const sortedColors = Array.from(colorCounts.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);

      const colors: DetectedColor[] = sortedColors.map(([, value]) => ({
        hex: this.rgbToHex(value.r, value.g, value.b),
        name: this.getColorName(value.r, value.g, value.b),
        score: value.count / totalPixels,
        pixelFraction: value.count / totalPixels,
      }));

      return [dominantColor, ...colors.filter((c) => c.hex !== dominantColor.hex)].slice(0, 5);
    } catch (error: any) {
      this.logger.warn('Color extraction failed:', error.message);
      return [];
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeClient();
    }
  }

  private parseLabels(labels: any[]): ImageLabel[] {
    return labels.map((label) => ({
      name: label.Name,
      confidence: label.Confidence / 100,
      parentLabels: (label.Parents || []).map((p: any) => p.Name),
    }));
  }

  private parseObjects(labels: any[]): DetectedObject[] {
    return labels
      .filter((label) => label.Instances && label.Instances.length > 0)
      .flatMap((label) =>
        label.Instances.map((instance: any) => ({
          name: label.Name,
          confidence: instance.Confidence / 100,
          boundingBox: instance.BoundingBox
            ? {
                left: instance.BoundingBox.Left,
                top: instance.BoundingBox.Top,
                width: instance.BoundingBox.Width,
                height: instance.BoundingBox.Height,
              }
            : undefined,
        }))
      );
  }

  private parseModerationLabels(
    labels: any[]
  ): ImageFeatures['safeSearch'] {
    type SafeSearchLevel = 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';

    const result: ImageFeatures['safeSearch'] = {
      adult: 'VERY_UNLIKELY',
      violence: 'VERY_UNLIKELY',
      racy: 'VERY_UNLIKELY',
    };

    for (const label of labels) {
      const confidence = label.Confidence / 100;
      const level = this.confidenceToLevel(confidence);

      if (
        label.Name.toLowerCase().includes('explicit') ||
        label.Name.toLowerCase().includes('nudity')
      ) {
        result.adult = this.maxLevel(result.adult, level);
      }
      if (
        label.Name.toLowerCase().includes('violence') ||
        label.Name.toLowerCase().includes('graphic')
      ) {
        result.violence = this.maxLevel(result.violence, level);
      }
      if (label.Name.toLowerCase().includes('suggestive')) {
        result.racy = this.maxLevel(result.racy, level);
      }
    }

    return result;
  }

  private confidenceToLevel(
    confidence: number
  ): 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY' {
    if (confidence > 0.9) return 'VERY_LIKELY';
    if (confidence > 0.7) return 'LIKELY';
    if (confidence > 0.5) return 'POSSIBLE';
    if (confidence > 0.3) return 'UNLIKELY';
    return 'VERY_UNLIKELY';
  }

  private maxLevel(
    a: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY',
    b: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY'
  ): 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY' {
    const levels = ['VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
    return levels[Math.max(levels.indexOf(a), levels.indexOf(b))] as
      | 'VERY_UNLIKELY'
      | 'UNLIKELY'
      | 'POSSIBLE'
      | 'LIKELY'
      | 'VERY_LIKELY';
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(x).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
        .toUpperCase()
    );
  }

  private getColorName(r: number, g: number, b: number): string {
    const colors: { name: string; r: number; g: number; b: number }[] = [
      { name: 'Red', r: 255, g: 0, b: 0 },
      { name: 'Green', r: 0, g: 128, b: 0 },
      { name: 'Blue', r: 0, g: 0, b: 255 },
      { name: 'Yellow', r: 255, g: 255, b: 0 },
      { name: 'Orange', r: 255, g: 165, b: 0 },
      { name: 'Purple', r: 128, g: 0, b: 128 },
      { name: 'Pink', r: 255, g: 192, b: 203 },
      { name: 'Brown', r: 139, g: 69, b: 19 },
      { name: 'Black', r: 0, g: 0, b: 0 },
      { name: 'White', r: 255, g: 255, b: 255 },
      { name: 'Gray', r: 128, g: 128, b: 128 },
      { name: 'Cyan', r: 0, g: 255, b: 255 },
      { name: 'Magenta', r: 255, g: 0, b: 255 },
      { name: 'Navy', r: 0, g: 0, b: 128 },
      { name: 'Teal', r: 0, g: 128, b: 128 },
      { name: 'Beige', r: 245, g: 245, b: 220 },
    ];

    let closestColor = 'Unknown';
    let minDistance = Infinity;

    for (const c of colors) {
      const distance = Math.sqrt(
        Math.pow(r - c.r, 2) + Math.pow(g - c.g, 2) + Math.pow(b - c.b, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = c.name;
      }
    }

    return closestColor;
  }
}
