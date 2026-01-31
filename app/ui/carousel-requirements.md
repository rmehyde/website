## Animated Profile Selector + Spider Graph + PDF Resume Generator

### Summary

We want to add an “intro carousel” animation to a Radix/shadcn Select that cycles through profiles (e.g., “Machine Learning Engineer”, “Tech Lead”), while also animating a spider graph that reflects the profile’s weight vector. This intro is a purely presentational flourish that should not trigger expensive side effects (PDF generation) and should be immediately cancelled on any user interaction. After the intro completes (or is cancelled by interaction), the page behaves normally: the committed profile/weights drive UI and trigger PDF generation.

---

## Current State

### UI and data flow (today)

* The page is a static site with a client-side (WASM) PDF resume generator.
* There is a **weight state** representing multiple dimensions (0–5), visualized in a **spider graph**.
* The weights drive:

    1. the spider graph rendering
    2. the PDF output generation (recomputed on changes)

### PDF generation behavior

* Each weights change triggers PDF regeneration.
* PDF generation takes ~1 second.
* The generation pipeline is already structured to avoid uncontrolled concurrency:

    * “one running generation”
    * “one queued generation”
    * queued requests replace earlier queued requests if weights change again while running

### Profile concept (today)

* A “profile” is a named preset mapping to a weight vector:

    * `"Machine Learning Engineer" → {MLE: 5, ML Science: 4, Frontend: 2, Backend: 3, ...}`
    * `"Tech Lead" → {Leadership: 5, ...}`
* The profile selector under discussion renders “Reese is a [Profile]”.
* There is also a “custom” condition where the current weights do not match any known profile, and the profile selector reflects a special “custom” state.

---

## Target State

### Desired UX

* On page load, the profile selector performs an **intro carousel effect**:

    * The visible profile label cycles through a sequence of profiles for ~4 seconds.
    * In sync, the spider graph animates to reflect each previewed profile’s weights.
    * The intro provides a polished “spinning through options” effect before settling.

### Non-negotiable behavior

* **No expensive side effects during intro**:

    * PDF generation must not begin for the eventual default/target state while intro is running.
    * The page must not “leak” the final selection via PDF generation during the preview.
* **Immediate cancellation on interaction**:

    * Any user interaction (opening the Select, clicking, key press, dragging the spider graph, etc.) cancels the intro instantly.
    * After cancellation, the app switches to normal interactive behavior.

### Post-intro behavior

* After intro completes or is cancelled:

    * The UI shows the “real” committed state:

        * committed profile selection (or custom)
        * committed weights
    * The spider graph reflects committed weights.
    * PDF generation runs normally, driven by committed weights.
    * URL params are written to reflect the committed state.

### URL parameter requirements

* **URL read on load**: if URL specifies a profile/weights, that becomes the initial committed target (overriding the default profile).
* **URL write timing**:

    1. write once when transitioning out of intro (so the URL reflects what is actually shown/active)
    2. write on subsequent committed changes

---

## Implementation Plan

### Core architectural decision

Introduce an explicit page-level **mode** and split state into:

* **target/committed state**: stable “truth” used for real behavior and side effects
* **preview state**: fast-changing values used only for intro visuals

This prevents fighting Radix Select semantics and prevents side effects from firing during intro, while still enabling the spider graph and label to animate through real profile options.

---

## State Model

### Page-level state (single owner)

These states live at the page/container level (above profile selector and spider graph):

1. **`mode`**

* Values: `intro` | `interactive`
* Meaning:

    * `intro`: run preview animation, suppress expensive effects
    * `interactive`: normal behavior; committed state drives everything

2. **`committedWeights`**

* The authoritative weight vector for the page.
* Drives:

    * spider graph (in interactive mode)
    * PDF generation (only in interactive mode)
    * derived committed profile label (profile vs custom)

3. **`targetCommittedWeights`** (initial target)

* The “real” initial state that the UI will settle into after intro.
* Determined once on load:

    * from URL params if present and valid
    * else default profile weights (e.g., Machine Learning Engineer)

This can be implemented as:

* initialize `committedWeights` immediately to this value, OR
* keep `targetCommittedWeights` separate until intro ends
  Either is acceptable as long as side effects are gated by mode, but the key is:
* there is a known final target early (default or URL-derived), even if not displayed during intro.

4. **`previewWeights`**

* Only meaningful while `mode === intro`.
* Updated repeatedly by the intro carousel timeline.
* Drives:

    * spider graph during intro
    * displayed profile label during intro (via current preview profile)

5. **Intro control**

* A single, centralized “exit intro” transition:

    * stops timers/animation drivers
    * sets `mode = interactive`
    * snaps visuals to committed state

Additionally, store a reason if useful:

* `exitIntro("auto")` when timer finishes
* `exitIntro("user")` when interaction occurs
  This becomes useful for analytics later and for debugging.

---

## Derived Values

These are computed, not stored (or stored only for convenience):

* **`committedProfileId`**

    * derived from `committedWeights`
    * returns a known profile id if weights match a preset
    * else returns `"custom"` (or `null`/placeholder)

* **`previewProfileId`**

    * during intro, determined by carousel sequence
    * used for the animated label
    * maps to `previewWeights`

Matching strategy:

* exact match if weights are discrete 0–5 and presets are exact
* if future interpolation/animation introduces non-integers, define a stable rounding/tolerance rule for matching or always treat as “custom” unless exactly on a preset

---

## Component Responsibilities and Changes

### 1) Profile Select (Radix/shadcn Select wrapper)

**Goal:** show animated label during intro; behave like normal Select in interactive mode.

* In `intro` mode:

    * visually display the **preview profile label** (carousel)
    * do **not** treat the select as “really changing selection” semantically
    * cancel intro on any user interaction:

        * pointer down
        * key down
        * opening the dropdown (`onOpenChange(true)`)

* In `interactive` mode:

    * show committed profile label (or custom)
    * selecting a profile sets `committedWeights = weightsFromProfile(profileId)`
    * selecting “custom” is not a user option; it’s derived from weights edits

**Accessibility requirements:**

* The rapidly changing animated label must be excluded from assistive tech:

    * mark the animated overlay as `aria-hidden`
* The accessible label/value for the trigger should remain stable:

    * it should reflect committed selection (or a stable generic label) during intro
* Respect `prefers-reduced-motion`:

    * if reduced motion is enabled, skip the intro carousel entirely and immediately enter interactive mode (or present a non-animated settle)

### 2) Spider Graph

**Goal:** animate preview during intro, edit committed weights during interaction.

* Display source:

    * if `mode === intro`: render from `previewWeights`
    * else: render from `committedWeights`

* User interaction:

    * any drag/edit interaction must:

        1. call `exitIntro("user")` if currently in intro
        2. apply edits to `committedWeights` (authoritative)
    * once interactive, further edits update committed normally

Optional:

* In interactive mode, spider graph may still animate transitions between committed states (smoothing), but that should remain a visual effect over committed truth (not a preview mode).

### 3) PDF Generator

**Goal:** never render during intro; render only for committed state after interactive.

* Input source:

    * always use `committedWeights`

* Execution gate:

    * if `mode === intro`: do not start PDF generation
    * once `mode === interactive`: generate PDF for current committed state, then on each committed change

* UI:

    * during intro, display a placeholder state (empty, spinner, or “Ready…”), but do not start compute
    * in interactive, show PDF or “Generating…” while pipeline is running

This preserves the non-negotiable UX: the intro does not “leak” the final selection by producing the final PDF early.

### 4) URL Param Read/Write

**Read (on load):**

* Parse URL once to determine initial target:

    * if URL provides weights/profile → set `targetCommittedWeights` accordingly
    * else use default profile weights

**Write:**

* Do not write during intro preview ticks.
* Write:

    1. once on transition to interactive (so URL reflects what the user is now actually seeing/using)
    2. on any subsequent change to `committedWeights` in interactive mode

---

## Intro Carousel Timeline

### Behavior

* Runs only if:

    * `mode === intro`
    * not reduced motion

* Produces a time series:

    * a sequence of profile ids (or weight vectors)
    * updates `previewWeights` accordingly
    * updates the displayed label (preview profile name)

### Termination

* Auto termination after N ticks / duration:

    * call `exitIntro("auto")`
    * ensure visuals settle to committed/target
* Immediate cancellation on any user interaction:

    * call `exitIntro("user")`

### After exit

* `mode` becomes `interactive`
* `previewWeights` stops updating (and can be cleared)
* spider graph switches to committed source
* PDF generation begins (once) for committed state if not already generated

---

## Why this architecture works

* The intro effect is **real and coordinated** (profile label + spider graph), but remains **non-semantic** with respect to the Select’s committed value.
* “Expensive / meaningful consequences” (PDF generation, analytics, URL writes) are tied only to **committed state** and gated by **mode**, preventing the intro from triggering unintended behavior.
* Cancellation on interaction is straightforward: it is a single transition that swaps the app from preview to interactive behavior.
* Future additions (analytics, persistence, more UI derived from weights) have a clear contract:

    * preview is for visuals only
    * committed is truth
    * mode governs readiness for side effects


## Carousel Profile Select component design

### Goal and boundaries

The carousel select is a **Radix/shadcn Select wrapper** that:

* behaves like a normal Select in interactive mode (real selection, keyboard/mouse, a11y)
* during intro mode, shows an **animated preview label** (carousel) without mutating Radix’s committed selection repeatedly
* surfaces **user-intent signals** so the page-level state machine can cancel intro immediately
* stays decoupled from app-specific side effects (PDF, URL) by exposing only the minimum state/hooks needed

### Component API: what it should expose

Keep the carousel logic “headless-ish” and let the page own mode + preview source.

Recommended props / signals:

* `mode: "intro" | "interactive"`
  Used to decide whether to show the animated overlay label and to enable cancellation hooks.
* `value` / `defaultValue`, `onValueChange`
  Standard Radix Select semantics for the committed profile selection (used in interactive mode).
* `previewLabel?: string` (or `previewProfileId?: string` + mapping)
  The currently previewed label to display during intro. The carousel component does **not** decide what it is; the page-level intro driver does.
* `onUserIntent?: (kind: "pointer" | "keyboard" | "open") => void`
  A single callback the wrapper fires when it detects user intent that should cancel intro immediately.
* `reducedMotionBehavior?: "skipIntro" | "noAnimation"` (optional)
  Generally you’ll just skip the overlay when reduced motion is set; the page can also disable intro entirely.

This aligns with the architecture: the page decides preview sequencing and mode; the Select wrapper just renders and reports intent.

### Where the animation should live

**In the Trigger only, as a visual overlay.**

* Do **not** animate the dropdown `Content` during intro. That surface is highly interactive (roving focus, typeahead, screen reader semantics).
* Do **not** repeatedly call `onValueChange` during intro. That conflates preview with committed semantics and risks side effects and a11y churn.

So: render the normal shadcn `SelectTrigger` + `SelectValue`, but when `mode === "intro"`:

* visually hide the `SelectValue` (CSS only)
* render a positioned overlay text element that shows `previewLabel` and animates between previous/next labels

### How to drive the “carousel” effect cleanly

Use a single, coherent driver for the label transitions:

* The page-level intro timeline updates `previewLabel` at some cadence (or provides `previewIndex`).
* The Trigger overlay uses **a single animation mechanism** to transition from the previous label to the new label:

    * either CSS transitions with a small internal “prev/next” buffer, or
    * a declarative animation helper (e.g., Web Animations API / Framer Motion) for simple vertical slide

Key point: avoid dual-timer choreography (one timer for ticks + another for slide completion) inside the component. Ideally:

* the component reacts to `previewLabel` changes and runs a single transition per change
* if changes arrive faster than the transition, either:

    * drop intermediate labels (latest wins), or
    * queue one pending label (at most one) to keep it smooth
      For your use case, “latest wins” is usually fine.

### Cancellation / intent detection

The component should **not** decide what cancellation means; it should only detect intent and report it.

Fire `onUserIntent` from:

* `Trigger` `onPointerDownCapture` (or `onPointerDown`) → kind `"pointer"`
* `Trigger` `onKeyDownCapture` → kind `"keyboard"`
* `Select.Root` `onOpenChange(true)` → kind `"open"`

Then the page-level handler can:

* `exitIntro("user")`
* optionally set committed value if the user actually selected something
* proceed normally

This keeps the wrapper reusable without embedding app policy.

### Accessibility requirements inside the component

During intro mode:

* The animated overlay must be **`aria-hidden="true"`** so it isn’t announced repeatedly.
* The Trigger’s accessible name/value should remain **stable** (based on committed selection or a stable label like “Profile”).
* Don’t add any live regions for the preview.
* If the user tabs to the control during intro, it should behave sensibly:

    * pressing keys/click cancels intro immediately (via intent detection)
    * focus management remains Radix-native

Also respect `prefers-reduced-motion`:

* if reduced motion is enabled, render no overlay animation (or render a static preview label), and rely on the page to skip intro mode entirely.

### Relationship to shadcn component structure

Keep the shadcn composition intact:

* `Select` (Root) remains standard
* `SelectTrigger` remains the real interactive element
* `SelectValue` remains the real semantic selected value (even if visually hidden during intro)
* `SelectContent` / `SelectItem` remain unchanged

The carousel wrapper should be a thin layer around shadcn’s existing Select exports:

* `CarouselSelect` wraps `SelectPrimitive.Root` and forwards standard props
* `CarouselSelectTrigger` wraps the trigger and renders the overlay when needed

This avoids coupling to internal DOM assumptions (like “there’s a span directly under trigger”) and keeps styling predictable.

### What state the component should *not* own

Avoid owning:

* the intro timeline (ticks, easing, duration, list of profiles)
* the source of preview labels (derivation from items/options)
* committed/preview weights (that’s app state)
* any side effects (PDF, URL, analytics)

Owning only minimal “transition bookkeeping” (previous label, animation in-progress) is fine; everything else should come from props so the page-level mode/state remains authoritative.
