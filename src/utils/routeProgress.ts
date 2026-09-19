import type { Waypoint } from '@/types';

export type WaypointStatus = 'completed' | 'current' | 'upcoming';

export const getWaypointStatus = (
  waypoint: Waypoint,
  waypointIndex: number,
  currentWaypointIndex: number
): WaypointStatus => {
  if (waypoint.triggered || waypointIndex < currentWaypointIndex) {
    return 'completed';
  }

  if (waypointIndex === currentWaypointIndex) {
    return 'current';
  }

  return 'upcoming';
};

export const getRouteProgress = (waypoints: Waypoint[], currentWaypointIndex: number) => {
  const completedCount = waypoints.filter((waypoint, index) =>
    getWaypointStatus(waypoint, index, currentWaypointIndex) === 'completed'
  ).length;

  return {
    completedCount,
    totalCount: waypoints.length,
    percentage: waypoints.length === 0 ? 0 : Math.round((completedCount / waypoints.length) * 100),
  };
};

export const advanceWaypoint = (waypoints: Waypoint[], currentWaypointIndex: number) => {
  if (waypoints.length === 0 || currentWaypointIndex < 0 || currentWaypointIndex >= waypoints.length) {
    return { waypoints, nextWaypointIndex: currentWaypointIndex, isComplete: true };
  }

  const updatedWaypoints = waypoints.map((waypoint, index) =>
    index === currentWaypointIndex ? { ...waypoint, triggered: true } : waypoint
  );
  const nextWaypointIndex = currentWaypointIndex + 1;

  return {
    waypoints: updatedWaypoints,
    nextWaypointIndex: Math.min(nextWaypointIndex, updatedWaypoints.length - 1),
    isComplete: nextWaypointIndex >= updatedWaypoints.length,
  };
};
