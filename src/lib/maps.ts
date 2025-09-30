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
    /^https?:\/\/share\.google/,
  ];
  
  return validPatterns.some(pattern => pattern.test(url));
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
