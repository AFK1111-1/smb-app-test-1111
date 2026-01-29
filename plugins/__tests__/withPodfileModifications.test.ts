/**
 * Comprehensive test suite for withPodfileModifications plugin
 * 
 * These tests verify Xcode 16.1 compatibility, Firebase integration,
 * and proper plugin functionality across various scenarios.
 */

import withPodfileModifications from '../withPodfileModifications';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module for testing
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('withPodfileModifications Plugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Plugin Structure', () => {
    test('should export a function', () => {
      expect(typeof withPodfileModifications).toBe('function');
    });

    test('should return a config plugin function', () => {
      const mockConfig = {
        name: 'test-app',
        slug: 'test-app',
      };

      const result = withPodfileModifications(mockConfig);
      expect(typeof result).toBe('object');
      expect(result.name).toBe('test-app');
    });

    test('should have proper plugin structure', () => {
      const mockConfig = {
        name: 'test-app',
        slug: 'test-app',
      };

      const result = withPodfileModifications(mockConfig);
      
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('slug');
      expect(result.name).toBe(mockConfig.name);
      expect(result.slug).toBe(mockConfig.slug);
    });
  });

  describe('Podfile Modifications', () => {
    const mockPodfileContent = `
platform :ios, '15.1'

target 'TestApp' do
  use_frameworks! :linkage => :static
  config = use_native_modules!
  
  pod 'React', :path => '../node_modules/react-native'
end

post_install do |installer|
  # Existing content
end
`;

    test('should handle missing Podfile gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const mockConfig = {
        name: 'test-app',
        slug: 'test-app',
        modRequest: {
          platformProjectRoot: '/test/ios'
        }
      };

      // Should not throw error when Podfile doesn't exist
      expect(() => {
        withPodfileModifications(mockConfig);
      }).not.toThrow();
    });

    test('should inject Xcode 16.1 compatibility settings', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockPodfileContent);
      
      let writtenContent = '';
      mockFs.writeFileSync.mockImplementation((path, content) => {
        writtenContent = content as string;
      });

      const mockConfig = {
        name: 'test-app',
        slug: 'test-app',
        modRequest: {
          platformProjectRoot: '/test/ios'
        }
      };

      withPodfileModifications(mockConfig);

      // Verify Xcode 16.1 compatibility settings are injected
      expect(writtenContent).toContain('XCODE 16 DEFINITIVE FIX');
      expect(writtenContent).toContain('CLANG_ENABLE_MODULE_VERIFIER');
      expect(writtenContent).toContain('CLANG_ENABLE_EXPLICIT_MODULES');
      expect(writtenContent).toContain('SWIFT_ENABLE_EXPLICIT_MODULES');
    });

    test('should inject Firebase-specific settings', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockPodfileContent);
      
      let writtenContent = '';
      mockFs.writeFileSync.mockImplementation((path, content) => {
        writtenContent = content as string;
      });

      const mockConfig = {
        name: 'test-app',
        slug: 'test-app',
        modRequest: {
          platformProjectRoot: '/test/ios'
        }
      };

      withPodfileModifications(mockConfig);

      // Verify Firebase-specific settings
      expect(writtenContent).toContain('RNFBMessaging');
      expect(writtenContent).toContain('RNFBApp');
      expect(writtenContent).toContain('FirebaseCore');
      expect(writtenContent).toContain('GPB_USE_PROTOBUF_FRAMEWORK_IMPORTS');
      expect(writtenContent).toContain('FIRMessaging_No_Symbols_Conflict');
    });

    test('should update existing modifications', () => {
      const existingModifiedContent = mockPodfileContent + `
# --- START XCODE 16 DEFINITIVE FIX ---
# Old settings
# --- END XCODE 16 DEFINITIVE FIX ---
`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(existingModifiedContent);
      
      let writtenContent = '';
      mockFs.writeFileSync.mockImplementation((path, content) => {
        writtenContent = content as string;
      });

      const mockConfig = {
        name: 'test-app',
        slug: 'test-app',
        modRequest: {
          platformProjectRoot: '/test/ios'
        }
      };

      withPodfileModifications(mockConfig);

      // Should update existing modifications
      expect(writtenContent).toContain('XCODE 16 DEFINITIVE FIX');
      expect(writtenContent).toContain('CLANG_ENABLE_MODULE_VERIFIER');
    });
  });
});

/**
 * Property-based test helpers for comprehensive validation
 */
export const propertyTests = {
  /**
   * Property 1: Xcode 16.1 Build Configuration Compatibility
   * Validates that all required Xcode 16.1 settings are present
   */
  validateXcode16Compatibility: (rubyCode: string): boolean => {
    const requiredSettings = [
      'CLANG_ENABLE_MODULE_VERIFIER',
      'CLANG_ENABLE_EXPLICIT_MODULES', 
      'SWIFT_ENABLE_EXPLICIT_MODULES',
      'CLANG_ENABLE_MODULE_DEBUGGING',
      'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES',
      'CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER',
      'DEFINES_MODULE',
      'USE_HEADERMAP',
      'SWIFT_VERSION',
      'CLANG_ENABLE_COMMON_BLOCKS',
      'IPHONEOS_DEPLOYMENT_TARGET'
    ];

    const hasAllSettings = requiredSettings.every(setting => rubyCode.includes(setting));
    const hasCorrectValues = rubyCode.includes("'NO'") && rubyCode.includes("'YES'") && rubyCode.includes("'5.0'");
    const hasDeploymentTarget = rubyCode.includes('15.1');

    return hasAllSettings && hasCorrectValues && hasDeploymentTarget;
  },

  /**
   * Property 2: Firebase Static Framework Integration
   * Validates Firebase-specific configurations for static frameworks
   */
  validateFirebaseIntegration: (rubyCode: string): boolean => {
    const firebaseModules = [
      'RNFBMessaging', 'RNFBApp', 'RNFBAnalytics', 'RNFBCrashlytics',
      'RNFBAuth', 'RNFBFirestore', 'RNFBStorage'
    ];
    
    const firebaseSDKs = [
      'FirebaseCore', 'FirebaseMessaging', 'FirebaseAnalytics',
      'FirebaseCrashlytics', 'FirebaseAuth', 'FirebaseFirestore', 'FirebaseStorage'
    ];

    const preprocessorDefs = [
      'GPB_USE_PROTOBUF_FRAMEWORK_IMPORTS',
      'FIRMessaging_No_Symbols_Conflict',
      'RNFB_MESSAGING_USE_STATIC_DYNAMIC_FRAMEWORK',
      'RNFB_APP_USE_STATIC_DYNAMIC_FRAMEWORK',
      'FIREBASE_ANALYTICS_SUPPRESS_WARNING'
    ];

    const hasFirebaseModules = firebaseModules.every(module => rubyCode.includes(module));
    const hasFirebaseSDKs = firebaseSDKs.every(sdk => rubyCode.includes(sdk));
    const hasPreprocessorDefs = preprocessorDefs.every(def => rubyCode.includes(def));
    const hasHeaderSearchPaths = rubyCode.includes('HEADER_SEARCH_PATHS');
    const hasLinkerFlags = rubyCode.includes('OTHER_LDFLAGS') && rubyCode.includes('-ObjC');

    return hasFirebaseModules && hasFirebaseSDKs && hasPreprocessorDefs && 
           hasHeaderSearchPaths && hasLinkerFlags;
  },

  /**
   * Property 3: Module Compatibility Settings
   * Validates comprehensive module compatibility configurations
   */
  validateModuleCompatibility: (rubyCode: string): boolean => {
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

    const hasCompatibilityFlags = compatibilityFlags.every(flag => rubyCode.includes(flag));
    const hasOtherCFlags = rubyCode.includes('OTHER_CFLAGS');
    const hasModuleSettings = rubyCode.includes('CLANG_ENABLE_MODULE_VERIFIER') && 
                             rubyCode.includes('NO');

    return hasCompatibilityFlags && hasOtherCFlags && hasModuleSettings;
  },

  /**
   * Property 4: Static Framework Compatibility
   * Validates settings specific to static framework usage
   */
  validateStaticFrameworkCompatibility: (rubyCode: string): boolean => {
    const staticFrameworkSettings = [
      'CLANG_ENABLE_OBJC_ARC',
      'ENABLE_STRICT_OBJC_MSGSEND', 
      'GCC_NO_COMMON_BLOCKS',
      'CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF'
    ];

    const linkerFlags = ['-ObjC', '-lc++', 'Security', 'SystemConfiguration'];

    const hasStaticSettings = staticFrameworkSettings.every(setting => rubyCode.includes(setting));
    const hasLinkerFlags = linkerFlags.every(flag => rubyCode.includes(flag));
    const hasFrameworkFlags = rubyCode.includes('-framework');

    return hasStaticSettings && hasLinkerFlags && hasFrameworkFlags;
  },

  /**
   * Property 5: Comprehensive Header Search Paths
   * Validates all required header search paths are configured
   */
  validateHeaderSearchPaths: (rubyCode: string): boolean => {
    const requiredPaths = [
      'FirebaseCore', 'FirebaseMessaging', 'FirebaseAnalytics',
      'RNFBApp', 'RNFBMessaging', 'React-Core', 'React-bridging',
      'React-RCTFabric', 'ReactCommon'
    ];

    const hasAllPaths = requiredPaths.every(path => rubyCode.includes(path));
    const hasHeaderSearchPaths = rubyCode.includes('HEADER_SEARCH_PATHS');
    const hasPodsRoot = rubyCode.includes('$(PODS_ROOT)');

    return hasAllPaths && hasHeaderSearchPaths && hasPodsRoot;
  }
};

/**
 * Integration test helpers for end-to-end validation
 */
export const integrationTests = {
  /**
   * Simulates complete plugin execution with mock Podfile
   */
  simulatePluginExecution: (podfileContent: string) => {
    // Mock the file system
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(podfileContent);
    
    let result = '';
    mockFs.writeFileSync.mockImplementation((path, content) => {
      result = content as string;
    });

    const mockConfig = {
      name: 'test-app',
      slug: 'test-app',
      modRequest: {
        platformProjectRoot: '/test/ios'
      }
    };

    withPodfileModifications(mockConfig);
    return result;
  },

  /**
   * Validates complete Xcode 16.1 compatibility implementation
   */
  validateCompleteImplementation: (modifiedPodfile: string): boolean => {
    return propertyTests.validateXcode16Compatibility(modifiedPodfile) &&
           propertyTests.validateFirebaseIntegration(modifiedPodfile) &&
           propertyTests.validateModuleCompatibility(modifiedPodfile) &&
           propertyTests.validateStaticFrameworkCompatibility(modifiedPodfile) &&
           propertyTests.validateHeaderSearchPaths(modifiedPodfile);
  }
};