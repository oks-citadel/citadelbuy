import { create } from 'zustand';
import { Product, SearchResult, SearchParams, SortOption, SearchFacet, AISearchSuggestion } from '@/types';
import { smartSearchService, visualSearchService, voiceSearchService } from '@/services/ai';

interface SearchState {
  query: string;
  results: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: SearchFacet[];
  suggestions: AISearchSuggestion[];
  recentSearches: string[];
  isLoading: boolean;
  error: string | null;
  filters: Record<string, string[]>;
  sortBy: SortOption;

  // Visual search state
  visualSearchImage: File | null;
  visualSearchResults: Product[];
  isVisualSearching: boolean;

  // Voice search state
  isListening: boolean;
  voiceTranscript: string;

  // Actions
  search: (query: string, params?: Partial<SearchParams>) => Promise<void>;
  setQuery: (query: string) => void;
  setFilters: (filters: Record<string, string[]>) => void;
  toggleFilter: (facetName: string, value: string) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: SortOption) => void;
  setPage: (page: number) => void;
  getAutocomplete: (query: string) => Promise<AISearchSuggestion[]>;
  searchByImage: (image: File) => Promise<void>;
  startVoiceSearch: () => Promise<void>;
  stopVoiceSearch: () => void;
  addToRecentSearches: (query: string) => void;
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  clearError: () => void;
  reset: () => void;
}

const MAX_RECENT_SEARCHES = 10;

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  results: [],
  total: 0,
  page: 1,
  limit: 24,
  totalPages: 0,
  facets: [],
  suggestions: [],
  recentSearches: typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('recentSearches') || '[]')
    : [],
  isLoading: false,
  error: null,
  filters: {},
  sortBy: 'relevance',
  visualSearchImage: null,
  visualSearchResults: [],
  isVisualSearching: false,
  isListening: false,
  voiceTranscript: '',

  search: async (query: string, params?: Partial<SearchParams>) => {
    set({ isLoading: true, error: null, query });

    try {
      const { filters, sortBy, page, limit } = get();
      const searchParams: SearchParams = {
        query,
        filters,
        sortBy,
        page,
        limit,
        ...params,
      };

      const result: SearchResult = await smartSearchService.search(query, searchParams);

      set({
        results: result.products,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        facets: result.facets,
        suggestions: result.aiSuggestions || [],
        isLoading: false,
      });

      // Track search event
      smartSearchService.trackSearchEvent(query);

      // Add to recent searches
      if (query.trim()) {
        get().addToRecentSearches(query);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      set({ error: message, isLoading: false, results: [] });
    }
  },

  setQuery: (query: string) => set({ query }),

  setFilters: (filters: Record<string, string[]>) => {
    set({ filters, page: 1 });
    const { query } = get();
    if (query) {
      get().search(query);
    }
  },

  toggleFilter: (facetName: string, value: string) => {
    const { filters } = get();
    const currentValues = filters[facetName] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    const newFilters = {
      ...filters,
      [facetName]: newValues,
    };

    // Remove empty filter arrays
    if (newValues.length === 0) {
      delete newFilters[facetName];
    }

    set({ filters: newFilters, page: 1 });
    const { query } = get();
    if (query) {
      get().search(query);
    }
  },

  clearFilters: () => {
    set({ filters: {}, page: 1 });
    const { query } = get();
    if (query) {
      get().search(query);
    }
  },

  setSortBy: (sortBy: SortOption) => {
    set({ sortBy, page: 1 });
    const { query } = get();
    if (query) {
      get().search(query);
    }
  },

  setPage: (page: number) => {
    set({ page });
    const { query } = get();
    if (query) {
      get().search(query);
    }
  },

  getAutocomplete: async (query: string): Promise<AISearchSuggestion[]> => {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    try {
      const result = await smartSearchService.getAutocomplete(query);
      set({ suggestions: result.suggestions });
      return result.suggestions;
    } catch {
      return [];
    }
  },

  searchByImage: async (image: File) => {
    set({ isVisualSearching: true, visualSearchImage: image, error: null });

    try {
      const result = await visualSearchService.searchByImage(image);
      set({
        visualSearchResults: result.products,
        results: result.products,
        total: result.products.length,
        isVisualSearching: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Visual search failed';
      set({ error: message, isVisualSearching: false });
    }
  },

  startVoiceSearch: async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      set({ error: 'Voice search is not supported in this browser' });
      return;
    }

    set({ isListening: true, voiceTranscript: '', error: null });

    try {
      // Use the MediaRecorder API for voice capture
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        try {
          const transcript = await voiceSearchService.transcribe(audioBlob);
          set({ voiceTranscript: transcript, isListening: false });

          if (transcript) {
            get().search(transcript);
          }
        } catch {
          set({ error: 'Voice transcription failed', isListening: false });
        }
      };

      mediaRecorder.start();

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 10000);

      // Store mediaRecorder reference for manual stop
      (window as Window & { __mediaRecorder?: MediaRecorder }).__mediaRecorder = mediaRecorder;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Voice search failed';
      set({ error: message, isListening: false });
    }
  },

  stopVoiceSearch: () => {
    const mediaRecorder = (window as Window & { __mediaRecorder?: MediaRecorder }).__mediaRecorder;
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    set({ isListening: false });
  },

  addToRecentSearches: (query: string) => {
    const { recentSearches } = get();
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return;

    const filtered = recentSearches.filter(
      (s) => s.toLowerCase() !== normalizedQuery
    );
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);

    set({ recentSearches: updated });
    if (typeof window !== 'undefined') {
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }
  },

  // Alias for addToRecentSearches
  addRecentSearch: (query: string) => {
    get().addToRecentSearches(query);
  },

  removeRecentSearch: (query: string) => {
    const { recentSearches } = get();
    const updated = recentSearches.filter(
      (s) => s.toLowerCase() !== query.toLowerCase()
    );
    set({ recentSearches: updated });
    if (typeof window !== 'undefined') {
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('recentSearches');
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      query: '',
      results: [],
      total: 0,
      page: 1,
      totalPages: 0,
      facets: [],
      suggestions: [],
      isLoading: false,
      error: null,
      filters: {},
      sortBy: 'relevance',
      visualSearchImage: null,
      visualSearchResults: [],
      isVisualSearching: false,
      isListening: false,
      voiceTranscript: '',
    }),
}));

// Selectors
export const selectHasActiveFilters = (state: SearchState) =>
  Object.keys(state.filters).length > 0;

export const selectActiveFilterCount = (state: SearchState) =>
  Object.values(state.filters).reduce((sum, values) => sum + values.length, 0);
