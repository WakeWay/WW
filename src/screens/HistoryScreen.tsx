/**
 * History Screen — Premium edition with date grouping, swipe-delete, summary banner
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, SafeAreaView, ScrollView, Text,
  TouchableOpacity, Animated, Platform, StatusBar,
  PanResponder, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '@components/Icon';
import { Badge } from '@components/UIComponents';
import { useTripStore } from '@store/useTripStore';
import { useTheme } from '@hooks/useTheme';
import { useAlert } from '../providers/AlertProvider';
import { SHADOWS, RADIUS } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const DATE_GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'This Month', 'Earlier'];

const getDateGroup = (ts: number): string => {
  const diff = Math.floor((Date.now() - ts) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff <= 7) return 'This Week';
  if (diff <= 30) return 'This Month';
  return 'Earlier';
};

// ─── Swipeable Card ───────────────────────────────────────────────────────────

const SwipeCard: React.FC<{ trip: any; onDelete: () => void; colors: any; index: number }> = ({ trip, onDelete, colors, index }) => {
  const tx = useRef(new Animated.Value(0)).current;
  const delOpacity = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, useNativeDriver: true, bounciness: 5, speed: 10, delay: index * 55 }).start();
  }, []);

  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,
    onPanResponderMove: (_, g) => {
      const x = Math.min(0, Math.max(g.dx, -110));
      tx.setValue(x);
      delOpacity.setValue(Math.abs(x) / 100);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -75) {
        Animated.spring(tx, { toValue: -90, useNativeDriver: true, bounciness: 0 }).start();
      } else {
        Animated.spring(tx, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
        Animated.timing(delOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      }
    },
  });

  const hasAlarm = trip.alarmTriggered || trip.alarmTriggerTime;
  const duration = Math.round((trip.endTime - trip.startTime) / 60000);

  const formatDur = (m: number) => m < 1 ? '< 1 min' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }], marginBottom: 10 }}>
      <View>
        {/* Delete bg */}
        <Animated.View style={[styles.deleteBg, { opacity: delOpacity, backgroundColor: colors.danger }]}>
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
            <Icon name="trash" size={20} color="#FFF" />
            <Text style={styles.deleteTxt}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Sliding card */}
        <Animated.View
          style={[styles.tripCard, { backgroundColor: colors.surface, borderLeftColor: hasAlarm ? colors.success : colors.primary, transform: [{ translateX: tx }], ...SHADOWS.subtle }]}
          {...pan.panHandlers}
        >
          <View style={styles.cardTop}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.destName, { color: colors.text }]} numberOfLines={1}>{trip.destinationName || 'Trip'}</Text>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(trip.endTime)}</Text>
            </View>
            {hasAlarm && <Badge text="🔔 Alarm" variant="success" size="sm" />}
          </View>
          <View style={styles.detailRow}>
            {[
              { icon: 'time-outline', text: formatDur(duration) },
              { icon: 'scan-circle-outline', text: `${trip.radiusMeters}m` },
              { icon: hasAlarm ? 'notifications' : 'notifications-off-outline', text: hasAlarm ? 'Woken up' : 'No alarm', color: hasAlarm ? colors.success : (colors.textMuted || colors.textSecondary) },
            ].map((d, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={[styles.dot, { backgroundColor: colors.border }]} />}
                <View style={styles.detailItem}>
                  <Icon name={d.icon} size={12} color={d.color || colors.textSecondary} />
                  <Text style={[styles.detailTxt, { color: d.color || colors.textSecondary }]}>{d.text}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const HistoryScreen = () => {
  const store = useTripStore();
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();
  const [filter, setFilter] = useState<'all' | 'alarms' | 'week'>('all');

  const handleClear = () => showAlert({
    title: 'Clear All History', message: 'Permanently delete all trip records?',
    showCancelButton: true, confirmText: 'Clear', confirmButtonColor: colors.danger,
    onConfirm: () => { store.clearTripHistory(); },
  });

  const handleDelete = (id: string) => showAlert({
    title: 'Delete Trip', message: 'Remove this trip?',
    showCancelButton: true, confirmText: 'Delete', confirmButtonColor: colors.danger,
    onConfirm: () => store.deleteTrip(id),
  });

  const now = Date.now();
  const filtered = store.tripHistory.filter((t: any) => {
    if (filter === 'alarms') return t.alarmTriggered || t.alarmTriggerTime;
    if (filter === 'week') return now - t.endTime < 7 * 86400000;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => b.endTime - a.endTime);

  const grouped: Record<string, any[]> = {};
  sorted.forEach(t => { const g = getDateGroup(t.endTime); if (!grouped[g]) grouped[g] = []; grouped[g].push(t); });

  const totalMins = store.tripHistory.reduce((a: number, t: any) => a + Math.round((t.endTime - t.startTime) / 60000), 0);
  const alarmCount = store.tripHistory.filter((t: any) => t.alarmTriggered || t.alarmTriggerTime).length;
  const rate = store.tripHistory.length > 0 ? Math.round((alarmCount / store.tripHistory.length) * 100) : 0;
  const fmtTime = (m: number) => m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Trip History</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{sorted.length} trip{sorted.length !== 1 ? 's' : ''}</Text>
        </View>
        {sorted.length > 0 && (
          <TouchableOpacity style={[styles.clearBtn, { borderColor: colors.danger + '50' }]} onPress={handleClear}>
            <Icon name="trash-outline" size={14} color={colors.danger} />
            <Text style={[styles.clearTxt, { color: colors.danger }]}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary banner */}
      {store.tripHistory.length > 0 && (
        <LinearGradient colors={isDark ? ['#0F1E35', '#111827'] : ['#EFF6FF', '#F0F9FF']} style={[styles.summary, { borderColor: colors.border }]}>
          {[
            { label: 'Trips', value: store.tripHistory.length.toString(), icon: 'airplane-outline', color: colors.primary },
            { label: 'Time', value: fmtTime(totalMins), icon: 'time-outline', color: colors.accent },
            { label: 'Alarm Rate', value: `${rate}%`, icon: 'alarm-outline', color: colors.success },
          ].map((s, i) => (
            <View key={s.label} style={[styles.summaryItem, i < 2 && { borderRightWidth: 1, borderRightColor: colors.border + '60' }]}>
              <Icon name={s.icon} size={15} color={s.color} />
              <Text style={[styles.summaryVal, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.summaryLbl, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </LinearGradient>
      )}

      {/* Filters */}
      <View style={styles.filterRow}>
        {([
          { key: 'all', label: 'All', icon: 'list-outline' },
          { key: 'alarms', label: 'Alarms', icon: 'alarm-outline' },
          { key: 'week', label: 'This Week', icon: 'calendar-outline' },
        ] as const).map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, { backgroundColor: filter === f.key ? colors.primary : colors.surface, borderColor: filter === f.key ? colors.primary : colors.border }]}
            onPress={() => setFilter(f.key)}
          >
            <Icon name={f.icon} size={12} color={filter === f.key ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.filterTxt, { color: filter === f.key ? '#FFF' : colors.textSecondary }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {sorted.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + '15' }]}>
            <Icon name="time-outline" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No trips found</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            {filter === 'alarms' ? 'No trips with alarms' : filter === 'week' ? 'No trips this week' : 'Start a trip to see history'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {DATE_GROUP_ORDER.filter(g => grouped[g]?.length).map(group => (
            <View key={group}>
              <View style={styles.groupRow}>
                <View style={[styles.groupDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.groupLbl, { color: colors.textSecondary }]}>{group}</Text>
                <View style={[styles.groupLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.groupCount, { color: colors.textMuted || colors.textSecondary }]}>{grouped[group].length}</Text>
              </View>
              {grouped[group].map((trip: any, i: number) => (
                <SwipeCard key={trip.tripId || i} trip={trip} onDelete={() => handleDelete(trip.tripId)} colors={colors} index={i} />
              ))}
            </View>
          ))}
          <View style={styles.hintRow}>
            <Icon name="arrow-back-outline" size={11} color={colors.textMuted || colors.textSecondary} />
            <Text style={[styles.hintTxt, { color: colors.textMuted || colors.textSecondary }]}>Swipe left to delete</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: RADIUS.pill, borderWidth: 1, marginTop: 4 },
  clearTxt: { fontSize: 12, fontWeight: '700' },
  summary: { flexDirection: 'row', marginHorizontal: 16, borderRadius: RADIUS.lg, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 3 },
  summaryVal: { fontSize: 17, fontWeight: '800' },
  summaryLbl: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: RADIUS.pill, borderWidth: 1 },
  filterTxt: { fontSize: 12, fontWeight: '600' },
  scroll: { flex: 1, paddingHorizontal: 16 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 4 },
  groupDot: { width: 6, height: 6, borderRadius: 3 },
  groupLbl: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  groupLine: { flex: 1, height: 1 },
  groupCount: { fontSize: 11, fontWeight: '600' },
  tripCard: { borderRadius: RADIUS.lg, padding: 16, borderLeftWidth: 4, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  destName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  dateText: { fontSize: 12, fontWeight: '500' },
  detailRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailTxt: { fontSize: 12, fontWeight: '500' },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  deleteBg: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 90, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { alignItems: 'center', gap: 4 },
  deleteTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  hintTxt: { fontSize: 11, fontWeight: '500' },
});

export default HistoryScreen;
