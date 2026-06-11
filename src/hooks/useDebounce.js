import { useState, useEffect } from "react";

/**
 * Returns a debounced copy of `value` that only updates after
 * `delay` ms of silence. Ideal for search inputs where you want
 * to avoid firing API calls on every keystroke.
 *
 * @param {*}      value - The value to debounce (string, number, etc.)
 * @param {number} delay - Debounce delay in milliseconds (default 400ms)
 * @returns The debounced value
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancel the timer if value changes before delay expires
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
