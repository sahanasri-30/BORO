export function safeBookingStatus(status) {
  return typeof status === 'string' && status.trim() ? status.trim() : 'UNKNOWN';
}
