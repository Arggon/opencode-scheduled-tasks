---
schedule: "0 3 * * *"
timezone: Europe/Madrid
model: opencode/space-bunny-free
agent: build
session: reuse
runTimeout: 30m
misfire: skip
maxCatchUp: 5
enabled: true
permissions:
  bash:
    "*": deny
    "git diff *": allow
---
Review the diff since the last tag for security issues.
