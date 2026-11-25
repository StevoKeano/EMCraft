# ContextCut-PRO Standalone HTML Lab Factory (v3.5 Repeatable SOP)

## 1. Purpose & Trigger Workflow

This document is a **reusable prompt & direct-build blueprint** for generating standalone, interactive 3D/2D single-file HTML science & engineering labs (`Three.js` + `2D Canvas` + `KaTeX`) using a single self-contained Python builder (`/tmp/build_<slug>.py`) inside `tmux`.

### How to Use This File

1. Upload or paste this Markdown file into a new session.
2. Provide the following inputs for the target chapter or topic:
   - **Author(s):** `<Author Name(s)>`
   - **Book / Course Title:** `<Book or Course Title>`
   - **Target HTML Filename:** `<TARGET_HTML>.html`
   - **Chapter Number & Title:** `Chapter <N>: <Chapter Title>`
   - **Section Headings:** List of sections to become interactive modules `1` through `N` (plus a final Capstone Projects & Problems module)
3. The assistant will generate a **complete, zero-edit deployment package** tailored to that chapter:
   - **Part A:** Baseline single-file HTML template (`<TARGET_HTML>.html`) with the Three.js / 2D-Canvas / KaTeX / UI-Controller harness and `/* === UI CONTROLLER === */` anchor.
   - **Part B:** Self-contained direct streaming builder, sanitizer, and deterministic gatekeeper (`/tmp/build_<slug>.py`) configured for local inference with 5 retries, LaTeX prime sanitization, incremental module resume, `node --check` verification, and atomic sync to `~/keanapps/<TARGET_HTML>.html`.
   - **Part C:** Copy-paste `tmux` launch command & live monitoring one-liners.

---

## 2. Non-Negotiable Architecture Rules

Every generated HTML shell and `/tmp/build_<slug>.py` script **MUST** obey all 10 rules below:

1. **Direct Builder Pipeline (No `orchestrator.py` or Multi-Step Tool Overhead):**
   - Never use `orchestrator.py`, `coding_agent.py`, external `/tmp/modK.txt` files, or multi-step `write_file` + shell-splice tool loops.
   - All prompts, streaming API calls, sanitization, validation, and atomic file writes live inside one self-contained script: `/tmp/build_<slug>.py`, launched inside `tmux` with `tee /tmp/build_<slug>.log`.
2. **Staged Build with Atomic Sync (`/tmp/<slug>_stage` -> `~/keanapps/<TARGET_HTML>.html`):**
   - Stage `<TARGET_HTML>.html` in `/tmp/<slug>_stage/<TARGET_HTML>.html` and copy verified updates to `/home/steve/keanapps/<TARGET_HTML>.html` only after a candidate module passes all schema checks and `node --check`. A failed attempt never corrupts the live HTML file.
3. **Pre-Flight Baseline Validation:**
   - Before generating Module 1, `/tmp/build_<slug>.py` must validate the empty baseline HTML shell (`/* === UI CONTROLLER === */` anchor + `node --check` on `<script type="module">`) before spending any LLM tokens.
4. **Zero-Read Inline API Contract:**
   - Every module prompt embeds the exact global API contract (`renderer`, `scene`, `camera`, `content`, `chartEl`, `addArrowField`, `setHud`, module hooks, and `modules.push({...});` target format) directly in the system/user prompt.
   - Instruct the model explicitly: `"Output ONLY a single valid JavaScript modules.push({...}); statement. No <script> tags, no markdown fences, no prose. Never use raw ' or '' in LaTeX; use \\prime."`
5. **Local Inference Calibration & Streaming Telemetry:**
   - Target `http://192.168.137.1:8080/v1/chat/completions` with `model="deepseek-v4.1-flash"`, `stream=True`, `max_tokens=4200`, `temperature=0.2`, `reasoning_effort="low"`, and integer `"reasoning_budget_tokens": 64` (prevents Strata from reserving 75% of `max_tokens` for hidden reasoning).
   - Stream deltas in real time and log token progress every 100 tokens (`[100 tok, X.X tok/s]`).
6. **5-Attempt Retry Loop (`range(1, 6)`):**
   - Each module gets up to 5 attempts (`for attempt in range(1, 6):`). If an attempt fails sanitization, schema validation, or `node --check`, log the exact failure reason and immediately retry.
7. **Strict Control, HUD & Quiz Schema:**
   - Control objects must use `id:` (never `key:`).
   - Valid control `type` values are strictly `'range'`, `'select'`, and `'check'` — **never `'checkbox'`**.
   - HUD updates must call the global 3-argument `setHud(titleStr, latexEqStr, rowsArray)` (never 1-arg `setHud([...])` or `this.setHud(...)`).
   - Quiz items must use `answer: 0..3` (never `correct:`).
8. **Automatic Sanitization Before Verification (`sanitize_module_js`):**
   - Strip any accidental markdown code fences (` ```js `, ` ``` `) or `<script>` wrapper tags.
   - Normalize `type: 'checkbox'` to `type: 'check'`.
   - Sanitize raw primes inside LaTeX macros (`\\([a-zA-Z]+)''` -> `\1^{\prime\prime}` and `\\([a-zA-Z]+)'` -> `\1^{\prime}`) so single-quoted JS strings never break `node --check`.
   - Strip leaked reasoning/XML tags (`<think>...</think>`, `</answer>`), always use `lambda` functions in `re.sub()` replacements when inserting `\prime` (never raw replacement strings like `r"\1^{\prime}"`, which raise `re.error: bad escape \p`), and cap module size (~180–250 lines, `max_tokens=4200`) to avoid verbose unrolled geometry.
9. **Deterministic Gatekeeper (`verify_html`):**
   - Before committing any module to disk, verify in memory:
     1. `/* === UI CONTROLLER === */` anchor is present.
     2. All module IDs are unique and match the cumulative `expected_ids` list.
     3. No `key:` in `controls`, no `type: 'checkbox'`, no 1-arg `setHud([` or `this.setHud(`, and no `correct:` in `quiz`.
     4. Extracted `<script type="module">` passes `node --check` with exit code `0`.
10. **Incremental Resume from Module 1:**
    - Before calling the API for module `id`, check whether `id: '<module_id>'` (or `id: "<module_id>"`) is already present in `<TARGET_HTML>.html`. If present, log `SKIP` and advance directly to the first missing module.

---

## 3. Standard Module Prompt Specification (Embedded in `/tmp/build_<slug>.py`)

Every module prompt generated inside `/tmp/build_<slug>.py` follows this exact contract:

```text
You are an expert computational physics & engineering web developer building an interactive 3D/2D WebGL lab in Three.js + 2D HTML5 Canvas + KaTeX.
Output ONLY a single valid JavaScript `modules.push({...});` statement.
No <script> tags, no markdown fences, no prose. Never use raw ' or '' in LaTeX; use \prime.

Available globals in <script type="module">:
  - `renderer` (THREE.WebGLRenderer), `scene` (THREE.Scene), `camera` (THREE.PerspectiveCamera)
  - `content` (THREE.Group — add all 3D meshes, lines, and groups to `content`)
  - `chartEl` (HTMLCanvasElement 2D — draw analytical plots, phasors, dispersion curves, or field profiles in `update()` / `tick(dt)`)
  - `addArrowField(vectors, color = 0x7fd1ff)` where `vectors` is `[{ origin: THREE.Vector3, dir: THREE.Vector3, len?: number }, ...]`
  - `setHud(titleStr, latexEqStr, [{ k: 'label', v: 'value' }, ...])`
  - Required object keys inside `modules.push({ ... })`:
      id: '<MODULE_ID>',
      title: '<K>. <SECTION_TITLE>',
      controls: [
        { id: 'param1', label: '...', type: 'range', min: ..., max: ..., step: ..., value: ... },
        { id: 'mode', label: '...', type: 'select', options: [{ value: '...', label: '...' }], value: '...' },
        { id: 'flag', label: '...', type: 'check', value: true }
      ], // ONLY 'range', 'select', or 'check' — NEVER 'checkbox'
      build() { /* populate `content` and initialize `this.meshRefs` */ },
      update() { /* read `const st = this.state;`, update 3D meshes, draw `chartEl`, call `setHud(...)` */ },
      tick(dt) { /* optional time-harmonic animation */ },
      lesson: `<p>Concise HTML summary of governing equations, physical intuition, and limiting cases.</p>`,
      quiz: [
        { q: '...', options: ['A', 'B', 'C', 'D'], answer: 0 }
      ] // 2-3 items using `answer: 0..3` (NEVER `correct:`)

Task — Build Module <K> (`id: '<MODULE_ID>'`, `title: '<K>. <SECTION_TITLE>'`):
<SPECIFIC PHYSICS EQUATIONS, VARIABLES, UNITS, 3D VISUALS, 2D CHART, AND HUD METRICS>
```

---

## 4. Reference Builder Template (`/tmp/build_<slug>.py`)

````python
#!/usr/bin/env python3
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

SLUG = "<SLUG>"
CHAPTER_LABEL = "CHAPTER <N>"
TARGET_FILENAME = "<TARGET_HTML>.html"
LIVE_TARGET = f"/home/steve/keanapps/{TARGET_FILENAME}"
STAGE_DIR = f"/tmp/{SLUG}_stage"
STAGE_HTML = f"{STAGE_DIR}/{TARGET_FILENAME}"

BASE_URL = "http://192.168.137.1:8080/v1"
MODEL = "deepseek-v4.1-flash"
ANCHOR = "/* === UI CONTROLLER === */"

API_CONTRACT = """You are an expert computational physics & engineering web developer building an interactive 3D/2D WebGL lab in Three.js + 2D HTML5 Canvas + KaTeX.
Output ONLY a single valid JavaScript `modules.push({...});` statement.
No <script> tags, no markdown fences, no prose. Never use raw ' or '' in LaTeX; use \\prime.

Available globals in <script type="module">:
  - `renderer` (THREE.WebGLRenderer), `scene` (THREE.Scene), `camera` (THREE.PerspectiveCamera)
  - `content` (THREE.Group — add all 3D meshes, lines, and groups to `content`)
  - `chartEl` (HTMLCanvasElement 2D — draw analytical plots, diagrams, or waveforms)
  - `addArrowField(vectors, color = 0x7fd1ff)` where `vectors` is `[{ origin: THREE.Vector3, dir: THREE.Vector3, len?: number }, ...]`
  - `setHud(titleStr, latexEqStr, [{ k: 'label', v: 'value' }, ...])`
  - Required object keys inside `modules.push({ ... })`:
      id: '<MODULE_ID>',
      title: '<K>. <SECTION_TITLE>',
      controls: [ ... ], // ONLY type: 'range', 'select', or 'check' — NEVER 'checkbox'; use `id:` — NEVER `key:`
      build() { ... },
      update() { const st = this.state; ... },
      tick(dt) { ... },
      lesson: `...`,
      quiz: [ { q: '...', options: ['...', '...', '...', '...'], answer: 0 } ] // use `answer:` — NEVER `correct:`
"""

MODULES = [
    # (
    #     "module_id_1",
    #     "1. Section Title",
    #     "Detailed physics equations, constants, controls, 3D scene geometry, 2D chartEl plot, HUD LaTeX, lesson, and quiz instructions.",
    # ),
]


def sanitize_js(txt: str, mod_id: str = "", mod_title: str = "") -> str:
    txt = txt.strip()
    txt = re.sub(r"^```[a-zA-Z]*\s*", "", txt)
    txt = re.sub(r"\s*```$", "", txt)
    txt = re.sub(r"^<script[^>]*>\s*", "", txt, flags=re.I)
    txt = re.sub(r"\s*</script>$", "", txt, flags=re.I)
    txt = re.sub(r"type:\s*['\"]checkbox['\"]", "type: 'check'", txt)
    txt = re.sub(r"(\\[a-zA-Z]+)''", lambda m: f"{m.group(1)}^{{\\prime\\prime}}", txt)
    txt = re.sub(r"(\\[a-zA-Z]+)'(?=[}\s\-\+\*/=^_)])", lambda m: f"{m.group(1)}^{{\\prime}}", txt)
    txt = re.sub(r"lesson:\s*`", "lesson: String.raw`", txt)
    txt = re.sub(r"""(?<![A-Za-z0-9_$])r(['"`])((?:\\.|(?!\1).)*)\1""", lambda m: f"String.raw`{m.group(2)}`", txt)
    txt = re.sub(r"`(\$[^`\n]+?\$)`", r"\1", txt)
    txt = re.sub(r"<code>(\$[^<]+?\$)</code>", r"\1", txt)
    txt = txt.replace("\x0c", "\\f")
    txt = txt.replace("\u2013", "-").replace("\u2014", "-")
    txt = re.sub(r"<think>.*?</think>", "", txt, flags=re.S | re.I)
    txt = re.sub(r"</answer>", "", txt, flags=re.I)
    txt = re.sub(r"</?(?:parameter|tool_call|function|invoke)[^>]*>", "", txt, flags=re.I)
    idx = txt.find("modules.push(");
    if idx > 0:
        txt = txt[idx:]
    if mod_id:
        txt = re.sub(
            r"(modules\.push\(\{\s*id:\s*)['\"][^'\"]+['\"]",
            rf"\1'{mod_id}'",
            txt,
            count=1,
        )
    if mod_title:
        safe_title = mod_title.replace("'", "\\'")
        txt = re.sub(
            r"(title:\s*)['\"][^'\"]+['\"]",
            rf"\1'{safe_title}'",
            txt,
            count=1,
        )
# Convert accidental Python raw-string prefixes (r'...', r"...", r`...`) into valid JS
    txt = re.sub(r"\br(`[^`]*`)", r"String.raw\1", txt)
    txt = re.sub(
        r"""\br(['"])((?:\\.|(?!\1).)*)\1""",
        lambda m: f"String.raw`{m.group(2)}`",
        txt,
    )
    return txt.strip()

def verify_html(html: str, expected_ids: list[str]) -> list[str]:
    if ANCHOR not in html:
        raise AssertionError("Missing UI CONTROLLER anchor")
    if "left: '$', right: '$'" not in html:
        raise AssertionError("HTML shell missing explicit single-$ delimiter in renderMathInElement")
    if "OrbitControls" not in html:
        raise AssertionError("HTML shell missing OrbitControls for 3D rotate/pan/zoom")
    found_ids = re.findall(r"modules\.push\(\{\s*id:\s*['\"]([^'\"]+)['\"]", html)
    if len(found_ids) != len(set(found_ids)):
        raise AssertionError(f"Duplicate module IDs: {found_ids}")
    for eid in expected_ids:
        if eid not in found_ids:
            raise AssertionError(f"Missing expected module id: {eid}")

    mod_section = html.split("const modules = [];")[1].split(ANCHOR)[0]
    if re.search(r"controls:\s*\[[^\]]*?\bkey\s*:", mod_section, re.S):
        raise AssertionError("Found control using key: instead of id:")
    if re.search(r"type:\s*['\"]checkbox['\"]", mod_section):
        raise AssertionError("Found type: 'checkbox'; must use type: 'check'")
    if "setHud([" in mod_section:
        raise AssertionError("Found 1-arg setHud([...]); must be setHud(title, eqTex, rows)")
    if "this.setHud(" in mod_section:
        raise AssertionError("Found this.setHud(...); must call global setHud(...)")
    if re.search(r"quiz:\s*\[[^\]]*?\bcorrect\s*:", mod_section, re.S):
        raise AssertionError("Found quiz using correct: instead of answer:")
    for bad in ("this.state =", "this.state.", "this.setHud(", "key:", "type: 'checkbox'", 'type: "checkbox"'):
        assert bad not in mod_section, f"Forbidden pattern found in modules: {bad}"
    script_body = html.split('<script type="module">')[1].split("</script>")[0]
    with tempfile.NamedTemporaryFile(suffix=".mjs", mode="w", encoding="utf-8") as tf:
        tf.write(script_body)
        tf.flush()
        res = subprocess.run(["node", "--check", tf.name], capture_output=True, text=True)
        if res.returncode != 0:
            raise AssertionError(f"JS syntax error:\n{res.stderr.strip()}")
    return found_ids


def stream_completion(prompt: str) -> str:
    payload = json.dumps(
        {
            "model": MODEL,
            "messages": [
                {"role": "system", "content": API_CONTRACT},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 4200,
            "reasoning_effort": "low",
            "reasoning_budget_tokens": 64,
            "stream": True,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/chat/completions",
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": "Bearer local"},
    )
    chunks = []
    tok_count = 0
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=600) as resp:
        for raw_line in resp:
            line = raw_line.decode("utf-8", errors="ignore").strip()
            if not line.startswith("data: "):
                continue
            data = line[6:]
            if data == "[DONE]":
                break
            obj = json.loads(data)
            delta = obj.get("choices", [{}])[0].get("delta", {})
            piece = delta.get("content") or ""
            if piece:
                chunks.append(piece)
                tok_count += 1
                if tok_count % 100 == 0:
                    elapsed = max(time.time() - t0, 1e-3)
                    print(f"  [{tok_count} tok, {tok_count / elapsed:.1f} tok/s]", flush=True)
    return "".join(chunks)


def main() -> None:
    node_ver = subprocess.check_output(["node", "-v"], text=True).strip()
    print(f"Node.js {node_ver}", flush=True)

    os.makedirs(STAGE_DIR, exist_ok=True)
    if not os.path.exists(STAGE_HTML):
        shutil.copy2(LIVE_TARGET, STAGE_HTML)

    html = open(STAGE_HTML, encoding="utf-8").read()
    verify_html(html, [])

    total = len(MODULES)
    expected_ids: list[str] = []

    for idx, (mod_id, mod_title, spec) in enumerate(MODULES, start=1):
        expected_ids.append(mod_id)
        if re.search(rf"id:\s*['\"]{re.escape(mod_id)}['\"]", html):
            print(f"[{idx}/{total}] {mod_id}: SKIP (already verified)", flush=True)
            continue

        prompt = (
            f"Build Module {idx} of {total}:\n"
            f"- id: '{mod_id}'\n"
            f"- title: '{mod_title}'\n\n"
            f"Physics, Visuals, Controls, Lesson & Quiz Specification:\n{spec}\n"
        )

 est_tok, mode = forecast_tokens(spec)
        print(f"[{idx}/{total}] {mod_id}: Forecast ~{est_tok} tok -> mode={mode}", flush=True)

        passed = False
        for attempt in range(1, 6):
            if attempt == 1:
                active_mode = mode
            elif attempt == 2:
                active_mode = "COMPACT" if mode == "STANDARD" else "ULTRA_COMPACT"
            else:
                active_mode = "ULTRA_COMPACT"

            directive = (
                ULTRA_COMPACT_DIRECTIVE if active_mode == "ULTRA_COMPACT"
                else COMPACT_DIRECTIVE if active_mode == "COMPACT"
                else ""
            )
            prompt = (
                f"Build Module {idx} of {total}:\n"
                f"- id: '{mod_id}'\n"
                f"- title: '{mod_title}'\n\n"
                f"Physics, Visuals, Controls, Lesson & Quiz Specification:\n{spec}{directive}\n"
            )

            print(f"[{idx}/{total}] {mod_id} (attempt {attempt}, {active_mode})...", flush=True)
            t_start = time.time()
            try:
                raw_js = stream_completion(prompt)
                clean_js = sanitize_js(raw_js, mod_id, mod_title)
                if "modules.push(" not in clean_js:
                    raise AssertionError("Output missing modules.push(")
                candidate_html = html.replace(ANCHOR, f"{clean_js}\n{ANCHOR}", 1)
                found = verify_html(candidate_html, expected_ids)
                html = candidate_html
                open(STAGE_HTML, "w", encoding="utf-8").write(html)
                shutil.copy2(STAGE_HTML, LIVE_TARGET)
                dt = time.time() - t_start
                print(f"  PASS ({dt:.1f}s): Verified {len(found)} modules {found}", flush=True)
                passed = True
                break
            except Exception as exc:
                dt = time.time() - t_start
                print(f"  FAIL ({dt:.1f}s): {exc}", flush=True)

        if not passed:
            print(f"ERROR: {mod_id} failed all 5 attempts.", flush=True)
            sys.exit(1)

    verify_html(open(LIVE_TARGET, encoding="utf-8").read(), expected_ids)
    print(f"ALL {total} {CHAPTER_LABEL} MODULES GENERATED AND VERIFIED!", flush=True)


if __name__ == "__main__":
    main()
````

---

## 5. Standard `tmux` Launch & Live Monitoring

### Launch in `tmux` (Detached-Safe)

```bash
tmux kill-session -t <SLUG> 2>/dev/null || true
python3 -m py_compile /tmp/build_<SLUG>.py && tmux new -s <SLUG> 'python3 /tmp/build_<SLUG>.py 2>&1 | tee /tmp/build_<SLUG>.log'
```

### Live Monitoring (2nd Terminal)

```bash
tail -f /tmp/build_<SLUG>.log
watch -n 10 'grep -n "id:" /home/steve/keanapps/<TARGET_HTML>.html | tail -n 20'
```

---

## 6. Assistant Generation Checklist (When User Supplies Chapter Details)

When the user uploads `CONTEXTCUT-LAB-FACTORY_3_5.md` and provides **Author(s), Book/Course Title, Chapter Title, and Section Headings**, the assistant MUST output in one response:

1. **Baseline HTML Shell (`<TARGET_HTML>.html`):** Complete single-file Three.js + 2D Canvas + KaTeX + sidebar/HUD/quiz UI controller with `const modules = [];` and `/* === UI CONTROLLER === */`, pre-branded with the Author(s), Book/Course Title, and Chapter Title.
2. **Direct Builder Script (`/tmp/build_<slug>.py`):** Complete self-contained Python builder populated with every chapter section (plus a final Capstone Projects & Problems module), full equations, 3D visuals, 2D `chartEl` plots, `setHud` LaTeX metrics, `lesson` HTML, and `quiz` items.
3. **Copy-Paste `tmux` Command:** Ready-to-run `py_compile` + `tmux new -s <slug>` command.

---

## Hardening Rules (Mandatory Overrides)

1. **Invocation Mode & Thinking Budget:**
   - Run ContextCut-PRO in **Chat mode** (disable `read_file` tool loops) and emit **only** `/tmp/build_<slug>.py` and `/tmp/watch_<slug>.sh`—reuse `/home/steve/keanapps/em-<slug>.html` (with old `modules.push(...)` blocks stripped and `<title>`/`<h1>` updated) instead of regenerating the HTML shell.
   - Set `"reasoning_effort": "low", "reasoning_budget_tokens": 64` in `stream_completion()`.

2. **Baseline HTML Shell Requirements:**
   - Byte 0 MUST be `<!DOCTYPE html>` (strip any leading characters/BOM before writing).
   - Include `<link rel="icon" href="data:," />` in `<head>`.
   - Map `"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"` in `<script type="importmap">`, import `{ OrbitControls } from 'three/addons/controls/OrbitControls.js'`, instantiate `const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.06; controls.zoomSpeed = 0.45;`, and call `controls.update()` inside `animate()`.
   - Load `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js` after `katex.min.js` and invoke `renderMathInElement` inside **both** `setHud()` (on `hudEq`) and `loadModule()` (on `lessonEl` right after setting `lessonEl.innerHTML`) using explicit single-`$` delimiters:
     `renderMathInElement(el, { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}, {left: '\\(', right: '\\)', display: false}, {left: '\\[', right: '\\]', display: true}], throwOnError: false, strict: false })`
   - Attach `.setVectors(nextVecs)` (disposing old child geometries) to the `THREE.Group` returned by `addArrowField()`.

3. **`API_CONTRACT` Additions:**
   - NEVER reassign `this.state = {...}` inside `build()`; initialize defaults via `Object.assign(this.state, {...})` or read `this.state` directly so UI slider listeners stay bound to the same object reference.
   - Always format lesson strings as `lesson: String.raw` + backtick-delimited template literals (`String.raw` + `` `...` ``) so JavaScript never turns `\frac` into form-feed (`\x0c`) or `\rho` into `\r`. Avoid Unicode en-dashes (`–`) inside `$ ... $` delimiters.

4. **`sanitize_js()` & `verify_html()` Gatekeeper Rules:**
   - In `sanitize_js(raw_js, mod_id, mod_title)`: normalize plain backtick `lesson:` strings to `lesson: String.raw`, restore `\x0c` to `\f`, replace `\u2013` / `\u2014` with `-` inside lesson strings, strip backticks or `<code>` tags wrapping `$...$` inline math, and rewrite the first `modules.push({ id: ..., title: ... })` header to match the exact requested `mod_id` and `mod_title`.
   - In `verify_html()`: assert `"left: '$', right: '$'" in html` and `"OrbitControls" in html`, reject `re.search(r"\bthis\.state\s*=\s*\{", mod_section)`, and reject 1-arg `re.search(r"\bsetHud\(\s*[^,)]+\s*\)", mod_section)` (allow 3-arg `setHud(title, eqTex, rows)`).
5. **`tmux` Launch (No Duplicate Logging):**
   - Because `watch_<slug>.sh` already pipes `python3 "$BUILDER" 2>&1 | tee -a "$LOG"`, launch `tmux new -s <slug> 'bash /tmp/watch_<slug>.sh'` without an outer `| tee`.

### Token-Forecasting Router, 3-Tier Escalation & Streaming Guard
- **Pre-call complexity forecast (`forecast_tokens(spec)`):** Estimate total output tokens (`1150 + 45 * non_empty_lines + 140 * num_controls + 110 * num_quiz`) before calling Ollama:
  - `< 3400` → start in `STANDARD` (`<= 220` lines)
  - `3400..4099` → start in `COMPACT` (`<= 175` lines, loop-generated meshes, concise prose)
  - `>= 4100` → start in `ULTRA_COMPACT` (`<= 140` lines, 4–6 primitive meshes, 2 short quiz items)
- **3-tier escalation ladder:** On retry, escalate `STANDARD` → `COMPACT` → `ULTRA_COMPACT` (never bounce back down).
- **Streaming early-abort (`2600` tok):** In the streaming reader, abort immediately if `tok_count >= 2600` and `"lesson:"` has not appeared yet (preventing guaranteed `>4200` token truncation) and advance to the next compression tier.

### Base HTML Shell Runtime Guards (Verify on Cloned Shell)
Before building modules onto a cloned base HTML shell, ensure the shell's module loader and control builder include these three safeguards:
1. **Pre-seed `mod.state` before `mod.build()`:** Inside `loadModule(mod)`, initialize `mod.state = mod.state || {};` and copy every control's default `c.value` (parsed via `parseFloat` for `'range'` and `!!` for `'check'`) into `mod.state[c.id]` **before** `mod.build()` or `mod.update()` runs.
2. **Support string or object `<select>` options:** In `buildControls(mod)`, normalize each option `o` as `const val = (typeof o === 'object' && o !== null) ? o.value : o;` and `const lbl = (typeof o === 'object' && o !== null) ? (o.label ?? o.value) : o;` so both `['2', '4', '6']` and `[{ value, label }]` render properly.
3. **Smooth wheel zoom:** Set `controls.zoomSpeed = 0.45;` on `OrbitControls`.
