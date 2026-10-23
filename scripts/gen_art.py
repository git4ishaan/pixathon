"""Procedural pixel art for the props and room background Ishaan has not drawn yet."""
import os
import sys
from PIL import Image, ImageDraw

OUT = sys.argv[1]

INK = (23, 19, 31, 255)
PAPER = (245, 232, 200, 255)
LAMP = (242, 184, 75, 255)
DANGER = (198, 74, 74, 255)
MUTED = (142, 132, 149, 255)
BRASS = (176, 141, 60, 255)
BRASS_D = (122, 94, 36, 255)
BRASS_L = (224, 190, 100, 255)
WOOD = (110, 70, 48, 255)
WOOD_D = (72, 44, 32, 255)
WOOD_L = (150, 100, 66, 255)
STALE = (214, 196, 150, 255)
SHADOW = (0, 0, 0, 90)


def canvas(w=48, h=48):
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def rect(d, x0, y0, x1, y1, fill):
    d.rectangle([x0, y0, x1, y1], fill=fill)


def outline(d, x0, y0, x1, y1, fill):
    d.rectangle([x0, y0, x1, y1], outline=fill)


# 3x5 digit font for tiny numbers
FONT = {
    '2': ['111', '001', '111', '100', '111'],
    '1': ['010', '110', '010', '010', '111'],
    '5': ['111', '100', '111', '001', '111'],
    '7': ['111', '001', '010', '010', '010'],
    'A': ['010', '101', '111', '101', '101'],
    'D': ['110', '101', '101', '101', '110'],
    'M': ['101', '111', '111', '101', '101'],
    'I': ['111', '010', '010', '010', '111'],
    'T': ['111', '010', '010', '010', '010'],
}


def text(d, x, y, s, fill):
    for ch in s:
        for r, row in enumerate(FONT[ch]):
            for c, bit in enumerate(row):
                if bit == '1':
                    d.point((x + c, y + r), fill=fill)
        x += 4


def shadow(d, x0, y0, x1, y1):
    rect(d, x0, y0, x1, y1, SHADOW)


def calendar():
    img, d = canvas()
    shadow(d, 8, 43, 40, 45)
    # stale May page peeking out behind, tilted by offset
    rect(d, 11, 5, 40, 38, STALE)
    outline(d, 11, 5, 40, 38, (150, 130, 90, 255))
    for x in range(14, 38, 5):
        d.point((x, 9), fill=(150, 130, 90, 255))
    # current June page
    rect(d, 7, 8, 36, 42, PAPER)
    outline(d, 7, 8, 36, 42, INK)
    rect(d, 7, 8, 36, 15, DANGER)
    outline(d, 7, 8, 36, 15, INK)
    # binding holes
    for x in (13, 21, 29):
        rect(d, x, 5, x + 1, 9, MUTED)
        d.point((x, 5), fill=INK)
    # day grid
    for r in range(4):
        for c in range(6):
            x, y = 10 + c * 4, 19 + r * 5
            rect(d, x, y, x + 2, y + 2, (225, 212, 180, 255))
    # the 21st circled in red, the sort of note someone leaves
    rect(d, 22, 29, 25, 32, DANGER)
    rect(d, 23, 30, 24, 31, PAPER)
    # torn bottom-right corner
    for i, (x, y) in enumerate([(33, 39), (34, 40), (35, 41), (36, 42), (34, 42), (35, 40)]):
        d.point((x, y), fill=(0, 0, 0, 0))
    return img


def radio():
    img, d = canvas()
    shadow(d, 5, 42, 43, 44)
    # antenna
    d.line([(34, 12), (40, 3)], fill=MUTED)
    d.point((40, 2), fill=PAPER)
    # body
    rect(d, 5, 14, 42, 41, WOOD)
    outline(d, 5, 14, 42, 41, INK)
    rect(d, 6, 15, 41, 17, WOOD_L)
    rect(d, 6, 39, 41, 40, WOOD_D)
    # speaker grille
    rect(d, 9, 20, 24, 36, INK)
    for y in range(21, 36, 2):
        d.line([(10, y), (23, y)], fill=MUTED)
    # tuning window and dial
    rect(d, 28, 20, 39, 26, PAPER)
    outline(d, 28, 20, 39, 26, INK)
    d.line([(33, 21), (33, 25)], fill=DANGER)
    for x in range(29, 39, 3):
        d.point((x, 25), fill=INK)
    # knobs
    for cx in (31, 37):
        rect(d, cx - 2, 30, cx + 2, 34, BRASS)
        outline(d, cx - 2, 30, cx + 2, 34, INK)
        d.point((cx, 31), fill=INK)
    # little status light
    rect(d, 40, 36, 41, 37, DANGER)
    # feet
    rect(d, 8, 42, 11, 43, INK)
    rect(d, 36, 42, 39, 43, INK)
    return img


def ticket():
    img, d = canvas()
    shadow(d, 7, 41, 41, 43)
    # ticket body (drawn slightly crooked via a manual offset on the right half)
    rect(d, 6, 14, 41, 37, PAPER)
    outline(d, 6, 14, 41, 37, INK)
    # perforation notches left and right
    for y in range(18, 36, 4):
        d.point((6, y), fill=(0, 0, 0, 0))
        d.point((41, y), fill=(0, 0, 0, 0))
    # stub divider (dashed)
    for y in range(15, 37, 2):
        d.point((30, y), fill=MUTED)
    # ADMIT 21
    text(d, 9, 17, 'ADMIT', INK)
    text(d, 9, 25, '21', DANGER)
    rect(d, 9, 33, 26, 34, MUTED)
    # stub side: a smudged date
    rect(d, 33, 18, 39, 22, (225, 212, 180, 255))
    rect(d, 33, 25, 39, 27, (200, 180, 140, 255))
    rect(d, 34, 30, 38, 33, MUTED)
    # coffee ring smudge
    for x, y in [(35, 28), (36, 28), (37, 29), (37, 30), (36, 31), (35, 31), (34, 30), (34, 29)]:
        d.point((x, y), fill=(168, 120, 70, 255))
    return img


def plaque():
    img, d = canvas()
    shadow(d, 5, 40, 43, 42)
    rect(d, 4, 9, 43, 38, BRASS_D)
    rect(d, 5, 10, 42, 37, BRASS)
    outline(d, 4, 9, 43, 38, INK)
    # bevel
    d.line([(6, 11), (41, 11)], fill=BRASS_L)
    d.line([(6, 11), (6, 36)], fill=BRASS_L)
    d.line([(7, 36), (41, 36)], fill=BRASS_D)
    # rivets
    for x, y in [(7, 12), (40, 12), (7, 34), (40, 34)]:
        rect(d, x, y, x + 1, y + 1, BRASS_L)
    # engraved text lines
    rect(d, 12, 15, 35, 16, INK)
    rect(d, 14, 19, 33, 19, BRASS_D)
    rect(d, 10, 22, 37, 22, BRASS_D)
    rect(d, 10, 25, 37, 25, BRASS_D)
    rect(d, 10, 28, 30, 28, BRASS_D)
    rect(d, 10, 31, 34, 31, BRASS_D)
    # a dated inscription at the bottom
    return img


def glow_of(img):
    """Lamp-colored halo around the opaque pixels, drawn under the original sprite."""
    w, h = img.size
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = img.load()
    po = out.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 120:
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] <= 120:
                            po[nx, ny] = (LAMP[0], LAMP[1], LAMP[2], 255)
    out.alpha_composite(img)
    return out


def room_bg():
    w, h = 170, 119
    img = Image.new('RGBA', (w, h), (33, 27, 46, 255))
    d = ImageDraw.Draw(img)
    ov = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    WALL = (38, 30, 52, 255)
    WALL_D = (30, 24, 42, 255)
    STRIPE = (44, 35, 60, 255)
    FLOOR_A = (46, 38, 62, 255)
    FLOOR_B = (34, 28, 46, 255)
    # back wall with faint wallpaper stripes
    rect(d, 0, 0, w - 1, 70, WALL)
    for x in range(0, w, 8):
        rect(d, x, 0, x + 3, 70, STRIPE)
    # ceiling band and lamps
    rect(d, 0, 0, w - 1, 6, WALL_D)
    d.line([(0, 7), (w - 1, 7)], fill=BRASS_D)
    for lx in (28, 85, 142):
        d.line([(lx, 0), (lx, 5)], fill=MUTED)
        rect(d, lx - 4, 5, lx + 4, 7, BRASS)
        rect(d, lx - 3, 8, lx + 3, 9, LAMP)
        # warm cone of light on the wall
        for i in range(10):
            span = 3 + i
            c = (242, 184, 75, max(4, 34 - i * 3))
            rect(od, lx - span, 10 + i * 2, lx + span, 11 + i * 2, c)
    # wainscot
    rect(d, 0, 52, w - 1, 70, (58, 40, 38, 255))
    rect(d, 0, 52, w - 1, 53, WOOD_L)
    for x in range(0, w, 12):
        rect(d, x, 55, x + 8, 68, (68, 46, 42, 255))
        outline(d, x, 55, x + 8, 68, (46, 32, 30, 255))
    rect(d, 0, 69, w - 1, 71, WOOD_D)
    # lift alcove on the right: dark recess, brass frame, closed doors
    rect(d, 130, 22, 168, 71, (20, 16, 28, 255))
    outline(d, 129, 21, 169, 71, BRASS_D)
    rect(d, 132, 24, 149, 71, (92, 72, 40, 255))
    rect(d, 150, 24, 166, 71, (92, 72, 40, 255))
    outline(d, 132, 24, 149, 71, INK)
    outline(d, 150, 24, 166, 71, INK)
    for x in (136, 142, 154, 160):
        d.line([(x, 28), (x, 66)], fill=(120, 96, 52, 255))
    # floor indicator above the lift
    rect(d, 138, 14, 160, 19, INK)
    outline(d, 138, 14, 160, 19, BRASS)
    for i, x in enumerate((141, 147, 153)):
        rect(d, x, 16, x + 3, 17, LAMP if i == 0 else MUTED)
    # floor: checkerboard with perspective-ish tile rows
    top = 72
    for y in range(top, h):
        row = (y - top) // 8
        tile = 8 + row
        for x in range(0, w, tile):
            col = x // tile
            colr = FLOOR_A if (col + row) % 2 == 0 else FLOOR_B
            rect(d, x, y, min(x + tile - 1, w - 1), y, colr)
    # soft light pools on the floor under each lamp
    for lx in (28, 85, 142):
        for i in range(6):
            c = (242, 184, 75, 22 - i * 3)
            rect(od, lx - 14 + i, 90 + i, lx + 14 - i, 91 + i, c)
    # baseboard
    rect(d, 0, 71, w - 1, 72, INK)
    # a stray paper hat and a dropped shoe, the store after closing
    rect(d, 62, 108, 66, 110, DANGER)
    rect(d, 63, 106, 65, 107, DANGER)
    rect(d, 70, 110, 76, 112, WOOD_D)
    rect(d, 70, 109, 72, 109, WOOD_D)
    img.alpha_composite(ov)
    return img


def save(img, name):
    img.save(os.path.join(OUT, name))
    print('wrote', name, img.size)


os.makedirs(OUT, exist_ok=True)
for name, fn in [('wall-calendar', calendar), ('radio', radio), ('ticket-stub', ticket), ('plaque', plaque)]:
    sprite = fn()
    save(sprite, f'prop-{name}.png')
    save(glow_of(sprite), f'prop-{name}-glow.png')
save(room_bg(), 'room-bg.png')
