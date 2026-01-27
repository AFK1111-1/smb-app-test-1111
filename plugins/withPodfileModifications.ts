import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DEFINITIVE FIX FOR XCODE 16.1 + FIREBASE (v6)
 * Strategy:
 * 1. Remove ALL modular_headers hacks.
 * 2. Rely on CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES=YES.
 * 3. Specific fix for BoringSSL-GRPC (disable headermaps).
 * 4. Force SWIFT_VERSION=5.0 and disable module debugging/explicit modules.
 * 5. NEW: Inject HEADER_SEARCH_PATHS for RNFBMessaging to find Firebase headers.
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

      // 1. Ensure Firebase static framework flag
      if (!contents.includes('$RNFirebaseAsStaticFramework = true')) {
        contents = '$RNFirebaseAsStaticFramework = true\n' + contents;
      }

      // 2. The Ruby logic for post_install
      const rubyLogic = `
    # --- START XCODE 16 DEFINITIVE FIX ---
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        next if config.build_settings.nil?
        
        # Deployment target
        deployment_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if deployment_target && deployment_target.to_f < 15.1
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end

        # Xcode 16.1 definitive compatibility
        config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO'
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
        config.build_settings['DEFINES_MODULE'] = 'YES'
        config.build_settings['SWIFT_VERSION'] = '5.0'

        # BoringSSL-GRPC specific fix for Xcode 16
        if target.name == 'BoringSSL-GRPC'
          config.build_settings['USE_HEADERMAP'] = 'NO'
        end
        
        # RNFBMessaging specific fix: explicit header search paths for static linking
        if target.name == 'RNFBMessaging'
          search_paths = config.build_settings['HEADER_SEARCH_PATHS'] || ['$(inherited)']
          search_paths = [search_paths] if search_paths.is_a?(String)
          # Add public Firebase headers
          ['"\${PODS_ROOT}/Headers/Public/Firebase"', '"\${PODS_ROOT}/Headers/Public/FirebaseCore"', '"\${PODS_ROOT}/Headers/Public/FirebaseMessaging"'].each do |path|
             search_paths << path unless search_paths.include?(path)
          end
          config.build_settings['HEADER_SEARCH_PATHS'] = search_paths
        end

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
    # --- END XCODE 16 DEFINITIVE FIX ---
`;

      // 3. Merging logic for post_install
      if (contents.includes('XCODE 16 DEFINITIVE FIX')) {
        // Already patched - we might need to update the logic if it's old, 
        // but for now let's assume if the marker is there, the logic is managed by this tool.
        // To be safe, let's replace the existing block.
        console.log('✅ Updating existing XCODE 16 definitive fix');
        contents = contents.replace(
            /# --- START XCODE 16 DEFINITIVE FIX ---[\s\S]*?# --- END XCODE 16 DEFINITIVE FIX ---/,
            rubyLogic.trim()
        );
      } else if (contents.includes('post_install do |installer|')) {
        console.log('✅ Merging XCODE 16 definitive fix into existing post_install');
        contents = contents.replace(
          /post_install do \|installer\|/,
          'post_install do |installer|' + rubyLogic
        );
      } else {
        console.log('✅ Creating new post_install for XCODE 16 definitive fix');
        const fullHook = '\npost_install do |installer|' + rubyLogic + '\nend\n';
        contents = contents.replace(/end\s*$/, fullHook + '\nend');
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};

export default withPodfileModifications;
