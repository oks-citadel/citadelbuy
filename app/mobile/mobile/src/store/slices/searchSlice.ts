import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiService from '../../services/api';

interface SearchState {
  query: string;
  results: any[];
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SearchState = {
  query: '',
  results: [],
  suggestions: [],
  isLoading: false,
  error: null,
};

export const searchProducts = createAsyncThunk(
  'search/searchProducts',
  async (query: string) => {
    const response = await apiService.get('/search', { params: { q: query } });
    return response;
  }
);

export const visualSearch = createAsyncThunk(
  'search/visualSearch',
  async (imageUri: string) => {
    const response = await apiService.uploadImage(imageUri, '/ai/visual-search');
    return response;
  }
);

export const conversationalSearch = createAsyncThunk(
  'search/conversationalSearch',
  async (query: string) => {
    const response = await apiService.post('/ai/conversational', { query });
    return response;
  }
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
    },
    clearSearch: (state) => {
      state.query = '';
      state.results = [];
      state.suggestions = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.results = action.payload.results;
        state.suggestions = action.payload.suggestions || [];
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Search failed';
      })
      .addCase(visualSearch.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(visualSearch.fulfilled, (state, action) => {
        state.isLoading = false;
        state.results = action.payload.results;
      })
      .addCase(visualSearch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Visual search failed';
      })
      .addCase(conversationalSearch.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(conversationalSearch.fulfilled, (state, action) => {
        state.isLoading = false;
        state.results = action.payload.results;
      })
      .addCase(conversationalSearch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Conversational search failed';
      });
  },
});

export const { setQuery, clearSearch } = searchSlice.actions;
export default searchSlice.reducer;
