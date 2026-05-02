# Models

> Browse, configure, fine-tune, quantize, and benchmark the language models you point TrueAI at.
>
> *Audience: end user · Last reviewed: 2026-05-02*

The **Models** tab is mission control for everything model-related.
It does **not** ship any models — TrueAI talks to the LLM server you
configured in [First-Run Setup](First-Run-Setup). What this tab gives
you is the UI to discover, configure, and tune those models.

---

## Sub-panels

| Panel | What it does | Page |
| --- | --- | --- |
| **Model Configuration** | Per-model parameter tuning (temperature, top-p, …) | [§ below](#model-configuration) |
| **HuggingFace Browser** | Search HF for GGUF models, see metadata, queue downloads | [§ below](#huggingface-browser) |
| **GGUF Library** | Local catalog of GGUFs you've downloaded | [§ below](#gguf-library) |
| **Hardware Optimizer** | Auto-detects your hardware and recommends a profile | [Hardware Optimizer](Hardware-Optimizer) |
| **Performance Profiles** | Conservative / balanced / aggressive presets | [§ below](#performance-profiles) |
| **Benchmarks** | Run + compare model speed and quality on a corpus | [§ below](#benchmarks) |
| **Fine-Tuning UI** | Manage datasets and training jobs | [§ below](#fine-tuning) |
| **Quantization Tools** | Q4 / Q5 / Q8 conversions | [§ below](#quantization) |
| **Learning Rate Tuner** | Sweep + visualize LR for fine-tunes | [§ below](#learning-rate-tuner) |
| **Quick Actions Menu** | One-click common operations | — |

<!-- SCREENSHOT: models tab with config panel + HF browser visible -->

---

## Model Configuration

Standard OpenAI-style sampling controls. Defaults are stored per
model in KV (`model-configs`), so each model remembers its own
settings.

| Parameter | Range | Effect |
| --- | --- | --- |
| `temperature` | 0 – 2 | Randomness. 0 = deterministic, 1 = neutral, 2 = wild |
| `topP` | 0 – 1 | Nucleus sampling cutoff |
| `maxTokens` | 100 – 4000+ | Cap on output length |
| `frequencyPenalty` | -2 – 2 | Discourage token repetition |
| `presencePenalty` | -2 – 2 | Discourage topic repetition |
| `customEndpoint` | URL (optional) | Override the runtime base URL just for this model |

See `ModelConfigPanel.tsx`.

---

## HuggingFace Browser

`HuggingFaceModelBrowser.tsx` queries the public HF API for GGUF
models. You can:

- Search by name / author / tag
- Filter by quantization (Q4_K_M, Q5_K_S, Q8_0, …) and context length
- View parameter count, license, downloads
- Queue a download (uses the native filesystem on Android, blob
  download on web)

Once downloaded, the model appears in the **GGUF Library** below.

> Internals: `src/lib/huggingface.ts`. Network errors are surfaced
> with a retry button; rate-limit responses respect HF's documented
> backoff.

---

## GGUF Library

A local catalog of every GGUF you've downloaded — filename, size,
quant, context length, last-used timestamp. From here you can:

- Mark a model as the **default** for chat
- Delete a model to free disk space
- Send a model to **Quantization** for further compression
- Send to **Benchmarks** to compare against another

---

## Performance Profiles

Curated parameter bundles that match a use case. Built-in profiles
live in
[`src/lib/performance-profiles.ts`](https://github.com/smackypants/TrueAI/blob/main/src/lib/performance-profiles.ts).

| Profile | Optimized for | Trade-off |
| --- | --- | --- |
| Conservative | Battery, low RAM, mobile | Slower, smaller responses |
| Balanced | Typical desktop | Default |
| Aggressive | Workstation / GPU | Higher quality, more tokens, more cost |
| Custom | … | You define it |

`useAutoPerformanceOptimization` (in `src/hooks/`) can apply these
automatically based on the [Hardware Optimizer](Hardware-Optimizer)
scan.

---

## Benchmarks

`BenchmarkRunner.tsx` runs the same prompt set against one or more
models and records:

- Tokens per second
- First-token latency
- Total wall-clock per request
- Quality (when a reference answer is provided — uses cosine
  similarity / exact match depending on prompt type)

`BenchmarkComparison.tsx` lays results side-by-side. See
`src/lib/model-benchmark.ts`.

---

## Fine-Tuning

`FineTuningUI.tsx` manages:

- **Datasets** — JSONL upload, schema validation, sample preview
- **Training jobs** — submit a job to your fine-tuning endpoint
  (provider-specific), watch loss curves, cancel/resume
- **Job history** — succeeded / failed / cancelled

Type contracts (`FineTuningDataset`, `FineTuningJob`) are in
`src/lib/types.ts`.

---

## Quantization

`QuantizationTools.tsx` runs GGUF quantization (Q2_K through Q8_0)
either locally (calling out to a tool you configure) or remotely.
Each `QuantizationJob` records source/target quant, size delta, and
quality delta when a benchmark is attached.

> ⚠️ Quantization is computationally expensive — TrueAI just
> orchestrates the job; the actual conversion runs in your
> environment.

---

## Learning Rate Tuner

`LearningRateBenchmark.tsx` + `LearningRateDashboard.tsx` sweep a
range of LRs through a small fine-tune, plot validation loss, and
recommend a best LR. Internals in `src/lib/learning-rate-tuner.ts`.

---

## See also

- [Hardware Optimizer](Hardware-Optimizer)
- [Performance](Performance) — runtime perf, separate from model perf
- [Benchmarks dashboard](Analytics) — analytics surfaces
- Canonical: [`HARDWARE_OPTIMIZATION.md`](https://github.com/smackypants/TrueAI/blob/main/HARDWARE_OPTIMIZATION.md), [`FEATURES.md`](https://github.com/smackypants/TrueAI/blob/main/FEATURES.md)
