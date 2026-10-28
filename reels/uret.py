#!/usr/bin/env python3
"""Etkinlik Reels üreticisi.

Kullanım:
  python3 reels/uret.py --veri veri.json --ses ses.mp3 --cikti reels.mp4 [--muzik fon.mp3]

veri.json biçimi README.md'de. Şablon (sablon.html) kare kare çizilir, seslendirmeyle
birleştirilip 1080x1920, 30 fps, H.264 MP4 olarak yazılır. Ayrıca kapak.jpg üretilir.
"""
import argparse, json, os, shutil, subprocess, tempfile
from pathlib import Path

KLASOR = Path(__file__).resolve().parent
FPS = 30


def sure_olc(dosya):
    cikti = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", dosya])
    return float(cikti.decode().strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--veri", required=True)
    ap.add_argument("--ses", required=True)
    ap.add_argument("--cikti", required=True)
    ap.add_argument("--muzik", help="İsteğe bağlı fon müziği (seslendirmenin altında kısık çalar)")
    a = ap.parse_args()

    from playwright.sync_api import sync_playwright

    veri = json.loads(Path(a.veri).read_text(encoding="utf-8"))
    ses_suresi = sure_olc(a.ses)
    gecici = Path(tempfile.mkdtemp(prefix="reels_"))
    kareler = gecici / "kareler"
    kareler.mkdir()

    with sync_playwright() as p:
        tarayici = p.chromium.launch()
        sayfa = tarayici.new_page(viewport={"width": 1080, "height": 1920})
        sayfa.goto((KLASOR / "sablon.html").as_uri(), wait_until="networkidle")
        sayfa.evaluate("document.fonts.ready")
        toplam = sayfa.evaluate("([v,s]) => hazirla(v,s)", [veri, ses_suresi])
        sayfa.wait_for_timeout(300)
        n = int(round(toplam * FPS))
        kapak_karesi = int((0.6 + ses_suresi * 0.3) * FPS)
        for i in range(n):
            sayfa.evaluate(f"ciz({i / FPS})")
            sayfa.screenshot(path=str(kareler / f"{i:05d}.jpg"), type="jpeg", quality=92)
        tarayici.close()

    cikti = Path(a.cikti)
    cikti.parent.mkdir(parents=True, exist_ok=True)
    girdi = ["-framerate", str(FPS), "-i", str(kareler / "%05d.jpg"), "-i", a.ses]
    if a.muzik:
        girdi += ["-stream_loop", "-1", "-i", a.muzik]
        ses_filtre = "[1:a]adelay=600|600,apad[k];[2:a]volume=0.12[m];[k][m]amix=inputs=2:duration=first:normalize=0[a]"
    else:
        ses_filtre = "[1:a]adelay=600|600,apad[a]"
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *girdi,
         "-filter_complex", ses_filtre, "-map", "0:v", "-map", "[a]", "-t", f"{toplam:.3f}",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-movflags", "+faststart", str(cikti)],
        check=True,
    )
    shutil.copy(kareler / f"{min(kapak_karesi, n - 1):05d}.jpg", cikti.with_name("kapak.jpg"))
    shutil.rmtree(gecici, ignore_errors=True)
    print(f"Hazır: {cikti} ({toplam:.1f} sn), kapak: {cikti.with_name('kapak.jpg')}")


if __name__ == "__main__":
    main()
