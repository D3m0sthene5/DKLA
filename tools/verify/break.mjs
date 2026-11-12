/* Proof that the checks have teeth: `pnpm verify:teeth`.

   Breaks one thing at a time (a case record, a brief, working code, a layout
   position, the saved-work path, ...), runs the whole verification pass, and
   requires it to FAIL each time. Every file is put back exactly as it was,
   and a final clean pass must succeed. Takes about twelve minutes.

   Run this after changing how verification works (what runs, in what order,
   what is cached or skipped). A change that makes the pass faster must still
   catch every one of these.

     node tools/verify/break.mjs          all breakages
     node tools/verify/break.mjs 4,6      only those numbers (see the list printed) */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { root } from '../runtime.mjs';
const at = (file) => path.join(root, file);
const edit = (file, from, to) => {
  const text = fs.readFileSync(at(file), 'utf8');
  if (!text.includes(from))
    throw Error(`Cannot break ${file}: "${from}" is no longer there. Update tools/verify/break.mjs.`);
  fs.writeFileSync(at(file), text.replace(from, to));
};
const append = (file, text) => fs.appendFileSync(at(file), text);
const prepend = (file, text) => fs.writeFileSync(at(file), text + fs.readFileSync(at(file), 'utf8'));
// Change one lower-case letter near the middle of a file.
const flip = (file) => {
  const bytes = fs.readFileSync(at(file));
  let i = bytes.length >> 1;
  while (bytes[i] < 97 || bytes[i] > 121) i++;
  bytes[i]++;
  fs.writeFileSync(at(file), bytes);
};
const first = (folder, extension) => {
  const walk = (dir) => {
    for (const entry of fs
      .readdirSync(at(dir), { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const child = dir + '/' + entry.name;
      if (entry.isDirectory()) {
        const found = walk(child);
        if (found) return found;
      } else if (child.endsWith(extension) && fs.statSync(at(child)).size > 400) return child;
    }
  };
  return walk(folder);
};
const record = first('src/data/seedData', '.json'),
  brief = first('tools/r19/data/briefs', '.md'),
  narrative = first('tools/cold-call/narratives', '.json');
const TYPOGRAPHY = 'src/features/v26/typography.js',
  STRICT = "'use strict';";

const breakages = [
  [
    'search results stop saying where they matched',
    'src/runtime/dklaR13Search.js',
    () => edit('src/runtime/dklaR13Search.js', '    fillVisible();\n', '\n'),
  ],
  [
    'search: a case found only by its one-line rule is no longer found',
    'src/runtime/dklaR13Search.js',
    () =>
      edit(
        'src/runtime/dklaR13Search.js',
        "if (plain && n.summary) add('rule', 'the one-line rule', n.summary, 'elsewhere');",
        'void plain;',
      ),
  ],
  [
    'Cold Call definitions: a click on the card closes it',
    'src/features/cold-call/glossary.js',
    () => edit('src/features/cold-call/glossary.js', '    card.tabIndex = -1;\n', '\n'),
  ],
  [
    'SCOTUS History: the Erie voting correction no longer finds its case',
    'src/runtime/dklaR16HistoryCode.js',
    () =>
      edit(
        'src/runtime/dklaR16HistoryCode.js',
        "[\n      'cp-erie-decision',\n      'pierce-butler',",
        "[\n      'cp-erie',\n      'pierce-butler',",
      ),
  ],
  [
    'Ask Dottie follow-ups: earlier turns are no longer sent',
    'src/features/ask/ask.js',
    () => edit('src/features/ask/ask.js', 'history: turns.length', 'history: false'),
  ],
  [
    'Ask Dottie saved answers: "Save answer" stops keeping anything',
    'src/features/ask/saved.js',
    () =>
      edit(
        'src/features/ask/saved.js',
        'if (list.length) localStorage.setItem(KEY, JSON.stringify({ version: 1, answers: list }));',
        'if (list.length) void list;',
      ),
  ],
  [
    'New York clock shows the wrong time zone',
    'src/features/clock/clock.js',
    () =>
      edit(
        'src/features/clock/clock.js',
        "timeZone: 'America/New_York',\n    hour: '2-digit'",
        "timeZone: 'UTC',\n    hour: '2-digit'",
      ),
  ],
  [
    'New York clock date flaps show the month before the weekday',
    'src/features/clock/clock.js',
    () =>
      edit(
        'src/features/clock/clock.js',
        'part.weekday.slice(0, 3) + part.month.slice(0, 3)',
        'part.month.slice(0, 3) + part.weekday.slice(0, 3)',
      ),
  ],
  [
    'New York clock hourly riffle spins on instead of landing',
    'src/features/clock/clock.js',
    () => edit('src/features/clock/clock.js', 'step < STEPS; step++', 'step < STEPS * 40; step++'),
  ],
  [
    'New York clock font: the embedded JetBrains Mono is altered',
    'src/features/clock/clock-font.css',
    () => flip('src/features/clock/clock-font.css'),
  ],
  [
    'Home splash text: no longer tilted on the logo corner',
    'src/features/splash/splash.js',
    () => edit('src/features/splash/splash.js', 'const TILT = -18;', 'const TILT = 0;'),
  ],
  [
    'Ask DKLA mascot: Dottie stops carrying one joey per cited source',
    'src/features/ask/ask.js',
    () => edit('src/features/ask/ask.js', "setDottie('answer', cited.size)", "setDottie('answer', 1)"),
  ],
  [
    'Ask DKLA web citations lose their external-link safeguards',
    'src/features/ask/ask.js',
    () => edit('src/features/ask/ask.js', "link.rel = 'noopener noreferrer';", "link.rel = '';"),
  ],
  [
    'Ask DKLA citations close the dialog without opening the source',
    'src/features/ask/ask.js',
    () => edit('src/features/ask/ask.js', 'openers[source.type]?.(source.id);', 'void source;'),
  ],
  [
    'Ask Dottie routing goes back to the Atlas first whenever it finds any excerpt',
    'lib/ask/web.js',
    () =>
      edit(
        'lib/ask/web.js',
        'const fit = sources.length ? template(question, { sources, named, node, scoped, followUp }) : null;',
        "const fit = sources.length ? { reason: 'Atlas first', texts: [], subjects: [] } : null;",
      ),
  ],
  [
    'Ask Dottie trusts the model when it calls a substitute Atlas answer exact',
    'lib/ask/answer.js',
    () =>
      edit(
        'lib/ask/answer.js',
        "needsWeb: search === 'not-needed' && (output.needsWeb || !exact)",
        "needsWeb: search === 'not-needed' && output.needsWeb",
      ),
  ],
  [
    'Ask Dottie research answers keep a substitute ("you are probably asking about") paragraph',
    'lib/ask/web.js',
    () => edit('lib/ask/web.js', 'if (substitute(prose)) continue;', 'void substitute;'),
  ],
  [
    'Ask Dottie routing: one party word that names two cases ("Gustafson") counts as naming one',
    'lib/ask/retrieve.js',
    () => edit('lib/ask/retrieve.js', '(party && unambiguous(words))', 'party'),
  ],
  [
    'Ask Dottie timeouts: after the deadline it asks the Atlas again and fails with an error',
    'api/ask.js',
    () => {
      edit('api/ask.js', '(path.web || signal.aborted)', 'path.web');
      edit(
        'api/ask.js',
        'if (failed(error) || error instanceof InvalidCitations) return nothing();',
        'if (error instanceof InvalidCitations) return nothing();',
      );
    },
  ],
  [
    'Ask Dottie warm-up is treated as a question',
    'api/ask.js',
    () => edit('api/ask.js', 'payload?.warm === true &&', 'payload?.warm === 1 &&'),
  ],
  [
    'Ask Dottie uses a retrieval index built from another corpus',
    'lib/ask/retrieve.js',
    () => edit('lib/ask/retrieve.js', 'if (header.corpus !== corpus) return null;', 'void corpus;'),
  ],
  [
    'Ask Dottie spinner: the old research poses come back instead of the spinner',
    'src/features/ask/ask.js',
    () => edit('src/features/ask/ask.js', "if (state === 'research' && dottie.spinner) {", 'if (false) {'),
  ],
  [
    'Ask Dottie spinner: real progress from the server no longer replaces the playful words',
    'src/features/ask/ask.js',
    () => edit('src/features/ask/ask.js', 'const text = steps[step?.step]?.(step);', "const text = '';"),
  ],
  [
    'Ask Dottie routing: a question that fits no Atlas template is answered from the Atlas alone',
    'lib/ask/web.js',
    () =>
      edit(
        'lib/ask/web.js',
        "return research('not an Atlas template', false);",
        "return { research: false, reason: 'no template', web: false };",
      ),
  ],
  [
    'Ask Dottie routing: nothing found in the Atlas gets an empty answer instead of research',
    'lib/ask/web.js',
    () =>
      edit(
        'lib/ask/web.js',
        "if (!sources.length) return research('nothing in the Atlas');",
        "if (!sources.length) return atlas('no match');",
      ),
  ],
  [
    'Ask Dottie routing: a misspelled "overuled" no longer counts as asking about later history',
    'lib/ask/web.js',
    () => edit('lib/ask/web.js', '|over+[eu]l+\\w*|', '|overrul\\w*|'),
  ],
  [
    'Ask Dottie routing: "§ 1983" and "12(b)(6)" no longer name their rule or statute',
    'lib/ask/retrieve.js',
    () => edit('lib/ask/retrieve.js', "if (keys.length) return entry('cite', [], keys);", 'void keys;'),
  ],
  [
    'Ask Dottie routing: "filibuster" and "campaign" count as events again',
    'lib/ask/web.js',
    () =>
      edit(
        'lib/ask/web.js',
        '|resign\\\\w*|',
        '|resign\\\\w*|filibuster\\\\w*|campaign\\\\w*|impeach\\\\w*|',
      ),
  ],
  [
    'Ask Dottie research answers keep a web-cited paragraph of the wrong kind (a case page for "what statute")',
    'lib/ask/answer.js',
    () =>
      edit(
        'lib/ask/answer.js',
        'const unknown = (source) => web(source) && !webCase(source) && !webStatute(source);',
        'const unknown = web;',
      ),
  ],
  [
    'Ask Dottie misses the hedge "you might mean"',
    'lib/ask/answer.js',
    () => edit('lib/ask/answer.js', 'you (?:may|might|probably|could|likely) (?:mean|want|be after)|', ''),
  ],
  [
    'Ask Dottie research demands a web citation for a doctrine question too',
    'api/ask.js',
    () => edit('api/ask.js', 'web: path.web,', 'web: true,'),
  ],
  [
    'Ask Dottie keeps paying OpenAI after the person cancels or closes the tab',
    'api/ask.js',
    () => edit('api/ask.js', 'if (!res.writableEnded) gone.abort();', 'void gone;'),
  ],
  [
    'Ask Dottie network errors fail the question with an error instead of the honest no-answer',
    'api/ask.js',
    () =>
      edit(
        'api/ask.js',
        '  error instanceof SyntaxError ||\n  (error instanceof TypeError &&',
        '  (false &&',
      ),
  ],
  [
    'Ask Dottie streaming: an answer line goes out before the citation check',
    'api/ask.js',
    () =>
      edit(
        'api/ask.js',
        'if (stream) line({ progress: step });',
        "if (stream) line(step.step === 'checking' ? { answer: step } : { progress: step });",
      ),
  ],
  [
    'Ask Dottie warm-up needs the OpenAI key',
    'api/ask.js',
    () =>
      edit(
        'api/ask.js',
        'payload?.warm === true && Object.keys(payload).length === 1',
        'payload?.warm === true && Object.keys(payload).length === 1 && process.env.DKLA_OPENAI_API_KEY',
      ),
  ],
  [
    'Ask Dottie spinner: back to the small 44 px spinner',
    'src/features/ask/ask.css',
    () => edit('src/features/ask/ask.css', 'width: 56px;\n  height: 56px;', 'width: 44px;\n  height: 44px;'),
  ],
  [
    'Ask Dottie research route makes an Atlas-only draft first',
    'api/ask.js',
    () => edit('api/ask.js', 'if (!path.research) {', 'if (true) {'),
  ],
  [
    'Ask Dottie routing: a question with one more word than an Atlas title stays on the Atlas',
    'lib/ask/web.js',
    () => edit('lib/ask/web.js', 'headwordOf(bare(title)) === key', 'key.includes(headwordOf(bare(title)))'),
  ],
  [
    'Ask Dottie routing: in a follow-up, "it" names the open entry instead of the conversation',
    'lib/ask/web.js',
    () =>
      edit(
        'lib/ask/web.js',
        'if (followUp || !node || !scoped || others.length) return [];',
        'if (!node || !scoped || others.length) return [];',
      ),
  ],
  [
    'Ask Dottie routing: "Erie" is ambiguous again because of Kenford Co. v. County of Erie',
    'lib/ask/retrieve.js',
    () =>
      edit(
        'lib/ask/retrieve.js',
        'if (!namingWords(record.title).includes(phrase)) continue;',
        "if (!(' ' + terms(record.title).join(' ') + ' ').includes(phrase)) continue;",
      ),
  ],
  [
    'Ask Dottie citations: a bare "10(b)" names Rule 10 again',
    'lib/ask/retrieve.js',
    () => edit('lib/ask/retrieve.js', '(?=\\s*(?:motions?|dismiss\\w*|defen[cs]es?)\\b)/g', '/g'),
  ],
  [
    'Ask Dottie kind check: statute entries filed as "Rule" count as court rules again',
    'lib/ask/answer.js',
    () =>
      edit(
        'lib/ask/answer.js',
        "const rule = ({ id = '', title = '' }) =>",
        "const rule = ({ id = '', title = '', category }) =>\n  category === 'Rule' ||",
      ),
  ],
  [
    'Ask Dottie kind check: typo and "name the statute" questions no longer count as asking for a statute',
    'lib/ask/answer.js',
    () => {
      edit(
        'lib/ask/answer.js',
        "const asking = String.raw`(?:w+h?[ae]+h?t+|wht|whta|waht|wath|whi?ch|wich|whcih|wihch|whihc)(?:['’]?s)?`;",
        "const asking = String.raw`(?:wh?at|whi?ch|wich)(?:['’]?s)?`;",
      );
      edit(
        'lib/ask/answer.js',
        '|(?:name|identify)\\s+(?:of\\s+)?',
        '|(?:name\\s+(?:the|a|that))\\s+(?:of\\s+)?',
      );
    },
  ],
  [
    'Ask Dottie misses the hedge "assuming you mean"',
    'lib/ask/answer.js',
    () =>
      edit(
        'lib/ask/answer.js',
        '|(?:assuming|if|i think|likely|probably|presumably|perhaps|maybe)\\s+you\\s+mean\\w*',
        '',
      ),
  ],
  [
    'Ask Dottie kind check: a supremecourt.gov opinion PDF is a page of no known kind again',
    'lib/ask/answer.js',
    () => edit('lib/ask/answer.js', '|| caseUrl.test(url);', ';'),
  ],
  [
    'Ask Dottie kind check: one wrong-kind paragraph no longer drops alone (the whole answer is judged)',
    'lib/ask/answer.js',
    () =>
      edit(
        'lib/ask/answer.js',
        'wrongKind(question, cited(paragraph), subjects)',
        'wrongKind(question, output.paragraphs.flatMap(cited), subjects)',
      ),
  ],
  [
    'Ask Dottie research that finds nothing gives an empty answer even when the Atlas could answer',
    'lib/ask/web.js',
    () =>
      edit(
        'lib/ask/web.js',
        "if (!answer.paragraphs.length) throw new NoResearchAnswer('no usable research answer');",
        '',
      ),
  ],
  [
    'Ask Dottie cancel during a cold start: the close listener is attached too late again',
    'api/ask.js',
    () => {
      edit(
        'api/ask.js',
        "    res.on?.('close', () => {\n      if (!res.writableEnded) gone.abort();\n    });\n    if (closed()) gone.abort();\n",
        '',
      );
      edit(
        'api/ask.js',
        '      const signal = AbortSignal.any([AbortSignal.timeout(26_000), gone.signal]);',
        "      res.on?.('close', () => {\n        if (!res.writableEnded) gone.abort();\n      });\n      const signal = AbortSignal.any([AbortSignal.timeout(26_000), gone.signal]);",
      );
    },
  ],
  [
    'Ask Dottie: a programming error in research becomes the honest empty answer instead of an error',
    'api/ask.js',
    () =>
      edit(
        'api/ask.js',
        '/^(?:fetch failed|terminated)$|Body is unusable/',
        '/fetch failed|terminated|network|socket|body/i',
      ),
  ],
  [
    'Ask Dottie answer library: follow-ups are looked up and stored too',
    'api/ask.js',
    () =>
      edit(
        'api/ask.js',
        "const shelf = earlier?.length || !path.stable ? null : (node ?? '');",
        "const shelf = !path.stable ? null : (node ?? '');",
      ),
  ],
  [
    'Ask Dottie answer library: an Atlas fallback after a failed search is stored',
    'api/ask.js',
    () => edit('api/ask.js', '          !fallback &&\n', ''),
  ],
  [
    'Ask Dottie on Vercel: a request whose body was read counts as a cancel again',
    'api/ask.js',
    () =>
      edit(
        'api/ask.js',
        '    if (closed()) gone.abort();',
        '    if (closed() || req.destroyed) gone.abort();',
      ),
  ],
  [
    'Ask Dottie kind check: the entry a template named is judged by its kind again ("statute of frauds")',
    'lib/ask/answer.js',
    () =>
      edit(
        'lib/ask/answer.js',
        "  if (subjects.length && cited.some(({ type, id }) => type !== 'web' && subjects.includes(id))) return false;",
        '',
      ),
  ],
  [
    'Ask Dottie kind check: a kind word inside a headword ("common law") counts as asking for it again',
    'lib/ask/answer.js',
    () =>
      edit(
        'lib/ask/answer.js',
        "const object = (question) => String(question).replace(headwords, ' ');",
        'const object = (question) => String(question);',
      ),
  ],
  [
    'Ask Dottie routing: web-only words are read inside a headword again ("binding precedent")',
    'lib/ask/web.js',
    () =>
      edit(
        'lib/ask/web.js',
        'const text = fit ? without(lookup, fit.texts) : lookup;',
        'const text = lookup;',
      ),
  ],
  [
    'Ask Dottie citations: a bare "section 230" names Restatement § 230 again',
    'lib/ask/retrieve.js',
    () =>
      edit(
        'lib/ask/retrieve.js',
        'const bareSection = (key) => !/^(?:rest|usc 5) /.test(key);',
        'const bareSection = () => true;',
      ),
  ],
  [
    'Ask Dottie answer library: answers about the present, later history or people are kept again',
    'api/ask.js',
    () =>
      edit(
        'api/ask.js',
        "const shelf = earlier?.length || !path.stable ? null : (node ?? '');",
        "const shelf = earlier?.length ? null : (node ?? '');",
      ),
  ],
  [
    'Ask Dottie routing: "who wrote it" with a statute entry open stays on the Atlas again',
    'lib/ask/web.js',
    () =>
      edit('lib/ask/web.js', "    if ((kind === 'case' || casePart.test(text)) && !isCase) return [];\n", ''),
  ],
  [
    'Ask Dottie misses a first-sentence disclaimer followed by a substitute',
    'lib/ask/answer.js',
    () => edit('lib/ask/answer.js', '  return unnamed.test(first);', '  return false;'),
  ],
  [
    'Ask Dottie misses the hedge "the nearest Atlas entry is"',
    'lib/ask/answer.js',
    () => edit('lib/ask/answer.js', '(?:closest|nearest)\\s+', 'closest\\s+'),
  ],
  [
    'Ask Dottie routing: "the United States" names Will v. United States again',
    'lib/ask/retrieve.js',
    () =>
      edit(
        'lib/ask/retrieve.js',
        '    if (isCase && words.every((word) => generic.has(word))) return;\n',
        '',
      ),
  ],
  [
    'Ask Dottie routing: "what is the Sierra Club" is answered from Sierra Club v. Morton again',
    'lib/ask/web.js',
    () =>
      edit('lib/ask/web.js', ' || !organisation.test(subject))) return cases;', ' || true)) return cases;'),
  ],
  [
    'Ask Dottie routing: "what is the meaning of X" researches again',
    'lib/ask/web.js',
    () =>
      edit(
        'lib/ask/web.js',
        'const DEFINE = String.raw`(?:${WHATS}\\s+(?:the\\s+)?(?:meaning|definition|defintion|defenition)\\s+of|',
        'const DEFINE = String.raw`(?:',
      ),
  ],
  [
    'Ask Dottie citations: a bare "12(b)(6)" names nothing again',
    'lib/ask/retrieve.js',
    () =>
      edit(
        'lib/ask/retrieve.js',
        "  take(/(?<![\\w§.-])(12)\\(b\\)(?:\\(\\d\\))?(?![\\w(-])/g, (rule) => keys.add('frcp ' + rule));\n",
        '',
      ),
  ],
  [
    'Ask Dottie routing: "compare this case and Iqbal" researches again',
    'lib/ask/web.js',
    () =>
      edit('lib/ask/web.js', " && by !== 'headword' && !except.includes(id));", " && by !== 'headword');"),
  ],
  [
    'case timelines: pushed below the detailed account',
    'src/features/v25/reading.js',
    () => edit('src/features/v25/reading.js', 'summary.after(group);', 'void group;'),
  ],
  [
    'brief navigation: queued close erases a newly opened case',
    'src/features/r19/briefs.js',
    () =>
      edit('src/features/r19/briefs.js', "if (!dialog.open) body.innerHTML = '';", "body.innerHTML = '';"),
  ],
  [
    'source images: JPEG 2000 decoder URL is broken',
    'src/runtime/dklaR11Sources.js',
    () =>
      edit(
        'src/runtime/dklaR11Sources.js',
        "wasmUrl: PDF_ASSETS + 'wasm/',",
        "wasmUrl: PDF_ASSETS + 'missing-wasm/',",
      ),
  ],
  [
    'readability: paragraph layout drops legal detail',
    'src/runtime/semesterCode.js',
    () =>
      edit(
        'src/runtime/semesterCode.js',
        'function r6ReadingChunks(text) {',
        'function r6ReadingChunks(text) { return [];',
      ),
  ],
  [
    'source reader: original PDF pages never render',
    'src/runtime/dklaR11Sources.js',
    () =>
      edit(
        'src/runtime/dklaR11Sources.js',
        'async function renderPDF(host, path, page) {',
        'async function renderPDF(host, path, page) { return;',
      ),
  ],
  [
    'source navigation: case readers lose their original sources',
    'src/features/r19/briefs.js',
    () =>
      edit(
        'src/features/r19/briefs.js',
        'function sourceLinks(id) {',
        'function sourceLinks(id) { return "";',
      ),
  ],
  ['a case record in the atlas data', record, () => flip(record)],
  ['a case brief', brief, () => flip(brief)],
  ['a Cold Call narrative', narrative, () => flip(narrative)],
  [
    'an entry in the authorities dataset',
    'tools/v25/authorities.json',
    () =>
      edit(
        'tools/v25/authorities.json',
        '"basis": "Explicit citation in atlas entry"',
        '"basis": "Explicit citation in atlas entri"',
      ),
  ],
  [
    'code: the base app throws while loading',
    'src/runtime/dklaUI.js',
    () => prepend('src/runtime/dklaUI.js', 'throw new Error("broken on purpose");\n'),
  ],
  [
    'code: the Cold Call reader never installs',
    'src/features/cold-call/reader.js',
    () => edit('src/features/cold-call/reader.js', STRICT, STRICT + 'return;'),
  ],
  [
    'code: Cold Call definition links stop rendering',
    'src/features/cold-call/glossary.js',
    () =>
      edit('src/features/cold-call/glossary.js', 'return markup(text, links);', 'return markup(text, []);'),
  ],
  [
    'updates: the "new version is ready" notice comes back on a page that is already current',
    'src/runtime/dklaR18Study.js',
    () => edit('src/runtime/dklaR18Study.js', "if (status === 'newer') {", "if (status !== 'offline') {"),
  ],
  [
    'updates: Refresh reloads without writing the edit that is still waiting to be saved',
    'src/runtime/dklaR18Study.js',
    () =>
      edit('src/runtime/dklaR18Study.js', 'await window.LegalAtlas?.flush?.();', 'await Promise.resolve();'),
  ],
  [
    'updates: the v2.9 bug returns: "a new version is ready" whenever a new offline worker has installed',
    'src/runtime/dklaR18Study.js',
    () =>
      edit(
        'src/runtime/dklaR18Study.js',
        "navigator.serviceWorker.register('sw.js').catch(",
        "navigator.serviceWorker.register('sw.js').then((reg) => { const watch = (w) => w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) showNotice({ build: 'installed', version: R18.version }); }); watch(reg.installing); reg.addEventListener('updatefound', () => watch(reg.installing)); }).catch(",
      ),
  ],
  [
    'updates: the site root page forwards from any address, so a v2.9 offline copy reloads forever',
    'src/features/r19/index.template.html',
    () =>
      edit(
        'src/features/r19/index.template.html',
        'if (!location.pathname.endsWith(',
        'if (true || !location.pathname.endsWith(',
      ),
  ],
  [
    'updates: the site root page forwards only from the root, so an old address shows "still being updated" while online',
    'src/features/r19/index.template.html',
    () =>
      edit(
        'src/features/r19/index.template.html',
        "if (!location.pathname.endsWith('/DKLA-v2.5.html'))",
        'if (/\\/(index\\.html)?$/.test(location.pathname))',
      ),
  ],
  [
    'updates: the install downloads the atlas while the worker in charge is still storing the same page',
    'src/features/r19/sw.template.js',
    () => edit('src/features/r19/sw.template.js', 'waited < PAGE_WAIT;', 'waited < 0;'),
  ],
  [
    'updates: a save the browser aborts never finishes, so Refresh hangs on "Saving…"',
    'src/runtime/civilCode.js',
    () => edit('src/runtime/civilCode.js', 'tx.onabort = failed;', 'void failed;'),
  ],
  [
    'updates: Refresh reloads although the save failed, dropping the latest edits',
    'src/runtime/dklaR18Study.js',
    () =>
      edit(
        'src/runtime/dklaR18Study.js',
        "toast('Could not save your latest edits. Export before refreshing.');\n      return;",
        "toast('Could not save your latest edits. Export before refreshing.');",
      ),
  ],
  [
    'updates: the install downloads the atlas again instead of reusing the copy the browser just fetched',
    'src/features/r19/sw.template.js',
    () =>
      edit(
        'src/features/r19/sw.template.js',
        "fetch(at(path), { cache: 'no-cache', credentials: 'same-origin' })",
        "fetch(at(path), { cache: 'no-store', credentials: 'same-origin' })",
      ),
  ],
  [
    'updates: the install keeps every earlier copy until it has room for its own',
    'src/features/r19/sw.template.js',
    () => edit('src/features/r19/sw.template.js', '      await makeRoom();', '      void makeRoom;'),
  ],
  [
    'updates: a PDF.js worker from another release breaks the source viewer of an open tab',
    'src/runtime/dklaR11Sources.js',
    () => edit('src/runtime/dklaR11Sources.js', 'pdfReloads < 2) {', 'pdfReloads < 0) {'),
  ],
  [
    'updates: the offline worker keeps every earlier release (another 65 MB each time)',
    'src/features/r19/sw.template.js',
    () =>
      edit(
        'src/features/r19/sw.template.js',
        'if (name !== CACHE && RELEASE_CACHE.test(name)) await caches.delete(name);',
        'if (name !== CACHE && RELEASE_CACHE.test(name)) void name;',
      ),
  ],
  [
    'code: the reading layout never installs',
    'src/features/v25/reading.js',
    () => edit('src/features/v25/reading.js', 'if (window.DKLAReading) return;', 'return;'),
  ],
  [
    'a look: the Cold Call text recoloured by a style',
    'src/features/cold-call/reader.css',
    () =>
      append('src/features/cold-call/reader.css', '\n#coldCallDialog p {\n  color: #e06060 !important;\n}\n'),
  ],
  [
    'a look: the doctrine timeline loses its year markers',
    'src/features/r19/timelines.css',
    () => append('src/features/r19/timelines.css', '\n#r21Timelines .r21-y {\n  opacity: 0 !important;\n}\n'),
  ],
  [
    'Home layout: the DKLA mark back above the courses instead of between them and the lower blocks',
    'src/features/r19/r20.js',
    () => edit('src/features/r19/r20.js', 'wide: { x: -3100, y: 10730,', 'wide: { x: -3100, y: -5300,'),
  ],
  [
    "Home layout: the Notes tile back beside the DKLA mark's upper-right corner, where the splash text goes",
    'src/features/v25/geography.js',
    () =>
      edit(
        'src/features/v25/geography.js',
        "'workbench-region': [20660, 9321]",
        "'workbench-region': [4970, 9650]",
      ),
  ],
  [
    'Home layout: the Civil Procedure heading reads "Civil Procedure" again instead of "Civ Pro"',
    'src/features/v25/home-fit.js',
    () =>
      edit(
        'src/features/v25/home-fit.js',
        "'Civil Procedure': 'Civ Pro'",
        "'Civil Procedure': 'Civil Procedure'",
      ),
  ],
  [
    'a layout position: the History block moved',
    TYPOGRAPHY,
    () =>
      edit(
        TYPOGRAPHY,
        "root.dataset.dklaCourt = '1';",
        "root.dataset.dklaCourt = '1';bg.setAttribute('x',Number(bg.getAttribute('x'))+3000);",
      ),
  ],
  [
    'a layout position: a subject moved in the map data',
    'tools/v25/geography.json',
    () => {
      const text = fs.readFileSync(at('tools/v25/geography.json'), 'utf8'),
        found = text.match(/"x":\s*(-?\d+(?:\.\d+)?)/);
      if (!found) throw Error('No x coordinate found in geography.json');
      fs.writeFileSync(
        at('tools/v25/geography.json'),
        text.replace(found[0], found[0].replace(found[1], String(Number(found[1]) + 900))),
      );
    },
  ],
  [
    'saved work: study ratings wiped when the atlas loads',
    TYPOGRAPHY,
    () => edit(TYPOGRAPHY, STRICT, STRICT + "try{localStorage.removeItem('dkla.study.v1');}catch{}"),
  ],
  [
    'saved work: saved notes not read back after a reload',
    TYPOGRAPHY,
    () =>
      edit(
        TYPOGRAPHY,
        STRICT,
        STRICT +
          "try{const store=IDBObjectStore.prototype,get=store.get;store.get=function(...a){return this.name==='graphs'?get.call(this,'missing'):get.apply(this,a);};}catch{}",
      ),
  ],
  [
    'a feature: the dictionary hidden by a style',
    'src/features/v26/typography.css',
    () => append('src/features/v26/typography.css', '\n#glossaryDialog[open]{display:none!important}\n'),
  ],
  [
    'offline use: the worker stops caching the atlas',
    'src/features/r19/sw.template.js',
    () => edit('src/features/r19/sw.template.js', 'cache.addAll(SHELL)', 'cache.addAll([])'),
  ],
  [
    'code: the session cards never appear on a course map',
    'src/features/sessions/sessions.js',
    () => edit('src/features/sessions/sessions.js', 'if (window.DKLASessions) return;', 'return;'),
  ],
  [
    'code: Civil Procedure goes back to the September 3 syllabus',
    'src/features/sessions/civil-syllabus.js',
    () => edit('src/features/sessions/civil-syllabus.js', 'if (!R?.weeks || !R.entries) return;', 'return;'),
  ],
  [
    'an old link: one earlier address no longer redirects',
    'vercel.json',
    () => edit('vercel.json', '"source": "/DKLA-r17.html"', '"source": "/DKLA-r17x.html"'),
  ],
  [
    'the unlisted EO entrance points at the wrong destination',
    'vercel.json',
    () =>
      edit(
        'vercel.json',
        'https://executive-orders-production-atlas.edgyglove8.chatgpt.site',
        'https://example.invalid',
      ),
  ],
  [
    'the EO order cards are no longer served at /eo/gesner',
    'vercel.json',
    () => edit('vercel.json', '"destination": "/api/eo-gesner"', '"destination": "/api/eo-gesner-missing"'),
  ],
];

const pass = () => {
  const began = Date.now(),
    result = spawnSync(process.execPath, ['tools/verify/run.mjs'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 1 << 28,
    });
  return {
    failed: result.status !== 0,
    seconds: Math.round((Date.now() - began) / 1000),
    by: [...result.stdout.matchAll(/^FAIL\s+[\d.]+s\s+(.+)$/gm)].map((match) => match[1].trim()),
    tail: result.stdout.trim().split('\n').slice(-3).join(' | '),
  };
};
const chosen = process.argv[2]
  ? process.argv[2].split(',').map(Number)
  : breakages.map((_, index) => index + 1);
let missed = 0;
for (const number of chosen) {
  const [name, file, apply] = breakages[number - 1],
    original = fs.readFileSync(at(file));
  let result;
  try {
    apply();
    result = pass();
  } finally {
    fs.writeFileSync(at(file), original);
  }
  if (!result.failed) missed++;
  console.log(
    `${String(number).padStart(2)}. ${result.failed ? 'caught' : 'MISSED'}  ${name}  (${result.seconds}s)\n      ${result.failed ? 'by: ' + result.by.join('; ') : 'the pass succeeded although ' + file + ' was altered'}`,
  );
}
const clean = pass();
console.log(
  `\nWith everything restored: ${clean.failed ? 'THE PASS FAILS: ' + clean.tail : 'the pass succeeds (' + clean.seconds + 's).'}`,
);
if (missed || clean.failed) {
  console.log(missed ? `${missed} breakage(s) were not caught.` : '');
  process.exit(1);
}
console.log(`All ${chosen.length} breakages were caught.`);
