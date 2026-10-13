const test = require('node:test'),
  assert = require('node:assert/strict');
const { validate } = require('./check_html.cjs');
test('early named script rejects invalid syntax', () =>
  assert.throws(() => validate('<script id="appCode">const = ;</script>'), /appCode/));
test('unnamed classic script rejects invalid syntax', () =>
  assert.throws(() => validate('<script>const = ;</script>'), /unnamed-script-0/));
test('malformed non-seed JSON rejects parsing', () =>
  assert.throws(
    () => validate('<script type="application/json" id="bookArchive">{"page": }</script>'),
    /bookArchive/,
  ));
test('valid comment edit and all script types parse without execution', () => {
  const html =
    '<script id="appCode">throw new Error("must never execute"); // authorized comment\n</script>' +
    '<script>const valid = 2;</script>' +
    '<script type="application/json" id="bookArchive">{"page":"exact legal text"}</script>' +
    '<script type="application/octet-stream" id="sprite">not JavaScript</script>';
  assert.deepEqual(validate(html), { classic: 2, module: 0, json: 1, nonExecutable: 1 });
});
