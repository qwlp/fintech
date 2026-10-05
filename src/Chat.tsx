import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, ArrowUpRight, Bot, Clock, MessageSquare, Plus, Search, Wallet, GraduationCap, House, ChartNoAxesCombined } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";

export type ChatMessage = { _id: string; from: "agent" | "user"; text: string; timestamp?: number; chatId?: string };
const prompts = [
  { icon: Wallet, label: "Everyday spending", text: "How much can I safely spend each month?" },
  { icon: ChartNoAxesCombined, label: "Funding check", text: "Explain my current funding gap" },
  { icon: GraduationCap, label: "Upcoming payments", text: "What should I pay next?" },
  { icon: House, label: "Explore a change", text: "How will a £900 rent change my runway?" },
];

export function Assistant({ messages, onSend, onNew, onHistory }: {
  messages: ChatMessage[]; onSend: (text: string) => Promise<boolean>; onNew: () => void; onHistory: () => void;
}) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const busy = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [messages.length, pending]);
  const send = async (text: string) => {
    text = text.trim();
    if (!text || busy.current) return;
    busy.current = true;
    setPending(text); setInput(""); setError("");
    try {
      if (!await onSend(text)) { setInput(text); setError("Your message couldn’t be sent. Please try again."); }
    } catch { setInput(text); setError("Your message couldn’t be sent. Please try again."); }
    finally { busy.current = false; setPending(""); textarea.current?.focus(); }
  };
  return <div className="assistant-page">
    <div className="assistant-toolbar">
      <div className="assistant-identity"><span className="assistant-mark"><Bot size={19} /></span><div><strong>Plan assistant</strong><small>Study plan & budget</small></div></div>
      <div><Button variant="ghost" size="sm" onClick={onHistory} disabled={!!pending}><Clock /> History</Button><Button variant="outline" size="sm" onClick={onNew} disabled={!!pending}><Plus /> New chat</Button></div>
    </div>
    <div className="assistant-scroll" ref={scroll}>
      {!messages.length && !pending ? <div className="assistant-welcome">
        <span className="assistant-welcome-icon"><Bot size={28} /></span>
        <span className="assistant-eyebrow">A clearer path to studying abroad</span>
        <h1>Let’s make a plan.</h1>
        <p>Understand your budget, check your funding, or work through what comes next.</p>
        <div className="assistant-prompts">{prompts.map(({ icon: Icon, label, text }) => <button key={label} onClick={() => void send(text)}><Icon size={20} /><strong>{label}</strong><span>{text}</span><ArrowUpRight size={16} /></button>)}</div>
      </div> : <div className="assistant-messages" role="log" aria-label="Conversation">
        {messages.map((message) => <article key={message._id} className={`assistant-message ${message.from}`}><span className="assistant-author">{message.from === "agent" ? <><Bot size={16} /> Plan assistant</> : "You"}</span>{message.from === "agent" ? <div className="assistant-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
          a: ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>,
          table: ({ children, ...props }) => <div className="assistant-table-scroll"><table {...props}>{children}</table></div>,
          img: () => null,
        }}>{message.text}</ReactMarkdown></div> : <p>{message.text}</p>}</article>)}
        {pending && <><article className="assistant-message user"><span className="assistant-author">You</span><p>{pending}</p></article><div className="assistant-thinking" role="status"><span /><span /><span /> Thinking through your plan…</div></>}
      </div>}
    </div>
    <div className="assistant-composer-area">
      <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); void send(input); }}>
        <Textarea ref={textarea} aria-label="Message your plan assistant" placeholder="Ask anything about your study plan…" value={input} maxLength={4000} disabled={!!pending}
          onChange={(event) => { setInput(event.target.value); event.target.style.height = "auto"; event.target.style.height = Math.min(event.target.scrollHeight, 180) + "px"; }}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(input); } }} />
        <div className="assistant-composer-footer"><span>Enter to send · Shift + Enter for a new line</span><Button type="submit" size="icon" aria-label="Send message" disabled={!!pending || !input.trim()}><ArrowUp size={19} /></Button></div>
      </form>
      {error && <p className="assistant-error" role="alert">{error}</p>}
      <small className="assistant-note">Check important details. You stay in control of every payment.</small>
    </div>
  </div>;
}

export function ChatHistory({ messages, onOpen, onNew, onBack }: {
  messages: ChatMessage[]; onOpen: (id?: string) => void; onNew: () => void; onBack?: () => void;
}) {
  const [search, setSearch] = useState("");
  const groups = new Map<string, ChatMessage[]>();
  for (const message of messages) {
    const key = message.chatId ?? "legacy";
    groups.set(key, [...(groups.get(key) ?? []), message]);
  }
  const chats = [...groups.entries()].map(([id, items]) => ({
    id, title: items.find((item) => item.from === "user")?.text ?? "Your study plan",
    preview: (items.at(-1)?.text ?? "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*#`>]/g, "").replace(/\s+/g, " ").trim(), date: items.at(-1)?.timestamp, count: items.filter((item) => item.from === "user").length,
  })).sort((a, b) => (b.date ?? 0) - (a.date ?? 0))
    .filter((chat) => `${chat.title} ${chat.preview}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="chat-history-page">
    {onBack && <Button variant="ghost" size="sm" onClick={onBack} className="history-back"><ArrowLeft /> Back to chat</Button>}
    <div className="chat-history-heading"><div><h1>Chat history</h1><p>Revisit a conversation or start something new.</p></div><Button variant="outline" onClick={onNew}><Plus /> New chat</Button></div>
    <div className="chat-history-search"><Search size={18} /><Input aria-label="Search conversations" placeholder="Search conversations…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    <div className="chat-history-list">{chats.map((chat) => <button key={chat.id} onClick={() => onOpen(chat.id === "legacy" ? undefined : chat.id)}><span className="history-icon"><MessageSquare size={20} /></span><div><strong>{chat.title}</strong><p>{chat.preview}</p><small>{chat.date ? new Date(chat.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Earlier conversation"} · {chat.count} {chat.count === 1 ? "message" : "messages"}</small></div><ArrowUpRight size={18} /></button>)}</div>
    {!chats.length && <div className="chat-history-empty"><MessageSquare size={32} /><h2>{search ? "No matching conversations" : "A fresh start"}</h2><p>{search ? "Try a different search." : "Your conversations will appear here after your first message."}</p>{!search && <Button variant="outline" onClick={onNew}>Start a conversation</Button>}</div>}
  </section>;
}
