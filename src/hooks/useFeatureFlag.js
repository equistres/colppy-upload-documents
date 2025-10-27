import { useState, useEffect } from 'react';

const useFeatureFlag = (flagName, userId) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      // Mantener isLoading = true hasta que llegue el userId
      return;
    }

    let mounted = true;
    let attempts = 0;
    const maxAttempts = 40; // 10 segundos (40 * 250ms)

    const checkFlag = () => {
      attempts++;

      // Identificar usuario en Mixpanel
      if (window.mixpanel && attempts === 1) {
        window.mixpanel.identify(String(userId));
        window.mixpanel.people.set({
          empresa_id: String(userId)
        });
      }

      // Verificar si Mixpanel.flags está disponible
      if (window.mixpanel?.flags?.is_enabled) {
        window.mixpanel.flags.is_enabled(flagName, false)
          .then(enabled => {
            if (mounted) {
              setIsEnabled(enabled);
              setIsLoading(false);
            }
          })
          .catch(() => {
            if (mounted) {
              setIsEnabled(false);
              setIsLoading(false);
            }
          });
      } else if (attempts >= maxAttempts) {
        if (mounted) {
          setIsEnabled(false);
          setIsLoading(false);
        }
      } else {
        setTimeout(checkFlag, 250);
      }
    };

    checkFlag();

    return () => {
      mounted = false;
    };
  }, [flagName, userId]);

  return [isEnabled, isLoading];
};

export default useFeatureFlag;
