import { isString } from "lodash";
import { useState } from "react";
import { z } from "zod";

export default function useLocalStorage<T>(
  key: string,
  initialValue: T,
  schema?: z.ZodType<T>
): [T, (value: T) => void] {
  function isServerSide() {
    return typeof window === "undefined";
  }

  function coerce(value: unknown): T {
    if (!schema) return value as T;
    const result = schema.safeParse(value);
    return result.success ? result.data : initialValue;
  }

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (isServerSide()) {
        return initialValue;
      }
      const item = window.localStorage.getItem(key);

      if (!item && initialValue !== null) {
        window.localStorage.setItem(key, JSON.stringify(initialValue));
      }

      try {
        return coerce(item ? JSON.parse(item) : initialValue);
      } catch (err) {
        // Some legacy items are stored as raw strings instead of JSON strings.
        // Restore it as a JSON string and return it.
        if (isString(item)) {
          const coerced = coerce(item);
          window.localStorage.setItem(key, JSON.stringify(coerced));
          return coerced;
        }
        return initialValue;
      }
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });
  if (typeof window === "undefined") {
    return [
      initialValue,
      () => {
        /* No op */
      },
    ];
  }

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (!isServerSide()) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}
