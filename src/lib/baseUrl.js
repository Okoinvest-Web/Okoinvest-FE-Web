export function getBaseUrl() {
  // Client-side: use relative URL
  if (typeof window !== 'undefined') {
    return '';
  }
  
  // Server-side: use absolute URL
  // For production
  if (process.env.NODE_ENV === 'production') {
    // Use the actual domain
    return 'http://localhost:3000';
  }
  
  // For development
  return 'http://localhost:3000';
}

export function isBuilding() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}