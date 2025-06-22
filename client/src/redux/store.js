import { configureStore } from '@reduxjs/toolkit'
import userReducer from './userSlice'
import videoCallReducer from './slices/videoCallSlice'

export const store = configureStore({
  reducer: {
    user: userReducer,
    videoCall: videoCallReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['user/setSocketConnection'],
        // Ignore these paths in the state
        ignoredPaths: ['user.socketConnection'],
      },
    }),
})