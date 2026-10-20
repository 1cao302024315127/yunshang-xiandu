# -*- coding: utf-8 -*-
"""生成占位等距柱状全景图 (equirectangular placeholder panoramas)。

在拿到仙都实拍全景图之前，用本脚本离线生成 360° 占位图，保证演示离线可跑。
后续替换真实素材时，只需把 static/assets/panoramas/ 下的同名文件替换掉即可，
代码零改动（全景渲染、热点都通过 scenes.json 配置驱动）。

用法:
    python scripts/generate_panoramas.py
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 2048, 1024
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "assets", "panoramas")

# 场景: (文件名, 中文名, 英文名, 天空主色, 地面主色)
SCENES = [
    ("dinghu_peak",  "鼎湖峰", "Dinghu Peak",  (66, 120, 190), (70, 130, 70)),
    ("huangdi_temple", "黄帝祠宇", "Huangdi Ancestral Temple", (80, 110, 175), (88, 105, 72)),
    ("jidian_square", "轩辕祭典广场", "Xuanyuan Ceremony Square", (95, 100, 160), (120, 105, 80)),
]


def find_font(size):
    """尝试加载中文字体，找不到则用默认字体。"""
    candidates = [
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/msyhbd.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/simsun.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def lerp(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def draw_sky(img, draw, top, mid, horizon):
    """天空纵向渐变 + 太阳光晕。"""
    for y in range(0, horizon):
        t = y / max(1, horizon)
        # 上深下浅，接近地平线偏暖
        color = lerp(top, mid, t)
        draw.line([(0, y), (W, y)], fill=color)

    # 太阳光晕
    cx, cy = int(W * 0.28), int(H * 0.30)
    for r, alpha in [(120, 40), (80, 70), (45, 110)]:
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 240, 200, alpha))
        img.alpha_composite(glow)
    draw.ellipse([cx - 22, cy - 22, cx + 22, cy + 22], fill=(255, 250, 230))


def draw_mountains(draw, horizon, color):
    """远山剪影（用正弦折线模拟山脊）。"""
    for k in range(2):
        base = horizon + 40 + k * 90
        amp = 60 + k * 30
        phase = k * 1.7
        pts = []
        for x in range(0, W + 1, 8):
            y = base - abs(math.sin(x / 320.0 + phase)) * amp
            pts.append((x, y))
        pts += [(W, H), (0, H)]
        draw.polygon(pts, fill=color)


def draw_ground(img, draw, horizon, bottom):
    for y in range(horizon, H):
        t = (y - horizon) / max(1, H - horizon)
        color = lerp(bottom, tuple(int(c * 0.72) for c in bottom), t)
        draw.line([(0, y), (W, y)], fill=color)


def draw_label(img, draw, name_zh, name_en):
    """在赤道带绘制文字标签，避免极点畸变。"""
    font_big = find_font(90)
    font_small = find_font(40)
    cy = int(H * 0.52)
    box_w, box_h = 980, 220
    x0, y0 = (W - box_w) // 2, cy - box_h // 2
    draw.rounded_rectangle([x0, y0, x0 + box_w, y0 + box_h],
                           radius=24, fill=(0, 0, 0, 0))
    # 半透明底
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rounded_rectangle([x0, y0, x0 + box_w, y0 + box_h],
                         radius=24, fill=(10, 20, 30, 150))
    img.alpha_composite(overlay)

    w1 = draw.textlength(name_zh, font=font_big)
    w2 = draw.textlength(name_en, font=font_small)
    draw.text(((W - w1) // 2, y0 + 20), name_zh, font=font_big, fill=(255, 255, 255))
    draw.text(((W - w2) // 2, y0 + 130), name_en, font=font_small, fill=(220, 230, 245))

    note = "占位全景图 · 待替换实拍素材 (Placeholder panorama)"
    font_note = find_font(26)
    wn = draw.textlength(note, font=font_note)
    draw.text(((W - wn) // 2, y0 + box_h + 24), note, font=font_note, fill=(245, 245, 245))


def generate():
    os.makedirs(OUT_DIR, exist_ok=True)
    for fname, zh, en, sky, ground in SCENES:
        img = Image.new("RGBA", (W, H))
        draw = ImageDraw.Draw(img, "RGBA")
        horizon = int(H * 0.46)
        sky_mid = lerp(sky, (235, 210, 175), 0.55)
        draw_sky(img, draw, sky, sky_mid, horizon)
        draw_mountains(draw, horizon, (60, 90, 60))
        draw_ground(img, draw, horizon, ground)
        draw_label(img, draw, zh, en)

        path = os.path.join(OUT_DIR, fname + ".jpg")
        img.convert("RGB").save(path, "JPEG", quality=82)
        print("生成:", path)


if __name__ == "__main__":
    generate()
