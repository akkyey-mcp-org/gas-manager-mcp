---
name: feat_implementer
description: GEMINI.mdの厳格なルール（計画→承認→実装→履歴→診断）に従い、機能実装を安全に進めるためのスキル。
---

# Feature Implementation Master Skill

このスキルは、プロジェクトの定めた厳格な開発プロセス（GEMINI.md）を遵守しながら機能実装を行うためのガイドラインです。
エージェントはこの手順に従って、安全確実な実装を行ってください。

## 作業フロー

### 1. 準備 (Preparation)

1.  **目的の確認**:
    - ユーザーから実装したい機能や修正の内容を明確に聞き出してください。
    - 不明点があれば質問してください。

2.  **ブランチ戦略の決定**:
    - 適切なブランチ名を提案し、ユーザーの合意を得てください。
    - 命名規則:
        - 新機能: `feat/<name>`
        - 修正: `fix/<name>`
        - ドキュメント: `docs/<name>`
        - リファクタリング: `refactor/<name>`
    - 合意後、ブランチを作成してください。
      ```bash
      git checkout -b <branch_name>
      ```

### 2. 計画と合意 (Planning & Agreement)

1.  **実装計画書の作成 (Implementation Plan)**:
    - 必ずコードを触る前に `implementation_plan.md` を作成（または更新）してください。
    - 以下の項目を含めること:
        - `## Goal`: 何をするのか
        - `## User Review Required`: ユーザー判断が必要な箇所（なければ省略可）
        - `## Proposed Changes`: 変更するファイルとその内容の概要
        - `## Verification Plan`: どうやって動作確認するか（テストコード、手動確認手順）

2.  **ユーザーレビュー (Review)**:
    - `notify_user` ツールを使い、計画書のレビューを依頼してください。
    - **重要**: ユーザーから `Approve` (承認) が出るまで、次の「実装」フェーズに進んではいけません。

### 3. 実装 (Implementation)

1.  **コード編集**:
    - 計画書に従ってコードを修正・作成してください。

2.  **履歴の記録 (History)**:
    - **必須**: ファイルを変更したら、必ず **`pm.log_activity`** を使用して履歴を記録してください。
    - 引数:
        - `content`: "Modified `src/path/to/file.py`: 修正内容の要約"
        - `category`: `feat` / `fix` / `docs` / `other` から選択
    - *Note*: 手動で `history/` フォルダを操作する必要はありません。

3.  **品質チェック (Quality Check)**:
    - 実装の区切りごとに静的解析を実行してください。
      ```bash
      # 仮想環境を使用すること
      source ./venv/bin/activate
      ruff check . --fix
      black .
      mypy .
      ```

### 4. 検証と診断 (Verification & Diagnostic)

1.  **自己診断スクリプトの実行**:
    - 必ず `self_diagnostic.py` を実行して、プロジェクトの健全性を確認してください。
      ```bash
      python3 self_diagnostic.py
      ```
    - 失敗した場合は修正を行い、パスするまで繰り返してください。

2.  **コンテキスト更新**:
    - 重要な変更があった場合は、コンテキスト生成スクリプトを実行してください。
      ```bash
      python3 full_context/generate_full_context.py
      ```

### 5. 完了 (Completion)

1.  **ブログネタの記録**:
    - **必須**: **`pm.record_idea`** を使用して、今回の実装で得た知見や苦労した点を記録してください。
    - 引数:
        - `topic`: アイデアのタイトル（例: "DevOps MCPの導入効果"）
        - `content`: 詳細なメモや考察

2.  **最終報告**:
    - 実装内容、テスト結果、履歴ファイル、および**ブログネタの更新状況**をユーザーに報告してください。
    - コミットの準備ができたことを伝えてください。
