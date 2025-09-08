import 'react-native-gesture-handler/jestSetup';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {}
    }
  }
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(),
  openURL: jest.fn(),
}));

// Silence the warning: Animated: `useNativeDriver` is not supported
// Guard for RN versions where this internal path may change
try {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch (e) {
  // no-op if module path changed in current RN version
}

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock create-context-hook
jest.mock('@nkzw/create-context-hook', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (hookFn) => {
      const Context = React.createContext(null);
      const Provider = ({ children, ...props }) => {
        const value = hookFn(...Object.values(props));
        return React.createElement(Context.Provider, { value }, children);
      };
      const useHook = () => {
        const context = React.useContext(Context);
        if (!context) {
          throw new Error('Hook must be used within Provider');
        }
        return context;
      };
      return [Provider, useHook];
    },
  };
});