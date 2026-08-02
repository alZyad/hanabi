import { useEffect, useState } from "react";
import { subscribeToMessages } from "~/lib/firebase";
import { IMessage } from "~/lib/state";

export function useMessages(gameId: string): IMessage[] {
  const [messages, setMessages] = useState<IMessage[]>([]);

  useEffect(() => {
    return subscribeToMessages(gameId, setMessages);
  }, [gameId]);

  return messages;
}
