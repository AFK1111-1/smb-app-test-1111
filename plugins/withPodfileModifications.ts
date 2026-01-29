import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Expo Config Plugin for Xcode 16.1 + Firebase Compatibility
 * 
 * This plugin automatically injects comprehensive Xcode 16.1 compatibility settings
 * into the generated Podfile during Expo prebuild to resolve build failures with
 * Firebase SDK and React Native Firebase modules.
 * 
 * Key Features:
 * - Disables problematic module verification and explicit modules
 * - Configures static framework compatibility settings
 * - Sets iOS 15.1+ deployment target across all pods
 * - Injects Firebase-specific header search paths
 * - Adds preprocessor definitions to prevent symbol conflicts
 * 
 * Requirements Addressed:
 * - 1.2: Module compiler configuration for React Native Firebase
 * - 4.1: Automatic build settings injection via Expo prebuild
 * - 4.3: iOS 15.1+ deployment target enforcement
 * - 2.1, 2.2, 2.3: Firebase SDK header dependencies and static framework compatibility
 */

/**
 * Interface defining the core Xcode build settings for Xcode 16.1 compatibility
 */
interface XcodeBuildSettings {
  CLANG_ENABLE_MODULE_VERIFIER: 'NO';
  CLANG_ENABLE_EXPLICIT_MODULES: 'NO';
  SWIFT_ENABLE_EXPLICIT_MODULES: 'NO';
  CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES: 'YES';
  USE_HEADERMAP: 'NO';
  SWIFT_VERSION: '5.0';
  IPHONEOS_DEPLOYMENT_TARGET: '15.1';
  // Additional compatibility settings
  CLANG_ENABLE_MODULE_DEBUGGING: 'NO';
  CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: 'NO';
  DEFINES_MODULE: 'YES';
  CLANG_ENABLE_COMMON_BLOCKS: 'YES';
  // Firebase-specific settings
  CLANG_ENABLE_OBJC_ARC: 'YES';
  ENABLE_STRICT_OBJC_MSGSEND: 'YES';
  GCC_NO_COMMON_BLOCKS: 'YES';
  CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF: 'YES';
}

/**
 * Firebase-specific header search paths for static framework compatibility
 */
const FIREBASE_HEADER_SEARCH_PATHS = [
  '$(PODS_ROOT)/Headers/Public/FirebaseCore',
  '$(PODS_ROOT)/Headers/Public/FirebaseMessaging',
  '$(PODS_ROOT)/Headers/Public/FirebaseInstallations',
  '$(PODS_ROOT)/Headers/Public/FirebaseAnalytics',
  '$(PODS_ROOT)/Headers/Public/FirebaseCrashlytics',
  '$(PODS_ROOT)/Headers/Public/FirebaseAuth',
  '$(PODS_ROOT)/Headers/Public/FirebaseFirestore',
  '$(PODS_ROOT)/Headers/Public/FirebaseStorage',
  '$(PODS_ROOT)/Headers/Public/RNFBApp',
  '$(PODS_ROOT)/Headers/Public/RNFBMessaging',
  '$(PODS_ROOT)/Headers/Public/RNFBAnalytics',
  '$(PODS_ROOT)/Headers/Public/RNFBCrashlytics',
  '$(PODS_ROOT)/Headers/Public/RNFBAuth',
  '$(PODS_ROOT)/Headers/Public/RNFBFirestore',
  '$(PODS_ROOT)/Headers/Public/RNFBStorage',
  '$(PODS_ROOT)/Headers/Public/React-Core',
  '$(PODS_ROOT)/Headers/Public/React-bridging',
  '$(PODS_ROOT)/Headers/Public/React-RCTFabric',
  '$(PODS_ROOT)/Headers/Public/ReactCommon'
] as const;

/**
 * Compiler flags for module compatibility
 */
const MODULE_COMPATIBILITY_CFLAGS = [
  '-fmodules',
  '-Wno-error=non-modular-include-in-framework-module',
  '-Wno-implicit-function-declaration',
  '-Wno-implicit-int',
  '-Wno-return-type',
  '-Wno-shorten-64-to-32',
  '-Wno-comma',
  '-Wno-unreachable-code',
  '-Wno-conditional-uninitialized',
  '-Wno-deprecated-declarations'
] as const;

/**
 * Preprocessor definitions for Firebase symbol conflict prevention
 */
const FIREBASE_PREPROCESSOR_DEFINITIONS = [
  'GPB_USE_PROTOBUF_FRAMEWORK_IMPORTS=1',
  'FIRMessaging_No_Symbols_Conflict=1',
  'RNFB_MESSAGING_USE_STATIC_DYNAMIC_FRAMEWORK=1',
  'RNFB_APP_USE_STATIC_DYNAMIC_FRAMEWORK=1',
  'FIREBASE_ANALYTICS_SUPPRESS_WARNING=1',
  'COCOAPODS=1',
  'PB_FIELD_32BIT=1',
  'PB_NO_PACKED_STRUCTS=1'
] as const;
/**
 * Expo Config Plugin that injects Xcode 16.1 compatibility settings into the Podfile
 * 
 * This plugin modifies the generated Podfile to include comprehensive build settings
 * that resolve compilation issues with Firebase SDK and React Native Firebase modules
 * when using Xcode 16.1's stricter module system.
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
        console.log('⚠️  Podfile not found, skipping modifications');
        return config;
      }

      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // Generate the Ruby post_install hook with all Xcode 16.1 compatibility settings
      const rubyLogic = generateXcode16CompatibilityRuby();

      // Apply the modifications to the Podfile
      contents = applyPodfileModifications(contents, rubyLogic);

      fs.writeFileSync(podfilePath, contents);
      console.log('✅ Applied Xcode 16.1 compatibility settings to Podfile');
      
      return config;
    },
  ]);
};

/**
 * Generates the Ruby code for post_install hook with all Xcode 16.1 compatibility settings
 */
function generateXcode16CompatibilityRuby(): string {
  // Convert TypeScript constants to Ruby arrays for injection
  const firebaseHeaderPaths = FIREBASE_HEADER_SEARCH_PATHS.map(path => `'${path}'`).join(', ');
  const moduleCompatibilityFlags = MODULE_COMPATIBILITY_CFLAGS.map(flag => `'${flag}'`).join(', ');
  const firebasePreprocessorDefs = FIREBASE_PREPROCESSOR_DEFINITIONS.map(def => `'${def}'`).join(', ');

  return `
    # --- START XCODE 16 DEFINITIVE FIX ---
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        next if config.build_settings.nil?
        
        # Ensure iOS 15.1+ deployment target across all pods
        deployment_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if deployment_target && deployment_target.to_f < 15.1
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end

        # Core Xcode 16.1 module compatibility settings
        config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO'
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
        config.build_settings['DEFINES_MODULE'] = 'YES'
        config.build_settings['USE_HEADERMAP'] = 'NO'
        config.build_settings['SWIFT_VERSION'] = '5.0'
        config.build_settings['CLANG_ENABLE_COMMON_BLOCKS'] = 'YES'

        # Firebase-specific fixes for RNFBMessaging, RNFBApp, and related Firebase modules
        firebase_targets = ['RNFBMessaging', 'RNFBApp', 'RNFBAnalytics', 'RNFBCrashlytics', 'RNFBAuth', 'RNFBFirestore', 'RNFBStorage']
        if firebase_targets.include?(target.name) || target.name.start_with?('Firebase')
          # Add Firebase header search paths for static framework compatibility
          search_paths = config.build_settings['HEADER_SEARCH_PATHS'] || ['$(inherited)']
          search_paths = [search_paths] if search_paths.is_a?(String)
          [${firebaseHeaderPaths}].each do |path|
            search_paths << path unless search_paths.include?(path)
          end
          config.build_settings['HEADER_SEARCH_PATHS'] = search_paths

          # Firebase-specific build settings for static framework compatibility
          config.build_settings['CLANG_ENABLE_OBJC_ARC'] = 'YES'
          config.build_settings['ENABLE_STRICT_OBJC_MSGSEND'] = 'YES'
          config.build_settings['GCC_NO_COMMON_BLOCKS'] = 'YES'
          config.build_settings['CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF'] = 'YES'
        end

        # Module compatibility compiler flags for all targets
        cflags = config.build_settings['OTHER_CFLAGS'] || ['$(inherited)']
        cflags = [cflags] if cflags.is_a?(String)
        [${moduleCompatibilityFlags}].each do |flag|
          cflags << flag unless cflags.include?(flag)
        end
        config.build_settings['OTHER_CFLAGS'] = cflags

        # Firebase preprocessor definitions for symbol conflict prevention
        defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        defs = [defs] if defs.is_a?(String)
        [${firebasePreprocessorDefs}].each do |val|
          defs << val unless defs.include?(val)
        end
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs

        # Additional Firebase-specific linker flags for static frameworks
        if firebase_targets.include?(target.name)
          ldflags = config.build_settings['OTHER_LDFLAGS'] || ['$(inherited)']
          ldflags = [ldflags] if ldflags.is_a?(String)
          firebase_linker_flags = ['-ObjC', '-lc++', '-framework', 'Security', '-framework', 'SystemConfiguration']
          firebase_linker_flags.each do |flag|
            ldflags << flag unless ldflags.include?(flag)
          end
          config.build_settings['OTHER_LDFLAGS'] = ldflags
        end
      end
    end
    # --- END XCODE 16 DEFINITIVE FIX ---
`;
}

/**
 * Applies the Xcode 16.1 compatibility modifications to the Podfile content
 */
function applyPodfileModifications(contents: string, rubyLogic: string): string {
  // Check if already patched and update if needed
  if (contents.includes('XCODE 16 DEFINITIVE FIX')) {
    console.log('✅ Updating existing Xcode 16.1 compatibility settings');
    return contents.replace(
      /# --- START XCODE 16 DEFINITIVE FIX ---[\s\S]*?# --- END XCODE 16 DEFINITIVE FIX ---/,
      rubyLogic.trim()
    );
  } 
  
  // Merge with existing post_install hook
  if (contents.includes('post_install do |installer|')) {
    console.log('✅ Merging Xcode 16.1 compatibility settings into existing post_install');
    return contents.replace(
      /post_install do \|installer\|/,
      'post_install do |installer|' + rubyLogic
    );
  } 
  
  // Create new post_install hook
  console.log('✅ Creating new post_install hook with Xcode 16.1 compatibility settings');
  const fullHook = '\npost_install do |installer|' + rubyLogic + '\nend\n';
  return contents.replace(/end\s*$/, fullHook + '\nend');
}

export default withPodfileModifications;
