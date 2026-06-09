#!/usr/bin/env python3
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent
VERSION = json.loads((ROOT / "package.json").read_text())["version"]
OUTPUT = ROOT / f"zen-theme-v{VERSION}.zip"
ENTRIES = ["komari-theme.json", "preview.png", "dist"]

for old_zip in ROOT.glob("zen-theme-v*.zip"):
    old_zip.unlink()

with ZipFile(OUTPUT, "w", ZIP_DEFLATED) as archive:
    for entry in ENTRIES:
      source = ROOT / entry
      if source.is_dir():
          for file in sorted(source.rglob("*")):
              if file.is_file():
                  archive.write(file, file.relative_to(ROOT).as_posix())
      else:
          archive.write(source, entry)

print(f"Wrote {OUTPUT.name} ({OUTPUT.stat().st_size} bytes)")
