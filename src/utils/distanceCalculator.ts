/**
 * Distance and location utility functions
 * Uses Haversine formula for accurate distance calculation
 */

import type { LocationCoordinate } from '@/types';

const EARTH_RADIUS_METERS = 6371000; // Earth's radius in meters

/**
 * Calculates the great-circle distance between two points on Earth
 * using the Haversine formula
 *
 * @param from - Starting location coordinate
 * @param to - Destination location coordinate
 * @returns Distance in meters
 */
export const calculateDistance = (from: LocationCoordinate, to: LocationCoordinate): number => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  
  const lat1 = toRadians(from.latitude);
  const lon1 = toRadians(from.longitude);
  const lat2 = toRadians(to.latitude);
  const lon2 = toRadians(to.longitude);
  
  const dlat = lat2 - lat1;
  const dlon = lon2 - lon1;
  
  const a =
    Math.sin(dlat / 2) * Math.sin(dlat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) * Math.sin(dlon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return EARTH_RADIUS_METERS * c;
};

/**
 * Checks if location is within the radius zone
 * Adds 5-10% buffer to account for GPS drift and improve reliability
 *
 * @param currentLocation - Current user location
 * @param destination - Destination location
 * @param radiusMeters - Trigger radius in meters
 * @param bufferPercentage - Buffer percentage (default 7%)
 * @returns true if within radius zone
 */
export const isWithinRadius = (
  currentLocation: LocationCoordinate,
  destination: LocationCoordinate,
  radiusMeters: number,
  bufferPercentage: number = 7
): boolean => {
  const distance = calculateDistance(currentLocation, destination);
  const effectiveRadius = radiusMeters * (1 + bufferPercentage / 100);
  return distance <= effectiveRadius;
};

/**
 * Calculates bearing between two points (useful for direction indicators)
 *
 * @param from - Starting location
 * @param to - Destination location
 * @returns Bearing in degrees (0-360)
 */
export const calculateBearing = (from: LocationCoordinate, to: LocationCoordinate): number => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;
  
  const lat1 = toRadians(from.latitude);
  const lon1 = toRadians(from.longitude);
  const lat2 = toRadians(to.latitude);
  const lon2 = toRadians(to.longitude);
  
  const dlon = lon2 - lon1;
  
  const y = Math.sin(dlon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlon);
  
  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
};

/**
 * Formats distance for display (converts to km when > 1000m)
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

/**
 * Validates coordinate values
 */
export const isValidCoordinate = (coord: LocationCoordinate): boolean => {
  return (
    Math.abs(coord.latitude) <= 90 &&
    Math.abs(coord.longitude) <= 180 &&
    !isNaN(coord.latitude) &&
    !isNaN(coord.longitude)
  );
};

/**
 * Detects if location jumped (possible GPS error)
 * Returns true if distance traveled exceeds max possible speed
 * (e.g., if traveled 10km in 10 seconds = 3600 km/h, it's a GPS error)
 */
export const isLocationJump = (
  previousLocation: LocationCoordinate & { accuracy?: number | null },
  currentLocation: LocationCoordinate & { accuracy?: number | null },
  timeDeltaSeconds: number,
  maxSpeedMps: number = 100 // ~360 km/h, max for trains/planes
): boolean => {
  // Discard locations with terrible accuracy (e.g., > 1000m)
  if (currentLocation.accuracy && currentLocation.accuracy > 1000) {
    return true; // Treat as a jump / invalid
  }

  const distance = calculateDistance(previousLocation, currentLocation);
  const speedMps = distance / timeDeltaSeconds;
  
  // If speed is incredibly high, it's a jump
  if (speedMps > maxSpeedMps) {
    return true;
  }
  
  // Advanced check: if speed is suspiciously high (> 30 m/s or 108 km/h) 
  // AND accuracy is poor (> 100m), it's likely a GPS multipath jump
  if (speedMps > 30 && currentLocation.accuracy && currentLocation.accuracy > 100) {
    return true;
  }

  return false;
};

/**
 * Filters location updates based on distance threshold
 * Returns true if location changed enough to be new data (not GPS noise)
 */
export const isSignificantLocationChange = (
  previousLocation: LocationCoordinate,
  currentLocation: LocationCoordinate,
  minDistanceMeters: number = 10
): boolean => {
  const distance = calculateDistance(previousLocation, currentLocation);
  return distance >= minDistanceMeters;
};

/**
 * Calculates ETA based on current speed and distance
 */
export const calculateETA = (distanceMeters: number, speedMps: number | null): number | null => {
  if (!speedMps || speedMps <= 0) return null;
  return Math.round(distanceMeters / speedMps / 60); // returns minutes
};
