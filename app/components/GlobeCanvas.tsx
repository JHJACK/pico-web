"use client";
import { useEffect, useRef } from "react";

const PI = Math.PI;
const D2R = PI / 180;

// ── City data: [lat, lng, dotSize, r, g, b] ─────────────────────────────────
const CITIES: [number, number, number, number, number, number][] = [
  // Tier-0 hub
  [37.57, 126.98, 6.0, 250, 202, 62], // Seoul

  // Tier-1 majors
  [37.37,-122.04, 4.2, 245, 190, 48], // Silicon Valley (Apple/Google)
  [47.64,-122.14, 4.0, 240, 185, 40], // Bellevue (Microsoft)
  [40.71, -74.01, 4.2, 240, 190, 44], // New York
  [35.68, 139.65, 4.0, 232, 200, 96], // Tokyo
  [24.78, 121.00, 4.0, 232, 192, 96], // Hsinchu (TSMC)
  [51.51,  -0.13, 4.0, 200, 168, 64], // London
  [ 1.35, 103.82, 3.8, 224, 196, 88], // Singapore
  [31.23, 121.47, 3.8, 212, 176, 80], // Shanghai

  // Tier-2
  [41.88, -87.63, 3.2, 230, 178, 52], // Chicago
  [34.05,-118.24, 3.2, 230, 178, 52], // Los Angeles
  [29.76, -95.37, 3.0, 220, 172, 48], // Houston/Dallas
  [25.77, -80.19, 2.8, 215, 168, 46], // Miami
  [43.65, -79.38, 3.0, 215, 168, 46], // Toronto
  [19.43,-99.13,  2.8, 210, 165, 45], // Mexico City
  [48.86,   2.35, 3.2, 195, 162, 60], // Paris
  [50.11,   8.68, 3.0, 195, 160, 58], // Frankfurt
  [52.37,   4.90, 3.0, 195, 160, 58], // Amsterdam
  [47.38,   8.54, 2.8, 190, 158, 56], // Zurich
  [40.42,  -3.70, 2.8, 190, 158, 56], // Madrid
  [59.33,  18.07, 2.6, 185, 155, 54], // Stockholm
  [52.52,  13.40, 2.8, 190, 158, 56], // Berlin
  [55.75,  37.62, 3.0, 185, 150, 52], // Moscow
  [41.01,  28.97, 3.0, 195, 162, 58], // Istanbul
  [25.20,  55.27, 3.2, 210, 172, 56], // Dubai
  [30.04,  31.24, 2.8, 195, 158, 52], // Cairo
  [ 6.45,   3.40, 2.6, 185, 150, 48], // Lagos
  [-26.20,  28.05, 2.6, 185, 150, 48], // Johannesburg
  [-1.29,  36.82, 2.4, 180, 148, 46], // Nairobi
  [28.61,  77.21, 3.0, 200, 165, 55], // New Delhi
  [19.08,  72.88, 3.0, 200, 165, 55], // Mumbai
  [22.54, 114.06, 3.4, 210, 172, 76], // Shenzhen
  [39.90, 116.40, 3.4, 210, 172, 76], // Beijing
  [34.69, 135.50, 3.2, 225, 188, 85], // Osaka
  [25.03, 121.56, 3.4, 225, 188, 85], // Taipei
  [13.75, 100.52, 3.0, 210, 175, 78], // Bangkok
  [ 3.14, 101.69, 3.0, 210, 175, 78], // Kuala Lumpur
  [-6.21, 106.85, 3.0, 205, 170, 75], // Jakarta
  [14.60, 121.00, 2.8, 205, 170, 75], // Manila
  [-33.87, 151.21, 3.0, 188, 155, 60], // Sydney
  [-37.81, 144.96, 2.6, 185, 152, 58], // Melbourne
  [-34.61, -58.38, 2.6, 185, 152, 58], // Buenos Aires
  [-23.55, -46.63, 3.0, 188, 155, 58], // São Paulo
  [ 4.71, -74.07, 2.6, 182, 148, 52], // Bogotá
];

// ── Arc connections [cityA, cityB, arcAlt, speed, isPrimary] ─────────────────
const ARCS: [number, number, number, number, boolean][] = [
  // Seoul primary arcs (fast)
  [0, 1,  0.35, 0.0014, true ],
  [0, 3,  0.40, 0.0012, true ],
  [0, 4,  0.15, 0.0018, true ],
  [0, 5,  0.18, 0.0016, true ],
  [0, 8,  0.14, 0.0016, true ],
  [0, 7,  0.22, 0.0015, true ],
  [0, 6,  0.45, 0.0011, true ],
  [0,39,  0.38, 0.0011, true ],
  [0,30,  0.28, 0.0014, true ],
  [0,32,  0.12, 0.0018, true ],

  // US internal
  [1, 2,  0.10, 0.0022, false],
  [1, 3,  0.18, 0.0016, false],
  [3, 9,  0.12, 0.0024, false],
  [3,10,  0.16, 0.0022, false],
  [3,12,  0.08, 0.0026, false],
  [9,13,  0.08, 0.0024, false],
  [1,11,  0.12, 0.0020, false],

  // Americas
  [3, 6,  0.32, 0.0013, false],
  [3,40,  0.36, 0.0012, false],
  [3,41,  0.34, 0.0013, false],
  [3,42,  0.32, 0.0013, false],
  [10,41, 0.28, 0.0015, false],
  [13,43, 0.14, 0.0020, false],

  // Europe internal
  [6,16,  0.08, 0.0030, false],
  [6,17,  0.08, 0.0028, false],
  [6,18,  0.08, 0.0032, false],
  [6,22,  0.14, 0.0022, false],
  [6,23,  0.18, 0.0020, false],
  [16,17, 0.06, 0.0034, false],
  [15,16, 0.06, 0.0036, false],

  // Europe–Middle East–Asia
  [6,24,  0.28, 0.0016, false],
  [23,24, 0.14, 0.0022, false],
  [24, 7, 0.24, 0.0016, false],
  [6,22,  0.14, 0.0022, false],

  // Asia internal
  [4, 7,  0.24, 0.0016, false],
  [4,33,  0.08, 0.0028, false],
  [8, 7,  0.10, 0.0026, false],
  [8,36,  0.12, 0.0024, false],
  [8,37,  0.12, 0.0024, false],
  [8,38,  0.14, 0.0022, false],
  [8,39,  0.22, 0.0016, false],
  [31,32, 0.06, 0.0034, false],
  [8,31,  0.10, 0.0026, false],
  [35,36, 0.06, 0.0032, false],
  [5, 4,  0.10, 0.0026, false],
  [5, 8,  0.18, 0.0020, false],
  [30,31, 0.06, 0.0034, false],

  // Africa & Oceania
  [6,25,  0.36, 0.0013, false],
  [24,25, 0.26, 0.0016, false],
  [24,29, 0.22, 0.0018, false],
  [7,39,  0.22, 0.0016, false],
  [7,40,  0.28, 0.0014, false],
];

// ── Simplified continent outlines [lat, lng][] ───────────────────────────────
const LAND: [number, number][][] = [
  // North America
  [[66,-168],[60,-146],[58,-136],[55,-130],[49,-124],[42,-124],[37,-122],
   [32,-117],[29,-110],[23,-106],[20,-97],[15,-90],[8,-77],
   [10,-83],[16,-86],[20,-88],[21,-90],[26,-97],[30,-89],
   [25,-80],[30,-78],[35,-76],[40,-74],[41,-70],[44,-67],[47,-53],
   [52,-56],[62,-65],[67,-63],[70,-63],[75,-78],[73,-100],[70,-130],
   [71,-153],[67,-163],[66,-168]],

  // South America
  [[8,-77],[4,-77],[0,-80],[-5,-81],[-18,-70],[-30,-71],
   [-42,-74],[-56,-68],[-55,-65],[-41,-63],[-35,-57],
   [-23,-41],[-5,-35],[0,-50],[6,-52],[8,-63],[11,-60],[12,-72],[8,-77]],

  // Europe
  [[36,-6],[44,-9],[48,-5],[51,-4],[54,8],[55,9],[57,10],
   [63,7],[71,26],[70,28],[65,32],[60,28],[57,21],[55,14],
   [54,10],[52,5],[44,0],[43,6],[44,15],[41,20],[42,28],
   [40,26],[37,24],[40,20],[41,14],[44,12],[42,12],[38,15],
   [37,15],[44,12],[47,8],[44,5],[43,3],[41,1],[37,0],[36,-6]],

  // Africa
  [[37,-6],[37,10],[31,11],[29,32],[22,37],[11,43],[0,42],
   [-5,40],[-11,40],[-26,34],[-34,27],[-34,18],[-23,14],[-18,12],
   [-6,12],[0,9],[4,7],[5,1],[4,-5],[6,-1],[5,6],[4,10],
   [5,15],[12,14],[15,11],[22,12],[11,43]],

  // Asia (simplified main body)
  [[42,28],[37,36],[29,34],[22,37],[12,43],[0,42],[5,39],
   [10,50],[22,60],[23,66],[20,72],[8,77],[8,80],[0,81],
   [5,100],[1,104],[6,116],[22,114],[25,121],[40,121],
   [52,141],[58,163],[65,170],[68,160],[72,130],
   [73,100],[73,80],[68,58],[65,60],[58,68],
   [55,73],[52,84],[56,83],[55,68],[58,68],
   [65,57],[65,60],[45,78],[38,75],
   [37,60],[38,58],[37,44],[40,38],[42,40],[42,28]],

  // Australia
  [[-14,126],[-12,131],[-14,136],[-12,141],[-16,145],[-20,148],
   [-28,153],[-34,151],[-38,146],[-38,141],[-35,135],
   [-34,123],[-34,116],[-26,113],[-17,122],[-14,126]],
];

// ── Sphere math ──────────────────────────────────────────────────────────────
type V3 = { x: number; y: number; z: number };

function to3D(lat: number, lng: number): V3 {
  const la = lat * D2R, lo = lng * D2R;
  return { x: Math.cos(la)*Math.sin(lo), y: Math.sin(la), z: Math.cos(la)*Math.cos(lo) };
}

function slerp(a: V3, b: V3, t: number): V3 {
  const dot = Math.max(-1, Math.min(1, a.x*b.x + a.y*b.y + a.z*b.z));
  const om = Math.acos(dot);
  if (om < 1e-4) return { x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t, z:a.z+(b.z-a.z)*t };
  const so = Math.sin(om);
  const f1 = Math.sin((1-t)*om)/so, f2 = Math.sin(t*om)/so;
  return { x:f1*a.x+f2*b.x, y:f1*a.y+f2*b.y, z:f1*a.z+f2*b.z };
}

function ry(p: V3, a: number): V3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x*c + p.z*s, y: p.y, z: -p.x*s + p.z*c };
}

// ── Pre-compute arc paths (rest frame) ───────────────────────────────────────
const N = 80;
const PATHS = ARCS.map(([ai, bi, alt]) => {
  const p1 = to3D(CITIES[ai][0], CITIES[ai][1]);
  const p2 = to3D(CITIES[bi][0], CITIES[bi][1]);
  return Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N;
    const p = slerp(p1, p2, t);
    const lift = 1 + alt * Math.sin(t * PI);
    return { x: p.x*lift, y: p.y*lift, z: p.z*lift };
  });
});

// ── Pre-compute continent paths (rest frame) ─────────────────────────────────
const LAND_3D = LAND.map(poly => poly.map(([lat, lng]) => to3D(lat, lng)));

// ── Component ────────────────────────────────────────────────────────────────
export default function GlobeCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let rot = 0.55;
    let raf = 0;
    let dead = false;
    let tick = 0;
    const ph = ARCS.map(() => Math.random());

    function resize() {
      const p = cv!.parentElement;
      if (!p) return;
      cv!.width  = p.offsetWidth;
      cv!.height = p.offsetHeight;
    }

    function draw() {
      if (dead) return;
      const W = cv!.width, H = cv!.height;
      if (!W || !H) { raf = requestAnimationFrame(draw); return; }

      tick++;
      const cx = W / 2, cy = H / 2;
      const r  = Math.min(W, H) * 0.40;

      ctx!.clearRect(0, 0, W, H);

      // ── Atmosphere ──────────────────────────────────────────────────────
      const atm = ctx!.createRadialGradient(cx, cy, r * 0.82, cx, cy, r * 1.42);
      atm.addColorStop(0,    "rgba(250,202,62,0.28)");
      atm.addColorStop(0.30, "rgba(250,185,50,0.12)");
      atm.addColorStop(0.65, "rgba(240,165,40,0.04)");
      atm.addColorStop(1,    "rgba(0,0,0,0)");
      ctx!.fillStyle = atm;
      ctx!.beginPath();
      ctx!.arc(cx, cy, r * 1.42, 0, 2*PI);
      ctx!.fill();

      // ── Globe base ──────────────────────────────────────────────────────
      const bg = ctx!.createRadialGradient(cx - r*0.28, cy - r*0.22, 0, cx, cy, r);
      bg.addColorStop(0,   "#201b06");
      bg.addColorStop(0.45,"#0f0d03");
      bg.addColorStop(1,   "#030201");
      ctx!.fillStyle = bg;
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, 2*PI);
      ctx!.fill();

      // ── Save + clip to globe ─────────────────────────────────────────────
      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(cx, cy, r - 0.5, 0, 2*PI);
      ctx!.clip();

      // ── Grid lines ──────────────────────────────────────────────────────
      ctx!.strokeStyle = "rgba(250,202,62,0.07)";
      ctx!.lineWidth = 0.5;

      for (let lat = -75; lat <= 75; lat += 15) {
        const la = lat * D2R;
        let open = false;
        ctx!.beginPath();
        for (let lo = -180; lo <= 181; lo += 3) {
          const loR = lo * D2R + rot;
          if (Math.cos(la) * Math.cos(loR) < 0) { open = false; continue; }
          const sx = cx + r * Math.cos(la) * Math.sin(loR);
          const sy = cy - r * Math.sin(la);
          if (!open) { ctx!.moveTo(sx, sy); open = true; } else ctx!.lineTo(sx, sy);
        }
        ctx!.stroke();
      }
      for (let lng = 0; lng < 360; lng += 15) {
        const loR = lng * D2R + rot;
        if (Math.cos(loR) < 0) continue;
        let open = false;
        ctx!.beginPath();
        for (let la = -88; la <= 88; la += 3) {
          const laR = la * D2R;
          const sx = cx + r * Math.cos(laR) * Math.sin(loR);
          const sy = cy - r * Math.sin(laR);
          if (!open) { ctx!.moveTo(sx, sy); open = true; } else ctx!.lineTo(sx, sy);
        }
        ctx!.stroke();
      }

      // ── Continent outlines ───────────────────────────────────────────────
      ctx!.strokeStyle = "rgba(250,202,62,0.22)";
      ctx!.lineWidth   = 0.9;

      for (const poly of LAND_3D) {
        ctx!.beginPath();
        let open = false;
        for (const raw of poly) {
          const p = ry(raw, rot);
          if (p.z < 0) { open = false; continue; }
          const sx = cx + r * p.x, sy = cy - r * p.y;
          if (!open) { ctx!.moveTo(sx, sy); open = true; } else ctx!.lineTo(sx, sy);
        }
        ctx!.stroke();
      }

      // ── Restore clip ─────────────────────────────────────────────────────
      ctx!.restore();

      // ── Arcs (drawn outside clip so they arc above the globe) ────────────
      PATHS.forEach((path, i) => {
        const [,,, spd, hi] = ARCS[i];
        const phase = ph[i];
        const pts   = path.map(p => ry(p, rot));

        // Faint base trail
        ctx!.save();
        ctx!.lineWidth   = hi ? 0.8 : 0.5;
        ctx!.strokeStyle = hi ? "rgba(250,202,62,0.12)" : "rgba(220,178,55,0.07)";
        let open = false;
        ctx!.beginPath();
        for (const p of pts) {
          if (p.z < 0) { open = false; continue; }
          const sx = cx + r * p.x, sy = cy - r * p.y;
          if (!open) { ctx!.moveTo(sx, sy); open = true; } else ctx!.lineTo(sx, sy);
        }
        ctx!.stroke();
        ctx!.restore();

        // Moving comet
        const TAIL = 0.28;
        const hi_i = Math.min(N, Math.floor(phase * N));
        const ti   = Math.max(0, Math.floor((phase - TAIL) * N));
        const len  = Math.max(1, hi_i - ti);

        for (let j = ti; j < hi_i; j++) {
          const pa = pts[j], pb = pts[j + 1];
          if (!pa || !pb || pa.z < 0 || pb.z < 0) continue;
          const frac  = (j - ti) / len;
          const alpha = frac * (hi ? 0.98 : 0.75);
          ctx!.save();
          ctx!.beginPath();
          ctx!.moveTo(cx + r * pa.x, cy - r * pa.y);
          ctx!.lineTo(cx + r * pb.x, cy - r * pb.y);
          ctx!.strokeStyle = hi
            ? `rgba(250,202,62,${alpha.toFixed(2)})`
            : `rgba(230,178,55,${alpha.toFixed(2)})`;
          ctx!.lineWidth = hi ? 2.2 : 1.4;
          ctx!.stroke();
          ctx!.restore();
        }

        // Arc head glow dot
        if (hi_i >= 0 && hi_i <= N) {
          const hp = pts[hi_i];
          if (hp && hp.z > 0.03) {
            ctx!.save();
            ctx!.shadowColor = hi ? "#FACA3E" : "#E8B840";
            ctx!.shadowBlur  = hi ? 16 : 10;
            ctx!.fillStyle   = "#FEFBEE";
            ctx!.globalAlpha = 0.98;
            ctx!.beginPath();
            ctx!.arc(cx + r * hp.x, cy - r * hp.y, hi ? 2.6 : 1.7, 0, 2*PI);
            ctx!.fill();
            ctx!.restore();
          }
        }

        ph[i] = (phase + spd) % 1;
      });

      // ── Globe ring ───────────────────────────────────────────────────────
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, 2*PI);
      ctx!.strokeStyle = "rgba(250,202,62,0.32)";
      ctx!.lineWidth   = 1.5;
      ctx!.stroke();

      // ── City dots + pulse rings ──────────────────────────────────────────
      CITIES.forEach(([lat, lng, sz, cr, cg, cb], i) => {
        const p = ry(to3D(lat, lng), rot);
        if (p.z < 0) return;
        const depth = 0.4 + 0.6 * p.z;
        const sx = cx + r * p.x, sy = cy - r * p.y;
        const s  = sz * depth;

        // Pulse ring for Seoul
        if (i === 0) {
          const pv = (tick * 0.008) % 1;
          const pr = s * (1.8 + pv * 4.5);
          const pa = (1 - pv) * 0.55;
          ctx!.save();
          ctx!.beginPath();
          ctx!.arc(sx, sy, pr, 0, 2*PI);
          ctx!.strokeStyle = `rgba(250,202,62,${pa.toFixed(2)})`;
          ctx!.lineWidth = 1.2;
          ctx!.stroke();
          ctx!.restore();

          // Second pulse (offset by 0.5)
          const pv2 = (tick * 0.008 + 0.5) % 1;
          const pr2 = s * (1.8 + pv2 * 4.5);
          const pa2 = (1 - pv2) * 0.35;
          ctx!.save();
          ctx!.beginPath();
          ctx!.arc(sx, sy, pr2, 0, 2*PI);
          ctx!.strokeStyle = `rgba(250,202,62,${pa2.toFixed(2)})`;
          ctx!.lineWidth = 0.8;
          ctx!.stroke();
          ctx!.restore();
        }

        // Glow dot
        ctx!.save();
        ctx!.shadowColor = `rgb(${cr},${cg},${cb})`;
        ctx!.shadowBlur  = s * 7;
        ctx!.globalAlpha = Math.min(1, 0.5 + 0.5 * depth);
        ctx!.fillStyle   = `rgb(${cr},${cg},${cb})`;
        ctx!.beginPath(); ctx!.arc(sx, sy, s, 0, 2*PI); ctx!.fill();

        // Bright center
        ctx!.shadowBlur  = s * 14;
        ctx!.fillStyle   = "rgba(255,250,220,0.92)";
        ctx!.globalAlpha = 0.78 * depth;
        ctx!.beginPath(); ctx!.arc(sx, sy, s * 0.36, 0, 2*PI); ctx!.fill();
        ctx!.restore();
      });

      rot += 0.0028;
      raf = requestAnimationFrame(draw);
    }

    resize();
    const ro = new ResizeObserver(resize);
    if (cv.parentElement) ro.observe(cv.parentElement);
    raf = requestAnimationFrame(draw);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: "absolute", inset: 0, display: "block", pointerEvents: "none" }}
    />
  );
}
