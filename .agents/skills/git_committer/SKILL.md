---
name: git_committer
description: GEMINI.mdの安全規定に準拠し、一時ファイルを経由して安全にGitコミットを行うためのスキル。
---

# Git Committer Skill

GEMINI.md 第4章「コマンド実行の安全性」に基づき、シェルインジェクションを防ぐ安全なコミット手順を提供します。
エージェントは変更をコミットする際、直接 `git commit -m` を使用せず、必ずこのスキルを使用してください。

> [!WARNING]
> **本スキルの使用は「絶対義務」である。**
> いかなる「軽微な修正」や「緊急対応」であっても、この手順（診断実行→一時ファイル作成→コミット）を省略することは許されない。
> 直接 `git commit` コマンドを発行した時点で、それは**プロセス違反**とみなされる。

> [!IMPORTANT]
> **すべてのコマンド実行は `safe-shell` MCP (`mcp_safe-shell_execute_safe`) を使用すること。**
> `run_command` の直接使用は禁止。タイムアウト付きで安全に実行され、ログも自動保存される。


## 作業フロー

### 1. メッセージの準備 (Prepare Message)

1.  **メッセージの構成**:
    - ユーザーからコミットメッセージを受け取るか、変更内容に基づいて生成します。
    - **Prefixの使用**: 以下のConventionに従ってください。
        - `feat:` 機能追加
        - `fix:` バグ修正
        - `docs:` ドキュメントのみの変更
        - `style:` コードの意味に影響しない変更（空白、フォーマットなど）
        - `refactor:` バグ修正も機能追加も行わないコード変更
        - `test:` テストの追加・修正
        - `chore:` ビルドプロセスやツール、ライブラリの変更

### 2. コミット前処理 (Pre-commit Checks)

1.  **ステージングの確認 (Staging Check)**:
    - 修正がサブモジュール（例: `stock-analyzer4/`）に及ぶ場合、サブモジュール側でのコミット後に、親リポジトリ側でもその変更がステージング (`git add <submodule_path>`) されているか必ず確認してください。

2.  **アンチパターンチェック (Anti-Pattern Check)**:

    > [!IMPORTANT]
    > `.gemini/anti_patterns.md` を参照し、変更コードに該当パターンがないか確認すること。

### 3. 一時ファイル作成 (Create Temp File)

1.  **コミットメッセージを一時ファイルに書き出す**:
    - `write_to_file` ツールを使用して、コミットメッセージを `.git/COMMIT_EDITMSG_TEMP` に書き出します。
    - これにより、メッセージ内の特殊文字（`"`, `'`, `!` 等）によるシェルインジェクションを回避します。

### 4. コミット実行 (Execute Commit)

1.  **`safe-shell` MCP でコミットを実行**:
    ```
    mcp_safe-shell_execute_safe({
      command: "git commit -F .git/COMMIT_EDITMSG_TEMP",
      cwd: "<リポジトリルート>",
      timeout_seconds: 30
    })
    ```

> [!CAUTION]
> **`run_command` や `git commit -m "..."` の直接使用は禁止。**
> 必ず `safe-shell` MCP + 一時ファイル（`-F`）方式を使うこと。

### 5. プッシュと完了確認（Push & Verify）

1.  **リモートへのプッシュ**:
    ```
    mcp_safe-shell_execute_safe({
      command: "git push origin <branch_name>",
      cwd: "<リポジトリルート>",
      timeout_seconds: 30
    })
    ```

2.  **最終ステータス確認**:
    ```
    mcp_safe-shell_execute_safe({
      command: "git status",
      cwd: "<リポジトリルート>",
      timeout_seconds: 10
    })
    ```
    - `working tree clean` であることを確認してください。

3.  **Discord通知と確認 (Notify & Verify)**:
    - コミット完了を通知し、**必ず送信成功を確認してください**。
    - `tool: mcp_discord_send_message`
    - `channel_name`: "notifications"
    - `content`: "✅ **[Commit]** `<Title>`\nブランチ `<branch_name>` にプッシュしました。"
    - **確認手順**:
        - 送信後、`mcp_discord_read_recent_messages` で到着を確認する。
        - ユーザーへの最終報告に、必ず **「Discord通知: 送信確認済み」** と明記すること。
