# Audio compression

Local batch transcoding, not dynamic-range compression. Web Audio decodes each complete file via an OfflineAudioContext at the intended encoder sample rate. The browser resamples; pitch/duration are not changed intentionally. Files are processed sequentially. A worker does all encoding. No media recording in real time, no upload, no analytics, no third-party runtime fetches.

## Encoders

- Opus: libopus-wasm 0.4.1, local bundled/inlined WebAssembly. VBR, complexity 10, audio application, 32–256 kbps. Ogg Opus muxer follows RFC 7845: OpusHead with encoder lookahead pre-skip, OpusTags, CRCs, sequential granule positions and final sample trim. One packet per page. Always 48 kHz.
- MP3: lamejs 1.2.1, local classic-worker script, CBR 64–320 kbps, 44.1/48 kHz. PCM quantised to 16 bit with saturation. No forced mono unless selected.

Opus is the efficient default. MP3 is the compatibility option. No claim of lossless output, guaranteed transparency or one codec being best on every source. Repeated lossy encoding can degrade sound. Metadata/artwork are not retained. Output can be bigger than input: actual size and the larger-result warning are shown without discarding the original. The slider is bitrate, not a scientific percentage of quality. VBR estimates are approximate.

20-file / 80 MB input-file / 10-minute decoded-duration caps, mono/stereo only. decodeAudioData necessarily loads complete files; compressed duration cannot always be known before decode. Cancel stops worker encoding; an in-flight browser decode cannot be interrupted, but its result is discarded. Files are decoded sequentially. Huge or unusual files are still best handled in a native app. A/B playback switches at the same approximate media timestamp; lossy codec delay may prevent sample-exact alignment. Format support depends on browser, not the extension picker. No microphone permissions needed.

## Build

```sh
npm install libopus-wasm@0.4.1 esbuild@0.28.2
npx esbuild encode-source.js --bundle --format=iife --minify --external:node:module --outfile=encode-worker.js --legal-comments=eof
```

The external node:module import is in the dependency's Node-only branch; the browser worker path never uses it. Preserve libopus-wasm-LICENSE and THIRD_PARTY_NOTICES.md. lamejs is LGPL-3.0; shipped unmodified in /vendor/lamejs with its licence and corresponding source archive. Users may replace it independently.

## Tests and provenance

Chromium: stereo + mono WAV bulk encoded with both codecs, A/B loaded, ZIP verified, stale output invalidated on setting change, 390 px layout without overflow. FFmpeg/ffprobe independently decoded and inspected both outputs. No listening-quality guarantee or M4 benchmark is asserted from sine fixtures.

- https://github.com/zhuker/lamejs
- https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
- https://libopus-wasm.dev/browser.html
- https://www.rfc-editor.org/rfc/rfc7845
- https://opus-codec.org/
