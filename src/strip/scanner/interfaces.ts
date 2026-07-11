import type { StripCaptureQuality } from '../../models/types';
import type { StripBrandDefinition, StripPadSelections } from '../types';

/** RGB sample from a single pad region (never persisted as an image) */
export interface PadColorSample {
  padId: string;
  rgb: [number, number, number];
}

/** Result of analyzing one video frame — discarded after processing */
export interface FrameAnalysisResult {
  padSamples: PadColorSample[];
  quality: StripCaptureQuality;
  timestamp: number;
}

/** Quality gate thresholds for live capture */
export interface QualityGateThresholds {
  minFocus: number;
  minLighting: number;
  minAlignment: number;
  minStability: number;
  stableFrameCount: number;
}

/** Future extension point — full frame analysis API */
export interface FrameAnalyzer {
  analyzeFrame(
    imageData: ImageData,
    brand: StripBrandDefinition
  ): FrameAnalysisResult;
  getDefaultThresholds(): QualityGateThresholds;
}

/** Map sampled RGB to nearest chart value */
export interface ColorMatcher {
  matchPadColor(
    brandId: string,
    padId: string,
    rgb: [number, number, number]
  ): { value: number; confidence: number; deltaE: number };
}

/** Brand-specific pad ROI and color anchor data */
export interface StripCalibration {
  readonly brandId: string;
  getPadRegions(): Array<{ padId: string; roi: { x: number; y: number; w: number; h: number } }>;
  getColorAnchors(padId: string): Array<{ lab: [number, number, number]; value: number }>;
}

/** Active camera session state — no frames stored */
export interface ScannerSession {
  readonly sessionId: string;
  readonly brandId: string;
  readonly startedAt: number;
  isActive(): boolean;
  getLatestQuality(): StripCaptureQuality | null;
  getProposedSelections(): StripPadSelections | null;
  stop(): void;
}

/** Orchestrates camera preview, quality gates, and capture */
export interface StripScanner {
  startSession(brandId: string): Promise<ScannerSession>;
  isCameraAvailable(): Promise<boolean>;
}

export { matchPadColor } from './colorMatcher';
export { isCameraSupported, startCameraSession, stopAllTracks } from './cameraSession';
export { processScanFrame, analyzeLiveQuality } from './scanProcessor';
