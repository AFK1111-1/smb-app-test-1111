import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DEFINITIVE FIX FOR XCODE 16.1 + FIREBASE
 * Strategy: Append a standalone post_install hook at the end of the file 
 * to avoid corrupting existing blocks, and use bulletproof Ruby logic.
 */
const withPodfileModifications: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // 1. Add global flags if missing
      const globalFlags = [
        "$RNFirebaseAsStaticFramework = true",
        "use_modular_headers!"
      ];
      
      globalFlags.forEach(flag => {
        if (!contents.includes(flag)) {
          contents = flag + "\n" + contents;
        }
      });

      // 2. Definitive Xcode 16.1 Compatibility Hook
      // We append this as a NEW block to avoid regex-corruption of existing blocks
      const xcode16FixHook = `
# --- START XCODE 16 DEFINITIVE FIX ---
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      next if config.build_settings.nil?
      
      # Fix deployment target
      deployment_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      if deployment_target && deployment_target.to_f < 15.1
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
      end

      # Module and Modularity settings
      config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
      config.build_settings['DEFINES_MODULE'] = 'YES'
      config.build_settings['SWIFT_COMPILATION_MODE'] = 'wholemodule'
      
      # OTHER_CFLAGS - Bulletproof append
      cflags = config.build_settings['OTHER_CFLAGS'] || ['$(inherited)']
      cflags = [cflags] if cflags.is_a?(String)
      unless cflags.include?('-Wno-error=non-modular-include-in-framework-module')
        cflags << '-Wno-error=non-modular-include-in-framework-module'
      end
      config.build_settings['OTHER_CFLAGS'] = cflags

      # Preprocessor Definitions - Bulletproof append
      defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
      defs = [defs] if defs.is_a?(String)
      ['GPB_USE_PROTOBUF_FRAMEWORK_IMPORTS=1', 'FIRMessaging_No_Symbols_Conflict=1'].each do |val|
        defs << val unless defs.include?(val)
      end
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
    end
  end
  
  # Project wide overrides
  installer.pods_project.build_configurations.each do |config|
    config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
    config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
  end
end
# --- END XCODE 16 DEFINITIVE FIX ---
`;

      // Only add if not already present
      if (!contents.includes('XCODE 16 DEFINITIVE FIX')) {
        contents = contents + "\n" + xcode16FixHook;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};

export default withPodfileModifications;
