/* Parse every inline executable and JSON block without running app code. */
const fs = require('node:fs'),
  vm = require('node:vm');
function attribute(attrs, name) {
  const match = attrs.match(new RegExp('\\b' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  return match?.slice(1).find((value) => value !== undefined);
}
function validate(html) {
  const counts = { classic: 0, module: 0, json: 0, nonExecutable: 0 };
  let index = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const type = (attribute(match[1], 'type') || '').trim().toLowerCase();
    const name = attribute(match[1], 'id') || `unnamed-script-${index}`;
    index++;
    try {
      if (type === 'application/json') {
        JSON.parse(match[2]);
        counts.json++;
      } else if (type === 'module') {
        new vm.SourceTextModule(match[2], { identifier: name });
        counts.module++;
      } else if (
        [
          '',
          'text/javascript',
          'application/javascript',
          'text/ecmascript',
          'application/ecmascript',
        ].includes(type)
      ) {
        new vm.Script(match[2], { filename: name });
        counts.classic++;
      } else counts.nonExecutable++;
    } catch (error) {
      throw Error(`${name}: ${error.message}`);
    }
  }
  return counts;
}
module.exports = { validate };
if (require.main === module) {
  try {
    console.log(JSON.stringify(validate(fs.readFileSync(process.argv[2], 'utf8'))));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
