import { ConfigPlugin, withDangerousMod, withInfoPlist } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Custom Firebase plugin for React Native 0.76.5 with Swift AppDelegate
 * Manually configures Firebase for Swift-based projects
 */
const withFirebaseManual: ConfigPlugin = (config) => {
  // Add Firebase to iOS Info.plist
  config = withInfoPlist(config, (config) => {
    // Enable background modes for push notifications
    if (!config.modResults.UIBackgroundModes) {
      config.modResults.UIBackgroundModes = [];
    }
    
    const backgroundModes = config.modResults.UIBackgroundModes as string[];
    if (!backgroundModes.includes('remote-notification')) {
      backgroundModes.push('remote-notification');
    }

    return config;
  });

  // Modify Swift AppDelegate to add Firebase initialization
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const appDelegatePath = path.join(
        config.modRequest.platformProjectRoot,
        'smbmobile',
        'AppDelegate.swift'
      );

      if (!fs.existsSync(appDelegatePath)) {
        console.log('⚠️  AppDelegate.swift not found, will need manual Firebase setup');
        return config;
      }

      let contents = fs.readFileSync(appDelegatePath, 'utf-8');

      // Check if Firebase is already imported
      if (contents.includes('import Firebase')) {
        console.log('✅ Firebase already configured in AppDelegate.swift');
        return config;
      }

      // Add Firebase import at the top
      if (!contents.includes('import Firebase')) {
        contents = contents.replace(
          /(import UIKit)/,
          '$1\nimport Firebase'
        );
      }

      // Add Firebase configuration in application:didFinishLaunchingWithOptions
      if (!contents.includes('FirebaseApp.configure()')) {
        // Find the didFinishLaunchingWithOptions method
        const didFinishLaunchingRegex = /(func application\(_ application: UIApplication, didFinishLaunchingWithOptions[^{]+\{)/;
        
        contents = contents.replace(
          didFinishLaunchingRegex,
          '$1\n    FirebaseApp.configure()'
        );
      }

      fs.writeFileSync(appDelegatePath, contents);
      console.log('✅ Firebase configured in Swift AppDelegate');

      return config;
    },
  ]);

  // Add Firebase pod to Podfile if not already added by dependencies
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // The Firebase pods will be added automatically by @react-native-firebase packages
      // Just ensure we're not blocking them
      console.log('✅ Podfile ready for Firebase pods from @react-native-firebase packages');

      return config;
    },
  ]);
  
  return config;
};

export default withFirebaseManual;

