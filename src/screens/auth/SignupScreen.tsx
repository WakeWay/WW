/**
 * Signup Screen — Premium glassmorphism card with Terms & Conditions
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity, SafeAreaView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, StatusBar, Animated, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@store/useAuthStore';
import { useTheme } from '@hooks/useTheme';
import FloatingLabelInput from '@components/FloatingLabelInput';
import TermsModal from '@components/TermsModal';
import { checkTermsAccepted, setTermsAccepted as saveTerms } from '@utils/storage';
import Icon from '@components/Icon';
import { GRADIENTS, SHADOWS, RADIUS } from '@/constants/theme';

const SignupScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsInitialized, setTermsInitialized] = useState(false);
  const { colors, isDark } = useTheme();

  const requestOtp = useAuthStore(s => s.requestOtp);
  const verifyOtp = useAuthStore(s => s.verifyOtp);
  const otpSent = useAuthStore(s => s.otpSent);
  const resetOtpState = useAuthStore(s => s.resetOtpState);
  const isLoading = useAuthStore(s => s.isLoading);
  const error = useAuthStore(s => s.error);
  const clearError = useAuthStore(s => s.clearError);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const init = async () => {
      const accepted = await checkTermsAccepted();
      setTermsAccepted(accepted);
      if (!accepted) setShowTermsModal(true);
      setTermsInitialized(true);
    };
    init();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, bounciness: 6, speed: 8, delay: 200 }).start();

    return () => resetOtpState();
  }, []);

  const handleAcceptTerms = async () => {
    await saveTerms(true);
    setTermsAccepted(true);
    setShowTermsModal(false);
  };

  const handleDeclineTerms = async () => {
    await saveTerms(false);
    setTermsAccepted(false);
    setShowTermsModal(false);
  };

  const handleAction = async () => {
    if (!email) return;
    if (otpSent && otp) await verifyOtp(email, otp);
    else if (!otpSent) await requestOtp(email, 'signup');
  };

  const canSubmit = !!email && (!otpSent || !!otp) && termsAccepted && !isLoading;

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <LinearGradient colors={isDark ? GRADIENTS.heroDark : GRADIENTS.hero} style={styles.bgGradient}>

        {/* Decorative circles */}
        <View style={[styles.deco1, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
        <View style={[styles.deco2, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kbView}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Back + Logo */}
            <TouchableOpacity style={styles.backBtn} onPress={() => { clearError(); navigation.goBack(); }}>
              <Icon name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>

            <Animated.View style={[styles.logoWrap, { transform: [{ translateY: floatAnim }] }]}>
              <Image source={require('../../../assets/WakeWay_log.png')} style={styles.logo} resizeMode="contain" />
            </Animated.View>

            {/* Glass card */}
            <Animated.View style={[styles.card, {
              backgroundColor: isDark ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.92)',
              opacity: cardAnim,
              transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
              ...SHADOWS.elevated,
            }]}>
              <Text style={[styles.title, { color: colors.text }]}>
                {otpSent ? 'Almost There! 🎉' : 'Create Account 🚀'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {otpSent ? `Enter the code we sent to ${email}` : 'Join WakeWay — never miss your stop again'}
              </Text>

              {/* Error */}
              {error && (
                <View style={[styles.errorBox, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}>
                  <Text style={[styles.errorText, { color: colors.danger }]}>⚠ {error.message}</Text>
                </View>
              )}

              {/* Input */}
              {!otpSent ? (
                <FloatingLabelInput
                  label="Email address"
                  value={email}
                  onChangeText={t => { setEmail(t); if (error) clearError(); }}
                  keyboardType="email-address"
                  icon="mail-outline"
                />
              ) : (
                <FloatingLabelInput
                  label="6-digit verification code"
                  value={otp}
                  onChangeText={t => { setOtp(t); if (error) clearError(); }}
                  keyboardType="number-pad"
                  icon="keypad-outline"
                  maxLength={6}
                />
              )}

              {/* Terms status */}
              <TouchableOpacity
                style={[styles.termsRow, { backgroundColor: termsAccepted ? colors.success + '12' : colors.warning + '12', borderColor: termsAccepted ? colors.success + '40' : colors.warning + '40' }]}
                onPress={() => setShowTermsModal(true)}
              >
                <Icon name={termsAccepted ? 'checkmark-circle' : 'alert-circle-outline'} size={18} color={termsAccepted ? colors.success : colors.warning} />
                <Text style={[styles.termsText, { color: termsAccepted ? colors.success : colors.warning }]}>
                  {termsAccepted ? 'Terms & Conditions accepted' : 'Please accept Terms & Conditions'}
                </Text>
                <Icon name="chevron-forward" size={14} color={termsAccepted ? colors.success : colors.warning} />
              </TouchableOpacity>

              {/* CTA */}
              <TouchableOpacity
                style={[styles.ctaWrap, { opacity: canSubmit ? 1 : 0.5 }]}
                onPress={handleAction}
                disabled={!canSubmit}
                activeOpacity={0.85}
              >
                <LinearGradient colors={GRADIENTS.primaryVibrant} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
                  {isLoading
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={styles.ctaText}>{otpSent ? 'Verify & Sign Up →' : 'Send Code →'}</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>

              {/* Footer links */}
              <View style={styles.footerLinks}>
                {otpSent && (
                  <TouchableOpacity onPress={resetOtpState}>
                    <Text style={[styles.linkText, { color: colors.primary }]}>← Change Email</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => { clearError(); navigation.navigate('Login'); }}>
                  <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                    Already a member? <Text style={{ color: colors.primary, fontWeight: '700' }}>Log in</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Text style={styles.legal}>Your data is private and encrypted. We never share it.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {termsInitialized && (
        <TermsModal visible={showTermsModal} onAccept={handleAcceptTerms} onDecline={handleDeclineTerms} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGradient: { flex: 1 },
  deco1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -80, right: -80 },
  deco2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, bottom: 80, left: -60 },
  kbView: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 8 },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 80, height: 80, borderRadius: 20 },
  card: { borderRadius: RADIUS.xl, padding: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  errorBox: { borderRadius: RADIUS.md, padding: 12, marginBottom: 16, borderWidth: 1 },
  errorText: { fontSize: 13, fontWeight: '600' },
  termsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: RADIUS.md, borderWidth: 1, marginBottom: 16,
  },
  termsText: { flex: 1, fontSize: 13, fontWeight: '600' },
  ctaWrap: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  ctaGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  footerLinks: { alignItems: 'center', gap: 12, marginTop: 20 },
  linkText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  legal: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 20, paddingHorizontal: 24 },
});

export default SignupScreen;
