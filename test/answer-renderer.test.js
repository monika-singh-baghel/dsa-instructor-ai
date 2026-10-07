const test = require('node:test');
const assert = require('node:assert/strict');
const { renderMarkdownish } = require('../src/answer-renderer');

test('escapes HTML before rendering markdown', () => {
  const html = renderMarkdownish('<script>alert(1)</script> **bold**');
  assert.equal(html.includes('<script>'), false);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /<strong>bold<\/strong>/);
});

test('renders code blocks without exposing HTML characters', () => {
  const html = renderMarkdownish('```\n<a href="/">x</a>\n```');
  assert.match(html, /&lt;a href=&quot;\/&quot;&gt;x&lt;\/a&gt;/);
});
