#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { installHooks } from 'src/commands/install';
import { uninstallHooks } from 'src/commands/uninstall';

const program = new Command();

program
  .name('claude-hooks')
  .description('CLI tool for managing Claude Code hooks')
  .version('1.0.0');

program
  .command('install')
  .description('Install Claude Code hooks')
  .action(async () => {
    try {
      await installHooks();
    } catch (error) {
      console.error(chalk.red('Error installing hooks:'), error);
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Uninstall Claude Code hooks')
  .action(async () => {
    try {
      await uninstallHooks();
    } catch (error) {
      console.error(chalk.red('Error uninstalling hooks:'), error);
      process.exit(1);
    }
  });

program.parse(); 