import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig, Plugin } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// Plugin to stub heavy dependencies and reduce bundle size
function stubHeavyDeps(): Plugin {
  const stubDir = path.resolve(import.meta.dirname, "client/src/stubs");
  const stubMap: Record<string, string> = {
    "shiki": path.join(stubDir, "shiki.ts"),
    "mermaid": path.join(stubDir, "mermaid.ts"),
    "katex": path.join(stubDir, "katex.ts"),
    "rehype-katex": path.join(stubDir, "rehype-katex.ts"),
    "remark-math": path.join(stubDir, "remark-math.ts"),
  };

  return {
    name: "stub-heavy-deps",
    enforce: "pre",
    resolveId(source) {
      // Match exact or subpath imports (e.g. "shiki" or "shiki/engine/javascript")
      for (const [pkg, stubPath] of Object.entries(stubMap)) {
        if (source === pkg || source.startsWith(pkg + "/")) {
          return stubPath;
        }
      }
      return null;
    },
  };
}

const plugins = [stubHeavyDeps(), react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
