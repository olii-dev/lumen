# Image enhance

All pixels stay on the device. Runtime requests are same-origin JS and optional model assets. No third-party runtime services, analytics, uploads or remote image URLs.

## Pipeline

Default: worker-based luminance-guided bilateral-like 3×3 colour denoising, bounded percentile contrast and shadow lift, thresholded luminance unsharp mask with local extrema limiting, restrained vibrance. Pica 10.0.3 mks2013 resampling for 2× / 4×. Original, 2× and 4× are true output dimensions, not a promise of recovered information.

Optional AI: TensorFlow.js 4.11.0 WebGL with UpscalerJS 1.0.0 and ESRGAN-slim 1.0.0 2× model. Local worker inference, 48 px patches with 6 px padding. Explicit opt-in. No remote model CDN: model and weights are shipped alongside the page. Limited to 1 MP, 1024 px per side, opaque images. AI predicts missing detail and should not be used for evidence, exact text or fidelity-critical photos. Cancellation terminates the worker. Fast mode does not load the AI bundle or model.

## Bounds and output

40 MB file limit, 16 MP input limit, 24 MP / 10,000 px output limit. Input orientation follows createImageBitmap. Transparency is retained in fast mode, PNG and WebP exports. JPG is composited on white. Metadata is stripped. Canvas output is browser-rendered sRGB, not a colour-managed professional/RAW workflow. No automatic downsizing for AI: large inputs show the reason and keep the original intact.

Settings do not auto-process full-size images. Each change invalidates the old result to prevent saving stale settings. One image at a time. Before/after split and 100% view are available. Export type is checked against the actual blob MIME type.

## Rebuilding AI bundle

The checked-in ai-source.js is the editable source. ai-worker.js is the minified runtime bundle:

```sh
npm install upscaler@1.0.0 @tensorflow/tfjs@4.11.0 esbuild@0.28.2
npx esbuild ai-source.js --bundle --minify --outfile=ai-worker.js --legal-comments=eof
```

Copy @upscalerjs/esrgan-slim@1.0.0 models/x2/model.json and its relative weight shard into models/x2. Preserve the licence files. Pica is vendored under /vendor. Versions recorded in DEPENDENCIES.json are authoritative for this build.

## Sources

- https://github.com/nodeca/pica (filter, worker concurrency and memory guidance)
- https://upscalerjs.com/models/ (slim model's browser focus, thicker model latency tradeoff)
- https://upscalerjs.com/documentation/getting-started/ (model, tensor and patch APIs)
- https://upscalerjs.com/documentation/guides/browser/performance/patch-sizes/ (padding and responsiveness)
- https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas (worker GPU canvas support)

## Verification

See tests/enhance.cjs for browser and algorithm regression tests. Tested in Linux Chromium with a software WebGL renderer, not on an M4 Mac. Do not turn local timing into an M4 performance claim. AI is deliberately optional and labelled slower.

Local checks on 2026-09-30: fast 320×240 to 640×480 about 0.4s; flat 6 MP input to 24 MP output 2.2s. AI on a software-rendered WebGL GPU took 72.8s for 320×240 and 21.8s for 128×128. These are test-environment timings, not M4 benchmarks. Both engines completed; worker cancellation passed. Controlled colour-noise variance fell to 20.3% at maximum cleanup with alpha unchanged; all-zero controls were pixel-exact identity. PNG transparency and JPG white compositing passed. Output/AI size guards, stale-result invalidation, clear and mobile overflow passed.

Run regressions with Node and Playwright installed (`npm install playwright`), plus Chromium at /usr/bin/google-chrome or adjust executablePath in tests/enhance.cjs. The script creates its own synthetic test image and local server; no external photo fixture is needed.
