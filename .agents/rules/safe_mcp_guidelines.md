# Safe-Shell & MCP Compliance Guidelines

このドキュメントは、`.antigravityrules` で定義された「掟」に従い、安全かつ効率的に開発を進めるための手順を提供します。

## 1. 原則
- **MCP-First**: 目的の操作に対応する MCP サーバーが存在する場合、直接のコマンド実行（`run_command`）は禁止されます。
- **Audit-Trail**: `safe-shell` を回避する場合は、必ず人間とシステムが納得できる「技術的理由」を記録に残さなければなりません。

## 2. 理由記録のテンプレート
`execute_safe` 等を回避して `run_command` を使用する場合、実行前に `.agent/local_insights.md` に以下の形式で記録してください。

```markdown
## Compliance: Shell Evasion
- **コマンド**: `実行しようとしたコマンド`
- **理由**: なぜ MCP では不十分なのか（例: インタラクティブな操作が必要、特定の環境変数への依存など）
- **MCP改善提案**: 将来的に MCP 側でどのように対応すべきか
```

## 3. 主要な MCP とその役割
- **git-task-server**: コミット、プッシュ、PR作成。
- **gdrive-server**: ドキュメントの読み書き、ファイル管理。
- **memory-server**: 長期記憶の保存と検索。
- **safe-shell-server**: 安全なシェルコマンド実行（隔離環境）。
