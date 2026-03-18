---
name: quality_guard
description: コード品質の維持・向上、カバレッジ改善、静的解析の修正を統合的に行うスキル。
---

# Quality Guard Skill

このスキルは、プロジェクトの品質基準（カバレッジ目標、Lint/Type Checkパス）を効率的に達成・維持するための手順書です。

> [!CAUTION]
> **AP-012: 言語とツールの不一致に注意**
> ツール実行前に、必ずプロジェクトの主要言語を確認してください。
> - **Python プロジェクト** (`pyproject.toml` / `requirements.txt` あり) → `ruff`, `black`, `mypy`, `pytest`
> - **TypeScript プロジェクト** (`package.json` / `tsconfig.json` あり) → `eslint`, `prettier`, `tsc`, `jest`/`vitest`
> - **絶対に `.py` ファイルに `eslint` を、`.ts` ファイルに `ruff` を実行しないこと。**

## 作業フロー

### 1. ターゲット分析 (Analysis)

1.  **現状把握**:
    - 対象ファイル（または全対象）のカバレッジを計測します。
      ```bash
      # 仮想環境を使用
      source ./venv/bin/activate
      pytest --cov=src --cov-report=term-missing
      ```
    - 静的解析の状態を確認します。
      ```bash
      ruff check .
      flake8 .
      mypy .
      ```

2.  **改善計画**:
    - `Missing` と判定された行を確認し、どのようなテストケースが必要かリストアップします。
    - Lint/型エラーの内容を分類（自動修正可能か、要ロジック修正か）します。

### 2. 修正と改善 (Remediation)

1.  **検証と修正 (Validate & Fix)**:
    - プロジェクトで定義された標準タスクを実行します。
      - `tool: git_task.run_task(task_name="validate")`
      - ※これには Lint, Type Check, Unit Test が含まれます。
    
    - エラーの自動修正が必要な場合は、以下を実行します。
      - `tool: git_task.run_task(task_name="fix")`
      - ※これには `ruff --fix` や `black` 等のフォーマッターが含まれます。

2.  **テスト追加 (Coverage Boost)**:
    - リストアップしたテストケースに基づいてテストコードを作成・追記します。
    - テスト追加後、再度 `validate` タスクを実行してパスすることを確認します。

### 3. シナリオテストと総合検証 (Scenario & E2E Testing)

ユニットテストのカバレッジが高くても、モジュール間の連携やサブプロセス呼び出しの引数不一致は検知できません。大規模なリファクタリングやサブモジュール変更後は、必ず以下の**「シナリオテスト」**を実施してください。

1.  **標準ディレクトリ**: `tests/scenario/`
    - 命名規則: `test_scenario_*.py`
    - 特徴: **コアロジックの境界でモックを使用しない。** 実DB、実サブプロセス（`equity_auditor.py` 等）を実際に叩き、最終的なアウトカム（DBレコードの変化、ファイル生成）を検証する。

2.  **実施コマンド**:
    ```bash
    pytest tests/scenario/
    ```

3.  **サブモジュール整合性チェック**:
    - `stock-analyzer4` などのサブモジュールを変更した場合、親リポジトリ側でのポインタ更新 (`git add <submodule>`) が漏れていないか、`self_diagnostic.py` や `git status` で厳格に確認する。

### 4. 検証と自己診断 (Verification)

1.  **リグレッションテスト**:
    - 修正後、全てのテストカテゴリが通ることを確認します。
      ```bash
      pytest tests/unit/ tests/integration/ tests/scenario/
      ```

2.  **自己診断**:
    - 最後に `python3 tools/self_diagnostic.py` を実行し、全体整合性をチェックします。

### 5. 完了報告 (Reporting)

- 実施した内容（修正した分析、パスしたシナリオテスト名）を報告してください。
- 変更内容を `history/` および `walkthrough.md` に記録することを忘れないでください。

### 6. Discord通知 (Notify)

1.  **品質レポート送信**:
    - 品質チェックやリファクタリングの結果を通知します。
    - `tool: discord.send_message`
    - `channel_name`: "notifications"
    - `content`: "🛡️ **[Quality Guard]** 検証完了。\n- Coverage: X%\n- Status: All Pass"
