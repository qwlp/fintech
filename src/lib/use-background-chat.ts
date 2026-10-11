import { useRef, useState } from "react";

type ChatRequest = { text: string; chatId?: string };
type ChatFailure = ChatRequest & { message: string };
export const chatFailureMessage =
  "The response couldn’t be completed. Check saved changes and Payments before retrying.";

// Owned by the workspace, so changing pages does not reset an in-flight request.
export function useBackgroundChat(
  execute: (request: ChatRequest) => Promise<void>,
  notify: (message: string) => void,
) {
  const busy = useRef(false);
  const [pending, setPending] = useState<ChatRequest | null>(null);
  const [failure, setFailure] = useState<ChatFailure | null>(null);
  const send = async (text: string, chatId?: string): Promise<boolean> => {
    text = text.trim();
    if (!text || busy.current) return false;
    const request = { text, chatId };
    busy.current = true;
    setPending(request);
    setFailure(null);
    try {
      await execute(request);
      notify("AI reply ready in AI Agent");
      return true;
    } catch {
      setFailure({ ...request, message: chatFailureMessage });
      notify(chatFailureMessage);
      return false;
    } finally {
      busy.current = false;
      setPending(null);
    }
  };
  return { pending, failure, send };
}
