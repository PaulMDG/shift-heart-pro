import { useState, useRef, useCallback } from "react";
import { Camera, RotateCcw, Check, X } from "lucide-react";

interface SelfieCaptureProps {
  onCapture: (blob: Blob) => void;
  onSkip: () => void;
  onCancel: () => void;
}

const SelfieCapture = ({ onCapture, onSkip, onCancel }: SelfieCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setError(null);
    } catch {
      setError("Camera access denied. Please enable camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const takePicture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.8));
    stopCamera();
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirm = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.8
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end max-w-lg mx-auto">
      <div className="bg-card w-full rounded-t-3xl p-6 animate-slide-up">
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
        <h3 className="text-lg font-bold text-foreground text-center mb-1">Verification Selfie</h3>
        <p className="text-xs text-muted-foreground text-center mb-4">
          Take a selfie to confirm your identity on location
        </p>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-4">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <div className="relative w-full aspect-[4/3] bg-muted rounded-2xl overflow-hidden mb-4">
          {capturedImage ? (
            <img src={capturedImage} alt="Selfie" className="w-full h-full object-cover" />
          ) : cameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <Camera className="w-10 h-10 text-muted-foreground/50" />
              <button
                onClick={startCamera}
                className="px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold"
              >
                Open Camera
              </button>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {capturedImage ? (
          <div className="flex gap-3">
            <button
              onClick={retake}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl border border-border text-sm font-semibold text-foreground"
            >
              <RotateCcw className="w-4 h-4" /> Retake
            </button>
            <button
              onClick={confirm}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold"
            >
              <Check className="w-4 h-4" /> Use Photo
            </button>
          </div>
        ) : cameraActive ? (
          <button
            onClick={takePicture}
            className="w-full py-3.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold"
          >
            📸 Capture Selfie
          </button>
        ) : null}

        <div className="flex gap-3 mt-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-foreground"
          >
            <X className="w-4 h-4 inline mr-1" /> Cancel
          </button>
          <button
            onClick={() => { stopCamera(); onSkip(); }}
            className="flex-1 py-3 rounded-xl text-sm text-muted-foreground font-medium"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelfieCapture;
