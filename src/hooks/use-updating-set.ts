import { useCallback, useState } from "react";

export function useUpdatingSet(initial?: Iterable<string>) {
  const [set, setSet] = useState<Set<string>>(new Set(initial));

  const add = useCallback((id: string) => {
    setSet((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSet((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const has = useCallback((id: string) => set.has(id), [set]);

  return { set, add, remove, has } as const;
}
