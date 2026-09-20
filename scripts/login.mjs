// login.mjs — 用账密登录秀米，抓取登录全过程，落盘登录态
// 用法: node scripts/login.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { CAPTURE_DIR, STATE_FILE, launchOptions, contextOptions, loadAccount, ensureDirs } from './cfg.mjs';
import { Recorder } from './recorder.mjs';

ensureDirs();
const { user, pass } = loadAccount();

const browser = await chromium.launch(launchOptions);
const ctx = await browser.newContext(contextOptions);
const rec = new Recorder(CAPTURE_DIR, 'login');
const page = await ctx.newPage();
rec.attach(page);

const out = { ok: false, steps: [] };
const log = (...a) => { console.log(...a); out.steps.push(a.join(' ')); };

try {
  // 0) 预检是否需要验证码
  const pre = await ctx.request.get(
    `https://xiumi.us/api/auth/login-captcha?area_code=86&username=${encodeURIComponent(user)}`,
    { headers: { 'X-Requested-With': 'XMLHttpRequest', Referer: 'https://xiumi.us/auth' } },
  );
  log('[预检] GET /api/auth/login-captcha ->', pre.status(), (await pre.text()).slice(0, 200));
  out.needCaptcha = (await pre.text()).trim() === 'true';

  // 1) 打开登录页
  await page.goto('https://xiumi.us/auth', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('form.phone-form', { timeout: 30000 });
  log('[打开] 登录页 OK:', page.url());

  // 2) 填表
  await page.fill('form.phone-form input[name="email"]', user);
  await page.fill('form.phone-form input[name="password"]', pass);
  await page.check('form.phone-form input[type="checkbox"]');
  log('[填表] 账号/密码/协议 已填');

  // 3) 提交
  const submitBtn = (await page.locator('.login-button').count()) ? '.login-button' : '.captcha-button';
  log('[提交] 使用按钮:', submitBtn, '需要验证码:', out.needCaptcha);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null),
    page.click(submitBtn),
  ]);
  await page.waitForTimeout(2500);
  log('[提交] 提交后 URL:', page.url());

  // 4) 用 /auth/me 验证登录态（与前端同一判据）
  for (let i = 0; i < 6; i++) {
    const r = await ctx.request.get('https://xiumi.us/auth/me', {
      headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
    });
    const txt = await r.text();
    if (r.status() === 200) {
      let j = null; try { j = JSON.parse(txt); } catch { /* noop */ }
      const u = j && (j.data?.user || j.user);
      if (u) {
        out.ok = true;
        out.user = u;
        out.requirePhoneBind = j.data?.requirePhoneBind ?? j.requirePhoneBind;
        log('[会话] /auth/me 200 已登录:', JSON.stringify(u).slice(0, 800));
        break;
      }
    }
    log(`[会话] 第 ${i + 1} 次 /auth/me ->`, r.status(), txt.slice(0, 200));
    await page.waitForTimeout(1500);
  }

  const cookies = await ctx.cookies();
  out.cookies = cookies.map((c) => ({ name: c.name, domain: c.domain, path: c.path, expires: c.expires, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite }));
  log('[Cookie] 数量:', cookies.length, cookies.map((c) => c.name).join(', '));

  await ctx.storageState({ path: STATE_FILE });
  log('[落盘] 登录态 ->', STATE_FILE);
  await page.screenshot({ path: path.join(CAPTURE_DIR, 'login-after.png') });
} catch (e) {
  out.error = String(e.message || e);
  console.error('[失败]', out.error);
} finally {
  await rec.flush();
  fs.writeFileSync(path.join(CAPTURE_DIR, 'login_result.json'), JSON.stringify(out, null, 2));
  await browser.close();
}
console.log('登录结果:', out.ok ? '成功' : '失败');
