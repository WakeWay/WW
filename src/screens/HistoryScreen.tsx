/**
 * History Screen - View past trips and alarms
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Text,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from '@components/Icon';
import { Card } from '@components/UIComponents';
import { useTripStore } from '@store/useTripStore';
import { useTheme } from '@hooks/useTheme';

const HistoryScreen = () => {
  const store = useTripStore();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  const [filter, setFilter] = useState<'all' | 'alarms'>('all');

  const filteredHistory =
    filter === 'alarms' ? store.tripHistory.filter((t: any) => t.alarmTriggered || t.alarmTriggerTime) : store.tripHistory;

  const sortedHistory = [...filteredHistory].sort((a, b) => b.endTime - a.endTime);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (startTime: number, endTime: number) => {
    const duration = Math.round((endTime - startTime) / 60000);
    if (duration < 1) return '< 1 min';
    if (duration < 60) return `${duration} min`;
    return `${Math.floor(duration / 60)}h ${duration % 60}m`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip History</Text>
        <Text style={styles.headerSubtitle}>
          {sortedHistory.length} trip{sortedHistory.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'all' && styles.filterButtonTextActive,
            ]}
          >
            All Trips
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'alarms' && styles.filterButtonActive]}
          onPress={() => setFilter('alarms')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'alarms' && styles.filterButtonTextActive,
            ]}
          >
            With Alarms
          </Text>
        </TouchableOpacity>
      </View>

      {/* History List */}
      {sortedHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="time" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No history yet</Text>
          <Text style={styles.emptyDescription}>
            Your completed trips will appear here
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll}>
          {sortedHistory.map((trip, index) => (
            <Card key={index} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View>
                  <Text style={styles.tripDestination}>{trip.destinationName}</Text>
                  <Text style={styles.tripDate}>{formatDate(trip.endTime)}</Text>
                </View>
                {/* Alarm Badge */}
                {(trip.alarmTriggered || trip.alarmTriggerTime) && (
                  <View style={styles.alarmBadge}>
                    <Icon name="alarm" size={16} color="#FFFFFF" />
                  </View>
                )}
              </View>

              <View style={styles.tripDetails}>
                <View style={styles.detail}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>
                    {formatDuration(trip.startTime, trip.endTime)}
                  </Text>
                </View>
                <View style={styles.detail}>
                  <Text style={styles.detailLabel}>Radius</Text>
                  <Text style={styles.detailValue}>{trip.radiusMeters}m</Text>
                </View>
                <View style={styles.detail}>
                  <Text style={styles.detailLabel}>Alarm</Text>
                  <Text style={[styles.detailValue, { color: (trip.alarmTriggered || trip.alarmTriggerTime) ? colors.success : colors.textSecondary }]}>
                    {(trip.alarmTriggered || trip.alarmTriggerTime) ? '✓ Yes' : 'No'}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    padding: 16,
  },
  tripCard: {
    marginBottom: 12,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripDestination: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  tripDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  alarmBadge: {
    backgroundColor: colors.success,
    borderRadius: 12,
    padding: 8,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detail: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

export default HistoryScreen;
