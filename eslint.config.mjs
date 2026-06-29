// Flat config (ESLint 9+). Replaces the legacy .eslintrc.json; `next lint` was
// removed in Next 16, so `pnpm lint` now runs the ESLint CLI directly.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "vendor/**", "public/**", "graphics/**"],
  },
  // Patch rules in-place on the config object that registers their plugins, so the
  // plugins stay in scope (flat config requires the plugin in the same object as the rule).
  //
  // The newer react-hooks plugin (React Compiler-aware) adds rules that flag this codebase's
  // intentional, documented React-18-era patterns — a ref synced to the latest value during
  // render (radial.tsx / pdf.tsx) and manual memoization via stable empty-dep callbacks.
  // We turn those specific rules off rather than refactor working, deliberate code; the
  // classic rules-of-hooks and exhaustive-deps stay on.
  ...nextCoreWebVitals.map((c) => {
    if (!c.rules) return c;
    const rules = { ...c.rules };
    let changed = false;
    if ("react/no-unescaped-entities" in rules) {
      // Allow apostrophes/quotes in prose; still forbid bare > and } (prior override).
      rules["react/no-unescaped-entities"] = ["error", { forbid: [">", "}"] }];
      changed = true;
    }
    for (const r of ["react-hooks/refs", "react-hooks/preserve-manual-memoization"]) {
      if (r in rules) {
        rules[r] = "off";
        changed = true;
      }
    }
    return changed ? { ...c, rules } : c;
  }),
];

export default eslintConfig;
