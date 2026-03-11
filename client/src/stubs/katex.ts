// Stub for katex - math rendering not needed in this app
const katex = {
  render: () => {},
  renderToString: (expr: string) => expr,
  __parse: () => ({}),
  ParseError: class ParseError extends Error {},
};
export default katex;
