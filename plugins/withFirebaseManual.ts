import { ConfigPlugin, withDangerousMod, withInfoPlist } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Manual Firebase configuration for React Native 0.76.5 with Swift AppDelegate
 * 
 * This plugin:
 * 1. Adds Firebase imports to Swift AppDelegate
 * 2. Adds FirebaseApp.configure() call
 * 3. Configures Info.plist for remote notifications
 * 
 * Why manual configuration?
 * - Firebase 21.5.0 is stable but auto-config plugins don't support Swift AppDelegate
 * - Firebase 23.4.0 supports Swift but has compilation issues with New Architecture
 * - Manual setup is the most reliable approach for RN 0.76.5
 */
const withFirebaseManual: ConfigPlugin = (config) => {
  // Configure Info.plist for push notifications
  config = withInfoPlist(config, (config) => {
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
        console.warn('⚠️  AppDelegate.swift not found - Firebase will need manual setup');
        return config;
      }

      let contents = fs.readFileSync(appDelegatePath, 'utf-8');

      // Skip if already configured
      if (contents.includes('import Firebase') && contents.includes('FirebaseApp.configure()')) {
        console.log('✅ Firebase already configured in AppDelegate.swift');
        return config;
      }

      // Add Firebase import
      if (!contents.includes('import Firebase')) {
        contents = contents.replace(
          /(import UIKit)/,
          '$1\nimport Firebase'
        );
        console.log('✅ Added Firebase import to AppDelegate.swift');
      }

      // Add Firebase configuration
      if (!contents.includes('FirebaseApp.configure()')) {
        // Find didFinishLaunchingWithOptions and add Firebase.configure()
        const didFinishRegex = /(func application\(_ application: UIApplication, didFinishLaunchingWithOptions[^{]+\{)(\s*)/;
        
        if (didFinishRegex.test(contents)) {
          contents = contents.replace(
            didFinishRegex,
            '$1$2\n    FirebaseApp.configure()$2'
          );
          console.log('✅ Added FirebaseApp.configure() to AppDelegate.swift');
        } else {
          console.warn('⚠️  Could not find didFinishLaunchingWithOptions method');
        }
      }

      fs.writeFileSync(appDelegatePath, contents);
      console.log('✅ Firebase manual configuration completed');

      return config;
    },
  ]);
  
  return config;
};

export default withFirebaseManual;
