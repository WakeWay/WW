import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, Image, StatusBar } from 'react-native';
import { useAuthStore } from '@store/useAuthStore';
import { useTheme } from '@hooks/useTheme';
import { MaterialIcons } from '@expo/vector-icons';
import { checkTermsAccepted, setTermsAccepted as saveTerms } from '@utils/storage';
import TermsModal from '@components/TermsModal';

const SignupScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsInitialized, setTermsInitialized] = useState(false);
  
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  const requestOtp = useAuthStore(state => state.requestOtp);
  const verifyOtp = useAuthStore(state => state.verifyOtp);
  const otpSent = useAuthStore(state => state.otpSent);
  const resetOtpState = useAuthStore(state => state.resetOtpState);
  
  const isLoading = useAuthStore(state => state.isLoading);
  const error = useAuthStore(state => state.error);
  const clearError = useAuthStore(state => state.clearError);

  useEffect(() => {
    const initTerms = async () => {
      const isAccepted = await checkTermsAccepted();
      setTermsAccepted(isAccepted);
      if (!isAccepted) {
        setShowTermsModal(true);
      }
      setTermsInitialized(true);
    };
    initTerms();

    return () => resetOtpState(); // Reset when leaving
  }, [resetOtpState]);

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
    if (otpSent && otp) {
      await verifyOtp(email, otp);
    } else if (!otpSent) {
      await requestOtp(email);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.formContainer}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              clearError();
              navigation.goBack();
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Image 
              source={require('../../../assets/WakeWay_log.png')} 
              style={styles.logo} 
              resizeMode="contain" 
            />
            <Text style={styles.title}>{otpSent ? 'Check Your Email' : 'Create Account'}</Text>
            <Text style={styles.subtitle}>
              {otpSent ? `We sent a code to ${email}` : 'Sign up using a one-time code'}
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          )}

          {/* Form */}
          {!otpSent ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) clearError();
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit code"
                placeholderTextColor={colors.textSecondary}
                value={otp}
                onChangeText={(text) => {
                  setOtp(text);
                  if (error) clearError();
                }}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          )}

          <TouchableOpacity 
            style={[styles.button, (!email || (otpSent && !otp) || !termsAccepted) && styles.buttonDisabled]} 
            onPress={handleAction}
            disabled={(!email || (otpSent && !otp)) || isLoading || !termsAccepted}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{otpSent ? 'Verify Code' : 'Send Code'}</Text>
            )}
          </TouchableOpacity>

          {otpSent && (
            <View style={styles.footer}>
              <TouchableOpacity onPress={resetOtpState}>
                <Text style={styles.footerLink}>Change Email</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.footer, { marginTop: otpSent ? 16 : 32 }]}>
            <TouchableOpacity onPress={() => setShowTermsModal(true)}>
              <Text style={[styles.footerLink, { color: termsAccepted ? colors.textSecondary : colors.warning, fontSize: 13, textDecorationLine: 'underline' }]}>
                {termsAccepted ? 'Review Terms & Conditions' : '⚠️ Action Required: Accept Terms & Conditions'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.footer, { marginTop: 16 }]}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => {
              clearError();
              navigation.navigate('Login');
            }}>
              <Text style={styles.footerLink}>Log In</Text>
            </TouchableOpacity>
          </View>

        </View>

        {termsInitialized && (
          <TermsModal 
            visible={showTermsModal} 
            onAccept={handleAcceptTerms} 
            onDecline={handleDeclineTerms}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  keyboardView: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 0,
    marginTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: colors.danger + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default SignupScreen;
