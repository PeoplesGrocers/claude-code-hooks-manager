import chalk from 'chalk';

import { discoverClaudeDirectories } from 'src/discovery-phase';
import { makeInstallDecision } from 'src/decision-phase';
import { performInstallation, reportInstallResults } from 'src/install-phase';

/**
 * Main install workflow using three distinct phases
 */
export async function installHooks(): Promise<void> {
  console.log(chalk.blue('🔧 Installing Claude hooks\n'));
  
  // Phase 1: Discovery
  const discovery = await discoverClaudeDirectories();
  
  // Phase 2: Decision
  const decision = await makeInstallDecision(discovery);
  
  if (!decision.proceed) {
    // User cancelled
    return;
  }
  
  // Phase 3: Installation
  const result = await performInstallation(
    decision.targetDirectory!,
    decision.createNewDirectory
  );
  
  // Report results
  reportInstallResults(result);
} 