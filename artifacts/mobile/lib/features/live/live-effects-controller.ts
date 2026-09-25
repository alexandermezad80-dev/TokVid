import {
  BackgroundBlurDegree,
  BackgroundSourceType,
  type IRtcEngine,
  LighteningContrastLevel,
} from "react-native-agora";

let engine: IRtcEngine | null = null;
let broadcaster = false;

export function registerLiveEffectsEngine(
  nextEngine: IRtcEngine,
  isBroadcaster: boolean,
) {
  engine = nextEngine;
  broadcaster = isBroadcaster;
}

export function unregisterLiveEffectsEngine(nextEngine: IRtcEngine) {
  if (engine === nextEngine) {
    engine = null;
    broadcaster = false;
  }
}

function canApply() {
  return engine !== null && broadcaster;
}

export function applyLiveEffect(effectId: string) {
  if (!canApply()) return false;

  switch (effectId) {
    case "filter-natural":
      engine!.setBeautyEffectOptions(true, {
        lighteningContrastLevel: LighteningContrastLevel.LighteningContrastNormal,
        lighteningLevel: 0.15,
        smoothnessLevel: 0.2,
        rednessLevel: 0.05,
        sharpnessLevel: 0.1,
      });
      return true;

    case "filter-warm":
      engine!.setBeautyEffectOptions(true, {
        lighteningContrastLevel: LighteningContrastLevel.LighteningContrastNormal,
        lighteningLevel: 0.25,
        smoothnessLevel: 0.35,
        rednessLevel: 0.2,
        sharpnessLevel: 0.05,
      });
      return true;

    case "filter-cool":
      engine!.setBeautyEffectOptions(true, {
        lighteningContrastLevel: LighteningContrastLevel.LighteningContrastHigh,
        lighteningLevel: 0.2,
        smoothnessLevel: 0.3,
        rednessLevel: 0,
        sharpnessLevel: 0.2,
      });
      return true;

    case "filter-off":
      engine!.setBeautyEffectOptions(false, {});
      return true;

    case "background-blur":
      engine!.enableVirtualBackground(
        true,
        {
          background_source_type: BackgroundSourceType.BackgroundBlur,
          blur_degree: BackgroundBlurDegree.BlurDegreeMedium,
        },
        {},
      );
      return true;

    case "background-off":
      engine!.enableVirtualBackground(false, {}, {});
      return true;

    case "voice-normal":
      engine!.setLocalVoicePitch(1);
      return true;

    case "voice-deep":
      engine!.setLocalVoicePitch(0.75);
      return true;

    case "voice-bright":
      engine!.setLocalVoicePitch(1.35);
      return true;

    default:
      return false;
  }
}
