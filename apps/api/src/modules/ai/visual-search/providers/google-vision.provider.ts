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
 * Google Cloud Vision API Provider
 *
 * Uses the Google Cloud Vision API for image analysis.
 * Requires GOOGLE_CLOUD_VISION_API_KEY environment variable.
 */
export class GoogleVisionProvider implements IVisionProvider {
  readonly name = 'google-cloud-vision';
  private readonly logger = new Logger(GoogleVisionProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://vision.googleapis.com/v1/images:annotate';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async analyzeImage(imageBuffer: Buffer): Promise<ImageFeatures> {
    if (!this.isAvailable()) {
      throw new Error('Google Cloud Vision API key not configured');
    }

    try {
      const base64Image = imageBuffer.toString('base64');

      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [
                { type: 'LABEL_DETECTION', maxResults: VISION_PROVIDER_CONFIG.defaultMaxLabels },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                { type: 'IMAGE_PROPERTIES' },
                { type: 'SAFE_SEARCH_DETECTION' },
                { type: 'TEXT_DETECTION' },
                { type: 'WEB_DETECTION', maxResults: 10 },
              ],
            },
          ],
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      return this.parseGoogleResponse(response.data.responses[0]);
    } catch (error: any) {
      this.logger.error('Google Vision API error:', error.message);
      throw new Error(`Google Vision API error: ${error.message}`);
    }
  }

  async analyzeImageUrl(imageUrl: string): Promise<ImageFeatures> {
    if (!this.isAvailable()) {
      throw new Error('Google Cloud Vision API key not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          requests: [
            {
              image: { source: { imageUri: imageUrl } },
              features: [
                { type: 'LABEL_DETECTION', maxResults: VISION_PROVIDER_CONFIG.defaultMaxLabels },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                { type: 'IMAGE_PROPERTIES' },
                { type: 'SAFE_SEARCH_DETECTION' },
                { type: 'WEB_DETECTION', maxResults: 10 },
              ],
            },
          ],
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      return this.parseGoogleResponse(response.data.responses[0]);
    } catch (error: any) {
      this.logger.error('Google Vision API error:', error.message);
      throw new Error(`Google Vision API error: ${error.message}`);
    }
  }

  async getLabels(imageBuffer: Buffer): Promise<ImageLabel[]> {
    if (!this.isAvailable()) {
      throw new Error('Google Cloud Vision API key not configured');
    }

    try {
      const base64Image = imageBuffer.toString('base64');

      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [
                { type: 'LABEL_DETECTION', maxResults: VISION_PROVIDER_CONFIG.defaultMaxLabels },
              ],
            },
          ],
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );

      const annotations = response.data.responses[0]?.labelAnnotations || [];
      return annotations.map((label: any) => ({
        name: label.description,
        confidence: label.score,
        parentLabels: [],
      }));
    } catch (error: any) {
      this.logger.error('Google Vision getLabels error:', error.message);
      throw new Error(`Google Vision API error: ${error.message}`);
    }
  }

  async detectObjects(imageBuffer: Buffer): Promise<DetectedObject[]> {
    if (!this.isAvailable()) {
      throw new Error('Google Cloud Vision API key not configured');
    }

    try {
      const base64Image = imageBuffer.toString('base64');

      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: 'OBJECT_LOCALIZATION', maxResults: 10 }],
            },
          ],
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );

      const objects = response.data.responses[0]?.localizedObjectAnnotations || [];
      return objects.map((obj: any) => ({
        name: obj.name,
        confidence: obj.score,
        boundingBox: obj.boundingPoly?.normalizedVertices
          ? this.normalizeBoundingBox(obj.boundingPoly.normalizedVertices)
          : undefined,
      }));
    } catch (error: any) {
      this.logger.error('Google Vision detectObjects error:', error.message);
      throw new Error(`Google Vision API error: ${error.message}`);
    }
  }

  async extractColors(imageBuffer: Buffer): Promise<DetectedColor[]> {
    if (!this.isAvailable()) {
      throw new Error('Google Cloud Vision API key not configured');
    }

    try {
      const base64Image = imageBuffer.toString('base64');

      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: 'IMAGE_PROPERTIES' }],
            },
          ],
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );

      const colors =
        response.data.responses[0]?.imagePropertiesAnnotation?.dominantColors?.colors || [];
      return colors.map((color: any) => ({
        hex: this.rgbToHex(
          Math.round(color.color.red || 0),
          Math.round(color.color.green || 0),
          Math.round(color.color.blue || 0)
        ),
        name: this.getColorName(color.color),
        score: color.score,
        pixelFraction: color.pixelFraction,
      }));
    } catch (error: any) {
      this.logger.error('Google Vision extractColors error:', error.message);
      throw new Error(`Google Vision API error: ${error.message}`);
    }
  }

  async findSimilarWebImages(imageBuffer: Buffer): Promise<{ url: string; score: number }[]> {
    if (!this.isAvailable()) {
      throw new Error('Google Cloud Vision API key not configured');
    }

    try {
      const base64Image = imageBuffer.toString('base64');

      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: 'WEB_DETECTION', maxResults: 10 }],
            },
          ],
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );

      const webDetection = response.data.responses[0]?.webDetection;
      const visuallySimilar = webDetection?.visuallySimilarImages || [];

      return visuallySimilar.map((img: any) => ({
        url: img.url,
        score: img.score || 0.5,
      }));
    } catch (error: any) {
      this.logger.error('Google Vision findSimilarWebImages error:', error.message);
      return [];
    }
  }

  private parseGoogleResponse(response: any): ImageFeatures {
    const labels: ImageLabel[] = (response.labelAnnotations || []).map((label: any) => ({
      name: label.description,
      confidence: label.score,
      parentLabels: [],
    }));

    const objects: DetectedObject[] = (response.localizedObjectAnnotations || []).map(
      (obj: any) => ({
        name: obj.name,
        confidence: obj.score,
        boundingBox: obj.boundingPoly?.normalizedVertices
          ? this.normalizeBoundingBox(obj.boundingPoly.normalizedVertices)
          : undefined,
      })
    );

    const colorAnnotations =
      response.imagePropertiesAnnotation?.dominantColors?.colors || [];
    const dominantColors: DetectedColor[] = colorAnnotations.slice(0, 5).map((color: any) => ({
      hex: this.rgbToHex(
        Math.round(color.color.red || 0),
        Math.round(color.color.green || 0),
        Math.round(color.color.blue || 0)
      ),
      name: this.getColorName(color.color),
      score: color.score,
      pixelFraction: color.pixelFraction,
    }));

    const safeSearch = response.safeSearchAnnotation
      ? {
          adult: response.safeSearchAnnotation.adult,
          violence: response.safeSearchAnnotation.violence,
          racy: response.safeSearchAnnotation.racy,
        }
      : undefined;

    const textAnnotations = (response.textAnnotations || [])
      .slice(0, 10)
      .map((t: any) => t.description);

    const webEntities = (response.webDetection?.webEntities || []).map((entity: any) => ({
      entityId: entity.entityId || '',
      description: entity.description || '',
      score: entity.score || 0,
    }));

    return {
      labels,
      objects,
      dominantColors,
      safeSearch,
      textAnnotations,
      webEntities,
    };
  }

  private normalizeBoundingBox(vertices: any[]): {
    left: number;
    top: number;
    width: number;
    height: number;
  } {
    if (!vertices || vertices.length < 4) {
      return { left: 0, top: 0, width: 0, height: 0 };
    }

    const left = vertices[0]?.x || 0;
    const top = vertices[0]?.y || 0;
    const right = vertices[2]?.x || 0;
    const bottom = vertices[2]?.y || 0;

    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
    };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
        .toUpperCase()
    );
  }

  private getColorName(color: { red?: number; green?: number; blue?: number }): string {
    const r = Math.round(color.red || 0);
    const g = Math.round(color.green || 0);
    const b = Math.round(color.blue || 0);

    // Simple color naming based on RGB values
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
