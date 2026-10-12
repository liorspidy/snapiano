# Trims the piano samples in assets/piano to 3.5 s with a 0.3 s fade-out, in place.
# A note never plays longer than 2.5 s hold + 0.25 s release (src/audio/synth.ts), and the full Salamander files
# (up to 25 s each) decoded to ~160 MB of RAM on the phone. Safe to re-run: shorter files are left as they are.
# Run with the backend venv (its libsndfile reads and writes MP3): ../BE/.venv/bin/python tools/trim_piano.py
import pathlib
import numpy as np
import soundfile as sf

KEEP, FADE = 3.5, 0.3
for path in sorted((pathlib.Path(__file__).parent.parent / "assets/piano").glob("*.mp3")):
    data, rate = sf.read(path, always_2d=True)
    keep = int(KEEP * rate)
    if len(data) <= keep:
        continue
    data = data[:keep].copy()
    fade = int(FADE * rate)
    data[-fade:] *= np.linspace(1, 0, fade)[:, None]
    sf.write(path, data, rate, format="MP3", compression_level=0, bitrate_mode="CONSTANT")  # 0 = best quality (320 kbps)
    print(f"{path.name}: {len(data) / rate:.1f} s")
