'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useStories } from '@/hooks/useStories';

interface StoryRecorderProps {
  onClose: () => void;
  onPublished?: () => void;
}

const RECORD_DURATION = 20; // seconds

export default function StoryRecorder({ onClose, onPublished }: StoryRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<'camera' | 'preview' | 'uploading'>('camera');
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(RECORD_DURATION);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);

  const { createStory } = useStories();

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startStream = useCallback(async (deviceId?: string) => {
    const constraints: MediaStreamConstraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }
        : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
      audio: true,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, []);

  // Start camera on mount and enumerate devices
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        // First start with default back camera to get permission
        await startStream();

        if (!active) {
          stopCamera();
          return;
        }

        // Enumerate devices after permission is granted
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        if (!active) return;

        setCameras(videoDevices);

        // Find the first back-facing camera by label heuristic
        const backIndex = videoDevices.findIndex((d) =>
          /back|rear|environment|arrière|principal/i.test(d.label)
        );
        const initialIndex = backIndex >= 0 ? backIndex : 0;
        setSelectedCameraIndex(initialIndex);

        // Switch to the identified back camera if it differs from current stream
        if (videoDevices[initialIndex]?.deviceId) {
          stopCamera();
          await startStream(videoDevices[initialIndex].deviceId);
        }
      } catch {
        if (active) {
          setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
        }
      }
    })();

    return () => {
      active = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1 || recording) return;
    const nextIndex = (selectedCameraIndex + 1) % cameras.length;
    setSelectedCameraIndex(nextIndex);
    stopCamera();
    try {
      await startStream(cameras[nextIndex].deviceId);
    } catch {
      setError('Impossible de changer de caméra.');
    }
  }, [cameras, selectedCameraIndex, recording, startStream]);

  const getSupportedMimeType = () => {
    const candidates = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
  };

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType
        ? { mimeType, videoBitsPerSecond: 4_000_000 }
        : { videoBitsPerSecond: 4_000_000 }
    );
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPhase('preview');
      stopCamera();
    };

    recorder.start(100); // collect chunks every 100ms
    setRecording(true);
    setCountdown(RECORD_DURATION);

    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 1;
      setCountdown(RECORD_DURATION - elapsed);
      if (elapsed >= RECORD_DURATION) {
        stopRecording();
      }
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const handleDiscard = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRecordedBlob(null);
    setPhase('camera');

    // Restart camera with the currently selected camera
    const deviceId = cameras[selectedCameraIndex]?.deviceId;
    startStream(deviceId).catch(() => setError('Impossible de relancer la caméra.'));
  };

  const handlePublish = async () => {
    if (!recordedBlob) return;
    setPhase('uploading');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      await createStory(
        recordedBlob,
        { latitude: position.coords.latitude, longitude: position.coords.longitude },
        undefined
      );

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      onPublished?.();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la publication.');
      setPhase('preview');
    }
  };

  const handleClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    stopCamera();
    onClose();
  };

  // Progress ring for countdown
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = recording ? ((RECORD_DURATION - countdown) / RECORD_DURATION) * circumference : 0;

  // Friendly camera label from device.label
  const currentCameraLabel = cameras[selectedCameraIndex]?.label
    ? cameras[selectedCameraIndex].label.replace(/\s*\(.*?\)\s*/g, '').trim()
    : '';

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-safe-top top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white"
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Error message */}
      {error && (
        <div className="absolute top-16 left-4 right-4 z-10 bg-red-600/90 text-white text-sm px-4 py-2 rounded-xl text-center">
          {error}
        </div>
      )}

      {/* Camera view */}
      {phase === 'camera' && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Camera switch button — top-left */}
          {cameras.length > 1 && (
            <div
              className="absolute z-10 flex flex-col items-center gap-1"
              style={{ top: 'max(1rem, env(safe-area-inset-top))', left: '1rem' }}
            >
              <button
                onClick={switchCamera}
                disabled={recording}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: recording ? 'not-allowed' : 'pointer',
                  opacity: recording ? 0.4 : 1,
                }}
              >
                {/* Flip / rotate camera icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
                  <circle cx="12" cy="13" r="3" />
                  <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="m16 2 2 2-2 2" />
                </svg>
              </button>
              {currentCameraLabel ? (
                <span style={{ color: 'white', fontSize: 10, textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.8)', maxWidth: 64, lineHeight: 1.2 }}>
                  {currentCameraLabel}
                </span>
              ) : null}
            </div>
          )}

          {/* Recording indicator */}
          {recording && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-sm font-semibold tabular-nums">{countdown}s</span>
            </div>
          )}

          {/* Record button */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-12" style={{ paddingBottom: 'max(3rem, calc(env(safe-area-inset-bottom) + 1.5rem))' }}>
            <button
              onPointerDown={startRecording}
              disabled={recording || !!error}
              className="relative flex items-center justify-center focus:outline-none"
            >
              {/* Progress ring */}
              <svg width="80" height="80" className="absolute -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="4"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                />
              </svg>
              {/* Inner circle */}
              <div
                className={`w-14 h-14 rounded-full transition-all duration-150 ${
                  recording ? 'bg-red-500 scale-90' : 'bg-white'
                }`}
              />
            </button>
          </div>
        </>
      )}

      {/* Preview view */}
      {phase === 'preview' && previewUrl && (
        <>
          <video
            src={previewUrl}
            autoPlay
            playsInline
            loop
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute bottom-0 left-0 right-0 flex gap-4 px-8 pb-10"
            style={{ paddingBottom: 'max(2.5rem, calc(env(safe-area-inset-bottom) + 1rem))' }}
          >
            <button
              onClick={handleDiscard}
              className="flex-1 py-3 rounded-2xl border border-white/60 text-white font-semibold text-base backdrop-blur-sm bg-black/30"
            >
              Annuler
            </button>
            <button
              onClick={handlePublish}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-base shadow-lg"
            >
              Publier
            </button>
          </div>
        </>
      )}

      {/* Uploading view */}
      {phase === 'uploading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white text-base font-medium">Publication en cours…</p>
        </div>
      )}
    </div>
  );
}
