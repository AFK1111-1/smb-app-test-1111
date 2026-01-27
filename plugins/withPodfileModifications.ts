import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DEFINITIVE FIX FOR XCODE 16.1 + FIREBASE
 * Strategy: MERGE logic into existing post_install hook if present, 
 * or create one if not. This avoids the "Multiple post_install hooks" error.
 */
const withPodfileModifications: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // 1. Add global flags if missing
      const globalFlags = [
        "$RNFirebaseAsStaticFramework = true",
        "use_modular_headers!"
      ];
      
      globalFlags.forEach(flag => {
        if (!contents.includes(flag)) {
          contents = flag + "\n" + contents;
        }
      });

      // 2. The Ruby code to inject
      const rubyLogic = `
    # --- START XCODE 16 COMPATIBILITY FIX ---
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        next if config.build_settings.nil?
        
        # Deployment target fix
        deployment_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if deployment_target && deployment_target.to_f < 15.1
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end

        # Xcode 16.1 Modularity and Module settings
        config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO'
        config.build_settings['CLANG_ENABLE_COMMON_MODULE_CACHE'] = 'NO'
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
        config.build_settings['DEFINES_MODULE'] = 'YES'
        config.build_settings['SWIFT_COMPILATION_MODE'] = 'wholemodule'
        config.build_settings['SWIFT_VERSION'] = '5.0'
        
        # OTHER_CFLAGS safe append
        cflags = config.build_settings['OTHER_CFLAGS'] || ['$(inherited)']
        cflags = [cflags] if cflags.is_a?(String)
        unless cflags.include?('-Wno-error=non-modular-include-in-framework-module')
          cflags << '-Wno-error=non-modular-include-in-framework-module'
        end
        config.build_settings['OTHER_CFLAGS'] = cflags

        # GCC_PREPROCESSOR_DEFINITIONS safe append
        defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        defs = [defs] if defs.is_a?(String)
        ['GPB_USE_PROTOBUF_FRAMEWORK_IMPORTS=1', 'FIRMessaging_No_Symbols_Conflict=1', 'RNFB_MESSAGING_USE_STATIC_DYNAMIC_FRAMEWORK=1'].each do |val|
          defs << val unless defs.include?(val)
        end
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
      end
    end
    
    installer.pods_project.build_configurations.each do |config|
      next if config.build_settings.nil?
      config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
      config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
      config.build_settings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO'
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
      config.build_settings['SWIFT_VERSION'] = '5.0'
    end
    # --- END XCODE 16 COMPATIBILITY FIX ---
`;

      // 3. Merging logic
      if (contents.includes('XCODE 16 COMPATIBILITY FIX')) {
        // Already patched
      } else if (contents.includes('post_install do |installer|')) {
        // Merge into existing post_install
        console.log('✅ Merging XCODE 16 fix into existing post_install');
        contents = contents.replace(
          /post_install do \|installer\|/,
          'post_install do |installer|' + rubyLogic
        );
      } else {
        // Create new post_install
        console.log('✅ Creating new post_install for XCODE 16 fix');
        const fullHook = '\npost_install do |installer|' + rubyLogic + '\nend\n';
        contents = contents.replace(/end\s*$/, fullHook + '\nend');
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};

export default withPodfileModifications;
