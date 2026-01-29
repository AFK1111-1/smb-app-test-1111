/**
 * Build Performance Optimization for iOS Xcode 16.1 Builds
 * 
 * This module provides comprehensive build optimization strategies including
 * cache management, parallel compilation, selective cleaning, and performance monitoring.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface BuildOptimizationConfig {
  enableParallelCompilation: boolean;
  enableIncrementalBuilds: boolean;
  enableBuildCache: boolean;
  enableSelectiveCleaning: boolean;
  maxParallelJobs: number;
  cacheDirectory: string;
  derivedDataPath?: string;
  optimizationLevel: 'debug' | 'size' | 'speed';
}

export interface BuildPerformanceMetrics {
  buildStartTime: Date;
  buildEndTime?: Date;
  totalDuration?: number;
  compilationTime?: number;
  linkingTime?: number;
  cacheHitRate?: number;
  parallelJobsUsed?: number;
  derivedDataSize?: number;
  artifactSize?: number;
}

export interface CacheManagementStrategy {
  maxCacheSize: number; // in MB
  maxCacheAge: number; // in days
  cleanupThreshold: number; // percentage
  preservePatterns: string[];
  cleanupPatterns: string[];
}

/**
 * Default build optimization configuration for Xcode 16.1
 */
export const DEFAULT_OPTIMIZATION_CONFIG: BuildOptimizationConfig = {
  enableParallelCompilation: true,
  enableIncrementalBuilds: true,
  enableBuildCache: true,
  enableSelectiveCleaning: true,
  maxParallelJobs: Math.max(2, Math.floor(require('os').cpus().length * 0.75)),
  cacheDirectory: '~/Library/Developer/Xcode/DerivedData',
  optimizationLevel: 'speed'
};

/**
 * Default cache management strategy
 */
export const DEFAULT_CACHE_STRATEGY: CacheManagementStrategy = {
  maxCacheSize: 10240, // 10GB
  maxCacheAge: 7, // 7 days
  cleanupThreshold: 80, // 80%
  preservePatterns: [
    '**/Build/Products/**/*.app',
    '**/Build/Products/**/*.framework',
    '**/ModuleCache/**',
    '**/Index/**'
  ],
  cleanupPatterns: [
    '**/Build/Intermediates/**',
    '**/Logs/**',
    '**/info.plist',
    '**/*.hmap'
  ]
};

/**
 * Generates optimized Xcode build arguments for performance
 */
export function generateOptimizedXcodeArgs(config: BuildOptimizationConfig): string[] {
  const args: string[] = [];
  
  // Core performance settings
  args.push('ONLY_ACTIVE_ARCH=NO');
  args.push('ENABLE_BITCODE=NO');
  args.push('COMPILER_INDEX_STORE_ENABLE=NO');
  
  // Parallel compilation settings
  if (config.enableParallelCompilation) {
    args.push('CLANG_ENABLE_PARALLEL_COMPILATION=YES');
    args.push('CLANG_ENABLE_INCREMENTAL_COMPILATION=YES');
    args.push(`CLANG_PARALLEL_JOBS=${config.maxParallelJobs}`);
    args.push('SWIFT_ENABLE_PARALLEL_COMPILATION=YES');
  }
  
  // Incremental build settings
  if (config.enableIncrementalBuilds) {
    args.push('ENABLE_INCREMENTAL_DISTILL=YES');
    args.push('CLANG_ENABLE_INCREMENTAL_COMPILATION=YES');
  }
  
  // Optimization level settings
  switch (config.optimizationLevel) {
    case 'debug':
      args.push('GCC_OPTIMIZATION_LEVEL=0');
      args.push('SWIFT_OPTIMIZATION_LEVEL=-Onone');
      break;
    case 'size':
      args.push('GCC_OPTIMIZATION_LEVEL=s');
      args.push('SWIFT_OPTIMIZATION_LEVEL=-Osize');
      break;
    case 'speed':
      args.push('GCC_OPTIMIZATION_LEVEL=3');
      args.push('SWIFT_OPTIMIZATION_LEVEL=-O');
      break;
  }
  
  // Cache and derived data settings
  if (config.derivedDataPath) {
    args.push(`DERIVED_DATA_DIR=${config.derivedDataPath}`);
  }
  
  // Additional performance optimizations
  args.push('CLANG_ENABLE_COMMON_BLOCKS=YES');
  args.push('CLANG_ENABLE_OBJC_WEAK=YES');
  args.push('CLANG_WARN_BLOCK_CAPTURE_AUTORELEASING=YES');
  
  return args;
}

/**
 * Manages build cache for optimal performance
 */
export class BuildCacheManager {
  private config: CacheManagementStrategy;
  private cacheDirectory: string;
  
  constructor(
    cacheDirectory: string, 
    config: CacheManagementStrategy = DEFAULT_CACHE_STRATEGY
  ) {
    this.cacheDirectory = cacheDirectory.startsWith('~') 
      ? cacheDirectory.replace('~', require('os').homedir())
      : cacheDirectory;
    this.config = config;
  }
  
  /**
   * Analyzes current cache usage and performance
   */
  async analyzeCacheUsage(): Promise<{
    totalSize: number;
    fileCount: number;
    oldestFile: Date;
    newestFile: Date;
    utilizationPercentage: number;
  }> {
    if (!fs.existsSync(this.cacheDirectory)) {
      return {
        totalSize: 0,
        fileCount: 0,
        oldestFile: new Date(),
        newestFile: new Date(),
        utilizationPercentage: 0
      };
    }
    
    let totalSize = 0;
    let fileCount = 0;
    let oldestFile = new Date();
    let newestFile = new Date(0);
    
    const analyzeDirectory = (dir: string) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          analyzeDirectory(filePath);
        } else {
          totalSize += stats.size;
          fileCount++;
          
          if (stats.mtime < oldestFile) {
            oldestFile = stats.mtime;
          }
          
          if (stats.mtime > newestFile) {
            newestFile = stats.mtime;
          }
        }
      }
    };
    
    analyzeDirectory(this.cacheDirectory);
    
    const totalSizeMB = totalSize / (1024 * 1024);
    const utilizationPercentage = (totalSizeMB / this.config.maxCacheSize) * 100;
    
    return {
      totalSize: totalSizeMB,
      fileCount,
      oldestFile,
      newestFile,
      utilizationPercentage
    };
  }
  
  /**
   * Performs intelligent cache cleanup based on strategy
   */
  async performCacheCleanup(): Promise<{
    cleanedSize: number;
    cleanedFiles: number;
    preservedSize: number;
    preservedFiles: number;
  }> {
    const analysis = await this.analyzeCacheUsage();
    
    if (analysis.utilizationPercentage < this.config.cleanupThreshold) {
      return {
        cleanedSize: 0,
        cleanedFiles: 0,
        preservedSize: analysis.totalSize,
        preservedFiles: analysis.fileCount
      };
    }
    
    let cleanedSize = 0;
    let cleanedFiles = 0;
    let preservedSize = 0;
    let preservedFiles = 0;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.maxCacheAge);
    
    const cleanupDirectory = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          cleanupDirectory(filePath);
          
          // Remove empty directories
          try {
            const remainingFiles = fs.readdirSync(filePath);
            if (remainingFiles.length === 0) {
              fs.rmdirSync(filePath);
            }
          } catch (error) {
            // Directory not empty or other error, ignore
          }
        } else {
          const shouldPreserve = this.shouldPreserveFile(filePath);
          const isOld = stats.mtime < cutoffDate;
          
          if (!shouldPreserve && isOld) {
            try {
              fs.unlinkSync(filePath);
              cleanedSize += stats.size / (1024 * 1024);
              cleanedFiles++;
            } catch (error) {
              // File in use or permission error, skip
            }
          } else {
            preservedSize += stats.size / (1024 * 1024);
            preservedFiles++;
          }
        }
      }
    };
    
    cleanupDirectory(this.cacheDirectory);
    
    return {
      cleanedSize,
      cleanedFiles,
      preservedSize,
      preservedFiles
    };
  }
  
  /**
   * Determines if a file should be preserved during cleanup
   */
  private shouldPreserveFile(filePath: string): boolean {
    const relativePath = path.relative(this.cacheDirectory, filePath);
    
    // Check preserve patterns
    for (const pattern of this.config.preservePatterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        return true;
      }
    }
    
    // Check cleanup patterns (files that should be cleaned)
    for (const pattern of this.config.cleanupPatterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        return false;
      }
    }
    
    // Default to preserve if no pattern matches
    return true;
  }
  
  /**
   * Simple pattern matching for file paths
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }
}

/**
 * Monitors and tracks build performance metrics
 */
export class BuildPerformanceMonitor {
  private metrics: BuildPerformanceMetrics;
  private startTime: Date;
  
  constructor() {
    this.startTime = new Date();
    this.metrics = {
      buildStartTime: this.startTime
    };
  }
  
  /**
   * Marks the start of a build phase
   */
  startBuild(): void {
    this.startTime = new Date();
    this.metrics.buildStartTime = this.startTime;
  }
  
  /**
   * Marks the end of a build phase
   */
  endBuild(): void {
    this.metrics.buildEndTime = new Date();
    this.metrics.totalDuration = this.metrics.buildEndTime.getTime() - this.metrics.buildStartTime.getTime();
  }
  
  /**
   * Records compilation metrics
   */
  recordCompilationMetrics(compilationTime: number, parallelJobs: number): void {
    this.metrics.compilationTime = compilationTime;
    this.metrics.parallelJobsUsed = parallelJobs;
  }
  
  /**
   * Records cache performance metrics
   */
  recordCacheMetrics(hitRate: number): void {
    this.metrics.cacheHitRate = hitRate;
  }
  
  /**
   * Records artifact size metrics
   */
  recordArtifactMetrics(artifactPath: string): void {
    if (fs.existsSync(artifactPath)) {
      const stats = fs.statSync(artifactPath);
      this.metrics.artifactSize = stats.size / (1024 * 1024); // MB
    }
  }
  
  /**
   * Records derived data size
   */
  recordDerivedDataSize(derivedDataPath: string): void {
    if (fs.existsSync(derivedDataPath)) {
      let totalSize = 0;
      
      const calculateSize = (dir: string) => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            calculateSize(filePath);
          } else {
            totalSize += stats.size;
          }
        }
      };
      
      calculateSize(derivedDataPath);
      this.metrics.derivedDataSize = totalSize / (1024 * 1024); // MB
    }
  }
  
  /**
   * Gets current performance metrics
   */
  getMetrics(): BuildPerformanceMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Generates a performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    
    let report = `
🚀 BUILD PERFORMANCE REPORT
═══════════════════════════════════════════════════════════════

⏱️  Build Duration: ${metrics.totalDuration ? `${(metrics.totalDuration / 1000).toFixed(2)}s` : 'N/A'}
🔨 Compilation Time: ${metrics.compilationTime ? `${metrics.compilationTime.toFixed(2)}s` : 'N/A'}
⚡ Parallel Jobs Used: ${metrics.parallelJobsUsed || 'N/A'}
💾 Cache Hit Rate: ${metrics.cacheHitRate ? `${(metrics.cacheHitRate * 100).toFixed(1)}%` : 'N/A'}
📦 Artifact Size: ${metrics.artifactSize ? `${metrics.artifactSize.toFixed(2)} MB` : 'N/A'}
🗂️  Derived Data Size: ${metrics.derivedDataSize ? `${metrics.derivedDataSize.toFixed(2)} MB` : 'N/A'}

`;

    // Performance analysis
    if (metrics.totalDuration) {
      const durationMinutes = metrics.totalDuration / (1000 * 60);
      
      if (durationMinutes < 5) {
        report += `✅ Excellent build performance (< 5 minutes)
`;
      } else if (durationMinutes < 10) {
        report += `🟡 Good build performance (5-10 minutes)
`;
      } else if (durationMinutes < 20) {
        report += `🟠 Moderate build performance (10-20 minutes)
`;
      } else {
        report += `🔴 Slow build performance (> 20 minutes)
`;
      }
    }
    
    // Cache performance analysis
    if (metrics.cacheHitRate !== undefined) {
      if (metrics.cacheHitRate > 0.8) {
        report += `✅ Excellent cache performance (${(metrics.cacheHitRate * 100).toFixed(1)}% hit rate)
`;
      } else if (metrics.cacheHitRate > 0.6) {
        report += `🟡 Good cache performance (${(metrics.cacheHitRate * 100).toFixed(1)}% hit rate)
`;
      } else {
        report += `🔴 Poor cache performance (${(metrics.cacheHitRate * 100).toFixed(1)}% hit rate)
`;
      }
    }
    
    report += `
═══════════════════════════════════════════════════════════════
`;
    
    return report;
  }
}

/**
 * Comprehensive build optimization orchestrator
 */
export class BuildOptimizer {
  private config: BuildOptimizationConfig;
  private cacheManager: BuildCacheManager;
  private performanceMonitor: BuildPerformanceMonitor;
  
  constructor(config: BuildOptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG) {
    this.config = config;
    this.cacheManager = new BuildCacheManager(config.cacheDirectory);
    this.performanceMonitor = new BuildPerformanceMonitor();
  }
  
  /**
   * Prepares the build environment for optimal performance
   */
  async prepareBuildEnvironment(): Promise<void> {
    console.log('🚀 Preparing optimized build environment...');
    
    // Analyze and cleanup cache if needed
    const cacheAnalysis = await this.cacheManager.analyzeCacheUsage();
    console.log(`📊 Cache usage: ${cacheAnalysis.totalSize.toFixed(2)} MB (${cacheAnalysis.utilizationPercentage.toFixed(1)}%)`);
    
    if (cacheAnalysis.utilizationPercentage > 80) {
      console.log('🧹 Performing cache cleanup...');
      const cleanupResult = await this.cacheManager.performCacheCleanup();
      console.log(`✅ Cleaned ${cleanupResult.cleanedSize.toFixed(2)} MB (${cleanupResult.cleanedFiles} files)`);
    }
    
    // Start performance monitoring
    this.performanceMonitor.startBuild();
  }
  
  /**
   * Gets optimized Xcode build arguments
   */
  getOptimizedBuildArgs(): string[] {
    return generateOptimizedXcodeArgs(this.config);
  }
  
  /**
   * Finalizes build optimization and generates report
   */
  async finalizeBuild(artifactPath?: string): Promise<string> {
    this.performanceMonitor.endBuild();
    
    if (artifactPath) {
      this.performanceMonitor.recordArtifactMetrics(artifactPath);
    }
    
    if (this.config.derivedDataPath) {
      this.performanceMonitor.recordDerivedDataSize(this.config.derivedDataPath);
    }
    
    return this.performanceMonitor.generateReport();
  }
  
  /**
   * Gets current performance metrics
   */
  getPerformanceMetrics(): BuildPerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }
  
  /**
   * Updates optimization configuration
   */
  updateConfig(newConfig: Partial<BuildOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}