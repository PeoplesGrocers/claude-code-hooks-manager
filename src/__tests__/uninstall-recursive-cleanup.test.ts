/*
 * CLI tool for managing Claude Code hooks
 * Copyright (C) 2025  Peoples Grocers LLC
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, see <https://www.gnu.org/licenses/>.
 */

import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import * as jsonc from 'jsonc-parser';
import { removeHooksWithDefinition } from '../uninstall-phase';
import { Hooks } from '../types';

/**
 * RECURSIVE CLEANUP TESTS
 * 
 * These tests verify the recursive cleanup behavior during hook uninstallation.
 * The core principle: if a user didn't have a specific event type or matcher 
 * before we installed hooks, we should clean those up when uninstalling.
 * 
 * Examples:
 * - If they didn't have "tool_use" events before, remove the entire "tool_use" object
 * - If they didn't have a "Read" matcher before, remove the entire matcher object
 * - If removing all matchers empties an event, remove the event object
 * - If removing all events empties the hooks object, remove the hooks object entirely
 */

const fixturesDir = path.join(__dirname, 'fixtures');

/**
 * Helper to create a temporary file with content and run the removal function
 */
async function testRecursiveCleanup(
  beforeContent: string,
  hookDefinition: Hooks,
  expectedAfterContent: string,
  testName: string
): Promise<void> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hooks-cleanup-test-'));
  const tempFile = path.join(tempDir, 'settings.local.json');
  
  try {
    await fs.writeFile(tempFile, beforeContent);
    const result = await removeHooksWithDefinition(tempFile, hookDefinition);
    
    const normalizeJson = (str: string) => JSON.stringify(jsonc.parse(str));
    const actualNormalized = normalizeJson(result.newContent);
    const expectedNormalized = normalizeJson(expectedAfterContent);
    
    assert.equal(actualNormalized, expectedNormalized, 
      `${testName}: Recursive cleanup should match expected result`);
      
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
}

test('recursive cleanup - removing last matcher cleans up event object', async () => {
  const beforeContent = `{
    "hooks": {
      "tool_use": [
        {
          "matcher": "Read",
          "hooks": [
            {
              "type": "command",
              "command": "happy-coder-hooks track-read"
            }
          ]
        }
      ]
    }
  }`;
  
  const hooksToRemove: Hooks = {
    tool_use: [
      {
        matcher: "Read",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks track-read"
          }
        ]
      }
    ]
  };
  
  // Since we're removing the only matcher, the entire tool_use event should be cleaned up
  // Since tool_use was the only event, the entire hooks object should be cleaned up
  const expectedAfterContent = `{}`;
  
  await testRecursiveCleanup(beforeContent, hooksToRemove, expectedAfterContent, 
    'removing last matcher cleans up event object');
});

test('recursive cleanup - removing last event cleans up hooks object', async () => {
  const beforeContent = `{
    "someOtherConfig": "value",
    "hooks": {
      "session_start": [
        {
          "matcher": "*",
          "hooks": [
            {
              "type": "command",
              "command": "happy-coder-hooks session-init"
            }
          ]
        }
      ]
    }
  }`;
  
  const hooksToRemove: Hooks = {
    session_start: [
      {
        matcher: "*",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks session-init"
          }
        ]
      }
    ]
  };
  
  // Since session_start was the only event, the entire hooks object should be cleaned up
  // Other config should remain untouched
  const expectedAfterContent = `{
    "someOtherConfig": "value"
  }`;
  
  await testRecursiveCleanup(beforeContent, hooksToRemove, expectedAfterContent, 
    'removing last event cleans up hooks object');
});

test('recursive cleanup - removing all matchers from multiple events', async () => {
  const beforeContent = `{
    "hooks": {
      "tool_use": [
        {
          "matcher": "Edit",
          "hooks": [
            {
              "type": "command",
              "command": "happy-coder-hooks validate-edit"
            }
          ]
        }
      ],
      "session_start": [
        {
          "matcher": "*",
          "hooks": [
            {
              "type": "command",
              "command": "happy-coder-hooks session-init"
            }
          ]
        }
      ]
    }
  }`;
  
  const hooksToRemove: Hooks = {
    tool_use: [
      {
        matcher: "Edit",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks validate-edit"
          }
        ]
      }
    ],
    session_start: [
      {
        matcher: "*",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks session-init"
          }
        ]
      }
    ]
  };
  
  // Since we're removing all matchers from all events, everything should be cleaned up
  const expectedAfterContent = `{}`;
  
  await testRecursiveCleanup(beforeContent, hooksToRemove, expectedAfterContent, 
    'removing all matchers from multiple events');
});

test('recursive cleanup - complete removal with fixture files', async () => {
  const beforeContent = await fs.readFile(path.join(fixturesDir, 'empty-after-removal-before.json'), 'utf-8');
  const expectedAfterContent = await fs.readFile(path.join(fixturesDir, 'empty-after-removal-after.json'), 'utf-8');
  
  // Remove the only hook - this should trigger complete recursive cleanup
  const hooksToRemove: Hooks = {
    tool_use: [
      {
        matcher: "Edit",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks only-hook"
          }
        ]
      }
    ]
  };
  
  await testRecursiveCleanup(beforeContent, hooksToRemove, expectedAfterContent, 
    'complete removal with fixture files');
});

test('recursive cleanup - removing one matcher when multiple exist should not clean up event', async () => {
  const beforeContent = `{
    "hooks": {
      "tool_use": [
        {
          "matcher": "Read",
          "hooks": [
            {
              "type": "command",
              "command": "happy-coder-hooks track-read"
            }
          ]
        },
        {
          "matcher": "Write",
          "hooks": [
            {
              "type": "command",
              "command": "keep-this-one"
            }
          ]
        }
      ]
    }
  }`;
  
  const hooksToRemove: Hooks = {
    tool_use: [
      {
        matcher: "Read",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks track-read"
          }
        ]
      }
    ]
  };
  
  // Since Write matcher remains, tool_use event should not be cleaned up
  const expectedAfterContent = `{
    "hooks": {
      "tool_use": [
        {
          "matcher": "Write",
          "hooks": [
            {
              "type": "command",
              "command": "keep-this-one"
            }
          ]
        }
      ]
    }
  }`;
  
  await testRecursiveCleanup(beforeContent, hooksToRemove, expectedAfterContent, 
    'partial removal should not trigger cleanup');
});

test.run();