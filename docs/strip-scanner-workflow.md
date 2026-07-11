# Future Strip Scanner Workflow

**Status:** Architecture only — not implemented  
**Privacy:** No photos, frames, or uploads are stored. Processing runs locally in the browser.

---

## Intended Capture Flow

```
Camera Permission
       ↓
Live Preview + Alignment Guide
       ↓
Lighting Check
       ↓
Focus Check
       ↓
Stability Check
       ↓
Green "Ready" Indicator
       ↓
Capture Single Frame
       ↓
Read Pad Colors (FrameAnalyzer + ColorMatcher)
       ↓
Discard Frame Immediately
       ↓
Show Proposed Results
       ↓
User Verification (editable pickers)
       ↓
Save Final Readings Only
```

---

## Module Responsibilities

| Module | Role |
|--------|------|
| `StripScanner` | Camera lifecycle, session management |
| `ScannerSession` | Quality loop, proposed selections, no persistence |
| `FrameAnalyzer` | Focus, lighting, alignment, stability scoring |
| `ColorMatcher` | RGB → chart value via calibration anchors |
| `StripCalibration` | Per-brand pad ROIs and color anchors |

---

## Privacy Rules

- Never call `canvas.toDataURL`, `File`, `IndexedDB`, or `localStorage` for image data
- Stop all `MediaStreamTrack` instances when leaving the scan page
- Only numeric readings and optional quality scores are saved on the `WaterTest`
- Sampled RGB tuples are optional and local-only (can be omitted in strict mode)

---

## Integration Point

When implemented, `QuickCheckWorkflow` will offer **Scan with camera** on the Instructions step. The manual chart picker remains the fallback path.

See `src/strip/scanner/interfaces.ts` for API definitions.
