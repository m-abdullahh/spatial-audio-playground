'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Mic, Pause, Play, Square, Upload } from 'lucide-react';
import Soundstage from '@/components/soundstage';
import ControlPanel from '@/components/control-panel';
import Analytics from '@/components/analytics';
import { SpatialAudioEngine, type Position } from '@/lib/spatial-audio';

export default function Home() {
  const [sourceMode, setSourceMode] = useState<'file' | 'microphone'>('file');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMicReady, setIsMicReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioName, setRecordedAudioName] = useState<string>('spatial-microphone-recording.webm');
  const [reverbAmount, setReverbAmount] = useState(0.3);
  const [dryWet, setDryWet] = useState(0.5);
  const [distanceEffect, setDistanceEffect] = useState(1.2);
  const [speakerPos, setSpeakerPos] = useState<Position>({ x: 390, y: 175 });
  const [listenerPos, setListenerPos] = useState<Position>({ x: 260, y: 175 });
  const [roomSize, setRoomSize] = useState({ w: 520, h: 350 });
  const engineRef = useRef<SpatialAudioEngine | null>(null);
  const positionsInitializedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    engineRef.current = new SpatialAudioEngine();

    return () => {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [recordedAudioUrl]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    engine.updateSpatialParams(
      speakerPos,
      listenerPos,
      { reverbAmount, dryWet, distanceEffect },
      roomSize
    );
  }, [speakerPos, listenerPos, reverbAmount, dryWet, distanceEffect, roomSize]);

  useEffect(() => {
    if (positionsInitializedRef.current || roomSize.w <= 0 || roomSize.h <= 0) {
      return;
    }

    setListenerPos({
      x: roomSize.w * 0.5,
      y: roomSize.h * 0.5,
    });
    setSpeakerPos({
      x: roomSize.w * 0.75,
      y: roomSize.h * 0.5,
    });
    positionsInitializedRef.current = true;
  }, [roomSize]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const engine = engineRef.current;
    if (!file || !engine) return;

    if (sourceMode === 'microphone') {
      stopRecording();
      engine.disconnectMicrophone(true);
      setIsMicReady(false);
    }

    setSourceMode('file');
    setAudioFile(file);

    try {
      await engine.decodeFile(file);
      await engine.startPlayback(() => setIsPlaying(false));
      setIsPlaying(true);
    } catch (error) {
      console.error('Error decoding audio:', error);
      setIsPlaying(false);
    }
  };

  const togglePlayback = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    if (sourceMode === 'microphone') {
      if (isMicReady) {
        stopRecording();
        engine.disconnectMicrophone(true);
        setIsMicReady(false);
        setIsPlaying(false);
      } else {
        await enableMicrophoneMonitoring();
      }
      return;
    }

    if (!engine.buffer) return;

    if (isPlaying) {
      engine.stopPlayback();
      setIsPlaying(false);
    } else {
      await engine.startPlayback(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const enableMicrophoneMonitoring = async () => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    try {
      if (audioFile && isPlaying) {
        engine.stopPlayback();
      }
      await engine.startMicrophoneMonitoring();
      setSourceMode('microphone');
      setIsMicReady(true);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error enabling microphone:', error);
      setIsMicReady(false);
      setIsPlaying(false);
    }
  };

  const startRecording = async () => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    if (!isMicReady) {
      await enableMicrophoneMonitoring();
    }

    if (!engine.getRecordingStream()) {
      return;
    }

    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }

    recordedChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    const recorder = new MediaRecorder(engine.getRecordingStream(), { mimeType });
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      if (recordedChunksRef.current.length === 0) {
        return;
      }

      const extension = mimeType.includes('webm') ? 'webm' : 'dat';
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedAudioUrl(url);
      setRecordedAudioName(`spatial-microphone-recording-${Date.now()}.${extension}`);
      recordedChunksRef.current = [];
      mediaRecorderRef.current = null;
    };
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Spatial Audio Playground</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Position a speaker and microphone in a 2D room to hear spatial audio effects in realtime
              </p>
            </div>
            <div className="flex gap-3">
              <label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {audioFile ? 'Replace Audio' : 'Upload Audio'}
                  </span>
                </Button>
              </label>
              <Button
                variant={sourceMode === 'microphone' ? 'default' : 'outline'}
                onClick={enableMicrophoneMonitoring}
                className="flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                {isMicReady ? 'Microphone Live' : 'Use Microphone'}
              </Button>
              <Button
                onClick={togglePlayback}
                disabled={sourceMode === 'file' ? !audioFile : false}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {sourceMode === 'microphone' ? (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    {isMicReady ? 'Stop Monitor' : 'Monitor'}
                  </>
                ) : (
                  isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Play
                    </>
                  )
                )}
              </Button>
            </div>
          </div>
          {sourceMode === 'file' && audioFile && (
            <p className="text-xs text-muted-foreground">
              Loaded: <span className="font-mono text-foreground">{audioFile.name}</span>
            </p>
          )}
          {sourceMode === 'microphone' && (
            <p className="text-xs text-muted-foreground">
              Monitor yourself first, set the room and mic position, then record the processed output. Headphones recommended.
            </p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Soundstage */}
          <div className="lg:col-span-3">
            <Soundstage
              speakerPos={speakerPos}
              listenerPos={listenerPos}
              setSpeakerPos={setSpeakerPos}
              setListenerPos={setListenerPos}
              isPlaying={isPlaying}
              onRoomSizeChange={setRoomSize}
            />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Controls */}
            <ControlPanel
              reverbAmount={reverbAmount}
              setReverbAmount={setReverbAmount}
              dryWet={dryWet}
              setDryWet={setDryWet}
              distanceEffect={distanceEffect}
              setDistanceEffect={setDistanceEffect}
              sourceMode={sourceMode}
              isRecording={isRecording}
              isMicReady={isMicReady}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              recordedAudioUrl={recordedAudioUrl}
              recordedAudioName={recordedAudioName}
            />

            {/* Analytics */}
            <Analytics
              speakerPos={speakerPos}
              listenerPos={listenerPos}
              reverbAmount={reverbAmount}
              dryWet={dryWet}
              distanceEffect={distanceEffect}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
