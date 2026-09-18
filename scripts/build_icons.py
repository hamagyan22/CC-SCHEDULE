import subprocess
import os
import tempfile
from PIL import Image

def generate():
    edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    public_dir = os.path.join(project_dir, 'public')
    temp_profile_dir = tempfile.mkdtemp(prefix="edge_pwa_")

    emblem_path_d = "M25.2993 18.1182L19.9895 14.0447L7.87014 4.80315H16.1996C19.1788 4.80315 21.5973 7.22837 21.5973 10.2008C21.5973 11.0182 21.4149 11.7883 21.0906 12.4841L24.948 15.443C25.8667 13.9096 26.4004 12.1193 26.4004 10.2008C26.4004 4.56671 21.8337 0 16.1996 0H0V4.74911L14.0446 15.5309L14.1392 15.5984L21.5027 21.246C21.6108 21.3136 21.7121 21.3811 21.8135 21.4554L21.9148 21.5297C23.2456 22.5633 24.0833 24.2184 24.0023 26.0559C23.8671 28.9473 21.4216 31.1968 18.5303 31.1968H4.8099V20.3948H16.2132H17.0373L10.7818 15.5984H0.0135036V36H18.6114C24.2454 36 28.8122 31.4333 28.8122 25.7992C28.8122 22.7322 27.4611 19.9827 25.3196 18.1115"

    def get_html(size, emblem_scale=0.56):
        emblem_height = int(size * emblem_scale)
        emblem_width = int(emblem_height * (28.8122 / 36.0))
        
        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{
    width: {size}px;
    height: {size}px;
    background: transparent;
    overflow: hidden;
  }}
  .canvas {{
    width: {size}px;
    height: {size}px;
    background: radial-gradient(circle at 50% 30%, #0d4630 0%, #062318 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: inset 0 0 0 1px rgba(79, 180, 152, 0.15);
  }}
  .emblem {{
    width: {emblem_width}px;
    height: {emblem_height}px;
    filter: drop-shadow(0 {int(size * 0.02)}px {int(size * 0.05)}px rgba(0, 0, 0, 0.45));
  }}
</style>
</head>
<body>
<div class="canvas">
  <svg class="emblem" viewBox="0 0 28.8122 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="{emblem_path_d}" fill="#4FB498"/>
  </svg>
</div>
</body>
</html>"""

    targets = [
        ('pwa-512x512.png', 512, 0.58),
        ('pwa-maskable-512x512.png', 512, 0.45),
        ('pwa-192x192.png', 192, 0.58),
        ('apple-touch-icon.png', 180, 0.58),
        ('favicon.png', 64, 0.62),
    ]

    temp_html = os.path.join(public_dir, '_temp_render.html')

    for fname, size, scale in targets:
        html = get_html(size, scale)
        with open(temp_html, 'w', encoding='utf-8') as f:
            f.write(html)

        out_path = os.path.join(public_dir, fname)
        cmd = [
            edge_path,
            '--headless',
            '--disable-gpu',
            '--hide-scrollbars',
            f'--user-data-dir={temp_profile_dir}',
            '--no-first-run',
            '--no-default-browser-check',
            f'--window-size={size},{size}',
            f'--screenshot={out_path}',
            f'file:///{temp_html.replace(os.sep, "/")}'
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if res.returncode != 0:
                print(f"Error rendering {fname}: {res.stderr}")
            else:
                img = Image.open(out_path)
                if img.size != (size, size):
                    img = img.crop((0, 0, size, size))
                    img.save(out_path, format='PNG')
                print(f"Generated {fname} ({size}x{size})")
        except subprocess.TimeoutExpired:
            print(f"Timeout on {fname}")

    if os.path.exists(temp_html):
        os.remove(temp_html)

    favicon_svg = f"""<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="36" height="36" rx="8" fill="#062318"/>
  <g transform="translate(6, 4) scale(0.8333)">
    <path d="{emblem_path_d}" fill="#4FB498"/>
  </g>
</svg>"""
    with open(os.path.join(public_dir, 'favicon.svg'), 'w', encoding='utf-8') as f:
        f.write(favicon_svg)
    print("Updated favicon.svg with official FIB emblem")

if __name__ == '__main__':
    generate()
