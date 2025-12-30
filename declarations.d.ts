declare module "*.svg" {
  import React from "react";
  import { SvgProps } from "react-native-svg";
  const content: React.FC<SvgProps>;
  export default content;
}

declare module 'firebase/auth/react-native' {
  import type { Persistence } from 'firebase/auth';
  export function getReactNativePersistence(storage: unknown): Persistence;
}