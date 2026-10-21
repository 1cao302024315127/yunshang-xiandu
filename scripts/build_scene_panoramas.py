# -*- coding: utf-8 -*-
"""把竖版实景照片加工成 2:1 等距柱状"伪全景图"。

原理: 中间放清晰实景照片(满高、居中、左右羽化), 四周铺一层模糊变暗的同图光晕,
      最外层是水平均匀的环境渐变背景 —— 保证 360° 环绕处无接缝, 拖拽旋转时有
      沉浸的"空间感"。待拿到真 360° 实拍全景图后, 直接替换 static/assets/panoramas/
      下的同名文件即可, 代码零改动。

用法:
    python scripts/build_scene_panoramas.py

注意: 下方 SOURCE_MAP 的映射(哪张源图对应哪个景点)如与实际不符, 改这里重跑即可。
"""
import os
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

BASE = os.path.join(os.path.dirname(__file__), "..")
SRC_DIR = os.path.join(BASE, "static", "assets", "panoramas", "source")
OUT_DIR = os.path.join(BASE, "static", "assets", "panoramas")

W, H = 2048, 1024

# 源图 -> 景点 id (默认映射, 待用户确认后可改)
SOURCE_MAP = {
    "dingzi_bridge": "src1.jpg",      # 丁字桥
    "yantuo_bookstore": "src2.jpg",   # 岩拓书店
    "huangdi_temple": "src3.jpg",     # 黄帝祠宇(轩辕祭主场景)
}


def lerp(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def build(scene_id, src_name):
    src = os.path.join(SRC_DIR, src_name)
    dst = os.path.join(OUT_DIR, scene_id + ".jpg")
    photo = ImageOps.exif_transpose(Image.open(src)).convert("RGB")

    # 1) 背景: 竖向环境渐变(水平均匀 -> 360° 环绕无接缝)
    bg = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(bg)
    top, mid, bot = (24, 30, 46), (44, 50, 64), (30, 26, 24)
    for y in range(H):
        t = y / H
        c = lerp(top, mid, t * 2) if t < 0.5 else lerp(mid, bot, (t - 0.5) * 2)
        d.line([(0, y), (W, y)], fill=c)

    # 2) 光晕: 模糊放大版照片, 居中铺底, 压暗
    halo = photo.copy()
    halo.thumbnail((int(W * 0.9), int(H * 1.25)), Image.LANCZOS)
    halo = halo.filter(ImageFilter.GaussianBlur(50))
    halo = ImageEnhance.Brightness(halo).enhance(0.55)
    hw, hh = halo.size
    bg.paste(halo, ((W - hw) // 2, (H - hh) // 2))

    # 3) 前景: 清晰照片等比满高、居中、左右羽化
    fg = photo.copy()
    fg.thumbnail((W, H), Image.LANCZOS)
    fw, fh = fg.size
    mask = Image.new("L", (fw, fh), 255)
    md = ImageDraw.Draw(mask)
    feather = min(140, fw // 3)
    for x in range(feather):
        a = int(255 * x / feather)
        md.line([(x, 0), (x, fh)], fill=a)
        md.line([(fw - 1 - x, 0), (fw - 1 - x, fh)], fill=a)
    bg.paste(fg, ((W - fw) // 2, (H - fh) // 2), mask)

    bg.save(dst, "JPEG", quality=88)
    print("生成:", os.path.relpath(dst, BASE))


def build_preview(scene_id):
    """生成低清模糊预览图(进入场景时先显示, 再渐显高清)。"""
    src = os.path.join(OUT_DIR, scene_id + ".jpg")
    dst = os.path.join(OUT_DIR, scene_id + "_preview.jpg")
    img = Image.open(src).convert("RGB")
    img = img.resize((512, 256), Image.LANCZOS)
    img = img.filter(ImageFilter.GaussianBlur(6))
    img.save(dst, "JPEG", quality=58)
    print("预览:", os.path.relpath(dst, BASE))


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    for scene_id, src_name in SOURCE_MAP.items():
        build(scene_id, src_name)
        build_preview(scene_id)
    print("完成。")
