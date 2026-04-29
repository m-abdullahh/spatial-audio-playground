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
  sourceMode: 'file' | 'microphone';
  isRecording: boolean;
  isMicReady: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  recordedAudioUrl: string | null;
  recordedAudioName: string;
  microphoneDevices: Array<{
    deviceId: string;
    label: string;
  }>;
  selectedMicrophoneId: string;
  onMicrophoneDeviceChange: (deviceId: string) => void;
  onRefreshMicrophoneDevices: () => void;
}

export default function ControlPanel({
  reverbAmount,
  setReverbAmount,
  dryWet,
  setDryWet,
  distanceEffect,
  setDistanceEffect,
  sourceMode,
  isRecording,
  isMicReady,
  onStartRecording,
  onStopRecording,
  recordedAudioUrl,
  recordedAudioName,
  microphoneDevices,
  selectedMicrophoneId,
  onMicrophoneDeviceChange,
  onRefreshMicrophoneDevices,
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

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">
              Microphone Recording
            </label>
            <span className="text-xs font-mono text-foreground">
              {isRecording ? 'Recording' : isMicReady ? 'Ready' : 'Idle'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            In microphone mode you can monitor your voice through the spatial chain first, then record the processed output exactly as configured.
          </p>
          <div className="mb-3 space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="microphone-input">
              Input Device
            </label>
            <select
              id="microphone-input"
              value={selectedMicrophoneId}
              onChange={(event) => onMicrophoneDeviceChange(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
            >
              <option value="default">System default microphone</option>
              {microphoneDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onRefreshMicrophoneDevices}
              className="text-xs font-medium text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
            >
              Refresh microphone list
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={isRecording ? onStopRecording : onStartRecording}
              disabled={sourceMode !== 'microphone' && !isRecording}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            <a
              href={recordedAudioUrl ?? undefined}
              download={recordedAudioName}
              aria-disabled={!recordedAudioUrl}
              className={`inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition ${
                recordedAudioUrl
                  ? 'text-foreground hover:bg-muted'
                  : 'pointer-events-none opacity-50 text-muted-foreground'
              }`}
            >
              Download Last Recording
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}
