---
description: .gemini環境同期
---

# MCP 

 `.gemini`HooksMCP
`git pull`  `gemini-core` 

## 

`projects.json` 

1.  `mcp-servers`
2.  `project-stock2`
3.  `salesforce`
4.  `gemini-docs`
5.  ( `projects.json` )

## 

// turbo-all

### 1. マスタ規約の強制配信 (Broadcaster)

`gemini-core` の最新規約と設計思想のひな形を、全プロジェクトへ物理コピーして同期します。

```bash
# gemini-core の最新状態を反映
python3 /home/irom/dev/gemini-core/scripts/broadcast_core.py
```

### 2. Git Hooks の同期

`.gemini` Git Hooks を再設定します。

```bash
CORE_ROOT="/home/irom/dev/gemini-core"
DEV_ROOT="/home/irom/dev"

# projects.json に基づく同期（プロジェクト例）
for dir in "${DEV_ROOT}/mcp-servers" "${DEV_ROOT}/project-stock2" "${DEV_ROOT}/salesforce"; do
  if [ -d "${dir}/.git" ]; then
    cp "${CORE_ROOT}/.gemini/scripts/git-hooks/pre-commit" "${dir}/.git/hooks/"
    chmod +x "${dir}/.git/hooks/pre-commit"
    echo " ✅ Hooks synced: $(basename ${dir})"
  fi
done
```

### 3. MCP 設定の同期

> [!NOTE]
> - ****: `mcp-servers/mcp_config.json`
> - ****: `~/.gemini/antigravity/mcp_config.json`IDE 
> - IDE
> - : AP-019MCP

### 3. 

Discord :
```
mcp_discord_send_message({ channel_name: "notifications", content: " .gemini HooksMCP" })
```

## 

- `.gemini`  `../gemini-core` 
