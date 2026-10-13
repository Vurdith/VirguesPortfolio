"""Builds public/og-chat.gif, the animated link preview for /chat.

Takes the still card (the /chat card rendered without an icon, 1200x630) and animates it: the title
types itself in behind a caret, the line under it fades up, then a speech bubble's dots bounce as if
the assistant were typing.

    python scripts/og-chat-card.py base.png public/og-chat.gif
"""

import math
import sys

from PIL import Image, ImageDraw

W, H = 1200, 630
BG = (10, 10, 11)
INK = (244, 244, 242)
SS = 4  # the bubble is drawn this many times larger, then scaled down, so its edges are smooth

TITLE = (96, 318, 740, 452)  # the box the title sits in
LINE = (96, 456, 800, 548)  # the sentence under it
STEP_MS = 50
TYPE_FRAMES, SETTLE_FRAMES, DOT_FRAMES = 22, 8, 48

BUBBLE = (898, 352, 1092, 486)
RADIUS, STROKE = 46, 7


def bubble(lift: list[float], show: float) -> Image.Image:
    """The speech bubble with its three dots, each raised by `lift` (0 to 1). `show` fades it in."""
    layer = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = (v * SS for v in BUBBLE)
    s, r = STROKE * SS, RADIUS * SS
    tail = [(x0 + 34 * SS, y1 - 6 * SS), (x0 + 14 * SS, y1 + 40 * SS), (x0 + 84 * SS, y1 - 6 * SS)]
    inner_tail = [(x0 + 43 * SS, y1 - 8 * SS), (x0 + 27 * SS, y1 + 25 * SS), (x0 + 70 * SS, y1 - 8 * SS)]
    draw.polygon(tail, fill=INK + (255,))
    draw.rounded_rectangle((x0, y0, x1, y1), r, fill=INK + (255,))
    draw.rounded_rectangle((x0 + s, y0 + s, x1 - s, y1 - s), r - s, fill=BG + (255,))
    draw.polygon(inner_tail, fill=BG + (255,))
    cy = (y0 + y1) / 2
    for i, up in enumerate(lift):
        cx = (x0 + x1) / 2 + (i - 1) * 44 * SS
        y = cy - up * 13 * SS
        radius = 9 * SS
        shade = int(120 + 135 * up)
        draw.ellipse((cx - radius, y - radius, cx + radius, y + radius), fill=(shade, shade, shade, 255))
    layer = layer.resize((W, H), Image.LANCZOS)
    if show < 1:
        layer.putalpha(layer.getchannel("A").point(lambda a: int(a * show)))
    return layer


def frame(base: Image.Image, blank: Image.Image, index: int) -> Image.Image:
    image = blank.copy()
    draw = ImageDraw.Draw(image)
    tx0, ty0, tx1, ty1 = TITLE

    typed = min(1.0, index / TYPE_FRAMES)
    edge = tx0 + int((tx1 - tx0) * (1 - (1 - typed) ** 1.6))
    image.paste(base.crop((tx0, ty0, edge, ty1)), (tx0, ty0))

    after = index - TYPE_FRAMES
    if after < 0 or (after // 10) % 2 == 0:
        caret = min(edge + 6, tx1 - 16) if typed < 1 else 728
        draw.rectangle((caret, ty0 + 22, caret + 5, ty1 - 28), fill=INK)

    settle = max(0.0, min(1.0, after / SETTLE_FRAMES))
    if settle > 0:
        image.paste(Image.blend(blank.crop(LINE), base.crop(LINE), settle), LINE[:2])
        dots = max(0, after - SETTLE_FRAMES)
        lift = [max(0.0, math.sin((dots / 16 - i * 0.16) * 2 * math.pi)) for i in range(3)]
        layer = bubble(lift, settle)
        image.paste(layer, (0, 0), layer)
    return image


def main(source: str, target: str) -> None:
    base = Image.open(source).convert("RGB")
    assert base.size == (W, H), base.size
    # The same card with the title and the line wiped, rebuilt from the grid beside them.
    blank = base.copy()
    for box in (TITLE, LINE):
        x0, y0, x1, y1 = box
        for y in range(y0, y1):
            row = base.crop((820, y, 880, y + 1)).resize((x1 - x0, 1), Image.NEAREST)
            blank.paste(row, (x0, y))
        for x in range(x0, x1):
            if base.getpixel((x, 300)) != base.getpixel((x - 1, 300)) or base.getpixel((x, 300))[0] > 16:
                blank.paste(base.crop((x, 290, x + 1, 291)).resize((1, y1 - y0)), (x, y0))

    total = TYPE_FRAMES + SETTLE_FRAMES + DOT_FRAMES
    frames = [frame(base, blank, i).quantize(colors=64, method=Image.MEDIANCUT, dither=Image.NONE) for i in range(total)]
    # Start on the finished card: places that do not animate GIFs show only the first frame.
    start = TYPE_FRAMES + SETTLE_FRAMES
    frames = frames[start:] + frames[:start]
    frames[0].save(target, save_all=True, append_images=frames[1:], duration=STEP_MS, loop=0, optimize=True, disposal=1)
    print(target, total, "frames")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
