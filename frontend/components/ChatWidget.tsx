"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ user, size = 32 }: { user?: ChatUser; size?: number }) {
  if (user?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt={user.name || ""}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
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
      }}
    >
      {getInitials(user?.name)}
    </div>
  );
}

function ReadStatus({ message, isMine }: { message: Message; isMine: boolean }) {
  if (!isMine) return null;
  return (
    <span
      style={{
        fontSize: 10,
        marginLeft: 3,
        color: message.isRead ? "#4ade80" : "rgba(255,255,255,0.7)",
        letterSpacing: message.isRead ? -1 : 0,
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

  const formatTime = (s: number) =>
    isFinite(s) && s > 0
      ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`
      : "0:00";

  const accent = isMine ? "#fff" : "var(--brand)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 180 }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          color: accent,
          fontSize: 18,
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label={playing ? "Пауза" : "Воспроизвести"}
      >
        {playing ? "⏸" : "▶"}
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
      <span style={{ fontSize: 11, color: accent, flexShrink: 0, minWidth: 32, textAlign: "right" }}>
        {playing ? formatTime(currentTime) : formatTime(duration)}
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
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
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
      title={recording ? "Остановить запись и отправить" : "Записать голосовое сообщение"}
      style={{
        background: recording ? "#ef4444" : "transparent",
        color: recording ? "#fff" : "var(--brand)",
        border: `1px solid ${recording ? "#ef4444" : "var(--line)"}`,
        borderRadius: 14,
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 16,
        flexShrink: 0,
        alignSelf: "flex-end",
        transition: "background 0.15s, color 0.15s",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {recording ? "⏹" : "🎙"}
    </button>
  );
}

// Expose unread count so SiteHeader can use it
let _unreadCountListeners: Array<(n: number) => void> = [];
export function subscribeUnreadCount(cb: (n: number) => void) {
  _unreadCountListeners.push(cb);
  return () => { _unreadCountListeners = _unreadCountListeners.filter((x) => x !== cb); };
}
function notifyUnread(n: number) {
  _unreadCountListeners.forEach((cb) => cb(n));
}

export default function ChatWidget() {
  const { user, loading: authLoading } = useMe();

  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChatRef = useRef<Chat | null>(null);
  const userRef = useRef<{ id: number; role: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Load chats on mount when user is available
  useEffect(() => {
    if (!user) return;
    getMyChats().then(updateChats).catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateChats(data: Chat[]) {
    setChats(data);
    const unread = data.reduce((sum, c) => sum + (c._count?.messages ?? 0), 0);
    setTotalUnread(unread);
    notifyUnread(unread);
  }

  // Load messages when chat selected + mark as read
  useEffect(() => {
    if (!selectedChat || !user) {
      setMessages([]);
      return;
    }
    getMessages(selectedChat.id)
      .then((msgs) => {
        setMessages(msgs);
        const hasUnread = msgs.some((m) => !m.isRead && m.senderId !== user.id);
        if (hasUnread) {
          markChatRead(selectedChat.id).then(() => {
            getMyChats().then(updateChats).catch(() => {});
          }).catch(() => {});
        }
      })
      .catch(() => setMessages([]));
  }, [selectedChat?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling
  useEffect(() => {
    if (!user) return;

    const pollMessages = async () => {
      const current = selectedChatRef.current;
      const currentUser = userRef.current;
      if (!current || !currentUser || !open) return;
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
      try {
        const data = await getMyChats();
        updateChats(data);
      } catch { /* ignore */ }
    };

    const msgInterval = setInterval(pollMessages, 3000);
    const chatInterval = setInterval(pollChats, 10000);
    return () => {
      clearInterval(msgInterval);
      clearInterval(chatInterval);
    };
  }, [user?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Focus textarea when chat selected
  useEffect(() => {
    if (selectedChat && open) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [selectedChat?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  function getInterlocutor(chat: Chat): ChatUser | undefined {
    if (!user) return undefined;
    return user.id === chat.initiatorId ? chat.owner : chat.initiator;
  }

  const handleSelectChat = useCallback((chat: Chat) => {
    setSelectedChat(chat);
  }, []);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || !selectedChat || !user || sending) return;

    setSending(true);
    try {
      const receiverId = user.id === selectedChat.initiatorId
        ? selectedChat.ownerId
        : selectedChat.initiatorId;

      await sendMessage({ listingId: selectedChat.listingId, receiverId, text });
      setNewMessage("");

      const [msgs, updatedChats] = await Promise.all([
        getMessages(selectedChat.id),
        getMyChats(),
      ]);
      setMessages(msgs);
      updateChats(updatedChats);
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  const handleAudioReady = async (audioBlob: Blob, durationSeconds: number) => {
    if (!selectedChat || !user || sending) return;

    setSending(true);
    try {
      const receiverId = user.id === selectedChat.initiatorId
        ? selectedChat.ownerId
        : selectedChat.initiatorId;

      await sendAudioMessage({
        listingId: selectedChat.listingId,
        receiverId,
        audioBlob,
        durationSeconds,
      });

      const [msgs, updatedChats] = await Promise.all([
        getMessages(selectedChat.id),
        getMyChats(),
      ]);
      setMessages(msgs);
      updateChats(updatedChats);
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (authLoading || !user) return null;

  return (
    <>
      {/* Floating button */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
        }}
      >
        {/* Chat panel */}
        {open && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 12px)",
              right: 0,
              width: 360,
              height: 500,
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid var(--line)",
            }}
          >
            {selectedChat ? (
              /* ── Thread view ── */
              <>
                {/* Thread header */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--line)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "#fff",
                  }}
                >
                  <button
                    onClick={() => setSelectedChat(null)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 18,
                      color: "var(--muted)",
                      padding: "0 4px",
                      lineHeight: 1,
                    }}
                    title="Назад к списку"
                  >
                    ←
                  </button>
                  <Avatar user={getInterlocutor(selectedChat)} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {getInterlocutor(selectedChat)?.name || "Пользователь"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {selectedChat.listing?.title || `Объявление #${selectedChat.listingId}`}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    background: "var(--soft)",
                  }}
                >
                  {messages.length === 0 ? (
                    <div style={{ margin: "auto", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                      Нет сообщений. Напишите первым!
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMine = user.id === m.senderId;
                      return (
                        <div
                          key={m.id}
                          style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}
                        >
                          <div
                            style={{
                              padding: m.audioUrl ? "6px 10px" : "8px 12px",
                              borderRadius: isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                              background: isMine ? "var(--brand)" : "#fff",
                              color: isMine ? "#fff" : "inherit",
                              maxWidth: "85%",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.07)",
                              wordBreak: "break-word",
                            }}
                          >
                            {m.audioUrl ? (
                              <AudioPlayer src={m.audioUrl} isMine={isMine} initialDuration={m.audioDuration ?? 0} />
                            ) : (
                              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{m.text}</div>
                            )}
                            <div
                              style={{
                                fontSize: 10,
                                marginTop: 3,
                                opacity: 0.65,
                                textAlign: "right",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: 2,
                              }}
                            >
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

                {/* Input */}
                <div
                  style={{
                    padding: "10px 12px",
                    borderTop: "1px solid var(--line)",
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-end",
                    background: "#fff",
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      resize: "none",
                      borderRadius: 16,
                      fontSize: 13,
                      lineHeight: 1.4,
                      border: "1px solid var(--line)",
                      outline: "none",
                      fontFamily: "inherit",
                      background: "var(--soft)",
                    }}
                    placeholder="Сообщение..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <MicButton onAudioReady={handleAudioReady} disabled={sending} />
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    style={{
                      background: "var(--brand)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 16,
                      padding: "8px 14px",
                      fontSize: 13,
                      cursor: "pointer",
                      fontWeight: 600,
                      opacity: sending || !newMessage.trim() ? 0.5 : 1,
                      alignSelf: "flex-end",
                    }}
                  >
                    →
                  </button>
                </div>
              </>
            ) : (
              /* ── Chat list ── */
              <>
                <div
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid var(--line)",
                    fontWeight: 700,
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Сообщения</span>
                  {totalUnread > 0 && (
                    <span
                      style={{
                        background: "#ef4444",
                        color: "#fff",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        minWidth: 20,
                        height: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 6px",
                      }}
                    >
                      {totalUnread}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: "auto" }}>
                  {chats.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                      У вас пока нет диалогов
                    </div>
                  ) : (
                    chats.map((chat) => {
                      const interlocutor = getInterlocutor(chat);
                      const lastMsg = chat.messages?.[0];
                      const unread = chat._count?.messages ?? 0;

                      return (
                        <button
                          key={chat.id}
                          onClick={() => handleSelectChat(chat)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            width: "100%",
                            padding: "10px 14px",
                            textAlign: "left",
                            border: "none",
                            borderBottom: "1px solid var(--line)",
                            borderRadius: 0,
                            background: "transparent",
                            cursor: "pointer",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--soft)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                        >
                          <Avatar user={interlocutor} size={36} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: unread > 0 ? 700 : 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {interlocutor?.name || "Пользователь"}
                            </div>
                            {lastMsg && (
                              <div style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                                {lastMsg.senderId === user.id ? "Вы: " : ""}
                                {lastMsg.audioUrl ? "🎙 Голосовое сообщение" : lastMsg.text}
                              </div>
                            )}
                          </div>
                          {unread > 0 && (
                            <div
                              style={{
                                background: "#ef4444",
                                color: "#fff",
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                minWidth: 18,
                                height: 18,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "0 5px",
                                flexShrink: 0,
                              }}
                            >
                              {unread}
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line)" }}>
                  <a
                    href="/chat"
                    style={{
                      display: "block",
                      textAlign: "center",
                      fontSize: 13,
                      color: "var(--brand)",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Открыть все чаты →
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--brand)",
            color: "#fff",
            border: "none",
            borderRadius: 28,
            padding: "12px 20px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(108,92,231,0.4)",
            position: "relative",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 18 }}>💬</span>
          Сообщения
          {totalUnread > 0 && (
            <span
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                background: "#ef4444",
                color: "#fff",
                borderRadius: "50%",
                fontSize: 11,
                fontWeight: 700,
                minWidth: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
                border: "2px solid #fff",
              }}
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
