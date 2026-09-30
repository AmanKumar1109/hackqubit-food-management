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

export const QrScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
  const [mode, setMode] = useState('camera'); // 'camera' | 'upload'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const scannerContainerId = 'qr-reader-target';

  // Fetch available cameras when modal opens in camera mode
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setScanError('');

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (isMounted && devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available
          const backCam = devices.find((d) => /back|rear|environment/i.test(d.label));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn('Could not enumerate cameras:', err);
        if (isMounted) {
          setScanError('Camera permission not granted or no webcam detected. You can upload a QR image or paste the Token ID below.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Start / stop camera stream based on selected camera & mode
  useEffect(() => {
    if (!isOpen || mode !== 'camera' || !selectedCameraId) {
      stopCamera();
      return;
    }

    startCamera(selectedCameraId);

    return () => {
      stopCamera();
    };
  }, [isOpen, mode, selectedCameraId]);

  const startCamera = async (cameraId) => {
    setScanError('');
    setScanning(true);

    try {
      if (scannerRef.current) {
        await stopCamera();
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          handleSuccess(decodedText);
        },
        () => {
          // ignore frame decode misses
        }
      );

      setCameraActive(true);
    } catch (err) {
      console.error('Error starting camera scanner:', err);
      setCameraActive(false);
      setScanError(
        'Unable to access camera stream. Please ensure camera permissions are allowed in browser settings, or use the image upload option.'
      );
    } finally {
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Scanner stop error:', e);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  const handleSuccess = (decodedText) => {
    const cleanText = String(decodedText || '').trim();
    if (!cleanText) return;

    // Optional audio feedback or vibration
    if (navigator.vibrate) {
      navigator.vibrate(100);
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
      setScanError('No valid QR code found in this image. Please upload a clear photo or screenshot of the QR code.');
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
    setSelectedCameraId(cameras[nextIndex].id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-900 text-white">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <ScanLine size={18} className="text-amber-400" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Scan Food Pass QR</h3>
              <p className="text-[10px] text-neutral-400">
                Instantly retrieve team members &amp; meal records
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
              <span>Live Camera Scanner</span>
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
        <div className="p-6 space-y-4">
          {mode === 'camera' ? (
            <div className="space-y-3">
              {/* Scanner Viewport */}
              <div className="relative rounded-2xl overflow-hidden bg-neutral-950 aspect-square max-w-[280px] mx-auto border-2 border-neutral-800 flex items-center justify-center shadow-inner">
                <div id={scannerContainerId} className="w-full h-full object-cover" />

                {/* Laser animation overlay */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse" />
                    <div className="flex justify-between items-center text-[10px] text-white/70 bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-full mx-auto font-mono">
                      Align QR in frame
                    </div>
                  </div>
                )}

                {scanning && !cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950 text-white text-xs">
                    <Loader2 size={24} className="animate-spin text-amber-400" />
                    <span>Opening camera stream...</span>
                  </div>
                )}
              </div>

              {/* Camera switcher if multiple cameras */}
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
