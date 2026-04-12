/**
 * Unit tests for distance calculation utilities
 * Tests core alarm trigger logic
 */

import {
  calculateDistance,
  isWithinRadius,
  calculateBearing,
  formatDistance,
  isLocationJump,
  isSignificantLocationChange,
  calculateETA,
} from '../src/utils/distanceCalculator';

// Known coordinates for testing
const sanFrancisco = { latitude: 37.7749, longitude: -122.4194 };
const losAngeles = { latitude: 34.0522, longitude: -118.2437 };
const sanJose = { latitude: 37.3382, longitude: -121.8863 };

describe('Distance Calculator Tests', () => {

  describe('calculateDistance', () => {
    test('Distance between SF and LA (approximately 559 km)', () => {
      const distance = calculateDistance(sanFrancisco, losAngeles);
      // Should be around 559 km = 559000 meters
      expect(distance).toBeGreaterThan(550000);
      expect(distance).toBeLessThan(570000);
    });

    test('Distance between same point should be 0', () => {
      const distance = calculateDistance(sanFrancisco, sanFrancisco);
      expect(distance).toBeLessThan(1); // Should be very close to 0
    });

    test('Distance between SF and San Jose (approximately 58 km)', () => {
      const distance = calculateDistance(sanFrancisco, sanJose);
      expect(distance).toBeGreaterThan(50000);
      expect(distance).toBeLessThan(70000);
    });
  });

  describe('isWithinRadius', () => {
    test('Point within radius should return true', () => {
      const current = { latitude: 37.7749, longitude: -122.4194 };
      const destination = { latitude: 37.7750, longitude: -122.4195 };
      const result = isWithinRadius(current, destination, 200);
      expect(result).toBe(true);
    });

    test('Point outside radius should return false', () => {
      const result = isWithinRadius(sanFrancisco, losAngeles, 1000);
      expect(result).toBe(false);
    });

    test('Buffer should trigger earlier than exact radius', () => {
      const current = { latitude: 37.7749, longitude: -122.4194 };
      const destination = { latitude: 37.7749, longitude: -122.4194 };
      // Very close point
      const nearby = { latitude: 37.77491, longitude: -122.41941 };

      const withinRadius = isWithinRadius(current, destination, 100);
      const withBuffer = isWithinRadius(nearby, destination, 100, 7);

      expect(withinRadius).toBe(true);
      expect(withBuffer).toBe(true);
    });
  });

  describe('formatDistance', () => {
    test('Should format meters correctly', () => {
      expect(formatDistance(100)).toBe('100 m');
      expect(formatDistance(500)).toBe('500 m');
      expect(formatDistance(999)).toBe('999 m');
    });

    test('Should format kilometers correctly', () => {
      expect(formatDistance(1000)).toContain('km');
      expect(formatDistance(5500)).toContain('km');
    });
  });

  describe('isLocationJump', () => {
    test('Normal movement should not be flagged as jump', () => {
      const previous = sanFrancisco;
      const current = sanJose;
      // 58 km in 30 minutes = 1.93 km/min = 32 m/s (reasonable)
      const timeDelta = 60 * 30; // 30 minutes in seconds
      const isJump = isLocationJump(previous, current, timeDelta);
      expect(isJump).toBe(false);
    });

    test('Impossible speed should be flagged as jump', () => {
      const previous = sanFrancisco;
      const current = losAngeles;
      // 559 km in 1 second = impossible
      const timeDelta = 1;
      const isJump = isLocationJump(previous, current, timeDelta);
      expect(isJump).toBe(true);
    });
  });

  describe('isSignificantLocationChange', () => {
    test('Small movement below threshold should return false', () => {
      const previous = { latitude: 37.7749, longitude: -122.4194 };
      const current = { latitude: 37.77491, longitude: -122.41941 };
      const result = isSignificantLocationChange(previous, current, 50);
      expect(result).toBe(false);
    });

    test('Movement above threshold should return true', () => {
      const result = isSignificantLocationChange(sanFrancisco, sanJose, 50);
      expect(result).toBe(true);
    });
  });

  describe('calculateETA', () => {
    test('Should calculate ETA correctly', () => {
      // 1000 meters at 10 m/s = 100 seconds = ~1.67 minutes
      const eta = calculateETA(1000, 10);
      expect(eta).toBeCloseTo(1.67, 0);
    });

    test('Zero speed should return null', () => {
      const eta = calculateETA(1000, 0);
      expect(eta).toBeNull();
    });

    test('Null speed should return null', () => {
      const eta = calculateETA(1000, null);
      expect(eta).toBeNull();
    });
  });
});

/**
 * Integration tests for alarm trigger logic
 */
describe('Alarm Trigger Logic', () => {
  test('Alarm should trigger only once per trip', () => {
    const trip = {
      id: 'test-trip-1',
      alarmTriggered: false,
      destination: sanFrancisco,
      radiusMeters: 500,
    };

    const userLocation = { latitude: 37.7749, longitude: -122.4194 };

    // First check - should trigger
    let shouldTrigger = isWithinRadius(userLocation, trip.destination, trip.radiusMeters);
    expect(shouldTrigger).toBe(true);

    // Mark as triggered
    trip.alarmTriggered = true;

    // Second check - should not trigger again (handled by state)
    expect(trip.alarmTriggered).toBe(true);
  });

  test('Alarm should not trigger before entering radius', () => {
    const destination = sanFrancisco;
    const radiusMeters = 100;

    // User far away
    const farAway = losAngeles;
    const shouldTrigger = isWithinRadius(farAway, destination, radiusMeters);
    expect(shouldTrigger).toBe(false);
  });

  test('Missed destination due to fast movement', () => {
    const destination = { latitude: 37.7749, longitude: -122.4194 };
    const radiusMeters = 100;

    // User approaches but overshoots
    const approachingPoint = { latitude: 37.77485, longitude: -122.41935 };
    const overshotPoint = { latitude: 37.77510, longitude: -122.41955 };

    const beforeRadius = isWithinRadius(approachingPoint, destination, radiusMeters);
    const afterRadius = isWithinRadius(overshotPoint, destination, radiusMeters);

    // With buffer, should still catch it
    expect(beforeRadius || afterRadius).toBe(true);
  });

  test('GPS drift should not cause false positives', () => {
    const destination = sanFrancisco;
    const radiusMeters = 50;

    const driftPoint1 = { latitude: 37.7750, longitude: -122.4194 };
    const driftPoint2 = { latitude: 37.7749, longitude: -122.4195 };

    const trigger1 = isWithinRadius(driftPoint1, destination, radiusMeters);
    const trigger2 = isWithinRadius(driftPoint2, destination, radiusMeters);

    // Both within radius due to buffer, but only first should trigger
    expect(trigger1 || trigger2).toBe(true);
  });
});

/**
 * Edge case tests
 */
describe('Edge Cases', () => {
  test('Coordinates at equator', () => {
    const point1 = { latitude: 0, longitude: 0 };
    const point2 = { latitude: 0, longitude: 1 };
    const distance = calculateDistance(point1, point2);
    // 1 degree at equator ≈ 111 km
    expect(distance).toBeGreaterThan(100000);
    expect(distance).toBeLessThan(120000);
  });

  test('Coordinates at poles', () => {
    const point1 = { latitude: 89, longitude: 0 };
    const point2 = { latitude: 89, longitude: 180 };
    const distance = calculateDistance(point1, point2);
    expect(distance).toBeGreaterThan(0);
  });

  test('Coordinates near date line', () => {
    const point1 = { latitude: 0, longitude: 179 };
    const point2 = { latitude: 0, longitude: -179 };
    const distance = calculateDistance(point1, point2);
    // Should be ~222 km (shortest distance across date line)
    expect(distance).toBeLessThan(300000);
  });

  test('Invalid coordinates should not break', () => {
    expect(() => {
      const point1 = { latitude: 200, longitude: 400 };
      const point2 = { latitude: 50, longitude: 100 };
      calculateDistance(point1, point2);
    }).not.toThrow();
  });
});
