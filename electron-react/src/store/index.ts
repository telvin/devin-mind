import { configureStore } from '@reduxjs/toolkit'
import tabsReducer from './tabsSlice'

export const store = configureStore({
  reducer: {
    tabs: tabsReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['tabs/addResult', 'tabs/addProgressLog'],
        ignoredPaths: ['tabs.tabs']
      }
    })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch