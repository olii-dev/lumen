# Audio quality regression checks

Generate a 12-second 44.1 kHz stereo 24-bit WAV with FFmpeg aevalsrc: left contains 220/330/440 Hz plus a modulated 4.4 kHz component; right contains 220/330/554.37 Hz plus modulated 6.6 kHz. Peak under .3, no clipping. Encode at MP3 64 kbps. Independently decode with FFmpeg, confirm sample rate remains 44100, stereo channels, finite non-silent PCM, RMS near source and correlation after codec-delay alignment. Test was run under /lumen/ base path using Chromium. 64 kbps fixed output RMS .1033 vs source .109; L/R correlations .99988/.99882 at 1105-sample delay.

Do not enable reservoir or VBR flags without running full decoder checks. This port has missing VBR iteration-loop classes, and reservoir-enabled output showed severe artifacts on this fixture. A file existing, a valid MIME and a playable duration do not prove encoding quality.

16-bit WAV dither test: 48000 mono samples of a 1 kHz sine at amplitude .2/32768, encode twice (off/on). Off rounds every sample to zero. TPDF on produces bounded -1/0/+1 samples with mean near zero and about 27% nonzero, preserving sub-LSB signal statistically. Verify WAV headers and sample count using FFprobe. Noise shaping is not implemented or claimed.

UI: setting changes invalidate outputs; default-on dither visible only for WAV16; WAV24 unaffected; cancelled worker cannot publish stale output; 390px layout no horizontal overflow. Original files remain unchanged. Quality tests are controlled synthetic music-like signals, not a broad subjective listening panel.
