/**
 * Vision Provider Interface
 *
 * This interface defines the contract for external image recognition APIs.
 * Implementations can use Google Cloud Vision, AWS Rekognition, Clarifai, or others.
 */

export interface ImageLabel {
  name: string;
  confidence: number;
  parentLabels?: string[];
}

export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export interface DetectedColor {
  hex: string;
  name: string;
  score: number;
  pixelFraction: number;
}

export interface ImageFeatures {
  labels: ImageLabel[];
  objects: DetectedObject[];
  dominantColors: DetectedColor[];
  safeSearch?: {
    adult: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
    violence: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
    racy: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  };
  textAnnotations?: string[];
  webEntities?: {
    entityId: string;
    description: string;
    score: number;
  }[];
}

export interface VisionProviderConfig {
  provider: 'google' | 'aws' | 'clarifai' | 'azure' | 'mock';
  apiKey?: string;
  projectId?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  modelId?: string;
}

export interface IVisionProvider {
  /**
   * Provider name for identification
   */
  readonly name: string;

  /**
   * Check if the provider is properly configured and ready
   */
  isAvailable(): boolean;

  /**
   * Analyze an image from a buffer
   */
  analyzeImage(imageBuffer: Buffer): Promise<ImageFeatures>;

  /**
   * Analyze an image from a URL
   */
  analyzeImageUrl(imageUrl: string): Promise<ImageFeatures>;

  /**
   * Get image labels/tags only (lighter operation)
   */
  getLabels(imageBuffer: Buffer): Promise<ImageLabel[]>;

  /**
   * Detect objects in the image
   */
  detectObjects(imageBuffer: Buffer): Promise<DetectedObject[]>;

  /**
   * Extract dominant colors
   */
  extractColors(imageBuffer: Buffer): Promise<DetectedColor[]>;

  /**
   * Get similar images from the web (if supported)
   */
  findSimilarWebImages?(imageBuffer: Buffer): Promise<{
    url: string;
    score: number;
  }[]>;
}

/**
 * Base configuration for vision providers
 */
export const VISION_PROVIDER_CONFIG = {
  maxImageSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
  defaultMaxLabels: 20,
  defaultMinConfidence: 0.5,
};
