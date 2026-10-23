# -*- coding: utf-8 -*-
"""
云上仙都 · 非遗数字化传承与VR全景云游览 —— 后端服务

职责:
  1. 托管前端 H5 与全景素材;
  2. 提供 /api/* 接口: 场景配置、AI 导游词、关键词溯源、语音合成;
  3. 作为 AI / TTS 的"可插拔"网关 —— 配置了阿里通义千问(DashScope)与讯飞
     的 Key 时走真实大模型与语音合成; 未配置时自动降级为本地预制模板 +
     浏览器原生语音合成, 保证离线也能完整演示业务闭环。

运行:
    pip install -r requirements.txt
    python app.py
    浏览器打开 http://127.0.0.1:5000
"""
import base64
import hashlib
import hmac
import json
import os
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from email.utils import format_datetime

from flask import Flask, abort, jsonify, request, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder="static", static_url_path="/static")
app.json.ensure_ascii = False  # 让中文响应直接以 UTF-8 输出, 便于调试


# --------------------------------------------------------------------------- #
# 数据加载
# --------------------------------------------------------------------------- #
def _load_json(name):
    with open(os.path.join(BASE_DIR, "data", name), encoding="utf-8") as f:
        return json.load(f)


SCENES = _load_json("scenes.json")
KEYWORDS = _load_json("keywords.json")
GUIDES = _load_json("guides.json")
CEREMONY = _load_json("ceremony.json")
BRIDGE = _load_json("bridge.json")

_LANGS = ("zh", "en", "ja", "ko")
_AGES = ("youth", "middle", "senior")
_LANG_NAMES = {"zh": "中文", "en": "English", "ja": "日本語", "ko": "한국어"}


def _pick(d, lang):
    """按语言取值, 缺失回退英文/中文(本地模板兜底时保证不崩)。"""
    return d.get(lang) or d.get("en") or d.get("zh")


# --------------------------------------------------------------------------- #
# 配置: 读取 config.json, 环境变量优先。拿到 Key 后只需改这两处即可切换真·AI
# --------------------------------------------------------------------------- #
def load_config():
    cfg = {
        "dashscope_api_key": "",
        "dashscope_model": "qwen-plus",
        "iflytek": {"appid": "", "api_key": "", "api_secret": "", "voice_name": "xiaoyan"},
    }
    path = os.path.join(BASE_DIR, "config.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            cfg.update(json.load(f))
    cfg["dashscope_api_key"] = os.environ.get("DASHSCOPE_API_KEY", cfg["dashscope_api_key"])
    return cfg


# --------------------------------------------------------------------------- #
# 阿里通义千问 (DashScope, OpenAI 兼容接口) —— 纯标准库实现, 无需额外依赖
# --------------------------------------------------------------------------- #
def _dashscope_chat(messages, api_key, model, timeout=25):
    """调用通义千问(OpenAI 兼容接口)。出错时抛出带明确原因的 RuntimeError, 便于联调。"""
    url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    payload = json.dumps({"model": model, "messages": messages}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + api_key,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "ignore")
        raise RuntimeError("DashScope HTTP %s: %s" % (e.code, body[:300]))
    except urllib.error.URLError as e:
        raise RuntimeError("DashScope 网络错误: %s" % e.reason)

    if "choices" not in data:
        raise RuntimeError("DashScope 返回异常: %s" % json.dumps(data, ensure_ascii=False)[:300])
    return data["choices"][0]["message"]["content"]


def check_dashscope(cfg):
    """自检通义千问 Key 是否可用(供 /api/health 与脚本使用)。"""
    if not cfg["dashscope_api_key"]:
        return {"enabled": False}
    try:
        reply = _dashscope_chat(
            [{"role": "user", "content": "请只回复两个字: 正常"}],
            cfg["dashscope_api_key"], cfg["dashscope_model"], timeout=15,
        )
        return {"enabled": True, "ok": True, "model": cfg["dashscope_model"], "sample": reply[:50]}
    except Exception as e:
        return {"enabled": True, "ok": False, "model": cfg["dashscope_model"], "error": str(e)}


# --------------------------------------------------------------------------- #
# 讯飞语音合成 (HTTP REST, HMAC-SHA256 鉴权) —— 需真实 Key 联调, 未配置时跳过
# --------------------------------------------------------------------------- #
def _iflytek_tts(text, cfg, timeout=15):
    """调用讯飞在线语音合成(新版 WebSocket v2, HMAC-SHA256 鉴权)。

    返回 PCM16 音频字节; 未配置 Key 返回 None(上层降级浏览器 TTS); 配置了但失败则抛 RuntimeError(便于联调)。
    """
    if not (cfg["iflytek"]["appid"] and cfg["iflytek"]["api_key"] and cfg["iflytek"]["api_secret"]):
        return None
    try:
        import websocket  # noqa: PLC0415
    except ImportError as exc:
        raise RuntimeError("缺少 websocket-client 库, 请先执行: pip install websocket-client") from exc

    host = "tts-api.xfyun.cn"
    path = "/v2/tts"
    date = format_datetime(datetime.now(timezone.utc), usegmt=True)

    # 1) 生成 HMAC-SHA256 鉴权签名, 拼进 wss url 查询串
    signature_origin = "host: %s\ndate: %s\nGET %s HTTP/1.1" % (host, date, path)
    signature = base64.b64encode(
        hmac.new(
            cfg["iflytek"]["api_secret"].encode("utf-8"),
            signature_origin.encode("utf-8"),
            hashlib.sha256,
        ).digest()
    ).decode("utf-8")
    authorization_origin = (
        'api_key="%s", algorithm="hmac-sha256", headers="host date request-line", signature="%s"'
        % (cfg["iflytek"]["api_key"], signature)
    )
    authorization = base64.b64encode(authorization_origin.encode("utf-8")).decode("utf-8")
    query = urllib.parse.urlencode({"authorization": authorization, "date": date, "host": host})
    url = "wss://%s%s?%s" % (host, path, query)

    # 2) 组装请求体(文本 base64, status=2 表示一次性合成)
    request_body = {
        "common": {"app_id": cfg["iflytek"]["appid"]},
        "business": {
            "aue": "raw",
            "auf": "audio/L16;rate=16000",
            "vcn": cfg["iflytek"].get("voice_name", "xiaoyan"),
            "tte": "UTF8",
            "speed": 50,
            "volume": 50,
            "pitch": 50,
            "bgs": 0,
            "reg": "0",
            "rdn": "0",
        },
        "data": {
            "status": 2,
            "text": base64.b64encode(text.encode("utf-8")).decode("utf-8"),
        },
    }

    # 3) 收发
    ws = websocket.WebSocket()
    ws.connect(url, timeout=timeout)
    try:
        ws.send(json.dumps(request_body))
        chunks = []
        while True:
            msg = ws.recv()
            if msg is None:
                break
            if isinstance(msg, bytes):
                msg = msg.decode("utf-8", "ignore")
            obj = json.loads(msg)
            if obj.get("code", 0) != 0:
                raise RuntimeError(
                    "讯飞TTS返回错误 code=%s: %s" % (obj.get("code"), obj.get("message", obj.get("desc", "")))
                )
            d = obj.get("data") or {}
            audio_b64 = d.get("audio", "")
            if audio_b64:
                chunks.append(base64.b64decode(audio_b64))
            if d.get("status") == 2:
                break
    finally:
        ws.close()

    audio = b"".join(chunks)
    return audio if audio else None


# --------------------------------------------------------------------------- #
# 业务逻辑: 导游词生成 / 关键词溯源 (大模型优先, 本地模板兜底)
# --------------------------------------------------------------------------- #
def _find_scene(scene_id):
    for s in SCENES["scenes"]:
        if s["id"] == scene_id:
            return s
    return SCENES["scenes"][0]


def _llm_guide(scene, age_style, lang, cfg):
    lang_name = _LANG_NAMES.get(lang, "中文")
    system = (
        f"你是一位精通中国传统文化与缙云仙都景区非遗的资深导游。"
        f"请面向「{_pick(age_style['label'], lang)}」的游客讲解, 风格要求: {age_style['tone']}。"
        f"请用{lang_name}输出, 语言清楚、客观、便于听读, 不使用宣传口号, 篇幅150字左右。"
        f"以下是你需要讲解的景点事实(可润色但不要编造史实):\n{_pick(scene['guide'], lang)}"
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": f"请为景点「{_pick(scene['name'], lang)}」生成一段导游讲解词。"},
    ]
    return _dashscope_chat(messages, cfg["dashscope_api_key"], cfg["dashscope_model"])


def _llm_explain(kw, lang, cfg):
    lang_name = _LANG_NAMES.get(lang, "中文")
    system = (
        f"你是一位跨文化传播专家, 擅长向外国游客/年轻群体通俗易懂地解释中国非遗词汇。"
        f"请用{lang_name}输出, 先给出核心释义, 再用目标人群熟悉的文化做类比, "
        f"最后补充背景典故。要通俗、准确、杜绝编造史实。"
        f"参考素材:\n词条:{_pick(kw['term'], lang)}\n释义:{_pick(kw['definition'], lang)}"
        f"\n类比:{_pick(kw['analogy'], lang)}\n延伸:{_pick(kw['extended'], lang)}"
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": f"请溯源解释非遗关键词「{_pick(kw['term'], lang)}」。"},
    ]
    return _dashscope_chat(messages, cfg["dashscope_api_key"], cfg["dashscope_model"])


def compose_guide(scene_id, age, lang):
    scene = _find_scene(scene_id)
    age_style = GUIDES["ages"].get(age, GUIDES["ages"]["middle"])
    cfg = load_config()

    if cfg["dashscope_api_key"]:
        try:
            return _llm_guide(scene, age_style, lang, cfg), "llm"
        except Exception as exc:  # 大模型异常时静默降级本地模板
            app.logger.warning("LLM guide failed, fallback to local: %s", exc)

    text = "%s\n\n%s\n\n%s" % (
        _pick(age_style["opener"], lang),
        _pick(scene["guide"], lang),
        _pick(age_style["closer"], lang),
    )
    return text, "local"


def explain_keyword(keyword, lang):
    kw = KEYWORDS["keywords"].get(keyword)
    if not kw:
        return None
    cfg = load_config()

    if cfg["dashscope_api_key"]:
        try:
            return _llm_explain(kw, lang, cfg), "llm"
        except Exception as exc:
            app.logger.warning("LLM explain failed, fallback to local: %s", exc)

    text = "%s（%s）\n\n%s\n\n%s\n\n%s" % (
        _pick(kw["term"], lang),
        kw["pinyin"],
        _pick(kw["definition"], lang),
        _pick(kw["analogy"], lang),
        _pick(kw["extended"], lang),
    )
    return text, "local"


# --------------------------------------------------------------------------- #
# 自由问答 (AI 导游答疑)
# --------------------------------------------------------------------------- #
def _keyword_context(lang):
    """把词库拼成上下文, 喂给大模型防止其瞎编史实。"""
    lines = []
    for kw in KEYWORDS["keywords"].values():
        lines.append("%s: %s" % (_pick(kw["term"], lang), _pick(kw["definition"], lang)))
    return "\n".join(lines)


def _llm_ask(question, lang, cfg):
    lang_name = _LANG_NAMES.get(lang, "中文")
    system = (
        "你是「云上仙都」景区的AI导游, 精通仙都非遗与黄帝文化。请用%s回答游客的问题, "
        "语言通俗、亲切、准确。只依据下面提供的词库知识回答, 不知道就说不知道, "
        "不要编造具体年代、排名或史实。\n参考词库:\n%s" % (lang_name, _keyword_context(lang))
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": question},
    ]
    return _dashscope_chat(messages, cfg["dashscope_api_key"], cfg["dashscope_model"])


_ASK_FALLBACK = {
    "zh": "这个问题我得再请教更专业的老师～您也可以试着问我词库里有的词，比如「祭祀」「礼乐」「轩辕黄帝」。",
    "en": "Let me ask a more expert teacher for this one. You can also try asking about terms like 'Sacrificial Rite', 'Rites and Music', or the 'Yellow Emperor'.",
    "ja": "この質問はさらに専門の先生に伺います～「祭祀」「礼楽」「黄帝」など、詞庫にある言葉をお試しください。",
    "ko": "이 질문은 더 전문적인 선생님께 여쭤볼게요~ '제사(祭祀)', '예악(礼乐)', '황제(黄帝)' 같은 용어를 시도해 보세요.",
}


def _local_ask(question, lang):
    """无大模型时的本地兜底: 命中词库则返回释义, 否则给引导语。"""
    question = unicodedata.normalize("NFKC", question).casefold()
    question = " ".join(question.split())
    matches = []
    for kw in KEYWORDS["keywords"].values():
        for name in kw["term"].values():
            name = unicodedata.normalize("NFKC", name).casefold()
            # 同时识别完整词名和括号中的别名, 如 Yellow Emperor (Xuanyuan)。
            terms = [name] + re.split(r"[()/]", name)
            for term in terms:
                term = " ".join(term.split())
                if not term:
                    continue
                if term.isascii():
                    found = re.search(r"(?<!\w)" + re.escape(term) + r"(?!\w)", question)
                else:
                    found = term in question
                if found:
                    matches.append((len(term), kw))
    if matches:
        kw = max(matches, key=lambda match: match[0])[1]
        return "%s\n\n%s" % (_pick(kw["definition"], lang), _pick(kw["analogy"], lang))
    return _ASK_FALLBACK.get(lang, _ASK_FALLBACK["zh"])


# --------------------------------------------------------------------------- #
# 页面与 API 路由
# --------------------------------------------------------------------------- #
@app.errorhandler(400)
def bad_request(error):
    if request.path.startswith("/api/"):
        return jsonify({"error": error.description}), 400
    return error


def _json_body():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        abort(400, description="request body must be a JSON object")
    return body


def _string_field(body, name, default="", max_length=80, required=False):
    value = body.get(name, default)
    if not isinstance(value, str):
        abort(400, description="%s must be a string" % name)
    value = value.strip()
    if len(value) > max_length:
        abort(400, description="%s must be at most %d characters" % (name, max_length))
    if required and not value:
        abort(400, description="empty %s" % name)
    return value


def _choice_field(body, name, choices, default):
    value = _string_field(body, name, default, max_length=16)
    if value not in choices:
        abort(400, description="unsupported %s" % name)
    return value


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.get("/api/health")
def health():
    cfg = load_config()
    return jsonify({
        "ok": True,
        "llm": check_dashscope(cfg),
        "tts_enabled": bool(cfg["iflytek"]["appid"] and cfg["iflytek"]["api_key"] and cfg["iflytek"]["api_secret"]),
    })


@app.get("/api/config")
def api_config():
    return jsonify({
        "title": SCENES["title"],
        "scenes": SCENES["scenes"],
        "keywords": KEYWORDS["keywords"],
        "ages": GUIDES["ages"],
        "ceremony": CEREMONY["ceremony"],
        "bridge": BRIDGE,
        "defaults": {"age": "middle", "lang": "zh"},
    })


@app.post("/api/guide")
def api_guide():
    body = _json_body()
    scene_id = _string_field(body, "scene_id", SCENES["scenes"][0]["id"])
    age = _choice_field(body, "age", _AGES, "middle")
    lang = _choice_field(body, "lang", _LANGS, "zh")
    if not any(scene["id"] == scene_id for scene in SCENES["scenes"]):
        return jsonify({"error": "scene not found"}), 404
    text, mode = compose_guide(scene_id, age, lang)
    return jsonify({"text": text, "mode": mode, "scene_id": scene_id, "age": age, "lang": lang})


@app.post("/api/explain")
def api_explain():
    body = _json_body()
    keyword = _string_field(body, "keyword", required=True)
    lang = _choice_field(body, "lang", _LANGS, "zh")
    result = explain_keyword(keyword, lang)
    if result is None:
        return jsonify({"error": "keyword not found"}), 404
    text, mode = result
    kw = KEYWORDS["keywords"][keyword]
    return jsonify({
        "text": text,
        "mode": mode,
        "term": _pick(kw["term"], lang),
        "pinyin": kw["pinyin"],
        "category": kw["category"],
    })


@app.post("/api/ask")
def api_ask():
    """AI 导游自由问答: 大模型回答, 无 Key 时本地词库兜底。"""
    body = _json_body()
    question = _string_field(body, "question", max_length=120, required=True)
    lang = _choice_field(body, "lang", _LANGS, "zh")

    cfg = load_config()
    if cfg["dashscope_api_key"]:
        try:
            return jsonify({"answer": _llm_ask(question, lang, cfg), "mode": "llm"})
        except Exception as exc:
            app.logger.warning("LLM ask failed, fallback to local: %s", exc)
    return jsonify({"answer": _local_ask(question, lang), "mode": "local"})


@app.post("/api/tts")
def api_tts():
    """语音合成: 讯飞优先, 失败/未配置降级为浏览器原生 TTS(由前端 speechSynthesis 播报)。"""
    body = _json_body()
    text = _string_field(body, "text", max_length=8000, required=True)
    lang = _choice_field(body, "lang", _LANGS, "zh")

    # 讯飞 xiaoyan 仅支持中/英; 日/韩语走浏览器原生 TTS(发音更准)
    if lang in ("ja", "ko"):
        return jsonify({"mode": "browser", "text": text, "lang": lang})
    cfg = load_config()
    try:
        audio = _iflytek_tts(text, cfg)
    except Exception as exc:  # 讯飞失败时降级浏览器 TTS, 不中断体验
        app.logger.warning("iflytek tts failed, fallback to browser: %s", exc)
        audio = None
    if audio is not None:
        return jsonify({
            "mode": "audio",
            "mime": "audio/L16;rate=16000",
            "audio": base64.b64encode(audio).decode("utf-8"),
        })
    return jsonify({"mode": "browser", "text": text, "lang": lang})


if __name__ == "__main__":
    # host=0.0.0.0 便于手机在同一局域网扫码/访问演示
    app.run(host="0.0.0.0", port=5000, debug=False)
