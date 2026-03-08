import MobileLayout from "@/components/layout/MobileLayout";
import { MessageCircle, Plus, Search } from "lucide-react";
import { useConversations } from "@/hooks/useMessages";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MessagesPage = () => {
  const { data: conversations, isLoading } = useConversations();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = (conversations || []).filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Messages</h2>
          <button
            onClick={() => navigate("/messages/new")}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-card border-border"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Tap + to start a new chat</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((conv) => (
              <button
                key={conv.user_id}
                onClick={() => navigate(`/messages/${conv.user_id}`)}
                className="w-full bg-card rounded-2xl p-4 shadow-card text-left hover:shadow-card-hover transition-all"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={conv.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {conv.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3
                        className={`text-sm ${
                          conv.unread_count > 0
                            ? "font-bold text-card-foreground"
                            : "font-medium text-card-foreground"
                        }`}
                      >
                        {conv.full_name}
                      </h3>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {conv.last_message}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                      <span className="text-[10px] font-bold text-primary-foreground">
                        {conv.unread_count}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default MessagesPage;
