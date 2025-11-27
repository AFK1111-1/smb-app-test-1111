import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Config plugin to add post_install hooks to Podfile for:
 * 1. Fixing iOS deployment target to minimum 15.1 (required for RN 0.76.x + Firebase)
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
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        # Fix deployment target - must be at least iOS 15.1 for RN 0.76.x + Firebase + New Architecture
        deployment_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if deployment_target && deployment_target.to_f < 15.1
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end

        # Disable module verification - fixes PrecompileModule errors in Xcode 16.1
        config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
        
        # Disable explicit modules - alternative fix for module precompilation
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        
        # Set Swift compilation mode to whole module for better compatibility
        config.build_settings['SWIFT_COMPILATION_MODE'] = 'wholemodule'
        
        # Disable module debugging (can cause issues with precompilation)
        config.build_settings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO'
      end
    end

    # Also update the project-level settings
    installer.pods_project.build_configurations.each do |config|
      config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
    end
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
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        deployment_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if deployment_target && deployment_target.to_f < 15.1
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
        config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['SWIFT_COMPILATION_MODE'] = 'wholemodule'
        config.build_settings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO'
      end
    end
    installer.pods_project.build_configurations.each do |config|
      config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
    end
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

