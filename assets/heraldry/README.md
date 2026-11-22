# House sigil artwork

95 sprites curated from [Angais/pixel-art-atlas-1.4m](https://huggingface.co/datasets/Angais/pixel-art-atlas-1.4m), revision `bf78f8c8cbafa6d07718111a94d41e2dd79ddaa7`, file `data/validation-000.parquet`.

Angais releases the sprites, captions and collection under CC0 1.0 to the extent of the rights Angais can waive. The dedication does not grant rights in third-party material, trademarks or Krea's models. These are AI-generated sprites. See the upstream dataset card for complete provenance and the Krea-related terms it describes.

`catalog.json` records each source row ID, subject and original caption. `sigils.png` packs the unmodified 16×16 RGBA sprites in row-major order, 12 columns. `js/heraldry-data.js` is the compact browser catalog. `scripts/import-heraldry.py` reproduces these files from the specified Parquet file; requires pyarrow and Pillow. No dataset API requests occur during gameplay.

The flag shapes and field patterns are drawn by the game. The browser optionally tints a sprite's opaque pixels while preserving its luminance shading for a heraldic sigil; original sprite colors remain selectable.
