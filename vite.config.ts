import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

const isProd = process.env.NODE_ENV === "production";

// Only include jsxLocPlugin in development (it adds data-loc attributes that bloat the bundle)
const plugins = [
  react(),
  tailwindcss(),
  ...(!isProd ? [jsxLocPlugin()] : []),
  vitePluginManusRuntime(),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      // Replace heavy packages with lightweight stubs to reduce bundle size
      "shiki/engine/javascript": path.resolve(import.meta.dirname, "client", "src", "lib", "shiki-engine-stub.ts"),
      "shiki": path.resolve(import.meta.dirname, "client", "src", "lib", "shiki-stub.ts"),
      "mermaid": path.resolve(import.meta.dirname, "client", "src", "lib", "mermaid-stub.ts"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split heavy dependencies into separate chunks
          if (id.includes('node_modules/mermaid') || id.includes('node_modules/dagre') || id.includes('node_modules/cytoscape') || id.includes('node_modules/elkjs')) {
            return 'vendor-mermaid';
          }
          if (id.includes('node_modules/shiki') || id.includes('node_modules/@shikijs')) {
            return 'vendor-shiki';
          }
          if (id.includes('node_modules/katex') || id.includes('node_modules/rehype-katex') || id.includes('node_modules/remark-math')) {
            return 'vendor-katex';
          }
          if (id.includes('node_modules/html2canvas')) {
            return 'vendor-html2canvas';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/exceljs') || id.includes('node_modules/xlsx')) {
            return 'vendor-excel';
          }
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/pdfkit') || id.includes('node_modules/pdf-lib')) {
            return 'vendor-pdf';
          }
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }
          if (id.includes('node_modules/@tiptap') || id.includes('node_modules/prosemirror') || id.includes('node_modules/@tiptap/pm')) {
            return 'vendor-tiptap';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer';
          }
          if (id.includes('node_modules/chart.js')) {
            return 'vendor-chartjs';
          }
          // Split streamdown and its dependencies
          if (id.includes('node_modules/streamdown') || id.includes('node_modules/react-markdown') || id.includes('node_modules/remark-') || id.includes('node_modules/rehype-') || id.includes('node_modules/unified') || id.includes('node_modules/mdast-') || id.includes('node_modules/hast-') || id.includes('node_modules/micromark')) {
            return 'vendor-markdown';
          }
          // Split lucide icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
          // Split react and react-dom
          if (id.includes('node_modules/react-dom')) {
            return 'vendor-react-dom';
          }
          if (id.includes('node_modules/react/') && !id.includes('react-dom')) {
            return 'vendor-react';
          }
          // Split tanstack/react-query
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-tanstack';
          }
          // Split trpc
          if (id.includes('node_modules/@trpc')) {
            return 'vendor-trpc';
          }
          // Split date-fns
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-datefns';
          }
        },
      },
    },
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
