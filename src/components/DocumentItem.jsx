import { CheckCircle, XCircle, Clock, AlertCircle, Eye } from 'lucide-react';

const DOCUMENT_STATUS = {
  PROCESSED: 'processed',
  PROCESSING: 'processing',
  ERROR: 'error',
  PENDING: 'pending'
};

const getStatusIcon = (status) => {
  const icons = {
    [DOCUMENT_STATUS.PROCESSED]: <CheckCircle className="w-5 h-5 text-green-500" />,
    [DOCUMENT_STATUS.PROCESSING]: <Clock className="w-5 h-5 text-yellow-500 animate-spin" />,
    [DOCUMENT_STATUS.ERROR]: <XCircle className="w-5 h-5 text-red-500" />,
    default: <AlertCircle className="w-5 h-5 text-gray-500" />
  };
  return icons[status] || icons.default;
};

const getStatusText = (status) => {
  const texts = {
    [DOCUMENT_STATUS.PROCESSED]: 'Procesado',
    [DOCUMENT_STATUS.PROCESSING]: 'En proceso',
    [DOCUMENT_STATUS.ERROR]: 'Error',
    default: 'Desconocido'
  };
  return texts[status] || texts.default;
};

const getStatusColor = (status) => {
  const colors = {
    [DOCUMENT_STATUS.PROCESSED]: 'bg-green-100 text-green-800 border-green-200',
    [DOCUMENT_STATUS.PROCESSING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [DOCUMENT_STATUS.ERROR]: 'bg-red-100 text-red-800 border-red-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200'
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
    <div {...props} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-800 truncate">{document.filename}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Código: <span className="font-mono">{document.externalCode}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">{date} - {time}</p>
          {document.error && (
            <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded border">{document.error}</p>
          )}
        </div>
        <div className="flex items-center ml-4">
          {getStatusIcon(document.status)}
          <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(document.status)}`}>
            {getStatusText(document.status)}
          </span>
          {document.deeplink && (
            <button
              onClick={handleViewDocument}
              className="ml-2 p-1 text-colppy hover:text-colppy-hover hover:bg-purple-50 rounded transition-colors"
              title="Ver documento procesado"
            >
              <Eye className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentItem;