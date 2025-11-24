import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ============================================
// TYPES
// ============================================

export interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
  isEnabled: boolean;
  isRTL: boolean;
  flag?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Translation {
  id: string;
  languageCode: string;
  key: string;
  value: string;
  namespace: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranslationMap {
  [key: string]: string;
}

export interface TranslationCoverage {
  ui: {
    total: number;
    translated: number;
    percentage: number;
  };
  products: {
    total: number;
    translated: number;
    percentage: number;
  };
  categories: {
    total: number;
    translated: number;
    percentage: number;
  };
}

export interface ProductTranslation {
  id: string;
  productId: string;
  languageCode: string;
  name: string;
  description: string;
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  language: Language;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTranslation {
  id: string;
  categoryId: string;
  languageCode: string;
  name: string;
  description?: string;
  slug?: string;
  language: Language;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// QUERY KEYS
// ============================================

export const i18nKeys = {
  all: ['i18n'] as const,
  languages: () => [...i18nKeys.all, 'languages'] as const,
  language: (code: string) => [...i18nKeys.languages(), code] as const,
  defaultLanguage: () => [...i18nKeys.languages(), 'default'] as const,
  translations: (languageCode: string, namespace?: string) =>
    [...i18nKeys.all, 'translations', languageCode, namespace] as const,
  allTranslations: (languageCode: string) =>
    [...i18nKeys.all, 'translations', languageCode, 'all'] as const,
  coverage: (languageCode: string) =>
    [...i18nKeys.all, 'coverage', languageCode] as const,
  productTranslations: (productId: string) =>
    [...i18nKeys.all, 'product-translations', productId] as const,
  productTranslation: (productId: string, languageCode: string) =>
    [...i18nKeys.productTranslations(productId), languageCode] as const,
  categoryTranslations: (categoryId: string) =>
    [...i18nKeys.all, 'category-translations', categoryId] as const,
  categoryTranslation: (categoryId: string, languageCode: string) =>
    [...i18nKeys.categoryTranslations(categoryId), languageCode] as const,
};

// ============================================
// LANGUAGE HOOKS
// ============================================

export function useLanguages(includeDisabled = false) {
  return useQuery({
    queryKey: [...i18nKeys.languages(), includeDisabled],
    queryFn: async () => {
      const params = includeDisabled ? '?includeDisabled=true' : '';
      const response = await apiClient.get<Language[]>(`/i18n/languages${params}`);
      return response;
    },
  });
}

export function useLanguage(code: string) {
  return useQuery({
    queryKey: i18nKeys.language(code),
    queryFn: async () => {
      const response = await apiClient.get<Language>(`/i18n/languages/${code}`);
      return response;
    },
    enabled: !!code,
  });
}

export function useDefaultLanguage() {
  return useQuery({
    queryKey: i18nKeys.defaultLanguage(),
    queryFn: async () => {
      const response = await apiClient.get<Language>('/i18n/languages/default');
      return response;
    },
  });
}

// ============================================
// TRANSLATION HOOKS
// ============================================

export function useTranslations(languageCode: string, namespace?: string) {
  return useQuery({
    queryKey: i18nKeys.translations(languageCode, namespace),
    queryFn: async () => {
      const params = namespace ? `?namespace=${namespace}` : '';
      const response = await apiClient.get<TranslationMap>(
        `/i18n/translations/${languageCode}${params}`
      );
      return response;
    },
    enabled: !!languageCode,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useAllTranslations(languageCode: string) {
  return useQuery({
    queryKey: i18nKeys.allTranslations(languageCode),
    queryFn: async () => {
      const response = await apiClient.get<Record<string, TranslationMap>>(
        `/i18n/translations/${languageCode}/all`
      );
      return response;
    },
    enabled: !!languageCode,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useTranslationCoverage(languageCode: string) {
  return useQuery({
    queryKey: i18nKeys.coverage(languageCode),
    queryFn: async () => {
      const response = await apiClient.get<TranslationCoverage>(
        `/i18n/coverage/${languageCode}`
      );
      return response;
    },
    enabled: !!languageCode,
  });
}

// ============================================
// PRODUCT TRANSLATION HOOKS
// ============================================

export function useProductTranslations(productId: string) {
  return useQuery({
    queryKey: i18nKeys.productTranslations(productId),
    queryFn: async () => {
      const response = await apiClient.get<ProductTranslation[]>(
        `/i18n/products/${productId}/translations`
      );
      return response;
    },
    enabled: !!productId,
  });
}

export function useProductTranslation(productId: string, languageCode: string) {
  return useQuery({
    queryKey: i18nKeys.productTranslation(productId, languageCode),
    queryFn: async () => {
      const response = await apiClient.get<ProductTranslation>(
        `/i18n/products/${productId}/translations/${languageCode}`
      );
      return response;
    },
    enabled: !!productId && !!languageCode,
  });
}

// ============================================
// CATEGORY TRANSLATION HOOKS
// ============================================

export function useCategoryTranslations(categoryId: string) {
  return useQuery({
    queryKey: i18nKeys.categoryTranslations(categoryId),
    queryFn: async () => {
      const response = await apiClient.get<CategoryTranslation[]>(
        `/i18n/categories/${categoryId}/translations`
      );
      return response;
    },
    enabled: !!categoryId,
  });
}

export function useCategoryTranslation(categoryId: string, languageCode: string) {
  return useQuery({
    queryKey: i18nKeys.categoryTranslation(categoryId, languageCode),
    queryFn: async () => {
      const response = await apiClient.get<CategoryTranslation>(
        `/i18n/categories/${categoryId}/translations/${languageCode}`
      );
      return response;
    },
    enabled: !!categoryId && !!languageCode,
  });
}

// ============================================
// MUTATION HOOKS (Admin only)
// ============================================

export function useCreateLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      code: string;
      name: string;
      nativeName: string;
      isDefault?: boolean;
      isEnabled?: boolean;
      isRTL?: boolean;
      flag?: string;
      sortOrder?: number;
    }) => {
      const response = await apiClient.post<Language>('/i18n/languages', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: i18nKeys.languages() });
    },
  });
}

export function useUpdateLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      code,
      data,
    }: {
      code: string;
      data: Partial<{
        name: string;
        nativeName: string;
        isDefault: boolean;
        isEnabled: boolean;
        isRTL: boolean;
        flag: string;
        sortOrder: number;
      }>;
    }) => {
      const response = await apiClient.put<Language>(`/i18n/languages/${code}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: i18nKeys.languages() });
      queryClient.invalidateQueries({ queryKey: i18nKeys.language(variables.code) });
    },
  });
}

export function useDeleteLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      await apiClient.delete(`/i18n/languages/${code}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: i18nKeys.languages() });
    },
  });
}

export function useInitializeLanguages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/i18n/languages/initialize');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: i18nKeys.languages() });
    },
  });
}

export function useBulkUpsertTranslations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      languageCode: string;
      translations: Record<string, string>;
      namespace?: string;
    }) => {
      const response = await apiClient.post('/i18n/translations/bulk', data);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: i18nKeys.translations(variables.languageCode, variables.namespace),
      });
      queryClient.invalidateQueries({
        queryKey: i18nKeys.allTranslations(variables.languageCode),
      });
    },
  });
}

export function useUpsertProductTranslation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      productId: string;
      languageCode: string;
      name: string;
      description: string;
      metaTitle?: string;
      metaDescription?: string;
      slug?: string;
    }) => {
      const response = await apiClient.post<ProductTranslation>(
        `/i18n/products/${data.productId}/translations`,
        data
      );
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: i18nKeys.productTranslations(variables.productId),
      });
      queryClient.invalidateQueries({
        queryKey: i18nKeys.productTranslation(variables.productId, variables.languageCode),
      });
    },
  });
}

export function useUpsertCategoryTranslation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      categoryId: string;
      languageCode: string;
      name: string;
      description?: string;
      slug?: string;
    }) => {
      const response = await apiClient.post<CategoryTranslation>(
        `/i18n/categories/${data.categoryId}/translations`,
        data
      );
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: i18nKeys.categoryTranslations(variables.categoryId),
      });
      queryClient.invalidateQueries({
        queryKey: i18nKeys.categoryTranslation(variables.categoryId, variables.languageCode),
      });
    },
  });
}
