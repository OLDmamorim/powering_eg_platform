// Stub for shiki - syntax highlighting not needed in this app
export const createHighlighter = () => Promise.resolve({
  codeToHtml: (code: string) => `<pre><code>${code}</code></pre>`,
  getLoadedLanguages: () => [],
  getLoadedThemes: () => [],
});
export const getHighlighter = createHighlighter;
export const bundledLanguages = {};
export const bundledThemes = {};
export const createJavaScriptRegExpEngine = () => ({});
export const createJavaScriptRegexEngine = () => ({});
export default { createHighlighter, getHighlighter, bundledLanguages, bundledThemes, createJavaScriptRegExpEngine, createJavaScriptRegexEngine };
