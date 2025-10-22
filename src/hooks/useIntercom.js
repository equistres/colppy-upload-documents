import { useEffect } from 'react';

/**
 * Hook para inicializar y manejar Intercom
 * @param {string} appId - ID de la app de Intercom
 * @param {Object} userData - Datos del usuario
 */
export const useIntercom = (appId, userData = {}) => {
  useEffect(() => {
    if (!appId) {
      console.warn('Intercom: No se proporcionó app_id');
      return;
    }

    // Configurar settings globales de Intercom
    window.intercomSettings = {
      api_base: "https://api-iam.intercom.io",
      app_id: appId,
      ...userData
    };

    // Verificar si Intercom ya está cargado
    if (window.Intercom) {
      // Si ya existe, actualizar
      window.Intercom('update', window.intercomSettings);
    } else {
      // Si no existe, el script se cargará automáticamente desde index.html
      console.log('Intercom: Esperando que el script se cargue...');
    }

    // Cleanup al desmontar
    return () => {
      if (window.Intercom) {
        window.Intercom('shutdown');
      }
    };
  }, [appId, userData]);

  // Métodos útiles de Intercom
  const intercomMethods = {
    // Mostrar el messenger
    show: () => window.Intercom?.('show'),

    // Ocultar el messenger
    hide: () => window.Intercom?.('hide'),

    // Mostrar un mensaje específico
    showNewMessage: (message) => window.Intercom?.('showNewMessage', message),

    // Iniciar un tour específico
    startTour: (tourId) => window.Intercom?.('startTour', tourId),

    // Trackear un evento
    trackEvent: (eventName, metadata) => window.Intercom?.('trackEvent', eventName, metadata),

    // Actualizar usuario
    update: (data) => window.Intercom?.('update', data)
  };

  return intercomMethods;
};

export default useIntercom;
