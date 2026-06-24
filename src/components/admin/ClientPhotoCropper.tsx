import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Loader2, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

interface Props {
  file: File | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (cropped: File) => Promise<void> | void;
  /** Output square size in pixels. Defaults to 512. */
  outputSize?: number;
  busy?: boolean;
}

/**
 * Square crop + preview dialog for client profile photos.
 *
 * - Loads the picked image into an off-screen <img>.
 * - Renders it into a 1:1 viewport with a centered circular mask.
 * - Lets the admin zoom (slider / wheel / pinch) and drag-to-pan.
 * - On confirm, draws the visible region to a canvas and exports a JPEG
 *   File that we hand to `uploadClientPhoto`.
 */
const VIEWPORT = 280; // px on screen

const ClientPhotoCropper = ({ file, open, onClose, onConfirm, outputSize = 512, busy }: Props) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Load picked file into an HTMLImageElement.
  useEffect(() => {
    if (!file) {
      setImgUrl(null);
      setImg(null);
      return;
    }
    setLoadError(null);
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    const i = new Image();
    i.onload = () => {
      setImg(i);
      // Fit image so the shorter side equals viewport.
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    i.onerror = () => {
      setLoadError(
        "Couldn't read this image. The file may be corrupt or in an unsupported format. Try a JPG or PNG.",
      );
    };
    i.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Base scale: contain the shorter image side into the viewport (cover for crop).
  const baseScale = img ? Math.max(VIEWPORT / img.width, VIEWPORT / img.height) : 1;
  const displayScale = baseScale * zoom;
  const displayW = img ? img.width * displayScale : 0;
  const displayH = img ? img.height * displayScale : 0;

  const clampOffset = (x: number, y: number) => {
    const maxX = Math.max(0, (displayW - VIEWPORT) / 2);
    const maxY = Math.max(0, (displayH - VIEWPORT) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  useEffect(() => {
    setOffset((o) => clampOffset(o.x, o.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, img]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset(clampOffset(dragRef.current.ox + dx, dragRef.current.oy + dy));
  };
  const onPointerUp = () => { dragRef.current = null; };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = Math.min(3, Math.max(1, zoom + (e.deltaY < 0 ? 0.1 : -0.1)));
    setZoom(next);
  };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirm = async () => {
    if (!img || !file) return;
    // Map viewport region back to source pixels.
    const srcW = VIEWPORT / displayScale;
    const srcH = VIEWPORT / displayScale;
    const srcX = img.width / 2 - srcW / 2 - offset.x / displayScale;
    const srcY = img.height / 2 - srcH / 2 - offset.y / displayScale;

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, outputSize, outputSize);
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputSize, outputSize);

    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.9),
    );
    if (!blob) return;
    const cropped = new File([blob], `client-photo-${Date.now()}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    await onConfirm(cropped);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crop client photo</DialogTitle>
          <DialogDescription>
            Drag to reposition and use the slider to zoom. The shaded circle shows what caregivers will see.
          </DialogDescription>
        </DialogHeader>

        {loadError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {loadError}
          </div>
        ) : !img ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading preview…
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="relative mx-auto bg-muted overflow-hidden rounded-2xl select-none touch-none cursor-grab active:cursor-grabbing"
              style={{ width: VIEWPORT, height: VIEWPORT }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
              role="img"
              aria-label="Crop preview"
            >
              {imgUrl && (
                <img
                  src={imgUrl}
                  alt=""
                  draggable={false}
                  style={{
                    position: "absolute",
                    width: displayW,
                    height: displayH,
                    left: (VIEWPORT - displayW) / 2 + offset.x,
                    top: (VIEWPORT - displayH) / 2 + offset.y,
                    maxWidth: "none",
                    pointerEvents: "none",
                  }}
                />
              )}
              {/* Circular mask overlay */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: `0 0 0 9999px hsl(var(--background) / 0.55)`,
                  borderRadius: "9999px",
                  margin: 4,
                  width: VIEWPORT - 8,
                  height: VIEWPORT - 8,
                }}
              />
              <div
                aria-hidden
                className="absolute inset-1 rounded-full border border-primary/60 pointer-events-none"
              />
            </div>

            <div className="flex items-center gap-3 px-1">
              <ZoomOut className="w-4 h-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.05}
                onValueChange={([v]) => setZoom(v)}
                aria-label="Zoom"
                className="flex-1"
              />
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
              <button
                type="button"
                onClick={reset}
                className="text-xs text-primary font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/10"
                aria-label="Reset crop"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!img || busy || !!loadError}
            className="flex-1 h-11 rounded-xl gradient-cta text-primary-foreground text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save photo
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientPhotoCropper;