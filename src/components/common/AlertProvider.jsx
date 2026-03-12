import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ALERT_VARIANTS,
  AlertCard,
  AlertCheckboxInput,
  AlertCheckboxLabel,
  AlertContent,
  AlertControlsRow,
  AlertHeader,
  AlertHistoryDropdown,
  AlertHistoryEmptyState,
  AlertHistoryHeader,
  AlertHistoryItem,
  AlertHistoryList,
  AlertHistoryMessage,
  AlertHistoryTimestamp,
  AlertHistoryTitle,
  AlertIcon,
  AlertLink,
  AlertLinkRow,
  AlertMessage,
  AlertProgressBar,
  AlertProgressTrack,
  AlertStackWrapper,
  AlertTitle,
  AlertToggleButton,
  AlertControlsWrapper,
  CloseButton,
  CountdownPill,
  getVariantTheme,
} from '../../styles/AlertStyles';

const DEFAULT_AUTO_CLOSE_MS = 10000;

const AlertContext = createContext(null);

const generateAlertId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `alert-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const AlertPortal = ({
  alerts,
  dismissAlert,
  history,
  isHistoryOpen,
  toggleHistory,
  alertsEnabled,
  setAlertsEnabled,
}) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <>
      <AlertInterface
        history={history}
        isHistoryOpen={isHistoryOpen}
        toggleHistory={toggleHistory}
        alertsEnabled={alertsEnabled}
        setAlertsEnabled={setAlertsEnabled}
      />
      <AlertStack alerts={alerts} dismissAlert={dismissAlert} />
    </>,
    document.body,
  );
};

const AlertStack = ({ alerts, dismissAlert }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!alerts.length) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [alerts.length]);

  if (!alerts.length) {
    return null;
  }

  return (
    <AlertStackWrapper role="region" aria-live="polite" aria-label="System alerts">
      {alerts.map((alert) => (
        <AlertItem
          key={alert.id}
          alert={alert}
          now={now}
          onDismiss={() => dismissAlert(alert.id)}
        />
      ))}
    </AlertStackWrapper>
  );
};

const AlertItem = ({ alert, now, onDismiss }) => {
  const { autoCloseMs, expiresAt, variant } = alert;
  const theme = getVariantTheme(variant);
  const remainingMs = Math.max(0, expiresAt - now);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const percent = Math.max(0, Math.min(100, (remainingMs / autoCloseMs) * 100));

  return (
    <AlertCard $variant={variant}>
      <AlertHeader>
        <AlertIcon $variant={variant} aria-hidden="true">
          {alert.icon || theme.icon}
        </AlertIcon>
        <AlertContent>
          <AlertTitle>{alert.title || theme.title}</AlertTitle>
          {alert.message && <AlertMessage>{alert.message}</AlertMessage>}
          {alert.link && (
            <AlertLinkRow>
              {(alert.linkLabel || 'Details') + ':'}
              <AlertLink
                $variant={variant}
                href={alert.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Link
              </AlertLink>
            </AlertLinkRow>
          )}
        </AlertContent>
        <CloseButton type="button" aria-label="Dismiss alert" onClick={onDismiss}>
          ×
        </CloseButton>
      </AlertHeader>
      <AlertControlsRow>
        <span>Auto closing</span>
        <CountdownPill>{remainingSeconds}s</CountdownPill>
      </AlertControlsRow>
      <AlertProgressTrack aria-hidden="true">
        <AlertProgressBar $variant={variant} $percent={percent} />
      </AlertProgressTrack>
    </AlertCard>
  );
};

const AlertInterface = ({
  history,
  isHistoryOpen,
  toggleHistory,
  alertsEnabled,
  setAlertsEnabled,
}) => {
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!isHistoryOpen) return undefined;
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        toggleHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isHistoryOpen, toggleHistory]);

  const handleCheckboxChange = (event) => {
    const isChecked = event.target.checked;
    setAlertsEnabled(!isChecked);
  };

  return (
    <AlertControlsWrapper ref={wrapperRef}>
      <AlertToggleButton type="button" onClick={() => toggleHistory()} $disabled={!alertsEnabled}>
        Alerts {history.length ? `(${history.length})` : ''}
      </AlertToggleButton>
      <AlertCheckboxLabel>
        <AlertCheckboxInput
          type="checkbox"
          checked={!alertsEnabled}
          onChange={handleCheckboxChange}
        />
        Disable Alerts
      </AlertCheckboxLabel>
      {isHistoryOpen && (
        <AlertHistoryDropdown>
          <AlertHistoryList>
            {history.length === 0 ? (
              <AlertHistoryEmptyState>No alerts yet.</AlertHistoryEmptyState>
            ) : (
              history.map((item) => (
                <AlertHistoryItem key={item.id} $variant={item.variant}>
                  <AlertHistoryHeader>
                    <AlertHistoryTitle>{item.title}</AlertHistoryTitle>
                    <AlertHistoryTimestamp dateTime={new Date(item.timestamp).toISOString()}>
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </AlertHistoryTimestamp>
                  </AlertHistoryHeader>
                  {item.message && <AlertHistoryMessage>{item.message}</AlertHistoryMessage>}
                  {item.link && (
                    <AlertLink
                      $variant={item.variant}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.linkLabel || 'View'}
                    </AlertLink>
                  )}
                </AlertHistoryItem>
              ))
            )}
          </AlertHistoryList>
        </AlertHistoryDropdown>
      )}
    </AlertControlsWrapper>
  );
};

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const timersRef = useRef({});
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const alertsEnabledRef = useRef(true);
  const [alertHistory, setAlertHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleToggleHistory = useCallback((value) => {
    setIsHistoryOpen((prev) => {
      if (typeof value === 'boolean') {
        return value;
      }
      return !prev;
    });
  }, []);

  const dismissAlert = useCallback((alertId) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    if (timersRef.current[alertId]) {
      clearTimeout(timersRef.current[alertId]);
      delete timersRef.current[alertId];
    }
  }, []);

  const pushAlert = useCallback(
    ({
      id,
      variant = 'info',
      title,
      message,
      autoCloseMs = DEFAULT_AUTO_CLOSE_MS,
      link = null,
      linkLabel = null,
      icon = null,
      }) => {
        if (!alertsEnabledRef.current) return null;
        const alertId = id || generateAlertId();
        const now = Date.now();
        const normalizedVariant = ALERT_VARIANTS[variant] ? variant : 'info';
        const expiresAt = now + autoCloseMs;
        const nextAlert = {
          id: alertId,
          variant: normalizedVariant,
          title: title || getVariantTheme(normalizedVariant).title,
          message,
          autoCloseMs,
          expiresAt,
          link,
          linkLabel,
          icon,
          timestamp: now,
        };
        setAlerts((prev) => [nextAlert, ...prev.filter((alert) => alert.id !== alertId)]);
        setAlertHistory((prev) => [nextAlert, ...prev].slice(0, 50));
        timersRef.current[alertId] = setTimeout(() => dismissAlert(alertId), autoCloseMs);
        return alertId;
      },
      [dismissAlert],
  );

  useEffect(() => () => {
    Object.values(timersRef.current).forEach((timerId) => clearTimeout(timerId));
    timersRef.current = {};
  }, []);

  useEffect(() => {
    alertsEnabledRef.current = alertsEnabled;
  }, [alertsEnabled]);

  const contextValue = useMemo(
    () => ({
      pushAlert,
      dismissAlert,
      alertsEnabled,
      setAlertsEnabled,
    }),
    [pushAlert, dismissAlert, alertsEnabled],
  );

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <AlertPortal
        alerts={alerts}
        dismissAlert={dismissAlert}
        history={alertHistory}
        isHistoryOpen={isHistoryOpen}
        toggleHistory={handleToggleHistory}
        alertsEnabled={alertsEnabled}
        setAlertsEnabled={setAlertsEnabled}
      />
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};

export default AlertProvider;

