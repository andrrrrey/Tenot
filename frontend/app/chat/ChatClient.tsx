"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMe } from "@/hooks/useMe";
import { getMyChats, getMessages, sendMessage, type Chat, type Message } from "@/services/chat";

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

  // Редирект на логин если не авторизован
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Загрузка списка чатов
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    getMyChats()
      .then((data) => {
        setChats(data);

        // Если есть chatId в параметрах, выбираем этот чат
        if (chatIdParam) {
          const found = data.find((c) => c.id === Number(chatIdParam));
          if (found) setSelectedChat(found);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, chatIdParam]);

  // Загрузка сообщений при выборе чата
  useEffect(() => {
    if (!selectedChat) return;

    getMessages(selectedChat.id)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [selectedChat]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    // Если нет выбранного чата, но есть listingId и receiverId - создаем новый
    if (!selectedChat && listingIdParam && receiverIdParam) {
      setSending(true);
      try {
        await sendMessage({
          listingId: Number(listingIdParam),
          receiverId: Number(receiverIdParam),
          text: newMessage.trim(),
        });
        setNewMessage("");
        // Перезагружаем чаты
        const updatedChats = await getMyChats();
        setChats(updatedChats);
        // Находим новый чат
        const newChat = updatedChats.find(
          (c) => c.listingId === Number(listingIdParam)
        );
        if (newChat) setSelectedChat(newChat);
      } catch (e: any) {
        alert(e.message || "Ошибка отправки сообщения");
      } finally {
        setSending(false);
      }
      return;
    }

    if (!selectedChat) return;

    setSending(true);
    try {
      await sendMessage({
        listingId: selectedChat.listingId,
        receiverId:
          user?.id === selectedChat.buyerId
            ? selectedChat.supplierId
            : selectedChat.buyerId,
        text: newMessage.trim(),
      });
      setNewMessage("");
      // Перезагружаем сообщения
      const updated = await getMessages(selectedChat.id);
      setMessages(updated);
    } catch (e: any) {
      alert(e.message || "Ошибка отправки сообщения");
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return <div className="card">Загрузка...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="grid">
      {/* Список чатов */}
      <aside
        className="card"
        style={{ gridColumn: "span 4", maxHeight: "70vh", overflow: "auto" }}
      >
        <div className="h2">Мои чаты</div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {chats.length === 0 ? (
            <div className="muted">Нет чатов</div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                className="btn"
                style={{
                  textAlign: "left",
                  background:
                    selectedChat?.id === chat.id ? "var(--brand)" : undefined,
                  color: selectedChat?.id === chat.id ? "#fff" : undefined,
                }}
                onClick={() => setSelectedChat(chat)}
              >
                Чат #{chat.id} (объявление {chat.listingId})
              </button>
            ))
          )}
        </div>
        <Link className="btn" href="/me" style={{ marginTop: 16 }}>
          Назад в кабинет
        </Link>
      </aside>

      {/* Окно чата */}
      <section className="card" style={{ gridColumn: "span 8" }}>
        {selectedChat || (listingIdParam && receiverIdParam) ? (
          <>
            <div className="h2">
              {selectedChat
                ? `Чат по объявлению #${selectedChat.listingId}`
                : `Новый чат по объявлению #${listingIdParam}`}
            </div>

            <div
              style={{
                marginTop: 12,
                maxHeight: 400,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 10,
                background: "var(--soft)",
                borderRadius: 8,
              }}
            >
              {messages.length === 0 ? (
                <div className="muted">Нет сообщений. Напишите первым!</div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                      background:
                        m.senderId === Number(user.id) ? "#dbeafe" : "#fff",
                      alignSelf:
                        m.senderId === Number(user.id)
                          ? "flex-end"
                          : "flex-start",
                      maxWidth: "70%",
                    }}
                  >
                    <div>{m.text}</div>
                    <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
                      {new Date(m.createdAt).toLocaleString("ru-RU")}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="Введите сообщение..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button
                className="btn primary"
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
              >
                {sending ? "..." : "Отправить"}
              </button>
            </div>
          </>
        ) : (
          <div className="muted">Выберите чат из списка слева</div>
        )}
      </section>
    </div>
  );
}
