import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "@/lib/auth-store";
import { Colors } from "@/constants/colors";

const STEP_ROUTES: Record<string, string> = {
  PROFILE_SETUP: "/(onboarding)/profile-setup",
  QUESTIONNAIRE: "/(onboarding)/questionnaire",
  PRIORITIES: "/(onboarding)/priorities",
  COMPLETE: "/(app)/discover",
};

export default function Index() {
  const { accessToken, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.rose50 }}>
        <ActivityIndicator size="large" color={Colors.rose500} />
      </View>
    );
  }

  if (!accessToken) return <Redirect href="/(auth)/login" />;

  const route = STEP_ROUTES[user?.onboardingStep ?? "PROFILE_SETUP"] ?? "/(app)/discover";
  return <Redirect href={route as never} />;
}
