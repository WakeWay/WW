const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
};

export const getApiUrl = (): string => `${getRequiredEnv('EXPO_PUBLIC_API_URL').replace(/\/$/, '')}/api`;

export const getOptionalApiUrl = (): string | null => {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  return value ? `${value.replace(/\/$/, '')}/api` : null;
};

export const getSupabaseConfig = () => ({
  url: getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL'),
  publishableKey: getRequiredEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
});
