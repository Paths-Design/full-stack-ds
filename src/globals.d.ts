declare module "*.css" {}
declare module "virtual:fsds/analytical-composite" {
  const witnesses: import("../scripts/analytical-composite-preview").CompositeWitness[];
  export default witnesses;
}
declare module "*.svg" {
  const src: string;
  export default src;
}
declare module "*.webp" {
  const src: string;
  export default src;
}
declare module "*.jpg" {
  const src: string;
  export default src;
}
declare module "*.png" {
  const src: string;
  export default src;
}

// Vite-specific `import.meta` surface used by the app (the root tsconfig does
// not pull in `vite/client` because it also spans non-Vite packages). Only the
// members the app actually uses are declared.
interface ImportMeta {
  readonly env: Record<string, string | boolean | undefined> & {
    readonly DEV: boolean;
    readonly PROD: boolean;
  };
  glob<T = unknown>(
    pattern: string,
    options: {
      eager: true;
      query?: string;
      import?: string;
    },
  ): Record<string, T>;
}
