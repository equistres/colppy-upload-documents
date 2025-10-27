import { useState, useEffect, useMemo } from 'react';

const useFeatureFlag = (flagName, userId, customProperties = {}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Memoizar customProperties para evitar re-renders innecesarios
  const memoizedProps = useMemo(() => customProperties, [JSON.stringify(customProperties)]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let mounted = true;
    let attempts = 0;
    const maxAttempts = 40;

    const checkFlag = () => {
      attempts++;

      if (window.mixpanel && attempts === 1) {
        window.mixpanel.identify(userId);
        window.mixpanel.people.set({
          $email: userId,
          email: userId,
          ...memoizedProps
        });
      }

      if (window.mixpanel?.flags?.is_enabled) {
        if (attempts < 3) {
          setTimeout(checkFlag, 250);
          return;
        }

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
  }, [flagName, userId, memoizedProps]);

  return [isEnabled, isLoading];
};

export default useFeatureFlag;
