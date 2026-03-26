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

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ user, size = 40 }: { user?: ChatUser; size?: number }) {
  if (user?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt={user.name || ""}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          border: "2px solid rgba(255,255,255,0.8)",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--brand)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.35,
        flexShrink: 0,
        boxShadow: "0 2px 8px var(--brand-glow)",
      }}
    >
      {getInitials(user?.name)}
    </div>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function ReadStatus({ message, isMine }: { message: Message; isMine: boolean }) {
  if (!isMine) return null;
  return (
    <span
      style={{
        fontSize: 10,
        marginLeft: 4,
        color: message.isRead ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)",
        letterSpacing: message.isRead ? -1 : 0,
        fontWeight: 600,
      }}
      title={message.isRead ? "Прочитано" : "Доставлено"}
    >
      {message.isRead ? "✓✓" : "✓"}
    </span>
  );
}

function AudioPlayer({ src, isMine, initialDuration = 0 }: { src: string; isMine: boolean; initialDuration?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(initialDuration);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setDuration(initialDuration);
    setCurrentTime(0);
    setPlaying(false);
  }, [src, initialDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };
    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const fmt = (s: number) =>
    isFinite(s) && s > 0
      ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`
      : "0:00";

  const accent = isMine ? "#fff" : "var(--brand)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 200 }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          color: accent,
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
        aria-label={playing ? "Пауза" : "Воспроизвести"}
      >
        {playing ? <IconPause size={18} color={accent} strokeWidth={2} /> : <IconPlay size={18} color={accent} />}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 0.001}
        step={0.1}
        value={currentTime}
        onChange={(e) => {
          const audio = audioRef.current;
          if (audio) { audio.currentTime = Number(e.target.value); setCurrentTime(Number(e.target.value)); }
        }}
        style={{ flex: 1, accentColor: accent, cursor: "pointer" }}
      />
      <span style={{ fontSize: 11, color: accent, flexShrink: 0, minWidth: 34, textAlign: "right" }}>
        {playing ? fmt(currentTime) : fmt(duration)}
      </span>
    </div>
  );
}

function MicButton({
  onAudioReady,
  disabled,
}: {
  onAudioReady: (blob: Blob, durationSeconds: number) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current = null;
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 0) onAudioReady(blob, durationSeconds);
        stream.getTracks().forEach((t) => t.stop());
      };
      startTimeRef.current = Date.now();
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      alert("Нет доступа к микрофону");
    }
  };

  return (
    <button
      type="button"
      onClick={toggleRecording}
      disabled={disabled}
      title={recording ? "Остановить запись" : "Голосовое сообщение"}
      style={{
        background: recording ? "#ef4444" : "var(--card)",
        color: recording ? "#fff" : "var(--brand)",
        border: `1px solid ${recording ? "#ef4444" : "rgba(255,255,255,0.7)"}`,
        borderRadius: 999,
        width: 40,
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0,
        alignSelf: "flex-end",
        transition: "all 0.2s",
        opacity: disabled ? 0.5 : 1,
        boxShadow: "var(--shadow-xs)",
      }}
    >
      {recording ? <IconStop size={14} color="#fff" /> : <IconMic size={16} strokeWidth={1.8} />}
    </button>
  );
}

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

  // Remove main padding so chat fills the full content width
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const prev = main.style.cssText;
    main.style.paddingLeft = "0";
    main.style.paddingRight = "0";
    main.style.paddingTop = "0";
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

  useEffect(() => {
    if (listingIdParam && receiverIdParam) setMobileShowThread(true);
  }, [listingIdParam, receiverIdParam]);

  useEffect(() => {
    if (!selectedChat || !user) { setMessages([]); return; }
    getMessages(selectedChat.id)
      .then((msgs) => {
        setMessages(msgs);
        const hasUnread = msgs.some((m) => !m.isRead && m.senderId !== user.id);
        if (hasUnread) {
          markChatRead(selectedChat.id).then(() => getMyChats().then(setChats).catch(() => {})).catch(() => {});
        }
      })
      .catch(() => setMessages([]));
  }, [selectedChat?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    const pollMessages = async () => {
      const current = selectedChatRef.current;
      const currentUser = userRef.current;
      if (!current || !currentUser) return;
      try {
        const msgs = await getMessages(current.id);
        setMessages((prev) => {
          if (msgs.length !== prev.length || msgs.some((m, i) => m.id !== prev[i]?.id || m.isRead !== prev[i]?.isRead)) {
            return msgs;
          }
          return prev;
        });
        const hasUnread = msgs.some((m) => !m.isRead && m.senderId !== currentUser.id);
        if (hasUnread) markChatRead(current.id).catch(() => {});
      } catch { /* ignore */ }
    };
    const pollChats = async () => {
      try { const data = await getMyChats(); setChats(data); } catch { /* ignore */ }
    };
    const msgInterval = setInterval(pollMessages, 3000);
    const chatInterval = setInterval(pollChats, 10000);
    return () => { clearInterval(msgInterval); clearInterval(chatInterval); };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function getInterlocutor(chat: Chat): ChatUser | undefined {
    if (!user) return undefined;
    return user.id === chat.initiatorId ? chat.owner : chat.initiator;
  }

  const handleSelectChat = useCallback((chat: Chat) => {
    setSelectedChat(chat);
    setMobileShowThread(true);
  }, []);

  const getReceiverAndListingId = () => {
    if (selectedChat) {
      const receiverId = user!.id === selectedChat.initiatorId ? selectedChat.ownerId : selectedChat.initiatorId;
      return { listingId: selectedChat.listingId, receiverId };
    }
    if (listingIdParam && receiverIdParam) {
      return { listingId: Number(listingIdParam), receiverId: Number(receiverIdParam) };
    }
    return null;
  };

  const handleSendMessage = async () => {
    const text = newMessage.trim();
    if (!text) return;
    if (!user) { router.push("/login"); return; }

    setSending(true);
    setSendError(null);
    try {
      if (!selectedChat && listingIdParam && receiverIdParam) {
        await sendMessage({ listingId: Number(listingIdParam), receiverId: Number(receiverIdParam), text });
        setNewMessage("");
        const updatedChats = await getMyChats();
        setChats(updatedChats);
        const newChat = updatedChats.find((c) => c.listingId === Number(listingIdParam));
        if (newChat) {
          setSelectedChat(newChat);
          const msgs = await getMessages(newChat.id);
          setMessages(msgs);
        }
        return;
      }
      if (!selectedChat) return;
      const receiverId = user.id === selectedChat.initiatorId ? selectedChat.ownerId : selectedChat.initiatorId;
      await sendMessage({ listingId: selectedChat.listingId, receiverId, text });
      setNewMessage("");
      const updated = await getMessages(selectedChat.id);
      setMessages(updated);
      const updatedChats = await getMyChats();
      setChats(updatedChats);
    } catch (e: any) {
      setSendError(e.message || "Ошибка отправки сообщения");
    } finally {
      setSending(false);
    }
  };

  const handleAudioReady = async (audioBlob: Blob, durationSeconds: number) => {
    if (!user) { router.push("/login"); return; }
    const ids = getReceiverAndListingId();
    if (!ids) return;
    setSending(true);
    setSendError(null);
    try {
      await sendAudioMessage({ ...ids, audioBlob, durationSeconds });
      if (!selectedChat && listingIdParam) {
        const updatedChats = await getMyChats();
        setChats(updatedChats);
        const newChat = updatedChats.find((c) => c.listingId === Number(listingIdParam));
        if (newChat) {
          setSelectedChat(newChat);
          const msgs = await getMessages(newChat.id);
          setMessages(msgs);
        }
        return;
      }
      if (selectedChat) {
        const [updated, updatedChats] = await Promise.all([getMessages(selectedChat.id), getMyChats()]);
        setMessages(updated);
        setChats(updatedChats);
      }
    } catch (e: any) {
      setSendError(e.message || "Ошибка отправки голосового");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  if (authLoading || loading) {
    return (
      <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)" }}>
        Загрузка...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: "48px 20px", textAlign: "center" }}>
        <div className="card" style={{ display: "inline-block", padding: "40px 48px" }}>
          <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 16 }}>Войдите, чтобы видеть чаты</div>
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
        .chat-wrap {
          display: grid;
          grid-template-columns: 320px 1fr;
          height: calc(100vh - 72px);
          min-height: 500px;
          gap: 0;
          background: var(--card);
          backdrop-filter: var(--blur);
          -webkit-backdrop-filter: var(--blur);
          border: 1px solid rgba(255,255,255,0.85);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }

        /* ── Chat list panel ── */
        .chat-list-panel {
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--line-solid);
          background: rgba(255,255,255,0.6);
          overflow: hidden;
        }
        .chat-list-header {
          padding: 18px 20px;
          border-bottom: 1px solid var(--line-solid);
          display: flex;
          align-items: center;
          gap: 10;
          flex-shrink: 0;
          background: rgba(255,255,255,0.8);
        }
        .chat-list-scroll {
          flex: 1;
          overflow-y: auto;
        }
        .chat-list-footer {
          padding: 12px 16px;
          border-top: 1px solid var(--line-solid);
          flex-shrink: 0;
          background: rgba(255,255,255,0.8);
        }

        /* ── Thread panel ── */
        .chat-thread-panel {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: rgba(248,249,252,0.8);
        }
        .chat-thread-header {
          padding: 14px 20px;
          border-bottom: 1px solid var(--line-solid);
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
          background: rgba(255,255,255,0.8);
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .chat-input-bar {
          padding: 12px 16px;
          border-top: 1px solid var(--line-solid);
          display: flex;
          gap: 8px;
          align-items: flex-end;
          flex-shrink: 0;
          background: rgba(255,255,255,0.9);
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .chat-wrap {
            display: block;
            height: auto;
            min-height: 0;
            background: transparent;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            border: none;
            border-radius: 0;
            box-shadow: none;
          }

          /* List view */
          .chat-wrap.mobile-list .chat-list-panel {
            display: flex;
            background: var(--card);
            backdrop-filter: var(--blur);
            -webkit-backdrop-filter: var(--blur);
            border: 1px solid rgba(255,255,255,0.85);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow);
            overflow: hidden;
          }
          .chat-wrap.mobile-list .chat-thread-panel {
            display: none;
          }

          /* Thread view */
          .chat-wrap.mobile-thread .chat-list-panel {
            display: none;
          }
          .chat-wrap.mobile-thread .chat-thread-panel {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            height: 100%;
            z-index: 200;
            background: var(--bg);
            border-radius: 0;
            border: none;
            box-shadow: none;
          }
          .chat-wrap.mobile-thread .chat-messages {
            padding-bottom: calc(var(--mobile-nav-height) + 12px);
          }

          .chat-back-btn { display: flex !important; }
          .chat-cabinet-link { display: none !important; }
        }
      `}</style>

      <div className={`chat-wrap ${mobileShowThread ? "mobile-thread" : "mobile-list"}`}>

        {/* ── Chat list panel ── */}
        <aside className="chat-list-panel">
          <div className="chat-list-header">
            <IconMessage size={18} color="var(--brand)" strokeWidth={2} />
            <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>Чаты</span>
            {chats.length > 0 && (
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                background: "var(--brand-light)",
                color: "var(--brand)",
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid rgba(94,92,248,0.15)",
              }}>
                {chats.length}
              </span>
            )}
          </div>

          <div className="chat-list-scroll">
            {chats.length === 0 ? (
              <div style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: 13,
                lineHeight: 1.8,
              }}>
                <div style={{ marginBottom: 12, opacity: 0.3 }}>
                  <IconMessage size={36} strokeWidth={1} />
                </div>
                У вас пока нет диалогов.<br />
                Напишите продавцу из карточки товара.
              </div>
            ) : (
              chats.map((chat) => {
                const interlocutor = getInterlocutor(chat);
                const lastMsg = chat.messages?.[0];
                const isSelected = selectedChat?.id === chat.id;
                const unreadCount = chat._count?.messages ?? 0;

                return (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "13px 16px",
                      textAlign: "left",
                      border: "none",
                      borderBottom: "1px solid var(--line-solid)",
                      borderRadius: 0,
                      background: isSelected ? "var(--brand)" : "transparent",
                      color: isSelected ? "#fff" : "inherit",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    <Avatar user={interlocutor} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: unreadCount > 0 && !isSelected ? 700 : 600,
                        fontSize: 14,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {interlocutor?.name || "Пользователь"}
                      </div>
                      <div style={{
                        fontSize: 11,
                        opacity: 0.65,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: 2,
                      }}>
                        {chat.listing?.title || `Объявление #${chat.listingId}`}
                      </div>
                      {lastMsg && (
                        <div style={{
                          fontSize: 12,
                          opacity: 0.55,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginTop: 2,
                        }}>
                          {lastMsg.senderId === user.id ? "Вы: " : ""}
                          {lastMsg.audioUrl ? "Голосовое сообщение" : lastMsg.text}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                      {lastMsg && (
                        <div style={{ fontSize: 10, opacity: 0.5 }}>
                          {formatTime(lastMsg.createdAt)}
                        </div>
                      )}
                      {unreadCount > 0 && !isSelected && (
                        <div style={{
                          background: "#ef4444",
                          color: "#fff",
                          borderRadius: 10,
                          fontSize: 10,
                          fontWeight: 700,
                          minWidth: 18,
                          height: 18,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 5px",
                        }}>
                          {unreadCount}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="chat-list-footer chat-cabinet-link">
            <Link
              className="btn"
              href="/me"
              style={{ width: "100%", justifyContent: "center", gap: 8, fontSize: 13 }}
            >
              <IconArrowLeft size={14} strokeWidth={2} />
              В кабинет
            </Link>
          </div>
        </aside>

        {/* ── Message thread panel ── */}
        <section className="chat-thread-panel">
          {selectedChat || (listingIdParam && receiverIdParam) ? (
            <>
              {/* Thread header */}
              <div className="chat-thread-header">
                <button
                  className="chat-back-btn"
                  onClick={() => { setSelectedChat(null); setMobileShowThread(false); }}
                  style={{
                    display: "none",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0 4px",
                    color: "var(--muted)",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                  title="Назад"
                >
                  <IconArrowLeft size={20} strokeWidth={2} />
                </button>
                <Avatar user={activeInterlocutor} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {activeInterlocutor?.name || "Пользователь"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeListing?.title ||
                      (listingIdParam
                        ? `Объявление #${listingIdParam}`
                        : `Объявление #${selectedChat?.listingId}`)}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div style={{
                    margin: "auto",
                    textAlign: "center",
                    color: "var(--muted)",
                    fontSize: 14,
                    padding: 40,
                  }}>
                    <div style={{ marginBottom: 12, opacity: 0.3 }}>
                      <IconMessage size={44} strokeWidth={1} />
                    </div>
                    Нет сообщений. Напишите первым!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = user.id === m.senderId;
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isMine ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            background: isMine ? "var(--brand)" : "rgba(255,255,255,0.92)",
                            color: isMine ? "#fff" : "inherit",
                            maxWidth: "70%",
                            boxShadow: isMine
                              ? "0 4px 12px var(--brand-glow)"
                              : "0 2px 8px rgba(0,0,0,0.08)",
                            backdropFilter: isMine ? "none" : "blur(8px)",
                            WebkitBackdropFilter: isMine ? "none" : "blur(8px)",
                            border: isMine ? "none" : "1px solid rgba(255,255,255,0.9)",
                            wordBreak: "break-word",
                          }}
                        >
                          {m.audioUrl ? (
                            <AudioPlayer src={m.audioUrl} isMine={isMine} initialDuration={m.audioDuration ?? 0} />
                          ) : (
                            <div style={{ fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
                          )}
                          <div style={{
                            fontSize: 10,
                            marginTop: 4,
                            opacity: 0.65,
                            textAlign: "right",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 2,
                          }}>
                            {new Date(m.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                            <ReadStatus message={m} isMine={isMine} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {sendError && (
                <div className="alert error" style={{ borderRadius: 0, borderLeft: "none", borderRight: "none", borderBottom: "none" }}>
                  {sendError}
                </div>
              )}

              {/* Input */}
              <div className="chat-input-bar">
                <textarea
                  rows={1}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    resize: "none",
                    borderRadius: 20,
                    fontSize: 14,
                    lineHeight: 1.5,
                    border: "1.5px solid var(--line-solid)",
                    outline: "none",
                    fontFamily: "inherit",
                    background: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    transition: "border-color 0.2s",
                    minHeight: 40,
                    maxHeight: 120,
                  }}
                  placeholder="Написать сообщение... (Enter — отправить)"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--brand)"; }}
                  onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--line-solid)"; }}
                />
                <MicButton onAudioReady={handleAudioReady} disabled={sending} />
                <button
                  className="btn primary"
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  style={{
                    borderRadius: 20,
                    width: 40,
                    height: 40,
                    padding: 0,
                    alignSelf: "flex-end",
                    opacity: sending || !newMessage.trim() ? 0.5 : 1,
                    flexShrink: 0,
                  }}
                >
                  <IconSend size={16} strokeWidth={1.8} />
                </button>
              </div>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              gap: 14,
              padding: 40,
              textAlign: "center",
            }}>
              <div style={{ opacity: 0.2 }}>
                <IconMessage size={60} strokeWidth={1} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
                Выберите диалог
              </div>
              <div style={{ fontSize: 14, maxWidth: 260, lineHeight: 1.7 }}>
                Нажмите на чат слева или начните переписку из карточки товара
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
