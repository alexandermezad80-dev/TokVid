import { useEffect } from "react";
import { router } from "expo-router";
import { requestRegistration } from "../../lib/features/auth/services/registrationBridge";
export default function RegistrationGateway() {
 useEffect(() => { router.replace("/(tabs)"); const timer = setTimeout(() => requestRegistration(), 100); return () => clearTimeout(timer); }, []);
 return null;
}
