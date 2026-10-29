/* Paragraph layout must preserve the complete wording, including legal citations. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const acorn = require('acorn');
const source = fs.readFileSync('src/runtime/semesterCode.js', 'utf8');
const ast = acorn.parse(source, { ecmaVersion: 'latest' });
const fn = ast.body.find((n) => n.type === 'FunctionDeclaration' && n.id.name === 'r6ReadingChunks');
assert.ok(fn, 'Reading paragraph formatter missing');
const context = { Intl };
vm.runInNewContext(source.slice(fn.start, fn.end), context);
const html = fs.readFileSync('work/build/DKLA-v2.8.html', 'utf8');
const blocks = Object.fromEntries(
  [...html.matchAll(/<script[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => [m[1], m[2]]),
);
const data = JSON.parse(blocks.dklaR19Data),
  full = JSON.parse(blocks.dklaR19Full);
const passages = [
  ...Object.values(data.sections).flatMap((s) => [s.rule, ...Object.values(s.sections)]),
  ...Object.values(full),
];
const normalize = (s) => s.replace(/\s+/g, ' ').trim();
let split = 0;
for (const passage of passages) {
  const parts = context.r6ReadingChunks(passage);
  assert.equal(
    normalize(parts.join(' ')),
    normalize(passage),
    'Paragraph layout deleted or reordered source wording',
  );
  if (parts.length > passage.split(/\n\s*\n/).length) split++;
}
assert.ok(split > 100, 'Long passages are still presented as unbroken blocks');
console.log(
  JSON.stringify({
    passagesPreserved: passages.length,
    longPassagesReflowed: split,
    wording: 'unchanged by paragraph layout',
  }),
);
