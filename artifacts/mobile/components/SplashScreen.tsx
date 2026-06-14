import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

interface SplashScreenProps {
  onFinish?: () => void;
}

export function SplashScreenComponent({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2000, // 2 seconds
      useNativeDriver: true,
    }).start(() => {
      onFinish?.();
    });
  }, [fadeAnim, onFinish]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Animated.Image
        source={require("../../attached_assets/splash.png")}
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          opacity: fadeAnim,
          resizeMode: "cover",
        }}
      />
    </View>
  );
}
