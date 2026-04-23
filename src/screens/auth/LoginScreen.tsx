/**
 * Login Screen — Premium glassmorphism card with floating labels
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
import { GRADIENTS, SHADOWS, RADIUS } from '@/constants/theme';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const { colors, isDark } = useTheme();

  const requestOtp = useAuthStore(s => s.requestOtp);
  const verifyOtp = useAuthStore(s => s.verifyOtp);
  const otpSent = useAuthStore(s => s.otpSent);
  const resetOtpState = useAuthStore(s => s.resetOtpState);
  const isLoading = useAuthStore(s => s.isLoading);
  const error = useAuthStore(s => s.error);
  const clearError = useAuthStore(s => s.clearError);

  // Logo float animation
  const floatAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo float
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    // Card entrance
    Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, bounciness: 6, speed: 8, delay: 200 }).start();

    return () => resetOtpState();
  }, []);

  const handleAction = async () => {
    if (!email) return;
    if (otpSent && otp) await verifyOtp(email, otp);
    else if (!otpSent) await requestOtp(email);
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <LinearGradient colors={isDark ? GRADIENTS.heroDark : GRADIENTS.hero} style={styles.bgGradient}>

        {/* Decorative circles */}
        <View style={[styles.deco1, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
        <View style={[styles.deco2, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kbView}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Logo */}
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
                {otpSent ? 'Check Your Email 📬' : 'Welcome Back ✈️'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {otpSent ? `We sent a code to ${email}` : 'Sign in with a one-time code — no password needed'}
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

              {/* CTA Button */}
              <TouchableOpacity
                style={[styles.ctaWrap, { opacity: (!email || (otpSent && !otp)) ? 0.6 : 1 }]}
                onPress={handleAction}
                disabled={!email || (otpSent && !otp) || isLoading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={GRADIENTS.primaryVibrant} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
                  {isLoading
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={styles.ctaText}>{otpSent ? 'Verify Code →' : 'Send Code →'}</Text>
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
                <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                  <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                    New here? <Text style={{ color: colors.primary, fontWeight: '700' }}>Create account</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Text style={styles.legal}>By continuing you agree to our Terms & Privacy Policy</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGradient: { flex: 1 },
  deco1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -80, right: -80 },
  deco2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, bottom: 100, left: -60 },
  kbView: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 90, height: 90, borderRadius: 22 },
  card: { borderRadius: RADIUS.xl, padding: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  errorBox: { borderRadius: RADIUS.md, padding: 12, marginBottom: 16, borderWidth: 1 },
  errorText: { fontSize: 13, fontWeight: '600' },
  ctaWrap: { borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: 4 },
  ctaGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  footerLinks: { alignItems: 'center', gap: 12, marginTop: 20 },
  linkText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  legal: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 20, paddingHorizontal: 24 },
});

export default LoginScreen;
