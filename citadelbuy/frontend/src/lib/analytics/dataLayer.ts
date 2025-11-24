/**
 * Google Tag Manager DataLayer Utility
 * Provides type-safe interface for pushing events to GTM dataLayer
 */

export interface DataLayerEvent {
  event: string;
  [key: string]: any;
}

export interface WindowWithDataLayer extends Window {
  dataLayer: DataLayerEvent[];
}

declare let window: WindowWithDataLayer;

/**
 * Initialize the dataLayer array if it doesn't exist
 */
export const initDataLayer = (): void => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
  }
};

/**
 * Push an event to the Google Tag Manager dataLayer
 * @param event - The event object to push
 */
export const pushToDataLayer = (event: DataLayerEvent): void => {
  if (typeof window !== 'undefined') {
    if (!window.dataLayer) {
      initDataLayer();
    }
    window.dataLayer.push(event);

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[DataLayer] Event pushed:', event);
    }
  }
};

/**
 * Push multiple events to the dataLayer
 * @param events - Array of events to push
 */
export const pushMultipleEvents = (events: DataLayerEvent[]): void => {
  events.forEach(event => pushToDataLayer(event));
};

/**
 * Clear the dataLayer (useful for testing)
 */
export const clearDataLayer = (): void => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer = [];
  }
};

/**
 * Get the current dataLayer
 */
export const getDataLayer = (): DataLayerEvent[] => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    return window.dataLayer;
  }
  return [];
};
