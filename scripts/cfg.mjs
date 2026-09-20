// cfg.mjs — 共享配置
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '..');
export const CAPTURE_DIR = path.join(ROOT, 'capture');
export const STATE_FILE = path.join(CAPTURE_DIR, 'storage_state.json');
export const SESSION_FILE = path.join(CAPTURE_DIR, 'client-session.json');
export const ACCOUNT_FILE = path.join(__dirname, 'account.local.json');

/** 应用与 API 的唯一宿主。xiumius.cn 只是着陆页，没有 API —— 见 docs/SITE-TOPOLOGY.md */
export const BASE = process.env.XIUMI_BASE || 'https://xiumi.us';

/** 可选本机代理。默认不启用，需要时设 XIUMI_PROXY=http://127.0.0.1:<port> */
export const PROXY = process.env.XIUMI_PROXY || '';

export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

export function loadAccount() {
  if (process.env.XIUMI_USER && process.env.XIUMI_PASS) {
    return { user: process.env.XIUMI_USER, pass: process.env.XIUMI_PASS };
  }
  if (!fs.existsSync(ACCOUNT_FILE)) throw new Error(`缺少账号文件: ${ACCOUNT_FILE}`);
  const j = JSON.parse(fs.readFileSync(ACCOUNT_FILE, 'utf8'));
  return { user: j.user, pass: j.pass };
}

export function ensureDirs() {
  for (const d of ['docs', 'data', 'capture', 'capture/samples', 'capture/js', 'client', 'scripts']) {
    fs.mkdirSync(path.join(ROOT, d), { recursive: true });
  }
}

/** ms-playwright 缓存里的 chromium revision 可能与 playwright-core 期望的不一致，
 *  这里按标准位置解析出可用的可执行文件，避免 "Executable doesn't exist"。
 *  可用 XIUMI_CHROME 直接指定，或用 PLAYWRIGHT_BROWSERS_PATH 覆盖缓存根。 */
function resolveChromium() {
  if (process.env.XIUMI_CHROME) return process.env.XIUMI_CHROME;
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright'),
    path.join(os.homedir(), '.cache', 'ms-playwright'),
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
  ].filter(Boolean);
  const wantHeaded = !!process.env.XIUMI_HEADED;
  const cands = [];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    for (const d of fs.readdirSync(r)) {
      const base = path.join(r, d);
      if (!/^chromium/.test(d)) continue;
      cands.push(
        path.join(base, 'chrome-win64', 'chrome.exe'),
        path.join(base, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
        path.join(base, 'chrome-linux', 'chrome'),
        path.join(base, 'chrome-headless-shell-linux64', 'chrome-headless-shell'),
      );
    }
  }
  const exists = cands.filter((p) => fs.existsSync(p));
  if (!exists.length) return undefined;
  if (wantHeaded) return exists.find((p) => p.endsWith('chrome.exe') || p.endsWith('chrome')) || exists[0];
  return exists.find((p) => p.includes('headless-shell')) || exists[0];
}

export const CHROMIUM_PATH = resolveChromium();

export const launchOptions = {
  headless: process.env.XIUMI_HEADED ? false : true,
  executablePath: CHROMIUM_PATH,
  proxy: PROXY ? { server: PROXY } : undefined,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ],
};

export const contextOptions = {
  userAgent: UA,
  viewport: { width: 1600, height: 950 },
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
  ignoreHTTPSErrors: true,
};
