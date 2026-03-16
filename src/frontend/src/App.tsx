import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MessageCircleHeart, Send, Settings, Smile, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "./backend.d";
import { useGetMessages, usePostMessage } from "./hooks/useQueries";

const queryClient = new QueryClient();

const AVATAR_COLORS = [
  "bg-rose-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-violet-400",
  "bg-pink-400",
  "bg-orange-400",
  "bg-teal-400",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(timestamp: bigint): string {
  const ms = Number(timestamp / 1_000_000n);
  const date = new Date(ms);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBubble({
  message,
  isSelf,
  index,
}: { message: Message; isSelf: boolean; index: number }) {
  const initials = message.senderName.slice(0, 2).toUpperCase();
  const avatarColor = getAvatarColor(message.senderName);

  return (
    <motion.div
      data-ocid={`chat.item.${index + 1}`}
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`flex items-end gap-2 ${
        isSelf ? "flex-row-reverse" : "flex-row"
      } group`}
    >
      {!isSelf && (
        <Avatar className="w-8 h-8 flex-shrink-0 mb-1">
          <AvatarFallback
            className={`${avatarColor} text-white text-xs font-semibold`}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`flex flex-col gap-0.5 max-w-[70%] ${isSelf ? "items-end" : "items-start"}`}
      >
        {!isSelf && (
          <span className="text-xs font-semibold text-muted-foreground px-1">
            {message.senderName}
          </span>
        )}
        <div
          className={`relative px-4 py-2.5 shadow-bubble ${
            isSelf
              ? "bubble-self rounded-2xl rounded-br-sm"
              : "bubble-other border border-border rounded-2xl rounded-bl-sm"
          }`}
        >
          <p className="text-sm leading-relaxed break-words">{message.text}</p>
        </div>
        <span
          className={`text-[10px] text-muted-foreground px-1 opacity-0 group-hover:opacity-100 transition-opacity ${
            isSelf ? "text-right" : "text-left"
          }`}
        >
          {formatTime(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

function NicknameDialog({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      onSave(trimmed);
    }
  }, [name, onSave]);

  return (
    <Dialog open>
      <DialogContent
        data-ocid="nickname.dialog"
        className="max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-bubble">
              <MessageCircleHeart className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <DialogTitle className="font-display text-2xl text-center">
            Welcome to the chat! 👋
          </DialogTitle>
          <DialogDescription className="text-center">
            What should your friends call you?
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Label htmlFor="nickname" className="sr-only">
            Your nickname
          </Label>
          <Input
            id="nickname"
            data-ocid="nickname.input"
            placeholder="Enter your nickname..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
            className="text-center text-base"
            maxLength={30}
          />
        </div>
        <DialogFooter>
          <Button
            data-ocid="nickname.submit_button"
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full"
          >
            Join the chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function dedupe(server: Message[], optimistic: Message[]): Message[] {
  if (optimistic.length === 0) return server;
  const serverSet = new Set(server.map((m) => `${m.senderName}::${m.text}`));
  const filtered = optimistic.filter(
    (m) => !serverSet.has(`${m.senderName}::${m.text}`),
  );
  return [...server, ...filtered].sort((a, b) =>
    Number(a.timestamp - b.timestamp),
  );
}

function ChatApp() {
  const [nickname, setNickname] = useState<string | null>(() => {
    return localStorage.getItem("chatNickname");
  });
  const [inputText, setInputText] = useState("");
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevLengthRef = useRef(0);

  const { data: serverMessages = [], isLoading } = useGetMessages();
  const postMessage = usePostMessage();

  const dedupedMessages = dedupe(serverMessages, optimisticMessages);

  // Auto-scroll on new messages
  useEffect(() => {
    if (dedupedMessages.length !== prevLengthRef.current) {
      prevLengthRef.current = dedupedMessages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  });

  // Clean up confirmed optimistic messages
  useEffect(() => {
    if (optimisticMessages.length === 0) return;
    const serverSet = new Set(
      serverMessages.map((m) => `${m.senderName}::${m.text}`),
    );
    const remaining = optimisticMessages.filter(
      (m) => !serverSet.has(`${m.senderName}::${m.text}`),
    );
    if (remaining.length !== optimisticMessages.length) {
      setOptimisticMessages(remaining);
    }
  }, [serverMessages, optimisticMessages]);

  const handleSaveNickname = (name: string) => {
    localStorage.setItem("chatNickname", name);
    setNickname(name);
  };

  const handleChangeNickname = () => {
    localStorage.removeItem("chatNickname");
    setNickname(null);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !nickname) return;
    setInputText("");

    const optimistic: Message = {
      senderName: nickname,
      text,
      timestamp: BigInt(Date.now()) * 1_000_000n,
    };
    setOptimisticMessages((prev) => [...prev, optimistic]);
    postMessage.mutate({ senderName: nickname, text });
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {!nickname && <NicknameDialog onSave={handleSaveNickname} />}

      <div className="flex flex-col h-screen chat-bg overflow-hidden">
        {/* Header */}
        <header
          className="flex items-center justify-between px-4 py-3 shadow-header"
          style={{ backgroundColor: "oklch(var(--header-bg))" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Users
                className="w-5 h-5"
                style={{ color: "oklch(var(--header-fg))" }}
              />
            </div>
            <div>
              <h1
                className="font-display text-lg font-semibold leading-tight"
                style={{ color: "oklch(var(--header-fg))" }}
              >
                Friends Chat
              </h1>
              {nickname && (
                <p
                  className="text-xs opacity-80"
                  style={{ color: "oklch(var(--header-fg))" }}
                >
                  You are <span className="font-semibold">{nickname}</span>
                </p>
              )}
            </div>
          </div>

          <Button
            data-ocid="settings.button"
            variant="ghost"
            size="icon"
            onClick={handleChangeNickname}
            className="rounded-full hover:bg-white/20 transition-colors"
            style={{ color: "oklch(var(--header-fg))" }}
            title="Change nickname"
          >
            <Settings className="w-4.5 h-4.5" />
          </Button>
        </header>

        {/* Message list */}
        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div
            data-ocid="chat.message_list"
            className="max-w-2xl mx-auto flex flex-col gap-3"
          >
            <AnimatePresence initial={false}>
              {isLoading && dedupedMessages.length === 0 && (
                <motion.div
                  data-ocid="chat.loading_state"
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                    <MessageCircleHeart className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Loading messages...
                  </p>
                </motion.div>
              )}

              {!isLoading && dedupedMessages.length === 0 && (
                <motion.div
                  data-ocid="chat.empty_state"
                  key="empty"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 gap-4"
                >
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-200 to-amber-200 flex items-center justify-center shadow-bubble">
                      <Smile className="w-10 h-10 text-rose-500" />
                    </div>
                    <span className="absolute -top-1 -right-1 text-2xl">
                      ✨
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-xl font-semibold text-foreground mb-1">
                      No messages yet!
                    </p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Be the first to say hello — your friends are waiting 💬
                    </p>
                  </div>
                </motion.div>
              )}

              {dedupedMessages.map((message, i) => (
                <MessageBubble
                  key={`${message.senderName}-${String(message.timestamp)}-${i}`}
                  message={message}
                  isSelf={message.senderName === nickname}
                  index={i}
                />
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input bar */}
        <footer className="px-4 py-3 bg-card/80 backdrop-blur-sm border-t border-border">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            {nickname && (
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback
                  className={`${getAvatarColor(nickname)} text-white text-xs font-semibold`}
                >
                  {nickname.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <Input
              ref={inputRef}
              data-ocid="chat.input"
              placeholder="Type a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 rounded-full bg-background border-border focus-visible:ring-primary/50"
              maxLength={500}
              disabled={!nickname}
            />
            <Button
              data-ocid="chat.send_button"
              onClick={handleSend}
              disabled={!inputText.trim() || !nickname || postMessage.isPending}
              size="icon"
              className="rounded-full w-10 h-10 flex-shrink-0 shadow-bubble"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </footer>
      </div>

      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatApp />
    </QueryClientProvider>
  );
}
