import { Dialog } from "radix-ui";
import AgentCalculation, { type ToolResult } from "./AgentCalculation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Bot,
  Clock,
  MessageSquare,
  Plus,
  Search,
  Wallet,
  GraduationCap,
  House,
  ChartNoAxesCombined,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";

export type ChatMessage = {
  _id: string;
  from: "agent" | "user";
  text: string;
  timestamp?: number;
  chatId?: string;
  toolResults?: ToolResult[];
};
const prompts = [
  {
    icon: Wallet,
    label: "Budget",
    text: "How much can I safely spend each month?",
  },
  {
    icon: ChartNoAxesCombined,
    label: "Currency impact",
    text: "What happens to my available funds if my home currencies fall 10% against my study currency?",
  },
  {
    icon: GraduationCap,
    label: "Tuition",
    text: "Compare my tuition payment routes against my saved deadline. Explain the safest eligible route, living-cost reserve and any funding gap.",
  },
  {
    icon: House,
    label: "Rent",
    text: "How will a monthly rent of 900 in my study currency change my runway?",
  },
];

export function Assistant({
  messages,
  onSend,
  onNew,
  onHistory,
  aiEnabled = true,
  onConsent,
  tour,
}: {
  tour?: ReactNode;
  aiEnabled?: boolean;
  onConsent?: (enabled: boolean) => Promise<boolean>;
  messages: ChatMessage[];
  onSend: (text: string) => Promise<boolean>;
  onNew: () => void;
  onHistory: () => void;
}) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(!aiEnabled);
  const [consentPending, setConsentPending] = useState(false);
  const [consentError, setConsentError] = useState("");
  const busy = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!input && textarea.current) textarea.current.style.height = "auto";
  }, [input]);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages.length, pending]);
  const send = async (text: string) => {
    text = text.trim();
    if (!text || busy.current || !aiEnabled) return;
    busy.current = true;
    setPending(text);
    setInput("");
    setError("");
    try {
      if (!(await onSend(text))) {
        setInput(text);
        setError(
          "The response couldn’t be completed. Check Payments for any prepared proposal before retrying.",
        );
      }
    } catch {
      setInput(text);
      setError(
        "The response couldn’t be completed. Check Payments for any prepared proposal before retrying.",
      );
    } finally {
      busy.current = false;
      setPending("");
      textarea.current?.focus();
    }
  };
  return (
    <div className="assistant-page">
      <div className="assistant-toolbar">
        <div className="assistant-identity">
          <span className="assistant-mark">
            <Bot size={19} />
          </span>
          <div>
            <strong>Plan assistant</strong>
          </div>
        </div>
        <div className="assistant-toolbar-actions">
          {tour}
          {onConsent && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="AI privacy settings"
              title="AI privacy settings"
              onClick={() => setPrivacyOpen(true)}
            >
              <ShieldCheck />
              <span className="assistant-privacy-label">AI privacy</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-label="History"
            title="Chat history"
            onClick={onHistory}
            disabled={!!pending}
          >
            <Clock />
            <span className="assistant-action-label">History</span>
          </Button>
          <Button
            className="assistant-new-chat"
            variant="outline"
            size="sm"
            aria-label="New chat"
            title="New chat"
            onClick={onNew}
            disabled={!!pending}
          >
            <Plus />
            <span className="assistant-action-label">New chat</span>
          </Button>
        </div>
      </div>
      {onConsent && (
        <Dialog.Root open={privacyOpen} onOpenChange={setPrivacyOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="assistant-privacy-backdrop" />
            <Dialog.Content className="assistant-privacy-dialog">
              <span className="assistant-privacy-icon">
                <ShieldCheck size={24} />
              </span>
              <Dialog.Title>AI privacy</Dialog.Title>
              <Dialog.Description>
                Your messages, recent conversation and minimized financial
                summaries are sent to OpenRouter and its model provider.
              </Dialog.Description>
              <p className="assistant-privacy-status">
                {aiEnabled ? "AI processing enabled" : "AI processing disabled"}
              </p>
              <p className="assistant-privacy-hint">
                Avoid sharing passwords or bank account details. You can change
                this setting at any time.
              </p>
              {consentError && (
                <p className="assistant-error" role="alert">
                  {consentError}
                </p>
              )}
              <div className="assistant-privacy-actions">
                <Dialog.Close asChild>
                  <Button variant="outline">Done</Button>
                </Dialog.Close>
                <Button
                  disabled={!!pending || consentPending}
                  onClick={async () => {
                    setConsentPending(true);
                    setConsentError("");
                    try {
                      if (await onConsent(!aiEnabled)) setPrivacyOpen(false);
                      else
                        setConsentError(
                          "Could not update AI consent. Try again.",
                        );
                    } catch {
                      setConsentError(
                        "Could not update AI consent. Try again.",
                      );
                    } finally {
                      setConsentPending(false);
                    }
                  }}
                >
                  {consentPending
                    ? "Saving…"
                    : aiEnabled
                      ? "Disable AI processing"
                      : "Enable AI processing"}
                </Button>
              </div>
              <Dialog.Close asChild>
                <button
                  className="assistant-privacy-close"
                  aria-label="Close AI privacy settings"
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
      <div className="assistant-scroll" ref={scroll}>
        {!messages.length && !pending ? (
          <div className="assistant-welcome">
            <span className="assistant-welcome-icon">
              <Bot size={28} />
            </span>
            <h1>Let’s make a plan.</h1>
            <div className="assistant-prompts">
              {prompts.map(({ icon: Icon, label, text }) => (
                <button
                  key={label}
                  disabled={!aiEnabled}
                  onClick={() => void send(text)}
                >
                  <Icon size={20} />
                  <strong>{label}</strong>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="assistant-messages"
            role="log"
            aria-label="Conversation"
          >
            {messages.map((message) => (
              <article
                key={message._id}
                className={`assistant-message ${message.from}`}
              >
                <span className="assistant-author">
                  {message.from === "agent" ? (
                    <>
                      <Bot size={16} /> Plan assistant
                    </>
                  ) : (
                    "You"
                  )}
                </span>
                {message.from === "agent" ? (
                  <div className="assistant-markdown">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      skipHtml
                      components={{
                        a: ({ children, ...props }) => (
                          <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </a>
                        ),
                        table: ({ children, ...props }) => (
                          <div className="assistant-table-scroll">
                            <table {...props}>{children}</table>
                          </div>
                        ),
                        img: () => null,
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p>{message.text}</p>
                )}
                {message.from === "agent" &&
                  message.toolResults?.map((tool, index) => (
                    <AgentCalculation key={index} tool={tool} />
                  ))}
              </article>
            ))}
            {pending && (
              <>
                <article className="assistant-message user">
                  <span className="assistant-author">You</span>
                  <p>{pending}</p>
                </article>
                <div className="assistant-thinking" role="status">
                  <span />
                  <span />
                  <span /> Thinking through your plan…
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <div className="assistant-composer-area">
        <form
          className="assistant-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <Textarea
            ref={textarea}
            aria-label="Message your plan assistant"
            rows={1}
            title="Enter to send · Shift + Enter for a new line"
            placeholder="Ask anything about your plan…"
            value={input}
            maxLength={4000}
            disabled={!!pending || !aiEnabled}
            onChange={(event) => {
              setInput(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height =
                Math.min(event.target.scrollHeight, 180) + "px";
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void send(input);
              }
            }}
          />
          <div className="assistant-composer-footer">
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={!!pending || !input.trim() || !aiEnabled}
            >
              <ArrowUp size={19} />
            </Button>
          </div>
        </form>
        {error && (
          <p className="assistant-error" role="alert">
            {error}
          </p>
        )}
        <small className="assistant-note">
          <span className="assistant-note-desktop">
            You approve every payment.
          </span>
          <span className="assistant-note-mobile">
            You approve every payment.
          </span>
        </small>
      </div>
    </div>
  );
}

export function ChatHistory({
  messages,
  onOpen,
  onNew,
  onBack,
}: {
  messages: ChatMessage[];
  onOpen: (id?: string) => void;
  onNew: () => void;
  onBack?: () => void;
}) {
  const [search, setSearch] = useState("");
  const groups = new Map<string, ChatMessage[]>();
  for (const message of messages) {
    const key = message.chatId ?? "legacy";
    groups.set(key, [...(groups.get(key) ?? []), message]);
  }
  const chats = [...groups.entries()]
    .map(([id, items]) => ({
      id,
      title:
        items.find((item) => item.from === "user")?.text ?? "Your study plan",
      preview: (items.at(-1)?.text ?? "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*#`>]/g, "")
        .replace(/\s+/g, " ")
        .trim(),
      date: items.at(-1)?.timestamp,
      count: items.filter((item) => item.from === "user").length,
    }))
    .sort((a, b) => (b.date ?? 0) - (a.date ?? 0))
    .filter((chat) =>
      `${chat.title} ${chat.preview}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  return (
    <section className="chat-history-page">
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="history-back"
        >
          <ArrowLeft /> Back to chat
        </Button>
      )}
      <div className="chat-history-heading">
        <div>
          <h1>Chat history</h1>
          <p>Revisit a conversation or start something new.</p>
        </div>
        <Button variant="outline" onClick={onNew}>
          <Plus />
          <span className="assistant-action-label">New chat</span>
        </Button>
      </div>
      <div className="chat-history-search">
        <Search size={18} />
        <Input
          aria-label="Search conversations"
          placeholder="Search conversations…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="chat-history-list">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onOpen(chat.id === "legacy" ? undefined : chat.id)}
          >
            <span className="history-icon">
              <MessageSquare size={20} />
            </span>
            <div>
              <strong>{chat.title}</strong>
              <p>{chat.preview}</p>
              <small>
                {chat.date
                  ? new Date(chat.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Earlier conversation"}{" "}
                · {chat.count} {chat.count === 1 ? "message" : "messages"}
              </small>
            </div>
            <ArrowUpRight size={18} />
          </button>
        ))}
      </div>
      {!chats.length && (
        <div className="chat-history-empty">
          <MessageSquare size={32} />
          <h2>{search ? "No matching conversations" : "A fresh start"}</h2>
          <p>
            {search
              ? "Try a different search."
              : "Your conversations will appear here after your first message."}
          </p>
          {!search && (
            <Button variant="outline" onClick={onNew}>
              Start a conversation
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
