import { CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';

const MESSAGE_TYPES = {
  ERROR: 'error',
  SUCCESS: 'success',
  WARNING: 'warning',
  INFO: 'info'
};

const getMessageType = (message) => {
  if (message.includes('Error') || message.includes('error')) return MESSAGE_TYPES.ERROR;
  if (message.includes('exitosamente') || message.includes('correctamente')) return MESSAGE_TYPES.SUCCESS;
  if (message.includes('límite') || message.includes('Alcanzaste')) return MESSAGE_TYPES.WARNING;
  return MESSAGE_TYPES.INFO;
};

const getMessageStyles = (type) => {
  const styles = {
    [MESSAGE_TYPES.ERROR]: 'bg-red-50 border-red-200 text-red-800',
    [MESSAGE_TYPES.SUCCESS]: 'bg-green-50 border-green-200 text-green-800',
    [MESSAGE_TYPES.WARNING]: 'bg-orange-50 border-orange-200 text-orange-800',
    [MESSAGE_TYPES.INFO]: 'bg-blue-50 border-blue-200 text-blue-800'
  };
  return styles[type] || styles[MESSAGE_TYPES.INFO];
};

const getMessageIcon = (type) => {
  const iconProps = { className: "w-5 h-5", strokeWidth: 2 };
  const icons = {
    [MESSAGE_TYPES.ERROR]: <XCircle {...iconProps} className="w-5 h-5 text-red-600" />,
    [MESSAGE_TYPES.SUCCESS]: <CheckCircle {...iconProps} className="w-5 h-5 text-green-600" />,
    [MESSAGE_TYPES.WARNING]: <AlertCircle {...iconProps} className="w-5 h-5 text-orange-600" />,
    [MESSAGE_TYPES.INFO]: <Info {...iconProps} className="w-5 h-5 text-blue-600" />
  };
  return icons[type] || icons[MESSAGE_TYPES.INFO];
};

const MessageDisplay = ({ message }) => {
  if (!message) return null;

  const messageType = getMessageType(message);

  return (
    <div className={`mb-6 rounded-lg border shadow-sm ${getMessageStyles(messageType)}`}>
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 mt-0.5">
          {getMessageIcon(messageType)}
        </div>
        <p className="text-sm font-medium leading-relaxed">{message}</p>
      </div>
    </div>
  );
};

export default MessageDisplay;
