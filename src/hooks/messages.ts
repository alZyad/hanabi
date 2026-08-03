import { useEffect, useState } from "react";
import { subscribeToMessages } from "~/lib/firebase";
import { IMessage } from "~/lib/state";

export interface UseMessagesResult {
  messages: IMessage[];
  loaded: boolean;
}

export function useMessages(gameId: string): UseMessagesResult {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    return subscribeToMessages(gameId, (nextMessages) => {
      setMessages(nextMessages);
      setLoaded(true);
    });
  }, [gameId]);

  return { messages, loaded };
}
