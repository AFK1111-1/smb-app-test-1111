#!/usr/bin/env tsx

/**
 * Dependency Validation Script
 * 
 * This script validates all project dependencies for Xcode 16.1 compatibility
 * and provides actionable recommendations for fixes.
 */

import { DependencyValidator } from '../dependencyManager';
import * as path from 'path';

async function main() {
  console.log('🔍 Starting comprehensive dependency validation...\n');
  
  const projectRoot = process.cwd();
  const validator = new DependencyValidator(projectRoot);
  
  try {
    // Perform validation
    const results = await validator.validateAllDependencies();
    
    // Generate and display report
    const report = validator.generateValidationReport(results);
    console.log(report);
    
    // Exit with appropriate code
    if (!results.overall.isCompatible) {
      console.log('❌ Dependency validation failed. Please address the issues above.');
      process.exit(1);
    } else {
      console.log('✅ All dependencies are compatible with Xcode 16.1!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Dependency validation failed with error:', error);
    process.exit(1);
  }
}

// Run the validation
main().catch(console.error);