/**
 * Settings Screen — Premium edition with profile card, visual theme picker, danger zone
 */

import React, { useState } from 'react';
import {
  View, StyleSheet, SafeAreaView, ScrollView, Text,
  Switch, TouchableOpacity, Platform, StatusBar,
  Linking, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { notificationService } from '@services/notificationService';
import Icon from '@components/Icon';
import { useTripStore } from '@store/useTripStore';
import { useLocationPermissions } from '@hooks/useTracking';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/useAuthStore';
import TermsModal from '@components/TermsModal';
import { Button } from '@components/UIComponents';
import AvatarInitials from '@components/AvatarInitials';
import { DEFAULT_RADIUS_METERS, RADIUS_OPTIONS } from '@/constants';
import { useAlert } from '../providers/AlertProvider';
import { GRADIENTS, SHADOWS, RADIUS as R } from '@/constants/theme';

// ─── Toggle Row ───────────────────────────────────────────────────────────────

const ToggleRow: React.FC<{ label: string; desc: string; value: boolean; onChange: (v: boolean) => void; icon: string; iconColor: string; disabled?: boolean }> = ({ label, desc, value, onChange, icon, iconColor, disabled }) => {
  const { colors } = useTheme();
  return (
    <View style={[rowStyles.row, { borderBottomColor: colors.border, opacity: disabled ? 0.5 : 1 }]}>
      <View style={[rowStyles.iconWrap, { backgroundColor: iconColor + '18' }]}>
        <Icon name={icon} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[rowStyles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[rowStyles.desc, { color: colors.textSecondary }]}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary + '80' }}
        thumbColor={value ? colors.primary : colors.textSecondary}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
};

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600' },
  desc: { fontSize: 12, marginTop: 1 },
});

// ─── Permission Row ───────────────────────────────────────────────────────────

const PermissionRow: React.FC<{ icon: string; label: string; status: string; onRequest: () => void }> = ({ icon, label, status, onRequest }) => {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const granted = status === 'granted';
  return (
    <View style={[rowStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[rowStyles.iconWrap, { backgroundColor: (granted ? colors.success : colors.danger) + '18' }]}>
        <Icon name={icon} size={16} color={granted ? colors.success : colors.danger} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[rowStyles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[rowStyles.desc, { color: granted ? colors.success : colors.danger, fontWeight: '700' }]}>
          {granted ? '✓ Granted' : '✗ Not Granted'}
        </Text>
      </View>
      {!granted ? (
        <Button title="Grant" size="small" onPress={onRequest} />
      ) : (
        <Button title="Revoke" size="small" variant="outline" onPress={() => showAlert({
          title: 'Revoke Permission', message: 'Go to device Settings to toggle off this permission.',
          showCancelButton: true, confirmText: 'Open Settings', confirmButtonColor: colors.danger,
          onConfirm: () => Linking.openSettings(),
        })} />
      )}
    </View>
  );
};

// ─── Section Card ─────────────────────────────────────────────────────────────

const SectionCard: React.FC<{ title: string; icon: string; accentColor: string; children: React.ReactNode; colors: any }> = ({ title, icon, accentColor, children, colors }) => (
  <View style={[secStyles.card, { backgroundColor: colors.surface, borderLeftColor: accentColor, ...SHADOWS.subtle }]}>
    <View style={secStyles.heading}>
      <View style={[secStyles.headIcon, { backgroundColor: accentColor + '18' }]}>
        <Icon name={icon} size={16} color={accentColor} />
      </View>
      <Text style={[secStyles.headTitle, { color: colors.text }]}>{title}</Text>
    </View>
    {children}
  </View>
);

const secStyles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 14, borderRadius: R.lg, padding: 18, borderLeftWidth: 3, paddingLeft: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, paddingBottom: 10, borderBottomWidth: 1 },
  headIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headTitle: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
});

// ─── Main ─────────────────────────────────────────────────────────────────────

const SettingsScreen = () => {
  const store = useTripStore();
  const { isDark, colors, themeMode, setDarkMode } = useTheme();
  const { showAlert } = useAlert();
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateOtp, setDeactivateOtp] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const { permissions, requestForegroundPermission, requestBackgroundPermission } = useLocationPermissions();

  const email = useAuthStore.getState().user?.email;

  const handleLogout = () => showAlert({
    title: 'Log Out', message: 'Are you sure you want to log out?',
    showCancelButton: true, confirmText: 'Log Out', confirmButtonColor: colors.danger,
    onConfirm: () => setTimeout(() => useAuthStore.getState().logout(), 300),
  });

  const handleDeactivateRequest = () => showAlert({
    title: 'Deactivate Account', message: 'This will permanently delete your account and all data. An OTP will be sent to confirm.',
    showCancelButton: true, confirmText: 'Send Code', confirmButtonColor: colors.danger,
    onConfirm: async () => {
      if (email) {
        setShowDeactivateModal(true);
        setDeactivateOtp('');
        try { await useAuthStore.getState().requestOtp(email, 'deactivate'); }
        catch { setShowDeactivateModal(false); showAlert({ title: 'Error', message: 'Failed to send OTP.' }); }
      }
    },
  });

  const handleDeactivateConfirm = async () => {
    if (!deactivateOtp || deactivateOtp.length < 6) return;
    setIsDeactivating(true);
    try {
      await useAuthStore.getState().deactivateAccount(deactivateOtp.trim());
      setShowDeactivateModal(false);
      showAlert({ title: 'Deleted', message: 'Your account has been permanently deleted.' });
    } catch (e: any) {
      showAlert({ title: 'Error', message: e.message || 'Verification failed.' });
    } finally { setIsDeactivating(false); }
  };

  const handlePickSound = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        const newUri = FileSystem.documentDirectory + 'custom_alarm_' + Date.now() + '.mp3';
        await FileSystem.copyAsync({ from: asset.uri, to: newUri });
        store.updateSettings({ customAlarmSoundUri: newUri, customAlarmSoundName: asset.name });
        await notificationService.unloadAlarmSound();
        showAlert({ title: 'Done', message: 'Custom alarm sound set.' });
      }
    } catch { showAlert({ title: 'Error', message: 'Could not pick audio file.' }); }
  };

  const clearSound = async () => {
    store.updateSettings({ customAlarmSoundUri: null, customAlarmSoundName: null });
    await notificationService.unloadAlarmSound();
  };

  const THEME_OPTIONS = [
    { key: 'light', label: 'Light', icon: 'sunny-outline', color: '#F59E0B' },
    { key: 'dark', label: 'Dark', icon: 'moon-outline', color: '#6366F1' },
    { key: 'system', label: 'System', icon: 'phone-portrait-outline', color: '#10B981' },
  ] as const;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Header ─────────────────────────────── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </View>

        {/* ── Profile Card ───────────────────────── */}
        <LinearGradient colors={isDark ? GRADIENTS.heroDark : GRADIENTS.hero} style={[styles.profileCard, { ...SHADOWS.elevated }]}>
          <AvatarInitials email={email} size={60} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {email ? email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1) : 'Traveler'}
            </Text>
            <Text style={styles.profileEmail}>{email || 'Not signed in'}</Text>
            <View style={styles.verifiedBadge}>
              <Icon name="checkmark-circle" size={12} color="#4ADE80" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Alarm Preferences ──────────────────── */}
        <SectionCard title="Alarm" icon="alarm-outline" accentColor={colors.danger} colors={colors}>
          <ToggleRow label="Sound" desc="Play alarm sound on trigger" value={store.settings.soundEnabled} onChange={v => store.updateSettings({ soundEnabled: v })} icon="volume-high-outline" iconColor={colors.danger} />
          <ToggleRow label="Vibration" desc="Vibrate when alarm triggers" value={store.settings.vibrationEnabled} onChange={v => store.updateSettings({ vibrationEnabled: v })} icon="phone-portrait-outline" iconColor={colors.warning} />
          <ToggleRow label="Snooze" desc="Allow snoozing the alarm" value={store.settings.snoozeEnabled} onChange={v => store.updateSettings({ snoozeEnabled: v })} icon="timer-outline" iconColor={colors.primary} />
          <View style={[rowStyles.row, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[rowStyles.iconWrap, { backgroundColor: colors.accent + '18' }]}>
                <Icon name="musical-notes-outline" size={16} color={colors.accent} />
              </View>
              <View>
                <Text style={[rowStyles.label, { color: colors.text }]}>Custom Sound</Text>
                <Text style={[rowStyles.desc, { color: colors.textSecondary }]}>{store.settings.customAlarmSoundName || 'Default'}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Choose File" size="small" onPress={handlePickSound} />
              {store.settings.customAlarmSoundUri && <Button title="Reset" size="small" variant="outline" onPress={clearSound} />}
            </View>
          </View>
        </SectionCard>

        {/* ── Default Radius ──────────────────────── */}
        <SectionCard title="Default Radius" icon="scan-circle-outline" accentColor={colors.primary} colors={colors}>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>Alert distance for new trips</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
            {RADIUS_OPTIONS.map((r: number) => {
              const active = store.settings.defaultRadius === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.radiusChip, { backgroundColor: active ? colors.primary : colors.background, borderColor: active ? colors.primary : colors.border }]}
                  onPress={() => store.updateSettings({ defaultRadius: r })}
                >
                  <Text style={[styles.radiusChipText, { color: active ? '#FFFFFF' : colors.text }]}>{r}m</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SectionCard>

        {/* ── Theme ──────────────────────────────── */}
        <SectionCard title="Appearance" icon="color-palette-outline" accentColor={colors.accent} colors={colors}>
          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map(t => {
              const active = themeMode === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.themeCard, { backgroundColor: colors.background, borderColor: active ? t.color : colors.border, borderWidth: active ? 2 : 1 }]}
                  onPress={() => setDarkMode(t.key)}
                >
                  <View style={[styles.themeIconWrap, { backgroundColor: t.color + '20' }]}>
                    <Icon name={t.icon} size={22} color={t.color} />
                  </View>
                  <Text style={[styles.themeLabel, { color: active ? t.color : colors.text }]}>{t.label}</Text>
                  {active && <View style={[styles.themeDot, { backgroundColor: t.color }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>

        {/* ── Permissions ─────────────────────────── */}
        <SectionCard title="Permissions" icon="shield-checkmark-outline" accentColor={colors.success} colors={colors}>
          <PermissionRow icon="location-outline" label="Foreground Location" status={permissions.location} onRequest={async () => { const g = await requestForegroundPermission(); showAlert({ title: 'Permission', message: g ? 'Granted!' : 'Denied.' }); }} />
          <PermissionRow icon="location-outline" label="Background Location" status={permissions.locationBackground} onRequest={async () => { const g = await requestBackgroundPermission(); showAlert({ title: 'Permission', message: g ? 'Granted!' : 'Denied.' }); }} />
          <PermissionRow icon="notifications-outline" label="Notifications" status={permissions.notifications} onRequest={() => {}} />
        </SectionCard>

        {/* ── Account ─────────────────────────────── */}
        <SectionCard title="Account" icon="person-outline" accentColor={colors.primary} colors={colors}>
          <TouchableOpacity style={[rowStyles.row, { borderBottomColor: colors.border }]} onPress={handleLogout}>
            <View style={[rowStyles.iconWrap, { backgroundColor: colors.warning + '18' }]}>
              <Icon name="log-out-outline" size={16} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[rowStyles.label, { color: colors.text }]}>Log Out</Text>
              <Text style={[rowStyles.desc, { color: colors.textSecondary }]}>End your current session</Text>
            </View>
            <Icon name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[rowStyles.row, { borderBottomWidth: 0 }]} onPress={() => setShowTermsModal(true)}>
            <View style={[rowStyles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
              <Icon name="document-text-outline" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[rowStyles.label, { color: colors.text }]}>Terms & Conditions</Text>
            </View>
            <Icon name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </SectionCard>

        {/* ── Danger Zone ─────────────────────────── */}
        <View style={[styles.dangerZone, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '40' }]}>
          <View style={styles.dangerHeader}>
            <Icon name="warning-outline" size={16} color={colors.danger} />
            <Text style={[styles.dangerTitle, { color: colors.danger }]}>Danger Zone</Text>
          </View>
          <Text style={[styles.dangerDesc, { color: colors.textSecondary }]}>This action is irreversible and will permanently delete your account and all data.</Text>
          <Button title="Deactivate Account" variant="danger" onPress={handleDeactivateRequest} style={{ marginTop: 12 }} />
        </View>

        {/* ── About ───────────────────────────────── */}
        <SectionCard title="About" icon="information-circle-outline" accentColor={colors.textSecondary} colors={colors}>
          {[{ label: 'Version', value: '1.0.0' }, { label: 'Developer', value: 'WakeWay Team' }].map((item, i, arr) => (
            <View key={item.label} style={[rowStyles.row, { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}>
              <Text style={[rowStyles.label, { color: colors.textSecondary, flex: 1 }]}>{item.label}</Text>
              <Text style={[rowStyles.desc, { color: colors.text, fontWeight: '600' }]}>{item.value}</Text>
            </View>
          ))}
        </SectionCard>

        <Text style={[styles.footer, { color: colors.textMuted || colors.textSecondary }]}>WakeWay — Never miss your stop ✈️</Text>
      </ScrollView>

      {/* Deactivate Modal */}
      <Modal visible={showDeactivateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
            <Icon name="warning" size={32} color={colors.danger} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Deactivation</Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>Enter the 6-digit code sent to your email</Text>
            <TextInput
              style={[styles.otpInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="000000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
              value={deactivateOtp}
              onChangeText={setDeactivateOtp}
              editable={!isDeactivating}
            />
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <Button title="Cancel" variant="outline" onPress={() => setShowDeactivateModal(false)} disabled={isDeactivating} style={{ flex: 1 }} />
              <Button title={isDeactivating ? 'Wait...' : 'Confirm'} variant="danger" onPress={handleDeactivateConfirm} disabled={deactivateOtp.length < 6 || isDeactivating} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      <TermsModal visible={showTermsModal} onClose={() => setShowTermsModal(false)} viewOnly={true} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  profileCard: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: R.xl,
    padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  profileEmail: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 6 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 11, color: '#4ADE80', fontWeight: '700' },
  sectionDesc: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  radiusChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: R.pill, borderWidth: 1.5 },
  radiusChipText: { fontSize: 13, fontWeight: '700' },
  themeGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
  themeCard: { flex: 1, borderRadius: R.lg, padding: 14, alignItems: 'center', gap: 8 },
  themeIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  themeLabel: { fontSize: 12, fontWeight: '700' },
  themeDot: { width: 6, height: 6, borderRadius: 3 },
  dangerZone: { marginHorizontal: 16, marginBottom: 14, borderRadius: R.lg, padding: 18, borderWidth: 1 },
  dangerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dangerTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  dangerDesc: { fontSize: 12, lineHeight: 18 },
  footer: { textAlign: 'center', fontSize: 12, fontWeight: '500', paddingVertical: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { borderRadius: R.xl, padding: 28, width: '100%', alignItems: 'center', gap: 12, ...SHADOWS.elevated },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalDesc: { fontSize: 13, textAlign: 'center' },
  otpInput: { borderWidth: 1.5, borderRadius: R.md, padding: 16, fontSize: 28, letterSpacing: 10, textAlign: 'center', width: '100%', fontWeight: '700' },
});

export default SettingsScreen;
