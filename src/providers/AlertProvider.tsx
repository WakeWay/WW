import React, { createContext, useContext, useState, ReactNode } from 'react';
import AwesomeAlert from 'react-native-awesome-alerts';
import { useTheme } from '@hooks/useTheme';

type AlertConfig = {
  title?: string;
  message?: string;
  showCancelButton?: boolean;
  showConfirmButton?: boolean;
  cancelText?: string;
  confirmText?: string;
  onCancel?: () => void;
  onConfirm?: () => void;
  confirmButtonColor?: string;
  cancelButtonColor?: string;
};

interface AlertContextData {
  showAlert: (config: AlertConfig) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextData | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({});

  const showAlert = (newConfig: AlertConfig) => {
    setConfig(newConfig);
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
    // Delay wiping config slightly to keep text visible during exit animation
    setTimeout(() => {
      setConfig({});
    }, 400);
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <AwesomeAlert
        show={visible}
        showProgress={false}
        title={config.title || 'Alert'}
        message={config.message || ''}
        closeOnTouchOutside={true}
        closeOnHardwareBackPress={false}
        showCancelButton={config.showCancelButton || false}
        showConfirmButton={config.showConfirmButton ?? true}
        cancelText={config.cancelText || 'Cancel'}
        confirmText={config.confirmText || 'OK'}
        confirmButtonColor={config.confirmButtonColor || colors.primary}
        cancelButtonColor={config.cancelButtonColor || colors.surfaceVariant || colors.border}
        onCancelPressed={() => {
          hideAlert();
          if (config.onCancel) config.onCancel();
        }}
        onConfirmPressed={() => {
          hideAlert();
          if (config.onConfirm) config.onConfirm();
        }}
        onDismiss={() => {
          hideAlert();
        }}
        contentContainerStyle={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          minWidth: 280,
          maxWidth: '85%',
          paddingHorizontal: 20,
          paddingVertical: 24,
        }}
        titleStyle={{
          color: colors.text,
          fontSize: 20,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 8,
        }}
        messageStyle={{
          color: colors.textSecondary,
          fontSize: 16,
          textAlign: 'center',
          lineHeight: 22,
        }}
        cancelButtonTextStyle={{
          color: colors.text,
          fontSize: 16,
          fontWeight: '600',
        }}
        confirmButtonTextStyle={{
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: '600',
        }}
        actionContainerStyle={{
          marginTop: 20,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        cancelButtonStyle={{
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 12,
          minWidth: 100,
          alignItems: 'center',
          marginHorizontal: 8,
        }}
        confirmButtonStyle={{
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 12,
          minWidth: 100,
          alignItems: 'center',
          marginHorizontal: 8,
        }}
      />
    </AlertContext.Provider>
  );
};
