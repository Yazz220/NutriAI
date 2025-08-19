declare global {
  // Allow `testID` prop on JSX intrinsic elements used in tests
  // and allow any intrinsic element names from test files that use
  // web-like elements (div, button) when running react-native tests.
  namespace JSX {
    interface IntrinsicAttributes {
      testID?: string;
    }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
