import { createContext, useContext, useMemo, type ReactNode } from "react";
import { mergeFsdsMessageCatalogs, resolveFsdsMessages, type FsdsMessageCatalog } from "./message-format.js";

export { formatFsdsMessage, mergeFsdsMessageCatalogs, resolveFsdsMessages, type FsdsMessageCatalog } from "./message-format.js";

const FsdsMessagesContext = createContext<FsdsMessageCatalog | undefined>(undefined);

export interface FsdsMessagesProviderProps {
  messages: FsdsMessageCatalog;
  children?: ReactNode;
}

/** Supplies translated component text to every generated component below it. */
export function FsdsMessagesProvider({ messages, children }: FsdsMessagesProviderProps) {
  const outer = useContext(FsdsMessagesContext);
  const value = useMemo(() => mergeFsdsMessageCatalogs(outer, messages), [outer, messages]);
  return <FsdsMessagesContext.Provider value={value}>{children}</FsdsMessagesContext.Provider>;
}

/** A component's resolved messages: provider entries over contract defaults. */
export function useFsdsMessages<T extends Record<string, string>>(component: string, defaults: T): T {
  const catalog = useContext(FsdsMessagesContext);
  return useMemo(() => resolveFsdsMessages(catalog, component, defaults), [catalog, component, defaults]);
}
