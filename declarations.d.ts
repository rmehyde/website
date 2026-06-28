// Ambient module declarations for non-code imports.

// Mustache templates are imported as raw source strings at build time via webpack's
// `asset/source` loader (see next.config.js). This only gives tsc the type; webpack
// supplies the actual content.
declare module '*.mustache' {
  const content: string;
  export default content;
}
