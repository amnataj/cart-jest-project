export {};

declare global {
  namespace jest {
    interface Matchers<R> {
      /** Passes when the value is a structurally valid, arithmetically consistent Order. */
      toBeValidOrder(): R;
    }
  }
}
