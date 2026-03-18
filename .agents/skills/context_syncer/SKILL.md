---
name: context_syncer
description: プロジェクトのコンテキストファイル生成とドキュメント整合性チェックを行うスキル。
---

# Context Syncer Skill

このスキルは、コードベースの変更をドキュメント（コンテキストファイル）に反映させ、AIエージェントや開発者が常に最新情報を参照できるようにするための手順書です。

## 作業フロー

### 0. 作業開始・再開フロー (Start/Resume Session)

1.  **セッション状態の確認**:
    - タスク開始時、まず対象プロジェクトのセッション状態を確認します。
    - **Tool**: `context.load_session_state`
    - **Args**: `project_root`
2.  **状況把握と報告**:
    - **データがある場合**:
        - 読み込んだ情報（Active files, Task status, Plan path）を元に、「前回は〜〜まで行いました。現在は[計画]の[フェーズ]にいます」とユーザーに報告し、作業を再開します。
    - **データがない/計画書がない場合**:
        - 「計画書が見つかりません。現在の状況から計画を再作成します」と宣言し、`implementation_plan.md` を作成してユーザーに提示します。
    - **計画書のロード**:
        - リンクされた `active_plan_path` (例: `docs/current_plan.md`) の内容を読み込み、マイルストーンを確認します。

### 1. コンテキスト更新 (Context Update)

1.  **コンテキスト生成 (Context Generation)**:
    - MCPメソッドを使用して、プロジェクトの最新コンテキストを生成します。
    - **Tool**: `context.generate_context`
    - **Args**:
        - `project_root`: 対象プロジェクトのルートパス (絶対パス)。
        - `output_name`: `[ProjectName]_full_context.md` (デフォルトのままでOK)。
    - 生成されたファイルが期待通りか確認してください。

### 2. ドキュメント整合性チェック (Consistency Check)

1.  **主要ドキュメントの確認**:
    - `task.md`: 完了済みのタスクが `[x]` になっているか、現状と乖離していないか確認します。
    - `docs/backlog.md`: 実装済みの機能がバックログに残ったままになっていないか確認します。
    - `GEMINI.md`: 新しいルールや運用変更があった場合、反映されているか確認します。

2.  **アーカイブ提案**:
    - `docs/proposal/` 内の提案書で、既に実装・マージされたものがあれば `docs/archive/` への移動をユーザーに提案、または実行（許可済みの場合）します。

3.  **バックログ整合性 (Backlog Check)**:
    - **`pm.read_backlog`** を使用して未完了タスクを確認し、現状と照らし合わせます。
    - 完了しているものがあれば **`pm.update_task_status`** で完了にします。

### 3. セッション状態の保存 (Save Session State)
**実行タイミング**: ユーザーから「タスク完了」「中断」「コンテキスト同期」および**それらに類似する表現**（例: 「今日はここまで」「休憩する」「最新化して」等）があった場合。

1.  **計画書の永続化チェック**:
    - プロジェクト計画書が `docs/current_plan.md` (または `docs/plans/` 配下) に存在するか確認します。
    - **Brain内にのみ存在する場合**: `implementation_plan.md` (Artifact) の内容を、**`docs/current_plan.md` として保存・コピー**し、これを正本とします。
    - **存在しない場合**: エージェントに「計画書が存在しません。現状を整理し `docs/current_plan.md` を作成してください」と再策定を促します。
2.  **状態保存実行**:
    - **Tool**: `context.save_session_state`
    - **Args**:
        - `project_root`: プロジェクトルート。
        - `active_plan_path`: 永続化された計画書のパス (例: `docs/current_plan.md`)。
        - `task_status`: 現在の具体的な状況。
        - `next_action`: 次に行うべきアクション。
        - `active_files`: 現在作業中または参照中のファイルリスト。
        - `memo`: ユーザーへの申し送り事項があれば。
3.  **完了報告**:
    - ユーザーへの最終レスポンスに、**「セッション状態と計画書を保存しました」** という旨を明記します。

### 4. 日報・履歴記録 (Logging & Closing)

1.  **活動ログ記録**:
    - **`pm.log_activity`** を使用して、今回の作業内容（コンテキスト更新やドキュメント修正）を `docs` カテゴリで記録します。
        - 例: `pm.log_activity(content="Updated project context and cleaned up backlog", category="docs")`

2.  **業務終了 (Daily Close - Optional)**:
    - ユーザーから「一日の終わり」や「作業終了」を指示された場合、または大きな区切りがついた場合：
    - **`pm.close_daily_report`** を実行して、その日の全コミット数やバグ修正数を集計し、日報を締めくくります。
    - *Note*: これにより `admin/history/` にサマリが追記されます。

### 5. 自己診断チェック (Diagnostic Check)

1.  **スクリプト実行**:
    - ドキュメント更新がコードの健全性に影響していないか念のため確認します。
      ```bash
      python3 self_diagnostic.py
      ```

### 6. 完了報告 (Reporting)

- 更新されたコンテキストファイル名（例: `gdrive-server_full_context.md`）を報告してください。
- PMツールを使用した場合は、「日報への記録完了」も併せて報告してください。
- **重要**: セッション状態を保存した場合は、「**セッション状態と計画書を保存しました**」と報告してください。

### 7. Discord通知 (Notify)

1.  **日報通知**:
    - `pm.close_daily_report` を実行した場合は、必ず通知を行います。
    - `tool: discord.send_message`
    - `channel_name`: "notifications"
    - `content`: "📅 **[Daily Report]** 日報を作成しました。\n- Date: YYYY-MM-DD"
