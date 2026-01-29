#!/usr/bin/env tsx

/**
 * Manual validation script for withPodfileModifications plugin
 * 
 * This script validates that the plugin is properly structured and
 * generates the expected Xcode 16.1 compatibility settings.
 * 
 * Run with: npx tsx plugins/validate-plugin.ts
 */

import withPodfileModifications from './withPodfileModifications';

interface ValidationResult {
  passed: boolean;
  message: string;
}

function validatePlugin(): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Test 1: Plugin exports correctly
  try {
    if (typeof withPodfileModifications !== 'function') {
      results.push({
        passed: false,
        message: 'Plugin should export a function'
      });
    } else {
      results.push({
        passed: true,
        message: 'Plugin exports correctly as a function'
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Plugin import failed: ${error}`
    });
  }

  // Test 2: Plugin returns valid config
  try {
    const mockConfig = {
      name: 'test-app',
      slug: 'test-app',
    };

    const result = withPodfileModifications(mockConfig);
    
    if (typeof result === 'object' && result.name === mockConfig.name) {
      results.push({
        passed: true,
        message: 'Plugin returns valid config object'
      });
    } else {
      results.push({
        passed: false,
        message: 'Plugin does not return valid config object'
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Plugin execution failed: ${error}`
    });
  }

  // Test 3: Validate required Xcode settings are present in the source file
  try {
    const fs = require('fs');
    const path = require('path');
    const pluginSource = fs.readFileSync(path.join(__dirname, 'withPodfileModifications.ts'), 'utf-8');
    
    const requiredSettings = [
      'CLANG_ENABLE_MODULE_VERIFIER',
      'CLANG_ENABLE_EXPLICIT_MODULES',
      'SWIFT_ENABLE_EXPLICIT_MODULES',
      'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES',
      'USE_HEADERMAP',
      'SWIFT_VERSION',
      'IPHONEOS_DEPLOYMENT_TARGET'
    ];

    const missingSettings = requiredSettings.filter(setting => !pluginSource.includes(setting));
    
    if (missingSettings.length === 0) {
      results.push({
        passed: true,
        message: 'All required Xcode 16.1 settings are present'
      });
    } else {
      results.push({
        passed: false,
        message: `Missing required settings: ${missingSettings.join(', ')}`
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Settings validation failed: ${error}`
    });
  }

  // Test 4: Validate Firebase-specific settings
  try {
    const fs = require('fs');
    const path = require('path');
    const pluginSource = fs.readFileSync(path.join(__dirname, 'withPodfileModifications.ts'), 'utf-8');
    
    const firebaseSettings = [
      'RNFBMessaging',
      'RNFBApp',
      'FirebaseCore',
      'FirebaseMessaging'
    ];

    const missingFirebaseSettings = firebaseSettings.filter(setting => !pluginSource.includes(setting));
    
    if (missingFirebaseSettings.length === 0) {
      results.push({
        passed: true,
        message: 'All Firebase-specific settings are present'
      });
    } else {
      results.push({
        passed: false,
        message: `Missing Firebase settings: ${missingFirebaseSettings.join(', ')}`
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Firebase settings validation failed: ${error}`
    });
  }

  return results;
}

function main() {
  console.log('🔍 Validating withPodfileModifications plugin...\n');

  const results = validatePlugin();
  let allPassed = true;

  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: ${result.message}`);
    if (!result.passed) {
      allPassed = false;
    }
  });

  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 All validation tests passed!');
    console.log('✅ Plugin is ready for use with Xcode 16.1 compatibility');
  } else {
    console.log('❌ Some validation tests failed');
    console.log('⚠️  Please review the plugin implementation');
  }

  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  main();
}