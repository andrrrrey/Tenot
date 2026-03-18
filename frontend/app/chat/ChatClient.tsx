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

// ✓ = delivered, ✓✓ = read
function ReadStatus({ message, isMine }: { message: Message; isMine: boolean }) {
  if (!isMine) return null;
  return (
    <span
      style={{
        fontSize: 11,
        marginLeft: 4,
        color: message.isRead ? "#4ade80" : "rgba(255,255,255,0.7)",
        display: "inline-flex",
        alignItems: "center",
        letterSpacing: message.isRead ? -1 : 0,
      }}
      title={message.isRead ? "Прочитано" : "Доставлено"}
    >
      {message.isRead ? "✓✓" : "✓"}
    </span>
  );
}

function AudioPlayer({ src, isMine }: { src: string; isMine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    if (audio.readyState >= 1 && isFinite(audio.duration)) {
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
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
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 200 }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          color: accent,
          fontSize: 20,
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
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={(e) => {
          const audio = audioRef.current;
          if (audio) { audio.currentTime = Number(e.target.value); setCurrentTime(Number(e.target.value)); }
        }}
        style={{ flex: 1, accentColor: accent, cursor: "pointer" }}
      />
      <span style={{ fontSize: 12, color: accent, flexShrink: 0, minWidth: 36, textAlign: "right" }}>
        {playing ? formatTime(currentTime) : formatTime(duration)}
      </span>
    </div>
  );
}

function MicButton({
  onAudioReady,
  disabled,
}: {
  onAudioReady: (blob: Blob) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const toggleRecording = async () => {
    if (recording) {
      // Stop: mediaRecorder.stop() triggers onstop which calls onAudioReady
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
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 0) onAudioReady(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
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
        background: recording ? "#ef4444" : "var(--soft)",
        color: recording ? "#fff" : "var(--brand)",
        border: `1px solid ${recording ? "#ef4444" : "var(--border)"}`,
        borderRadius: 20,
        width: 40,
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 18,
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChatRef = useRef<Chat | null>(null);
  const userRef = useRef<{ id: number; role: string } | null>(null);

  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Load chats on mount / when user changes
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getMyChats()
      .then((data) => {
        setChats(data);
        if (chatIdParam) {
          const found = data.find((c) => c.id === Number(chatIdParam));
          if (found) setSelectedChat(found);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, chatIdParam]);

  // Load messages when a chat is selected + mark as read
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
            getMyChats().then(setChats).catch(() => {});
          }).catch(() => {});
        }
      })
      .catch(() => setMessages([]));
  }, [selectedChat?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling for real-time messages and chat list updates
  useEffect(() => {
    if (!user) return;

    const pollMessages = async () => {
      const current = selectedChatRef.current;
      const currentUser = userRef.current;
      if (!current || !currentUser) return;
      try {
        const msgs = await getMessages(current.id);
        setMessages((prev) => {
          if (
            msgs.length !== prev.length ||
            msgs.some((m, i) => m.id !== prev[i]?.id || m.isRead !== prev[i]?.isRead)
          ) {
            return msgs;
          }
          return prev;
        });
        const hasUnread = msgs.some((m) => !m.isRead && m.senderId !== currentUser.id);
        if (hasUnread) {
          markChatRead(current.id).catch(() => {});
        }
      } catch {
        // ignore poll errors
      }
    };

    const pollChats = async () => {
      try {
        const data = await getMyChats();
        setChats(data);
      } catch {
        // ignore
      }
    };

    const msgInterval = setInterval(pollMessages, 3000);
    const chatInterval = setInterval(pollChats, 10000);
    return () => {
      clearInterval(msgInterval);
      clearInterval(chatInterval);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Determine the interlocutor for a chat (the other person)
  function getInterlocutor(chat: Chat): ChatUser | undefined {
    if (!user) return undefined;
    return user.id === chat.initiatorId ? chat.owner : chat.initiator;
  }

  const handleSelectChat = useCallback((chat: Chat) => {
    setSelectedChat(chat);
  }, []);

  const getReceiverAndListingId = () => {
    if (selectedChat) {
      const receiverId =
        user!.id === selectedChat.initiatorId
          ? selectedChat.ownerId
          : selectedChat.initiatorId;
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

    if (!user) {
      router.push("/login");
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      if (!selectedChat && listingIdParam && receiverIdParam) {
        await sendMessage({
          listingId: Number(listingIdParam),
          receiverId: Number(receiverIdParam),
          text,
        });
        setNewMessage("");

        const updatedChats = await getMyChats();
        setChats(updatedChats);

        const newChat = updatedChats.find(
          (c) => c.listingId === Number(listingIdParam)
        );
        if (newChat) {
          setSelectedChat(newChat);
          const msgs = await getMessages(newChat.id);
          setMessages(msgs);
        }
        return;
      }

      if (!selectedChat) return;

      const receiverId =
        user.id === selectedChat.initiatorId
          ? selectedChat.ownerId
          : selectedChat.initiatorId;

      await sendMessage({
        listingId: selectedChat.listingId,
        receiverId,
        text,
      });
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

  const handleAudioReady = async (audioBlob: Blob) => {
    if (!user) {
      router.push("/login");
      return;
    }

    const ids = getReceiverAndListingId();
    if (!ids) return;

    setSending(true);
    setSendError(null);

    try {
      await sendAudioMessage({ ...ids, audioBlob });

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
        const [updated, updatedChats] = await Promise.all([
          getMessages(selectedChat.id),
          getMyChats(),
        ]);
        setMessages(updated);
        setChats(updatedChats);
      }
    } catch (e: any) {
      setSendError(e.message || "Ошибка отправки голосового сообщения");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        Загрузка...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ marginBottom: 16 }}>Войдите, чтобы видеть чаты</div>
        <Link className="btn primary" href="/login">
          Войти
        </Link>
      </div>
    );
  }

  const activeInterlocutor = selectedChat ? getInterlocutor(selectedChat) : undefined;
  const activeListing = selectedChat?.listing;

  return (
    <div className="grid" style={{ alignItems: "stretch" }}>
      {/* ── Left column: chat list ── */}
      <aside
        className="card"
        style={{
          gridColumn: "span 4",
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: "70vh",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          Мои чаты
          {chats.length > 0 && (
            <span
              className="muted"
              style={{ fontWeight: 400, marginLeft: 8, fontSize: 14 }}
            >
              ({chats.length})
            </span>
          )}
        </div>

        {/* Chat list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {chats.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--muted)",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              У вас пока нет диалогов.
              <br />
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
                    padding: "12px 16px",
                    textAlign: "left",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    borderRadius: 0,
                    background: isSelected ? "var(--brand)" : "transparent",
                    color: isSelected ? "#fff" : "inherit",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <Avatar user={interlocutor} size={44} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Interlocutor name */}
                    <div
                      style={{
                        fontWeight: unreadCount > 0 && !isSelected ? 700 : 600,
                        fontSize: 14,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {interlocutor?.name || "Пользователь"}
                    </div>

                    {/* Listing title */}
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.7,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: 1,
                      }}
                    >
                      {chat.listing?.title || `Объявление #${chat.listingId}`}
                    </div>

                    {/* Last message preview */}
                    {lastMsg && (
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.6,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginTop: 3,
                        }}
                      >
                        {lastMsg.senderId === user.id ? "Вы: " : ""}
                        {lastMsg.audioUrl ? "🎙 Голосовое сообщение" : lastMsg.text}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    {/* Time of last message */}
                    {lastMsg && (
                      <div style={{ fontSize: 11, opacity: 0.55 }}>
                        {formatTime(lastMsg.createdAt)}
                      </div>
                    )}
                    {/* Unread badge */}
                    {unreadCount > 0 && !isSelected && (
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
                        }}
                      >
                        {unreadCount}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}
        >
          <Link
            className="btn"
            href="/me"
            style={{ width: "100%", textAlign: "center", display: "block" }}
          >
            ← В кабинет
          </Link>
        </div>
      </aside>

      {/* ── Right column: message thread ── */}
      <section
        className="card"
        style={{
          gridColumn: "span 8",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          minHeight: "70vh",
          overflow: "hidden",
        }}
      >
        {selectedChat || (listingIdParam && receiverIdParam) ? (
          <>
            {/* Thread header */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Avatar user={activeInterlocutor} size={40} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {activeInterlocutor?.name || "Пользователь"}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {activeListing?.title ||
                    (listingIdParam
                      ? `Объявление #${listingIdParam}`
                      : `Объявление #${selectedChat?.listingId}`)}
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                background: "var(--soft)",
              }}
            >
              {messages.length === 0 ? (
                <div
                  style={{
                    margin: "auto",
                    textAlign: "center",
                    color: "var(--muted)",
                    fontSize: 14,
                  }}
                >
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
                          padding: m.audioUrl ? "8px 12px" : "10px 14px",
                          borderRadius: isMine
                            ? "16px 16px 4px 16px"
                            : "16px 16px 16px 4px",
                          background: isMine ? "var(--brand)" : "#fff",
                          color: isMine ? "#fff" : "inherit",
                          maxWidth: "72%",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                          wordBreak: "break-word",
                        }}
                      >
                        {m.audioUrl ? (
                          <AudioPlayer src={m.audioUrl} isMine={isMine} />
                        ) : (
                          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                            {m.text}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: 10,
                            marginTop: 4,
                            opacity: 0.65,
                            textAlign: "right",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 2,
                          }}
                        >
                          {new Date(m.createdAt).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          <ReadStatus message={m} isMine={isMine} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Send error */}
            {sendError && (
              <div
                style={{
                  padding: "8px 16px",
                  background: "#fef2f2",
                  borderTop: "1px solid #fecaca",
                  color: "#dc2626",
                  fontSize: 13,
                }}
              >
                {sendError}
              </div>
            )}

            {/* Input area */}
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
              }}
            >
              <textarea
                rows={1}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  resize: "none",
                  borderRadius: 20,
                  fontSize: 14,
                  lineHeight: 1.4,
                  border: "1px solid var(--border)",
                  outline: "none",
                  fontFamily: "inherit",
                  background: "var(--soft)",
                }}
                placeholder="Введите сообщение... (Enter — отправить)"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <MicButton onAudioReady={handleAudioReady} disabled={sending} />
              <button
                className="btn primary"
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                style={{
                  borderRadius: 20,
                  paddingLeft: 20,
                  paddingRight: 20,
                  alignSelf: "flex-end",
                  opacity: sending || !newMessage.trim() ? 0.6 : 1,
                }}
              >
                {sending ? "..." : "Отправить"}
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              gap: 12,
              padding: 40,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48 }}>💬</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "inherit" }}>
              Выберите диалог
            </div>
            <div style={{ fontSize: 14 }}>
              Нажмите на чат слева или начните переписку из карточки товара
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
