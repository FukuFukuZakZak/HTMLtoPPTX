# DotGothic16

Copyright 2020 The DotGothic16 Project Authors. Distributed under the SIL Open Font License 1.1; see `DotGothic16-OFL.txt`.

Source: https://github.com/google/fonts/tree/main/ofl/dotgothic16 (downloaded 2026-09-06).

The complete `DotGothic16-Regular.ttf` was compressed to WOFF2 without subsetting using:

```sh
uv run --with 'fonttools[woff]' python -m fontTools.ttLib.woff2 compress DotGothic16-Regular.ttf -o DotGothic16-Regular.woff2
```

WOFF2: 500,340 bytes. SHA-256: `BA8513004FCB6C03C831D7EEFD7FFFE457426346820054A2481C278076796B32`.

Loaded from the embedded application only when the optional 8bit appearance uses the font. No external font service is required at runtime. The editor's source and converted presentation do not inherit this application font.
