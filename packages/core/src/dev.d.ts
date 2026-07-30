declare global {
  /**
   * - **During build:** Indicates whether the library is being built for development
   * - **During tests:** Always `undefined` for now
   */
  var __DEV__: boolean;
}

export {};
