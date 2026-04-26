"use client";
import { useEffect, useRef } from "react";

const POINTS = [
  { lat: 37.5665, lng: 126.978,  size: 0.62, color: "#FACA3E" },
  { lat: 37.3688, lng: -122.036, size: 0.46, color: "#F5C030" },
  { lat: 37.3317, lng: -122.031, size: 0.46, color: "#F5C030" },
  { lat: 30.2281, lng: -97.749,  size: 0.38, color: "#F5C030" },
  { lat: 47.6423, lng: -122.139, size: 0.42, color: "#F5C030" },
  { lat: 47.6204, lng: -122.349, size: 0.38, color: "#F5C030" },
  { lat: 37.4847, lng: -122.148, size: 0.38, color: "#F5C030" },
  { lat: 40.7128, lng: -74.006,  size: 0.48, color: "#F5C030" },
  { lat: 41.2565, lng: -95.934,  size: 0.30, color: "#E8B828" },
  { lat: 35.6762, lng: 139.650,  size: 0.44, color: "#E8C860" },
  { lat: 35.0828, lng: 137.156,  size: 0.32, color: "#E8C860" },
  { lat: 24.7794, lng: 120.996,  size: 0.44, color: "#E8C060" },
  { lat: 30.2741, lng: 120.155,  size: 0.36, color: "#D4B050" },
  { lat: 22.5431, lng: 114.058,  size: 0.36, color: "#D4B050" },
  { lat: 31.2304, lng: 121.474,  size: 0.38, color: "#D4B050" },
  { lat: 1.3521,  lng: 103.820,  size: 0.34, color: "#E0C458" },
  { lat: 19.076,  lng: 72.878,   size: 0.30, color: "#CCA840" },
  { lat: 51.5074, lng: -0.128,   size: 0.44, color: "#C8A840" },
  { lat: 48.8566, lng: 2.352,    size: 0.34, color: "#C8A840" },
  { lat: 52.520,  lng: 13.405,   size: 0.30, color: "#C8A840" },
  { lat: 51.4416, lng: 5.470,    size: 0.36, color: "#C8A840" },
  { lat: -33.869, lng: 151.209,  size: 0.30, color: "#BEA040" },
  { lat: -23.550, lng: -46.633,  size: 0.28, color: "#BEA040" },
  { lat: 55.751,  lng: 37.618,   size: 0.26, color: "#B89830" },
  { lat: -26.204, lng: 28.047,   size: 0.24, color: "#B09030" },
];

const SL = 37.5665, SG = 126.978;

const ARCS = [
  { startLat: SL, startLng: SG, endLat: 37.3688, endLng: -122.036, ck: "g1", alt: 0.38 },
  { startLat: SL, startLng: SG, endLat: 40.7128, endLng: -74.006,  ck: "g1", alt: 0.42 },
  { startLat: SL, startLng: SG, endLat: 35.6762, endLng: 139.650,  ck: "g2", alt: 0.18 },
  { startLat: SL, startLng: SG, endLat: 24.7794, endLng: 120.996,  ck: "g2", alt: 0.20 },
  { startLat: SL, startLng: SG, endLat: 31.2304, endLng: 121.474,  ck: "g2", alt: 0.18 },
  { startLat: SL, startLng: SG, endLat: 1.3521,  endLng: 103.820,  ck: "g3", alt: 0.24 },
  { startLat: SL, startLng: SG, endLat: 51.5074, endLng: -0.128,   ck: "g3", alt: 0.46 },
  { startLat: SL, startLng: SG, endLat: -33.869, endLng: 151.209,  ck: "g3", alt: 0.32 },
  { startLat: 37.3688, startLng: -122.036, endLat: 47.6423, endLng: -122.139, ck: "a1", alt: 0.14 },
  { startLat: 37.3688, startLng: -122.036, endLat: 30.2281, endLng: -97.749,  ck: "a1", alt: 0.20 },
  { startLat: 40.7128, startLng: -74.006,  endLat: 51.5074, endLng: -0.128,   ck: "a1", alt: 0.36 },
  { startLat: 51.5074, startLng: -0.128,   endLat: 48.8566, endLng: 2.352,    ck: "a2", alt: 0.10 },
  { startLat: 51.5074, startLng: -0.128,   endLat: 51.4416, endLng: 5.470,    ck: "a2", alt: 0.10 },
  { startLat: 35.6762, startLng: 139.650,  endLat: 1.3521,  endLng: 103.820,  ck: "a1", alt: 0.26 },
  { startLat: 35.6762, startLng: 139.650,  endLat: 24.7794, endLng: 120.996,  ck: "a2", alt: 0.16 },
  { startLat: 31.2304, startLng: 121.474,  endLat: 22.5431, endLng: 114.058,  ck: "a2", alt: 0.14 },
  { startLat: 1.3521,  startLng: 103.820,  endLat: -33.869, endLng: 151.209,  ck: "a2", alt: 0.22 },
  { startLat: 1.3521,  startLng: 103.820,  endLat: 19.076,  endLng: 72.878,   ck: "a2", alt: 0.18 },
  { startLat: 40.7128, startLng: -74.006,  endLat: -23.550, endLng: -46.633,  ck: "a2", alt: 0.34 },
  { startLat: 51.5074, startLng: -0.128,   endLat: 55.751,  endLng: 37.618,   ck: "a2", alt: 0.14 },
  { startLat: 51.5074, startLng: -0.128,   endLat: -26.204, endLng: 28.047,   ck: "a3", alt: 0.40 },
];

const ARC_COLORS: Record<string, [string, string]> = {
  g1: ["rgba(250,202,62,0.95)", "rgba(250,202,62,0.08)"],
  g2: ["rgba(250,202,62,0.70)", "rgba(250,202,62,0.04)"],
  g3: ["rgba(250,190,50,0.50)", "rgba(250,190,50,0.02)"],
  a1: ["rgba(240,175,60,0.60)", "rgba(240,175,60,0.04)"],
  a2: ["rgba(235,165,50,0.40)", "rgba(235,165,50,0.02)"],
  a3: ["rgba(225,155,40,0.30)", "rgba(225,155,40,0.01)"],
};

export default function StockGlobe() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let globe: any = null;
    let destroyed = false;
    let rafId = 0;

    const doInit = async () => {
      if (destroyed || globe) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!w || !h) return;

      const { default: Globe } = await import("globe.gl");
      if (destroyed) return;

      globe = new (Globe as any)({ animateIn: false })(el);
      globe
        .width(w)
        .height(h)
        .backgroundColor("rgba(0,0,0,0)")
        .globeImageUrl("/earth-night.jpg")
        .bumpImageUrl("/earth-topology.png")
        .atmosphereColor("rgba(250,202,62,0.50)")
        .atmosphereAltitude(0.16)
        .pointsData(POINTS)
        .pointLat("lat")
        .pointLng("lng")
        .pointColor("color")
        .pointAltitude(0.014)
        .pointRadius("size")
        .pointResolution(24)
        .arcsData(ARCS)
        .arcStartLat("startLat")
        .arcStartLng("startLng")
        .arcEndLat("endLat")
        .arcEndLng("endLng")
        .arcColor((d: any) => ARC_COLORS[d.ck] ?? ARC_COLORS.a3)
        .arcAltitude((d: any) => d.alt)
        .arcDashLength(0.38)
        .arcDashGap(0.62)
        .arcDashAnimateTime((d: any) =>
          d.ck === "g1" ? 2200 : d.ck === "g2" ? 2600 : d.ck === "g3" ? 3000 : d.ck === "a1" ? 3200 : 3800
        )
        .arcStroke((d: any) =>
          d.ck === "g1" ? 0.60 : d.ck === "g2" ? 0.48 : d.ck === "g3" ? 0.40 : d.ck === "a1" ? 0.34 : 0.26
        );

      globe.pointOfView({ lat: 28, lng: 118, altitude: 2.1 }, 0);

      const ctrl = globe.controls();
      ctrl.autoRotate = true;
      ctrl.autoRotateSpeed = 0.42;
      ctrl.enableZoom = false;
      ctrl.enablePan = false;
      ctrl.enableRotate = false;
    };

    rafId = requestAnimationFrame(() => doInit());

    const ro = new ResizeObserver(() => {
      if (!globe) doInit();
    });
    ro.observe(el);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      try { globe?._destructor?.(); } catch {}
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}
