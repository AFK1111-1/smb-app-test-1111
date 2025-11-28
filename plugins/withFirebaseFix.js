const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withFirebaseFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const filePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      const contents = fs.readFileSync(filePath, 'utf-8');
      
      // Add Firebase pods if not already present
      if (!contents.includes('RNFBApp')) {
        let newContents = contents.replace(
          /(target 'smbmobile' do)/,
          `$1
  # Firebase
  pod 'Firebase/Core'
  pod 'Firebase/Messaging'
  pod 'RNFBApp', :path => '../node_modules/@react-native-firebase/app'
  pod 'RNFBMessaging', :path => '../node_modules/@react-native-firebase/messaging'`
        );
        
        // Add post_install hook if not present
        if (!contents.includes('post_install')) {
          newContents += `

  post_install do |installer|
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        # Common build settings
        config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULES'] = 'NO'
        config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
        
        # Swift settings
        config.build_settings['SWIFT_VERSION'] = '5.0'
        config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
        config.build_settings['SWIFT_COMPILATION_MODE'] = 'wholemodule'
        
        # Fix for Xcode 16.1
        config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'arm64'
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
        
        # Enable modular headers for Firebase
        if (target.name.include?('RNFB') || 
            target.name.include?('Firebase') ||
            target.name.include?('Google') ||
            target.name.include?('GTM') ||
            target.name.include?('Promises') ||
            target.name.include?('GoogleDataTransport') ||
            target.name.include?('GoogleUtilities') ||
            target.name.include?('nanopb') ||
            target.name.include?('leveldb')) {
          config.build_settings['DEFINES_MODULE'] = 'YES'
          config.build_settings['ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES'] = 'YES'
        }
      end
    end
  end
`;
        }
        
        fs.writeFileSync(filePath, newContents, 'utf-8');
        console.log('✅ Added Firebase pods and configuration to Podfile');
      }
      
      return config;
    },
  ]);
};

module.exports = withFirebaseFix;
