import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
import {
  ArrowLeft,
  Car,
  CheckCheck,
  ClipboardCheck,
  FileText,
  Image as ImageIcon,
  Link2,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Pin,
  Play,
  Plus,
  Send,
  Shield,
  Smile,
  StickyNote,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChatMessages, useSendMessage, useConvertMessageToCareNote, type Message } from "@/hooks/useMessages";
import { uploadMessageFile } from "@/hooks/useMessageUpload";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const QUICK_REPLIES = [
  { label: "Update on visit", icon: FileText },
  { label: "All good", icon: CheckCheck },
  { label: "On my way", icon: Car },
  { label: "Will call later", icon: Phone },
];

function formatTimeShort(d: Date) {
  return format(d, "h:mm a");
}
function dateLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}
function formatDuration(sec?: number | null) {
  if (!sec || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const ChatPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shiftId = searchParams.get("shiftId") || undefined;
  const [scopeToShift, setScopeToShift] = useState<boolean>(!!shiftId);
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useChatMessages(userId, scopeToShift ? shiftId : undefined);
  const sendMessage = useSendMessage();
  const convertToCareNote = useConvertMessageToCareNote();
  const recorder = useVoiceRecorder();

  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [reactions, setReactions] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(`reactions:${userId}`) || "{}"); } catch { return {}; }
  });
  const [pinnedId, setPinnedId] = useState<string | null>(() => localStorage.getItem(`pinned:${userId}`));

  const { data: partner } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", userId!)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, uploading, recorder.isRecording]);

  useEffect(() => {
    localStorage.setItem(`reactions:${userId}`, JSON.stringify(reactions));
  }, [reactions, userId]);

  const pinned = useMemo(
    () => messages.find((m) => m.id === pinnedId) ?? null,
    [messages, pinnedId],
  );

  const grouped = useMemo(() => {
    const groups: { label: string; items: Message[] }[] = [];
    for (const msg of messages) {
      const label = dateLabel(new Date(msg.created_at));
      const last = groups[groups.length - 1];
      if (!last || last.label !== label) groups.push({ label, items: [msg] });
      else last.items.push(msg);
    }
    return groups;
  }, [messages]);

  const handleSendText = async (content?: string) => {
    const body = (content ?? text).trim();
    if (!body || !userId) return;
    setText("");
    await sendMessage.mutateAsync({ recipientId: userId, content: body, shiftId, category: "family" });
  };

  const handleFile = async (file: File, kind: "image" | "doc") => {
    if (!userId) return;
    setUploading(true);
    try {
      const { url } = await uploadMessageFile(file, file.name);
      await sendMessage.mutateAsync({
        recipientId: userId,
        content: "",
        shiftId,
        category: "family",
        attachment: { url, type: file.type, name: file.name, size: file.size },
      });
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleStopVoice = async () => {
    if (!userId) return;
    const result = await recorder.stop();
    if (!result) return;
    setUploading(true);
    try {
      const ext = result.mime.includes("mp4") ? "m4a" : "webm";
      const file = new File([result.blob], `voice-${Date.now()}.${ext}`, { type: result.mime });
      const { url } = await uploadMessageFile(file, file.name);
      await sendMessage.mutateAsync({
        recipientId: userId,
        content: "",
        shiftId,
        category: "family",
        attachment: { url, type: result.mime, name: file.name, size: file.size, duration: result.duration },
      });
    } catch (e: any) {
      toast.error(e?.message || "Voice note failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleReaction = (id: string) => {
    setReactions((r) => ({ ...r, [id]: ((r[id] || 0) + 1) % 4 }));
  };

  const togglePin = (id: string) => {
    const next = pinnedId === id ? null : id;
    setPinnedId(next);
    if (next) localStorage.setItem(`pinned:${userId}`, next);
    else localStorage.removeItem(`pinned:${userId}`);
  };

  const initials = partner?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?";

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur border-b border-border/60 sticky top-0 z-20">
        <button onClick={() => navigate("/messages")} className="text-foreground -ml-1 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar className="w-9 h-9">
          <AvatarImage src={partner?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {partner?.full_name || "Loading..."}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="text-emerald-400 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Online
            </span>
          </div>
        </div>
        <button className="p-2 text-muted-foreground"><Phone className="w-5 h-5" /></button>
        <button className="p-2 text-muted-foreground"><Video className="w-5 h-5" /></button>
        <button className="p-2 text-muted-foreground"><MoreVertical className="w-5 h-5" /></button>
      </header>

      {/* Shift scope chip */}
      {shiftId && (
        <div className="px-4 pt-3">
          <button
            onClick={() => setScopeToShift((v) => !v)}
            className={cn(
              "w-full flex items-center gap-2 rounded-xl px-3 py-2 border text-sm transition-colors",
              scopeToShift
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-card border-border/60 text-muted-foreground",
            )}
          >
            <Link2 className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">
              {scopeToShift ? "Showing messages for this shift" : "Showing all messages"}
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-background/60">
              {scopeToShift ? "Shift" : "All"}
            </span>
          </button>
        </div>
      )}

      {/* Pinned + secure banners */}
      <div className="px-4 pt-3 space-y-2">
        {pinned && (
          <div className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-3 py-2.5 text-sm">
            <Pin className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground shrink-0">Pinned:</span>
            <span className="text-foreground truncate">{pinned.content || "Attachment"}</span>
            <button onClick={() => setPinnedId(null)} className="ml-auto text-primary text-xs font-medium">View</button>
          </div>
        )}
        <div className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-3 py-2.5">
          <Shield className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-tight">This is a secure conversation.</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Messages are visible to the care team.</p>
          </div>
          <button className="text-primary text-xs font-medium">Learn more</button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-[200px]">
        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm py-8">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">No messages yet. Say hello! 👋</div>
        ) : (
          grouped.map((g) => (
            <div key={g.label} className="space-y-3">
              <div className="text-center text-[11px] text-muted-foreground">{g.label}</div>
              {g.items.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  msg={msg}
                  mine={msg.sender_id === user?.id}
                  partnerName={partner?.full_name?.split(" ")[0] || "Them"}
                  partnerAvatar={partner?.avatar_url || undefined}
                  reactionCount={reactions[msg.id] || 0}
                  onReact={() => toggleReaction(msg.id)}
                  onPin={() => togglePin(msg.id)}
                  isPinned={pinnedId === msg.id}
                  canConvert={!!shiftId}
                  onConvert={
                    shiftId
                      ? () =>
                          convertToCareNote.mutate(
                            { message: msg, shiftId },
                            {
                              onSuccess: () => toast.success("Added to care notes"),
                              onError: (e: any) => toast.error(e?.message || "Failed to convert"),
                            },
                          )
                      : undefined
                  }
                  currentUserId={user?.id}
                />
              ))}
            </div>
          ))
        )}
        {uploading && (
          <div className="text-center text-xs text-muted-foreground py-2">Uploading…</div>
        )}
      </div>

      {/* Composer fixed */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-card border-t border-border/60">
        {/* Quick replies */}
        <div className="px-3 pt-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q.label}
              onClick={() => handleSendText(q.label)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-card text-xs text-foreground"
            >
              <q.icon className="w-3.5 h-3.5 text-muted-foreground" />
              {q.label}
            </button>
          ))}
        </div>

        {recorder.isRecording ? (
          <div className="flex items-center gap-3 px-3 py-3 border-t border-border/60">
            <button onClick={recorder.cancel} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-foreground font-mono">{formatDuration(recorder.seconds)}</span>
              <span className="text-xs text-muted-foreground">Recording…</span>
            </div>
            <button onClick={handleStopVoice} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2 px-3 py-3 border-t border-border/60">
            <AttachMenu
              onPickFile={() => fileInputRef.current?.click()}
              onPickPhoto={() => photoInputRef.current?.click()}
            />
            <div className="flex-1 relative">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                placeholder="Type a message..."
                className="w-full bg-secondary/60 rounded-2xl pl-4 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground">
                <Smile className="w-4 h-4" />
              </button>
            </div>
            {text.trim() ? (
              <button
                onClick={() => handleSendText()}
                disabled={sendMessage.isPending}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => recorder.start().catch((e) => toast.error(e?.message || "Mic permission denied"))}
                aria-label="Record voice note"
                className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="application/pdf,.doc,.docx,.txt,.xls,.xlsx"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f, "doc");
            e.target.value = "";
          }}
        />
        <input
          ref={photoInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f, "image");
            e.target.value = "";
          }}
        />
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
};

function AttachMenu({ onPickFile, onPickPhoto }: { onPickFile: () => void; onPickPhoto: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground"
      >
        {open ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>
      {open && (
        <div className="absolute bottom-12 left-0 bg-card border border-border/60 rounded-2xl shadow-xl p-2 w-44 z-30">
          <button
            onClick={() => { onPickPhoto(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm text-foreground"
          >
            <ImageIcon className="w-4 h-4 text-emerald-400" /> Photo
          </button>
          <button
            onClick={() => { onPickFile(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm text-foreground"
          >
            <Paperclip className="w-4 h-4 text-sky-400" /> Document
          </button>
        </div>
      )}
    </div>
  );
}

function ChatBubble({
  msg,
  mine,
  partnerName,
  partnerAvatar,
  reactionCount,
  onReact,
  onPin,
  isPinned,
  canConvert,
  onConvert,
}: {
  msg: Message;
  mine: boolean;
  partnerName: string;
  partnerAvatar?: string;
  reactionCount: number;
  onReact: () => void;
  onPin: () => void;
  isPinned: boolean;
  canConvert?: boolean;
  onConvert?: () => void;
}) {
  const time = formatTimeShort(new Date(msg.created_at));
  return (
    <div className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && (
        <Avatar className="w-7 h-7 mt-5">
          <AvatarImage src={partnerAvatar} />
          <AvatarFallback className="bg-primary/15 text-primary text-[10px]">
            {partnerName.slice(0, 1)}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn("max-w-[78%] flex flex-col", mine ? "items-end" : "items-start")}>
        {!mine && (
          <div className="text-[11px] text-primary font-medium mb-0.5 pl-1">
            {partnerName} <span className="text-muted-foreground ml-1">{time}</span>
          </div>
        )}
        <div
          onDoubleClick={onReact}
          onContextMenu={(e) => { e.preventDefault(); onPin(); }}
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed select-none",
            mine
              ? "bg-blue-600/90 text-white rounded-br-md"
              : "bg-secondary text-foreground rounded-bl-md",
          )}
        >
          {msg.attachment_url && msg.attachment_type?.startsWith("image/") && (
            <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="block">
              <img
                src={msg.attachment_url}
                alt={msg.attachment_name || "Photo"}
                className="rounded-xl max-w-[260px] max-h-[260px] object-cover -m-1 mb-2"
              />
            </a>
          )}
          {msg.attachment_url && msg.attachment_type?.startsWith("audio/") && (
            <VoiceBubble url={msg.attachment_url} duration={msg.attachment_duration ?? 0} mine={mine} />
          )}
          {msg.attachment_url && !msg.attachment_type?.startsWith("image/") && !msg.attachment_type?.startsWith("audio/") && (
            <a
              href={msg.attachment_url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg",
                mine ? "bg-white/15" : "bg-background/60",
              )}
            >
              <FileText className="w-4 h-4" />
              <span className="text-xs truncate max-w-[180px]">{msg.attachment_name || "Document"}</span>
            </a>
          )}
          {msg.content && <div>{msg.content}</div>}
        </div>
        <div className={cn("flex items-center gap-1 mt-1 px-1", mine ? "flex-row-reverse" : "flex-row")}>
          {mine && (
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              {time}
              <CheckCheck className={cn("w-3.5 h-3.5", msg.read ? "text-emerald-400" : "text-muted-foreground")} />
            </span>
          )}
          {reactionCount > 0 && (
            <button
              onClick={onReact}
              className="inline-flex items-center gap-1 text-[11px] bg-secondary rounded-full px-2 py-0.5"
            >
              <span>❤️</span>
              <span className="text-foreground">{reactionCount}</span>
            </button>
          )}
          {isPinned && (
            <span className="inline-flex items-center gap-1 text-[10px] text-primary">
              <Pin className="w-3 h-3" /> pinned
            </span>
          )}
          {canConvert && onConvert && (
            <button
              onClick={onConvert}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline px-1"
              title="Add to care notes"
            >
              <StickyNote className="w-3 h-3" /> Care note
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function VoiceBubble({ url, duration, mine }: { url: string; duration: number; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  };
  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <button
        onClick={toggle}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center",
          mine ? "bg-white/20" : "bg-primary/20 text-primary",
        )}
      >
        <Play className={cn("w-4 h-4", playing && "opacity-60")} />
      </button>
      <div className="flex-1 h-7 flex items-center gap-[2px]">
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className={cn("w-[2px] rounded-full", mine ? "bg-white/70" : "bg-foreground/60")}
            style={{ height: `${20 + Math.sin(i * 0.9) * 10 + (i % 3) * 4}%` }}
          />
        ))}
      </div>
      <span className="text-[11px] font-mono opacity-80">{formatDuration(duration)}</span>
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} preload="none" />
    </div>
  );
}

export default ChatPage;