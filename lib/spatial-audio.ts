export interface Position {
  x: number;
  y: number;
}

export interface SpatialSettings {
  reverbAmount: number;
  dryWet: number;
  distanceEffect: number;
}

export interface RoomSize {
  w: number;
  h: number;
}

type MicrophoneInput = {
  deviceId?: string;
};

export class SpatialAudioEngine {
  ctx: AudioContext;
  source: AudioBufferSourceNode | null = null;
  microphoneSource: MediaStreamAudioSourceNode | null = null;
  microphoneStream: MediaStream | null = null;
  microphoneRequest: Promise<MediaStream> | null = null;
  buffer: AudioBuffer | null = null;

  gainNode: GainNode;
  panner: StereoPannerNode;
  lowPass: BiquadFilterNode;
  lowShelf: BiquadFilterNode;
  dryGain: GainNode;
  wetGain: GainNode;
  reverbNode: ConvolverNode;
  masterGain: GainNode;
  recordDestination: MediaStreamAudioDestinationNode;

  constructor() {
    this.ctx = new (window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    this.gainNode = this.ctx.createGain();
    this.panner = this.ctx.createStereoPanner();
    this.lowPass = this.ctx.createBiquadFilter();
    this.lowShelf = this.ctx.createBiquadFilter();
    this.dryGain = this.ctx.createGain();
    this.wetGain = this.ctx.createGain();
    this.reverbNode = this.ctx.createConvolver();
    this.masterGain = this.ctx.createGain();
    this.recordDestination = this.ctx.createMediaStreamDestination();

    this.lowPass.type = 'lowpass';
    this.lowShelf.type = 'lowshelf';

    this.lowShelf.connect(this.lowPass);
    this.lowPass.connect(this.panner);
    this.panner.connect(this.gainNode);

    this.gainNode.connect(this.dryGain);
    this.dryGain.connect(this.masterGain);

    this.gainNode.connect(this.wetGain);
    this.wetGain.connect(this.reverbNode);
    this.reverbNode.connect(this.masterGain);

    this.masterGain.connect(this.ctx.destination);
    this.masterGain.connect(this.recordDestination);
    this.createImpulseResponse();
  }

  private createImpulseResponse() {
    const length = this.ctx.sampleRate * 2;
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);

    for (let channelIndex = 0; channelIndex < 2; channelIndex += 1) {
      const channel = impulse.getChannelData(channelIndex);

      for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
        channel[sampleIndex] =
          (Math.random() * 2 - 1) * Math.pow(1 - sampleIndex / length, 3);
      }
    }

    this.reverbNode.buffer = impulse;
  }

  async decodeFile(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
  }

  stopPlayback() {
    if (!this.source) {
      return;
    }

    this.source.stop();
    this.source.disconnect();
    this.source = null;
  }

  disconnectMicrophone(stopTracks = false) {
    if (this.microphoneSource) {
      this.microphoneSource.disconnect();
      this.microphoneSource = null;
    }

    if (stopTracks && this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((track) => track.stop());
      this.microphoneStream = null;
    }
  }

  private hasLiveMicrophoneStream() {
    return Boolean(
      this.microphoneStream?.getAudioTracks().some((track) => track.readyState === 'live')
    );
  }

  private async requestMicrophoneStream(input: MicrophoneInput = {}) {
    if (!this.microphoneRequest) {
      const audioConstraints: MediaStreamConstraints['audio'] = input.deviceId
        ? {
            deviceId: { exact: input.deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        : true;

      this.microphoneRequest = navigator.mediaDevices
        .getUserMedia({ audio: audioConstraints })
        .catch(async (error) => {
          this.microphoneRequest = null;

          if (
            input.deviceId &&
            error instanceof DOMException &&
            (error.name === 'NotReadableError' || error.name === 'OverconstrainedError')
          ) {
            return navigator.mediaDevices.getUserMedia({ audio: true });
          }

          throw error;
        });
    }

    try {
      return await this.microphoneRequest;
    } finally {
      this.microphoneRequest = null;
    }
  }

  async ensureReady() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  async startPlayback(onEnded?: () => void) {
    if (!this.buffer) {
      return;
    }

    await this.ensureReady();
    this.stopPlayback();

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    source.loop = true;
    source.connect(this.lowShelf);
    source.onended = () => {
      if (this.source === source) {
        this.source = null;
      }

      onEnded?.();
    };
    source.start();
    this.source = source;
  }

  async startMicrophoneMonitoring(stream?: MediaStream, input: MicrophoneInput = {}) {
    await this.ensureReady();
    this.stopPlayback();

    if (stream) {
      this.disconnectMicrophone(true);
      this.microphoneStream = stream;
    }

    if (!this.hasLiveMicrophoneStream()) {
      this.disconnectMicrophone(true);
      this.microphoneStream = await this.requestMicrophoneStream(input);
    }

    const microphoneStream = this.microphoneStream;
    if (!microphoneStream) {
      throw new Error('Microphone stream is unavailable');
    }

    this.disconnectMicrophone(false);
    this.microphoneSource = this.ctx.createMediaStreamSource(microphoneStream);
    this.microphoneSource.connect(this.lowShelf);

    return microphoneStream;
  }

  getRecordingStream() {
    return this.recordDestination.stream;
  }

  updateSpatialParams(
    speaker: Position,
    listener: Position,
    settings: SpatialSettings,
    roomSize: RoomSize
  ) {
    const dx = (speaker.x - listener.x) / (roomSize.w / 5);
    const dy = (speaker.y - listener.y) / (roomSize.h / 5);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = Math.sqrt(5 * 5 + 5 * 5);
    const distanceRatio = Math.min(distance / maxDistance, 1);
    const time = this.ctx.currentTime;
    const ramp = 0.05;

    this.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, dx / 2)), time, ramp);

    const attenuation = Math.pow(
      Math.max(0, 1 - distanceRatio),
      1 + settings.distanceEffect * 5
    );
    this.gainNode.gain.setTargetAtTime(attenuation, time, ramp);

    const lowPassFrequency = Math.max(1000, 20000 - distance * 4000);
    this.lowPass.frequency.setTargetAtTime(lowPassFrequency, time, ramp);

    this.lowShelf.frequency.value = 150;
    if (distance < 0.8) {
      this.lowShelf.gain.setTargetAtTime((0.8 - distance) * 12, time, ramp);
    } else {
      this.lowShelf.gain.setTargetAtTime(0, time, ramp);
    }

    const wetMix = Math.min(0.7, settings.reverbAmount * (distance / 4));
    this.wetGain.gain.setTargetAtTime(wetMix, time, ramp);
    this.dryGain.gain.setTargetAtTime(1 - settings.dryWet, time, ramp);
  }

  dispose() {
    this.stopPlayback();
    this.disconnectMicrophone(true);
    void this.ctx.close();
  }
}
