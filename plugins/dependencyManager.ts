/**
 * Comprehensive Dependency Management for Xcode 16.1 + Firebase Compatibility
 * 
 * This module manages React Native Firebase versions, CocoaPods dependencies,
 * and ensures compatibility with Xcode 16.1 and static frameworks.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface DependencyCompatibilityMatrix {
  reactNative: string;
  reactNativeFirebase: string;
  firebase: string;
  cocoapods: string;
  xcode: string;
  ios: string;
  swift: string;
}

export interface DependencyValidationResult {
  isCompatible: boolean;
  issues: DependencyIssue[];
  recommendations: DependencyRecommendation[];
  compatibilityScore: number;
}

export interface DependencyIssue {
  type: 'version_conflict' | 'missing_dependency' | 'incompatible_version' | 'configuration_error';
  severity: 'error' | 'warning' | 'info';
  dependency: string;
  currentVersion?: string;
  requiredVersion?: string;
  description: string;
  resolution: string;
}

export interface DependencyRecommendation {
  action: 'upgrade' | 'downgrade' | 'install' | 'configure' | 'remove';
  dependency: string;
  fromVersion?: string;
  toVersion: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

/**
 * Xcode 16.1 compatible dependency matrix
 */
export const XCODE_16_1_COMPATIBILITY_MATRIX: DependencyCompatibilityMatrix[] = [
  {
    reactNative: '0.81.5',
    reactNativeFirebase: '23.8.4',
    firebase: '11.8.0',
    cocoapods: '1.15.2',
    xcode: '16.1',
    ios: '15.1',
    swift: '5.0'
  },
  {
    reactNative: '0.82.0',
    reactNativeFirebase: '24.0.0',
    firebase: '11.9.0',
    cocoapods: '1.15.2',
    xcode: '16.1',
    ios: '15.1',
    swift: '5.0'
  }
];

/**
 * Firebase SDK version compatibility mapping
 */
export const FIREBASE_SDK_COMPATIBILITY = {
  'RNFBApp': {
    '23.8.4': {
      firebaseCore: '11.8.0',
      minimumIOS: '15.1',
      xcode: '16.1',
      staticFrameworks: true
    }
  },
  'RNFBMessaging': {
    '23.8.4': {
      firebaseMessaging: '11.8.0',
      firebaseCore: '11.8.0',
      minimumIOS: '15.1',
      xcode: '16.1',
      staticFrameworks: true
    }
  },
  'RNFBAnalytics': {
    '23.8.4': {
      firebaseAnalytics: '11.8.0',
      firebaseCore: '11.8.0',
      minimumIOS: '15.1',
      xcode: '16.1',
      staticFrameworks: true
    }
  }
};

/**
 * Known problematic dependency combinations
 */
export const KNOWN_INCOMPATIBILITIES = [
  {
    dependencies: ['@react-native-firebase/app@<23.0.0', 'react-native@0.81.5'],
    issue: 'Firebase SDK versions below 23.0.0 have module compilation issues with Xcode 16.1',
    resolution: 'Upgrade @react-native-firebase/app to 23.8.4 or later'
  },
  {
    dependencies: ['expo-build-properties', 'useFrameworks: dynamic'],
    issue: 'Dynamic frameworks cause Firebase symbol conflicts in Xcode 16.1',
    resolution: 'Use static frameworks: useFrameworks: "static"'
  },
  {
    dependencies: ['cocoapods@<1.15.0', 'xcode@16.1'],
    issue: 'Older CocoaPods versions have compatibility issues with Xcode 16.1',
    resolution: 'Upgrade CocoaPods to 1.15.2 or later'
  }
];

/**
 * Parses package.json to extract dependency versions
 */
export function parsePackageJson(packageJsonPath: string): Record<string, string> {
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at ${packageJsonPath}`);
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  return dependencies;
}

/**
 * Parses Podfile.lock to extract CocoaPods dependency versions
 */
export function parsePodfileLock(podfileLockPath: string): Record<string, string> {
  if (!fs.existsSync(podfileLockPath)) {
    return {};
  }
  
  const podfileLock = fs.readFileSync(podfileLockPath, 'utf-8');
  const dependencies: Record<string, string> = {};
  
  // Parse PODS section
  const podsMatch = podfileLock.match(/PODS:\s*\n([\s\S]*?)\n\n/);
  if (podsMatch) {
    const podsSection = podsMatch[1];
    const lines = podsSection.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^\s*-\s*([^(]+)\s*\(([^)]+)\)/);
      if (match) {
        const [, name, version] = match;
        dependencies[name.trim()] = version.trim();
      }
    }
  }
  
  return dependencies;
}

/**
 * Extracts version from a dependency string (e.g., "^1.2.3" -> "1.2.3")
 */
export function extractVersion(versionString: string): string {
  return versionString.replace(/^[\^~>=<]/, '').split(' ')[0];
}

/**
 * Compares two semantic versions
 */
export function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

/**
 * Validates React Native Firebase compatibility with Xcode 16.1
 */
export function validateFirebaseCompatibility(
  dependencies: Record<string, string>
): DependencyValidationResult {
  const issues: DependencyIssue[] = [];
  const recommendations: DependencyRecommendation[] = [];
  
  // Check React Native Firebase core
  const rnfbApp = dependencies['@react-native-firebase/app'];
  if (!rnfbApp) {
    issues.push({
      type: 'missing_dependency',
      severity: 'error',
      dependency: '@react-native-firebase/app',
      description: 'React Native Firebase core package is required',
      resolution: 'Install @react-native-firebase/app@23.8.4'
    });
    
    recommendations.push({
      action: 'install',
      dependency: '@react-native-firebase/app',
      toVersion: '23.8.4',
      reason: 'Required for Firebase functionality with Xcode 16.1 compatibility',
      impact: 'high'
    });
  } else {
    const version = extractVersion(rnfbApp);
    if (compareVersions(version, '23.0.0') < 0) {
      issues.push({
        type: 'incompatible_version',
        severity: 'error',
        dependency: '@react-native-firebase/app',
        currentVersion: version,
        requiredVersion: '>=23.8.4',
        description: 'Firebase SDK version is incompatible with Xcode 16.1',
        resolution: 'Upgrade to @react-native-firebase/app@23.8.4'
      });
      
      recommendations.push({
        action: 'upgrade',
        dependency: '@react-native-firebase/app',
        fromVersion: version,
        toVersion: '23.8.4',
        reason: 'Xcode 16.1 compatibility requires Firebase SDK 23.8.4+',
        impact: 'high'
      });
    }
  }
  
  // Check React Native Firebase Messaging
  const rnfbMessaging = dependencies['@react-native-firebase/messaging'];
  if (rnfbMessaging) {
    const version = extractVersion(rnfbMessaging);
    if (compareVersions(version, '23.0.0') < 0) {
      issues.push({
        type: 'incompatible_version',
        severity: 'error',
        dependency: '@react-native-firebase/messaging',
        currentVersion: version,
        requiredVersion: '>=23.8.4',
        description: 'Firebase Messaging version is incompatible with Xcode 16.1',
        resolution: 'Upgrade to @react-native-firebase/messaging@23.8.4'
      });
      
      recommendations.push({
        action: 'upgrade',
        dependency: '@react-native-firebase/messaging',
        fromVersion: version,
        toVersion: '23.8.4',
        reason: 'Xcode 16.1 compatibility requires Firebase Messaging 23.8.4+',
        impact: 'high'
      });
    }
  }
  
  // Check React Native version compatibility
  const reactNative = dependencies['react-native'];
  if (reactNative) {
    const version = extractVersion(reactNative);
    if (compareVersions(version, '0.81.0') < 0) {
      issues.push({
        type: 'incompatible_version',
        severity: 'warning',
        dependency: 'react-native',
        currentVersion: version,
        requiredVersion: '>=0.81.5',
        description: 'React Native version may have compatibility issues with Xcode 16.1',
        resolution: 'Consider upgrading to React Native 0.81.5+'
      });
      
      recommendations.push({
        action: 'upgrade',
        dependency: 'react-native',
        fromVersion: version,
        toVersion: '0.81.5',
        reason: 'Better Xcode 16.1 compatibility and Firebase integration',
        impact: 'medium'
      });
    }
  }
  
  const compatibilityScore = calculateCompatibilityScore(issues);
  
  return {
    isCompatible: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    recommendations,
    compatibilityScore
  };
}

/**
 * Validates CocoaPods and iOS dependencies
 */
export function validateCocoaPodsCompatibility(
  podDependencies: Record<string, string>
): DependencyValidationResult {
  const issues: DependencyIssue[] = [];
  const recommendations: DependencyRecommendation[] = [];
  
  // Check Firebase Core version
  const firebaseCore = podDependencies['Firebase/Core'] || podDependencies['FirebaseCore'];
  if (firebaseCore) {
    const version = extractVersion(firebaseCore);
    if (compareVersions(version, '11.0.0') < 0) {
      issues.push({
        type: 'incompatible_version',
        severity: 'error',
        dependency: 'FirebaseCore',
        currentVersion: version,
        requiredVersion: '>=11.8.0',
        description: 'Firebase Core version is incompatible with static frameworks in Xcode 16.1',
        resolution: 'Update Firebase SDK to 11.8.0+'
      });
    }
  }
  
  // Check for problematic pod configurations
  const rnfbApp = podDependencies['RNFBApp'];
  if (rnfbApp) {
    const version = extractVersion(rnfbApp);
    if (compareVersions(version, '23.0.0') < 0) {
      issues.push({
        type: 'incompatible_version',
        severity: 'error',
        dependency: 'RNFBApp',
        currentVersion: version,
        requiredVersion: '>=23.8.4',
        description: 'RNFBApp version has module compilation issues with Xcode 16.1',
        resolution: 'Update React Native Firebase to 23.8.4+'
      });
    }
  }
  
  const compatibilityScore = calculateCompatibilityScore(issues);
  
  return {
    isCompatible: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    recommendations,
    compatibilityScore
  };
}

/**
 * Validates Expo configuration for Xcode 16.1 compatibility
 */
export function validateExpoConfiguration(configPath: string): DependencyValidationResult {
  const issues: DependencyIssue[] = [];
  const recommendations: DependencyRecommendation[] = [];
  
  if (!fs.existsSync(configPath)) {
    issues.push({
      type: 'missing_dependency',
      severity: 'error',
      dependency: 'app.config.ts',
      description: 'Expo configuration file not found',
      resolution: 'Create app.config.ts with proper Xcode 16.1 settings'
    });
    
    return {
      isCompatible: false,
      issues,
      recommendations,
      compatibilityScore: 0
    };
  }
  
  const configContent = fs.readFileSync(configPath, 'utf-8');
  
  // Check for static frameworks configuration
  if (!configContent.includes('useFrameworks') || !configContent.includes('static')) {
    issues.push({
      type: 'configuration_error',
      severity: 'error',
      dependency: 'expo-build-properties',
      description: 'Static frameworks not configured - required for Firebase with Xcode 16.1',
      resolution: 'Add expo-build-properties plugin with useFrameworks: "static"'
    });
    
    recommendations.push({
      action: 'configure',
      dependency: 'expo-build-properties',
      toVersion: 'static',
      reason: 'Static frameworks required for Firebase compatibility in Xcode 16.1',
      impact: 'high'
    });
  }
  
  // Check for iOS deployment target
  if (!configContent.includes('deploymentTarget') || !configContent.includes('15.1')) {
    issues.push({
      type: 'configuration_error',
      severity: 'warning',
      dependency: 'iOS deployment target',
      description: 'iOS deployment target should be 15.1+ for Xcode 16.1 compatibility',
      resolution: 'Set deploymentTarget: "15.1" in expo-build-properties'
    });
    
    recommendations.push({
      action: 'configure',
      dependency: 'iOS deployment target',
      toVersion: '15.1',
      reason: 'Ensures compatibility with Xcode 16.1 and Firebase SDK',
      impact: 'medium'
    });
  }
  
  // Check for Podfile modifications plugin
  if (!configContent.includes('withPodfileModifications')) {
    issues.push({
      type: 'configuration_error',
      severity: 'error',
      dependency: 'withPodfileModifications plugin',
      description: 'Podfile modifications plugin not configured',
      resolution: 'Add withPodfileModifications plugin to plugins array'
    });
    
    recommendations.push({
      action: 'configure',
      dependency: 'withPodfileModifications',
      toVersion: 'latest',
      reason: 'Required for automatic Xcode 16.1 compatibility settings injection',
      impact: 'high'
    });
  }
  
  const compatibilityScore = calculateCompatibilityScore(issues);
  
  return {
    isCompatible: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    recommendations,
    compatibilityScore
  };
}

/**
 * Calculates compatibility score based on issues
 */
function calculateCompatibilityScore(issues: DependencyIssue[]): number {
  let score = 100;
  
  for (const issue of issues) {
    switch (issue.severity) {
      case 'error':
        score -= 25;
        break;
      case 'warning':
        score -= 10;
        break;
      case 'info':
        score -= 5;
        break;
    }
  }
  
  return Math.max(0, score);
}

/**
 * Generates dependency update commands
 */
export function generateUpdateCommands(recommendations: DependencyRecommendation[]): string[] {
  const commands: string[] = [];
  
  for (const rec of recommendations) {
    switch (rec.action) {
      case 'upgrade':
      case 'install':
        commands.push(`npm install ${rec.dependency}@${rec.toVersion}`);
        break;
      case 'remove':
        commands.push(`npm uninstall ${rec.dependency}`);
        break;
    }
  }
  
  // Add CocoaPods update if any iOS dependencies changed
  const hasIOSDependencies = recommendations.some(r => 
    r.dependency.includes('firebase') || 
    r.dependency.includes('RNFB') ||
    r.dependency.includes('react-native')
  );
  
  if (hasIOSDependencies) {
    commands.push('cd ios && pod install --repo-update && cd ..');
  }
  
  return commands;
}

/**
 * Comprehensive dependency validation orchestrator
 */
export class DependencyValidator {
  private projectRoot: string;
  
  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }
  
  /**
   * Performs comprehensive dependency validation
   */
  async validateAllDependencies(): Promise<{
    overall: DependencyValidationResult;
    firebase: DependencyValidationResult;
    cocoapods: DependencyValidationResult;
    expo: DependencyValidationResult;
    updateCommands: string[];
  }> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const podfileLockPath = path.join(this.projectRoot, 'ios', 'Podfile.lock');
    const configPath = path.join(this.projectRoot, 'app.config.ts');
    
    // Parse dependencies
    const npmDependencies = parsePackageJson(packageJsonPath);
    const podDependencies = parsePodfileLock(podfileLockPath);
    
    // Validate each category
    const firebase = validateFirebaseCompatibility(npmDependencies);
    const cocoapods = validateCocoaPodsCompatibility(podDependencies);
    const expo = validateExpoConfiguration(configPath);
    
    // Combine results
    const allIssues = [...firebase.issues, ...cocoapods.issues, ...expo.issues];
    const allRecommendations = [...firebase.recommendations, ...cocoapods.recommendations, ...expo.recommendations];
    
    const overall: DependencyValidationResult = {
      isCompatible: allIssues.filter(i => i.severity === 'error').length === 0,
      issues: allIssues,
      recommendations: allRecommendations,
      compatibilityScore: calculateCompatibilityScore(allIssues)
    };
    
    const updateCommands = generateUpdateCommands(allRecommendations);
    
    return {
      overall,
      firebase,
      cocoapods,
      expo,
      updateCommands
    };
  }
  
  /**
   * Generates a comprehensive validation report
   */
  generateValidationReport(results: any): string {
    const { overall, firebase, cocoapods, expo, updateCommands } = results;
    
    let report = `
🔍 DEPENDENCY COMPATIBILITY REPORT
═══════════════════════════════════════════════════════════════

📊 Overall Compatibility Score: ${overall.compatibilityScore}/100
✅ Compatible: ${overall.isCompatible ? 'YES' : 'NO'}

`;

    // Firebase validation
    report += `🔥 Firebase Compatibility:
   Score: ${firebase.compatibilityScore}/100
   Issues: ${firebase.issues.length}
   Recommendations: ${firebase.recommendations.length}

`;

    // CocoaPods validation
    report += `🍫 CocoaPods Compatibility:
   Score: ${cocoapods.compatibilityScore}/100
   Issues: ${cocoapods.issues.length}
   Recommendations: ${cocoapods.recommendations.length}

`;

    // Expo validation
    report += `⚡ Expo Configuration:
   Score: ${expo.compatibilityScore}/100
   Issues: ${expo.issues.length}
   Recommendations: ${expo.recommendations.length}

`;

    // Issues summary
    if (overall.issues.length > 0) {
      report += `❌ Issues Found:
`;
      overall.issues.forEach((issue, index) => {
        const severity = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : 'ℹ️';
        report += `   ${index + 1}. ${severity} ${issue.dependency}: ${issue.description}
      Resolution: ${issue.resolution}
`;
      });
      report += `
`;
    }
    
    // Recommendations
    if (overall.recommendations.length > 0) {
      report += `💡 Recommendations:
`;
      overall.recommendations.forEach((rec, index) => {
        const impact = rec.impact === 'high' ? '🔴' : rec.impact === 'medium' ? '🟡' : '🟢';
        report += `   ${index + 1}. ${impact} ${rec.action.toUpperCase()} ${rec.dependency} to ${rec.toVersion}
      Reason: ${rec.reason}
`;
      });
      report += `
`;
    }
    
    // Update commands
    if (updateCommands.length > 0) {
      report += `🚀 Update Commands:
`;
      updateCommands.forEach((command, index) => {
        report += `   ${index + 1}. ${command}
`;
      });
    }
    
    report += `
═══════════════════════════════════════════════════════════════
`;
    
    return report;
  }
}