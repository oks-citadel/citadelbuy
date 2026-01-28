// Visual Search Module Exports
export { VisualSearchModule } from './visual-search.module';
export { VisualSearchService, VisionProviderType } from './visual-search.service';
export { VisualSearchController } from './visual-search.controller';

// DTOs
export {
  SearchByImageUrlDto,
  FindSimilarProductsDto,
  ExtractFeaturesDto,
  VisualSearchResultDto,
  ImageLabel,
  DominantColor,
  SimilarProduct,
  SearchMetadata,
  ImageFeaturesDto,
  IndexProductImageDto,
  BatchIndexProductsDto,
} from './dto/visual-search.dto';

// Providers
export {
  IVisionProvider,
  ImageFeatures,
  DetectedObject,
  DetectedColor as ProviderDetectedColor,
  VisionProviderConfig,
  VISION_PROVIDER_CONFIG,
  GoogleVisionProvider,
  AwsRekognitionProvider,
  ClarifaiProvider,
  MockVisionProvider,
} from './providers';
