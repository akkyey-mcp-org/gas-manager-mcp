---
description: ""
---

#  (Promote Insights)

 `.agent/local_insights.md` `gemini-core` GEMINI.md, anti_patterns.md

## 

### 1. 

 `local_insights.md` 

```bash
# gemini-core 
CORE_ROOT=$(git rev-parse --show-toplevel)
DEV_ROOT=$(cd "${CORE_ROOT}/.."; pwd)

#  (AI projects.json )
echo "=== [mcp-servers] ===" && cat "${DEV_ROOT}/mcp-servers/.agent/local_insights.md" 2>/dev/null || echo "(no file)"
echo "=== [project-stock2] ===" && cat "${DEV_ROOT}/project-stock2/.agent/local_insights.md" 2>/dev/null || echo "(no file)"
echo "=== [salesforce] ===" && cat "${DEV_ROOT}/salesforce/.agent/local_insights.md" 2>/dev/null || echo "(no file)"
```

### 2. 

AI3

1.  ****: `GEMINI.md` 
2.  ****: `anti_patterns.md` 
3.  ****:  `SKILL.md` 

### 3. 

 `gemini-core` 
 `$(git rev-parse --show-toplevel)` 

### 4. 

Push `local_insights.md` 

```bash
CORE_ROOT=$(git rev-parse --show-toplevel)
DEV_ROOT=$(cd "${CORE_ROOT}/.."; pwd)

truncate -s 0 "${DEV_ROOT}/mcp-servers/.agent/local_insights.md" 2>/dev/null
truncate -s 0 "${DEV_ROOT}/project-stock2/.agent/local_insights.md" 2>/dev/null
truncate -s 0 "${DEV_ROOT}/salesforce/.agent/local_insights.md" 2>/dev/null
```

### 5. 

`/sync-gemini` 

---

## 
- `gemini-core` 
-  `local_insights.md` 
-  `/sync-gemini` 
