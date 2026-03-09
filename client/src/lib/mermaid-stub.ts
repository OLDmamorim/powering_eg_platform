// Lightweight mermaid stub to avoid bundling 2.2MB of diagram rendering
// Mermaid diagrams will show as code blocks instead

const mermaid = {
  initialize: () => {},
  init: () => Promise.resolve(),
  render: async (id: string, text: string) => {
    return { svg: `<pre style="background:#f6f8fa;padding:1rem;border-radius:0.5rem;overflow-x:auto"><code>${text}</code></pre>` };
  },
  parse: async () => true,
  contentLoaded: () => {},
  mermaidAPI: {
    initialize: () => {},
    render: async (id: string, text: string) => {
      return { svg: `<pre><code>${text}</code></pre>` };
    },
  },
};

export default mermaid;
export type MermaidConfig = Record<string, any>;
