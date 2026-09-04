// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

jest.mock('@/lib/supabase', () => {
  const chainable = () => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  });

  return {
    supabase: {
      schema: jest.fn(() => ({
        from: jest.fn(chainable),
      })),
      from: jest.fn(chainable),
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      },
    },
  };
});

// Mock react-native-worklets native module (required by Reanimated 4 / Skia)
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));

// Mock @shopify/react-native-skia native module (JSI bindings unavailable in Jest)
jest.mock('@shopify/react-native-skia', () => require('@shopify/react-native-skia/lib/module/mock'));

// Sentry's native bridge is unavailable in Jest. Keep the public integration
// surface intact so error-boundary and analytics tests exercise app behavior.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: (Component) => Component,
  captureException: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
  reactNavigationIntegration: () => ({ registerNavigationContainer: jest.fn() }),
}));

// Silence non-critical console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Require cycle')) return;
  originalWarn(...args);
};
