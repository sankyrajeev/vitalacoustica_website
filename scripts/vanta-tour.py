# Renders public/media/vanta/vanta-tour-1280.mp4 (the looping tour beside VANTA on the homepage and the
# Software page) from the screenshots in public/shop/vanta. Needs Pillow and ffmpeg:
#   python3 scripts/vanta-tour.py public/shop/vanta public/media/vanta/vanta-tour-1280
# (it writes <out>.mp4 and <out>-poster.webp)
# VANTA tour loop: four real screens, each drifting slowly in, then a short dip through black into
# the next; the last dips back into the first, so the loop has no seam. Frames go straight to ffmpeg.
import subprocess, sys
from PIL import Image
SRC = sys.argv[1]; OUT = sys.argv[2]
W, H, FPS = 1280, 800, 30
SCENE, FADE, ZOOM = 4.5, 0.9, 1.12
scenes = [  # screen, where the zoom drifts toward (fractions of the frame)
    ('sample-lab', (0.56, 0.56)),
    ('fx', (0.45, 0.42)),
    ('modulation', (0.62, 0.42)),
    ('browser', (0.32, 0.40)),
]
imgs = [Image.open(f'{SRC}/vanta-{n}.webp').convert('RGB') for n, _ in scenes]
SW, SH = imgs[0].size
ease = lambda u: u * u * (3 - 2 * u)

def frame(i, u):
    """scene i at progress u (0..1 over the scene plus its fade-out)"""
    z = 1 + (ZOOM - 1) * ease(min(1, u))
    fx, fy = scenes[i][1]
    cw, ch = SW / z, SH / z
    x = min(max(fx * SW - cw / 2, 0), SW - cw) * ease(min(1, u)) + 0 * (1 - ease(min(1, u)))
    y = min(max(fy * SH - ch / 2, 0), SH - ch) * ease(min(1, u))
    # drift from the full frame (x=0,y=0,z=1) toward the focus
    return imgs[i].resize((W, H), Image.LANCZOS, box=(x, y, x + cw, y + ch))

BLACK = Image.new('RGB', (W, H), (8, 8, 7))
N = len(scenes); total = N * SCENE; frames = int(total * FPS)
ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT + '.mp4'], stdin=subprocess.PIPE)
first = None
for k in range(frames):
    t = k / FPS
    i = int(t // SCENE); local = t - i * SCENE
    img = frame(i, local / SCENE)
    if local > SCENE - FADE:  # a dip through black into the next scene, which starts at its full frame
        a = (local - (SCENE - FADE)) / FADE
        if a < 0.5:
            img = Image.blend(img, BLACK, ease(a * 2))
        else:
            j = (i + 1) % N
            img = Image.blend(BLACK, frame(j, 0), ease(a * 2 - 1))
    if k == 0: first = img
    ff.stdin.write(img.tobytes())
ff.stdin.close(); ff.wait()
first.save(OUT + '-poster.webp', quality=82)
print('frames', frames)
