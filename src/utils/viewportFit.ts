import { ViewportMode } from '../types/finance';

export interface ViewportFitResult {
  mode: ViewportMode;
  framed: boolean;
  frameWidth: number;
  frameHeight: number;
  scale: number;
  ratioLabel: string;
}

export const MOBILE_LOGICAL_WIDTH = 390;
export const MOBILE_LOGICAL_HEIGHT = 844;
export const DESKTOP_LOGICAL_WIDTH = 1280;
export const DESKTOP_LOGICAL_HEIGHT = 800;

export function computeViewportFit(params: {
  mode: ViewportMode;
  windowWidth: number;
  windowHeight: number;
  reserveTopBarPx?: number;
}): ViewportFitResult {
  const { mode, windowWidth, windowHeight, reserveTopBarPx = 44 } = params;
  const safeW = Math.max(240, windowWidth);
  const safeH = Math.max(320, windowHeight);

  if (mode === 'auto') {
    return {
      mode,
      framed: false,
      frameWidth: safeW,
      frameHeight: safeH,
      scale: 1,
      ratioLabel: safeW >= 1024 ? 'Fluid Desktop' : 'Fluid Mobile',
    };
  }

  if (mode === 'mobile') {
    // On an actual phone-sized viewport, render edge-to-edge without shrinking
    if (safeW <= 430 && safeH <= 940) {
      return {
        mode,
        framed: false,
        frameWidth: safeW,
        frameHeight: safeH,
        scale: 1,
        ratioLabel: 'Mobile · Full Fit',
      };
    }

    const availW = Math.max(200, safeW - 32);
    const availH = Math.max(300, safeH - reserveTopBarPx - 28);
    const scale = Number(
      Math.min(availW / MOBILE_LOGICAL_WIDTH, availH / MOBILE_LOGICAL_HEIGHT, 1.05).toFixed(4),
    );

    return {
      mode,
      framed: true,
      frameWidth: MOBILE_LOGICAL_WIDTH,
      frameHeight: MOBILE_LOGICAL_HEIGHT,
      scale,
      ratioLabel: 'Mobile 9:19.5',
    };
  }

  // Desktop mode (16:10 widescreen fitted cleanly to available screen dimensions)
  const availW = Math.max(220, safeW - 24);
  const availH = Math.max(220, safeH - reserveTopBarPx - 24);
  const scale = Number(
    Math.min(availW / DESKTOP_LOGICAL_WIDTH, availH / DESKTOP_LOGICAL_HEIGHT, 1.12).toFixed(4),
  );

  return {
    mode,
    framed: true,
    frameWidth: DESKTOP_LOGICAL_WIDTH,
    frameHeight: DESKTOP_LOGICAL_HEIGHT,
    scale,
    ratioLabel: 'Desktop 16:10',
  };
}
