// Dynamic config (instead of a static app.json) so the Google Maps API keys below are actually
// read from process.env at build time -- static app.json has no variable substitution, "$VAR"
// strings are taken literally and would ship a broken, literal "$IOS_GOOGLE_MAPS_API_KEY" as the key.
module.exports = {
  expo: {
    name: 'OneTap',
    slug: 'onetap',
    scheme: 'onetap',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#1A1A1A',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.onetap.app',
      usesAppleSignIn: true,
      config: {
        googleMapsApiKey: process.env.IOS_GOOGLE_MAPS_API_KEY,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "OneTap uses your location only to verify you're physically at the venue you check into. Your exact location is never shown to other users or stored as a live tracking position.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "OneTap periodically checks that you're still within the venue radius so venue lists stay accurate, and automatically checks you out when you leave. Your exact location is never shown to other users.",
        NSCameraUsageDescription: 'OneTap uses your camera to take a profile photo.',
        NSPhotoLibraryUsageDescription: 'OneTap lets you choose an existing photo from your library for your profile.',
      },
    },
    android: {
      package: 'com.onetap.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1A1A1A',
      },
      config: {
        googleMaps: {
          apiKey: process.env.ANDROID_GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'CAMERA', 'POST_NOTIFICATIONS'],
    },
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-apple-authentication',
      'expo-secure-store',
      [
        'expo-location',
        {
          locationWhenInUsePermission: "OneTap uses your location only to verify you're physically at the venue you check into.",
          locationAlwaysAndWhenInUsePermission:
            "OneTap periodically verifies you're still at the venue and checks you out automatically when you leave.",
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'OneTap lets you choose a profile photo from your library.',
          cameraPermission: 'OneTap uses your camera to take a profile photo.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#E66A5C',
        },
      ],
    ],
    extra: {
      router: {
        origin: false,
      },
    },
  },
};
