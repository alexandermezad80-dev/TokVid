import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="onboarding-profile" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="callback" />
    </Stack>
  );
}
