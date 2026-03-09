// Lightweight shiki stub to avoid bundling 9MB of language grammars
// Code blocks will render as plain text with basic styling

export const bundledLanguages = {};

export async function createHighlighter() {
  return {
    codeToHtml(code: string, options: any) {
      const escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<pre class="shiki" style="background-color:#f6f8fa"><code>${escaped}</code></pre>`;
    },
    getLoadedLanguages() {
      return [];
    },
    loadLanguage() {
      return Promise.resolve();
    },
  };
}

export function createJavaScriptRegexEngine() {
  return {};
}
