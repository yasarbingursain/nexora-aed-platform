"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Shield, Zap, Globe as GlobeIcon } from 'lucide-react';

interface ThreatNode {
  id: string;
  lat: number;
  lng: number;
  type: 'attack' | 'defense' | 'entity';
  severity: 'critical' | 'high' | 'medium' | 'low';
  label: string;
}

interface ThreatVector {
  id: string;
  from: ThreatNode;
  to: ThreatNode;
  progress: number;
  blocked: boolean;
}

export const HeroGlobe: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [threats, setThreats] = useState<ThreatVector[]>([]);
  const [nodes, setNodes] = useState<ThreatNode[]>([]);
  const [blockedCount, setBlockedCount] = useState(0);
  const [activeThreats, setActiveThreats] = useState(0);
  const animationRef = useRef<number>();

  // Generate realistic threat nodes
  useEffect(() => {
    const generateNodes = (): ThreatNode[] => {
      const locations = [
        { lat: 37.7749, lng: -122.4194, label: 'San Francisco', type: 'entity' as const },
        { lat: 40.7128, lng: -74.0060, label: 'New York', type: 'entity' as const },
        { lat: 51.5074, lng: -0.1278, label: 'London', type: 'defense' as const },
        { lat: 35.6762, lng: 139.6503, label: 'Tokyo', type: 'entity' as const },
        { lat: 1.3521, lng: 103.8198, label: 'Singapore', type: 'defense' as const },
        { lat: -33.8688, lng: 151.2093, label: 'Sydney', type: 'entity' as const },
        { lat: 52.5200, lng: 13.4050, label: 'Berlin', type: 'defense' as const },
        { lat: 55.7558, lng: 37.6173, label: 'Moscow', type: 'attack' as const },
        { lat: 39.9042, lng: 116.4074, label: 'Beijing', type: 'attack' as const },
        { lat: 19.0760, lng: 72.8777, label: 'Mumbai', type: 'entity' as const },
      ];

      return locations.map((loc, idx) => ({
        id: `node-${idx}`,
        ...loc,
        severity: ['critical', 'high', 'medium', 'low'][Math.floor(Math.random() * 4)] as any,
      }));
    };

    setNodes(generateNodes());
  }, []);

  // Simulate threat vectors
  useEffect(() => {
    const interval = setInterval(() => {
      if (nodes.length < 2) return;

      const attackNodes = nodes.filter(n => n.type === 'attack');
      const targetNodes = nodes.filter(n => n.type === 'entity');

      if (attackNodes.length > 0 && targetNodes.length > 0) {
        const from = attackNodes[Math.floor(Math.random() * attackNodes.length)];
        const to = targetNodes[Math.floor(Math.random() * targetNodes.length)];

        const newThreat: ThreatVector = {
          id: `threat-${Date.now()}`,
          from,
          to,
          progress: 0,
          blocked: Math.random() > 0.3, // 70% blocked by Nexora
        };

        setThreats(prev => [...prev.slice(-5), newThreat]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [nodes]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.fillStyle = 'rgba(10, 14, 26, 0.1)';
      ctx.fillRect(0, 0, width, height);

      // Draw globe outline
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.35;

      // Globe glow
      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.2);
      gradient.addColorStop(0, 'rgba(0, 217, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 217, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Globe circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 217, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw latitude/longitude lines
      ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)';
      ctx.lineWidth = 1;

      // Latitude lines
      for (let i = -60; i <= 60; i += 30) {
        const y = centerY + (i / 90) * radius;
        const lineRadius = Math.sqrt(radius * radius - ((i / 90) * radius) ** 2);
        
        ctx.beginPath();
        ctx.ellipse(centerX, y, lineRadius, lineRadius * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Longitude lines
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + rotation;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radius * Math.abs(Math.cos(angle)), radius, Math.PI / 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Project 3D coordinates to 2D
      const project = (lat: number, lng: number) => {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + rotation * (180 / Math.PI)) * (Math.PI / 180);

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        // Simple perspective projection
        const scale = 1 / (1 + z / (radius * 2));
        
        return {
          x: centerX + x * scale,
          y: centerY - y * scale,
          visible: z > -radius * 0.3, // Only show front hemisphere
          scale,
        };
      };

      // Draw nodes
      nodes.forEach(node => {
        const pos = project(node.lat, node.lng);
        if (!pos.visible) return;

        const size = 6 * pos.scale;

        // Node glow
        const nodeGradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size * 3);
        const color = node.type === 'attack' ? '255, 0, 110' : 
                     node.type === 'defense' ? '6, 255, 165' : 
                     '0, 217, 255';
        
        nodeGradient.addColorStop(0, `rgba(${color}, 0.6)`);
        nodeGradient.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = nodeGradient;
        ctx.fillRect(pos.x - size * 3, pos.y - size * 3, size * 6, size * 6);

        // Node dot
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${color})`;
        ctx.fill();

        // Pulse effect for defense nodes
        if (node.type === 'defense') {
          const pulseSize = size + Math.sin(Date.now() / 200) * 3;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pulseSize, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${color}, 0.5)`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw threat vectors
      threats.forEach(threat => {
        const fromPos = project(threat.from.lat, threat.from.lng);
        const toPos = project(threat.to.lat, threat.to.lng);

        if (!fromPos.visible && !toPos.visible) return;

        // Animate progress
        threat.progress += 0.01;
        if (threat.progress > 1) {
          threat.progress = 1;
        }

        // Draw arc between points
        const progress = threat.progress;
        const midX = fromPos.x + (toPos.x - fromPos.x) * progress;
        const midY = fromPos.y + (toPos.y - fromPos.y) * progress;

        // Arc height based on distance
        const distance = Math.sqrt((toPos.x - fromPos.x) ** 2 + (toPos.y - fromPos.y) ** 2);
        const arcHeight = distance * 0.2;
        const currentY = midY - Math.sin(progress * Math.PI) * arcHeight;

        // Draw line
        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        
        // Quadratic curve for arc
        const controlY = (fromPos.y + toPos.y) / 2 - arcHeight;
        ctx.quadraticCurveTo(
          (fromPos.x + toPos.x) / 2,
          controlY,
          midX,
          currentY
        );

        ctx.strokeStyle = threat.blocked ? 
          'rgba(6, 255, 165, 0.6)' : // Green for blocked
          'rgba(255, 0, 110, 0.6)';  // Red for active threat
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw moving particle
        ctx.beginPath();
        ctx.arc(midX, currentY, 4, 0, Math.PI * 2);
        ctx.fillStyle = threat.blocked ? 'rgb(6, 255, 165)' : 'rgb(255, 0, 110)';
        ctx.fill();

        // Shield icon for blocked threats
        if (threat.blocked && progress > 0.5) {
          ctx.save();
          ctx.translate(toPos.x, toPos.y);
          
          // Draw shield
          ctx.beginPath();
          ctx.moveTo(0, -15);
          ctx.lineTo(-10, -5);
          ctx.lineTo(-10, 5);
          ctx.lineTo(0, 15);
          ctx.lineTo(10, 5);
          ctx.lineTo(10, -5);
          ctx.closePath();
          
          ctx.fillStyle = 'rgba(6, 255, 165, 0.3)';
          ctx.fill();
          ctx.strokeStyle = 'rgb(6, 255, 165)';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.restore();
        }
      });

      // Update rotation
      setRotation(prev => prev + 0.002);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [rotation, nodes, threats]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'crisp-edges' }}
        role="img"
        aria-label={`Interactive threat visualization showing ${threats.filter(t => t.blocked).length} blocked threats out of ${threats.length} total threats detected across ${nodes.length} global locations`}
      />
      
      {/* Live stats overlay */}
      <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end" role="region" aria-label="Live threat statistics">
        <div className="bg-nexora-darker/80 backdrop-blur-xl border border-nexora-border/30 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">Live Threat Detection</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {threats.filter(t => t.blocked).length}/{threats.length}
          </div>
          <div className="text-xs text-muted-foreground">Threats Blocked</div>
        </div>

        <div className="bg-nexora-darker/80 backdrop-blur-xl border border-nexora-border/30 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-4 h-4 text-nexora-ai" />
            <span className="text-sm text-muted-foreground">Active Defense</span>
          </div>
          <div className="text-2xl font-bold text-nexora-ai">
            {nodes.filter(n => n.type === 'defense').length}
          </div>
          <div className="text-xs text-muted-foreground">Defense Nodes</div>
        </div>

        <div className="bg-nexora-darker/80 backdrop-blur-xl border border-nexora-border/30 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-4 h-4 text-nexora-warning" />
            <span className="text-sm text-muted-foreground">Response Time</span>
          </div>
          <div className="text-2xl font-bold text-nexora-warning">
            &lt;3s
          </div>
          <div className="text-xs text-muted-foreground">Average</div>
        </div>
      </div>
    </div>
  );
};
