export function shouldApplyGeneralApiLimit(path: string) {
  return path !== '/health'
    && !path.startsWith('/auth/')
    && !isBookingFlowPath(path);
}

export function isBookingFlowPath(path: string) {
  return path === '/bookings'
    || path.startsWith('/bookings/')
    || /^\/equipment\/[^/]+\/availability$/.test(path);
}
