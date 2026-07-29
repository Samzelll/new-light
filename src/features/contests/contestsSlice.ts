import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { FeedListingStatus, Visibility } from './types';

interface FiltersState {
  visibility: 'all' | Visibility;
  feedStatus: 'all' | FeedListingStatus;
  sortBy: 'recent' | 'popular';
  query: string;
}

interface ContestsState {
  filters: FiltersState;
}

const initialState: ContestsState = {
  filters: {
    visibility: 'all',
    feedStatus: 'all',
    sortBy: 'recent',
    query: '',
  },
};

const contestsSlice = createSlice({
  name: 'contests',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => {
      state.filters.query = action.payload;
    },
    setVisibility: (state, action: PayloadAction<FiltersState['visibility']>) => {
      state.filters.visibility = action.payload;
    },
    setFeedStatus: (state, action: PayloadAction<FiltersState['feedStatus']>) => {
      state.filters.feedStatus = action.payload;
    },
    setSortBy: (state, action: PayloadAction<FiltersState['sortBy']>) => {
      state.filters.sortBy = action.payload;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
});

export const { setQuery, setVisibility, setFeedStatus, setSortBy, resetFilters } = contestsSlice.actions;
export default contestsSlice.reducer;
