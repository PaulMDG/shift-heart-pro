import { useAvailableUsers } from "@/hooks/useMessages";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Link2, Loader2, ShieldCheck, UserCog, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

function roleMeta(role: string | null) {
  switch (role) {
    case "admin":
      return { label: "Admin", icon: ShieldCheck, tone: "bg-purple-500/15 text-purple-300" };
    case "moderator":
      return { label: "Scheduler", icon: UserCog, tone: "bg-sky-500/15 text-sky-300" };
    case "caregiver":
      return { label: "Caregiver", icon: UserIcon, tone: "bg-emerald-500/15 text-emerald-300" };
    default:
      return { label: "Member", icon: UserIcon, tone: "bg-muted text-muted-foreground" };
  }
}

const NewChatPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shiftId = searchParams.get("shiftId");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users = [], isLoading, isFetching } = useAvailableUsers(debounced);

  const goTo = (id: string) =>
    navigate(shiftId ? `/messages/${id}?shiftId=${shiftId}` : `/messages/${id}`);

  return (
    <div className="min-h-screen bg-canvas text-canvas-foreground max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-[hsl(var(--ivory-border))] sticky top-0 z-10">
        <button onClick={() => navigate("/messages")} className="text-canvas-foreground" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-display text-lg text-canvas-foreground">New Message</h2>
      </div>

      <div className="px-5 py-4 space-y-4">
        {shiftId && (
          <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              Conversation will be linked to shift{" "}
              <span className="font-mono">{shiftId.slice(0, 8)}</span>
            </span>
          </div>
        )}

        <Command
          shouldFilter={false}
          className="bg-surface text-surface-foreground border border-[hsl(var(--ivory-border))] rounded-2xl overflow-hidden shadow-soft"
        >
          <div className="flex items-center border-b border-[hsl(var(--ivory-border))] px-3">
            <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search by name to call, message, or send a document…"
              className="h-12 bg-transparent text-sm text-surface-foreground placeholder:text-muted-foreground border-0 focus:ring-0"
            />
            {(isLoading || isFetching) && (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin ml-2 shrink-0" />
            )}
          </div>
          <CommandList className="max-h-[60vh]">
            <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
              {debounced ? `No people match “${debounced}”.` : "Start typing to find a contact."}
            </CommandEmpty>
            {users.length > 0 && (
              <CommandGroup heading="Contacts" className="text-muted-foreground">
                {users.map((u) => {
                  const meta = roleMeta(u.role);
                  const initials = u.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <CommandItem
                      key={u.id}
                      value={`${u.full_name} ${u.role ?? ""}`}
                      onSelect={() => goTo(u.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-primary/10"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                          {initials || "•"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-foreground truncate">
                          {u.full_name || "Unnamed user"}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold tracking-wide mt-0.5",
                            meta.tone,
                          )}
                        >
                          <meta.icon className="w-3 h-3" />
                          {meta.label}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Pick a person to open a thread where you can call, message, or attach a document.
        </p>
      </div>
    </div>
  );
};

export default NewChatPage;
