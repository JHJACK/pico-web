"use client";
import { useEffect, useRef } from "react";

const POINTS = [
  { lat: 37.5665, lng: 126.978,  size: 1.0,  color: "#FACA3E" }, // Seoul
  { lat: 37.3688, lng: -122.036, size: 0.62, color: "#F5C030" }, // Cupertino (Apple)
  { lat: 37.3317, lng: -122.031, size: 0.60, color: "#F5C030" }, // Mountain View (Google)
  { lat: 37.4847, lng: -122.148, size: 0.50, color: "#F5C030" }, // Palo Alto (Tesla/Meta)
  { lat: 47.6423, lng: -122.139, size: 0.62, color: "#F5C030" }, // Bellevue (Microsoft)
  { lat: 47.6204, lng: -122.349, size: 0.55, color: "#F5C030" }, // Seattle (Amazon)
  { lat: 30.2281, lng: -97.749,  size: 0.44, color: "#ECC030" }, // Austin (Tesla)
  { lat: 40.7128, lng: -74.006,  size: 0.62, color: "#F0BC2C" }, // New York (Wall St)
  { lat: 41.2565, lng: -95.934,  size: 0.36, color: "#E8B828" }, // Omaha (Berkshire)
  { lat: 35.6762, lng: 139.650,  size: 0.56, color: "#E8C860" }, // Tokyo
  { lat: 35.0828, lng: 137.156,  size: 0.40, color: "#E0C060" }, // Nagoya (Toyota)
  { lat: 24.7794, lng: 120.996,  size: 0.58, color: "#E8C060" }, // Hsinchu (TSMC)
  { lat: 30.2741, lng: 120.155,  size: 0.44, color: "#D4B050" }, // Hangzhou (Alibaba)
  { lat: 22.5431, lng: 114.058,  size: 0.48, color: "#D4B050" }, // Shenzhen (Tencent)
  { lat: 31.2304, lng: 121.474,  size: 0.50, color: "#D4B050" }, // Shanghai
  { lat: 39.9042, lng: 116.407,  size: 0.42, color: "#D4B050" }, // Beijing
  { lat: 1.3521,  lng: 103.820,  size: 0.46, color: "#E0C458" }, // Singapore
  { lat: 19.076,  lng: 72.878,   size: 0.38, color: "#CCA840" }, // Mumbai
  { lat: 51.5074, lng: -0.128,   size: 0.56, color: "#C8A840" }, // London
  { lat: 48.8566, lng: 2.352,    size: 0.44, color: "#C8A840" }, // Paris (LVMH)
  { lat: 52.520,  lng: 13.405,   size: 0.38, color: "#C8A840" }, // Berlin (SAP)
  { lat: 51.4416, lng: 5.470,    size: 0.48, color: "#C8A840" }, // Eindhoven (ASML)
  { lat: -33.869, lng: 151.209,  size: 0.36, color: "#BEA040" }, // Sydney
  { lat: -23.550, lng: -46.633,  size: 0.32, color: "#BEA040" }, // São Paulo
  { lat: 55.751,  lng: 37.618,   size: 0.30, color: "#B89830" }, // Moscow
  { lat: -26.204, lng: 28.047,   size: 0.26, color: "#B09030" }, // Johannesburg
];

const SL = 37.5665, SG = 126.978;

const ARCS = [
  { startLat: SL, startLng: SG, endLat: 37.3688, endLng: -122.036, ck: "g1", alt: 0.42 },
  { startLat: SL, startLng: SG, endLat: 40.7128, endLng: -74.006,  ck: "g1", alt: 0.46 },
  { startLat: SL, startLng: SG, endLat: 35.6762, endLng: 139.650,  ck: "g2", alt: 0.18 },
  { startLat: SL, startLng: SG, endLat: 24.7794, endLng: 120.996,  ck: "g2", alt: 0.20 },
  { startLat: SL, startLng: SG, endLat: 31.2304, endLng: 121.474,  ck: "g2", alt: 0.18 },
  { startLat: SL, startLng: SG, endLat: 1.3521,  endLng: 103.820,  ck: "g3", alt: 0.27 },
  { startLat: SL, startLng: SG, endLat: 51.5074, endLng: -0.128,   ck: "g3", alt: 0.50 },
  { startLat: SL, startLng: SG, endLat: -33.869, endLng: 151.209,  ck: "g3", alt: 0.35 },
  { startLat: 37.3688, startLng: -122.036, endLat: 40.7128, endLng: -74.006,  ck: "a1", alt: 0.22 },
  { startLat: 37.3688, startLng: -122.036, endLat: 47.6423, endLng: -122.139, ck: "a1", alt: 0.14 },
  { startLat: 37.3688, startLng: -122.036, endLat: 30.2281, endLng: -97.749,  ck: "a1", alt: 0.20 },
  { startLat: 40.7128, startLng: -74.006,  endLat: 51.5074, endLng: -0.128,   ck: "a1", alt: 0.38 },
  { startLat: 40.7128, startLng: -74.006,  endLat: -23.550, endLng: -46.633,  ck: "a2", alt: 0.36 },
  { startLat: 51.5074, startLng: -0.128,   endLat: 48.8566, endLng: 2.352,    ck: "a2", alt: 0.10 },
  { startLat: 51.5074, startLng: -0.128,   endLat: 51.4416, endLng: 5.470,    ck: "a2", alt: 0.10 },
  { startLat: 51.5074, startLng: -0.128,   endLat: 55.751,  endLng: 37.618,   ck: "a2", alt: 0.14 },
  { startLat: 51.5074, startLng: -0.128,   endLat: -26.204, endLng: 28.047,   ck: "a3", alt: 0.42 },
  { startLat: 35.6762, startLng: 139.650,  endLat: 24.7794, endLng: 120.996,  ck: "a2", alt: 0.16 },
  { startLat: 35.6762, startLng: 139.650,  endLat: 1.3521,  endLng: 103.820,  ck: "a2", alt: 0.27 },
  { startLat: 31.2304, startLng: 121.474,  endLat: 22.5431, endLng: 114.058,  ck: "a2", alt: 0.14 },
  { startLat: 31.2304, startLng: 121.474,  endLat: 39.9042, endLng: 116.407,  ck: "a2", alt: 0.12 },
  { startLat: 1.3521,  startLng: 103.820,  endLat: -33.869, endLng: 151.209,  ck: "a2", alt: 0.24 },
  { startLat: 1.3521,  startLng: 103.820,  endLat: 19.076,  endLng: 72.878,   ck: "a2", alt: 0.18 },
  { startLat: 19.076,  startLng: 72.878,   endLat: 51.5074, endLng: -0.128,   ck: "a3", alt: 0.40 },
];

const ARC_COLORS: Record<string, [string, string]> = {
  g1: ["rgba(250,202,62,1.00)", "rgba(250,202,62,0.0)"],
  g2: ["rgba(250,198,58,0.88)", "rgba(250,198,58,0.0)"],
  g3: ["rgba(245,188,50,0.68)", "rgba(245,188,50,0.0)"],
  a1: ["rgba(238,178,55,0.72)", "rgba(238,178,55,0.0)"],
  a2: ["rgba(225,165,50,0.52)", "rgba(225,165,50,0.0)"],
  a3: ["rgba(212,152,42,0.36)", "rgba(212,152,42,0.0)"],
};

export default function StockGlobe() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let globe: any = null;
    let destroyed = false;

    const init = async () => {
      if (destroyed) return;

      // Wait until element has layout
      let w = el.offsetWidth;
      let h = el.offsetHeight;
      if (!w || !h) {
        await new Promise<void>((res) => {
          const ro = new ResizeObserver(() => {
            if (el.offsetWidth && el.offsetHeight) { ro.disconnect(); res(); }
          });
          ro.observe(el);
        });
        if (destroyed) return;
        w = el.offsetWidth;
        h = el.offsetHeight;
      }

      const { default: Globe } = await import("globe.gl");
      if (destroyed) return;

      globe = new (Globe as any)({ animateIn: false })(el);
      globe
        .width(w)
        .height(h)
        .backgroundColor("rgba(0,0,0,0)")
        .globeImageUrl("/earth-night.jpg")
        .bumpImageUrl("/earth-topology.png")
        .atmosphereColor("rgba(250,202,62,0.85)")
        .atmosphereAltitude(0.22)
        .pointsData(POINTS)
        .pointLat("lat")
        .pointLng("lng")
        .pointColor("color")
        .pointAltitude(0.018)
        .pointRadius("size")
        .pointResolution(32)
        .arcsData(ARCS)
        .arcStartLat("startLat")
        .arcStartLng("startLng")
        .arcEndLat("endLat")
        .arcEndLng("endLng")
        .arcColor((d: any) => ARC_COLORS[d.ck] ?? ARC_COLORS.a3)
        .arcAltitude((d: any) => d.alt)
        .arcDashLength(0.50)
        .arcDashGap(0.50)
        .arcDashAnimateTime((d: any) =>
          d.ck === "g1" ? 1600 : d.ck === "g2" ? 2000 : d.ck === "g3" ? 2500 : d.ck === "a1" ? 2800 : 3400
        )
        .arcStroke((d: any) =>
          d.ck === "g1" ? 1.5 : d.ck === "g2" ? 1.1 : d.ck === "g3" ? 0.85 : d.ck === "a1" ? 0.70 : 0.52
        );

      globe.pointOfView({ lat: 26, lng: 116, altitude: 1.78 }, 0);

      const ctrl = globe.controls();
      ctrl.autoRotate = true;
      ctrl.autoRotateSpeed = 0.38;
      ctrl.enableZoom = false;
      ctrl.enablePan = false;
      ctrl.enableRotate = false;
    };

    init();

    const ro = new ResizeObserver(() => {
      if (globe) {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (w && h) { globe.width(w); globe.height(h); }
      }
    });
    ro.observe(el);

    return () => {
      destroyed = true;
      ro.disconnect();
      try { globe?._destructor?.(); } catch {}
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
