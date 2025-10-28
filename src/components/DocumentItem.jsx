import { CheckCircle, XCircle, Clock, AlertCircle, Eye, FileText } from 'lucide-react';

const DOCUMENT_STATUS = {
  PROCESSED: 'processed',
  PROCESSING: 'processing',
  ERROR: 'error',
  PENDING: 'pending'
};

const getStatusIcon = (status) => {
  const icons = {
    [DOCUMENT_STATUS.PROCESSED]: <CheckCircle className="w-4 h-4 text-green-600" strokeWidth={2} />,
    [DOCUMENT_STATUS.PROCESSING]: <Clock className="w-4 h-4 text-blue-600 animate-spin" strokeWidth={2} />,
    [DOCUMENT_STATUS.ERROR]: <XCircle className="w-4 h-4 text-red-600" strokeWidth={2} />,
    default: <AlertCircle className="w-4 h-4 text-gray-500" strokeWidth={2} />
  };
  return icons[status] || icons.default;
};

const getStatusText = (status) => {
  const texts = {
    [DOCUMENT_STATUS.PROCESSED]: 'Procesado',
    [DOCUMENT_STATUS.PROCESSING]: 'Procesando',
    [DOCUMENT_STATUS.ERROR]: 'Error',
    default: 'Desconocido'
  };
  return texts[status] || texts.default;
};

const getStatusColor = (status) => {
  const colors = {
    [DOCUMENT_STATUS.PROCESSED]: 'bg-green-50 text-green-700 border-green-200',
    [DOCUMENT_STATUS.PROCESSING]: 'bg-blue-50 text-blue-700 border-blue-200',
    [DOCUMENT_STATUS.ERROR]: 'bg-red-50 text-red-700 border-red-200',
    default: 'bg-gray-50 text-gray-700 border-gray-200'
  };
  return colors[status] || colors.default;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('es-ES'),
    time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  };
};

const DocumentItem = ({ document, onOpenDocument, ...props }) => {
  const { date, time } = formatDate(document.uploadDate);

  const handleViewDocument = () => {
    // Track view document event
    if (typeof window.trackEvent !== 'undefined') {
      window.trackEvent('Boolfy - Ver Detalle Click', {
        'document_id': document.id,
        'filename': document.filename,
        'external_code': document.externalCode,
        'status': document.status,
        'has_deeplink': Boolean(document.deeplink),
        'has_error': Boolean(document.error),
        'fecha': new Date().toISOString()
      });
    }
    onOpenDocument(document);
  };

  return (
    <div
      {...props}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Document Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-gray-900 truncate">{document.filename}</h3>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-gray-600">
              <span className="font-medium">Código:</span>{' '}
              <span className="font-mono text-gray-700">{document.externalCode}</span>
            </p>
            <p className="text-xs text-gray-500">
              {date} · {time}
            </p>
          </div>

          {document.error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs text-red-700 leading-relaxed">{document.error}</p>
            </div>
          )}
        </div>

        {/* Status and Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border ${getStatusColor(document.status)}`}>
            {getStatusIcon(document.status)}
            <span>{getStatusText(document.status)}</span>
          </div>

          {document.deeplink && (
            <button
              onClick={handleViewDocument}
              className="p-2 text-white bg-colppy hover:bg-colppy-hover rounded-md transition-all shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-colppy"
              title="Ver documento procesado"
            >
              <Eye className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentItem;
