const palettes = {
  '01': ['#f4f1de', '#e07a5f', '#3d405b', '#81b29a', '#f2cc8f'],
};

let palette;
let timeOffset;
let washSeed;
let rotSeed;
let activePalette;
const cursorClock = {
  initialized: false,
  secondAngle: 0,
  minuteAngle: 0,
  hourAngle: 0,
  minuteOffset: 0,
  hourOffset: 0,
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  palette = palettes['01'];
  timeOffset = random(10_000);
  washSeed = random(10_000);
  rotSeed = random(10_000);
  noiseDetail(3, 0.45);
  noCursor();
  activePalette = palette.map((hex) => color(hex));
}

function draw() {
  const t = millis() / 1000;
  const { x: cursorX, y: cursorY } = getMousePosition();
  const mx = cursorX / width;
  const my = cursorY / height;
  const angle = atan2(cursorY - height * 0.5, cursorX - width * 0.5);
  const normalizedAngle = ((angle % TAU) + TAU) % TAU;
  updateCursorClock(angle);
  const hueShift = normalizedAngle * (360 / TAU);
  const minuteProgress = cursorClock.initialized ? cursorClock.minuteAngle / TAU : 0;
  const brightnessWave = sin(TAU * minuteProgress * 2);
  const lightShift = 30 * brightnessWave;
  activePalette = palette.map((hex) => shiftHue(hex, hueShift, lightShift - 20));
  const hourProgress = cursorClock.initialized ? cursorClock.hourAngle / TAU : 0;
  const secondProgress = cursorClock.initialized ? cursorClock.secondAngle / TAU : 0;
  const pseudoHour = hourProgress * 12;
  const pseudoMinute = minuteProgress * 60;
  const pseudoSecond = secondProgress * 60;
  drawGradientBase(t, mx, my);
  drawNoiseWash(t, my);
  drawTemporalVeil(t, mx, my);
  drawRotatingGlyph(t, mx, my);
  drawTimeRings(t, mx, my, pseudoHour, pseudoMinute, pseudoSecond);
  drawTickMarks(t, mx, my);
  drawCursorClock(cursorX, cursorY);
  drawCustomCursor(t, mx, my, cursorX, cursorY);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cursorClock.initialized = false;
}

function getMousePosition() {
  const hasPointer = isFinite(mouseX) && isFinite(mouseY);
  const x = hasPointer ? constrain(mouseX, 0, width) : width * 0.5;
  const y = hasPointer ? constrain(mouseY, 0, height) : height * 0.5;
  return { x, y };
}

function drawGradientBase(t, mx, my) {
  noStroke();
  const drift = mx - 0.5;
  const lightShift = my - 0.5;
  const topMix = constrain(0.35 + 0.1 * sin(t * 0.15) + 0.12 * drift, 0, 1);
  const bottomMix = constrain(0.45 + 0.15 * cos(t * 0.12) - 0.18 * lightShift, 0, 1);
  const topColor = lerpColor(
    color(activePalette[0]),
    color(activePalette[3]),
    topMix
  );
  const bottomColor = lerpColor(
    color(activePalette[4]),
    color(activePalette[1]),
    bottomMix
  );
  for (let y = 0; y <= height; y += 2) {
    const f = y / height;
    const c = lerpColor(topColor, bottomColor, f);
    fill(red(c), green(c), blue(c), 220);
    rect(0, y, width, 3);
  }
}

function drawNoiseWash(t, my) {
  push();
  noFill();
  const rows = 90;
  const xStep = width / 160;
  for (let i = 0; i < rows; i++) {
    const yBase = map(i, 0, rows - 1, height * 0.15, height * 0.85);
    const mouseAmp = map(my, 0, 1, 0.012, 0.05);
    const amp = height * (mouseAmp + 0.015 * sin(t * 0.5 + i * 0.3));
    const hueBlend = 0.25 + 0.3 * noise(washSeed, i * 0.08, t * 0.2);
    const c = lerpColor(color(activePalette[0]), color(activePalette[3]), hueBlend);
    c.setAlpha(42);
    stroke(c);
    strokeWeight(2.4 + 1.5 * noise(i * 0.1, t * 0.3));
    beginShape();
    for (let x = -xStep; x <= width + xStep; x += xStep) {
      const nx = x / width;
      const nVal = noise(nx * 1.9, i * 0.07, t * 0.18 + timeOffset);
      const y = yBase + map(nVal, 0, 1, -amp, amp);
      vertex(x, y);
    }
    endShape();
  }
  pop();
}

function drawTemporalVeil(t, mx, my) {
  push();
  translate(width * 0.5, height * 0.5);
  noFill();
  const layers = 6;
  for (let i = 0; i < layers; i++) {
    push();
    const spinInfluence = map(mx, 0, 1, -0.6, 0.6);
    rotate(0.12 * sin(t * 0.08 + i) + 0.03 * i + spinInfluence * 0.35);
    const phase = t * 0.1 + i * 0.6;
    const radius = min(width, height) * (0.25 + i * 0.05);
    const c = color(activePalette[(i + 2) % activePalette.length]);
    c.setAlpha(40);
    stroke(c);
    const veilBase = map(my, 0, 1, 2.1, 4.6);
    const veilWeight = max(1.6, veilBase - i * 0.18);
    strokeWeight(veilWeight);
    const pts = [];
    for (let a = -PI; a <= PI; a += PI / 90) {
      const squash = map(my, 0, 1, 0.7, 1.1);
      const r = radius * (0.92 + 0.08 * noise(cos(a) * 0.8 + timeOffset, sin(a) * 0.8 + washSeed, phase));
      const x = cos(a) * r;
      const y = sin(a) * r * (0.75 + 0.1 * sin(t * 0.3 + i) + 0.2 * squash);
      pts.push({ x, y });
    }
    beginShape();
    const first = pts[0];
    const last = pts[pts.length - 1];
    curveVertex(first.x, first.y);
    for (let j = 0; j < pts.length; j++) {
      curveVertex(pts[j].x, pts[j].y);
    }
    curveVertex(last.x, last.y);
    endShape();
    pop();
  }
  pop();
}

function drawRotatingGlyph(t, mx, my) {
  push();
  translate(width * 0.5, height * 0.5);
  const baseRadius = min(width, height) * 0.19;
  const layerCount = 4;
  const baseWeight = map(my, 0, 1, 1.6, 4.8);
  for (let layer = 0; layer < layerCount; layer++) {
    push();
    const dir = layer % 2 === 0 ? 1 : -1;
    const speed = 0.12 + 0.18 * mx;
    rotate(t * speed * dir + layer * 0.4 + (mx - 0.5) * 0.8);
    const strokeHue = color(activePalette[(layer + 4) % activePalette.length]);
    strokeHue.setAlpha(70 - layer * 12);
    stroke(strokeHue);
    const sw = max(0.4, baseWeight - layer * 0.45);
    strokeWeight(sw);
    noFill();
    const spokes = 34 + layer * 6;
    const pts = [];
    for (let i = 0; i <= spokes; i++) {
      const angle = map(i, 0, spokes, -PI, PI);
      const brush = 0.18 + 0.12 * my;
      const noiseRadius = baseRadius * (0.6 + layer * 0.1 + brush * noise(rotSeed + layer * 30 + cos(angle), sin(angle), t * 0.22 + layer));
      const x = cos(angle) * noiseRadius;
      const y = sin(angle) * noiseRadius;
      pts.push({ x, y });
    }
    beginShape();
    const first = pts[0];
    const last = pts[pts.length - 1];
    curveVertex(first.x, first.y);
    for (let j = 0; j < pts.length; j++) {
      curveVertex(pts[j].x, pts[j].y);
    }
    curveVertex(last.x, last.y);
    endShape();

    const innerLoops = 3;
    for (let k = 0; k < innerLoops; k++) {
      const wobble = 0.08 * noise(rotSeed + k * 10, layer, t * 0.3 + k);
      const radius = baseRadius * (0.25 + layer * 0.05 + k * 0.06 + 0.08 * (my - 0.5));
      const arcSteps = 24;
      strokeWeight(max(0.6, sw * 0.7));
      stroke(strokeHue);
      beginShape();
      for (let i = 0; i <= arcSteps; i++) {
        const angle = map(i, 0, arcSteps, -PI, PI);
        const offset = radius * (1 + wobble * sin(angle * 3 + t * 0.5));
        const x = cos(angle) * offset;
        const y = sin(angle) * offset;
        curveVertex(x, y);
      }
      endShape();
    }
    pop();
  }
  pop();
}

function drawTimeRings(t, mx, my, hr, mn, sc) {
  push();
  translate(width * 0.5, height * 0.5);
  const radialStretch = map(mx, 0, 1, 0.85, 1.1);
  const ringWeight = map(my, 0, 1, 3.0, 6.2);
  drawNoiseArc(min(width, height) * 0.32 * radialStretch, hr / 12, activePalette[1], 110, t * 0.07, ringWeight * 1.05);
  drawNoiseArc(min(width, height) * 0.38 * radialStretch, mn / 60, activePalette[2], 90, t * 0.11, ringWeight);
  drawNoiseArc(min(width, height) * 0.45 * radialStretch, sc / 60, activePalette[4], 80, t * 0.18, ringWeight * 0.85);
  pop();
}

function drawCursorClock(cursorX, cursorY) {
  if (!isFinite(cursorX) || !isFinite(cursorY)) {
    return;
  }
  push();
  translate(width * 0.5, height * 0.5);
  if (!cursorClock.initialized) {
    pop();
    return;
  }
  const clockRadius = min(width, height) * 0.22;
  strokeCap(ROUND);
  const hands = [
    {
      angle: cursorClock.hourAngle,
      inner: 0.22,
      outer: 0.58,
      weight: 6,
      color: color(activePalette[2]),
      offset: cursorClock.hourOffset,
    },
    {
      angle: cursorClock.minuteAngle,
      inner: 0.16,
      outer: 0.78,
      weight: 4,
      color: color(activePalette[4]),
      offset: cursorClock.minuteOffset,
    },
    {
      angle: cursorClock.secondAngle,
      inner: 0.12,
      outer: 0.96,
      weight: 2,
      color: color(activePalette[1]),
      offset: 0,
    },
  ];
  hands.forEach((hand, idx) => {
    push();
    hand.color.setAlpha(180);
    stroke(hand.color);
    strokeWeight(hand.weight);
    const cosA = cos(hand.angle);
    const sinA = sin(hand.angle);
    const startRadius = clockRadius * hand.inner;
    const endRadius = clockRadius * hand.outer;
    const perpX = -sinA;
    const perpY = cosA;
  const floatShift = clockRadius * 0.03 * (idx - 1) + clockRadius * 0.04 * hand.offset;
    const startX = cosA * startRadius + perpX * floatShift;
    const startY = sinA * startRadius + perpY * floatShift;
    const endX = cosA * endRadius + perpX * floatShift;
    const endY = sinA * endRadius + perpY * floatShift;
    line(startX, startY, endX, endY);
    pop();
  });
  pop();
}

function updateCursorClock(baseAngle) {
  const normalizedBase = normalizeAngle(baseAngle);
  if (!cursorClock.initialized) {
    cursorClock.initialized = true;
    cursorClock.secondAngle = normalizedBase;
    cursorClock.minuteAngle = normalizedBase;
    cursorClock.hourAngle = normalizedBase;
    cursorClock.minuteOffset = 0;
    cursorClock.hourOffset = 0;
    return;
  }
  const delta = angleDifference(normalizedBase, cursorClock.secondAngle);
  cursorClock.secondAngle = normalizedBase;
  if (delta !== 0) {
    const minuteFactor = 0.32;
    const hourFactor = 0.12;
    cursorClock.minuteAngle = normalizeAngle(cursorClock.minuteAngle + delta * minuteFactor);
    cursorClock.hourAngle = normalizeAngle(cursorClock.hourAngle + delta * hourFactor);
  }
  cursorClock.minuteOffset = lerp(cursorClock.minuteOffset, sin(millis() * 0.0016) * 0.6, 0.1);
  cursorClock.hourOffset = lerp(cursorClock.hourOffset, cos(millis() * 0.0011) * 0.6, 0.08);
}

function drawNoiseArc(radius, progress, baseColor, alpha, z, weight) {
  if (progress <= 0) {
    return;
  }
  const steps = max(24, floor(TAU * radius * 0.35));
  const c = color(baseColor);
  c.setAlpha(alpha);
  stroke(c);
  strokeWeight(weight);
  noFill();
  const angleStart = -HALF_PI;
  const angleEnd = angleStart + TAU * constrain(progress, 0, 1);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = map(i, 0, steps, angleStart, angleEnd);
    const modulation = 0.88 + 0.18 * noise(cos(a) * 0.9 + timeOffset, sin(a) * 0.9 + washSeed, z);
    const r = radius * modulation;
    const x = cos(a) * r;
    const y = sin(a) * r;
    pts.push({ x, y });
  }
  beginShape();
  const first = pts[0];
  const last = pts[pts.length - 1];
  curveVertex(first.x, first.y);
  for (let j = 0; j < pts.length; j++) {
    curveVertex(pts[j].x, pts[j].y);
  }
  curveVertex(last.x, last.y);
  endShape();
}

function drawTickMarks(t, mx, my) {
  push();
  translate(width * 0.5, height * 0.5);
  const outer = min(width, height) * 0.5;
  const wobble = 0.06 * sin(t * 0.25) + 0.04 * (mx - 0.5);
  strokeWeight(1.1);
  for (let i = 0; i < 60; i++) {
    const baseAngle = TAU * (i / 60);
    const nVal = noise(timeOffset + i * 0.12, t * 0.22);
    const len = map(nVal, 0, 1, outer * 0.02, outer * (0.03 + 0.03 * my));
    const angle = baseAngle + wobble * sin(t * 0.2 + i * 0.05);
    const c = color(activePalette[(i + 3) % activePalette.length]);
    c.setAlpha(i % 5 === 0 ? 80 : 40);
    stroke(c);
    const innerR = outer * 0.68 + (i % 5 === 0 ? outer * 0.02 : 0);
    const x1 = cos(angle) * innerR;
    const y1 = sin(angle) * innerR;
    const x2 = cos(angle) * (innerR + len);
    const y2 = sin(angle) * (innerR + len);
    line(x1, y1, x2, y2);
  }
  pop();
}

function drawCustomCursor(t, mx, my, cursorX, cursorY) {
  if (!isFinite(mouseX) || !isFinite(mouseY)) {
    return;
  }
  push();
  translate(cursorX, cursorY);
  const accent = color(activePalette[1]);
  accent.setAlpha(140);
  const halo = color(activePalette[3]);
  halo.setAlpha(80);
  const pulse = 1 + 0.15 * sin(t * 3.8 + mx * PI);
  noFill();
  stroke(halo);
  strokeWeight(2);
  ellipse(0, 0, 22 * pulse);
  stroke(accent);
  strokeWeight(1.6);
  line(-8, 0, 8, 0);
  line(0, -8, 0, 8);
  fill(accent);
  noStroke();
  ellipse(0, 0, 6 + 1.5 * sin(t * 2.6 + my * TWO_PI));
  pop();
}

function normalizeAngle(angle) {
  return ((angle % TAU) + TAU) % TAU;
}

function angleDifference(a, b) {
  let diff = normalizeAngle(a) - normalizeAngle(b);
  if (diff > PI) {
    diff -= TAU;
  } else if (diff < -PI) {
    diff += TAU;
  }
  return diff;
}

function shiftHue(hex, shiftDeg, lightShift) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  let newHue = (h + shiftDeg) % 360;
  if (newHue < 0) {
    newHue += 360;
  }
  const sat = constrain(s * 0.6, 0, 100);
  const lightness = constrain(l + lightShift, 0, 100);
  const { r: nr, g: ng, b: nb } = hslToRgb(newHue, sat, lightness);
  return color(nr, ng, nb);
}

function hexToRgb(hex) {
  const stripped = hex.replace('#', '');
  const bigint = parseInt(stripped, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const maxVal = Math.max(rn, gn, bn);
  const minVal = Math.min(rn, gn, bn);
  let h;
  let s;
  const l = (maxVal + minVal) / 2;
  if (maxVal === minVal) {
    h = 0;
    s = 0;
  } else {
    const d = maxVal - minVal;
    s = l > 0.5 ? d / (2 - maxVal - minVal) : d / (maxVal + minVal);
    switch (maxVal) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let rn;
  let gn;
  let bn;
  if (h < 60) {
    rn = c;
    gn = x;
    bn = 0;
  } else if (h < 120) {
    rn = x;
    gn = c;
    bn = 0;
  } else if (h < 180) {
    rn = 0;
    gn = c;
    bn = x;
  } else if (h < 240) {
    rn = 0;
    gn = x;
    bn = c;
  } else if (h < 300) {
    rn = x;
    gn = 0;
    bn = c;
  } else {
    rn = c;
    gn = 0;
    bn = x;
  }
  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
  };
}

