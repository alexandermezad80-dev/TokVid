const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function copyAsset(projectRoot, relativeSource, relativeDest) {
  const source = path.join(projectRoot, relativeSource);
  const dest = path.join(projectRoot, relativeDest);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);
}

module.exports = function withGlassBranding(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const root = config.modRequest.projectRoot;
      const res = path.join(root, "android", "app", "src", "main", "res");

      copyAsset(
        root,
        "assets/images/branding/icon_glass_foreground.png",
        "android/app/src/main/res/drawable/ic_launcher_glass_foreground.png"
      );
      copyAsset(
        root,
        "assets/images/branding/icon_glass_background.png",
        "android/app/src/main/res/drawable/ic_launcher_glass_background.png"
      );
      copyAsset(
        root,
        "assets/images/branding/splash_glass_android12.png",
        "android/app/src/main/res/drawable/splash_glass_android12.png"
      );

      const mipmap = path.join(res, "mipmap-anydpi-v26");
      fs.mkdirSync(mipmap, { recursive: true });
      fs.writeFileSync(
        path.join(mipmap, "ic_launcher.xml"),
        `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_glass_background" />
    <foreground android:drawable="@drawable/ic_launcher_glass_foreground" />
</adaptive-icon>
`
      );

      const splashValues = path.join(res, "values");
      fs.mkdirSync(splashValues, { recursive: true });
      const splashValuesV31 = path.join(res, "values-v31");
      fs.mkdirSync(splashValuesV31, { recursive: true });

      const baseStyles = path.join(splashValues, "styles.xml");
      if (fs.existsSync(baseStyles)) {
        const xml = fs.readFileSync(baseStyles, "utf8");
        fs.writeFileSync(
          baseStyles,
          xml.replace(
            "</resources>",
            `    <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">#0E96A0</item>
        <item name="postSplashScreenTheme">@style/AppTheme</item>
    </style>
</resources>`
          )
        );
      }

      const v31Styles = path.join(splashValuesV31, "styles.xml");
      fs.writeFileSync(
        v31Styles,
        `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">#0E96A0</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/splash_glass_android12</item>
        <item name="postSplashScreenTheme">@style/AppTheme</item>
    </style>
</resources>
`
      );

      return config;
    },
  ]);
};
