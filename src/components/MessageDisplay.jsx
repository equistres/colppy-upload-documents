import { CheckCircle, XCircle, Clock } from 'lucide-react';

const MESSAGE_TYPES = {
  ERROR: 'error',
  SUCCESS: 'success',
  INFO: 'info'
};

const getMessageType = (message) => {
  if (message.includes('Error')) return MESSAGE_TYPES.ERROR;
  if (message.includes('exitosamente') || message.includes('correctamente')) return MESSAGE_TYPES.SUCCESS;
  return MESSAGE_TYPES.INFO;
};

const getMessageStyles = (type) => {
  const styles = {
    [MESSAGE_TYPES.ERROR]: 'bg-red-50 border border-red-200 text-red-800',
    [MESSAGE_TYPES.SUCCESS]: 'bg-green-50 border border-green-200 text-green-800',
    [MESSAGE_TYPES.INFO]: 'bg-blue-50 border border-blue-200 text-blue-800'
  };
  return styles[type] || styles[MESSAGE_TYPES.INFO];
};

const getMessageIcon = (type) => {
  const icons = {
    [MESSAGE_TYPES.ERROR]: XCircle,
    [MESSAGE_TYPES.SUCCESS]: CheckCircle,
    [MESSAGE_TYPES.INFO]: Clock
  };
  const IconComponent = icons[type] || Clock;
  return <IconComponent className="w-5 h-5 mr-2" />;
};

const MessageDisplay = ({ message }) => {
  if (!message) return null;

  const messageType = getMessageType(message);

  return (
    <div className={`mb-6 p-4 rounded-lg ${getMessageStyles(messageType)}`}>
      <div className="flex items-center">
        {getMessageIcon(messageType)}
        {message}
      </div>
    </div>
  );
};

export default MessageDisplay;