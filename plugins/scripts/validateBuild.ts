#!/usr/bin/env tsx

/**
 * Build Validation Script
 * 
 * This script validates the build environment and configuration
 * for Xcode 16.1 compatibility before starting the build process.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string;
  critical?: boolean;
}

class BuildValidator {
  private projectRoot: string;
  
  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }
  
  /**
   * Validates Xcode installation and version
   */
  validateXcode(): ValidationResult {
    try {
      const xcodeVersion = execSync('xcodebuild -version', { encoding: 'utf-8' });
      const versionMatch = xcodeVersion.match(/Xcode (\d+\.\d+)/);
      
      if (!versionMatch) {
        return {
          passed: false,
          message: 'Could not determine Xcode version',
          details: xcodeVersion
        };
      }
      
      const version = parseFloat(versionMatch[1]);
      if (version < 16.1) {
        return {
          passed: false,
          message: `Xcode ${version} detected, but 16.1+ is required`,
          details: 'Please upgrade to Xcode 16.1 or later'
        };
      }
      
      return {
        passed: true,
        message: `Xcode ${version} detected - compatible`,
        details: xcodeVersion.trim()
      };
      
    } catch (error) {
      return {
        passed: false,
        message: 'Xcode not found or not accessible',
        details: 'Please install Xcode 16.1 or later'
      };
    }
  }
  
  /**
   * Validates iOS SDK availability
   */
  validateIOSSDK(): ValidationResult {
    try {
      const sdkVersion = execSync('xcrun --show-sdk-version --sdk iphoneos', { encoding: 'utf-8' }).trim();
      const version = parseFloat(sdkVersion);
      
      if (version < 15.1) {
        return {
          passed: false,
          message: `iOS SDK ${version} detected, but 15.1+ is required`,
          details: 'Please update Xcode to get iOS SDK 15.1+'
        };
      }
      
      return {
        passed: true,
        message: `iOS SDK ${version} detected - compatible`,
        details: `SDK path: ${execSync('xcrun --show-sdk-path --sdk iphoneos', { encoding: 'utf-8' }).trim()}`
      };
      
    } catch (error) {
      return {
        passed: false,
        message: 'iOS SDK not found',
        details: 'Please install Xcode with iOS SDK 15.1+'
      };
    }
  }
  
  /**
   * Validates workspace and scheme existence
   */
  validateWorkspace(): ValidationResult {
    const workspacePath = path.join(this.projectRoot, 'ios', 'smbmobile.xcworkspace');
    
    if (!fs.existsSync(workspacePath)) {
      return {
        passed: false,
        message: 'Xcode workspace not found',
        details: `Expected at: ${workspacePath}. Run 'npm run prebuild' first.`
      };
    }
    
    return {
      passed: true,
      message: 'Xcode workspace found',
      details: workspacePath
    };
  }
  
  /**
   * Validates Podfile modifications
   */
  validatePodfileModifications(): ValidationResult {
    const podfilePath = path.join(this.projectRoot, 'ios', 'Podfile');
    
    if (!fs.existsSync(podfilePath)) {
      return {
        passed: false,
        message: 'Podfile not found',
        details: `Expected at: ${podfilePath}. Run 'npm run prebuild' first.`
      };
    }
    
    const podfileContent = fs.readFileSync(podfilePath, 'utf-8');
    
    if (!podfileContent.includes('XCODE 16 DEFINITIVE FIX')) {
      return {
        passed: false,
        message: 'Xcode 16.1 compatibility settings not found in Podfile',
        details: 'The withPodfileModifications plugin may not have run correctly'
      };
    }
    
    return {
      passed: true,
      message: 'Xcode 16.1 compatibility settings found in Podfile',
      details: 'Podfile modifications applied successfully'
    };
  }
  
  /**
   * Validates Firebase configuration
   */
  validateFirebaseConfig(): ValidationResult {
    const firebaseConfigPath = path.join(this.projectRoot, 'GoogleService-Info.plist');
    
    if (!fs.existsSync(firebaseConfigPath)) {
      return {
        passed: false,
        message: 'Firebase configuration file not found',
        details: `Expected GoogleService-Info.plist at: ${firebaseConfigPath}`
      };
    }
    
    const configContent = fs.readFileSync(firebaseConfigPath, 'utf-8');
    
    if (!configContent.includes('BUNDLE_ID') || !configContent.includes('com.insighture.smbmobile')) {
      return {
        passed: false,
        message: 'Firebase configuration appears invalid',
        details: 'GoogleService-Info.plist may be corrupted or for wrong bundle ID'
      };
    }
    
    return {
      passed: true,
      message: 'Firebase configuration validated',
      details: 'GoogleService-Info.plist found and appears valid'
    };
  }
  
  /**
   * Validates CocoaPods installation and version
   */
  validateCocoaPods(): ValidationResult {
    try {
      const podVersion = execSync('pod --version', { encoding: 'utf-8' }).trim();
      const version = parseFloat(podVersion);
      
      if (version < 1.15) {
        return {
          passed: false,
          message: `CocoaPods ${version} detected, but 1.15+ is recommended`,
          details: 'Run: gem update cocoapods'
        };
      }
      
      return {
        passed: true,
        message: `CocoaPods ${version} detected - compatible`,
        details: 'CocoaPods version is suitable for Xcode 16.1'
      };
      
    } catch (error) {
      return {
        passed: false,
        message: 'CocoaPods not found',
        details: 'Please install CocoaPods: gem install cocoapods'
      };
    }
  }
  
  /**
   * Validates code signing setup
   */
  validateCodeSigning(): ValidationResult {
    try {
      const identities = execSync('security find-identity -v -p codesigning', { encoding: 'utf-8' });
      
      if (identities.includes('0 valid identities found')) {
        return {
          passed: false,
          message: 'No code signing identities found',
          details: 'Please install development certificates or run fastlane match'
        };
      }
      
      const validIdentities = identities.split('\n').filter(line => 
        line.includes('iPhone Developer') || line.includes('iPhone Distribution')
      ).length;
      
      return {
        passed: true,
        message: `${validIdentities} code signing identities found`,
        details: 'Code signing certificates are available'
      };
      
    } catch (error) {
      return {
        passed: false,
        message: 'Could not check code signing identities',
        details: 'Security framework may not be accessible'
      };
    }
  }
  
  /**
   * Runs all validations
   */
  async validateAll(): Promise<ValidationResult[]> {
    console.log('🔍 Running build environment validation...\n');
    
    const coreValidations = [
      { name: 'Xcode Version', validator: () => this.validateXcode(), critical: true },
      { name: 'iOS SDK', validator: () => this.validateIOSSDK(), critical: true },
      { name: 'CocoaPods', validator: () => this.validateCocoaPods(), critical: true }
    ];
    
    const buildValidations = [
      { name: 'Workspace', validator: () => this.validateWorkspace(), critical: false },
      { name: 'Podfile Modifications', validator: () => this.validatePodfileModifications(), critical: false },
      { name: 'Firebase Configuration', validator: () => this.validateFirebaseConfig(), critical: false },
      { name: 'Code Signing', validator: () => this.validateCodeSigning(), critical: false }
    ];
    
    const results: ValidationResult[] = [];
    
    // Run core validations first
    console.log('🔧 Core Development Environment:');
    for (const validation of coreValidations) {
      console.log(`Checking ${validation.name}...`);
      const result = validation.validator();
      results.push({ ...result, critical: validation.critical });
      
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.message}`);
      
      if (result.details) {
        console.log(`   ${result.details}`);
      }
      
      console.log();
    }
    
    // Run build-specific validations
    console.log('📱 Build-Specific Configuration (may fail before prebuild):');
    for (const validation of buildValidations) {
      console.log(`Checking ${validation.name}...`);
      const result = validation.validator();
      results.push({ ...result, critical: validation.critical });
      
      const status = result.passed ? '✅' : '⚠️ ';
      console.log(`${status} ${result.message}`);
      
      if (result.details) {
        console.log(`   ${result.details}`);
      }
      
      console.log();
    }
    
    return results;
  }
}

async function main() {
  const validator = new BuildValidator();
  
  try {
    const results = await validator.validateAll();
    
    const criticalFailures = results.filter(r => !r.passed && r.critical);
    const nonCriticalFailures = results.filter(r => !r.passed && !r.critical);
    
    if (criticalFailures.length > 0) {
      console.log(`❌ ${criticalFailures.length} critical validation(s) failed:`);
      criticalFailures.forEach(result => {
        console.log(`   • ${result.message}`);
      });
      console.log('\nPlease fix the critical issues above before building.');
      process.exit(1);
    }
    
    if (nonCriticalFailures.length > 0) {
      console.log(`⚠️  ${nonCriticalFailures.length} build-specific validation(s) failed (expected before prebuild):`);
      nonCriticalFailures.forEach(result => {
        console.log(`   • ${result.message}`);
      });
      console.log('\n💡 These failures are normal in local development.');
      console.log('   Run "npm run prebuild" and setup Firebase/certificates to resolve them.');
    }
    
    console.log('\n✅ Core development environment is ready!');
    console.log('🚀 Ready for iOS development with Xcode 16.1+ compatibility');
    
    // Only exit with error code if critical validations failed
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Build validation failed with error:', error);
    process.exit(1);
  }
}

// Run the validation
main().catch(console.error);