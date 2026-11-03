# Nalan AI Fashion Breakdown Studio

Standalone tool page: `fashion-breakdown.html`.

## Current MVP
- Multi-image upload with a selectable hero image.
- Manual crop selection in the browser; extracted detail crops remain local.
- Gemini-compatible vision analysis endpoint configuration (base URL, model, API key).
- AI suggestions are normalized bounding boxes for visible garment details; users approve before adding.
- Editorial collage poster with brand/title/layout/background controls.
- PNG export at 2400 × 3000.
- Reuses the existing Nalan dark-mode stylesheet and toggle.

## Privacy
- Upload, crop, composition and export run in the browser.
- The API key is held in page memory and is not persisted.
- Base URL and model can optionally be saved locally; the key is never saved.
- When AI analysis is requested, the selected image is sent to the configured Gemini-compatible endpoint. The endpoint operator may process or retain that request according to its own terms.

## API compatibility
The MVP calls the Gemini `generateContent` REST shape:
`{BASE_URL}/models/{MODEL}:generateContent?key={API_KEY}`.
If a proxy uses an OpenAI-compatible or custom route, adapt the request adapter without changing the local editor.

## Limitations
- AI returns suggestions for visible regions only; it does not infer hidden garment construction.
- Current collage is a canvas-rendered MVP; detail positions and typography are preset rather than freeform drag layers.
- SAM 2 / local segmentation is not bundled. A self-hosted segmentation service can be integrated later if a no-cloud segmentation path is required.
