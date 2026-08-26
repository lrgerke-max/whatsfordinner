import { Alert, Platform } from 'react-native';

/**
 * React Native's Alert.alert silently no-ops on web (react-native-web has no
 * built-in implementation). This falls back to window.confirm there so
 * destructive actions still work when the app is run in a browser.
 * onConfirm fires on accept; onCancel (if provided) fires on decline — on
 * native the dialog is async, so callers that gate a lock on the dialog need
 * the decline path to release it.
 */
export function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void, destructive = true, onCancel?: () => void): void {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    } else {
      onCancel?.();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: onCancel },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

/** Same web-fallback rationale as confirmAction, for a single informational message. */
export function informAction(title: string, message: string): void {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}
