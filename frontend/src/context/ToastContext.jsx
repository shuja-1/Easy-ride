import { createContext, useCallback, useContext, useState } from 'react';
import Icon from '../components/Icon.jsx';

const ToastContext = createContext(null);

const ICONS = {
  success: 'checkCircle',
  error: 'xCircle',
  info: 'checkCircle',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = 'success') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((current) => [...current, { id, message, type }]);
      setTimeout(() => remove(id), 3800);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={`toast toast-${item.type}`}>
            <span className="toast-icon">
              <Icon name={ICONS[item.type] || 'checkCircle'} size={18} />
            </span>
            <p>{item.message}</p>
            <button className="toast-close" onClick={() => remove(item.id)} aria-label="Dismiss">
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
};
