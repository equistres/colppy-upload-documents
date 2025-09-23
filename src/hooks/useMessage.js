import { useState, useCallback } from 'react';

const TIMEOUTS = {
  MESSAGE_DURATION: 3000
};

const useMessage = (timeoutManager) => {
  const [message, setMessage] = useState('');

  const showMessage = useCallback((text, duration = TIMEOUTS.MESSAGE_DURATION) => {
    setMessage(text);
    timeoutManager.addTimeout(() => setMessage(''), duration);
  }, [timeoutManager]);

  return { message, showMessage };
};

export default useMessage;