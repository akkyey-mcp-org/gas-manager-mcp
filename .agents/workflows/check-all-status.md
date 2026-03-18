---
description: Gitステータス一括確認
---

#  Git

// turbo-all

### 

```bash
# gemini-core 
CORE_ROOT=$(git rev-parse --show-toplevel)
DEV_ROOT=$(cd "${CORE_ROOT}/.."; pwd)

# 
echo "=== gemini-core ===" && cd "${CORE_ROOT}" && git status -s -b

# projects.json 
# (AI projects.json )

echo "=== mcp-servers ===" && cd "${DEV_ROOT}/mcp-servers" && git status -s -b
echo "=== project-stock2 ===" && cd "${DEV_ROOT}/project-stock2" && git status -s -b
echo "=== salesforce ===" && cd "${DEV_ROOT}/salesforce" && git status -s -b
echo "=== gemini-docs ===" && cd "${DEV_ROOT}/gemini-docs" && git status -s -b
```
