# Test Strip Quick Check — Technical Planning Document

**Status:** Planning only — not implemented  
**Product:** Pool Boy Pro  
**Last updated:** July 2026

---

## 1. Executive Summary

Test Strip Quick Check is a **future convenience mode** for routine water checks using pool test strips. It is explicitly **lower confidence** than Taylor K-2006-SALT titration testing, which remains the primary, recommended method.

The feature supports:

1. **Manual strip entry** — user reads pads and types values  
2. **Live camera-assisted scanning** — temporary frame analysis only; no photos stored  
3. **User verification** — all readings confirmed before save  
4. **Separate test source** — strip tests stored distinctly from Taylor tests  
5. **Confidence scoring** — overall and per-parameter confidence displayed at save time  

---

## 2. Design Principles

| Principle | Implementation |
|-----------|----------------|
| Taylor is primary | Quick Check labeled secondary; Taylor workflow unchanged |
| Privacy first | No photos, frames, or screenshots persisted or uploaded |
| On-device processing | Color sampling and estimation run in browser (Web APIs / WASM) |
| User in control | Scanner proposes values; user edits and confirms |
| Honest uncertainty | Confidence score and limitations always visible |
| Modular chemistry | Strip logic isolated from Taylor kit and analysis core |

---

## 3. Feature Goals

### 3.1 User-facing goals

- Clearly labeled **“Test Strip Quick Check”** entry point (separate from New Test / Taylor)
- Persistent badge: **“Lower confidence than Taylor testing”**
- Manual entry fallback when camera unavailable or user prefers it
- Live camera scanner with alignment guide and quality gates
- Review screen with editable fields before save
- Saved tests tagged with `testSource: 'test_strip'`
- Overall confidence score (0–100) on saved test and detail view

### 3.2 Non-goals (v1)

- Replacing Taylor workflow
- Cloud image upload or ML inference servers
- Storing calibration photos
- Automatic treatment without user review
- Strip inventory management

---

## 4. Data Model Changes

### 4.1 New types (`src/models/types.ts`)

```typescript
export type TestSource = 'taylor_k2006_salt' | 'test_strip';

export type StripConfidenceLevel = 'high' | 'medium' | 'low';

export interface StripPadReading {
  parameter: StripParameterKey;
  estimatedValue: number;
  /** Raw RGB sampled from pad (optional, for audit/debug locally) */
  sampledRgb?: [number, number, number];
  confidence: number; // 0–100
  confidenceLevel: StripConfidenceLevel;
  /** User edited this value after scan */
  manuallyEdited?: boolean;
}

export interface StripTestMetadata {
  manufacturer: string;
  model: string;
  testSource: 'test_strip';
  captureMethod: 'manual' | 'camera';
  overallConfidence: number;
  padReadings?: StripPadReading[];
  /** Quality metrics at capture time (not images) */
  captureQuality?: {
    focusScore: number;
    lightingScore: number;
    alignmentScore: number;
    stabilityScore: number;
  };
  limitationsAcknowledged: boolean;
}

export interface WaterTest {
  // existing fields...
  testSource?: TestSource; // default 'taylor_k2006_salt' for legacy
  stripMetadata?: StripTestMetadata;
}
```

### 4.2 Strip parameter mapping

Not all Taylor parameters appear on every strip. Mapping is brand/model specific:

| Strip pad (typical) | Maps to `WaterReadings` | Notes |
|---------------------|-------------------------|-------|
| Free chlorine | `freeChlorine` | May not distinguish FC vs TC |
| Total chlorine | derived or `combinedChlorine` estimate | Brand-dependent |
| pH | `ph` | |
| Total alkalinity | `totalAlkalinity` | Often low resolution |
| Calcium hardness | `calciumHardness` | Optional pad |
| Cyanuric acid | `cyanuricAcid` | Optional pad |
| Salt | `salt` | Rare on strips; usually N/A |

**Combined chlorine:** If strip only reports total chlorine (TC), estimate `combinedChlorine = max(0, TC - FC)` with reduced confidence.

**Not on strips:** `acidDemand`, `baseDemand` — leave undefined; analysis already handles optional fields.

### 4.3 Storage and migration

- `AppData.version` increment
- Migration: existing tests get `testSource: 'taylor_k2006_salt'`
- Strip calibration profiles stored in `AppData.stripProfiles` or bundled JSON (not user photos)

### 4.4 Analysis integration

- `analyzeTest()` unchanged in signature; accepts partial readings
- Analysis engine already uses Pool Profile targets (see `poolProfiles.ts`)
- UI shows confidence alongside analysis on strip tests
- Dashboard can filter or badge strip vs Taylor (future; not required v1)

---

## 5. UI / Pages / Components

### 5.1 Navigation entry

**Location:** New route `/quick-check` or button on Dashboard / History (not inside New Test wizard)

**Label:** “Test Strip Quick Check” with subtitle: “Convenience check — less accurate than Taylor”

Do **not** modify New Test workflow per product requirements.

### 5.2 Page flow

```
QuickCheckStartPage
  → Select manufacturer
  → Select model
  → Choose: [Scan with camera] | [Enter manually]

QuickCheckScanPage (camera path)
  → Live preview + alignment overlay
  → Quality indicators (focus, light, position, stability)
  → Green “Captured” when acceptable
  → Processing spinner (frame discarded immediately after sample)

QuickCheckReviewPage
  → Estimated readings table (editable)
  → Per-parameter confidence badges
  → Overall confidence score
  → Limitations disclaimer (required checkbox)
  → Pool volume confirm (from settings)
  → [Save Quick Check]

QuickCheckSavedPage / redirect to TestDetail
```

### 5.3 New components (suggested paths)

| Component | Responsibility |
|-----------|----------------|
| `src/pages/QuickCheckPage.tsx` | Wizard container |
| `src/components/strip/StripManufacturerSelect.tsx` | Brand picker |
| `src/components/strip/StripModelSelect.tsx` | Model picker with pad list preview |
| `src/components/strip/StripScanner.tsx` | Camera + overlay + quality loop |
| `src/components/strip/StripAlignmentGuide.tsx` | SVG overlay for strip placement |
| `src/components/strip/CaptureQualityIndicator.tsx` | Focus/light/align/stability meters |
| `src/components/strip/CaptureConfirmBadge.tsx` | Green “Captured” state |
| `src/components/strip/StripReadingReview.tsx` | Editable review form |
| `src/components/strip/ConfidenceBadge.tsx` | Per-parameter + overall confidence |
| `src/components/strip/StripLimitationsNotice.tsx` | Accuracy disclaimer |

### 5.4 Visual design constraints

- Reuse existing `Card`, `Input`, `Select`, `Button`, `PageHeader`
- No redesign of global layout or mobile navigation
- Warning color (`--status-low`) for low confidence; existing status tokens

---

## 6. Scanner Workflow (Live Camera)

### 6.1 Sequence

1. Request camera permission (`getUserMedia` — environment/rear camera preferred)
2. Display live `<video>` stream (no recording)
3. Render alignment guide over strip region
4. Run quality evaluation loop (~5–10 fps on `requestAnimationFrame` or `OffscreenCanvas`)
5. When all quality scores exceed thresholds **and** stable for N frames → show green **“Captured”**
6. Sample pad regions from **single video frame** into RGB averages
7. **Immediately** stop sampling; release frame buffers; do not write to disk
8. Map RGB → ppm via calibration table for selected model
9. Navigate to review with proposed values

### 6.2 Alignment guide

- Semi-transparent rectangle sized to expected strip aspect ratio (model-specific)
- Center crosshair and edge markers
- Text: “Align strip inside box, fill frame width, avoid glare”
- Optional: color-neutral gray border for white-balance reference (future)

### 6.3 Green “Captured” confirmation

Trigger when **all** conditions met for ≥ 500 ms:

| Gate | Threshold (initial) |
|------|---------------------|
| Focus | Laplacian variance > model minimum |
| Lighting | Luminance in 40–85% range; not clipped |
| Alignment | Strip bounding box IoU > 0.85 with guide |
| Stability | Motion < 2% frame delta for 8 consecutive frames |

UI: green border pulse + “Captured ✓” + haptic (mobile) + auto-advance to processing

### 6.4 Temporary frame processing

```typescript
interface FrameSampleResult {
  padSamples: Array<{ padId: string; rgb: [number, number, number] }>;
  quality: CaptureQuality;
  timestamp: number;
}
```

- Draw current video frame to offscreen canvas
- Crop pad ROIs from calibration config (normalized 0–1 coordinates)
- Average RGB excluding specular highlights (clip top 5% luminance pixels)
- Pass RGB to `estimateStripReading(manufacturer, model, padId, rgb)`
- Set canvas dimensions to 0 / dereference after use

**Never:** `canvas.toDataURL`, `File`, `IndexedDB`, `localStorage` for image data

---

## 7. User Verification Workflow

1. Review screen shows each pad: estimated value, confidence, color swatch (computed CSS, not photo)
2. User taps field to edit; `manuallyEdited: true` on change
3. Manual edits recalculate overall confidence (edited fields → medium confidence max)
4. Required checkbox: “I understand strip tests are less accurate than Taylor”
5. Save creates `WaterTest` with `stripMetadata` and runs `analyzeTest()` for recommendations
6. Test detail page shows Test Source badge and confidence

---

## 8. Confidence Scoring

### 8.1 Per-parameter confidence (0–100)

Weighted factors:

| Factor | Weight | Notes |
|--------|--------|-------|
| Capture quality average | 30% | focus, light, alignment, stability |
| Calibration fit | 25% | distance to nearest color anchor in LAB space |
| Strip timing | 15% | user-entered “seconds since dip” optional |
| Pad resolution | 15% | coarse strips (wide bins) reduce score |
| Manual override | 15% | edited = cap at 75; manual-only entry = cap at 60 |

### 8.2 Overall confidence

```
overall = min(perParameterConfidences) * 0.6 + mean(perParameter) * 0.4
```

Display bands:

- **High:** 75–100  
- **Medium:** 50–74  
- **Low:** 0–49  

### 8.3 Analysis interaction

- Low confidence does **not** block saving
- Recommendations shown with banner: “Based on strip estimate — confirm with Taylor test before large chemical additions”
- Treatment plan safety rules unchanged

---

## 9. Calibration Strategy

### 9.1 Brand-specific strip profiles

File: `src/strip/calibrations/{manufacturer}/{model}.json`

```typescript
interface StripCalibrationProfile {
  id: string;
  manufacturer: string;
  model: string;
  stripAspectRatio: number;
  dipWaitSeconds: { min: number; max: number };
  pads: Array<{
    id: string;
    parameter: StripParameterKey;
    roi: { x: number; y: number; w: number; h: number }; // normalized
    anchors: Array<{ lab: [number, number, number]; value: number }>;
    maxValue: number;
    step: number; // e.g. 0.5 ppm resolution
  }>;
}
```

### 9.2 Color → value conversion

1. RGB → sRGB linear → XYZ → CIELAB
2. Find nearest anchor in LAB (Euclidean ΔE)
3. Interpolate between two closest anchors
4. Quantize to strip step size
5. Confidence inversely proportional to ΔE

### 9.3 Initial supported brands (phased)

| Phase | Brands |
|-------|--------|
| Phase 1 | Hach AquaChek 7-Way, Clorox Pool & Spa |
| Phase 2 | LaMotte Insta-TEST, Poolmaster |
| Phase 3 | Community-contributed profiles (import JSON, no photos) |

### 9.4 Manual correction workflow

- User always sees editable fields
- “Reset to scanned values” button if edited
- Optional “This reading looks wrong” → forces manual entry mode for that pad

---

## 10. Offline Support

- All calibration JSON bundled with app (Vite static import)
- Camera scanning works offline after initial page load
- No server dependency for color mapping
- Service worker (optional future): cache quick-check route and calibrations

---

## 11. Privacy Approach

### 11.1 Never store or transmit

- Photos  
- Video recordings  
- Camera frames / bitmaps  
- Screenshots  
- Base64 image strings  

### 11.2 Store only

- Manufacturer + model IDs  
- Estimated numeric readings (confirmed by user)  
- Optional sampled RGB tuples (local-only; could omit in strict mode)  
- Confidence scores + capture quality metrics  
- Timestamp, test source, pool snapshot  

### 11.3 Camera permissions

- Request only when user starts scan
- Stop all tracks on page leave (`track.stop()`)
- No background camera access

### 11.4 Privacy copy (shown before first scan)

> Pool Boy Pro processes strip colors on your device. Images are never saved or uploaded.

---

## 12. Accuracy Limitations

Document prominently in UI and help:

| Limitation | Impact |
|------------|--------|
| Camera white balance | Shifts perceived pad color vs human eye |
| Lighting | Indoor warm/cool LEDs bias RGB |
| Shadows | Dark side of pad reads low |
| Reflections / glare | Specular highlights wash out color |
| Camera differences | Wide variation between phone models |
| Strip timing | Reading too early/late vs bottle instructions |
| Strip brand variance | Batch and age affect pad color |
| Color fading | Old strips read falsely low/high |
| Resolution | Strips use wide ppm bins (e.g. pH 0.2 steps) |
| FC vs TC | Many strips don’t measure true FAS-DPD free chlorine |

### Why Taylor K-2006-SALT remains preferred

- **FAS-DPD** measures true free chlorine, not total chlorine proxy  
- **Titration** removes color judgment — drop count is objective  
- **Salt test** is a dedicated cell measurement, not available on most strips  
- **CYA, TA, CH** titrations are more precise than pad color matching  
- No camera or lighting variables  
- Industry standard for pool professionals  

Quick Check is suitable for **mid-week spot checks**; Taylor should be used before significant chemical adjustments, algae events, or when results are unexpected.

---

## 13. Module Architecture

```
src/strip/
  calibrations/          # JSON profiles per brand/model
  stripTypes.ts          # Strip-specific types
  stripCalibration.ts    # Load profile, RGB→ppm
  stripConfidence.ts     # Scoring engine
  stripQuality.ts        # Focus, lighting, alignment, stability
  stripScanner.ts        # Frame sample orchestration (no persistence)
  index.ts

src/pages/QuickCheckPage.tsx
src/services/quickCheckService.ts   # createStripTest(), validation
```

**Integration points:**

- `testService.createWaterTest()` → add `createStripWaterTest()` sibling  
- `WaterTest.testSource` discriminates history/filtering  
- Analysis: `analyzeTest(readings, pool, strengths)` — no formula changes  
- Pool Profile: thresholds from `poolProfiles.ts` — already profile-aware  

---

## 14. Future Implementation Phases

### Phase 0 — Foundation (prerequisite) ✅

- Pool Profiles and configurable target ranges  
- Modular chemistry in `src/chemistry/`  

### Phase 1 — Manual Quick Check (MVP)

- Data model + migration  
- Quick Check route and manual entry UI  
- Save with `testSource: 'test_strip'`, confidence = manual cap  
- Test detail badge + disclaimer  
- Unit tests for calibration math (static RGB fixtures)  

**Estimate:** 1–2 weeks  

### Phase 2 — Camera Scanner Core

- `getUserMedia` preview + alignment overlay  
- Quality gates (focus, light, stability)  
- Single-frame pad sampling  
- One calibration profile (AquaChek 7-Way)  
- Review + edit flow  

**Estimate:** 2–3 weeks  

### Phase 3 — Confidence + Multi-Brand

- Full confidence scoring  
- 3–5 manufacturer profiles  
- Capture quality metrics stored  
- Treatment banner for low confidence  

**Estimate:** 1–2 weeks  

### Phase 4 — Polish + Offline

- Additional strip models  
- Optional dip timer  
- Service worker offline cache  
- History filter: Taylor vs Strip  

**Estimate:** 1 week  

### Phase 5 — Advanced (optional)

- WASM color science library for consistent LAB  
- User-imported calibration JSON (custom profiles, no photos)  
- Side-by-side Taylor vs Strip comparison on same day  

---

## 15. Testing Strategy

| Layer | Tests |
|-------|-------|
| `stripCalibration.ts` | RGB → ppm with known anchor fixtures |
| `stripConfidence.ts` | Score monotonicity, manual edit caps |
| `stripQuality.ts` | Synthetic canvas focus/motion detection |
| `quickCheckService.ts` | Save payload, no image fields |
| Integration | Quick check → analyzeTest → recommendations |
| E2E (manual) | Real devices, multiple lighting conditions |

---

## 16. Open Questions

1. Store sampled RGB in test record or discard for stricter privacy?  
2. Allow strip tests on Dashboard health score same weight as Taylor?  
3. Require Taylor confirmation before executing treatment plan from strip test?  
4. Support bromine strips separately from chlorine pad mapping?  

---

## 17. Acceptance Criteria (when implemented)

- [ ] Entry labeled “Test Strip Quick Check” with lower-confidence warning  
- [ ] Taylor New Test workflow unchanged  
- [ ] Manual entry path saves with correct test source  
- [ ] Camera path never persists images (verify storage audit)  
- [ ] Green capture only when quality gates pass  
- [ ] User must review and can edit all values before save  
- [ ] Confidence score visible on saved test  
- [ ] Analysis uses Pool Profile targets automatically  
- [ ] Offline manual entry works without network  

---

*This document is planning-only. No Quick Check code ships until a dedicated implementation phase is scheduled.*
