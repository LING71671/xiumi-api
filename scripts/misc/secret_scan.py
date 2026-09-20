#!/usr/bin/env python3
"""secret_scan.py — 开源前与提交前的敏感信息扫描

用途：
  1. 首次开源时确认仓库里没有凭据、个人信息、本机绝对路径
  2. 日常提交前作为守卫跑一遍

用法：
  python scripts/secret_scan.py                  # 扫描仓库，退出码非 0 表示发现阻断项
  python scripts/secret_scan.py --all            # 连同 .gitignore 排除的路径一起扫（首次开源用）
  python scripts/secret_scan.py --json           # 结构化输出

判定分级：
  BLOCK  —— 必须处理，否则不得发布（凭据、会话、手机号、密码、私钥）
  WARN   —— 需要人工确认（本机绝对路径、疑似个人信息、内网地址）
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------- 规则

# 每个规则：名称、正则、级别、说明
RULES: list[tuple[str, re.Pattern, str, str]] = [
    ("session_cookie", re.compile(r'\bsid\s*[=:]\s*["\']?[A-Za-z0-9%_\-\.]{16,}'), "BLOCK", "会话 cookie（sid）真实值"),
    ("cookie_header", re.compile(r'(?i)\bcookie\s*:\s*(?!document\.cookie)(?!\$\{)[\w\-\.]+=[^\s;]{12,}'), "BLOCK", "Cookie 请求头真实值"),
    ("authorization", re.compile(r'(?i)\bauthorization\s*[=:]\s*["\']?\s*(?:bearer|token|basic)\s+[A-Za-z0-9\-_\.]{16,}'), "BLOCK", "Authorization 头 / token 真实值"),
    ("bearer", re.compile(r'(?i)\bbearer\s+[A-Za-z0-9\-_\.]{20,}'), "BLOCK", "Bearer token"),
    ("password_field", re.compile(r'(?i)["\']?(?:pass|passwd|password|pwd)["\']?\s*[:=]\s*["\'](?!\.{3}$|\*{3,}$|x{3,}$|<|YOUR_|your_)([^"\']{6,})["\']'), "BLOCK", "明文密码字段"),
    ("private_key", re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----'), "BLOCK", "私钥"),
    ("aws_key", re.compile(r'\bAKIA[0-9A-Z]{16}\b'), "BLOCK", "AWS Access Key"),
    ("github_token", re.compile(r'\b(gh[pousr]_[A-Za-z0-9]{30,})\b'), "BLOCK", "GitHub Token"),
    # 手机号/身份证号一律要求**两侧都是非单词字符**。抓包样本里存在 32 位十六进制
    # 资源 hash，其内部字节偶然会连成 11 位数字段（形如 1[3-9] + 9 位数字）；若只用
    # `(?<!\d)` 判定，整个 hash 会被误报成手机号。`\b` 能同时排除这种「粘在更长
    # 标识符里」的假阳性，又不会漏掉被引号/空格/等号包围的真实值。
    ("cn_mobile", re.compile(r'\b1[3-9]\d{9}\b'), "BLOCK", "中国大陆手机号"),
    ("cn_mobile_intl", re.compile(r'\b(?:\+?86)1[3-9]\d{9}\b'), "BLOCK", "带国际区号的大陆手机号"),
    ("id_card", re.compile(r'\b\d{17}[\dXx]\b'), "BLOCK", "身份证号疑似"),
    ("email", re.compile(r'\b[\w.+-]+@(?!xiumi\.us|xiumius\.cn|example\.com)[\w-]+\.[\w.]{2,}\b'), "WARN", "邮箱地址"),
    ("hex32_uid", re.compile(r'\b[a-f0-9]{32}\b'), "WARN", "32 位十六进制标识（可能是 unique_uid 或资源 hash）"),
    ("win_abs_path", re.compile(r'(?<![A-Za-z0-9])[A-Za-z]:[\\/](?:Users|Xiumi|DevEnv|ReverseLab)\b'), "WARN", "Windows 本机绝对路径"),
    ("unix_home_path", re.compile(r'(?<![A-Za-z0-9_])/(?:Users|home)/(?!user/)[A-Za-z0-9._-]+/'), "WARN", "类 Unix 家目录绝对路径"),
    ("private_ip", re.compile(r'\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b'), "WARN", "内网 IP"),
    ("localhost_port", re.compile(r'127\.0\.0\.1:\d{4,5}'), "WARN", "本机端口（可能是代理）"),
]

# 协议常量与占位值：命中这些不算泄露
ALLOW_VALUES = {
    "c444c492de13eb854a687b3361bef8c4",   # FORMAT_SHOW
    "0320cc2e241eb9af530b84dbe0b1cc65",   # FORMAT_RAW
    # 脱敏占位值（含文档里示例用的保留号段）
    "13800000000",
    "0123456789abcdef0123456789abcdef",
    "11112222333344445555666677778888",
    "aa11bb22cc33dd44ee55ff6677889900",
    "bb11cc22dd33ee44ff55667788990011",
    "cc11dd22ee33ff445566778899aa0011",
    "dd11ee22ff33445566778899aabb0011",
    "ee11ff2233445566778899aabbcc0011",
    "ff112233445566778899aabbccdd0011",
    "aabbccddeeff00112233445566778899",
    "00112233445566778899aabbccddeeff",
}

# 二进制/媒体后缀直接跳过
SKIP_EXT = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".svg",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".zip", ".gz", ".tar", ".7z", ".rar", ".pdf", ".mp4", ".mp3", ".webm",
    ".so", ".dll", ".dylib", ".exe", ".bin", ".pyc", ".class", ".jar",
}

# 目录跳过（--all 时也只跳过这些）。capture 是原始抓包，按设计就该含真实值，
# 任何模式都不扫它 —— 否则 --all 的结果全是它刷出来的噪音，掩盖真正要找的问题。
SKIP_DIR_HARD = {".git", "node_modules", "__pycache__", ".venv", "venv", ".audit", "capture"}

# 本地凭据/映射文件，扫描它们没有意义（它们本来就该含真实值，且已被 .gitignore 排除）
SKIP_NAME = {"desensitize.map.local.json", "desensitize.state.local.json",
             "account.local.json", "client-session.json", "storage_state.json"}

# 常规模式额外跳过的（原始抓包与产物目录）
SKIP_DIR_SOFT = {"capture", "logs", "exports", "dist", "build", ".cache"}

# 脱敏工具产出的伪名清单（本地文件，.gitignore 已排除，缺失不影响判定）
DEFAULT_STATE = "scripts/desensitize.state.local.json"


def load_pseudo_allow(root: Path) -> set[str]:
    """读取脱敏工具记录的「已产出伪名」，视为已知非真实值。

    伪名是**保形**的：长度与字符集跟原值一致，因此长得和真值一样，必然会被
    `hex32_uid` 这类形态规则命中。本地存在状态文件时据此放行，扫描结论才不会被
    自家产物刷屏；状态文件缺失时退化为 WARN 交人工确认 —— 方向是「宁可多报」，
    不会因此漏掉真实值。
    """
    p = root / DEFAULT_STATE
    if not p.is_file():
        return set()
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return set()
    vals = raw.get("emitted") if isinstance(raw, dict) else raw
    return set(vals) if isinstance(vals, list) else set()


def collect_files(root: Path, scan_all: bool) -> list[Path]:
    skip = set(SKIP_DIR_HARD) | (set() if scan_all else SKIP_DIR_SOFT)
    out: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip]
        for fn in filenames:
            if fn in SKIP_NAME:
                continue
            p = Path(dirpath) / fn
            if p.suffix.lower() in SKIP_EXT:
                continue
            try:
                if p.stat().st_size > 8 * 1024 * 1024:   # 单文件 > 8MB 跳过
                    continue
            except OSError:
                continue
            out.append(p)
    return out


def scan_file(p: Path, root: Path, allow: set[str]) -> list[dict]:
    try:
        text = p.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return []
    rel = p.relative_to(root).as_posix()
    hits = []
    for name, rx, level, desc in RULES:
        for m in rx.finditer(text):
            if m.group(0) in allow:
                continue
            line_no = text.count("\n", 0, m.start()) + 1
            snippet = text[max(0, m.start() - 30): m.end() + 30].replace("\n", " ")
            hits.append({
                "file": rel,
                "line": line_no,
                "rule": name,
                "level": level,
                "desc": desc,
                "sample": snippet[:120],
            })
    return hits


def main() -> int:
    ap = argparse.ArgumentParser(description="开源前敏感信息扫描")
    ap.add_argument("--root", default=".", help="扫描根目录（默认当前目录）")
    ap.add_argument("--all", action="store_true",
                    help="连 logs/exports 等运行产物一起扫（预期会命中，用于确认它们没进 git 索引）")
    ap.add_argument("--json", action="store_true", help="JSON 输出")
    ap.add_argument("--max-per-rule", type=int, default=4, help="每个规则每个文件最多报几条")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    files = collect_files(root, args.all)
    pseudo_allow = load_pseudo_allow(root)
    allow = set(ALLOW_VALUES) | pseudo_allow
    all_hits: list[dict] = []
    for p in files:
        hits = scan_file(p, root, allow)
        # 限流：同规则同文件只留前 N 条
        seen: dict[tuple, int] = {}
        for h in hits:
            k = (h["file"], h["rule"])
            seen[k] = seen.get(k, 0) + 1
            if seen[k] <= args.max_per_rule:
                all_hits.append(h)

    blockers = [h for h in all_hits if h["level"] == "BLOCK"]
    warns = [h for h in all_hits if h["level"] == "WARN"]

    if args.json:
        print(json.dumps({
            "root": str(root),
            "scanned_files": len(files),
            "pseudo_allowed": len(pseudo_allow),
            "block": len(blockers),
            "warn": len(warns),
            "hits": all_hits,
        }, ensure_ascii=False, indent=2))
        return 1 if blockers else 0

    print(f"扫描根目录：{root}")
    print(f"扫描文件数：{len(files)}")
    print(f"BLOCK {len(blockers)} 项 / WARN {len(warns)} 项"
          + (f"（已放行 {len(pseudo_allow)} 个本工具产出的伪名）" if pseudo_allow else ""))
    if args.all:
        print("--all：已包含 logs/exports 等运行产物。它们本来就被 .gitignore 排除，"
              "命中属预期；只有出现在 git 索引里才需要处理。")
    print("=" * 72)

    for level, group in (("BLOCK", blockers), ("WARN", warns)):
        if not group:
            continue
        print(f"\n--- {level}（{len(group)}）---")
        by_file: dict[str, list[dict]] = {}
        for h in group:
            by_file.setdefault(h["file"], []).append(h)
        for f, hs in sorted(by_file.items()):
            print(f"\n  {f}")
            for h in hs:
                print(f"    L{h['line']:<6} [{h['rule']}] {h['desc']}")
                print(f"           {h['sample']}")

    print("\n" + "=" * 72)
    if blockers:
        print("结论：存在阻断项，处理后方可发布。")
        return 1
    print("结论：无阻断项。WARN 项请人工确认。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
