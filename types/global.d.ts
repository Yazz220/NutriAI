declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

// Lightweight type shim for NetInfo to avoid build-time type errors in tests
declare module '@react-native-community/netinfo' {
  const NetInfo: {
    addEventListener: (listener: (state: any) => void) => { remove: () => void } | void;
    fetch: () => Promise<{ isConnected?: boolean | null } & Record<string, any>>;
  };
  export default NetInfo;
}
