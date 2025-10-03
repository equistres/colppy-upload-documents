import { useState, useCallback, useRef, useEffect } from 'react';

const TIMEOUTS = {
  MESSAGE_DURATION: 3000
};

const useMessage = () => {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef(null);

  const showMessage = useCallback((text, duration = TIMEOUTS.MESSAGE_DURATION) => {
    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setMessage(text);

    // Crear nuevo timeout si hay texto
    if (text) {
      timeoutRef.current = setTimeout(() => {
        setMessage('');
        timeoutRef.current = null;
      }, duration);
    }
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { message, showMessage };
};

export default useMessage;