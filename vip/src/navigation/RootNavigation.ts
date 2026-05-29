import * as React from 'react';

export const navigationRef = React.createRef<any>();

export function navigate(name: string, params?: any) {
  try {
    navigationRef.current?.navigate(name, params);
  } catch {
    // no-op
  }
}

export function openPaywall() {
  // Drawer route name must be exactly "Subscriptions"
  navigate('Subscriptions');
}
