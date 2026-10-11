import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { Assistant, type ChatMessage } from "../src/Chat";
import { useBackgroundChat } from "../src/lib/use-background-chat";
import "../src/styles.css";
import "../src/components/ui/ui.css";

function Preview() {
  const [page, setPage] = useState("AI Agent");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState("");
  const background = useBackgroundChat(async ({ text }) => {
    const response = await fetch("/background-chat-reply", {
      method: "POST",
      body: text,
    });
    if (!response.ok) throw new Error("Request failed");
    setMessages((previous) => [
      ...previous,
      { from: "user", text },
      { from: "agent", text: "Saved your tuition and rent changes." },
    ]);
  }, setNotice);
  return (
    <main>
      <nav>
        {["AI Agent", "Move Planner", "Profile"].map((item) => (
          <button key={item} onClick={() => setPage(item)}>
            {item}
          </button>
        ))}
      </nav>
      <p role="status">
        {background.pending ? "AI working in background" : notice}
      </p>
      {page === "AI Agent" ? (
        <Assistant
          messages={messages}
          aiEnabled
          backgroundPending={background.pending?.text ?? ""}
          backgroundBusy={!!background.pending}
          backgroundError={background.failure?.message ?? ""}
          onSend={(text) => background.send(text)}
          onNew={() => setMessages([])}
          onHistory={() => {}}
        />
      ) : (
        <h1>{page}</h1>
      )}
    </main>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(<Preview />);
