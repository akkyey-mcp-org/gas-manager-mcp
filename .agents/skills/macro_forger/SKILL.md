---
name: macro_forger
description: 現場での自律的なマクロ設計・登録・永続化（武器の鍛造）を行うためのスキル。
---

# Macro Forger Skill

このスキルは、AI エージェントが直面する特定のプロジェクト構造や不確実性に対し、最適な実行環境（マクロ）を自ら設計し、Safe-Shell V2 のレジストリへ蓄積するための公式手順を提供します。

## 原則

1.  **Context Aware**: プロジェクトの構成（サブモジュール、環境変数、依存関係）を事前に調査し、それに適合したマクロを定義する。
2.  **Immutability over Complexity**: 複雑なシェルスクリプトを `run_command` で回すのではなく、不変な「武器」としてマクロ化する。
3.  **Persist for Posterity**: 他のエージェントや将来の自分にとって有用なツールは、積極的に `persist=True` で物理保存する。

## 手順

### 1. 武器の設計 (Drafting)

マクロとして固定化すべき要素を特定します。

1.  **コマンドと引数**: `./venv/bin/python` 等の正確なバイナリパスを確認。
2.  **環境変数**: `PYTHONPATH` やアプリケーション固有の `ENV` を定義。
3.  **テンプレート化**: 引数の可変部分を `${args}` や `${1}` として設計。

### 2. 鍛造の実行 (Registration)

`register_macro` ツールを用いて、設計したマクロを Safe-Shell に刻みます。

```python
mcp.register_macro(
    macro_id="project_specific_tool",
    cmd="./bin/heavy_task",
    args=["--config", "config.json", "${args}"],
    env={"APP_MODE": "batch"},
    persist=True  # 永続化が必要な場合
)
```

### 3. 武器の試射 (Test Drive)

登録直後に、軽量な引数で `execute_macro` を試行し、期待通りに動作するか確認します。

1.  **試行**: `execute_macro(macro_id="...", args=["--dry-run"])`
2.  **証跡確認**: `get_process_status` でログを確認し、パス解決や環境変数が正しく適用されているか検証。

### 4. 武器庫の管理 (Armory Management)

`list_macros` を定期的に実行し、現場で使用可能な「武器」の目録を把握します。重複や不要なマクロがある場合は、`register_macro` での再定義（上書き）を検討してください。

## 永続化 (Persist) の判断基準

-   **プロジェクト標準**: 全エージェントが共通で使用するテストコマンドやビルド手順。
-   **高度な環境設定**: `PYTHONPATH` や複数の環境変数が複雑に絡み合う実行環境。
-   **長時間タスク**: 通信断絶下でもレジリエンス（監視継続）が必要なタスク。

> [!IMPORTANT]
> 単発の `ls` や `cat` 等の基本操作をマクロ化する必要はありません。それらは `execute_safe` の領分です。
