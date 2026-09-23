import os
import io
import base64
from PIL import Image, ImageDraw, ImageFilter, ImageOps

SOURCE_IMAGE = r"C:\Users\arthu\.gemini\antigravity-ide\brain\80ecd212-364d-40fa-b4dd-7ec32a60fd21\rpg_crown_icon_1790185607820.jpg"
WORKSPACE = r"c:\Users\arthu\OneDrive\Documentos\GitHub\Segundo-Cerebro"
ICONS_DIR = os.path.join(WORKSPACE, "icons")
TAURI_ICONS_DIR = os.path.join(WORKSPACE, "desktop", "src-tauri", "icons")

def make_squircle_mask(size, radius):
    # Supersampled mask for crisp anti-aliasing
    scale = 4
    s_size = (size[0] * scale, size[1] * scale)
    s_radius = radius * scale
    mask = Image.new("L", s_size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (s_size[0] - 1, s_size[1] - 1)], radius=s_radius, fill=255)
    return mask.resize(size, Image.Resampling.LANCZOS)

def main():
    img_orig = Image.open(SOURCE_IMAGE).convert("RGBA")
    w, h = img_orig.size
    print(f"Loaded source image: {w}x{h}")

    # Determine dark background average color from edges for safe-zone extensions
    bg_color = (6, 9, 16, 255)

    # 1. Full square 512
    im_full_512 = img_orig.resize((512, 512), Image.Resampling.LANCZOS)
    im_full_512.save(os.path.join(ICONS_DIR, "icon-full-512.png"), "PNG")
    print("Saved icon-full-512.png")

    # 2. Rounded squircle 512 (radius ~104)
    mask_512 = make_squircle_mask((512, 512), 104)
    im_rounded_512 = im_full_512.copy()
    im_rounded_512.putalpha(mask_512)
    im_rounded_512.save(os.path.join(ICONS_DIR, "icon-512.png"), "PNG")
    print("Saved icon-512.png")

    # 3. Rounded squircle 192 (radius ~38)
    mask_192 = make_squircle_mask((192, 192), 38)
    im_rounded_192 = img_orig.resize((192, 192), Image.Resampling.LANCZOS)
    im_rounded_192.putalpha(mask_192)
    im_rounded_192.save(os.path.join(ICONS_DIR, "icon-192.png"), "PNG")
    print("Saved icon-192.png")

    # 4. Favicon 64 (radius ~13)
    mask_64 = make_squircle_mask((64, 64), 13)
    im_rounded_64 = img_orig.resize((64, 64), Image.Resampling.LANCZOS)
    im_rounded_64.putalpha(mask_64)
    im_rounded_64.save(os.path.join(ICONS_DIR, "favicon-64.png"), "PNG")
    print("Saved favicon-64.png")

    # 5. Apple Touch Icon 180 (iOS automatically clips, RGB without transparent corners)
    im_apple_180 = img_orig.resize((180, 180), Image.Resampling.LANCZOS).convert("RGB")
    im_apple_180.save(os.path.join(ICONS_DIR, "apple-touch-icon.png"), "PNG")
    print("Saved apple-touch-icon.png")

    # 6. Maskable icons (512 and 192): Safe zone requires artwork inside center 80%
    for m_size, name in [(512, "icon-maskable-512.png"), (192, "icon-maskable-192.png")]:
        canvas = Image.new("RGBA", (m_size, m_size), bg_color)
        inner_size = int(m_size * 0.82)
        inner_img = img_orig.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        offset = (m_size - inner_size) // 2
        canvas.paste(inner_img, (offset, offset), inner_img)
        canvas.save(os.path.join(ICONS_DIR, name), "PNG")
        print(f"Saved {name}")

    # 7. Monochrome icon (512x512): White silhouette with transparency
    # Extract luminance from inner emblem
    gray = img_orig.convert("L")
    # Threshold/curve so golden crown and bright gems form clean white silhouette
    mono_data = gray.point(lambda p: 255 if p > 75 else int(p * 2.5))
    mono = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    white_fill = Image.new("RGBA", (512, 512), (255, 255, 255, 255))
    mono_mask = mono_data.resize((512, 512), Image.Resampling.LANCZOS)
    mono.paste(white_fill, (0, 0), mono_mask)
    mono.save(os.path.join(ICONS_DIR, "icon-mono-512.png"), "PNG")
    print("Saved icon-mono-512.png")

    # 8. Badge 96: Crisp notification badge
    badge = mono.resize((96, 96), Image.Resampling.LANCZOS)
    badge.save(os.path.join(ICONS_DIR, "badge-96.png"), "PNG")
    print("Saved badge-96.png")

    # 9. desktop/src-tauri/icons
    # All desktop sizes
    tauri_sizes = [
        ("32x32.png", (32, 32)),
        ("128x128.png", (128, 128)),
        ("128x128@2x.png", (256, 256)),
        ("icon.png", (512, 512)),
        ("Square30x30Logo.png", (30, 30)),
        ("Square44x44Logo.png", (44, 44)),
        ("Square71x71Logo.png", (71, 71)),
        ("Square89x89Logo.png", (89, 89)),
        ("Square107x107Logo.png", (107, 107)),
        ("Square142x142Logo.png", (142, 142)),
        ("Square150x150Logo.png", (150, 150)),
        ("Square284x284Logo.png", (284, 284)),
        ("Square310x310Logo.png", (310, 310)),
        ("StoreLogo.png", (50, 50)),
    ]

    for fname, sz in tauri_sizes:
        # Use squircle mask for desktop square icons
        r = max(2, int(sz[0] * 0.2))
        m = make_squircle_mask(sz, r)
        res = img_orig.resize(sz, Image.Resampling.LANCZOS)
        res.putalpha(m)
        res.save(os.path.join(TAURI_ICONS_DIR, fname), "PNG")
        print(f"Saved Tauri {fname}")

    # Generate multi-size icon.ico
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_imgs = []
    for s in ico_sizes:
        r = max(2, int(s[0] * 0.2))
        m = make_squircle_mask(s, r)
        res = img_orig.resize(s, Image.Resampling.LANCZOS)
        res.putalpha(m)
        ico_imgs.append(res)

    ico_path = os.path.join(TAURI_ICONS_DIR, "icon.ico")
    ico_imgs[0].save(ico_path, format="ICO", sizes=ico_sizes, append_images=ico_imgs[1:])
    print(f"Saved {ico_path}")

    # 10. Generate icon.svg
    # An SVG that embeds the 512x512 rounded squircle PNG as base64 data-URI
    buffer = io.BytesIO()
    im_rounded_512.save(buffer, format="PNG")
    b64_png = base64.b64encode(buffer.getvalue()).decode("ascii")

    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <!-- Fundo escuro com cantos arredondados -->
  <rect width="512" height="512" rx="104" fill="#070a12"/>
  <!-- Emblema Coroa Gamer Épica em Alta Definição -->
  <image href="data:image/png;base64,{b64_png}" width="512" height="512" />
</svg>
'''
    with open(os.path.join(WORKSPACE, "icon.svg"), "w", encoding="utf-8") as f:
        f.write(svg_content)
    print("Saved icon.svg")

if __name__ == "__main__":
    main()
