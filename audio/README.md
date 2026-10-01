# Audio compression

Local batch transcoding, not dynamic-range compression. Web Audio decodes each complete file via an OfflineAudioContext at the intended encoder sample rate. The browser resamples; pitch/duration are not changed intentionally. Files are processed sequentially. A worker does all encoding. No media recording in real time, no upload, no analytics, no third-party runtime fetches.

## Encoders

- Opus: libopus-wasm 0.4.1, local bundled/inlined WebAssembly. VBR, complexity 10, audio application, 32–256 kbps. Ogg Opus muxer follows RFC 7845: OpusHead with encoder lookahead pre-skip, OpusTags, CRCs, sequential granule positions and final sample trim. One packet per page. Always 48 kHz.
- MP3: modified lamejs 1.2.1, local classic-worker script, CBR 64–320 kbps, 44.1/48 kHz. PCM quantised to 16 bit with saturation. Quality 2, joint stereo, output sample rate pinned to the PCM rate, bit reservoir disabled. No forced mono unless selected.

Opus is the efficient default. MP3 is the compatibility option. No claim of lossless output, guaranteed transparency or one codec being best on every source. Repeated lossy encoding can degrade sound. Metadata/artwork are not retained. Output can be bigger than input: actual size and the larger-result warning are shown without discarding the original. The slider is bitrate, not a scientific percentage of quality. VBR estimates are approximate.

100-file / 500 MB total input / 512 MB total output / 80 MB input-file / 10-minute decoded-duration caps, mono/stereo only. decodeAudioData necessarily loads complete files; compressed duration cannot always be known before decode. Cancel stops worker encoding; an in-flight browser decode cannot be interrupted, but its result is discarded. Files are decoded sequentially. Huge or unusual files are still best handled in a native app. A/B playback switches at the same approximate media timestamp; lossy codec delay may prevent sample-exact alignment. Format support depends on browser, not the extension picker. No microphone permissions needed.

## Build

```sh
npm install libopus-wasm@0.4.1 esbuild@0.28.2
npx esbuild encode-source.js --bundle --format=iife --minify --external:node:module --outfile=encode-worker.js --legal-comments=eof
```

The external node:module import is in the dependency's Node-only branch; the browser worker path never uses it. Preserve libopus-wasm-LICENSE and THIRD_PARTY_NOTICES.md. lamejs is LGPL-3.0; original shipped in /vendor/lamejs with its licence and corresponding source archive. Users may replace it independently.

## Tests and provenance

Chromium: stereo + mono WAV bulk encoded with both codecs, A/B loaded, ZIP verified, stale output invalidated on setting change, 390 px layout without overflow. FFmpeg/ffprobe independently decoded and inspected both outputs. No listening-quality guarantee or M4 benchmark is asserted from sine fixtures.

- https://github.com/zhuker/lamejs
- https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
- https://libopus-wasm.dev/browser.html
- https://www.rfc-editor.org/rfc/rfc7845
- https://opus-codec.org/

WAV input and output supported. PCM WAV has 16/24-bit and 22.05/44.1/48 kHz options; it is uncompressed, not a smaller-file guarantee. Tested FFprobe confirms stereo pcm_s24le and pcm_s16le at 22,050 Hz, exactly 6 seconds. WAV does not imply lossless recovery after browser resampling/quantisation.

All HTML, common header, workers and model assets are project-base safe for GitHub Pages under /lumen/ as well as the original root-hosted Pages site.

## Small-setting quality revision

The modified encoder source /vendor/lamejs/lame-quality.js is included with its minified runtime. Changes are quality 2, joint stereo and explicit gfp.out_samplerate=samplerate. Browser OfflineAudioContext handles resampling once, not a second pass in the encoder. Original lamejs at 64 kbps auto-selected 24 kHz and its resampler returned near-silent output on the 12-second polyphonic stereo fixture; the pinned 44.1 kHz encoder fixed that regression. Bit reservoir trial was rejected because it caused severe artifacts in this port. Missing ABR/VBR iteration classes mean no VBR claims are made. Do not enable them by simply setting flags.

16-bit WAV now offers default-on, non-noise-shaped TPDF dither (two independent uniforms, one LSB peak each before rounding), with explicit toggle. It trades a tiny added noise floor for decorrelated quantisation error and quieter detail, not more bits or a smaller file. 24-bit uses direct saturated rounding. No noise shaping: a conservative TPDF implementation avoids untested high-frequency noise amplification. Sample-rate selector warns that 22.05 kHz removes frequencies above 11 kHz.

Tests: FFmpeg independently decoded the polyphonic fixture's 64 kbps MP3. At roughly equal 96 KB size the old path's decoded RMS was 0.00089 versus source 0.109; the fixed output RMS was 0.1033, with delay-aligned left/right correlations 0.99988/0.99882. This is a regression signal, not a listening-quality guarantee. Original and fixed MP3 durations include encoder padding. WAV preserves exact sample count. Dither tests check sub-LSB signal survives statistically, bounds and channel independence, not subjective audio quality.
