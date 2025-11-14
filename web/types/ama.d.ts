// AMA Analytics Global Type Declarations
export {};

declare global {
  interface Window {
    AMA?: {
      preAuthMark: () => void;
      afterLoginIdentify: (user: any, props?: Record<string, any>) => void;
      onLogoutCleanup: (userId: string) => void;
    };
  }
}
