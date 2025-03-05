import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ApiKey {
  exchange: string;
  key: string;
  secret: string;
}

interface UserState {
  apiKeys: ApiKey[];
  preferences: {
    defaultExchange: string;
    defaultPair: string;
    chartTimeframe: string;
  };
}

const initialState: UserState = {
  apiKeys: [],
  preferences: {
    defaultExchange: 'binance',
    defaultPair: 'BTC/USD',
    chartTimeframe: '1h',
  },
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    addApiKey: (state, action: PayloadAction<ApiKey>) => {
      // Remove existing key for the same exchange if it exists
      state.apiKeys = state.apiKeys.filter(key => key.exchange !== action.payload.exchange);
      state.apiKeys.push(action.payload);
    },
    removeApiKey: (state, action: PayloadAction<string>) => {
      state.apiKeys = state.apiKeys.filter(key => key.exchange !== action.payload);
    },
    updatePreferences: (state, action: PayloadAction<Partial<UserState['preferences']>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
  },
});

export const { addApiKey, removeApiKey, updatePreferences } = userSlice.actions;

export default userSlice.reducer; 