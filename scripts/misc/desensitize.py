#!/usr/bin/env python3
"""desensitize.py — 开源前的确定性脱敏

设计要点：**本脚本不含任何真实敏感值**，映射表放在本地且不入库的文件里。
脚本本身可以安全开源，映射表（含真实值）被 .gitignore 排除。

只做显式字面量替换，不做正则推断 —— 避免误伤协议常量（如 FORMAT_SHOW 的 format 值，
换了客户端就跑不通，必须原样保留）。

用法：
  # 生成映射表模板
  python scripts/misc/desensitize.py --init

  # 预览（默认不写盘）
  python scripts/misc/desensitize.py

  # 实际写入
  python scripts/misc/desensitize.py --apply

映射表默认位置：scripts/desensitize.map.local.json（已被 .gitignore 排除）
可用 --map 指定其它路径。

伪名状态默认位置：scripts/desensitize.state.local.json（同样被 .gitignore 排除）。
它记录本工具**自己产出过**的伪名，使重复运行成为幂等操作：跑第二遍不会把已经
替换好的值再打乱一遍。删掉它只会让下一次运行多做一轮替换，不会造成漏脱敏。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

DEFAULT_MAP = "scripts/desensitize.map.local.json"
# 伪名化状态：记录**本工具自己产出过**的伪名。有了它，重复运行不会把已经替换好的
# 值再打乱一遍（否则跑两次得到两个不同的仓库，无法复现、diff 全是噪音）。
# 与映射表同样是本地文件、同样不入库。
DEFAULT_STATE = "scripts/desensitize.state.local.json"

# 映射表模板：category 用于报告分类，patterns 是 [原值, 替换值] 对
TEMPLATE = {
    "_comment": "脱敏映射表。含真实敏感值，已被 .gitignore 排除，禁止提交。",
    "categories": [
        {
            "category": "凭据",
            "patterns": [["<明文密码>", "<REDACTED>"]],
        },
        {
            "category": "个人信息",
            "patterns": [["<手机号>", "13800000000"]],
        },
        {
            "category": "账号与资源标识",
            "patterns": [["<本账号 unique_uid>", "0123456789abcdef0123456789abcdef"]],
        },
        {
            "category": "本机绝对路径",
            "patterns": [["<仓库绝对路径>", "<repo>"], ["<家目录>", "<home>"]],
        },
        {
            "category": "本机服务",
            "patterns": [["<本机代理地址>", "127.0.0.1:<port>"]],
        },
    ],
    "protected": {
        "_comment": "禁止替换的协议常量。写在这里做护栏，误配会直接报错退出。",
        "constants": ["c444c492de13eb854a687b3361bef8c4", "0320cc2e241eb9af530b84dbe0b1cc65"]
    },
}

TEXT_EXT = {".md", ".json", ".mjs", ".js", ".py", ".csv", ".txt", ".yml", ".yaml", ".html"}
SKIP_DIR = {".git", "node_modules", "__pycache__", "capture", "logs", "exports", "dist", ".audit"}
# 映射表自身、以及任何本地凭据文件，绝不能参与替换
SKIP_NAME = {"desensitize.map.local.json", "desensitize.state.local.json",
             "account.local.json", "client-session.json", "storage_state.json"}

# ---------------------------------------------------------------- 保形伪名化
#
# data/ 下是抓包样本，含有大量**第三方**标识与展示文本（他人 unique_uid、
# user_sid、昵称、作品标题、CDN 资源 hash）。逐个写进映射表不可行，改用确定性
# 伪名化：长度与字符集保持不变（json 结构与字段形状不受影响），且同一原值
# 恒定映射到同一伪名 —— 保留了数据内部的关联关系，仍可做字段分析。
#
# 仅作用于 data/ 下的文件；协议常量由 protected.constants 保护，不参与替换。

def _pseudonym(value: str, length: int, alphabet: str = "0123456789abcdef") -> str:
    import hashlib
    h = hashlib.sha256(value.encode("utf-8")).digest()
    return "".join(alphabet[b % len(alphabet)] for b in h[:length])


# 形如 xmi/ua/<桶>/i/<hash> 的资源路径
CDN_RE = re.compile(r"(xmi/(?:ua|pd)/)([A-Za-z0-9]{3,8})(/)")
# 资源**文件名** hash。同一个 hash 既能从桶名反查到原图，也能直接命中 CDN 缓存，
# 只换桶名等于没脱敏，所以必须一起保形替换。
#
# 抓包样本里出现的三种路径族：
#   img.xiumi.us/xmi/ua/<桶>/i/<hash>-sz_<字节数>.png     用户上传
#   statics.xiumi.us/stc/images/templates-assets/.../<hash>-sz_<字节数>.png   平台模板素材
#   statics.xiumi.us/mat/i/<分组>/<hash>_sz-<字节数>.png  平台素材
# 共同点是「以一个 16~64 位十六进制文件名为最后一段」，因此按这个特征统一匹配，
# 而不是逐个硬编码路径前缀。
CDN_ASSET_RE = re.compile(
    r"(/)([0-9a-f]{16,64})"
    r"(?=[-_]sz[_\-]|\.(?:png|jpe?g|gif|webp|svg|bmp|mp4))"
)

# 抓包样本里的响应体内嵌为**转义 JSON 字符串**（`\"user_sid\":\"xxx\"`），
# 所以每个引号都要容忍一个可选反斜杠，否则关键字的 `"` 与 `:` 之间会被 `\` 断开。
_Q = r'\\?"'


def _field(key: str) -> re.Pattern:
    """构造「字段名 → 字符串值」的正则，兼容转义与未转义两种形态。"""
    k = key.replace("|", "|")
    return re.compile(rf"({_Q}(?:{k}){_Q}\s*:\s*{_Q})((?:[^\"\\]|\\.)*)({_Q})")


HEX32_VALUE_RE = re.compile(rf'(\\?")([a-f0-9]{{32}})(\\?")')
USER_SID_RE = _field("user_sid")
DATA_NAME_RE = re.compile(rf'({_Q}(?:show_data_name|release_data_name){_Q}\s*:\s*{_Q})([A-Za-z0-9]{{3,8}})(/)')
USERPAGE_RE = re.compile(r"(v\.xiumius\.cn/(?:u|board/v5)/)([A-Za-z0-9]{3,10})")
NICK_RE = _field("nickname|brand_name|nick_name")
LOCATION_RE = _field("location")
TITLE_RE = _field("title")
TYPE_WORDS = {"string", "integer", "boolean", "number", "array", "object", "null", "空"}

SID_ALPHA = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

# schemas.json 里这些字段的 samples 是第三方真实值，结构化替换
SENSITIVE_FIELD_SUFFIX = {"user_sid", "nickname", "brand_name", "nick_name", "location"}


def _sid(v: str) -> str:
    return _pseudonym(v, 5, SID_ALPHA)


def pseudonymize(text: str, protected: list[str],
                 emitted: set[str] | None = None) -> tuple[str, dict[str, int]]:
    """对所有 data/*.json 的文本做字段位精确伪名化。

    刻意**不做**宽泛的短串替换 —— 样本里存在 `111`、`中国` 这类 2~3 字符的昵称/地区，
    裸替换会误伤 `"tag_id": 111`、`中国风`。这里一律要求出现在字段值位置。

    `emitted` 是「本工具此前产出过的伪名」集合。命中的值直接原样放过 —— 这样重复
    运行同一份样本不会把结果再打乱一遍，工具因此是幂等的。缺省（None）表示不启用。
    """
    emitted = set() if emitted is None else emitted
    counts = {"uid": 0, "cdn": 0, "cdn_asset": 0, "user_sid": 0, "userpage": 0,
              "data_name": 0, "nickname": 0, "location": 0, "title": 0}

    def _keep(old: str, new: str) -> bool:
        """值已是本工具产出的伪名 → 跳过替换，并登记新伪名。"""
        if old in emitted:
            return True
        emitted.add(new)
        return False

    def _hex(m):
        v = m.group(2)
        if v in protected:
            return m.group(0)
        new = _pseudonym(v, 32)
        if _keep(v, new):
            return m.group(0)
        counts["uid"] += 1
        return f"{m.group(1)}{new}{m.group(3)}"

    text = HEX32_VALUE_RE.sub(_hex, text)

    def _cdn(m):
        new = _sid(m.group(2))
        if _keep(m.group(2), new):
            return m.group(0)
        counts["cdn"] += 1
        return f"{m.group(1)}{new}{m.group(3)}"

    text = CDN_RE.sub(_cdn, text)

    def _cdn_asset(m):
        v = m.group(2)
        if v in protected:
            return m.group(0)
        new = _pseudonym(v, len(v))
        if _keep(v, new):
            return m.group(0)
        counts["cdn_asset"] += 1
        return f"{m.group(1)}{new}"

    text = CDN_ASSET_RE.sub(_cdn_asset, text)

    def _name(m):
        new = _sid(m.group(2))
        if _keep(m.group(2), new):
            return m.group(0)
        counts["data_name"] += 1
        return f"{m.group(1)}{new}{m.group(3)}"

    text = DATA_NAME_RE.sub(_name, text)

    def _sid_field(m):
        new = _sid(m.group(2))
        if _keep(m.group(2), new):
            return m.group(0)
        counts["user_sid"] += 1
        return f"{m.group(1)}{new}{m.group(3)}"

    text = USER_SID_RE.sub(_sid_field, text)

    def _userpage(m):
        new = _sid(m.group(2))
        if _keep(m.group(2), new):
            return m.group(0)
        counts["userpage"] += 1
        return f"{m.group(1)}{new}"

    text = USERPAGE_RE.sub(_userpage, text)

    def _nick(m):
        v = m.group(2)
        if not v or v.startswith("示例用户"):
            return m.group(0)
        counts["nickname"] += 1
        return f"{m.group(1)}示例用户{_pseudonym(v, 4)}{m.group(3)}"

    text = NICK_RE.sub(_nick, text)

    def _loc(m):
        v = m.group(2)
        if not v or v == "示例地区":
            return m.group(0)
        counts["location"] += 1
        return f"{m.group(1)}示例地区{m.group(3)}"

    text = LOCATION_RE.sub(_loc, text)

    def _title(m):
        v = m.group(2)
        if not v or v in TYPE_WORDS or v.startswith("示例标题"):
            return m.group(0)
        counts["title"] += 1
        return f"{m.group(1)}示例标题{_pseudonym(v, 4)}{m.group(3)}"

    text = TITLE_RE.sub(_title, text)
    return text, counts


def scrub_schema_samples(text: str, protected: list[str],
                         emitted: set[str] | None = None) -> tuple[str, int]:
    """schemas.json 的 samples 数组按字段名结构化替换。

    这些 samples 是裸值（`["aB3dE"]` 这种），没有字段名包裹，正则匹配不到；
    但文件本身是规整 JSON，按 `field` 路径后缀判定即可精确处理。
    同样遵守 `emitted` 幂等约定。
    """
    emitted = set() if emitted is None else emitted
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return text, 0

    fields = data.get("fields")
    if not isinstance(fields, list):
        return text, 0

    n = 0
    for f in fields:
        if not isinstance(f, dict):
            continue
        suffix = str(f.get("field", "")).rsplit(".", 1)[-1].strip()
        if suffix not in SENSITIVE_FIELD_SUFFIX:
            continue
        samples = f.get("samples")
        if not isinstance(samples, list):
            continue
        out = []
        for s in samples:
            if isinstance(s, str) and s:
                if suffix == "location":
                    new = "示例地区"
                elif suffix in ("nickname", "brand_name", "nick_name"):
                    new = s if s.startswith("示例用户") else f"示例用户{_pseudonym(s, 4)}"
                else:
                    new = s if s in emitted else _sid(s)
                    emitted.add(new)
                if new != s:
                    n += 1
                out.append(new)
            else:
                out.append(s)
        f["samples"] = out

    return json.dumps(data, ensure_ascii=False, indent=2), n


def load_state(state_path: Path) -> set[str]:
    """读取「已产出伪名」集合。文件不存在或损坏都按空集处理 —— 状态只是防抖动，
    丢失不会导致漏脱敏，只会让下一次运行多替换一轮。"""
    if not state_path.is_file():
        return set()
    try:
        raw = json.loads(state_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return set()
    vals = raw.get("emitted") if isinstance(raw, dict) else raw
    return set(vals) if isinstance(vals, list) else set()


def save_state(state_path: Path, emitted: set[str]) -> None:
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(json.dumps({
        "_comment": "本工具产出过的伪名。仅本地保留（.gitignore 已排除），用于保证重复运行幂等。",
        "emitted": sorted(emitted),
    }, ensure_ascii=False, indent=0), encoding="utf-8")


def load_map(map_path: Path) -> tuple[list[tuple[str, str, str]], list[str]]:
    if not map_path.is_file():
        print(f"找不到映射表：{map_path}\n先执行 `--init` 生成模板，填入真实值后再运行。", file=sys.stderr)
        sys.exit(2)
    try:
        raw = json.loads(map_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"映射表解析失败：{map_path}\n  {e}", file=sys.stderr)
        sys.exit(2)

    pairs: list[tuple[str, str, str]] = []
    for group in raw.get("categories", []):
        cat = group.get("category", "未分类")
        for item in group.get("patterns", []):
            if len(item) != 2:
                print(f"映射项格式应为 [原值, 替换值]：{item}", file=sys.stderr)
                sys.exit(2)
            pairs.append((item[0], item[1], cat))

    # 长的先替换，避免短前缀把长值截断
    pairs.sort(key=lambda x: len(x[0]), reverse=True)
    protected = raw.get("protected", {}).get("constants", [])
    return pairs, protected


def compile_pair(old: str) -> re.Pattern:
    """把一条映射编译成**带词边界**的正则。

    映射表里有大量 3~5 字符的短标识（user_sid、CDN 桶名）。裸 str.replace 是无边界
    子串匹配，`ZfdmA`、`1WAah` 这类短串会误伤无关文本。这里用非字母数字的环视锁定边界。
    """
    return re.compile(r"(?<![A-Za-z0-9])" + re.escape(old) + r"(?![A-Za-z0-9])")


def main() -> int:
    ap = argparse.ArgumentParser(description="确定性脱敏")
    ap.add_argument("--root", default=".")
    ap.add_argument("--map", default=DEFAULT_MAP)
    ap.add_argument("--state", default=DEFAULT_STATE, help="伪名状态文件（保证重复运行幂等）")
    ap.add_argument("--init", action="store_true", help="生成映射表模板")
    ap.add_argument("--apply", action="store_true", help="实际写盘（默认只预览）")
    ap.add_argument("--no-generic", action="store_true", help="跳过 data/ 的保形伪名化")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    args.generic = not args.no_generic

    map_path = Path(args.map)

    if args.init:
        if map_path.exists():
            print(f"映射表已存在，不覆盖：{map_path}")
            return 0
        map_path.parent.mkdir(parents=True, exist_ok=True)
        map_path.write_text(json.dumps(TEMPLATE, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"已生成映射表模板：{map_path}\n填入真实值后运行（不加 --init）。")
        return 0

    root = Path(args.root).resolve()
    state_path = Path(args.state)
    pairs, protected = load_map(map_path)
    emitted = load_state(state_path)

    # 护栏：映射表不得试图替换协议常量
    for old, _new, cat in pairs:
        if old in protected:
            print(f"拒绝：映射表试图替换受保护的协议常量 {old}（{cat}）", file=sys.stderr)
            return 2

    hits: dict[str, list[tuple[str, str, int]]] = defaultdict(list)
    total = 0
    compiled = [(old, new, cat, compile_pair(old)) for old, new, cat in pairs]

    for p in sorted(root.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in TEXT_EXT:
            continue
        rel = p.relative_to(root)
        if any(part in SKIP_DIR for part in rel.parts) or p.name in SKIP_NAME:
            continue
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue

        new_text = text
        for old, new, cat, rx in compiled:
            new_text, n = rx.subn(new, new_text)
            if n:
                hits[rel.as_posix()].append((old, cat, n))
                total += n

        # data/ 下的抓包样本额外走字段位伪名化
        if args.generic and rel.parts and rel.parts[0] == "data" and p.suffix.lower() == ".json":
            new_text, counts = pseudonymize(new_text, protected, emitted)
            for k, n in counts.items():
                if n:
                    hits[rel.as_posix()].append((k, f"伪名化-{k}", n))
                    total += n
            if p.name == "schemas.json":
                new_text, n = scrub_schema_samples(new_text, protected, emitted)
                if n:
                    hits[rel.as_posix()].append(("samples", "伪名化-schema samples", n))
                    total += n

        if new_text != text and args.apply:
            p.write_text(new_text, encoding="utf-8")

    if args.apply:
        save_state(state_path, emitted)

    if args.json:
        print(json.dumps({
            "apply": args.apply,
            "total": total,
            "files": {k: [{"desc": c, "n": n} for _o, c, n in v] for k, v in hits.items()},
        }, ensure_ascii=False, indent=2))
    else:
        mode = "已写入" if args.apply else "预览（未写盘）"
        print(f"脱敏 {mode}｜命中 {total} 处，涉及 {len(hits)} 个文件\n" + "=" * 68)
        for f, items in sorted(hits.items()):
            print(f"\n  {f}")
            for _old, cat, n in items:
                print(f"    {n:3} × {cat}")
        if not args.apply and total:
            print("\n加 --apply 实际写入。")

    return 0


if __name__ == "__main__":
    sys.exit(main())
