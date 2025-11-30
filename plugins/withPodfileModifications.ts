import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Config plugin to add post_install hooks to Podfile for:
 * 1. Fixing iOS deployment target to minimum 12.0
 * 2. Disabling module verification for Xcode 16.1 compatibility
 * 3. Setting Swift compilation mode
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
        console.warn('Podfile not found at:', podfilePath);
        return config;
      }

      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // Post-install hook to fix Xcode 16.1 compatibility issues
      const postInstallHook = `
  post_install do |installer|
    puts "\\n🔧 Running post_install hook - Applying iOS build fixes..."
    
    installer.pods_project.targets.each do |target|
      puts "  📦 Configuring target: #{target.name}"
      
      target.build_configurations.each do |config|
        # Fix deployment target - must be at least iOS 12.0 for Xcode 16.1
        deployment_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if deployment_target && deployment_target.to_f < 12.0
          puts "    ✅ Setting IPHONEOS_DEPLOYMENT_TARGET to 12.0 (was #{deployment_target})"
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '12.0'
        end

        # Disable module verification - fixes PrecompileModule errors in Xcode 16.1
        config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
        
        # Disable explicit modules - alternative fix for module precompilation
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        
        # Set Swift compilation mode to whole module for better compatibility
        config.build_settings['SWIFT_COMPILATION_MODE'] = 'wholemodule'
        
        # Fix Swift optimization level mismatch - set to -Onone for Debug builds
        # This fixes the "expected -Onone" error when SWIFT_VERSION is set
        if config.name == 'Debug'
          config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
          puts "    ✅ Setting SWIFT_OPTIMIZATION_LEVEL to -Onone for Debug"
        elsif config.name == 'Release'
          config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-O'
          puts "    ✅ Setting SWIFT_OPTIMIZATION_LEVEL to -O for Release"
        end
        
        # Disable module debugging (can cause issues with precompilation)
        config.build_settings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO'
        
        # Fix for RNFBApp non-modular header error with Xcode 16.1
        # Disable treating non-modular includes as errors
        config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULES'] = 'NO'
        
        # For Firebase modules specifically, ensure warnings aren't treated as errors
        if target.name.include?('RNFB') || target.name.include?('Firebase')
          puts "    🔥 Applying Firebase-specific settings to #{target.name}"
          config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
          config.build_settings['CLANG_WARN_STRICT_PROTOTYPES'] = 'NO'
          # Ensure Firebase modules compile in Release mode without optimization issues
          config.build_settings['GCC_OPTIMIZATION_LEVEL'] = '0'
        end
        
        # For React-Core privacy target specifically
        if target.name.include?('React-Core') && target.name.include?('privacy')
          puts "    ⚛️  Applying React-Core privacy target fixes"
          config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
        end
      end
    end

    # Also update the project-level settings
    puts "\\n  🏗 Configuring project-level settings..."
    installer.pods_project.build_configurations.each do |config|
      config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
      config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULES'] = 'NO'
    end
    
    puts "\\n✅ Post-install hook completed successfully\\n"
  end`;

      // Check if post_install already exists
      if (contents.includes('post_install do |installer|')) {
        console.log('⚠️  post_install hook already exists in Podfile - skipping addition');
        
        // Check if our specific fixes are present
        if (!contents.includes('CLANG_ENABLE_MODULE_VERIFIER')) {
          console.log('⚠️  Adding module verifier settings to existing post_install');
          // Find the existing post_install block and add our settings
          const postInstallRegex = /(post_install do \|installer\|[\s\S]*?)(  end)/;
          const match = contents.match(postInstallRegex);
          
          if (match) {
            const existingContent = match[1];
            const closingEnd = match[2];
            
            const additionalConfig = `
    # Xcode 16.1 compatibility fixes
    puts "\\n🔧 Applying Xcode 16.1 compatibility fixes..."
    installer.pods_project.targets.each do |target|
      puts "  📦 Configuring target: #{target.name}"
      target.build_configurations.each do |config|
        deployment_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if deployment_target && deployment_target.to_f < 12.0
          puts "    ✅ Setting IPHONEOS_DEPLOYMENT_TARGET to 12.0"
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '12.0'
        end
        config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['SWIFT_COMPILATION_MODE'] = 'wholemodule'
        
        # Fix Swift optimization level mismatch
        if config.name == 'Debug'
          config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
          puts "    ✅ Setting SWIFT_OPTIMIZATION_LEVEL to -Onone for Debug"
        elsif config.name == 'Release'
          config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-O'
          puts "    ✅ Setting SWIFT_OPTIMIZATION_LEVEL to -O for Release"
        end
        
        config.build_settings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO'
        config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULES'] = 'NO'
        
        if target.name.include?('RNFB') || target.name.include?('Firebase')
          puts "    🔥 Applying Firebase-specific settings"
          config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
          config.build_settings['CLANG_WARN_STRICT_PROTOTYPES'] = 'NO'
          config.build_settings['GCC_OPTIMIZATION_LEVEL'] = '0'
        end
        
        # For React-Core privacy target specifically
        if target.name.include?('React-Core') && target.name.include?('privacy')
          puts "    ⚛️  Applying React-Core privacy target fixes"
          config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
        end
      end
    end
    puts "  🏗 Configuring project-level settings..."
    installer.pods_project.build_configurations.each do |config|
      config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
      config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULES'] = 'NO'
    end
    puts "✅ Xcode 16.1 compatibility fixes applied\\n"
`;
            
            contents = contents.replace(
              postInstallRegex,
              existingContent + additionalConfig + closingEnd
            );
            fs.writeFileSync(podfilePath, contents);
            console.log('✅ Added Xcode 16.1 compatibility settings to existing post_install');
          }
        } else {
          console.log('✅ Module verifier settings already present');
        }
      } else {
        // Add new post_install hook before the final 'end'
        console.log('✅ Adding new post_install hook to Podfile');
        contents = contents.replace(/end\s*$/, postInstallHook + '\nend');
        fs.writeFileSync(podfilePath, contents);
        console.log('✅ Successfully added post_install hook');
      }

      return config;
    },
  ]);
};

export default withPodfileModifications;

