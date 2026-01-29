/**
 * Comprehensive Error Handling System for iOS Build Pipeline
 * 
 * This module provides centralized error classification, handling, and recovery
 * strategies for the iOS build process, specifically targeting Xcode 16.1
 * compatibility issues and Firebase integration problems.
 */

export interface BuildError {
  type: ErrorType;
  message: string;
  originalError: Error;
  context?: ErrorContext;
  recoveryStrategy?: RecoveryStrategy;
  timestamp: Date;
}

export enum ErrorType {
  CODE_SIGNING = 'CODE_SIGNING',
  FIREBASE_INTEGRATION = 'FIREBASE_INTEGRATION',
  MODULE_COMPILATION = 'MODULE_COMPILATION',
  XCODE_COMPATIBILITY = 'XCODE_COMPATIBILITY',
  TESTFLIGHT_UPLOAD = 'TESTFLIGHT_UPLOAD',
  DEPENDENCY_RESOLUTION = 'DEPENDENCY_RESOLUTION',
  NETWORK_CONNECTIVITY = 'NETWORK_CONNECTIVITY',
  BUILD_CONFIGURATION = 'BUILD_CONFIGURATION',
  UNKNOWN = 'UNKNOWN'
}

export interface ErrorContext {
  buildPhase: string;
  xcodeVersion?: string;
  iosSDKVersion?: string;
  podfileModified?: boolean;
  firebaseConfigPresent?: boolean;
  buildNumber?: string;
  retryCount?: number;
}

export interface RecoveryStrategy {
  automatic: boolean;
  steps: string[];
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential';
  requiresUserIntervention: boolean;
}

/**
 * Error classification patterns for automatic error type detection
 */
const ERROR_PATTERNS: Record<ErrorType, RegExp[]> = {
  [ErrorType.CODE_SIGNING]: [
    /Code Sign error/i,
    /Provisioning profile/i,
    /Certificate/i,
    /Keychain/i,
    /codesign/i,
    /PROVISIONING_PROFILE_REQUIRED/i,
    /CODE_SIGN_IDENTITY/i
  ],
  
  [ErrorType.FIREBASE_INTEGRATION]: [
    /Firebase/i,
    /RNFB/i,
    /GoogleService-Info\.plist/i,
    /FIRMessaging/i,
    /GPB_USE_PROTOBUF_FRAMEWORK_IMPORTS/i,
    /FirebaseCore/i,
    /FirebaseMessaging/i,
    /RNFBApp/i,
    /RNFBMessaging/i
  ],
  
  [ErrorType.MODULE_COMPILATION]: [
    /module.*not found/i,
    /import.*failed/i,
    /header.*not found/i,
    /CLANG_ENABLE_MODULE_VERIFIER/i,
    /CLANG_ENABLE_EXPLICIT_MODULES/i,
    /non-modular.*include/i,
    /module.*compilation/i,
    /Swift.*module/i
  ],
  
  [ErrorType.XCODE_COMPATIBILITY]: [
    /Xcode.*16/i,
    /iOS.*18/i,
    /deployment target/i,
    /IPHONEOS_DEPLOYMENT_TARGET/i,
    /Swift.*version/i,
    /SWIFT_VERSION/i,
    /USE_HEADERMAP/i,
    /DEFINES_MODULE/i
  ],
  
  [ErrorType.TESTFLIGHT_UPLOAD]: [
    /TestFlight/i,
    /App Store Connect/i,
    /upload.*failed/i,
    /bundle version.*higher/i,
    /DUPLICATE.*build/i,
    /API.*key/i,
    /authentication.*failed/i
  ],
  
  [ErrorType.DEPENDENCY_RESOLUTION]: [
    /CocoaPods/i,
    /pod install/i,
    /Podfile/i,
    /dependency.*resolution/i,
    /version.*conflict/i,
    /unable to find.*specification/i,
    /React Native.*version/i
  ],
  
  [ErrorType.NETWORK_CONNECTIVITY]: [
    /network/i,
    /connection.*failed/i,
    /timeout/i,
    /DNS.*resolution/i,
    /unable to connect/i,
    /rate limit/i,
    /service unavailable/i,
    /internal server error/i
  ],
  
  [ErrorType.BUILD_CONFIGURATION]: [
    /build.*configuration/i,
    /xcargs/i,
    /build settings/i,
    /workspace.*scheme/i,
    /export.*options/i,
    /archive.*failed/i,
    /build.*failed/i
  ],
  
  [ErrorType.UNKNOWN]: []
};

/**
 * Recovery strategies for different error types
 */
const RECOVERY_STRATEGIES: Record<ErrorType, RecoveryStrategy> = {
  [ErrorType.CODE_SIGNING]: {
    automatic: true,
    steps: [
      'Refresh keychain access',
      'Re-run fastlane match',
      'Verify provisioning profiles',
      'Check certificate validity'
    ],
    maxRetries: 2,
    backoffStrategy: 'linear',
    requiresUserIntervention: false
  },
  
  [ErrorType.FIREBASE_INTEGRATION]: {
    automatic: true,
    steps: [
      'Verify GoogleService-Info.plist exists',
      'Check Firebase SDK versions',
      'Validate Podfile modifications',
      'Clean and rebuild pods'
    ],
    maxRetries: 3,
    backoffStrategy: 'exponential',
    requiresUserIntervention: false
  },
  
  [ErrorType.MODULE_COMPILATION]: {
    automatic: true,
    steps: [
      'Clean derived data',
      'Apply Xcode 16.1 compatibility settings',
      'Rebuild with module verification disabled',
      'Update header search paths'
    ],
    maxRetries: 3,
    backoffStrategy: 'exponential',
    requiresUserIntervention: false
  },
  
  [ErrorType.XCODE_COMPATIBILITY]: {
    automatic: true,
    steps: [
      'Verify Xcode 16.1 installation',
      'Apply compatibility build settings',
      'Update deployment target to iOS 15.1+',
      'Disable problematic module features'
    ],
    maxRetries: 2,
    backoffStrategy: 'linear',
    requiresUserIntervention: false
  },
  
  [ErrorType.TESTFLIGHT_UPLOAD]: {
    automatic: true,
    steps: [
      'Increment build number',
      'Retry upload with exponential backoff',
      'Verify App Store Connect API key',
      'Check network connectivity'
    ],
    maxRetries: 5,
    backoffStrategy: 'exponential',
    requiresUserIntervention: false
  },
  
  [ErrorType.DEPENDENCY_RESOLUTION]: {
    automatic: true,
    steps: [
      'Update CocoaPods repository',
      'Clean pod cache',
      'Reinstall pods with --repo-update',
      'Verify React Native version compatibility'
    ],
    maxRetries: 2,
    backoffStrategy: 'linear',
    requiresUserIntervention: false
  },
  
  [ErrorType.NETWORK_CONNECTIVITY]: {
    automatic: true,
    steps: [
      'Wait for network recovery',
      'Retry with exponential backoff',
      'Check DNS resolution',
      'Verify firewall settings'
    ],
    maxRetries: 5,
    backoffStrategy: 'exponential',
    requiresUserIntervention: false
  },
  
  [ErrorType.BUILD_CONFIGURATION]: {
    automatic: true,
    steps: [
      'Validate build configuration',
      'Check workspace and scheme',
      'Verify export options',
      'Reset build settings to defaults'
    ],
    maxRetries: 2,
    backoffStrategy: 'linear',
    requiresUserIntervention: false
  },
  
  [ErrorType.UNKNOWN]: {
    automatic: false,
    steps: [
      'Analyze error logs',
      'Check recent changes',
      'Consult documentation',
      'Contact support if needed'
    ],
    maxRetries: 1,
    backoffStrategy: 'linear',
    requiresUserIntervention: true
  }
};

/**
 * Classifies an error based on its message and context
 */
export function classifyError(error: Error, context?: ErrorContext): ErrorType {
  const errorMessage = error.message;
  
  for (const [errorType, patterns] of Object.entries(ERROR_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(errorMessage))) {
      return errorType as ErrorType;
    }
  }
  
  return ErrorType.UNKNOWN;
}

/**
 * Creates a structured BuildError from a raw error
 */
export function createBuildError(
  error: Error, 
  context?: ErrorContext
): BuildError {
  const errorType = classifyError(error, context);
  const recoveryStrategy = RECOVERY_STRATEGIES[errorType];
  
  return {
    type: errorType,
    message: error.message,
    originalError: error,
    context,
    recoveryStrategy,
    timestamp: new Date()
  };
}

/**
 * Determines if an error is retryable based on its type and context
 */
export function isRetryableError(buildError: BuildError): boolean {
  const { type, context } = buildError;
  const strategy = RECOVERY_STRATEGIES[type];
  
  if (!strategy.automatic) {
    return false;
  }
  
  const currentRetries = context?.retryCount || 0;
  return currentRetries < strategy.maxRetries;
}

/**
 * Calculates the delay before next retry based on backoff strategy
 */
export function calculateRetryDelay(
  buildError: BuildError, 
  retryCount: number
): number {
  const strategy = buildError.recoveryStrategy;
  if (!strategy) return 0;
  
  const baseDelay = 2000; // 2 seconds
  
  switch (strategy.backoffStrategy) {
    case 'linear':
      return baseDelay * (retryCount + 1);
    case 'exponential':
      return baseDelay * Math.pow(2, retryCount);
    default:
      return baseDelay;
  }
}

/**
 * Generates detailed error report with recovery suggestions
 */
export function generateErrorReport(buildError: BuildError): string {
  const { type, message, context, recoveryStrategy, timestamp } = buildError;
  
  let report = `
🚨 BUILD ERROR REPORT
═══════════════════════════════════════════════════════════════

📅 Timestamp: ${timestamp.toISOString()}
🏷️  Error Type: ${type}
📝 Message: ${message}

`;

  if (context) {
    report += `🔍 Context:
`;
    Object.entries(context).forEach(([key, value]) => {
      report += `   ${key}: ${value}
`;
    });
    report += `
`;
  }

  if (recoveryStrategy) {
    report += `🔧 Recovery Strategy:
   Automatic: ${recoveryStrategy.automatic ? '✅' : '❌'}
   Max Retries: ${recoveryStrategy.maxRetries}
   Backoff: ${recoveryStrategy.backoffStrategy}
   User Intervention Required: ${recoveryStrategy.requiresUserIntervention ? '⚠️  Yes' : '✅ No'}

📋 Recovery Steps:
`;
    recoveryStrategy.steps.forEach((step, index) => {
      report += `   ${index + 1}. ${step}
`;
    });
  }

  report += `
═══════════════════════════════════════════════════════════════
`;

  return report;
}

/**
 * Provides specific troubleshooting guidance based on error type
 */
export function getTroubleshootingGuidance(errorType: ErrorType): string[] {
  const guidance: Record<ErrorType, string[]> = {
    [ErrorType.CODE_SIGNING]: [
      'Ensure your Apple Developer account is active',
      'Check that certificates haven\'t expired',
      'Verify provisioning profiles include all required devices',
      'Run `fastlane match` to refresh certificates',
      'Check keychain access permissions'
    ],
    
    [ErrorType.FIREBASE_INTEGRATION]: [
      'Verify GoogleService-Info.plist is in the project root',
      'Check Firebase SDK versions are compatible with Xcode 16.1',
      'Ensure static frameworks are enabled in expo-build-properties',
      'Validate Firebase preprocessor definitions are set',
      'Check that Firebase header search paths are configured'
    ],
    
    [ErrorType.MODULE_COMPILATION]: [
      'Clean Xcode derived data: rm -rf ~/Library/Developer/Xcode/DerivedData/*',
      'Ensure CLANG_ENABLE_MODULE_VERIFIER=NO is set',
      'Disable explicit modules: CLANG_ENABLE_EXPLICIT_MODULES=NO',
      'Check header search paths include all required directories',
      'Verify deployment target is iOS 15.1 or higher'
    ],
    
    [ErrorType.XCODE_COMPATIBILITY]: [
      'Confirm Xcode 16.1 is installed and selected',
      'Update iOS deployment target to 15.1+',
      'Apply Xcode 16.1 compatibility build settings',
      'Disable problematic module verification features',
      'Update Swift version to 5.0 if needed'
    ],
    
    [ErrorType.TESTFLIGHT_UPLOAD]: [
      'Check App Store Connect API key permissions',
      'Verify network connectivity to Apple servers',
      'Ensure build number is higher than previous uploads',
      'Check app bundle identifier matches App Store Connect',
      'Validate export options are correct for App Store distribution'
    ],
    
    [ErrorType.DEPENDENCY_RESOLUTION]: [
      'Update CocoaPods: gem update cocoapods',
      'Clean pod cache: pod cache clean --all',
      'Reinstall pods: cd ios && pod install --repo-update',
      'Check for version conflicts in Podfile.lock',
      'Verify React Native version compatibility'
    ],
    
    [ErrorType.NETWORK_CONNECTIVITY]: [
      'Check internet connection stability',
      'Verify DNS resolution is working',
      'Check for corporate firewall restrictions',
      'Try using a different network if possible',
      'Wait for temporary service outages to resolve'
    ],
    
    [ErrorType.BUILD_CONFIGURATION]: [
      'Validate workspace and scheme exist',
      'Check build configuration settings',
      'Verify export options are properly formatted',
      'Ensure all required build settings are present',
      'Reset to known working configuration if available'
    ],
    
    [ErrorType.UNKNOWN]: [
      'Review the complete error log for more details',
      'Check recent changes that might have caused the issue',
      'Search for similar issues in documentation or forums',
      'Consider reverting recent changes as a test',
      'Contact support with the complete error log'
    ]
  };
  
  return guidance[errorType] || guidance[ErrorType.UNKNOWN];
}

/**
 * Logs error information in a structured format
 */
export function logError(buildError: BuildError, logger?: (message: string) => void): void {
  const log = logger || console.error;
  
  log(`❌ ${buildError.type}: ${buildError.message}`);
  
  if (buildError.context) {
    log(`📍 Context: ${JSON.stringify(buildError.context, null, 2)}`);
  }
  
  if (buildError.recoveryStrategy?.automatic) {
    log(`🔄 Automatic recovery available (${buildError.recoveryStrategy.maxRetries} retries)`);
  } else {
    log(`⚠️  Manual intervention required`);
  }
}

/**
 * Comprehensive error handler that combines classification, logging, and recovery
 */
export class BuildErrorHandler {
  private errorHistory: BuildError[] = [];
  private logger?: (message: string) => void;
  
  constructor(logger?: (message: string) => void) {
    this.logger = logger;
  }
  
  /**
   * Handles an error with full classification and recovery logic
   */
  handleError(error: Error, context?: ErrorContext): BuildError {
    const buildError = createBuildError(error, context);
    this.errorHistory.push(buildError);
    
    // Log the error
    logError(buildError, this.logger);
    
    // Generate and log detailed report
    const report = generateErrorReport(buildError);
    if (this.logger) {
      this.logger(report);
    } else {
      console.log(report);
    }
    
    // Provide troubleshooting guidance
    const guidance = getTroubleshootingGuidance(buildError.type);
    if (this.logger) {
      this.logger(`💡 Troubleshooting Guidance:\n${guidance.map((g, i) => `   ${i + 1}. ${g}`).join('\n')}`);
    }
    
    return buildError;
  }
  
  /**
   * Gets the error history for analysis
   */
  getErrorHistory(): BuildError[] {
    return [...this.errorHistory];
  }
  
  /**
   * Clears the error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }
  
  /**
   * Gets statistics about error types
   */
  getErrorStatistics(): Record<ErrorType, number> {
    const stats: Record<ErrorType, number> = {} as Record<ErrorType, number>;
    
    Object.values(ErrorType).forEach(type => {
      stats[type] = 0;
    });
    
    this.errorHistory.forEach(error => {
      stats[error.type]++;
    });
    
    return stats;
  }
}