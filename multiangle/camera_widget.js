window.initCam3DWidget = function initCam3DWidget() {
  const canvas = document.getElementById("cam3d-canvas");
  const label = document.getElementById("cam3d-label");

  if (!canvas || !label) {
    window.setTimeout(() => window.initCam3DWidget?.(), 250);
    return;
  }

  if (canvas.__cam3dReady) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  canvas.__cam3dReady = true;

  const state = {
    azimuth: 0,
    elevation: 0,
    distance: 1.0,
    dragTarget: null,
    snapDistance: 1.0,
    dragStartY: 0,
    subjectImage: null,
    subjectImageSrc: "",
  };

  const config = {
    canvasHeight: 360,
    gridSize: 4,
    gridStep: 0.5,
    ringRadius: 1.75,
    arcRadius: 1.75,
    cameraYaw: -0.78,
    cameraPitch: -0.42,
    cameraDistance: 8.5,
    focalLength: 380,
  };

  const colors = {
    background: "#1a1a1a",
    grid: "rgba(255,255,255,0.055)",
    ring: "#15f5bf",
    arc: "#ff6bc6",
    distance: "#ffb347",
    line: "rgba(255,179,71,0.85)",
    plane: "#3d3b57",
    planeEdge: "rgba(255,255,255,0.10)",
    cameraBody: "#56769a",
    cameraLens: "#26384a",
    cameraGlass: "#8cc8ff",
    labelText: "#0b1116",
    handleStroke: "rgba(255,255,255,0.22)",
  };

  let width = 0;
  let height = config.canvasHeight;
  let centerX = 0;
  let centerY = 0;
  let handlePositions = {};

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function degToRad(value) {
    return (value * Math.PI) / 180;
  }

  function buildPrompt(azimuth, elevation, distance) {
    const az = ((Number(azimuth) % 360) + 360) % 360;
    const el = clamp(Number(elevation), 0, 80);
    const dist = clamp(Number(distance), 0.1, 1.4);

    const azText =
      az < 22.5 || az > 337.5 ? "front view" :
      az < 67.5 ? "front-right view" :
      az < 112.5 ? "right side view" :
      az < 157.5 ? "back-right view" :
      az < 202.5 ? "back view" :
      az < 247.5 ? "back-left view" :
      az < 292.5 ? "left side view" :
      "front-left view";

    const elText =
      el < 10 ? "eye-level shot" :
      el < 30 ? "low angle shot" :
      el < 55 ? "elevated shot" :
      "top-down view";

    const distText =
      dist < 0.5 ? "close-up shot" :
      dist < 0.9 ? "medium-close shot" :
      dist < 1.2 ? "medium shot" :
      "wide shot";

    return `<sks> ${azText} ${elText} ${distText}`;
  }

  function resizeCanvas() {
    const nextWidth = Math.max((canvas.parentElement?.clientWidth || 520) - 2, 320);
    width = nextWidth;
    height = config.canvasHeight;
    centerX = width / 2;
    centerY = height * 0.64;
    canvas.width = width;
    canvas.height = height;
  }

  function projectPoint(point) {
    const cosY = Math.cos(config.cameraYaw);
    const sinY = Math.sin(config.cameraYaw);
    const cosX = Math.cos(config.cameraPitch);
    const sinX = Math.sin(config.cameraPitch);

    const x1 = point.x * cosY - point.z * sinY;
    const z1 = point.x * sinY + point.z * cosY;
    const y2 = point.y * cosX - z1 * sinX;
    const z2 = point.y * sinX + z1 * cosX;
    const scale = config.focalLength / (config.cameraDistance - z2);

    return {
      x: centerX + x1 * scale,
      y: centerY - y2 * scale,
      scale,
      depth: z2,
    };
  }

  function worldCirclePoint(radius, angleDeg) {
    const angle = degToRad(angleDeg);
    return {
      x: -radius * Math.sin(angle),
      y: 0,
      z: radius * Math.cos(angle),
    };
  }

  function worldArcPoint(azimuthDeg, elevationDeg, radius) {
    const az = degToRad(azimuthDeg);
    const el = degToRad(elevationDeg);
    const horizontal = radius * Math.cos(el);

    return {
      x: -horizontal * Math.sin(az),
      y: radius * Math.sin(el),
      z: horizontal * Math.cos(az),
    };
  }

  function worldCameraPoint() {
    const az = degToRad(state.azimuth);
    const el = degToRad(state.elevation);
    const displayDistance = state.distance * 1.28;
    const horizontal = displayDistance * Math.cos(el);

    return {
      x: -horizontal * Math.sin(az),
      y: displayDistance * Math.sin(el),
      z: horizontal * Math.cos(az),
    };
  }

  function drawPolyline(points, strokeStyle, lineWidth) {
    if (!points.length) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index].x, points[index].y);
    }
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }

  function roundRect(x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawGrid() {
    for (let value = -config.gridSize; value <= config.gridSize; value += config.gridStep) {
      const horizontalStart = projectPoint({ x: -config.gridSize, y: 0, z: value });
      const horizontalEnd = projectPoint({ x: config.gridSize, y: 0, z: value });
      const verticalStart = projectPoint({ x: value, y: 0, z: -config.gridSize });
      const verticalEnd = projectPoint({ x: value, y: 0, z: config.gridSize });

      drawPolyline([horizontalStart, horizontalEnd], colors.grid, 1);
      drawPolyline([verticalStart, verticalEnd], colors.grid, 1);
    }
  }

  function drawPlaneImage(corners) {
    if (!state.subjectImage) {
      return false;
    }

    const image = state.subjectImage;
    if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
      return false;
    }

    const topLeft = corners[3];
    const topRight = corners[2];
    const bottomLeft = corners[0];
    const widthVec = {
      x: topRight.x - topLeft.x,
      y: topRight.y - topLeft.y,
    };
    const heightVec = {
      x: bottomLeft.x - topLeft.x,
      y: bottomLeft.y - topLeft.y,
    };

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.clip();

    ctx.transform(
      widthVec.x / image.naturalWidth,
      widthVec.y / image.naturalWidth,
      heightVec.x / image.naturalHeight,
      heightVec.y / image.naturalHeight,
      topLeft.x,
      topLeft.y
    );
    ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);
    ctx.restore();
    return true;
  }

  function drawPlaneFrontFallback(corners) {
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

    const smileStart = projectPoint({ x: -0.11, y: -0.03, z: 0.01 });
    const smileControl = projectPoint({ x: 0, y: -0.11, z: 0.01 });
    const smileEnd = projectPoint({ x: 0.11, y: -0.03, z: 0.01 });
    ctx.beginPath();
    ctx.moveTo(smileStart.x, smileStart.y);
    ctx.quadraticCurveTo(smileControl.x, smileControl.y, smileEnd.x, smileEnd.y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#5e4a3b";
    ctx.stroke();
  }

  function drawPlaneBackFallback(corners) {
    ctx.fillStyle = "#2b3145";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.moveTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  function drawSubjectPlane(showFrontImage) {
    const corners = [
      projectPoint({ x: -0.34, y: -0.42, z: 0 }),
      projectPoint({ x: 0.34, y: -0.42, z: 0 }),
      projectPoint({ x: 0.34, y: 0.42, z: 0 }),
      projectPoint({ x: -0.34, y: 0.42, z: 0 }),
    ];

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach((corner) => ctx.lineTo(corner.x, corner.y));
    ctx.closePath();
    ctx.fillStyle = colors.plane;
    ctx.fill();

    if (showFrontImage) {
      if (!drawPlaneImage(corners)) {
        drawPlaneFrontFallback(corners);
      }
    } else {
      drawPlaneBackFallback(corners);
    }

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach((corner) => ctx.lineTo(corner.x, corner.y));
    ctx.closePath();
    ctx.strokeStyle = colors.planeEdge;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  function drawCameraLine(cameraPoint) {
    const origin = projectPoint({ x: 0, y: 0, z: 0 });
    const cameraScreen = projectPoint(cameraPoint);
    drawPolyline([origin, cameraScreen], colors.line, 2);
  }

  function drawCameraBody(cameraPoint) {
    const screen = projectPoint(cameraPoint);
    const bodyWidth = Math.max(24, screen.scale * 0.12);
    const bodyHeight = Math.max(16, screen.scale * 0.08);

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(-0.18);

    roundRect(-bodyWidth * 0.56, -bodyHeight / 2, bodyWidth, bodyHeight, 5);
    ctx.fillStyle = colors.cameraBody;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-bodyWidth * 0.12, -bodyHeight * 0.62);
    ctx.lineTo(bodyWidth * 0.18, -bodyHeight * 0.62);
    ctx.lineTo(bodyWidth * 0.05, -bodyHeight * 1.05);
    ctx.lineTo(-bodyWidth * 0.22, -bodyHeight * 1.05);
    ctx.closePath();
    ctx.fillStyle = "#6e8fb4";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(bodyWidth * 0.35, 0, Math.max(6, bodyHeight * 0.50), 0, Math.PI * 2);
    ctx.fillStyle = colors.cameraLens;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(bodyWidth * 0.39, -1, Math.max(2.8, bodyHeight * 0.18), 0, Math.PI * 2);
    ctx.fillStyle = colors.cameraGlass;
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CAM", -bodyWidth * 0.10, 3);
    ctx.restore();
  }

  function offsetHandle(basePosition, pushPixels) {
    const dx = basePosition.x - centerX;
    const dy = basePosition.y - centerY;
    const length = Math.max(Math.hypot(dx, dy), 1);
    return {
      x: basePosition.x + (dx / length) * pushPixels,
      y: basePosition.y + (dy / length) * pushPixels,
    };
  }

  function normalizeVector(dx, dy, fallbackX, fallbackY) {
    const length = Math.hypot(dx, dy);
    if (length < 0.001) {
      return { x: fallbackX, y: fallbackY };
    }

    return {
      x: dx / length,
      y: dy / length,
    };
  }

  function positionHandle(kind, basePosition) {
    const radial = normalizeVector(basePosition.x - centerX, basePosition.y - centerY, -1, 0);
    const tangent = {
      x: -radial.y,
      y: radial.x,
    };

    if (kind === "azimuth") {
      return {
        x: basePosition.x + radial.x * 28 + tangent.x * 26,
        y: basePosition.y + radial.y * 28 + tangent.y * 26,
      };
    }

    if (kind === "elevation") {
      return {
        x: basePosition.x + radial.x * 24 - tangent.x * 24,
        y: basePosition.y + radial.y * 24 - tangent.y * 24,
      };
    }

    return {
      x: basePosition.x + radial.x * 18 + tangent.x * 8,
      y: basePosition.y + radial.y * 18 + tangent.y * 8,
    };
  }

  function resolveHandleCollisions(layout) {
    const pairs = [
      ["azimuth", "elevation"],
      ["azimuth", "distance"],
      ["elevation", "distance"],
    ];

    for (let iteration = 0; iteration < 6; iteration += 1) {
      let moved = false;

      for (const [firstName, secondName] of pairs) {
        const first = layout[firstName];
        const second = layout[secondName];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy);
        const minimumGap = first.radius + second.radius + 12;

        if (distance >= minimumGap) {
          continue;
        }

        const direction = normalizeVector(dx, dy, 1, 0);
        const push = (minimumGap - distance) / 2;

        first.x -= direction.x * push;
        first.y -= direction.y * push;
        second.x += direction.x * push;
        second.y += direction.y * push;
        moved = true;
      }

      if (!moved) {
        break;
      }
    }
  }

  function computeHandleLayout(azimuthValue, elevationValue, distanceValue) {
    const cameraPoint = (() => {
      const az = degToRad(azimuthValue);
      const el = degToRad(elevationValue);
      const displayDistance = distanceValue * 1.28;
      const horizontal = displayDistance * Math.cos(el);

      return {
        x: -horizontal * Math.sin(az),
        y: displayDistance * Math.sin(el),
        z: horizontal * Math.cos(az),
      };
    })();

    const azimuthBase = projectPoint(worldCirclePoint(config.ringRadius, azimuthValue));
    const elevationBase = projectPoint(worldArcPoint(azimuthValue, elevationValue, config.arcRadius));
    const distanceBase = projectPoint(cameraPoint);

    const layout = {
      azimuth: {
        ...positionHandle("azimuth", azimuthBase),
        base: azimuthBase,
        radius: 19,
      },
      elevation: {
        ...positionHandle("elevation", elevationBase),
        base: elevationBase,
        radius: 19,
      },
      distance: {
        ...positionHandle("distance", distanceBase),
        base: distanceBase,
        radius: 20,
      },
      cameraPoint,
    };

    resolveHandleCollisions(layout);
    return layout;
  }

  function drawConnector(from, to, color) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  function drawHandle(position, radius, color, text) {
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(position.x, position.y, radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = colors.handleStroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = colors.labelText;
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, position.x, position.y + 0.5);
  }

  function render() {
    resizeCanvas();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    drawGrid();

    const ringPoints = [];
    for (let degrees = 0; degrees <= 360; degrees += 3) {
      ringPoints.push(projectPoint(worldCirclePoint(config.ringRadius, degrees)));
    }
    drawPolyline(ringPoints, colors.ring, 6);

    const arcPoints = [];
    for (let degrees = 0; degrees <= 80; degrees += 2) {
      arcPoints.push(projectPoint(worldArcPoint(state.azimuth, degrees, config.arcRadius)));
    }
    drawPolyline(arcPoints, colors.arc, 6);

    const layout = computeHandleLayout(state.azimuth, state.elevation, state.distance);
    const planeDepth = projectPoint({ x: 0, y: 0, z: 0 }).depth;
    const showFrontImage = layout.cameraPoint.z >= 0;
    handlePositions = {
      azimuth: { x: layout.azimuth.x, y: layout.azimuth.y },
      elevation: { x: layout.elevation.x, y: layout.elevation.y },
      distance: { x: layout.distance.x, y: layout.distance.y },
    };

    const handleDraws = [
      { name: "azimuth", stroke: "rgba(21,245,191,0.85)", fill: "#15f5bf", text: "A" },
      { name: "elevation", stroke: "rgba(255,107,198,0.85)", fill: "#ff6bc6", text: "E" },
      { name: "distance", stroke: "rgba(255,179,71,0.85)", fill: "#ffb347", text: "D" },
    ];

    function drawHandleSet(item) {
      const target = layout[item.name];
      drawConnector(target.base, handlePositions[item.name], item.stroke);
      drawHandle(handlePositions[item.name], target.radius, item.fill, item.text);
    }

    if (layout.distance.base.depth < planeDepth) {
      drawCameraLine(layout.cameraPoint);
      drawCameraBody(layout.cameraPoint);
    }

    handleDraws
      .filter((item) => layout[item.name].base.depth < planeDepth)
      .forEach(drawHandleSet);

    drawSubjectPlane(showFrontImage);

    if (layout.distance.base.depth >= planeDepth) {
      drawCameraLine(layout.cameraPoint);
      drawCameraBody(layout.cameraPoint);
    }

    handleDraws
      .filter((item) => layout[item.name].base.depth >= planeDepth)
      .forEach(drawHandleSet);

    label.textContent = buildPrompt(state.azimuth, state.elevation, state.distance);
  }

  function getPointerPosition(event) {
    const source = event.touches && event.touches.length ? event.touches[0] : event;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: source.clientX - bounds.left,
      y: source.clientY - bounds.top,
    };
  }

  function findNearestHandle(pointer) {
    const targets = [
      ["azimuth", handlePositions.azimuth],
      ["elevation", handlePositions.elevation],
      ["distance", handlePositions.distance],
    ];

    for (const [name, position] of targets) {
      if (!position) {
        continue;
      }

      const dx = pointer.x - position.x;
      const dy = pointer.y - position.y;
      if ((dx * dx) + (dy * dy) <= 30 * 30) {
        return name;
      }
    }

    return null;
  }

  function findNearestAzimuth(pointer) {
    let bestAngle = state.azimuth;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let degrees = 0; degrees < 360; degrees += 1) {
      const point = computeHandleLayout(degrees, state.elevation, state.distance).azimuth;
      const dx = pointer.x - point.x;
      const dy = pointer.y - point.y;
      const distance = (dx * dx) + (dy * dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestAngle = degrees;
      }
    }

    return bestAngle;
  }

  function findNearestElevation(pointer) {
    let bestElevation = state.elevation;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let degrees = 0; degrees <= 80; degrees += 1) {
      const point = computeHandleLayout(state.azimuth, degrees, state.distance).elevation;
      const dx = pointer.x - point.x;
      const dy = pointer.y - point.y;
      const distance = (dx * dx) + (dy * dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestElevation = degrees;
      }
    }

    return bestElevation;
  }

  function setSlider(elemId, value) {
    const container = document.getElementById(elemId);
    const input = container?.querySelector('input[type="range"]');
    if (!input) {
      return;
    }

    const nextValue = String(value);
    if (input.value === nextValue) {
      return;
    }

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function pushToGradio() {
    setSlider("azimuth-slider", Math.round(state.azimuth));
    setSlider("elevation-slider", Math.round(state.elevation));
    setSlider("distance-slider", state.distance.toFixed(2));
  }

  function bindSlider(containerId, callback) {
    const container = document.getElementById(containerId);
    const input = container?.querySelector('input[type="range"]');
    if (!input || input.__cam3dBound) {
      return Boolean(input);
    }

    const listener = () => {
      if (state.dragTarget) {
        return;
      }
      callback(parseFloat(input.value));
      render();
    };

    input.addEventListener("input", listener);
    input.addEventListener("change", listener);
    input.__cam3dBound = true;
    return true;
  }

  function attachSliderListeners() {
    const azimuthReady = bindSlider("azimuth-slider", (value) => {
      state.azimuth = ((value % 360) + 360) % 360;
    });
    const elevationReady = bindSlider("elevation-slider", (value) => {
      state.elevation = clamp(value, 0, 80);
    });
    const distanceReady = bindSlider("distance-slider", (value) => {
      state.distance = clamp(value, 0.1, 1.4);
    });

    return azimuthReady && elevationReady && distanceReady;
  }

  function getCurrentSubjectSrc() {
    const selectors = [
      "#input-image img",
      "#input-image canvas",
      "#image-preview img",
      "#image-preview canvas",
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (!node) {
        continue;
      }

      if (node.tagName === "IMG" && node.src) {
        return node.src;
      }

      if (node.tagName === "CANVAS") {
        try {
          return node.toDataURL("image/png");
        } catch (error) {
          return "";
        }
      }
    }

    return "";
  }

  function updateSubjectImage() {
    const nextSrc = getCurrentSubjectSrc();
    if (!nextSrc || nextSrc === state.subjectImageSrc) {
      return false;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      state.subjectImage = image;
      state.subjectImageSrc = nextSrc;
      render();
    };
    image.src = nextSrc;
    return true;
  }

  function onPointerDown(event) {
    const pointer = getPointerPosition(event);
    const nextTarget = findNearestHandle(pointer);
    if (!nextTarget) {
      return;
    }

    state.dragTarget = nextTarget;
    state.snapDistance = state.distance;
    state.dragStartY = pointer.y;
    canvas.style.cursor = "grabbing";
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!state.dragTarget) {
      return;
    }

    const pointer = getPointerPosition(event);

    if (state.dragTarget === "azimuth") {
      state.azimuth = findNearestAzimuth(pointer);
    } else if (state.dragTarget === "elevation") {
      state.elevation = findNearestElevation(pointer);
    } else if (state.dragTarget === "distance") {
      const deltaY = pointer.y - state.dragStartY;
      state.distance = clamp(state.snapDistance - (deltaY * 0.004), 0.1, 1.4);
    }

    render();
    pushToGradio();
    event.preventDefault();
  }

  function onPointerUp() {
    state.dragTarget = null;
    canvas.style.cursor = "grab";
  }

  function syncLabelFromPrompt() {
    const promptContainer = document.getElementById("prompt-display");
    const promptInput = promptContainer?.querySelector("textarea");
    if (!promptInput) {
      return false;
    }

    if (!state.dragTarget && promptInput.value?.trim()) {
      label.textContent = promptInput.value.trim();
    }

    return true;
  }

  canvas.addEventListener("mousedown", onPointerDown);
  canvas.addEventListener("touchstart", onPointerDown, { passive: false });
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("touchmove", onPointerMove, { passive: false });
  window.addEventListener("mouseup", onPointerUp);
  window.addEventListener("touchend", onPointerUp);

  const resizeObserver = new ResizeObserver(() => render());
  resizeObserver.observe(canvas.parentElement || canvas);

  const sliderReadyInterval = window.setInterval(() => {
    if (attachSliderListeners()) {
      window.clearInterval(sliderReadyInterval);
    }
  }, 400);

  const promptReadyInterval = window.setInterval(() => {
    if (syncLabelFromPrompt()) {
      window.clearInterval(promptReadyInterval);
      window.setInterval(() => {
        syncLabelFromPrompt();
      }, 1200);
    }
  }, 500);

  window.setInterval(() => {
    updateSubjectImage();
  }, 600);

  window.addEventListener("resize", render);
  window.cam3dSetState = function cam3dSetState(azimuth, elevation, distance) {
    state.azimuth = ((Number(azimuth) % 360) + 360) % 360;
    state.elevation = clamp(Number(elevation), 0, 80);
    state.distance = clamp(Number(distance), 0.1, 1.4);
    render();
  };

  updateSubjectImage();
  render();
};
