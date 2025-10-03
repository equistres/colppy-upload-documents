import { useRef, useCallback, useMemo } from 'react';

const useTimeoutManager = () => {
  const timeoutRefs = useRef([]);

  const addTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(() => {
      callback();
      timeoutRefs.current = timeoutRefs.current.filter(id => id !== timeoutId);
    }, delay);
    timeoutRefs.current.push(timeoutId);
    return timeoutId;
  }, []);

  const clearTimeoutById = useCallback((timeoutId) => {
    clearTimeout(timeoutId);
    timeoutRefs.current = timeoutRefs.current.filter(id => id !== timeoutId);
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current = [];
  }, []);

  return useMemo(() => ({ addTimeout, clearTimeoutById, clearAllTimeouts }), [addTimeout, clearTimeoutById, clearAllTimeouts]);
};

export default useTimeoutManager;