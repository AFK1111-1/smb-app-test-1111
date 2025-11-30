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
    puts "\\n🔧 Running Firebase Fix post_install hook..."
    installer.pods_project.targets.each do |target|
      puts "  📦 Configuring target: #{target.name}"
      target.build_configurations.each do |config|
        # Common build settings
        config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULES'] = 'NO'
        config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO'
        
        # Deployment target fix
        deployment_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if deployment_target && deployment_target.to_f < 13.0
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
        end
        
        # Swift settings - CRITICAL: Set based on configuration type
        config.build_settings['SWIFT_VERSION'] = '5.0'
        config.build_settings['SWIFT_COMPILATION_MODE'] = 'wholemodule'
        
        # Fix Swift optimization level based on build configuration
        if config.name == 'Debug'
          config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
        elsif config.name == 'Release'
          config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-O'
        end
        
        # Fix for Xcode 16.1
        config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'arm64'
        
        # Enable modular headers for Firebase and related pods
        if (target.name.include?('RNFB') || 
            target.name.include?('Firebase') ||
            target.name.include?('Google') ||
            target.name.include?('GTM') ||
            target.name.include?('Promises') ||
            target.name.include?('GoogleDataTransport') ||
            target.name.include?('GoogleUtilities') ||
            target.name.include?('nanopb') ||
            target.name.include?('leveldb'))
          puts "    🔥 Applying Firebase-specific settings to #{target.name}"
          config.build_settings['DEFINES_MODULE'] = 'YES'
          config.build_settings['ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES'] = 'NO'
          config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
          config.build_settings['CLANG_WARN_STRICT_PROTOTYPES'] = 'NO'
          
          # For Firebase messaging specifically - ensure proper linking
          if target.name.include?('RNFBMessaging')
            puts "    📨 Applying RNFBMessaging-specific fixes"
            config.build_settings['FRAMEWORK_SEARCH_PATHS'] ||= ['$(inherited)']
            config.build_settings['FRAMEWORK_SEARCH_PATHS'] << '"${PODS_CONFIGURATION_BUILD_DIR}/FirebaseMessaging"'
            config.build_settings['HEADER_SEARCH_PATHS'] ||= ['$(inherited)']
            config.build_settings['HEADER_SEARCH_PATHS'] << '"${PODS_ROOT}/Headers/Public"'
            config.build_settings['HEADER_SEARCH_PATHS'] << '"${PODS_ROOT}/Headers/Public/FirebaseMessaging"'
            config.build_settings['OTHER_LDFLAGS'] ||= ['$(inherited)']
            config.build_settings['OTHER_LDFLAGS'] << '-framework "UserNotifications"'
          end
        end
        
        # For React-Core privacy target
        if target.name.include?('React-Core') && target.name.include?('privacy')
          puts "    ⚛️  Applying React-Core privacy target fixes"
          config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
        end
      end
    end
    
    # Project-level settings
    puts "  🏗 Configuring project-level settings..."
    installer.pods_project.build_configurations.each do |config|
      config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
      config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULES'] = 'NO'
    end
    
    puts "✅ Firebase Fix post_install hook completed\\n"
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
