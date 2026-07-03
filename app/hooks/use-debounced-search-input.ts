import { type ChangeEvent, useEffect, useRef, useState } from "react";

/**
 * Controlled text input backed by a URL search param, with debounced commits.
 *
 * Typing updates local state instantly (responsive input, no cursor jump) while
 * the `commit` navigation is debounced, so each keystroke doesn't fire its own
 * worker round trip. The input re-syncs when `value` changes from outside (back/
 * forward navigation, filter reset).
 */
export function useDebouncedSearchInput(
  value: string,
  commit: (next: string) => void,
  delayMs = 300,
) {
  const [inputValue, setInputValue] = useState(value);
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setInputValue(next);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => commitRef.current(next), delayMs);
  };

  return [inputValue, onChange] as const;
}
