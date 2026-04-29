'use client';

import { Card } from '@/components/ui/card';
import type { Position } from '@/lib/spatial-audio';

interface AnalyticsProps {
  speakerPos: Position;
  listenerPos: Position;
  reverbAmount: number;
  dryWet: number;
  distanceEffect: number;
}

export default function Analytics({
  speakerPos,
  listenerPos,
  reverbAmount,
  dryWet,
  distanceEffect,
}: AnalyticsProps) {
  // Calculate derived metrics
  const dx = speakerPos.x - listenerPos.x;
  const dy = speakerPos.y - listenerPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Pan calculation (X distance normalized to -100 to +100)
  const maxPan = 200;
  const pan = Math.max(-100, Math.min(100, (dx / maxPan) * 100));
  
  // Proximity effect (closer = more bass boost)
  const minProximity = 50;
  const maxProximity = 300;
  const proximityPercent = Math.max(0, Math.min(100, 100 - ((distance - minProximity) / (maxProximity - minProximity)) * 100));
  
  // Attenuation (further = more loss)
  const maxDistance = 620;
  const distanceRatio = Math.min(distance / maxDistance, 1);
  const attenuation = Math.pow(Math.max(0, 1 - distanceRatio), 1 + distanceEffect * 5) * 100;
  const lowPassEstimate = Math.max(1000, 20000 - ((distance / 100) * 4000));

  // Zone detection
  const getZone = () => {
    if (dx > 100 && dy < -50) return 'Front Right';
    if (dx < -100 && dy < -50) return 'Front Left';
    if (dx > 100 && dy > 50) return 'Rear Right';
    if (dx < -100 && dy > 50) return 'Rear Left';
    if (Math.abs(dx) < 100 && dy < -50) return 'Front Center';
    if (Math.abs(dx) < 100 && dy > 50) return 'Rear Center';
    if (dx > 100 && Math.abs(dy) < 50) return 'Right';
    if (dx < -100 && Math.abs(dy) < 50) return 'Left';
    return 'Center';
  };

  const Metric = ({ label, value, unit = '' }: { label: string; value: string | number; unit?: string }) => (
    <div className="flex items-center justify-between py-2 px-3 rounded-sm bg-muted/30">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-mono text-foreground">
        {value}{unit}
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Position Metrics */}
      <Card className="bg-card border-border p-4">
        <h3 className="text-sm font-semibold mb-3 text-foreground">Position</h3>
        <div className="space-y-1">
          <Metric label="Pan" value={pan.toFixed(0)} unit="%" />
          <Metric label="Distance" value={distance.toFixed(0)} unit="px" />
          <Metric label="Zone" value={getZone()} />
        </div>
      </Card>

      {/* DSP Metrics */}
      <Card className="bg-card border-border p-4">
        <h3 className="text-sm font-semibold mb-3 text-foreground">DSP Status</h3>
        <div className="space-y-1">
          <Metric label="Attenuation" value={attenuation.toFixed(0)} unit="%" />
          <Metric label="Proximity" value={proximityPercent.toFixed(0)} unit="%" />
          <Metric label="Reverb Mix" value={(reverbAmount * 100).toFixed(0)} unit="%" />
          <Metric label="Dry Signal" value={((1 - dryWet) * 100).toFixed(0)} unit="%" />
          <Metric label="Distance Drive" value={(distanceEffect * 100).toFixed(0)} unit="%" />
          <Metric label="LPF Estimate" value={(lowPassEstimate / 1000).toFixed(1)} unit="kHz" />
        </div>
      </Card>

      {/* Info */}
      <Card className="bg-card border-border p-4">
        <h3 className="text-xs font-semibold mb-2 text-foreground uppercase tracking-wide">
          How It Works
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          X distance drives stereo panning. Overall distance causes gain reduction, low-pass filtering, and increased reverb. Very close distances boost bass (proximity effect).
        </p>
      </Card>
    </div>
  );
}
