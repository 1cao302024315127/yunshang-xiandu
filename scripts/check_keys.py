# -*- coding: utf-8 -*-
"""自检 config.json 中的通义千问 / 讯飞 Key 是否可用。

用法:
    python scripts/check_keys.py

在填写 config.json 的 Key 之后运行本脚本, 可明确看到每个 Key 的连通状态
与失败原因(Key 无效 / 欠费 / 网络 / 模型名错误等), 避免"配了 Key 却静默回退"。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import app  # noqa: E402


def main():
    cfg = app.load_config()

    print("=" * 56)
    print("通义千问 (阿里百炼 DashScope)")
    print("=" * 56)
    if not cfg["dashscope_api_key"]:
        print("[未配置] 请在 config.json 的 dashscope_api_key 填入 API-KEY")
    else:
        r = app.check_dashscope(cfg)
        if r.get("ok"):
            print("[可用] 模型 %s 连通正常" % r["model"])
            print("       返回示例: %s" % r["sample"])
        else:
            print("[失败] 模型 %s" % r.get("model"))
            print("       原因: %s" % r.get("error"))

    print()
    print("=" * 56)
    print("讯飞语音合成 TTS")
    print("=" * 56)
    if not (cfg["iflytek"]["appid"] and cfg["iflytek"]["api_key"]):
        print("[未配置] 请在 config.json 的 iflytek 填入 appid / api_key / api_secret")
    else:
        try:
            audio = app._iflytek_tts("测试语音", cfg)
            if audio:
                print("[可用] 返回音频 %d 字节" % len(audio))
            else:
                print("[失败] 未返回音频(鉴权失败或服务异常)")
        except Exception as e:  # noqa: BLE001
            print("[失败] %s" % e)

    print()
    print("检测完成。Key 通过后, 重启后端即自动切换为真·大模型模式;")


if __name__ == "__main__":
    main()
