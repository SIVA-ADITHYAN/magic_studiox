export interface CameraState {
  azimuth: number;
  elevation: number;
  distance: number;
}

export const DEFAULT_CAMERA: CameraState = {
  azimuth: 0,
  elevation: 0,
  distance: 1,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function buildCameraPrompt(azimuth: number, elevation: number, distance: number): string {
  const az = ((Number(azimuth) % 360) + 360) % 360;
  const el = clamp(Number(elevation), 0, 80);
  const dist = clamp(Number(distance), 0.1, 1.4);

  const azimuthText =
    az < 22.5 || az > 337.5
      ? "front view"
      : az < 67.5
        ? "front-right view"
        : az < 112.5
          ? "right side view"
          : az < 157.5
            ? "back-right view"
            : az < 202.5
              ? "back view"
              : az < 247.5
                ? "back-left view"
                : az < 292.5
                  ? "left side view"
                  : "front-left view";

  const elevationText =
    el < 10 ? "eye-level shot" : el < 30 ? "low angle shot" : el < 55 ? "elevated shot" : "top-down view";

  const distanceText =
    dist < 0.5 ? "close-up shot" : dist < 0.9 ? "medium-close shot" : dist < 1.2 ? "medium shot" : "wide shot";

  return `<sks> ${azimuthText} ${elevationText} ${distanceText}`;
}

export function formatCameraPosition(azimuth: number, elevation: number, distance: number): string {
  return `Azimuth: ${Math.round(Number(azimuth))} deg, Elevation: ${Math.round(Number(elevation))} deg, Distance: ${Number(distance).toFixed(2)}`;
}
