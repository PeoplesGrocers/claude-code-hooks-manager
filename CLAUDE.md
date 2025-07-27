Here's how the install command should work:

1. Discovery Phase
  - I'll look for a .claude directory in the current location
  - If not found, I'll search upward through parent directories
  - I'll collect ALL potential locations where .claude could be created
2. Decision Phase
  - If .claude exists in current directory → use it immediately
  - If .claude exists in parent → ask for confirmation with clear explanation
  - If no .claude exists → present all candidate directories for user to choose
3. Installation Phase
  - Install hooks to chosen directory
  - If settings.local.json doesn't exist → tell user "I created a settings.local.json file"
  - Show what was installed


## Design of CLI
Do not use emojis instead use these Status Indicators:

```
✓ Success (green)
⚠ Warning (yellow)
✗ Error (red)
◆ Action in progress (blue)
└─ Tree structure connector (gray)
```
