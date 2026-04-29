'use client';

import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

interface ControlPanelProps {
  reverbAmount: number;
  setReverbAmount: (value: number) => void;
  dryWet: number;
  setDryWet: (value: number) => void;
  distanceEffect: number;
  setDistanceEffect: (value: number) => void;
}

export default function ControlPanel({
  reverbAmount,
  setReverbAmount,
  dryWet,
  setDryWet,
  distanceEffect,
  setDistanceEffect,
}: ControlPanelProps) {
  return (
    <Card className="bg-card border-border p-4">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Spatial Controls</h3>
      
      <div className="space-y-4">
        {/* Room Reverb */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">
              Room Reverb
            </label>
            <span className="text-xs font-mono text-foreground">
              {(reverbAmount * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[reverbAmount]}
            onValueChange={([value]) => setReverbAmount(value)}
            min={0}
            max={1}
            step={0.01}
            className="w-full"
          />
        </div>

        {/* Dry / Wet Mix */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">
              Dry / Wet Mix
            </label>
            <span className="text-xs font-mono text-foreground">
              {dryWet < 0.5 ? 'Dry' : dryWet > 0.5 ? 'Wet' : 'Mid'}
            </span>
          </div>
          <Slider
            value={[dryWet]}
            onValueChange={([value]) => setDryWet(value)}
            min={0}
            max={1}
            step={0.01}
            className="w-full"
          />
        </div>

        {/* Distance Intensity */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">
              Distance Intensity
            </label>
            <span className="text-xs font-mono text-foreground">
              {(distanceEffect * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[distanceEffect]}
            onValueChange={([value]) => setDistanceEffect(value)}
            min={0}
            max={3}
            step={0.01}
            className="w-full"
          />
        </div>
      </div>
    </Card>
  );
}
