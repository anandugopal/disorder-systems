// Brush layer — repaints circles, trails, balls, bursts, hulls, the drag preview and the cursor with p5.brush (standalone build, no p5).
//
// p5.brush needs its own WebGL2 canvas, so it paints offscreen and the swarm composites
// the result into its 2D canvas at the right depth (under the balls, over the background).
// Brush strokes are randomised per draw, so repainting at a lower fps gives a hand-drawn "boil".

import * as brush from 'p5.brush/standalone';

const MIN_R = 2;

// ---- colour helpers for the background texture (bg-derived tint, so it works on any theme)
const hexRgb = (h) => {
  const m = /^#?([0-9a-f]{6})/i.exec(h || '');
  const n = m ? parseInt(m[1], 16) : 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => rgbHex(hexRgb(a).map((v, i) => v + (hexRgb(b)[i] - v) * t));
const luminance = (h) => { const [r, g, b] = hexRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

export function createBrushLayer(params) {
  let canvas = null;
  let W = 0, H = 0, dpr = 0;
  let lastTick = -1;
  let lastCursor = null;
  let paper = null;     // 2D canvas holding the baked background texture
  let paperKey = '';    // params + size the current bake was made with
  let paperAt = -1e9;   // last bake time, to throttle rebakes while a slider is dragged
  let failed = false;

  function ensure(w, h, density) {
    if (canvas && w === W && h === H && density === dpr) return true;
    try {
      canvas = brush.createCanvas(w, h, { parent: null, pixelDensity: density, id: 'swarm-brush' });
      brush.angleMode(brush.RADIANS);
      W = w; H = h; dpr = density;
      return true;
    } catch (err) {
      failed = true; // no WebGL2: the swarm falls back to its vector strokes
      console.warn('[brush-layer] disabled:', err);
      return false;
    }
  }

  // Trail samples are a flat [x0, y0, x1, y1, ...] array; brush.spline wants [[x, y, pressure]].
  // Downsample so each stroke stays cheap, and ramp pressure so the tail thins out.
  function trailPoints(t, step) {
    const n = t.length / 2;
    const pts = [];
    for (let i = 0; i < n; i += step) {
      const f = i / Math.max(1, n - 1); // 0 = tail, 1 = head
      pts.push([t[2 * i], t[2 * i + 1], 1 - params.taper * (1 - f)]);
    }
    pts.push([t[2 * n - 2], t[2 * n - 1], 1]);
    return pts;
  }

  // Sets up fill/hatch for the next shape. Opacity is 0–255 (p5.brush fill scale).
  function setFill(mode, color, { opacity = params.brushFillOpacity, bleed = params.brushBleed } = {}) {
    brush.noHatch();
    brush.noFill();
    if (mode === 'watercolor') {
      brush.fill(color, opacity);
      brush.fillBleed(bleed);
      brush.fillTexture(params.brushTexture, 0.4);
    } else if (mode === 'solid') {
      brush.fill(color, opacity);
      brush.fillBleed(0);
      brush.fillTexture(params.brushTexture * 0.5, 0.2, false);
    } else if (mode === 'hatch') {
      brush.hatch(params.brushHatchGap, Math.PI / 4, { rand: 0.1, continuous: false });
      brush.hatchStyle(params.brushType, color, params.brushWeight);
    }
  }

  function disc(x, y, r, color, mode, fillOpts) {
    if (!(r >= MIN_R)) return; // p5.brush throws on sub-pixel circles (e.g. a click that barely drags)
    setFill(mode, color, fillOpts);
    brush.set(params.brushType, color, params.brushWeight);
    brush.circle(x, y, r, params.brushWobble);
  }

  function paintCircles(obstacles) {
    for (const o of obstacles) disc(o.x, o.y, o.r, o.color, params.brushCircleFill);
  }

  // A filled-looking disc from a single pencil stroke: a spiral from the centre out to r.
  // p5.brush fills are far too heavy to run on 40 balls per frame (~7fps); one stroke each is ~free.
  function spiral(x, y, r, gap) {
    const turns = Math.max(1, r / gap);
    const n = Math.ceil(turns * 14);
    const a0 = Math.random() * Math.PI * 2;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = a0 + t * turns * Math.PI * 2;
      pts.push([x + Math.cos(a) * r * t, y + Math.sin(a) * r * t, 1]);
    }
    return pts;
  }

  function paintBalls(agents, colorOf, radius) {
    const mode = params.brushBallFill;
    if (mode === 'solid') {
      brush.noFill();
      brush.noHatch();
      const gap = Math.max(1.2, params.brushBallGap);
      for (const a of agents) {
        brush.set(params.brushType, colorOf(a), params.brushBallWeight);
        brush.spline(spiral(a.x, a.y, radius, gap), 0.5);
      }
      return;
    }
    // Real fills: small shapes need a tight bleed or the watercolour swallows the ball.
    for (const a of agents) {
      disc(a.x, a.y, radius, colorOf(a), mode, { opacity: 255, bleed: Math.min(params.brushBleed, 0.08) });
    }
  }

  // Bursts: brush strokes have no alpha, so the fade-out is carried by weight and fill opacity.
  function paintBlasts(frames) {
    for (const f of frames) {
      const w = params.brushWeight;
      brush.noFill();
      brush.noHatch();
      for (const r of f.rings) {
        brush.set(params.brushType, f.color, Math.max(0.05, 1.5 * w * f.fade));
        brush.circle(f.x, f.y, r, params.brushWobble);
      }
      if (f.filled) setFill(params.brushCircleFill === 'outline' ? 'solid' : params.brushCircleFill, f.color, { opacity: 255 * f.fade });
      else { brush.noFill(); brush.noHatch(); }
      brush.set(params.brushType, f.color, Math.max(0.05, (f.filled ? 1 : f.outline) * w * f.fade));
      brush.polygon(f.points);
      if (f.flash) {
        setFill('solid', f.flash.color, { opacity: 255 * f.flash.alpha });
        brush.noStroke();
        brush.polygon(f.flash.points);
      }
    }
  }

  function paintHulls(rects) {
    brush.noFill();
    brush.noHatch();
    for (const r of rects) {
      if (r.w < 1 || r.h < 1) continue;
      brush.set(params.brushType, r.color, params.brushWeight * params.hullWidth);
      brush.rect(r.x, r.y, r.w, r.h);
    }
  }

  // Crosshair + diamond pointer, in the cursor's grey/ink. Replaces the DOM cursor while brushing.
  function paintCursor({ x, y }) {
    brush.noFill();
    brush.noHatch();
    const lw = params.cursorLineWidth * params.brushWeight;
    if (lw > 0) {
      brush.set(params.brushType, params.cursorColor, lw);
      brush.line(0, y, W, y);
      brush.line(x, 0, x, H);
    }
    const h = params.cursorSize / Math.SQRT2; // half-diagonal of the rotated square
    const diamond = (k) => [[x, y - h * k], [x + h * k, y], [x, y + h * k], [x - h * k, y]];
    setFill('solid', params.cursorColor, { opacity: 255 });
    brush.set(params.brushType, params.cursorColor, params.brushWeight);
    brush.polygon(diamond(1));
    setFill('solid', params.cursorInk, { opacity: 255 });
    brush.set(params.brushType, params.cursorInk, params.brushWeight);
    brush.polygon(diamond(0.5));
  }

  function paintTrails(agents, colorOf) {
    const step = Math.max(1, params.brushDetail | 0);
    // Fill/hatch state is global in p5.brush: clear it or the splines get filled as shapes.
    brush.noFill();
    brush.noHatch();
    for (const a of agents) {
      if (a.trail.length < 6) continue;
      brush.set(params.brushType, colorOf(a), params.brushWeight * params.trailWidth);
      brush.spline(trailPoints(a.trail, step), 0.5);
    }
  }

  // Paper grain: one faint watercolour wash over the whole canvas plus scattered pencil
  // flecks, in a tint pulled a few % from the background toward black or white.
  // The result is opaque and replaces the flat background fill.
  function bakePaper(bg) {
    const light = luminance(bg) > 0.5;
    const ink = light ? '#000000' : '#ffffff';
    // Pigment reads much weaker on dark grounds, so dark themes get a stronger tint for the same "slight".
    const amt = params.bgTextureAmount * (light ? 1 : 2.5);
    brush.seed(params.bgTextureSeed);
    // Bake onto an opaque canvas of the real background colour: p5.brush mixes pigment
    // against what's underneath, and on a transparent canvas that goes wrong on dark grounds.
    brush.clear(bg);
    brush.push();
    try {
      brush.translate(-W / 2, -H / 2);
      if (params.bgWash > 0) {
        brush.noStroke();
        brush.noHatch();
        brush.fill(mix(bg, ink, 0.5), Math.max(1, 60 * amt * params.bgWash));
        brush.fillBleed(0.35);
        brush.fillTexture(0.9, 0.1);
        brush.rect(-40, -40, W + 80, H + 80);
      }
      brush.noFill();
      // brush.random() follows brush.seed(), so the same seed always bakes the same paper.
      const grain = Math.round(params.bgGrain * (W * H) / (1440 * 900));
      const tone = mix(bg, ink, 0.12 * amt);
      for (let i = 0; i < grain; i++) {
        const x = brush.random() * W, y = brush.random() * H;
        const len = 6 + brush.random() * 40;
        const a = Math.PI / 4 + (brush.random() - 0.5) * 0.8;
        brush.set('2H', tone, 0.4 + brush.random() * 0.6);
        brush.line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
      }
      brush.render();
    } finally {
      brush.noFill();
      brush.pop();
    }
    paper ??= document.createElement('canvas');
    paper.width = canvas.width;
    paper.height = canvas.height;
    const pctx = paper.getContext('2d');
    pctx.clearRect(0, 0, paper.width, paper.height);
    pctx.drawImage(canvas, 0, 0);
    lastTick = -1; // the brush canvas was just used for the bake: force a fresh paint this frame
  }

  return {
    // Baked, opaque background (bg colour + texture) as a 2D canvas, or null when off/unavailable.
    background({ now, w, h, density, bg }) {
      if (failed || !params.brushOn || !params.bgTexture || params.bgTextureAmount <= 0) return null;
      if (!ensure(Math.round(w), Math.round(h), density)) return null;
      const key = [W, H, dpr, bg, params.bgTextureAmount, params.bgGrain, params.bgWash, params.bgTextureSeed].join('|');
      if (key !== paperKey && now - paperAt > 150) {
        try {
          bakePaper(bg);
          paperKey = key;
          paperAt = now;
        } catch (err) {
          console.warn('[brush-layer] background bake failed:', err);
          return null;
        }
      }
      return paper;
    },

    // Returns an offscreen canvas to composite, or null when brushing is off/unavailable.
    paint({ now, w, h, density, agents, obstacles, trailColor, ballColor, radius, circles, trails, balls, blasts, preview, hulls, cursor }) {
      if (failed || !params.brushOn) return null;
      if (!ensure(Math.round(w), Math.round(h), density)) return null;

      // Boil: strokes are re-rolled once per tick and held in between. The cursor can't wait for
      // the next tick, so pointer movement forces a repaint — seeding the brush RNG with the tick
      // keeps everything else on the same strokes, so the boil rate doesn't change.
      const tick = Math.floor(now / (1000 / Math.max(1, params.brushFps)));
      const cursorMoved = cursor
        ? !lastCursor || cursor.x !== lastCursor.x || cursor.y !== lastCursor.y
        : !!lastCursor;
      if (tick === lastTick && !cursorMoved) return canvas;
      lastTick = tick;
      lastCursor = cursor ? { x: cursor.x, y: cursor.y } : null;
      brush.seed(tick);

      let pushed = false;
      try {
        brush.clear();
        // brush.clear() leaves (1,1,1,0), which composites as white on a premultiplied canvas.
        const gl = canvas.getContext('webgl2');
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // p5.brush uses a WEBGL-style centred origin; shift it back to top-left canvas coords.
        brush.push();
        pushed = true;
        brush.translate(-W / 2, -H / 2);
        if (circles && obstacles.length) paintCircles(obstacles);
        if (trails) paintTrails(agents, trailColor);
        if (balls) paintBalls(agents, ballColor, radius);
        if (blasts?.length) paintBlasts(blasts);
        if (hulls?.length) paintHulls(hulls);
        if (preview) disc(preview.x, preview.y, preview.r, preview.color, params.brushCircleFill);
        if (cursor) paintCursor(cursor);
        brush.render();
        return canvas;
      } catch (err) {
        // A bad stroke must never take the whole frame down: skip brushing for this frame.
        console.warn('[brush-layer] paint failed:', err);
        return null;
      } finally {
        // Always unwind the transform: a missed pop() stacks another (-W/2, -H/2) shift every
        // frame and slides everything off the canvas.
        brush.noFill();
        brush.noHatch();
        if (pushed) brush.pop();
      }
    },
    get enabled() { return !failed && params.brushOn; },
  };
}
