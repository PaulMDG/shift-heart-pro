import { useCallback, useEffect, useRef, useState } from "react";

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);

  const stop = useCallback(() =>
    new Promise<{ blob: Blob; duration: number; mime: string } | null>((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === "inactive") {
        resolve(null);
        return;
      }
      rec.onstop = () => {
        const mime = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        const duration = seconds;
        chunksRef.current = [];
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (tickRef.current) window.clearInterval(tickRef.current);
        tickRef.current = null;
        setIsRecording(false);
        setSeconds(0);
        resolve({ blob, duration, mime });
      };
      rec.stop();
    }), [seconds]);

  const cancel = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      try { rec.stop(); } catch { /* noop */ }
    }
    chunksRef.current = [];
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
    setIsRecording(false);
    setSeconds(0);
  }, []);

  const start = useCallback(async () => {
    if (isRecording) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    const mime = mimeCandidates.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) || "";
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.start();
    recorderRef.current = rec;
    setIsRecording(true);
    setSeconds(0);
    tickRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  }, [isRecording]);

  useEffect(() => () => { cancel(); }, [cancel]);

  return { isRecording, seconds, start, stop, cancel };
}