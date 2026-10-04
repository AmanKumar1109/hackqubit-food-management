import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ScanLine,
  SwitchCamera
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// Module-level camera cache for instant re-opening (zero-second delay on subsequent scans)
let cachedBestCameraId = null;
let cachedCameraList = [];

// Pre-query cameras silently in background if supported
if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
  Html5Qrcode.getCameras()
    .then((devices) => {
      if (devices && devices.length > 0) {
        cachedCameraList = devices;
        const rear = devices.find((d) => /back|rear|environment/i.test(d.label));
        cachedBestCameraId = rear ? rear.id : devices[0].id;
      }
    })
    .catch(() => {});
}

export const QrScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
  const [mode, setMode] = useState('camera'); // 'camera' | 'upload'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameras, setCameras] = useState(cachedCameraList);
  const [selectedCameraId, setSelectedCameraId] = useState(cachedBestCameraId || '');
  const [scanError, setScanError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoObserverTimerRef = useRef(null);
  const scannerContainerId = 'qr-reader-target';

  // Instant Camera Start: starts camera stream immediately on modal open
  useEffect(() => {
    if (!isOpen || mode !== 'camera') {
      stopCamera();
      return;
    }

    let isMounted = true;
    setScanError('');

    // Start instantly on next animation frame (0 delay)
    const frameId = requestAnimationFrame(() => {
      if (isMounted) {
        startInstantCamera();
      }
    });

    return () => {
      isMounted = false;
      cancelAnimationFrame(frameId);
      stopCamera();
    };
  }, [isOpen, mode]);

  const startInstantCamera = async (targetCameraId = null) => {
    setScanError('');
    setScanning(true);

    try {
      if (scannerRef.current) {
        await stopCamera();
      }

      const container = document.getElementById(scannerContainerId);
      if (!container) return;

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });
      scannerRef.current = html5QrCode;

      // Scanning configuration without hardware-level aspect ratio constraint
      // (avoids hardware video resolution reset which causes the 3-second black buffering)
      const config = {
        fps: 15, // Lightweight, optimal 15 FPS
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const edge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(180, Math.floor(edge * 0.75));
          return { width: size, height: size };
        },
        disableFlip: false
      };

      // 1. Resolve camera ID fast (use cached if available, else query once)
      let camToUse = targetCameraId || selectedCameraId || cachedBestCameraId;

      if (!camToUse) {
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setCameras(devices);
            cachedCameraList = devices;
            // Prefer rear/environment on mobile, or first device (webcam) on laptop/PC
            const rear = devices.find((d) => /back|rear|environment/i.test(d.label));
            camToUse = rear ? rear.id : devices[0].id;
            cachedBestCameraId = camToUse;
            setSelectedCameraId(camToUse);
          }
        } catch (e) {
          console.warn('Could not enumerate cameras, falling back to direct stream:', e);
        }
      }

      // Fast watchdog to detect when video element starts playing and remove loading spinner immediately
      if (videoObserverTimerRef.current) clearInterval(videoObserverTimerRef.current);
      videoObserverTimerRef.current = setInterval(() => {
        const videoEl = container.querySelector('video');
        if (videoEl && (videoEl.readyState >= 2 || videoEl.videoWidth > 0)) {
          setCameraActive(true);
          setScanning(false);
          clearInterval(videoObserverTimerRef.current);
        }
      }, 50);

      // 2. Start scanner immediately with resolved camera ID or fallback
      if (camToUse) {
        await html5QrCode.start(
          camToUse,
          config,
          (decodedText) => handleSuccess(decodedText),
          () => {}
        );
      } else {
        // Direct browser constraint (works on any webcam or phone)
        try {
          await html5QrCode.start(
            { facingMode: 'user' },
            config,
            (decodedText) => handleSuccess(decodedText),
            () => {}
          );
        } catch {
          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => handleSuccess(decodedText),
            () => {}
          );
        }
      }

      setCameraActive(true);
      setScanning(false);
    } catch (err) {
      console.error('Error starting camera scanner:', err);
      setCameraActive(false);
      setScanning(false);
      setScanError(
        'Unable to access camera. Please allow camera permissions in browser settings or use the image upload option below.'
      );
    }
  };

  const stopCamera = async () => {
    if (videoObserverTimerRef.current) {
      clearInterval(videoObserverTimerRef.current);
      videoObserverTimerRef.current = null;
    }

    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        await scanner.clear();
      } catch (e) {
        console.warn('Scanner stop error:', e);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
    setScanning(false);
  };

  const handleSuccess = (decodedText) => {
    const cleanText = String(decodedText || '').trim();
    if (!cleanText) return;

    if (navigator.vibrate) {
      navigator.vibrate(80);
    }

    stopCamera();
    onScanSuccess(cleanText);
    onClose();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError('');
    setScanning(true);

    try {
      const html5QrCode = new Html5Qrcode('qr-file-reader-target');
      const result = await html5QrCode.scanFile(file, true);
      handleSuccess(result);
    } catch (err) {
      console.error('Failed to decode QR from image:', err);
      setScanError(
        'No valid QR code found in this image. Please upload a clear photo or screenshot of the QR code.'
      );
    } finally {
      setScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleSuccess(manualInput.trim());
      setManualInput('');
    }
  };

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamId = cameras[nextIndex].id;
    setSelectedCameraId(nextCamId);
    cachedBestCameraId = nextCamId;
    startInstantCamera(nextCamId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-900 text-white">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <ScanLine size={18} className="text-amber-400" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Scan Food Pass QR</h3>
              <p className="text-[10px] text-neutral-400">
                Instant verification &amp; meal lookup
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-4 pb-0">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-neutral-100 border border-neutral-200/80 text-xs font-semibold">
            <button
              onClick={() => setMode('camera')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
                mode === 'camera'
                  ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Camera size={14} />
              <span>Live Scanner</span>
            </button>
            <button
              onClick={() => {
                stopCamera();
                setMode('upload');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
                mode === 'upload'
                  ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Upload size={14} />
              <span>Upload QR Image</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {mode === 'camera' ? (
            <div className="space-y-3">
              {/* Scanner Viewport */}
              <div className="relative rounded-2xl overflow-hidden bg-neutral-950 aspect-square max-w-[270px] mx-auto border-2 border-neutral-800 flex items-center justify-center shadow-inner">
                {/* Internal HTML5 QR target with instant video cover classes */}
                <div
                  id={scannerContainerId}
                  className="w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:rounded-2xl [&_canvas]:hidden"
                />

                {/* Laser animation & Viewfinder Frame */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse" />
                    <div className="flex justify-between items-center text-[10px] text-white/80 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full mx-auto font-mono">
                      Align QR in frame
                    </div>
                  </div>
                )}

                {/* Fast Minimal Loader (disappears immediately when video track activates) */}
                {scanning && !cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950 text-white text-xs">
                    <Loader2 size={24} className="animate-spin text-amber-400" />
                    <span className="text-[11px] text-neutral-300">Connecting to camera…</span>
                  </div>
                )}
              </div>

              {/* Camera switcher if multiple cameras detected */}
              {cameras.length > 1 && (
                <div className="flex justify-center">
                  <button
                    onClick={switchCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <SwitchCamera size={13} />
                    <span>Switch Camera</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Upload Image Mode */
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 hover:border-neutral-900 rounded-3xl p-8 text-center bg-neutral-50 hover:bg-neutral-100/60 transition-all cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-neutral-200 flex items-center justify-center text-neutral-700">
                  <Upload size={22} />
                </div>
                <p className="text-xs font-bold text-neutral-900">Click to upload QR code image</p>
                <p className="text-[10px] text-neutral-500">Supports PNG, JPG, WEBP screenshots</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <div id="qr-file-reader-target" className="hidden" />
            </div>
          )}

          {/* Error alert if any */}
          {scanError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Manual Token ID paste fallback */}
          <div className="pt-2 border-t border-neutral-100">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Or paste 16-digit Token ID / Team Name…"
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-900 font-mono"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                Lookup
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrScannerModal;
