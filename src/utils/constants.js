export const DOCUMENT_STATUS = {
  PROCESSED: 'processed',
  PROCESSING: 'processing',
  ERROR: 'error',
  PENDING: 'pending'
};

export const STATE_MAPPING = {
  // Estados de State
  draft: DOCUMENT_STATUS.PROCESSED,      // Draft + Sent = OK
  aproved: DOCUMENT_STATUS.PROCESSED,    // Aproved + Finished = OK (verificar reglas)
  rejected: DOCUMENT_STATUS.ERROR,
  processing: DOCUMENT_STATUS.PROCESSING,
  uploaded: DOCUMENT_STATUS.PROCESSING,
  pending: DOCUMENT_STATUS.PENDING,

  // Estados de Process (fallback)
  sent: DOCUMENT_STATUS.PROCESSED,       // Draft + Sent = OK
  finished: DOCUMENT_STATUS.PROCESSED,   // Aproved + Finished = OK (verificar reglas)
  inprogress: DOCUMENT_STATUS.PROCESSING,
  queued: DOCUMENT_STATUS.PENDING,
  failed: DOCUMENT_STATUS.ERROR,

  // Estados legacy (mantener compatibilidad)
  completed: DOCUMENT_STATUS.PROCESSED,
  done: DOCUMENT_STATUS.PROCESSED,
  success: DOCUMENT_STATUS.PROCESSED,
  error: DOCUMENT_STATUS.ERROR
};

export const TIMEOUTS = {
  MESSAGE_DURATION: 3000,
  POLLING_INTERVAL: 30000,
  INIT_DELAY: 1000
};