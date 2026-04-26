"use client";
import { useEffect, useRef } from "react";

const PI = Math.PI;
const D2R = PI / 180;

const CITIES = [
  { lat: 37.57, lng: 126.98, sz: 5.5, cr: 250, cg: 202, cb: 62  }, // Seoul (hub)
  { lat: 37.37, lng:-122.04, sz: 3.8, cr: 245, cg: 190, cb: 48  }, // Cupertino
  { lat: 47.64, lng:-122.14, sz: 3.5, cr: 240, cg: 185, cb: 40  }, // Bellevue
  { lat: 40.71, lng: -74.01, sz: 3.8, cr: 240, cg: 188, cb: 44  }, // New York
  { lat: 35.68, lng: 139.65, sz: 3.5, cr: 232, cg: 200, cb: 96  }, // Tokyo
  { lat: 24.78, lng: 121.00, sz: 3.5, cr: 232, cg: 192, cb: 96  }, // Hsinchu (TSMC)
  { lat: 31.23, lng: 121.47, sz: 3.0, cr: 212, cg: 176, cb: 80  }, // Shanghai
  { lat: 22.54, lng: 114.06, sz: 3.0, cr: 212, cg: 176, cb: 80  }, // Shenzhen
  { lat:  1.35, lng: 103.82, sz: 3.0, cr: 224, cg: 196, cb: 88  }, // Singapore
  { lat: 51.51, lng:  -0.13, sz: 3.5, cr: 200, cg: 168, cb: 64  }, // London
  { lat: 48.86, lng:   2.35, sz: 2.6, cr: 200, cg: 168, cb: 64  }, // Paris
  { lat: 51.44, lng:   5.47, sz: 2.6, cr: 200, cg: 168, cb: 64  }, // Eindhoven
  { lat:-33.87, lng: 151.21, sz: 2.3, cr: 190, cg: 160, cb: 64  }, // Sydney
  { lat:-23.55, lng: -46.63, sz: 2.0, cr: 190, cg: 160, cb: 64  }, // São Paulo
  { lat: 19.08, lng:  72.88, sz: 2.3, cr: 204, cg: 168, cb: 64  }, // Mumbai
];

const ARCS = [
  { a:0, b:1,  alt:0.35, spd:0.00040, hi:true  },
  { a:0, b:3,  alt:0.40, spd:0.00035, hi:true  },
  { a:0, b:4,  alt:0.15, spd:0.00060, hi:true  },
  { a:0, b:5,  alt:0.18, spd:0.00050, hi:true  },
  { a:0, b:6,  alt:0.14, spd:0.00050, hi:true  },
  { a:0, b:8,  alt:0.22, spd:0.00045, hi:true  },
  { a:0, b:9,  alt:0.45, spd:0.00030, hi:true  },
  { a:0, b:12, alt:0.38, spd:0.00030, hi:true  },
  { a:1, b:2,  alt:0.10, spd:0.00070, hi:false },
  { a:1, b:3,  alt:0.18, spd:0.00050, hi:false },
  { a:3, b:9,  alt:0.32, spd:0.00040, hi:false },
  { a:9, b:10, alt:0.08, spd:0.00120, hi:false },
  { a:9, b:11, alt:0.08, spd:0.00120, hi:false },
  { a:4, b:8,  alt:0.24, spd:0.00050, hi:false },
  { a:6, b:7,  alt:0.10, spd:0.00100, hi:false },
  { a:8, b:12, alt:0.22, spd:0.00045, hi:false },
  { a:8, b:14, alt:0.15, spd:0.00060, hi:false },
  { a:3, b:13, alt:0.36, spd:0.00040, hi:false },
];

type Vec3 = { x: number; y: number; z: number };

function to3D(lat: number, lng: number): Vec3 {
  const la = lat * D2R, lo = lng * D2R;
  return { x: Math.cos(la) * Math.sin(lo), y: Math.sin(la), z: Math.cos(la) * Math.cos(lo) };
}

function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const dot = Math.max(-1, Math.min(1, a.x*b.x + a.y*b.y + a.z*b.z));
  const om = Math.acos(dot);
  if (om < 1e-4) return { x: a.x+(b.x-a.x)*t, y: a.y+(b.y-a.y)*t, z: a.z+(b.z-a.z)*t };
  const so = Math.sin(om);
  const f1 = Math.sin((1-t)*om)/so, f2 = Math.sin(t*om)/so;
  return { x: f1*a.x+f2*b.x, y: f1*a.y+f2*b.y, z: f1*a.z+f2*b.z };
}

function rotY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x*c + p.z*s, y: p.y, z: -p.x*s + p.z*c };
}

// Pre-compute arc paths (rest frame, no rotation)
const N = 80;
const PATHS = ARCS.map(arc => {
  const p1 = to3D(CITIES[arc.a].lat, CITIES[arc.a].lng);
  const p2 = to3D(CITIES[arc.b].lat, CITIES[arc.b].lng);
  return Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N;
    const p = slerp(p1, p2, t);
    const lift = 1 + arc.alt * Math.sin(t * PI);
    return { x: p.x * lift, y: p.y * lift, z: p.z * lift };
  });
});

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

      const cx = W / 2, cy = H / 2;
      const r  = Math.min(W, H) * 0.40;

      ctx!.clearRect(0, 0, W, H);

      // Atmosphere glow
      const atm = ctx!.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.38);
      atm.addColorStop(0,    "rgba(250,202,62,0.24)");
      atm.addColorStop(0.35, "rgba(250,185,50,0.10)");
      atm.addColorStop(0.7,  "rgba(240,168,40,0.03)");
      atm.addColorStop(1,    "rgba(0,0,0,0)");
      ctx!.fillStyle = atm;
      ctx!.beginPath();
      ctx!.arc(cx, cy, r * 1.38, 0, 2 * PI);
      ctx!.fill();

      // Globe base (dark sphere)
      const bg = ctx!.createRadialGradient(cx - r * 0.25, cy - r * 0.2, 0, cx, cy, r);
      bg.addColorStop(0,   "#1e1907");
      bg.addColorStop(0.5, "#0e0c03");
      bg.addColorStop(1,   "#030201");
      ctx!.fillStyle = bg;
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, 2 * PI);
      ctx!.fill();

      // Grid lines (clipped inside sphere)
      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(cx, cy, r - 0.5, 0, 2 * PI);
      ctx!.clip();
      ctx!.strokeStyle = "rgba(250,202,62,0.09)";
      ctx!.lineWidth = 0.6;

      // Latitude circles
      for (let lat = -60; lat <= 60; lat += 30) {
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

      // Longitude meridians
      for (let lng = 0; lng < 360; lng += 30) {
        const loR = lng * D2R + rot;
        if (Math.cos(loR) < 0) continue; // whole meridian is behind
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
      ctx!.restore();

      // Arcs
      PATHS.forEach((path, i) => {
        const arc  = ARCS[i];
        const phase = ph[i];
        const pts  = path.map(p => rotY(p, rot));

        // Faint base line
        ctx!.save();
        ctx!.lineWidth = arc.hi ? 0.8 : 0.5;
        ctx!.strokeStyle = arc.hi ? "rgba(250,202,62,0.11)" : "rgba(220,178,55,0.07)";
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
        const TAIL = 0.30;
        const hi = Math.min(N, Math.floor(phase * N));
        const ti = Math.max(0, Math.floor((phase - TAIL) * N));
        const len = Math.max(1, hi - ti);

        for (let j = ti; j < hi; j++) {
          const pa = pts[j], pb = pts[j + 1];
          if (!pa || !pb || pa.z < 0 || pb.z < 0) continue;
          const frac  = (j - ti) / len;
          const alpha = frac * (arc.hi ? 0.95 : 0.72);
          ctx!.save();
          ctx!.beginPath();
          ctx!.moveTo(cx + r * pa.x, cy - r * pa.y);
          ctx!.lineTo(cx + r * pb.x, cy - r * pb.y);
          ctx!.strokeStyle = arc.hi
            ? `rgba(250,202,62,${alpha.toFixed(2)})`
            : `rgba(230,178,55,${alpha.toFixed(2)})`;
          ctx!.lineWidth = arc.hi ? 2.0 : 1.3;
          ctx!.stroke();
          ctx!.restore();
        }

        // Head dot
        if (hi >= 0 && hi <= N) {
          const hp = pts[hi];
          if (hp && hp.z > 0.04) {
            ctx!.save();
            ctx!.shadowColor = arc.hi ? "#FACA3E" : "#E8B840";
            ctx!.shadowBlur  = arc.hi ? 14 : 9;
            ctx!.fillStyle   = "#FEFBEE";
            ctx!.globalAlpha = 0.95;
            ctx!.beginPath();
            ctx!.arc(cx + r * hp.x, cy - r * hp.y, arc.hi ? 2.4 : 1.6, 0, 2 * PI);
            ctx!.fill();
            ctx!.restore();
          }
        }

        ph[i] = (phase + arc.spd) % 1;
      });

      // Globe ring
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, 2 * PI);
      ctx!.strokeStyle = "rgba(250,202,62,0.30)";
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      // City dots
      for (const city of CITIES) {
        const p = rotY(to3D(city.lat, city.lng), rot);
        if (p.z < 0) continue;
        const depth = 0.4 + 0.6 * p.z;
        const sx = cx + r * p.x, sy = cy - r * p.y;
        const s  = city.sz * depth;
        ctx!.save();
        ctx!.shadowColor = `rgb(${city.cr},${city.cg},${city.cb})`;
        ctx!.shadowBlur  = s * 6;
        ctx!.globalAlpha = Math.min(1, 0.5 + 0.5 * depth);
        ctx!.fillStyle   = `rgb(${city.cr},${city.cg},${city.cb})`;
        ctx!.beginPath(); ctx!.arc(sx, sy, s, 0, 2 * PI); ctx!.fill();
        ctx!.shadowBlur  = s * 12;
        ctx!.fillStyle   = "rgba(255,248,215,0.9)";
        ctx!.globalAlpha = 0.75 * depth;
        ctx!.beginPath(); ctx!.arc(sx, sy, s * 0.38, 0, 2 * PI); ctx!.fill();
        ctx!.restore();
      }

      rot += 0.003;
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
