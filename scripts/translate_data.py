# -*- coding: utf-8 -*-
"""用通义千问把 data/*.json 里的中文内容翻译成日文/韩文, 补齐多语言内容。

遍历所有形如 {"zh": ..., "en": ...} 的双语字段, 为缺 ja/ko 的字段批量补上译文。
用法: python scripts/translate_data.py   (需 config.json 已配 dashscope_api_key)
"""
import json
import os
import sys
import time

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)
import app  # noqa: E402

DATA_FILES = ["scenes.json", "keywords.json", "guides.json", "ceremony.json", "bridge.json"]
BATCH = 12


def find_translatable(obj):
    out = []
    if isinstance(obj, dict):
        if isinstance(obj.get("zh"), str) and isinstance(obj.get("en"), str):
            out.append(obj)
        else:
            for v in obj.values():
                out += find_translatable(v)
    elif isinstance(obj, list):
        for v in obj:
            out += find_translatable(v)
    return out


def translate_batch(texts, lang_name, cfg):
    lines = "\n".join(texts)
    prompt = (
        "请把下面每一行中文都翻译成%s，每行输出一个对应译文，"
        "保持行数一致，不要加编号、不要解释、不要输出任何其它文字：\n%s" % (lang_name, lines)
    )
    reply = app._dashscope_chat(
        [{"role": "user", "content": prompt}],
        cfg["dashscope_api_key"], cfg["dashscope_model"], timeout=60,
    )
    return [ln.strip() for ln in reply.strip().split("\n") if ln.strip()]


def main():
    cfg = app.load_config()
    if not cfg["dashscope_api_key"]:
        print("未配置 dashscope_api_key, 无法翻译。")
        return

    for fname in DATA_FILES:
        path = os.path.join(BASE, "data", fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        trans = find_translatable(data)
        for lang_code, lang_name in [("ja", "日语"), ("ko", "韩语")]:
            need = [d for d in trans if not d.get(lang_code)]
            done = 0
            for i in range(0, len(need), BATCH):
                batch = need[i:i + BATCH]
                texts = [d["zh"] for d in batch]
                ok = False
                for _ in range(3):
                    try:
                        got = translate_batch(texts, lang_name, cfg)
                        if len(got) == len(texts):
                            for d, g in zip(batch, got):
                                d[lang_code] = g
                            ok = True
                            break
                    except Exception as e:  # noqa: BLE001
                        time.sleep(1)
                done += len(batch) if ok else 0
                print("  %s %s %d/%d" % (fname, lang_code, min(i + BATCH, len(need)), len(need)))
                time.sleep(0.3)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print("已写入", fname)
    print("全部完成。")


if __name__ == "__main__":
    main()
