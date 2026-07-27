const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { performance } = require('perf_hooks');

const resourcePath = path.join(__dirname, '汉化资源.json');
const backupSuffix = '.cursor-zh.bak';
const rangeRadius = 150_000;
const rangeAnchors = [
  'Cursor Account',
  'Cursor Settings',
  'Follow System Color Scheme',
  'Sync Theme with IDE',
  'Rules, Skills, Subagents',
  'Installed MCP Servers',
  'Execution and Approvals',
  'Browse Marketplace',
  'Data Sharing',
  'Cursor Worktrees Configuration',
  'Self-Driving PRs',
  'API Keys',
  'Plan & Usage',
  'Consumed by Auto. Additional usage consumes API quota.',
  'Included in ${',
];

const parseCliArgs = (args) => {
  const installPaths = [];
  let preview = false;
  let restore = false;

  for (const arg of args) {
    if (arg === '--preview') {
      preview = true;
    } else if (arg === '--restore') {
      restore = true;
    } else if (arg.startsWith('--')) {
      throw new Error(`不支持的参数：${arg}`);
    } else {
      installPaths.push(arg);
    }
  }

  if (preview && restore) {
    throw new Error('--preview 和 --restore 不能同时使用。');
  }
  if (installPaths.length !== 1 || !installPaths[0].trim()) {
    throw new Error(
      '请提供一个 Cursor 安装目录，例如：一键汉化Cursor.cmd "C:\\Program Files\\Cursor"',
    );
  }

  return {
    installPath: path.resolve(installPaths[0].trim()),
    preview,
    restore,
  };
};

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const stopCursor = () => {
  spawnSync('taskkill.exe', ['/IM', 'Cursor.exe', '/F'], { stdio: 'ignore' });
};

const startCursor = (cursorExe) => {
  const child = spawn(cursorExe, [], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
};

const listTargets = (workbenchPath) =>
  fs
    .readdirSync(workbenchPath, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && /^workbench.*\.main\.js$/i.test(entry.name),
    )
    .map((entry) => path.join(workbenchPath, entry.name));

const toSingleQuotedString = (text) =>
  `'${text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')}'`;

const toTemplateString = (text) =>
  `\`${text
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')}\``;

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createTokenMatcher = (translations) => {
  const replacements = new Map();
  for (const [resourceKey, value] of Object.entries(translations)) {
    const raw = resourceKey.startsWith('@raw:');
    const prefix = resourceKey.startsWith('@prefix:');
    const suffix = resourceKey.startsWith('@suffix:');
    const key = raw
      ? resourceKey.slice(5)
      : prefix || suffix
        ? resourceKey.slice(8)
        : resourceKey;
    const tokens = raw
      ? [[key, value]]
      : prefix
      ? [
          [`"${JSON.stringify(key).slice(1, -1)}`, `"${JSON.stringify(value).slice(1, -1)}`],
          [toSingleQuotedString(key).slice(0, -1), toSingleQuotedString(value).slice(0, -1)],
          [toTemplateString(key).slice(0, -1), toTemplateString(value).slice(0, -1)],
          [`>${key}`, `>${value}`],
        ]
      : suffix
        ? [
            [`${JSON.stringify(key).slice(1, -1)}"`, `${JSON.stringify(value).slice(1, -1)}"`],
            [toSingleQuotedString(key).slice(1), toSingleQuotedString(value).slice(1)],
            [toTemplateString(key).slice(1), toTemplateString(value).slice(1)],
            [`${key}<`, `${value}<`],
          ]
        : [
            [JSON.stringify(key), JSON.stringify(value)],
            [toSingleQuotedString(key), toSingleQuotedString(value)],
            [toTemplateString(key), toTemplateString(value)],
            [`>${key}<`, `>${value}<`],
            [`>${JSON.stringify(key).slice(1, -1)}"`, `>${JSON.stringify(value).slice(1, -1)}"`],
            [`>${toSingleQuotedString(key).slice(1, -1)}'`, `>${toSingleQuotedString(value).slice(1, -1)}'`],
            [`>${toTemplateString(key).slice(1, -1)}\``, `>${toTemplateString(value).slice(1, -1)}\``],
          ];
    for (const [token, replacement] of tokens) {
      replacements.set(token, replacement);
    }
  }

  const pattern = [...replacements.keys()]
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join('|');

  return {
    regex: new RegExp(pattern, 'g'),
    replacements,
  };
};

const findRanges = (source) => {
  const positions = [];
  for (const anchor of rangeAnchors) {
    let position = source.indexOf(anchor);
    while (position >= 0) {
      positions.push(position);
      position = source.indexOf(anchor, position + anchor.length);
    }
  }

  const ranges = [];
  for (const position of [...new Set(positions)].sort((a, b) => a - b)) {
    const start = Math.max(0, position - rangeRadius);
    const end = Math.min(source.length, position + rangeRadius);
    const previous = ranges.at(-1);
    if (previous && start <= previous.end) {
      previous.end = Math.max(previous.end, end);
    } else {
      ranges.push({ start, end });
    }
  }
  return ranges;
};

const translateSource = (source, matcher) => {
  const ranges = findRanges(source);
  if (ranges.length === 0) return { output: source, count: 0 };

  const chunks = [];
  let sourceOffset = 0;
  let count = 0;
  for (const range of ranges) {
    chunks.push(source.slice(sourceOffset, range.start));
    const translated = source
      .slice(range.start, range.end)
      .replace(matcher.regex, (token) => {
        count += 1;
        return matcher.replacements.get(token);
      });
    chunks.push(translated);
    sourceOffset = range.end;
  }
  chunks.push(source.slice(sourceOffset));
  return { output: chunks.join(''), count };
};

const restoreBackups = async (targets, cursorExe) => {
  stopCursor();
  await sleep(300);
  for (const target of targets) {
    const backup = `${target}${backupSuffix}`;
    if (fs.existsSync(backup)) fs.copyFileSync(backup, target);
  }
  startCursor(cursorExe);
};

const applyTranslations = async (
  targets,
  translations,
  cursorExe,
  preview,
) => {
  const matcher = createTokenMatcher(translations);
  const changes = [];

  for (const target of targets) {
    const backup = `${target}${backupSuffix}`;
    const current = fs.readFileSync(target, 'utf8');
    const isPatched =
      current.includes('Cursor 设置') || current.includes('Cursor 账户');
    const refreshBackup = !isPatched;

    if (isPatched && !fs.existsSync(backup)) continue;
    const source = isPatched ? fs.readFileSync(backup, 'utf8') : current;
    const { output, count } = translateSource(source, matcher);
    if (count > 0) {
      changes.push({ target, backup, source, output, count, refreshBackup });
    }
  }

  const total = changes.reduce((sum, change) => sum + change.count, 0);
  if (preview) {
    console.log(`文件数：${changes.length}，替换数：${total}`);
    return;
  }
  if (changes.length === 0) {
    console.log('没有发现可替换文案；Cursor 更新后可能需要重新提取资源。');
    return;
  }

  stopCursor();
  await sleep(300);
  for (const change of changes) {
    if (change.refreshBackup || !fs.existsSync(change.backup)) {
      fs.writeFileSync(change.backup, change.source, 'utf8');
    }
    fs.writeFileSync(change.target, change.output, 'utf8');
  }
  startCursor(cursorExe);
};

const main = async (args = process.argv.slice(2)) => {
  const startedAt = performance.now();
  const { installPath, preview, restore } = parseCliArgs(args);
  const cursorExe = path.join(installPath, 'Cursor.exe');
  const workbenchPath = path.join(
    installPath,
    'resources/app/out/vs/workbench',
  );

  if (!fs.existsSync(resourcePath)) {
    throw new Error(`找不到汉化资源：${resourcePath}`);
  }
  if (!fs.existsSync(cursorExe) || !fs.existsSync(workbenchPath)) {
    throw new Error(`不是有效的 Cursor 安装目录：${installPath}`);
  }

  const targets = listTargets(workbenchPath);
  if (targets.length === 0) {
    throw new Error(`在 ${workbenchPath} 中找不到 Cursor workbench 文件。`);
  }

  if (restore) {
    await restoreBackups(targets, cursorExe);
  } else {
    const translations = JSON.parse(fs.readFileSync(resourcePath, 'utf8'));
    await applyTranslations(targets, translations, cursorExe, preview);
  }

  console.log(`耗时：${Math.round(performance.now() - startedAt)} ms`);
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`[错误] ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { createTokenMatcher, parseCliArgs, translateSource };
