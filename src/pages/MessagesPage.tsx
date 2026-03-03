import MobileLayout from "@/components/layout/MobileLayout";
import { MessageCircle } from "lucide-react";

const messages = [
  { id: "1", from: "Admin Office", preview: "Please check the updated schedule for next week.", time: "10:30 AM", unread: true },
  { id: "2", from: "Lisa (Coordinator)", preview: "Joan's medication list has been updated.", time: "Yesterday", unread: false },
  { id: "3", from: "System", preview: "Your timesheet for Feb 24–28 has been approved.", time: "Feb 28", unread: false },
];

const MessagesPage = () => {
  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Messages</h2>
        <div className="space-y-2">
          {messages.map((msg) => (
            <button
              key={msg.id}
              className="w-full bg-card rounded-2xl p-4 shadow-card text-left hover:shadow-card-hover transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm ${msg.unread ? "font-bold text-card-foreground" : "font-medium text-card-foreground"}`}>
                      {msg.from}
                    </h3>
                    <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{msg.preview}</p>
                </div>
                {msg.unread && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
};

export default MessagesPage;
