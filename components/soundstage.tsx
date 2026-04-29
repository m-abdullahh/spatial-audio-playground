'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic2, Volume2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Position } from '@/lib/spatial-audio';

interface SoundstageProps {
  speakerPos: Position;
  listenerPos: Position;
  setSpeakerPos: (pos: Position) => void;
  setListenerPos: (pos: Position) => void;
  isPlaying: boolean;
  onRoomSizeChange?: (size: { w: number; h: number }) => void;
}

type DragTarget = 'speaker' | 'listener' | null;

const NODE_SIZE = 56;
const NODE_RADIUS = NODE_SIZE / 2;

export default function Soundstage({
  speakerPos,
  listenerPos,
  setSpeakerPos,
  setListenerPos,
  isPlaying,
  onRoomSizeChange,
}: SoundstageProps) {
  const roomRef = useRef<HTMLDivElement>(null);
  const dragTargetRef = useRef<DragTarget>(null);
  const pointerOffsetRef = useRef({ x: 0, y: 0 });
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const dx = listenerPos.x - speakerPos.x;
    const dy = listenerPos.y - speakerPos.y;
    setDistance(Math.sqrt(dx * dx + dy * dy));
  }, [speakerPos, listenerPos]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || !onRoomSizeChange) {
      return;
    }

    const updateSize = () => {
      const rect = room.getBoundingClientRect();
      onRoomSizeChange({ w: rect.width, h: rect.height });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(room);

    return () => observer.disconnect();
  }, [onRoomSizeChange]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const room = roomRef.current;
      const target = dragTargetRef.current;
      if (!room || !target) {
        return;
      }

      const rect = room.getBoundingClientRect();
      const nextX = clamp(
        event.clientX - rect.left - pointerOffsetRef.current.x + NODE_RADIUS,
        NODE_RADIUS,
        rect.width - NODE_RADIUS
      );
      const nextY = clamp(
        event.clientY - rect.top - pointerOffsetRef.current.y + NODE_RADIUS,
        NODE_RADIUS,
        rect.height - NODE_RADIUS
      );

      if (target === 'speaker') {
        setSpeakerPos({ x: nextX, y: nextY });
      } else {
        setListenerPos({ x: nextX, y: nextY });
      }
    };

    const stopDragging = () => {
      dragTargetRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, [setListenerPos, setSpeakerPos]);

  const startDragging =
    (target: Exclude<DragTarget, null>, position: Position) =>
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const room = roomRef.current;
      if (!room) {
        return;
      }

      const roomRect = room.getBoundingClientRect();
      const left = position.x - NODE_RADIUS;
      const top = position.y - NODE_RADIUS;

      pointerOffsetRef.current = {
        x: event.clientX - roomRect.left - left,
        y: event.clientY - roomRect.top - top,
      };
      dragTargetRef.current = target;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

  return (
    <Card className="overflow-hidden border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="text-lg font-semibold">Soundstage</h2>
          <p className="text-xs text-muted-foreground">
            Drag the speaker and microphone to hear the spatial field change live.
          </p>
        </div>
        <div className="text-right">
          {isPlaying && (
            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Live
            </div>
          )}
          <div className="mt-1 text-xs font-mono text-muted-foreground">
            Distance: {distance.toFixed(0)}px
          </div>
        </div>
      </div>

      <div className="p-4">
        <div
          ref={roomRef}
          className="relative aspect-[16/9] min-h-[320px] w-full overflow-hidden rounded-2xl border border-border bg-[#141414]"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />
          <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">
            Spatial field
          </div>
          <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">
            Direct manipulation
          </div>

          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <line
              x1={speakerPos.x}
              y1={speakerPos.y}
              x2={listenerPos.x}
              y2={listenerPos.y}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="2"
              strokeDasharray="8 8"
            />
            <circle
              cx={speakerPos.x}
              cy={speakerPos.y}
              r="72"
              fill="rgba(255,255,255,0.03)"
              stroke="rgba(255,255,255,0.08)"
            />
          </svg>

          <Node
            icon={<Volume2 className="h-5 w-5" />}
            label="Speaker"
            position={speakerPos}
            tone="speaker"
            onPointerDown={startDragging('speaker', speakerPos)}
          />

          <Node
            icon={<Mic2 className="h-5 w-5" />}
            label="Microphone"
            position={listenerPos}
            tone="listener"
            onPointerDown={startDragging('listener', listenerPos)}
          />
        </div>
      </div>
    </Card>
  );
}

function Node({
  icon,
  label,
  position,
  tone,
  onPointerDown,
}: {
  icon: React.ReactNode;
  label: string;
  position: Position;
  tone: 'speaker' | 'listener';
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      className="absolute touch-none cursor-grab active:cursor-grabbing"
      style={{
        left: position.x - NODE_RADIUS,
        top: position.y - NODE_RADIUS,
      }}
      aria-label={`Move ${label.toLowerCase()}`}
    >
      <div className="flex flex-col items-center gap-2">
        <div
          className={
            tone === 'speaker'
              ? 'flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d79962] text-[#171717] shadow-lg shadow-black/30'
              : 'flex h-14 w-14 items-center justify-center rounded-full bg-[#82b7ea] text-[#0f1720] shadow-lg shadow-black/30'
          }
        >
          {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/60">
          {label}
        </span>
      </div>
    </button>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
