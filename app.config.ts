import 'dotenv/config';
import 'tsx/cjs';

export default {
  expo: {
    name: 'smb-mobile',
    slug: 'smb-mobile',
    scheme: 'smb-mobile',
    owner: 'insighture',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      buildNumber: '1',
      bundleIdentifier: 'com.insighture.smbmobile',
      infoPlist: {
        NSCameraUsageDescription:
          'Take a photo to use as your profile picture.',
        NSPhotoLibraryUsageDescription:
          'Select a photo to use as your profile picture.',
        ITSAppUsesNonExemptEncryption: false,
        NSUserNotificationsUsageDescription:
          'Allow notifications to stay up to date with important updates and messages.',
      },
      googleServicesFile: './GoogleService-Info.plist',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: 'com.insighture.smbmobileapp',
      googleServicesFile: './google-services.json',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/icon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-localization',
      // Manual Firebase configuration for React Native 0.76.5 with Swift AppDelegate
      // Using 21.5.0 (stable) instead of 23.4.0 (compilation errors with RNFBMessagingModule.m)
      ['./plugins/withFirebaseManual.ts'],
      [
        'expo-splash-screen',
        {
          image: './assets/images/icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
            enableModulePrecompilation: false,
            deploymentTarget: '15.1', // Required for Firebase 21.5.0 and Xcode 16.1
          },
          android: {
            enableProguardInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],
      ['./plugins/withPlugin.ts'],
      ['./plugins/withPodfileModifications.ts'],
    ],
    experiments: {
      typedRoutes: true,
    },
    cli: {
      appVersionSource: 'project-auto',
    },
    extra: {
      kindeDomain: process.env.KINDE_DOMAIN,
      kindeClientId: process.env.KINDE_CLIENT_ID,
      kindeScopes: process.env.KINDE_SCOPES,
      kindeAudience: process.env.KINDE_AUDIENCE,
      PUBLIC_API_URL: process.env.PUBLIC_API_URL,
    },
  },
};
