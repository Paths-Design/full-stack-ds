import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPagedSet, type PagedSetOptions } from "../paging.js";
export function usePagedSet(options: PagedSetOptions) {
  const controller = useRef<ReturnType<typeof createPagedSet> | null>(null);
  if (!controller.current) controller.current = createPagedSet();
  const pagedSet = controller.current;
  useSyncExternalStore(pagedSet.subscribe, () => pagedSet.state, () => pagedSet.state);
  useEffect(() => { pagedSet.sync(options); });
  return pagedSet;
}
