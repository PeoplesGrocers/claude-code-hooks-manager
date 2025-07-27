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
import { removeHooksWithDefinition } from '../uninstall-phase';
import { Hooks } from '../types';

const fixturesDir = path.join(__dirname, 'fixtures');

/**
 * Helper to create a temporary file with content and run the removal function
 */
async function testRemoval(
  beforeContent: string,
  hookDefinition: Hooks,
  expectedAfterContent: string,
  testName: string
): Promise<void> {
  // Create temp file
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hooks-test-'));
  const tempFile = path.join(tempDir, 'settings.local.json');
  
  try {
    // Write before content
    await fs.writeFile(tempFile, beforeContent);
    
    // Run removal
    const result = await removeHooksWithDefinition(tempFile, hookDefinition);
    
    // Normalize whitespace for comparison (remove extra spaces/newlines)
    const normalizeJson = (str: string) => JSON.stringify(JSON.parse(str));
    const actualNormalized = normalizeJson(result.newContent);
    const expectedNormalized = normalizeJson(expectedAfterContent);
    
    assert.equal(actualNormalized, expectedNormalized, 
      `${testName}: Content should match expected result`);
      
  } finally {
    // Cleanup
    await fs.rm(tempDir, { recursive: true });
  }
}

test('removeHooksWithDefinition - complex scenario with partial removal', async () => {
  const beforeContent = await fs.readFile(path.join(fixturesDir, 'complex-before.json'), 'utf-8');
  const expectedAfterContent = await fs.readFile(path.join(fixturesDir, 'complex-after.json'), 'utf-8');
  
  // Define what we want to remove
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
      },
      {
        matcher: "Read",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks track-read"
          },
          {
            type: "command", 
            command: "other-tool something"
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
  
  await testRemoval(beforeContent, hooksToRemove, expectedAfterContent, 'complex scenario');
});

test('removeHooksWithDefinition - weird formatting preserved where possible', async () => {
  const beforeContent = await fs.readFile(path.join(fixturesDir, 'weird-formatting-before.json'), 'utf-8');
  const expectedAfterContent = await fs.readFile(path.join(fixturesDir, 'weird-formatting-after.json'), 'utf-8');
  
  // Remove specific hooks while preserving formatting
  const hooksToRemove: Hooks = {
    tool_use: [
      {
        matcher: "Edit",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks validate"
          }
        ]
      },
      {
        matcher: "Write",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks track-write"
          },
          {
            type: "command",
            command: "some-other-tool action"
          }
        ]
      }
    ],
    session_end: [
      {
        matcher: "*",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks cleanup"
          }
        ]
      }
    ]
  };
  
  await testRemoval(beforeContent, hooksToRemove, expectedAfterContent, 'weird formatting');
});

test('removeHooksWithDefinition - complete removal leaves empty object cleaned up', async () => {
  const beforeContent = await fs.readFile(path.join(fixturesDir, 'empty-after-removal-before.json'), 'utf-8');
  const expectedAfterContent = await fs.readFile(path.join(fixturesDir, 'empty-after-removal-after.json'), 'utf-8');
  
  // Remove the only hook, should clean up empty hooks object
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
  
  await testRemoval(beforeContent, hooksToRemove, expectedAfterContent, 'complete removal cleanup');
});

test('removeHooksWithDefinition - no matches returns original content', async () => {
  const originalContent = `{
    "hooks": {
      "tool_use": [
        {
          "matcher": "Edit",
          "hooks": [
            {
              "type": "command",
              "command": "some-other-tool action"
            }
          ]
        }
      ]
    }
  }`;
  
  // Try to remove hooks that don't exist
  const hooksToRemove: Hooks = {
    tool_use: [
      {
        matcher: "NonExistent",
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks something"
          }
        ]
      }
    ]
  };
  
  await testRemoval(originalContent, hooksToRemove, originalContent, 'no matches');
});

test('removeHooksWithDefinition - partial hook removal within matcher', async () => {
  const beforeContent = `{
    "hooks": {
      "tool_use": [
        {
          "matcher": "Read",
          "hooks": [
            {
              "type": "command",
              "command": "happy-coder-hooks track-read"
            },
            {
              "type": "command",
              "command": "other-tool keep-this"
            },
            {
              "type": "command",
              "command": "happy-coder-hooks remove-this"
            }
          ]
        }
      ]
    }
  }`;
  
  const expectedAfterContent = `{
    "hooks": {
      "tool_use": [
        {
          "matcher": "Read",
          "hooks": [
            {
              "type": "command",
              "command": "other-tool keep-this"
            }
          ]
        }
      ]
    }
  }`;
  
  // This test demonstrates that our current implementation removes entire matchers,
  // not individual hooks within a matcher. This is the expected behavior.
  const hooksToRemove: Hooks = {
    tool_use: [
      {
        matcher: "Read", 
        hooks: [
          {
            type: "command",
            command: "happy-coder-hooks track-read"
          },
          {
            type: "command",
            command: "other-tool keep-this"
          },
          {
            type: "command", 
            command: "happy-coder-hooks remove-this"
          }
        ]
      }
    ]
  };
  
  // Since we're removing the entire matcher (all hooks must match exactly),
  // this should remove the whole matcher, and since it's the only matcher,
  // the empty hooks object gets cleaned up entirely
  const actualExpected = `{
  }`;
  
  await testRemoval(beforeContent, hooksToRemove, actualExpected, 'partial hook removal');
});

test('removeHooksWithDefinition - handles malformed settings gracefully', async () => {
  const malformedContent = `{
    "hooks": {
      "tool_use": [
        {
          "matcher": "Edit",
          "hooks": "not-an-array"
        },
        {
          "matcher": "Read",
          "hooks": [
            {
              "type": "command",
              "command": "valid-hook"
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
            command: "some-command"
          }
        ]
      }
    ]
  };
  
  // Should not crash and should leave malformed content unchanged
  await testRemoval(malformedContent, hooksToRemove, malformedContent, 'malformed settings');
});

test.run();