import MobileLayout from "@/components/layout/MobileLayout";
import { useAvailableUsers } from "@/hooks/useMessages";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NewChatPage = () => {
  const { data: users, isLoading } = useAvailableUsers();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shiftId = searchParams.get("shiftId");
  const [search, setSearch] = useState("");

  const filtered = (users || []).filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <button onClick={() => navigate("/messages")} className="text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-foreground">New Message</h2>
      </div>

      <div className="px-5 py-4 space-y-4">
        {shiftId && (
          <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            <span>Conversation will be linked to shift <span className="font-mono">{shiftId.slice(0, 8)}</span></span>
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-card border-border"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((u) => (
              <button
                key={u.id}
                onClick={() =>
                  navigate(
                    shiftId
                      ? `/messages/${u.id}?shiftId=${shiftId}`
                      : `/messages/${u.id}`
                  )
                }
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {u.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground">{u.full_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewChatPage;
