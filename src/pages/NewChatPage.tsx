import { useAvailableUsers, useConversations } from "@/hooks/useMessages";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Link2,
  Loader2,
  Phone,
  AlertCircle,
  Clock,
  ShieldCheck,
  UserCog,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { useIsAdmin, useRole } from "@/hooks/useRole";
import { toast } from "sonner";

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

type Recipient = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
  phone?: string | null;
};

function canCall(
  myRoles: string[],
  recipientRole: string | null,
  hasConversation: boolean,
): boolean {
  // Admins and schedulers (moderators) can always call any teammate.
  if (myRoles.includes("admin") || myRoles.includes("moderator")) return true;
  // Anyone can call admins or schedulers.
  if (recipientRole === "admin" || recipientRole === "moderator") return true;
  // Otherwise only call peers you've already messaged.
  return hasConversation;
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

  const { data: users = [], isLoading, isFetching, isError, error, refetch } =
    useAvailableUsers(debounced);
  const { data: conversations = [] } = useConversations();
  const { data: myRoles = [] } = useRole();
  const { isAdmin } = useIsAdmin();

  // Build a set of recent partner ids
  const recentIds = useMemo(
    () => new Set(conversations.slice(0, 8).map((c) => c.user_id)),
    [conversations],
  );

  // Recents enriched with role/phone from the available users list when present
  const recents: Recipient[] = useMemo(() => {
    const byId = new Map(users.map((u) => [u.id, u]));
    return conversations.slice(0, 8).map((c) => {
      const u = byId.get(c.user_id);
      return {
        id: c.user_id,
        full_name: c.full_name,
        avatar_url: c.avatar_url,
        role: u?.role ?? null,
        phone: u?.phone ?? null,
      };
    });
  }, [conversations, users]);

  const goTo = (id: string) =>
    navigate(shiftId ? `/messages/${id}?shiftId=${shiftId}` : `/messages/${id}`);

  const handleCall = (r: Recipient, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const allowed = canCall(myRoles, r.role, recentIds.has(r.id));
    if (!allowed) {
      toast.error("You can only call this person after exchanging a message first.");
      return;
    }
    const phone = r.phone?.trim();
    if (!phone) {
      toast.error(`No phone on file for ${r.full_name}`);
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  const showRecents = !debounced && recents.length > 0;

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
          loop
          className="bg-surface text-surface-foreground border border-[hsl(var(--ivory-border))] rounded-2xl overflow-hidden shadow-soft"
        >
          <div className="flex items-center border-b border-[hsl(var(--ivory-border))] px-3">
            <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
            <CommandInput
              value={search}
              onValueChange={setSearch}
              autoFocus
              aria-label="Search contacts"
              placeholder="Search by name to call, message, or send a document…"
              className="h-12 bg-transparent text-sm text-surface-foreground placeholder:text-muted-foreground border-0 focus:ring-0"
            />
            {(isLoading || isFetching) && (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin ml-2 shrink-0" />
            )}
          </div>
          <CommandList className="max-h-[60vh]">
            {isError ? (
              <div className="py-8 px-4 text-center text-sm">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-400" />
                <p className="text-surface-foreground font-medium">Couldn't load contacts</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(error as any)?.message || "Please check your connection."}
                </p>
                <button
                  onClick={() => refetch()}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Loader2 className="w-3 h-3" /> Try again
                </button>
              </div>
            ) : isLoading && users.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground inline-flex flex-col items-center gap-2 w-full">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading contacts…
              </div>
            ) : (
              <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
                {debounced ? `No people match “${debounced}”.` : "Start typing to find a contact."}
              </CommandEmpty>
            )}

            {showRecents && (
              <CommandGroup heading="Recent" className="text-muted-foreground">
                {recents.map((u) => {
                  const meta = roleMeta(u.role);
                  const initials = u.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                  const allowed = canCall(myRoles, u.role, true);
                  return (
                    <CommandItem
                      key={`recent-${u.id}`}
                      value={`recent ${u.full_name}`}
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
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3" /> Recent conversation
                        </span>
                      </div>
                      {allowed && (
                        <button
                          type="button"
                          onClick={(e) => handleCall(u, e)}
                          aria-label={`Call ${u.full_name}`}
                          className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center shrink-0"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {users.length > 0 && (
              <CommandGroup heading={debounced ? "Results" : "All contacts"} className="text-muted-foreground">
                {users.map((u) => {
                  const meta = roleMeta(u.role);
                  const initials = u.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const allowed = canCall(myRoles, u.role, recentIds.has(u.id));
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
                      {allowed && (
                        <button
                          type="button"
                          onClick={(e) => handleCall(u, e)}
                          aria-label={`Call ${u.full_name}`}
                          className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center shrink-0"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          {isAdmin
            ? "As an admin you can call anyone on the team."
            : "Tap a person to message. Call is available for your team leads and recent contacts."}
          {" "}Use ↑ ↓ to browse and Enter to open.
        </p>
      </div>
    </div>
  );
};

export default NewChatPage;
