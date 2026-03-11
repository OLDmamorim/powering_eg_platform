// Stub for mermaid - diagram rendering not needed in this app
const mermaid = {
  initialize: () => {},
  init: () => Promise.resolve(),
  run: () => Promise.resolve(),
  render: () => Promise.resolve({ svg: '<svg></svg>' }),
  parse: () => Promise.resolve(true),
  contentLoaded: () => {},
  mermaidAPI: {
    initialize: () => {},
    render: () => Promise.resolve({ svg: '<svg></svg>' }),
  },
};
export default mermaid;
export type MermaidConfig = Record<string, unknown>;
