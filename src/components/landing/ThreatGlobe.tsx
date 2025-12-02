"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

type ThreatEvent = {
  id: string;
  ts: string;
  source: "urlhaus";
  indicator: string;
  family?: string;
  status?: string;
  confidence?: number;
  cve?: string[];
  kev?: boolean;
  geo?: { lat: number; lon: number; country?: string };
  severity: "low" | "med" | "high" | "critical";
};

type Point = {
  id: string;
  lat: number;
  lon: number;
  intensity: number;
  color: THREE.Color;
  createdAt: number;
  label: string;
};

const EARTH_RADIUS = 1.2;
const MAX_POINTS = 1500;
const DECAY_MS = 90_000;

function latLonToVec3(lat: number, lon: number, radius = EARTH_RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function severityColor(sev: ThreatEvent["severity"]) {
  const c = new THREE.Color();
  if (sev === "critical") return c.set("#FF006E");
  if (sev === "high") return c.set("#00D9FF");
  if (sev === "med") return c.set("#06FFA5");
  return c.set("#FFB800");
}

function useThreatStream() {
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  
  useEffect(() => {
    // Fetch from OSINT backend
    const fetchThreats = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
        const response = await fetch(`${backendUrl}/osint/threats/map?limit=200`, {
          cache: 'no-store',
        });
        
        if (response.ok) {
          const data = await response.json();
          const osintEvents: ThreatEvent[] = (data.data || [])
            .filter((t: any) => t.latitude && t.longitude)
            .map((t: any) => ({
              id: t.external_id,
              ts: t.last_seen,
              source: t.source,
              indicator: t.value,
              family: t.indicator_type,
              status: t.status,
              confidence: t.risk_score / 100,
              severity: t.severity as any,
              geo: {
                lat: t.latitude,
                lon: t.longitude,
                country: t.country_code,
              },
              kev: t.risk_score >= 80,
            }));
          setEvents(osintEvents);
        }
      } catch (error) {
        console.error('Failed to fetch OSINT threats:', error);
      }
    };

    fetchThreats();
    const interval = setInterval(fetchThreats, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, []);
  
  return events;
}

function PointsLayer({ events }: { events: ThreatEvent[] }) {
  const instRef = useRef<THREE.InstancedMesh>(null!);
  const [dummy] = useState(() => new THREE.Object3D());

  const points = useMemo<Point[]>(() => {
    const now = Date.now();
    const pts: Point[] = events
      .slice(-MAX_POINTS)
      .reverse()
      .map((e) => {
        const intensity = e.severity === "critical" ? 1
          : e.severity === "high" ? 0.8
          : e.severity === "med" ? 0.55
          : 0.35;
        return {
          id: e.id,
          lat: e.geo!.lat,
          lon: e.geo!.lon,
          intensity,
          color: severityColor(e.severity),
          createdAt: new Date(e.ts).getTime() || now,
          label: `${e.source.toUpperCase()} • ${e.family ?? "Unknown"}${e.kev ? " • KEV" : ""}`,
        };
      });
    return pts;
  }, [events]);

  useEffect(() => {
    if (!instRef.current || points.length === 0) return;
    const n = points.length;
    const colors = new Float32Array(n * 3);
    points.forEach((p, i) => {
      colors[i * 3 + 0] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
    });
    const attr = new THREE.InstancedBufferAttribute(colors, 3);
    (instRef.current.geometry as any).setAttribute("color", attr);
  }, [points]);

  useFrame(() => {
    if (!instRef.current || points.length === 0) return;
    const n = points.length;
    const now = Date.now();
    for (let i = 0; i < n; i++) {
      const p = points[i];
      const age = now - p.createdAt;
      const t = Math.max(0, 1 - age / DECAY_MS);
      const pos = latLonToVec3(p.lat, p.lon, EARTH_RADIUS + 0.02 + 0.08 * p.intensity * t);
      dummy.position.copy(pos);
      const s = 0.008 + 0.03 * p.intensity * t;
      dummy.scale.setScalar(s);
      dummy.lookAt(new THREE.Vector3(0, 0, 0));
      dummy.updateMatrix();
      instRef.current.setMatrixAt(i, dummy.matrix);
    }
    instRef.current.instanceMatrix.needsUpdate = true;
  });

  if (points.length === 0) return null;

  return (
    <instancedMesh ref={instRef} args={[undefined as any, undefined as any, points.length]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial vertexColors transparent opacity={0.95} />
    </instancedMesh>
  );
}

function Earth() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color={"#0B1222"}
          metalness={0.2}
          roughness={0.9}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS + 0.02, 64, 64]} />
        <meshBasicMaterial
          color={"#00D9FF"}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

export function ThreatGlobe() {
  const events = useThreatStream();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="relative aspect-square w-full rounded-2xl bg-slate-900/40 border border-slate-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Initializing Globe...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative aspect-square w-full rounded-2xl bg-slate-900/40 border border-slate-700">
      <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 2, 2]} intensity={1.2} />
        <Earth />
        <PointsLayer events={events} />
      </Canvas>

      <div className="absolute top-3 left-3 text-xs text-slate-300 bg-slate-900/70 rounded-md border border-slate-700 px-3 py-2 space-x-3">
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:"#FF006E"}} />Critical</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:"#00D9FF"}} />High</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:"#06FFA5"}} />Med</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:"#FFB800"}} />Low</span>
      </div>
    </div>
  );
}

export default ThreatGlobe;
