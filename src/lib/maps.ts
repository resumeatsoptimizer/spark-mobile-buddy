/**
 * Utility functions for handling Google Maps URLs and embedding
 */

/**
 * Creates a Google Maps embed URL from a location name or address
 * @param location - Location name or address
 * @returns Google Maps embed URL
 */
export const createMapsEmbedUrl = (location: string): string => {
  const encodedLocation = encodeURIComponent(location);
  return `https://maps.google.com/maps?q=${encodedLocation}&output=embed`;
};

/**
 * Validates if a URL is a valid Google Maps URL
 * @param url - URL to validate
 * @returns true if valid Google Maps URL
 */
export const isValidGoogleMapsUrl = (url: string): boolean => {
  if (!url) return false;
  
  const validPatterns = [
    /^https?:\/\/(www\.)?google\.(com|co\.th)\/maps/,
    /^https?:\/\/maps\.google\.(com|co\.th)/,
    /^https?:\/\/goo\.gl\/maps/,
    /^https?:\/\/maps\.app\.goo\.gl/,
    /^https?:\/\/g\.co\/maps/,
    /^https?:\/\/share\.google/,
  ];
  
  return validPatterns.some(pattern => pattern.test(url));
};

/**
 * Converts Google Maps share link to embed URL
 * @param url - Google Maps URL (including maps.app.goo.gl)
 * @param fallbackLocation - Fallback location name if URL cannot be converted
 * @returns Google Maps embed URL
 */
export const convertToEmbedUrl = (url: string, fallbackLocation?: string): string => {
  if (!url) {
    return fallbackLocation ? createMapsEmbedUrl(fallbackLocation) : '';
  }

  // Handle maps.app.goo.gl and other shortened URLs
  // These need to use the URL directly in the embed src
  if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps') || url.includes('g.co/maps')) {
    // For shortened URLs, we'll use the direct URL in embed mode
    return `https://maps.google.com/maps?q=${encodeURIComponent(url)}&output=embed`;
  }

  // Try to extract place information from the URL
  const placeMatch = url.match(/place\/([^/]+)/);
  if (placeMatch) {
    const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    return createMapsEmbedUrl(placeName);
  }

  // Try to extract coordinates
  const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (coordMatch) {
    return `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&output=embed`;
  }

  // Fallback to location name if provided
  if (fallbackLocation) {
    return createMapsEmbedUrl(fallbackLocation);
  }

  // Last resort: try to use the URL as-is
  return `https://maps.google.com/maps?q=${encodeURIComponent(url)}&output=embed`;
};

/**
 * Extracts place information from Google Maps URL if possible
 * @param url - Google Maps URL
 * @returns Place name or null if not extractable
 */
export const extractPlaceFromUrl = (url: string): string | null => {
  if (!url) return null;
  
  // Try to extract place name from URL patterns
  const placeMatch = url.match(/place\/([^/]+)/);
  if (placeMatch) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
  }
  
  return null;
};
