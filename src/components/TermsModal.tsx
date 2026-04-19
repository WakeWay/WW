import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@hooks/useTheme';

interface TermsModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const { height: screenHeight } = Dimensions.get('window');

const TermsModal: React.FC<TermsModalProps> = ({ visible, onAccept, onDecline }) => {
  const { colors } = useTheme();
  // We explicitly override the background for the glassmorphic look
  const styles = getStyles(colors);

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <BlurView intensity={20} tint={colors.background === '#FFFFFF' ? 'light' : 'dark'} style={styles.overlay}>
        <View style={styles.dialogBox}>
          <View style={styles.header}>
            <Text style={styles.title}>Terms & Conditions</Text>
            <Text style={styles.subtitle}>Please review before using WakeWay</Text>
          </View>

          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>1. Background Location Tracking</Text>
          <Text style={styles.paragraph}>
            WakeWay exists strictly to alert you when you approach your destination. To do this, the application requires access to your device's Background Location. This allows us to track your GPS coordinates natively while your phone is locked. We do not sell or broker this real-time location.
          </Text>

          <Text style={styles.sectionTitle}>2. Data Privacy & Cloud Storage</Text>
          <Text style={styles.paragraph}>
            We utilize a strictly password-less model (OTP). Your email address is exclusively utilized for authentication and secure account recovery. When you complete a trip, the coordinates and timestamps are securely encrypted and archived to our cloud servers so you can review your trip history across multiple devices.
          </Text>

          <Text style={styles.sectionTitle}>3. Local Notifications & Alarms</Text>
          <Text style={styles.paragraph}>
            By accepting, you grant WakeWay permission to override silent profiles using our high-priority notification channels to ring loud alarms when you reach your radius.
          </Text>

          <Text style={styles.sectionTitle}>4. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            WakeWay relies on the physical hardware limits of your phone's GPS antenna and your operating system's background task management. We cannot guarantee 100% accuracy in subways, tunnels, or offline zones. WakeWay is not liable for missed stops due to signal loss, dead batteries, or OS restrictions.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.actionButton} onPress={onDecline}>
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={onAccept}>
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Significantly lighter alpha to let the blur do the work
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogBox: {
    width: '100%',
    maxHeight: screenHeight * 0.8,
    // Glassmorphic simulation colors
    backgroundColor: colors.surface === '#FFFFFF' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 35, 45, 0.95)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border === '#FFFFFF' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scrollContainer: {
    flexShrink: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border + '50',
    backgroundColor: colors.surface === '#FFFFFF' ? 'rgba(250, 250, 250, 0.9)' : 'rgba(25, 30, 40, 0.9)',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  declineText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  acceptText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default TermsModal;
