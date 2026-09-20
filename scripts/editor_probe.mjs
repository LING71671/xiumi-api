// editor_probe.mjs — 编辑器 DOM 侦察：找出可交互元素，为自动创作做准备
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { CAPTURE_DIR, STATE_FILE, launchOptions, contextOptions } from './cfg.mjs';
import { Recorder } from './recorder.mjs';

const browser = await chromium.launch(launchOptions);
const ctx = await browser.newContext({ ...contextOptions, storageState: STATE_FILE });
const rec = new Recorder(CAPTURE_DIR, 'editor-probe');
const page = await ctx.newPage();
rec.attach(page);

await page.goto('https://xiumi.us/studio/v5/paper', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(12000);

const info = await page.evaluate(() => {
  const q = (s) => [...document.querySelectorAll(s)].slice(0, 12);
  const desc = (el) => ({
    tag: el.tagName.toLowerCase(),
    id: el.id || null,
    cls: (el.className || '').toString().slice(0, 80),
    text: (el.innerText || '').trim().slice(0, 40),
    title: el.getAttribute('title') || null,
  });
  return {
    url: location.href,
    title: document.title,
    iframes: q('iframe').map((f) => ({ src: f.src, id: f.id, cls: f.className, w: f.clientWidth, h: f.clientHeight })),
    editables: q('[contenteditable]').map(desc),
    buttons: [...document.querySelectorAll('button, [role="button"], .btn, [class*="button"], [class*="btn"]')].slice(0, 60).map(desc),
    inputs: q('input, textarea, select').map((el) => ({ ...desc(el), type: el.type, name: el.name })),
    canvas: q('canvas').map((c) => ({ w: c.width, h: c.height, id: c.id, cls: c.className })),
    topClasses: [...document.querySelectorAll('body > *')].map(desc),
    bodyText: document.body.innerText.slice(0, 1500),
  };
});

fs.writeFileSync(path.join(CAPTURE_DIR, 'editor_dom.json'), JSON.stringify(info, null, 2));
console.log('URL:', info.url, '| title:', info.title);
console.log('iframes:', JSON.stringify(info.iframes, null, 1));
console.log('contenteditable:', JSON.stringify(info.editables, null, 1));
console.log('buttons(60):', info.buttons.map((b) => `${b.tag}.${(b.cls || '').split(' ')[0]}[${b.text || b.title || ''}]`).join(' | '));
console.log('inputs:', JSON.stringify(info.inputs, null, 1));
console.log('canvas:', JSON.stringify(info.canvas));
console.log('bodyText:\n', info.bodyText);

await page.screenshot({ path: path.join(CAPTURE_DIR, 'shots', 'editor-probe.png'), fullPage: false });
await rec.flush();
await browser.close();
