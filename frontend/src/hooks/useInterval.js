// src/hooks/useInterval.js
import { useEffect, useRef } from "react";

export default function useInterval(callback, delay) {
  const savedCallback = useRef();

  // 최신 콜백 저장
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => {
      if (savedCallback.current) savedCallback.current();
    }, delay);
    return () => clearInterval(id);
  }, [delay]);
}
