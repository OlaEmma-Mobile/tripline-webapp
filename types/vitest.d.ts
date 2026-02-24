declare module 'vitest' {
  export const describe: (name: string, fn: () => void) => void;
  export const it: (name: string, fn: () => void | Promise<void>) => void;
  export const expect: (value: unknown) => {
    toBe: (expected: unknown) => void;
    toBeTruthy: () => void;
    toMatchObject: (expected: Record<string, unknown>) => void;
    rejects: {
      toMatchObject: (expected: Record<string, unknown>) => Promise<void>;
    };
  };
}
