import { formatChatDay } from "@/lib/format";

/** Плашка с датой между сообщениями разных дней (как в Telegram). */
export function ChatDayDivider({ date }: { date: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 4px", position: "sticky", top: 0, zIndex: 1 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--muted)",
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: 999,
          padding: "3px 12px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        {formatChatDay(date)}
      </span>
    </div>
  );
}
