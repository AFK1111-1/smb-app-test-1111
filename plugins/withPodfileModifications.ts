import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Config plugin to fix iOS build issues for Xcode 16.1 and React Native Firebase
 * This plugin performs the following:
 * 1. Sets $RNFirebaseAsStaticFramework = true
 * 2. Enables use_modular_headers! globally
 * 3. Adds a comprehensive post_install hook for build settings
 */
const withPodfileModifications: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      if (!fs.existsSync(podfilePath)) {
        console.warn('Podfile not found at:', podfilePath);
        return config;
      }

      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // 1. Ensure global Firebase static framework flag
      if (!contents.includes('$RNFirebaseAsStaticFramework = true')) {
        contents = '$RNFirebaseAsStaticFramework = true\n' + contents;
      }

      // 2. Enable modular headers globally - fixes module map generation for Firebase
      if (!contents.includes('use_modular_headers!')) {
        contents = 'use_modular_headers!\n' + contents;
      }

      // 3. Comprehensive post_install hook settings
      const postInstallSettings = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        # Fix deployment target for Xcode 16.1
        deployment_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if deployment_target && deployment_target.to_f < 15.1
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end

        # Xcode 16.1 Compatibility Flags
        config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
        config.build_settings['DEFINES_MODULE'] = 'YES'
        config.build_settings['SWIFT_COMPILATION_MODE'] = 'wholemodule'
        config.build_settings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO'
        
        # Disable treating modularity warnings as errors
        cflags = config.build_settings['OTHER_CFLAGS'] || ['$(inherited)']
        if cflags.is_a?(String)
          config.build_settings['OTHER_CFLAGS'] = "#{cflags} -Wno-error=non-modular-include-in-framework-module"
        elsif cflags.is_a?(Array)
          config.build_settings['OTHER_CFLAGS'] << '-Wno-error=non-modular-include-in-framework-module'
        end

        # Firebase Specific fix for symbol conflicts and protobuf
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        if config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'].is_a?(String)
           config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = [config.build_settings['GCC_PREPROCESSOR_DEFINITIONS']]
        end
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'GPB_USE_PROTOBUF_FRAMEWORK_IMPORTS=1'
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FIRMessaging_No_Symbols_Conflict=1'
      end
    end

    # Project-level overrides
    installer.pods_project.build_configurations.each do |config|
      config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      config.build_settings['DEFINES_MODULE'] = 'YES'
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
    end
`;

      // Inject if post_install already exists, otherwise create it
      if (contents.includes('post_install do |installer|')) {
        if (!contents.includes('GPB_USE_PROTOBUF_FRAMEWORK_IMPORTS')) {
           const postInstallRegex = /(post_install do \|installer\|[\s\S]*?)(  end)/;
           contents = contents.replace(postInstallRegex, "$1" + postInstallSettings + "$2");
        }
      } else {
        const fullPostInstall = "\npost_install do |installer|" + postInstallSettings + "\nend\n";
        contents = contents.replace(/end\s*$/, fullPostInstall + "\nend");
      }

      fs.writeFileSync(podfilePath, contents);
      console.log('✅ Successfully applied Podfile modifications for Xcode 16.1');

      return config;
    },
  ]);
};

export default withPodfileModifications;
