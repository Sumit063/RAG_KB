export function getStoredValue(key: string): string {
  try {
    return localStorage.getItem(key) || '';
  } catch (err) {
    return '';
  }
}

export function setStoredValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    // ignore storage errors
  }
}

export function clearStoredValue(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    // ignore storage errors
  }
}
