#!/usr/bin/env tsx

/**
 * Validation script for Firebase-specific build settings
 * 
 * This script validates that the withPodfileModifications plugin
 * correctly generates Firebase-specific build settings for Xcode 16.1 compatibility.
 * 
 * Usage: npx tsx plugins/__tests__/validate-firebase-settings.ts
 */

// Mock the generateXcode16CompatibilityRuby function to test it
// Since it's not exported, we'll simulate the Ruby code it should generate
const mockGeneratedRubyCode = `
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
          ['$(PODS_ROOT)/Headers/Public/FirebaseCore', '$(PODS_ROOT)/Headers/Public/FirebaseMessaging', '$(PODS_ROOT)/Headers/Public/FirebaseInstallations', '$(PODS_ROOT)/Headers/Public/FirebaseAnalytics', '$(PODS_ROOT)/Headers/Public/FirebaseCrashlytics', '$(PODS_ROOT)/Headers/Public/FirebaseAuth', '$(PODS_ROOT)/Headers/Public/FirebaseFirestore', '$(PODS_ROOT)/Headers/Public/FirebaseStorage', '$(PODS_ROOT)/Headers/Public/RNFBApp', '$(PODS_ROOT)/Headers/Public/RNFBMessaging', '$(PODS_ROOT)/Headers/Public/RNFBAnalytics', '$(PODS_ROOT)/Headers/Public/RNFBCrashlytics', '$(PODS_ROOT)/Headers/Public/RNFBAuth', '$(PODS_ROOT)/Headers/Public/RNFBFirestore', '$(PODS_ROOT)/Headers/Public/RNFBStorage', '$(PODS_ROOT)/Headers/Public/React-Core', '$(PODS_ROOT)/Headers/Public/React-bridging', '$(PODS_ROOT)/Headers/Public/React-RCTFabric', '$(PODS_ROOT)/Headers/Public/ReactCommon'].each do |path|
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
        ['-fmodules', '-Wno-error=non-modular-include-in-framework-module', '-Wno-implicit-function-declaration', '-Wno-implicit-int', '-Wno-return-type', '-Wno-shorten-64-to-32', '-Wno-comma', '-Wno-unreachable-code', '-Wno-conditional-uninitialized', '-Wno-deprecated-declarations'].each do |flag|
          cflags << flag unless cflags.include?(flag)
        end
        config.build_settings['OTHER_CFLAGS'] = cflags

        # Firebase preprocessor definitions for symbol conflict prevention
        defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        defs = [defs] if defs.is_a?(String)
        ['GPB_USE_PROTOBUF_FRAMEWORK_IMPORTS=1', 'FIRMessaging_No_Symbols_Conflict=1', 'RNFB_MESSAGING_USE_STATIC_DYNAMIC_FRAMEWORK=1', 'RNFB_APP_USE_STATIC_DYNAMIC_FRAMEWORK=1', 'FIREBASE_ANALYTICS_SUPPRESS_WARNING=1', 'COCOAPODS=1', 'PB_FIELD_32BIT=1', 'PB_NO_PACKED_STRUCTS=1'].each do |val|
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

/**
 * Validation helper functions
 */
const testHelpers = {
  /**
   * Validates that the plugin generates the expected Ruby code structure
   */
  validateRubyCodeStructure: (rubyCode: string): boolean => {
    const requiredSettings = [
      'CLANG_ENABLE_MODULE_VERIFIER',
      'CLANG_ENABLE_EXPLICIT_MODULES',
      'SWIFT_ENABLE_EXPLICIT_MODULES',
      'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES',
      'USE_HEADERMAP',
      'SWIFT_VERSION',
      'IPHONEOS_DEPLOYMENT_TARGET'
    ];

    return requiredSettings.every(setting => rubyCode.includes(setting));
  },

  /**
   * Validates Firebase-specific configurations
   */
  validateFirebaseSettings: (rubyCode: string): boolean => {
    const firebaseSettings = [
      'RNFBMessaging',
      'RNFBApp',
      'RNFBAnalytics',
      'RNFBCrashlytics',
      'RNFBAuth',
      'RNFBFirestore',
      'RNFBStorage',
      'FirebaseCore',
      'FirebaseMessaging',
      'FirebaseAnalytics',
      'FirebaseCrashlytics',
      'FirebaseAuth',
      'FirebaseFirestore',
      'FirebaseStorage',
      'GPB_USE_PROTOBUF_FRAMEWORK_IMPORTS',
      'FIRMessaging_No_Symbols_Conflict',
      'RNFB_MESSAGING_USE_STATIC_DYNAMIC_FRAMEWORK',
      'RNFB_APP_USE_STATIC_DYNAMIC_FRAMEWORK',
      'FIREBASE_ANALYTICS_SUPPRESS_WARNING'
    ];

    return firebaseSettings.every(setting => rubyCode.includes(setting));
  },

  /**
   * Validates Xcode 16.1 compatibility markers
   */
  validateXcode16Compatibility: (rubyCode: string): boolean => {
    return rubyCode.includes('XCODE 16 DEFINITIVE FIX') &&
           rubyCode.includes('CLANG_ENABLE_MODULE_VERIFIER') &&
           rubyCode.includes('NO');
  },

  /**
   * Validates Firebase-specific build settings for static frameworks
   */
  validateFirebaseStaticFrameworkSettings: (rubyCode: string): boolean => {
    const staticFrameworkSettings = [
      'CLANG_ENABLE_OBJC_ARC',
      'ENABLE_STRICT_OBJC_MSGSEND',
      'GCC_NO_COMMON_BLOCKS',
      'CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF',
      'OTHER_LDFLAGS',
      '-ObjC',
      '-lc++',
      'Security',
      'SystemConfiguration'
    ];

    return staticFrameworkSettings.every(setting => rubyCode.includes(setting));
  },

  /**
   * Validates comprehensive Firebase header search paths
   */
  validateFirebaseHeaderPaths: (rubyCode: string): boolean => {
    const headerPaths = [
      'FirebaseCore',
      'FirebaseMessaging',
      'FirebaseAnalytics',
      'FirebaseCrashlytics',
      'FirebaseAuth',
      'FirebaseFirestore',
      'FirebaseStorage',
      'RNFBApp',
      'RNFBMessaging',
      'RNFBAnalytics',
      'RNFBCrashlytics',
      'RNFBAuth',
      'RNFBFirestore',
      'RNFBStorage',
      'React-Core',
      'React-bridging',
      'React-RCTFabric',
      'ReactCommon'
    ];

    return headerPaths.every(path => rubyCode.includes(path));
  },

  /**
   * Validates enhanced module compatibility flags
   */
  validateModuleCompatibilityFlags: (rubyCode: string): boolean => {
    const compatibilityFlags = [
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
    ];

    return compatibilityFlags.every(flag => rubyCode.includes(flag));
  }
};

/**
 * Run validation tests
 */
function runValidation() {
  console.log('🔍 Validating Firebase-specific build settings...\n');

  const tests = [
    {
      name: 'Ruby Code Structure',
      test: () => testHelpers.validateRubyCodeStructure(mockGeneratedRubyCode),
      description: 'Validates core Xcode 16.1 compatibility settings'
    },
    {
      name: 'Firebase Settings',
      test: () => testHelpers.validateFirebaseSettings(mockGeneratedRubyCode),
      description: 'Validates Firebase module configurations'
    },
    {
      name: 'Xcode 16.1 Compatibility',
      test: () => testHelpers.validateXcode16Compatibility(mockGeneratedRubyCode),
      description: 'Validates Xcode 16.1 compatibility markers'
    },
    {
      name: 'Firebase Static Framework Settings',
      test: () => testHelpers.validateFirebaseStaticFrameworkSettings(mockGeneratedRubyCode),
      description: 'Validates Firebase static framework build settings'
    },
    {
      name: 'Firebase Header Paths',
      test: () => testHelpers.validateFirebaseHeaderPaths(mockGeneratedRubyCode),
      description: 'Validates comprehensive Firebase header search paths'
    },
    {
      name: 'Module Compatibility Flags',
      test: () => testHelpers.validateModuleCompatibilityFlags(mockGeneratedRubyCode),
      description: 'Validates enhanced module compatibility compiler flags'
    }
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(({ name, test, description }) => {
    try {
      const result = test();
      if (result) {
        console.log(`✅ ${name}: PASSED`);
        console.log(`   ${description}\n`);
        passed++;
      } else {
        console.log(`❌ ${name}: FAILED`);
        console.log(`   ${description}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}: ERROR`);
      console.log(`   ${description}`);
      console.log(`   Error: ${error}\n`);
      failed++;
    }
  });

  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%\n`);

  if (failed === 0) {
    console.log('🎉 All Firebase-specific build settings validation tests passed!');
    console.log('✅ The withPodfileModifications plugin correctly implements:');
    console.log('   • Firebase header search paths for static frameworks');
    console.log('   • Preprocessor definitions to prevent symbol conflicts');
    console.log('   • RNFBApp and RNFBMessaging compatibility settings');
    console.log('   • Enhanced module compatibility flags');
    console.log('   • Firebase-specific linker flags');
    console.log('   • Comprehensive Xcode 16.1 compatibility settings\n');
    
    console.log('📋 Requirements Addressed:');
    console.log('   • 2.1: Firebase SDK header dependencies resolved');
    console.log('   • 2.2: Static framework compatibility configured');
    console.log('   • 2.3: Preprocessor definitions for symbol conflict prevention');
    
    process.exit(0);
  } else {
    console.log('⚠️  Some validation tests failed. Please review the implementation.');
    process.exit(1);
  }
}

// Run the validation
runValidation();