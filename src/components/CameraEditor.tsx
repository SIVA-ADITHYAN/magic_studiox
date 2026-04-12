import { useEffect, useRef } from "react";
import { clamp, CameraState } from "../lib/cameraUtils";

interface CameraEditorProps {
  camera: CameraState;
  imageSrc: string;
  onChange: (camera: CameraState) => void;
}

const CONFIG = {
  canvasHeight: 360,
  gridSize: 4,
  gridStep: 0.5,
  ringRadius: 1.75,
  arcRadius: 1.75,
  cameraYaw: -0.78,
  cameraPitch: -0.42,
  cameraDistance: 10,
  focalLength: 420,
};

const COLORS = {
  background: "#ffffff",
  stage: "#fff8e8",
  grid: "rgba(30, 41, 59, 0.08)",
  ring: "#34D399",
  arc: "#F472B6",
  distance: "#FBBF24",
  line: "rgba(30, 41, 59, 0.4)",
  plane: "#ffffff",
  planeEdge: "#1E293B",
  cameraBody: "#8B5CF6",
  cameraLens: "#1E293B",
  cameraGlass: "#ffffff",
  handleStroke: "#1E293B",
  caption: "#1E293B",
  backPlane: "#e7defb",
  backPlaneMarks: "#8B5CF6",
};

interface Vec2 { x: number; y: number }
interface Vec3 { x: number; y: number; z: number }
interface Projected extends Vec2 { scale: number; depth: number }
interface HandleEntry extends Vec2 { base: Projected; radius: number }
interface Layout {
  azimuth: HandleEntry;
  elevation: HandleEntry;
  distance: HandleEntry;
  cameraPoint?: Vec3;
}

function normalizeVector(dx: number, dy: number, fallbackX: number, fallbackY: number): Vec2 {
  const length = Math.hypot(dx, dy);
  if (length < 0.001) return { x: fallbackX, y: fallbackY };
  return { x: dx / length, y: dy / length };
}

function resolveHandleCollisions(layout: Layout) {
  const pairs: [keyof Layout, keyof Layout][] = [
    ["azimuth", "elevation"],
    ["azimuth", "distance"],
    ["elevation", "distance"],
  ];

  for (let iteration = 0; iteration < 6; iteration++) {
    let moved = false;
    for (const [firstName, secondName] of pairs) {
      const first = layout[firstName] as HandleEntry;
      const second = layout[secondName] as HandleEntry;
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const distance = Math.hypot(dx, dy);
      const minimumGap = first.radius + second.radius + 12;
      if (distance >= minimumGap) continue;
      const direction = normalizeVector(dx, dy, 1, 0);
      const push = (minimumGap - distance) / 2;
      first.x -= direction.x * push;
      first.y -= direction.y * push;
      second.x += direction.x * push;
      second.y += direction.y * push;
      moved = true;
    }
    if (!moved) break;
  }
}

export default function CameraEditor({ camera, imageSrc, onChange }: CameraEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const subjectImageRef = useRef<HTMLImageElement | null>(null);
  const cameraRef = useRef<CameraState>(camera);
  const frameRef = useRef<number>(0);
  // Keep onChange ref current without causing effect re-runs
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    cameraRef.current = camera;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      drawScene(ctx, canvas, cameraRef.current, subjectImageRef.current);
      frameRef.current = 0;
    });
  }, [camera]);

  useEffect(() => {
    if (!imageSrc) {
      subjectImageRef.current = null;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) drawScene(ctx, canvas, cameraRef.current, null);
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      subjectImageRef.current = image;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) drawScene(ctx, canvas, cameraRef.current, image);
      }
    };
    image.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drag = { target: null as string | null, startY: 0, snapDistance: cameraRef.current.distance };

    const getCanvasMetrics = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(bounds.width || 320, 320);
      const height = CONFIG.canvasHeight;
      canvas.width = width;
      canvas.height = height;
      return { width, height, centerX: width / 2, centerY: height * 0.64 };
    };

    const projectPoint = (point: Vec3, metrics: { centerX: number; centerY: number }): Projected => {
      const cosY = Math.cos(CONFIG.cameraYaw);
      const sinY = Math.sin(CONFIG.cameraYaw);
      const cosX = Math.cos(CONFIG.cameraPitch);
      const sinX = Math.sin(CONFIG.cameraPitch);
      const x1 = point.x * cosY - point.z * sinY;
      const z1 = point.x * sinY + point.z * cosY;
      const y2 = point.y * cosX - z1 * sinX;
      const z2 = point.y * sinX + z1 * cosX;
      const scale = CONFIG.focalLength / (CONFIG.cameraDistance - z2);
      return { x: metrics.centerX + x1 * scale, y: metrics.centerY - y2 * scale, scale, depth: z2 };
    };

    const worldCirclePoint = (radius: number, angleDeg: number): Vec3 => {
      const angle = (angleDeg * Math.PI) / 180;
      return { x: -radius * Math.sin(angle), y: 0, z: radius * Math.cos(angle) };
    };

    const worldArcPoint = (azimuthDeg: number, elevationDeg: number, radius: number): Vec3 => {
      const azimuthRad = (azimuthDeg * Math.PI) / 180;
      const elevationRad = (elevationDeg * Math.PI) / 180;
      const horizontal = radius * Math.cos(elevationRad);
      return { x: -horizontal * Math.sin(azimuthRad), y: radius * Math.sin(elevationRad), z: horizontal * Math.cos(azimuthRad) };
    };

    const worldCameraPoint = (cam: CameraState): Vec3 => {
      const azimuthRad = (cam.azimuth * Math.PI) / 180;
      const elevationRad = (cam.elevation * Math.PI) / 180;
      const displayDistance = cam.distance * 1.28;
      const horizontal = displayDistance * Math.cos(elevationRad);
      return { x: -horizontal * Math.sin(azimuthRad), y: displayDistance * Math.sin(elevationRad), z: horizontal * Math.cos(azimuthRad) };
    };

    const positionHandle = (kind: string, base: Projected, metrics: { centerX: number; centerY: number }): Vec2 => {
      const radial = normalizeVector(base.x - metrics.centerX, base.y - metrics.centerY, -1, 0);
      const tangent = { x: -radial.y, y: radial.x };
      if (kind === "azimuth") return { x: base.x + radial.x * 28 + tangent.x * 26, y: base.y + radial.y * 28 + tangent.y * 26 };
      if (kind === "elevation") return { x: base.x + radial.x * 24 - tangent.x * 24, y: base.y + radial.y * 24 - tangent.y * 24 };
      return { x: base.x + radial.x * 18 + tangent.x * 8, y: base.y + radial.y * 18 + tangent.y * 8 };
    };

    const computeLayout = (cam: CameraState, metrics: ReturnType<typeof getCanvasMetrics>): Layout => {
      const cameraPoint = worldCameraPoint(cam);
      const azimuthBase = projectPoint(worldCirclePoint(CONFIG.ringRadius, cam.azimuth), metrics);
      const elevationBase = projectPoint(worldArcPoint(cam.azimuth, cam.elevation, CONFIG.arcRadius), metrics);
      const distanceBase = projectPoint(cameraPoint, metrics);
      const layout: Layout = {
        azimuth: { ...positionHandle("azimuth", azimuthBase, metrics), base: azimuthBase, radius: 19 },
        elevation: { ...positionHandle("elevation", elevationBase, metrics), base: elevationBase, radius: 19 },
        distance: { ...positionHandle("distance", distanceBase, metrics), base: distanceBase, radius: 20 },
        cameraPoint,
      };
      resolveHandleCollisions(layout);
      return layout;
    };

    const getPointer = (event: MouseEvent | TouchEvent): Vec2 => {
      const bounds = canvas.getBoundingClientRect();
      const source = "touches" in event && event.touches.length ? event.touches[0] : event as MouseEvent;
      return { x: source.clientX - bounds.left, y: source.clientY - bounds.top };
    };

    const findNearestHandle = (pointer: Vec2, layout: Layout): string | null => {
      for (const key of ["azimuth", "elevation", "distance"] as const) {
        const point = layout[key] as HandleEntry;
        const dx = pointer.x - point.x;
        const dy = pointer.y - point.y;
        if (dx * dx + dy * dy <= 30 * 30) return key;
      }
      return null;
    };

    const findNearestAzimuth = (pointer: Vec2, cam: CameraState, metrics: ReturnType<typeof getCanvasMetrics>): number => {
      let best = cam.azimuth;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let degrees = 0; degrees < 360; degrees++) {
        const point = computeLayout({ ...cam, azimuth: degrees }, metrics).azimuth;
        const dx = pointer.x - point.x;
        const dy = pointer.y - point.y;
        const d = dx * dx + dy * dy;
        if (d < bestDistance) { bestDistance = d; best = degrees; }
      }
      return best;
    };

    const findNearestElevation = (pointer: Vec2, cam: CameraState, metrics: ReturnType<typeof getCanvasMetrics>): number => {
      let best = cam.elevation;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let degrees = 0; degrees <= 80; degrees++) {
        const point = computeLayout({ ...cam, elevation: degrees }, metrics).elevation;
        const dx = pointer.x - point.x;
        const dy = pointer.y - point.y;
        const d = dx * dx + dy * dy;
        if (d < bestDistance) { bestDistance = d; best = degrees; }
      }
      return best;
    };

    const renderCurrent = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        drawScene(ctx, canvas, cameraRef.current, subjectImageRef.current);
        frameRef.current = 0;
      });
    };

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const metrics = getCanvasMetrics();
      const layout = computeLayout(cameraRef.current, metrics);
      const pointer = getPointer(event);
      const target = findNearestHandle(pointer, layout);
      if (!target) return;
      drag.target = target;
      drag.startY = pointer.y;
      drag.snapDistance = cameraRef.current.distance;
      canvas.style.cursor = "grabbing";
      event.preventDefault();
    };

    const onPointerMove = (event: MouseEvent | TouchEvent) => {
      if (!drag.target) return;
      const metrics = getCanvasMetrics();
      const pointer = getPointer(event);
      const nextCamera = { ...cameraRef.current };
      if (drag.target === "azimuth") {
        nextCamera.azimuth = findNearestAzimuth(pointer, nextCamera, metrics);
      } else if (drag.target === "elevation") {
        nextCamera.elevation = findNearestElevation(pointer, nextCamera, metrics);
      } else {
        const deltaY = pointer.y - drag.startY;
        nextCamera.distance = clamp(drag.snapDistance - deltaY * 0.003, 0.25, 1.4);
      }
      cameraRef.current = nextCamera;
      renderCurrent();
      onChangeRef.current({
        azimuth: Math.round(nextCamera.azimuth),
        elevation: Math.round(nextCamera.elevation),
        distance: Number(nextCamera.distance.toFixed(2)),
      });
      event.preventDefault();
    };

    const onPointerUp = () => {
      drag.target = null;
      canvas.style.cursor = "grab";
    };

    renderCurrent();

    const resizeObserver = new ResizeObserver(() => renderCurrent());
    resizeObserver.observe(canvas);
    canvas.addEventListener("mousedown", onPointerDown);
    canvas.addEventListener("touchstart", onPointerDown, { passive: false });
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchend", onPointerUp);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      canvas.removeEventListener("mousedown", onPointerDown);
      canvas.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      window.removeEventListener("touchend", onPointerUp);
    };
  }, []);

  return (
    <div className="ma-editor-shell">
      <div className="ma-editor-header">
        <span className="ma-editor-copy">Drag the colored handles:</span>
        <span className="ma-editor-legend ma-editor-legend-azimuth">Azimuth</span>
        <span className="ma-editor-legend ma-editor-legend-elevation">Elevation</span>
        <span className="ma-editor-legend ma-editor-legend-distance">Distance</span>
      </div>
      <canvas ref={canvasRef} className="ma-editor-canvas" aria-label="3D camera editor" />
    </div>
  );
}

// ─── Canvas drawing (outside component, pure function) ──────────────────────

function drawScene(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  camera: CameraState,
  subjectImage: HTMLImageElement | null,
) {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(bounds.width || 320, 320);
  const height = CONFIG.canvasHeight;
  const centerX = width / 2;
  const centerY = height * 0.64;
  canvas.width = width;
  canvas.height = height;

  const projectPoint = (point: { x: number; y: number; z: number }) => {
    const cosY = Math.cos(CONFIG.cameraYaw);
    const sinY = Math.sin(CONFIG.cameraYaw);
    const cosX = Math.cos(CONFIG.cameraPitch);
    const sinX = Math.sin(CONFIG.cameraPitch);
    const x1 = point.x * cosY - point.z * sinY;
    const z1 = point.x * sinY + point.z * cosY;
    const y2 = point.y * cosX - z1 * sinX;
    const z2 = point.y * sinX + z1 * cosX;
    const scale = CONFIG.focalLength / (CONFIG.cameraDistance - z2);
    return { x: centerX + x1 * scale, y: centerY - y2 * scale, scale, depth: z2 };
  };

  const worldCirclePoint = (radius: number, angleDeg: number) => {
    const angle = (angleDeg * Math.PI) / 180;
    return { x: -radius * Math.sin(angle), y: 0, z: radius * Math.cos(angle) };
  };

  const worldArcPoint = (azimuthDeg: number, elevationDeg: number, radius: number) => {
    const azimuthRad = (azimuthDeg * Math.PI) / 180;
    const elevationRad = (elevationDeg * Math.PI) / 180;
    const horizontal = radius * Math.cos(elevationRad);
    return { x: -horizontal * Math.sin(azimuthRad), y: radius * Math.sin(elevationRad), z: horizontal * Math.cos(azimuthRad) };
  };

  const worldCameraPoint = () => {
    const azimuthRad = (camera.azimuth * Math.PI) / 180;
    const elevationRad = (camera.elevation * Math.PI) / 180;
    const displayDistance = camera.distance * 1.28;
    const horizontal = displayDistance * Math.cos(elevationRad);
    return { x: -horizontal * Math.sin(azimuthRad), y: displayDistance * Math.sin(elevationRad), z: horizontal * Math.cos(azimuthRad) };
  };

  const drawPolyline = (points: { x: number; y: number }[], strokeStyle: string, lineWidth: number) => {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  };

  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const drawPlaneImage = (corners: { x: number; y: number }[]): boolean => {
    if (!subjectImage || !subjectImage.complete || !subjectImage.naturalWidth || !subjectImage.naturalHeight) return false;
    const topLeft = corners[3];
    const topRight = corners[2];
    const bottomLeft = corners[0];
    const widthVec = { x: topRight.x - topLeft.x, y: topRight.y - topLeft.y };
    const heightVec = { x: bottomLeft.x - topLeft.x, y: bottomLeft.y - topLeft.y };
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach((c) => ctx.lineTo(c.x, c.y));
    ctx.closePath();
    ctx.clip();
    ctx.transform(
      widthVec.x / subjectImage.naturalWidth, widthVec.y / subjectImage.naturalWidth,
      heightVec.x / subjectImage.naturalHeight, heightVec.y / subjectImage.naturalHeight,
      topLeft.x, topLeft.y,
    );
    ctx.drawImage(subjectImage, 0, 0, subjectImage.naturalWidth, subjectImage.naturalHeight);
    ctx.restore();
    return true;
  };

  const drawPlaneFallback = (corners: { x: number; y: number }[], showFrontImage: boolean) => {
    if (showFrontImage) {
      const faceCenter = projectPoint({ x: 0, y: 0.02, z: 0.005 });
      const faceRadius = Math.max(18, faceCenter.scale * 0.15);
      ctx.beginPath();
      ctx.arc(faceCenter.x, faceCenter.y, faceRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd39b";
      ctx.fill();
      const leftEye = projectPoint({ x: -0.07, y: 0.1, z: 0.01 });
      const rightEye = projectPoint({ x: 0.07, y: 0.1, z: 0.01 });
      ctx.fillStyle = "#5e4a3b";
      ctx.beginPath();
      ctx.arc(leftEye.x, leftEye.y, 3, 0, Math.PI * 2);
      ctx.arc(rightEye.x, rightEye.y, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.fillStyle = COLORS.backPlane;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.moveTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.strokeStyle = COLORS.backPlaneMarks;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  };

  const drawSubjectPlane = (showFrontImage: boolean) => {
    const corners = [
      projectPoint({ x: -0.34, y: -0.42, z: 0 }),
      projectPoint({ x: 0.34, y: -0.42, z: 0 }),
      projectPoint({ x: 0.34, y: 0.42, z: 0 }),
      projectPoint({ x: -0.34, y: 0.42, z: 0 }),
    ];
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach((c) => ctx.lineTo(c.x, c.y));
    ctx.closePath();
    ctx.fillStyle = COLORS.plane;
    ctx.fill();
    if (showFrontImage) {
      if (!drawPlaneImage(corners)) drawPlaneFallback(corners, true);
    } else {
      drawPlaneFallback(corners, false);
    }
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach((c) => ctx.lineTo(c.x, c.y));
    ctx.closePath();
    ctx.strokeStyle = COLORS.planeEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawCamera = (cameraPoint: { x: number; y: number; z: number }) => {
    const origin = projectPoint({ x: 0, y: 0, z: 0 });
    const cameraScreen = projectPoint(cameraPoint);
    drawPolyline([origin, cameraScreen], COLORS.line, 2);
    const bodyWidth = Math.max(24, cameraScreen.scale * 0.12);
    const bodyHeight = Math.max(16, cameraScreen.scale * 0.08);
    ctx.save();
    ctx.translate(cameraScreen.x, cameraScreen.y);
    ctx.rotate(-0.18);
    roundRect(-bodyWidth * 0.56, -bodyHeight / 2, bodyWidth, bodyHeight, 5);
    ctx.fillStyle = COLORS.cameraBody;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bodyWidth * 0.35, 0, Math.max(6, bodyHeight * 0.5), 0, Math.PI * 2);
    ctx.fillStyle = COLORS.cameraLens;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bodyWidth * 0.39, -1, Math.max(2.8, bodyHeight * 0.18), 0, Math.PI * 2);
    ctx.fillStyle = COLORS.cameraGlass;
    ctx.fill();
    ctx.restore();
  };

  const positionHandle = (kind: string, base: { x: number; y: number }): Vec2 => {
    const radial = normalizeVector(base.x - centerX, base.y - centerY, -1, 0);
    const tangent = { x: -radial.y, y: radial.x };
    if (kind === "azimuth") return { x: base.x + radial.x * 28 + tangent.x * 26, y: base.y + radial.y * 28 + tangent.y * 26 };
    if (kind === "elevation") return { x: base.x + radial.x * 24 - tangent.x * 24, y: base.y + radial.y * 24 - tangent.y * 24 };
    return { x: base.x + radial.x * 18 + tangent.x * 8, y: base.y + radial.y * 18 + tangent.y * 8 };
  };

  const cameraPoint = worldCameraPoint();
  const azimuthBase = projectPoint(worldCirclePoint(CONFIG.ringRadius, camera.azimuth));
  const elevationBase = projectPoint(worldArcPoint(camera.azimuth, camera.elevation, CONFIG.arcRadius));
  const distanceBase = projectPoint(cameraPoint);
  const showFrontImage = cameraPoint.z >= 0;
  const planeDepth = projectPoint({ x: 0, y: 0, z: 0 }).depth;

  const layout: Record<string, HandleEntry> = {
    azimuth: { ...positionHandle("azimuth", azimuthBase), base: azimuthBase as Projected, radius: 19 },
    elevation: { ...positionHandle("elevation", elevationBase), base: elevationBase as Projected, radius: 19 },
    distance: { ...positionHandle("distance", distanceBase), base: distanceBase as Projected, radius: 20 },
  };

  resolveHandleCollisions(layout as unknown as Layout);

  const handleDraws = [
    { name: "azimuth", color: COLORS.ring, label: "A" },
    { name: "elevation", color: COLORS.arc, label: "E" },
    { name: "distance", color: COLORS.distance, label: "D" },
  ];

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLORS.stage;
  ctx.fillRect(0, 0, width, height);

  for (let value = -CONFIG.gridSize; value <= CONFIG.gridSize; value += CONFIG.gridStep) {
    const hStart = projectPoint({ x: -CONFIG.gridSize, y: 0, z: value });
    const hEnd = projectPoint({ x: CONFIG.gridSize, y: 0, z: value });
    const vStart = projectPoint({ x: value, y: 0, z: -CONFIG.gridSize });
    const vEnd = projectPoint({ x: value, y: 0, z: CONFIG.gridSize });
    drawPolyline([hStart, hEnd], COLORS.grid, 1);
    drawPolyline([vStart, vEnd], COLORS.grid, 1);
  }

  const ringPoints = [];
  for (let deg = 0; deg <= 360; deg += 3) ringPoints.push(projectPoint(worldCirclePoint(CONFIG.ringRadius, deg)));
  drawPolyline(ringPoints, COLORS.ring, 6);

  const arcPoints = [];
  for (let deg = 0; deg <= 80; deg += 2) arcPoints.push(projectPoint(worldArcPoint(camera.azimuth, deg, CONFIG.arcRadius)));
  drawPolyline(arcPoints, COLORS.arc, 6);

  const drawHandleSet = (item: { name: string; color: string; label: string }) => {
    const target = layout[item.name];
    ctx.beginPath();
    ctx.moveTo(target.base.x, target.base.y);
    ctx.lineTo(target.x, target.y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = item.color;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius + 2, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.handleStroke;
    ctx.stroke();
    ctx.fillStyle = COLORS.caption;
    ctx.font = '700 11px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.label, target.x, target.y);
  };

  if (distanceBase.depth < planeDepth) drawCamera(cameraPoint);
  handleDraws.filter((item) => layout[item.name].base.depth < planeDepth).forEach(drawHandleSet);
  drawSubjectPlane(showFrontImage);
  if (distanceBase.depth >= planeDepth) drawCamera(cameraPoint);
  handleDraws.filter((item) => layout[item.name].base.depth >= planeDepth).forEach(drawHandleSet);
}
