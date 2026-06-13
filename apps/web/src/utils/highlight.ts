// Tiny regex-based syntax highlighter for the Snippets app. Deliberately
// minimal (no dependency like Prism/Shiki) - covers the languages aifusp
// uses most: bash, yaml, json, java, ts/js, sql and properties files.

const escapeHtml = (str: string) =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface Rule {
  pattern: string;
  className: string;
}

const NUMBER = '\\b\\d+(?:\\.\\d+)?\\b';
const DQ_STRING = '"(?:[^"\\\\]|\\\\.)*"';
const SQ_STRING = "'(?:[^'\\\\]|\\\\.)*'";
const TEMPLATE_STRING = '`(?:[^`\\\\]|\\\\.)*`';

const COMMENT = 'text-zinc-500 italic';
const STRING = 'text-green-400';
const KEYWORD = 'text-os-pink';
const NUM = 'text-orange-400';
const TYPE = 'text-blue-400';
const KEY = 'text-purple-400';

const kw = (words: string[]) => `\\b(?:${words.join('|')})\\b`;

const JAVA_KEYWORDS = kw([
  'public', 'private', 'protected', 'static', 'final', 'class', 'interface', 'enum',
  'extends', 'implements', 'new', 'return', 'void', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'default', 'break', 'continue', 'try', 'catch', 'finally', 'throw',
  'throws', 'import', 'package', 'this', 'super', 'null', 'true', 'false', 'int', 'long',
  'double', 'float', 'boolean', 'char', 'byte', 'short', 'abstract', 'synchronized',
  'volatile', 'transient', 'instanceof', 'var',
]);

const TS_KEYWORDS = kw([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
  'case', 'default', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'class',
  'extends', 'implements', 'interface', 'type', 'enum', 'import', 'export', 'from', 'as',
  'async', 'await', 'void', 'null', 'undefined', 'true', 'false', 'this', 'super', 'typeof',
  'instanceof', 'in', 'of', 'public', 'private', 'protected', 'readonly', 'static',
]);

const BASH_KEYWORDS = kw([
  'if', 'then', 'else', 'elif', 'fi', 'for', 'do', 'done', 'while', 'until', 'case', 'esac',
  'function', 'return', 'export', 'local', 'echo', 'exit', 'in', 'select',
]);

const SQL_KEYWORDS = kw([
  'select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create',
  'table', 'alter', 'drop', 'join', 'inner', 'left', 'right', 'outer', 'on', 'and', 'or',
  'not', 'null', 'is', 'as', 'order', 'by', 'group', 'having', 'limit', 'desc', 'asc',
  'default', 'primary', 'key', 'foreign', 'references', 'constraint', 'add', 'column',
]);

const RULES: Record<string, Rule[]> = {
  bash: [
    { pattern: '#.*$', className: COMMENT },
    { pattern: `${DQ_STRING}|${SQ_STRING}`, className: STRING },
    { pattern: '\\$\\{?\\w+\\}?', className: TYPE },
    { pattern: BASH_KEYWORDS, className: KEYWORD },
    { pattern: NUMBER, className: NUM },
  ],
  yaml: [
    { pattern: '#.*$', className: COMMENT },
    { pattern: '^\\s*[\\w.-]+(?=\\s*:)', className: KEY },
    { pattern: `${DQ_STRING}|${SQ_STRING}`, className: STRING },
    { pattern: kw(['true', 'false', 'null']), className: KEYWORD },
    { pattern: NUMBER, className: NUM },
  ],
  json: [
    { pattern: '"(?:[^"\\\\]|\\\\.)*"(?=\\s*:)', className: KEY },
    { pattern: DQ_STRING, className: STRING },
    { pattern: kw(['true', 'false', 'null']), className: KEYWORD },
    { pattern: NUMBER, className: NUM },
  ],
  java: [
    { pattern: '//.*$|/\\*[\\s\\S]*?\\*/', className: COMMENT },
    { pattern: '@\\w+', className: TYPE },
    { pattern: `${DQ_STRING}|${SQ_STRING}`, className: STRING },
    { pattern: JAVA_KEYWORDS, className: KEYWORD },
    { pattern: NUMBER, className: NUM },
  ],
  typescript: [
    { pattern: '//.*$|/\\*[\\s\\S]*?\\*/', className: COMMENT },
    { pattern: `${TEMPLATE_STRING}|${DQ_STRING}|${SQ_STRING}`, className: STRING },
    { pattern: TS_KEYWORDS, className: KEYWORD },
    { pattern: NUMBER, className: NUM },
  ],
  sql: [
    { pattern: '--.*$', className: COMMENT },
    { pattern: SQ_STRING, className: STRING },
    { pattern: SQL_KEYWORDS, className: KEYWORD },
    { pattern: NUMBER, className: NUM },
  ],
  properties: [
    { pattern: '[#;].*$', className: COMMENT },
    { pattern: '^[\\w.-]+(?=\\s*=)', className: KEY },
    { pattern: NUMBER, className: NUM },
  ],
};

// Aliases so common shorthand language names map to a supported rule set.
const ALIASES: Record<string, string> = {
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  js: 'typescript',
  jsx: 'typescript',
  ts: 'typescript',
  tsx: 'typescript',
  javascript: 'typescript',
  conf: 'properties',
  ini: 'properties',
  cfg: 'properties',
};

export const SUPPORTED_LANGUAGES = [
  'plaintext', 'bash', 'yaml', 'json', 'java', 'typescript', 'sql', 'properties',
];

const normalizeLang = (language: string): string => {
  const lang = language.trim().toLowerCase();
  return ALIASES[lang] ?? lang;
};

export function highlightCode(code: string, language: string): string {
  const escaped = escapeHtml(code);
  const rules = RULES[normalizeLang(language)];
  if (!rules) return escaped;

  const pattern = rules.map((r, i) => `(?<g${i}>${r.pattern})`).join('|');
  const combined = new RegExp(pattern, 'gim');

  return escaped.replace(combined, (match, ...args) => {
    const groups = args[args.length - 1] as Record<string, string | undefined>;
    for (let i = 0; i < rules.length; i++) {
      if (groups[`g${i}`] !== undefined) {
        return `<span class="${rules[i].className}">${match}</span>`;
      }
    }
    return match;
  });
}
