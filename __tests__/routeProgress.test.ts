import type { Waypoint } from '../src/types';
import { advanceWaypoint, getRouteProgress, getWaypointStatus } from '../src/utils/routeProgress';

const waypoints: Waypoint[] = [
  { id: 'one', name: 'First stop', location: { latitude: 1, longitude: 1 }, radiusMeters: 100 },
  { id: 'two', name: 'Second stop', location: { latitude: 2, longitude: 2 }, radiusMeters: 100 },
  { id: 'three', name: 'Final stop', location: { latitude: 3, longitude: 3 }, radiusMeters: 100 },
];

describe('route progress', () => {
  test('reports completed, current, and upcoming waypoints', () => {
    expect(getWaypointStatus(waypoints[0], 0, 1)).toBe('completed');
    expect(getWaypointStatus(waypoints[1], 1, 1)).toBe('current');
    expect(getWaypointStatus(waypoints[2], 2, 1)).toBe('upcoming');
  });

  test('calculates progress from the active waypoint', () => {
    expect(getRouteProgress(waypoints, 1)).toEqual({
      completedCount: 1,
      totalCount: 3,
      percentage: 33,
    });
  });

  test('marks the current waypoint and advances to the next one', () => {
    expect(advanceWaypoint(waypoints, 0)).toEqual({
      waypoints: [{ ...waypoints[0], triggered: true }, waypoints[1], waypoints[2]],
      nextWaypointIndex: 1,
      isComplete: false,
    });
  });

  test('reports completion after the final waypoint', () => {
    expect(advanceWaypoint(waypoints, 2)).toEqual({
      waypoints: [waypoints[0], waypoints[1], { ...waypoints[2], triggered: true }],
      nextWaypointIndex: 2,
      isComplete: true,
    });
  });
});
