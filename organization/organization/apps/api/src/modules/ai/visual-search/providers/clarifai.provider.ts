import { Logger } from '@nestjs/common';
import axios from 'axios';
import {
  IVisionProvider,
  ImageFeatures,
  ImageLabel,
  DetectedObject,
  DetectedColor,
  VISION_PROVIDER_CONFIG,
} from './vision-provider.interface';

/**
 * Clarifai Vision Provider
 *
 * Uses Clarifai API for image analysis.
 * Requires CLARIFAI_API_KEY environment variable.
 * Optionally uses CLARIFAI_MODEL_ID (defaults to 'general-image-recognition')
 */
export class ClarifaiProvider implements IVisionProvider {
  readonly name = 'clarifai';
  private readonly logger = new Logger(ClarifaiProvider.name);
  private readonly apiKey: string;
  private readonly modelId: string;
  private readonly baseUrl = 'https://api.clarifai.com/v2';

  constructor(apiKey: string, modelId: string = 'general-image-recognition') {
    this.apiKey = apiKey;
    this.modelId = modelId;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async analyzeImage(imageBuffer: Buffer): Promise<ImageFeatures> {
    if (!this.isAvailable()) {
      throw new Error('Clarifai API key not configured');
    }

    try {
      const base64Image = imageBuffer.toString('base64');

      // Use general-image-recognition model for labels
      const response = await axios.post(
        `${this.baseUrl}/models/${this.modelId}/outputs`,
        {
          inputs: [
            {
              data: {
                image: {
                  base64: base64Image,
                },
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const output = response.data.outputs?.[0];
      if (!output) {
        throw new Error('No output from Clarifai API');
      }

      const labels = this.parseLabels(output.data?.concepts || []);
      const objects = await this.detectObjects(imageBuffer);
      const dominantColors = await this.extractColors(imageBuffer);

      return {
        labels,
        objects,
        dominantColors,
        textAnnotations: [],
        webEntities: [],
      };
    } catch (error: any) {
      this.logger.error('Clarifai analyzeImage error:', error.response?.data || error.message);
      throw new Error(`Clarifai API error: ${error.message}`);
    }
  }

  async analyzeImageUrl(imageUrl: string): Promise<ImageFeatures> {
    if (!this.isAvailable()) {
      throw new Error('Clarifai API key not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/models/${this.modelId}/outputs`,
        {
          inputs: [
            {
              data: {
                image: {
                  url: imageUrl,
                },
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const output = response.data.outputs?.[0];
      if (!output) {
        throw new Error('No output from Clarifai API');
      }

      const labels = this.parseLabels(output.data?.concepts || []);

      // Download image for additional processing
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      const imageBuffer = Buffer.from(imageResponse.data);

      const objects = await this.detectObjects(imageBuffer);
      const dominantColors = await this.extractColors(imageBuffer);

      return {
        labels,
        objects,
        dominantColors,
        textAnnotations: [],
        webEntities: [],
      };
    } catch (error: any) {
      this.logger.error('Clarifai analyzeImageUrl error:', error.response?.data || error.message);
      throw new Error(`Clarifai API error: ${error.message}`);
    }
  }

  async getLabels(imageBuffer: Buffer): Promise<ImageLabel[]> {
    if (!this.isAvailable()) {
      throw new Error('Clarifai API key not configured');
    }

    try {
      const base64Image = imageBuffer.toString('base64');

      const response = await axios.post(
        `${this.baseUrl}/models/${this.modelId}/outputs`,
        {
          inputs: [
            {
              data: {
                image: {
                  base64: base64Image,
                },
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const concepts = response.data.outputs?.[0]?.data?.concepts || [];
      return this.parseLabels(concepts);
    } catch (error: any) {
      this.logger.error('Clarifai getLabels error:', error.response?.data || error.message);
      throw new Error(`Clarifai API error: ${error.message}`);
    }
  }

  async detectObjects(imageBuffer: Buffer): Promise<DetectedObject[]> {
    if (!this.isAvailable()) {
      throw new Error('Clarifai API key not configured');
    }

    try {
      const base64Image = imageBuffer.toString('base64');

      // Use general-detection model for object detection
      const response = await axios.post(
        `${this.baseUrl}/models/general-image-detection/outputs`,
        {
          inputs: [
            {
              data: {
                image: {
                  base64: base64Image,
                },
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const regions = response.data.outputs?.[0]?.data?.regions || [];
      return regions.map((region: any) => {
        const concept = region.data?.concepts?.[0];
        const bbox = region.region_info?.bounding_box;

        return {
          name: concept?.name || 'Object',
          confidence: concept?.value || 0,
          boundingBox: bbox
            ? {
                left: bbox.left_col || 0,
                top: bbox.top_row || 0,
                width: (bbox.right_col || 0) - (bbox.left_col || 0),
                height: (bbox.bottom_row || 0) - (bbox.top_row || 0),
              }
            : undefined,
        };
      });
    } catch (error: any) {
      // Object detection model might not be available, return empty array
      this.logger.warn('Clarifai object detection not available:', error.message);
      return [];
    }
  }

  async extractColors(imageBuffer: Buffer): Promise<DetectedColor[]> {
    if (!this.isAvailable()) {
      throw new Error('Clarifai API key not configured');
    }

    try {
      const base64Image = imageBuffer.toString('base64');

      // Use color model
      const response = await axios.post(
        `${this.baseUrl}/models/color-recognition/outputs`,
        {
          inputs: [
            {
              data: {
                image: {
                  base64: base64Image,
                },
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const colors = response.data.outputs?.[0]?.data?.colors || [];
      return colors.slice(0, 5).map((color: any) => ({
        hex: color.raw_hex?.toUpperCase() || '#000000',
        name: color.w3c?.name || this.getColorNameFromHex(color.raw_hex || '#000000'),
        score: color.value || 0,
        pixelFraction: color.value || 0,
      }));
    } catch (error: any) {
      // Color model might not be available, fall back to local extraction
      this.logger.warn('Clarifai color detection not available, using local extraction');
      return this.extractColorsLocally(imageBuffer);
    }
  }

  private parseLabels(concepts: any[]): ImageLabel[] {
    return concepts
      .slice(0, VISION_PROVIDER_CONFIG.defaultMaxLabels)
      .filter((concept: any) => concept.value >= VISION_PROVIDER_CONFIG.defaultMinConfidence)
      .map((concept: any) => ({
        name: concept.name,
        confidence: concept.value,
        parentLabels: [],
      }));
  }

  private async extractColorsLocally(imageBuffer: Buffer): Promise<DetectedColor[]> {
    try {
      const sharp = (await import('sharp')).default;

      const { dominant } = await sharp(imageBuffer).resize(64, 64, { fit: 'fill' }).stats();

      const dominantColor: DetectedColor = {
        hex: this.rgbToHex(dominant.r, dominant.g, dominant.b),
        name: this.getColorName(dominant.r, dominant.g, dominant.b),
        score: 1.0,
        pixelFraction: 0.5,
      };

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
      this.logger.warn('Local color extraction failed:', error.message);
      return [];
    }
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

  private getColorNameFromHex(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return this.getColorName(r, g, b);
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
