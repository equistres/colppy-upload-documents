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

    // Solo configurar si hay email (necesario para identificar usuario existente)
    if (!userData.email) {
      console.warn('Intercom: No se proporcionó email, no se puede identificar al usuario');
      return;
    }

    // Configurar settings globales de Intercom
    window.intercomSettings = {
      api_base: "https://api-iam.intercom.io",
      app_id: appId,
      email: userData.email, // Email es el identificador principal
      name: userData.name || userData.email,
      ...userData
    };

    // Verificar si Intercom ya está cargado
    if (window.Intercom) {
      // Si ya existe, usar boot para identificar correctamente
      window.Intercom('boot', window.intercomSettings);
    }

    // Cleanup al desmontar
    return () => {
      if (window.Intercom) {
        window.Intercom('shutdown');
      }
    };
  }, [appId, userData.email]);

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
