"""Build the README demo GIF from Playwright frames.

Usage: python scripts/make-gif.py <frames dir> <out.gif>
Frames are PNGs named in play order; each holds for HOLD_MS, with a short
cross-fade between them.
"""

import sys
from pathlib import Path

from PIL import Image

WIDTH = 800
HOLD_MS = 1600
FADE_STEPS = 3
FADE_MS = 70


def main(src: str, out: str) -> None:
    paths = sorted(Path(src).glob("*.png"))
    if not paths:
        sys.exit(f"No frames in {src}")
    shots = []
    for p in paths:
        im = Image.open(p).convert("RGB")
        h = round(im.height * WIDTH / im.width)
        shots.append(im.resize((WIDTH, h), Image.LANCZOS))

    frames, durations = [], []
    for i, im in enumerate(shots):
        frames.append(im)
        durations.append(HOLD_MS * 2 if i == len(shots) - 1 else HOLD_MS)
        if i + 1 < len(shots):
            for s in range(1, FADE_STEPS + 1):
                frames.append(Image.blend(im, shots[i + 1], s / (FADE_STEPS + 1)))
                durations.append(FADE_MS)

    # One shared palette keeps the file small and the colors stable.
    palette = frames[0].quantize(colors=128, method=Image.MEDIANCUT)
    quantized = [f.quantize(palette=palette, dither=Image.NONE) for f in frames]
    quantized[0].save(
        out,
        save_all=True,
        append_images=quantized[1:],
        duration=durations,
        loop=0,
        optimize=True,
    )
    print(f"{out}: {len(frames)} frames, {Path(out).stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
