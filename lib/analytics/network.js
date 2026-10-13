import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
let databases;
function v6(value) {
  const parts = value.split('::'),
    left = parts[0].split(':').filter(Boolean),
    right = (parts[1] || '').split(':').filter(Boolean);
  const words =
    parts.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left;
  return BigInt('0x' + words.map((s) => s.padStart(4, '0')).join(''));
}
function load() {
  if (databases) return databases;
  databases = {};
  for (const family of [4, 6]) {
    try {
      const name = family === 4 ? 'ip2asn-v4-u32.tsv.gz' : 'ip2asn-v6.tsv.gz';
      const rows = gunzipSync(readFileSync(new URL('./asn/' + name, import.meta.url)))
        .toString()
        .trim()
        .split('\n');
      databases[family] = rows.map((row) => {
        const [start, end, asn, , network] = row.split('\t');
        return [family === 4 ? Number(start) : v6(start), family === 4 ? Number(end) : v6(end), asn, network];
      });
    } catch {
      databases[family] = [];
    }
  }
  return databases;
}
export function networkFor(value) {
  if (!value) return { asn: '', network: '' };
  const family = value.includes(':') ? 6 : 4,
    rows = load()[family];
  let key;
  try {
    key = family === 4 ? value.split('.').reduce((n, s) => n * 256 + Number(s), 0) : v6(value);
  } catch {
    return { asn: '', network: '' };
  }
  let lo = 0,
    hi = rows.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1,
      r = rows[mid];
    if (key < r[0]) hi = mid - 1;
    else if (key > r[1]) lo = mid + 1;
    else return { asn: r[2] === '0' ? '' : 'AS' + r[2], network: r[2] === '0' ? '' : r[3] };
  }
  return { asn: '', network: '' };
}
