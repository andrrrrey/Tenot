"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMe } from "@/hooks/useMe";
import {
  getMyChats,
  getMessages,
  sendMessage,
  sendAudioMessage,
  markChatRead,
  type Chat,
  type ChatUser,
  type Message,
} from "@/services/chat";
import {
  IconArrowLeft,
  IconMessage,
  IconSend,
  IconMic,
  IconStop,
  IconPlay,
  IconPause,
} from "@/components/Icons";

/* ─────────── helpers ─────────── */

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function Avatar({ user, size = 40 }: { user?: ChatUser; size?: number }) {
  if (user?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.avatarUrl} alt={user.name || ""} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(255,255,255,0.8)" }} />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--brand)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.35, flexShrink: 0, boxShadow: "0 2px 8px var(--brand-glow)" }}>
      {getInitials(user?.name)}
    </div>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function ReadStatus({ message, isMine }: { message: Message; isMine: boolean }) {
  if (!isMine) return null;
  return (
    <span style={{ fontSize: 10, marginLeft: 4, color: message.isRead ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)", letterSpacing: message.isRead ? -1 : 0, fontWeight: 600 }} title={message.isRead ? "Прочитано" : "Доставлено"}>
      {message.isRead ? "✓✓" : "✓"}
    </span>
  );
}

function AudioPlayer({ src, isMine, initialDuration = 0 }: { src: string; isMine: boolean; initialDuration?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(initialDuration);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => { setDuration(initialDuration); setCurrentTime(0); setPlaying(false); }, [src, initialDuration]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => { setPlaying(false); setCurrentTime(0); };
    const onDur = () => { if (isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration); };
    audio.addEventListener("durationchange", onDur);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => { audio.removeEventListener("durationchange", onDur); audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("ended", onEnd); };
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else { a.play(); setPlaying(true); }
  };
  const fmt = (s: number) => isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";
  const accent = isMine ? "#fff" : "var(--brand)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 180 }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: accent, display: "flex", alignItems: "center", flexShrink: 0 }} aria-label={playing ? "Пауза" : "Воспроизвести"}>
        {playing ? <IconPause size={18} color={accent} strokeWidth={2} /> : <IconPlay size={18} color={accent} />}
      </button>
      <input type="range" min={0} max={duration || 0.001} step={0.1} value={currentTime} onChange={(e) => { const a = audioRef.current; if (a) { a.currentTime = Number(e.target.value); setCurrentTime(Number(e.target.value)); } }} style={{ flex: 1, accentColor: accent, cursor: "pointer" }} />
      <span style={{ fontSize: 11, color: accent, flexShrink: 0, minWidth: 34, textAlign: "right" }}>{playing ? fmt(currentTime) : fmt(duration)}</span>
    </div>
  );
}

function MicButton({ onAudioReady, disabled }: { onAudioReady: (blob: Blob, dur: number) => void; disabled?: boolean }) {
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);

  const toggle = async () => {
    if (recording) { recRef.current?.stop(); recRef.current = null; setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const dur = (Date.now() - startRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size > 0) onAudioReady(blob, dur);
        stream.getTracks().forEach((t) => t.stop());
      };
      startRef.current = Date.now();
      rec.start(100);
      recRef.current = rec;
      setRecording(true);
    } catch { alert("Нет доступа к микрофону"); }
  };

  return (
    <button type="button" onClick={toggle} disabled={disabled} title={recording ? "Остановить" : "Голосовое"} style={{ background: recording ? "#ef4444" : "rgba(255,255,255,0.9)", color: recording ? "#fff" : "var(--brand)", border: `1.5px solid ${recording ? "#ef4444" : "var(--line-solid)"}`, borderRadius: 999, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "not-allowed" : "pointer", flexShrink: 0, alignSelf: "flex-end", transition: "all 0.2s", opacity: disabled ? 0.5 : 1 }}>
      {recording ? <IconStop size={14} color="#fff" /> : <IconMic size={16} strokeWidth={1.8} />}
    </button>
  );
}

/* ─────────── main component ─────────── */

export default function ChatClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useMe();

  const chatIdParam = sp.get("chatId");
  const listingIdParam = sp.get("listingId");
  const receiverIdParam = sp.get("receiverId");

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);

  // Remove container constraints so chat fills the full screen width
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const prev = main.style.cssText;
    main.style.padding = "0";
    main.style.marginLeft = "0";
    main.style.marginRight = "0";
    main.style.maxWidth = "none";
    return () => { main.style.cssText = prev; };
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChatRef = useRef<Chat | null>(null);
  const userRef = useRef<{ id: number; role: string } | null>(null);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    getMyChats()
      .then((data) => {
        setChats(data);
        if (chatIdParam) {
          const found = data.find((c) => c.id === Number(chatIdParam));
          if (found) { setSelectedChat(found); setMobileShowThread(true); }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, chatIdParam]);

  useEffect(() => { if (listingIdParam && receiverIdParam) setMobileShowThread(true); }, [listingIdParam, receiverIdParam]);

  useEffect(() => {
    if (!selectedChat || !user) { setMessages([]); return; }
    getMessages(selectedChat.id)
      .then((msgs) => {
        setMessages(msgs);
        if (msgs.some((m) => !m.isRead && m.senderId !== user.id)) {
          markChatRead(selectedChat.id).then(() => getMyChats().then(setChats).catch(() => {})).catch(() => {});
        }
      })
      .catch(() => setMessages([]));
  }, [selectedChat?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    const pollMsgs = async () => {
      const cur = selectedChatRef.current; const u = userRef.current;
      if (!cur || !u) return;
      try {
        const msgs = await getMessages(cur.id);
        setMessages((prev) => { if (msgs.length !== prev.length || msgs.some((m, i) => m.id !== prev[i]?.id || m.isRead !== prev[i]?.isRead)) return msgs; return prev; });
        if (msgs.some((m) => !m.isRead && m.senderId !== u.id)) markChatRead(cur.id).catch(() => {});
      } catch { /* ignore */ }
    };
    const pollChats = async () => { try { setChats(await getMyChats()); } catch { /* ignore */ } };
    const t1 = setInterval(pollMsgs, 3000);
    const t2 = setInterval(pollChats, 10000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function getInterlocutor(chat: Chat): ChatUser | undefined {
    if (!user) return undefined;
    return user.id === chat.initiatorId ? chat.owner : chat.initiator;
  }

  const handleSelectChat = useCallback((chat: Chat) => { setSelectedChat(chat); setMobileShowThread(true); }, []);

  const getReceiverAndListingId = () => {
    if (selectedChat) return { listingId: selectedChat.listingId, receiverId: user!.id === selectedChat.initiatorId ? selectedChat.ownerId : selectedChat.initiatorId };
    if (listingIdParam && receiverIdParam) return { listingId: Number(listingIdParam), receiverId: Number(receiverIdParam) };
    return null;
  };

  const handleSendMessage = async () => {
    const text = newMessage.trim();
    if (!text) return;
    if (!user) { router.push("/login"); return; }
    setSending(true); setSendError(null);
    try {
      if (!selectedChat && listingIdParam && receiverIdParam) {
        await sendMessage({ listingId: Number(listingIdParam), receiverId: Number(receiverIdParam), text });
        setNewMessage("");
        const updated = await getMyChats(); setChats(updated);
        const nc = updated.find((c) => c.listingId === Number(listingIdParam));
        if (nc) { setSelectedChat(nc); setMessages(await getMessages(nc.id)); }
        return;
      }
      if (!selectedChat) return;
      const receiverId = user.id === selectedChat.initiatorId ? selectedChat.ownerId : selectedChat.initiatorId;
      await sendMessage({ listingId: selectedChat.listingId, receiverId, text });
      setNewMessage("");
      const [msgs, updChats] = await Promise.all([getMessages(selectedChat.id), getMyChats()]);
      setMessages(msgs); setChats(updChats);
    } catch (e: any) { setSendError(e.message || "Ошибка отправки"); }
    finally { setSending(false); }
  };

  const handleAudioReady = async (audioBlob: Blob, durationSeconds: number) => {
    if (!user) { router.push("/login"); return; }
    const ids = getReceiverAndListingId();
    if (!ids) return;
    setSending(true); setSendError(null);
    try {
      await sendAudioMessage({ ...ids, audioBlob, durationSeconds });
      if (!selectedChat && listingIdParam) {
        const updated = await getMyChats(); setChats(updated);
        const nc = updated.find((c) => c.listingId === Number(listingIdParam));
        if (nc) { setSelectedChat(nc); setMessages(await getMessages(nc.id)); }
        return;
      }
      if (selectedChat) { const [msgs, updChats] = await Promise.all([getMessages(selectedChat.id), getMyChats()]); setMessages(msgs); setChats(updChats); }
    } catch (e: any) { setSendError(e.message || "Ошибка отправки голосового"); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); handleSendMessage(); } };

  if (authLoading || loading) {
    return <div style={{ padding: "64px 20px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>Загрузка...</div>;
  }
  if (!user) {
    return (
      <div style={{ padding: "64px 20px", textAlign: "center" }}>
        <div className="card" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "48px 56px" }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Войдите, чтобы видеть чаты</div>
          <Link className="btn primary" href="/login">Войти</Link>
        </div>
      </div>
    );
  }

  const activeInterlocutor = selectedChat ? getInterlocutor(selectedChat) : undefined;
  const activeListing = selectedChat?.listing;

  return (
    <>
      <style>{`
        /* ── Outer shell ── */
        .chat-shell {
          display: flex;
          height: calc(100vh - 61px);
          min-height: 520px;
          background: #ffffff;
          border-radius: 0;
          overflow: hidden;
          box-shadow: none;
        }

        /* ── Sidebar (chat list) ── */
        .chat-sidebar {
          width: 300px;
          min-width: 300px;
          display: flex;
          flex-direction: column;
          background: #f7f8ff;
          border-right: 1px solid #e5e7f0;
          overflow: hidden;
          flex-shrink: 0;
        }
        .chat-sidebar-head {
          padding: 18px 20px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f0f1ff;
          border-bottom: 1px solid #e5e7f0;
          flex-shrink: 0;
        }
        .chat-sidebar-scroll {
          flex: 1;
          overflow-y: auto;
        }
        .chat-sidebar-foot {
          padding: 12px 16px;
          border-top: 1px solid #e5e7f0;
          flex-shrink: 0;
          background: #f0f1ff;
        }

        /* chat item rows */
        .chat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 13px 16px;
          text-align: left;
          border: none;
          border-bottom: 1px solid #ececf8;
          background: transparent;
          cursor: pointer;
          transition: background 0.12s;
          color: inherit;
        }
        .chat-item:hover { background: #eeeeff; }
        .chat-item.active {
          background: var(--brand);
          color: #fff;
          border-bottom-color: transparent;
        }
        .chat-item.active:hover { background: var(--brand-dark); }

        /* ── Thread panel ── */
        .chat-thread {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #fafafa;
          overflow: hidden;
          min-width: 0;
        }
        .chat-thread-head {
          padding: 14px 20px;
          border-bottom: 1px solid var(--line-solid);
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
          background: #ffffff;
        }
        .chat-thread-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .chat-thread-input {
          padding: 12px 16px;
          border-top: 1px solid var(--line-solid);
          display: flex;
          gap: 8px;
          align-items: flex-end;
          flex-shrink: 0;
          background: #ffffff;
        }

        /* ── Mobile overrides ── */
        @media (max-width: 768px) {
          .chat-shell {
            height: auto;
            min-height: 0;
            flex-direction: column;
            border-radius: var(--radius-lg);
            background: transparent;
            overflow: visible;
          }

          /* Mobile list view: only sidebar visible as a card */
          .chat-shell.mob-list .chat-sidebar {
            display: flex;
            width: 100%;
            border-radius: var(--radius-lg);
            background: var(--card);
            border: 1px solid rgba(255,255,255,0.85);
            box-shadow: var(--shadow);
          }
          .chat-shell.mob-list .chat-thread { display: none; }

          /* Mobile thread view: full screen overlay */
          .chat-shell.mob-thread .chat-sidebar { display: none; }
          .chat-shell.mob-thread .chat-thread {
            position: fixed;
            inset: 0;
            bottom: var(--mobile-nav-height);
            z-index: 200;
            background: #ffffff;
            border-radius: 0;
          }
          .chat-shell.mob-thread .chat-thread-messages {
            padding-bottom: 8px;
          }

          .chat-back-btn { display: flex !important; }
          .chat-sidebar-foot { display: none !important; }
        }
      `}</style>

      <div className={`chat-shell ${mobileShowThread ? "mob-thread" : "mob-list"}`}>

        {/* ── Sidebar ── */}
        <aside className="chat-sidebar">
          <div className="chat-sidebar-head">
            <IconMessage size={18} color="var(--brand)" strokeWidth={2} />
            <span style={{ fontWeight: 700, fontSize: 15, flex: 1, color: "var(--text)" }}>Чаты</span>
            {chats.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, background: "var(--brand)", color: "#fff", padding: "2px 8px", borderRadius: 999 }}>
                {chats.length}
              </span>
            )}
          </div>

          <div className="chat-sidebar-scroll">
            {chats.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13, lineHeight: 1.8 }}>
                <div style={{ marginBottom: 10, opacity: 0.3 }}><IconMessage size={32} strokeWidth={1} /></div>
                Диалогов пока нет.<br />Напишите продавцу из карточки товара.
              </div>
            ) : chats.map((chat) => {
              const interlocutor = getInterlocutor(chat);
              const lastMsg = chat.messages?.[0];
              const isActive = selectedChat?.id === chat.id;
              const unread = chat._count?.messages ?? 0;

              return (
                <button key={chat.id} className={`chat-item${isActive ? " active" : ""}`} onClick={() => handleSelectChat(chat)}>
                  <Avatar user={interlocutor} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: unread > 0 && !isActive ? 700 : 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {interlocutor?.name || "Пользователь"}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                      {chat.listing?.title || `Объявление #${chat.listingId}`}
                    </div>
                    {lastMsg && (
                      <div style={{ fontSize: 12, opacity: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                        {lastMsg.senderId === user.id ? "Вы: " : ""}{lastMsg.audioUrl ? "Голосовое сообщение" : lastMsg.text}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                    {lastMsg && <div style={{ fontSize: 10, opacity: 0.5 }}>{formatTime(lastMsg.createdAt)}</div>}
                    {unread > 0 && !isActive && (
                      <div style={{ background: "#ef4444", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                        {unread}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="chat-sidebar-foot">
            <Link className="btn" href="/me" style={{ width: "100%", justifyContent: "center", gap: 8, fontSize: 13 }}>
              <IconArrowLeft size={14} strokeWidth={2} />В кабинет
            </Link>
          </div>
        </aside>

        {/* ── Thread ── */}
        <section className="chat-thread">
          {selectedChat || (listingIdParam && receiverIdParam) ? (
            <>
              <div className="chat-thread-head">
                <button
                  className="chat-back-btn"
                  onClick={() => { setSelectedChat(null); setMobileShowThread(false); }}
                  style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: "0 4px", color: "var(--muted)", alignItems: "center", flexShrink: 0 }}
                >
                  <IconArrowLeft size={20} strokeWidth={2} />
                </button>
                <Avatar user={activeInterlocutor} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{activeInterlocutor?.name || "Пользователь"}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeListing?.title || (listingIdParam ? `Объявление #${listingIdParam}` : `Объявление #${selectedChat?.listingId}`)}
                  </div>
                </div>
              </div>

              <div className="chat-thread-messages">
                {messages.length === 0 ? (
                  <div style={{ margin: "auto", textAlign: "center", color: "var(--muted)", fontSize: 14, padding: 40 }}>
                    <div style={{ marginBottom: 12, opacity: 0.25 }}><IconMessage size={48} strokeWidth={1} /></div>
                    Нет сообщений. Напишите первым!
                  </div>
                ) : messages.map((m) => {
                  const isMine = user.id === m.senderId;
                  return (
                    <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                      <div style={{
                        padding: "10px 14px",
                        borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: isMine ? "var(--brand)" : "#ffffff",
                        color: isMine ? "#fff" : "inherit",
                        maxWidth: "70%",
                        boxShadow: isMine ? "0 4px 12px var(--brand-glow)" : "0 2px 8px rgba(0,0,0,0.07)",
                        border: isMine ? "none" : "1px solid #ebebeb",
                        wordBreak: "break-word",
                      }}>
                        {m.audioUrl ? (
                          <AudioPlayer src={m.audioUrl} isMine={isMine} initialDuration={m.audioDuration ?? 0} />
                        ) : (
                          <div style={{ fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
                        )}
                        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.65, textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
                          {new Date(m.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          <ReadStatus message={m} isMine={isMine} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {sendError && <div className="alert error" style={{ borderRadius: 0, border: "none", borderTop: "1px solid #fca5a5" }}>{sendError}</div>}

              <div className="chat-thread-input">
                <input
                  type="text"
                  style={{ flex: 1, padding: "0 14px", borderRadius: 20, fontSize: 14, border: "1.5px solid var(--line-solid)", outline: "none", fontFamily: "inherit", background: "#f8f9fb", transition: "border-color 0.2s", height: 40, boxSizing: "border-box" }}
                  placeholder="Написать сообщение..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; e.target.style.background = "#fff"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--line-solid)"; e.target.style.background = "#f8f9fb"; }}
                />
                <MicButton onAudioReady={handleAudioReady} disabled={sending} />
                <button className="btn primary" onClick={handleSendMessage} disabled={sending || !newMessage.trim()} style={{ borderRadius: 20, width: 40, height: 40, padding: 0, alignSelf: "flex-end", opacity: sending || !newMessage.trim() ? 0.5 : 1, flexShrink: 0 }}>
                  <IconSend size={16} strokeWidth={1.8} />
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", gap: 14, padding: 40, textAlign: "center" }}>
              <div style={{ opacity: 0.2 }}><IconMessage size={64} strokeWidth={1} /></div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Выберите диалог</div>
              <div style={{ fontSize: 14, maxWidth: 260, lineHeight: 1.7 }}>Нажмите на чат слева или начните переписку из карточки товара</div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
