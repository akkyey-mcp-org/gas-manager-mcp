# Safe Commander Skill (V2)

このスキルは、Safe-Shell V2 の強固な隔離基盤と自律監視能力を最大限に引き出し、AI エージェントが実行するタスクの「安全性」と「継続性」を担保するための標準手順を提供します。

## 原則

1.  **Direct Execution**: 可能な限りシェル演算子（`&&` 等）を使わず、`execute_safe` またはマクロを使用する。
2.  **Autonomous Monitoring**: 長時間タスクは背景実行 (`background=True`) に逃がし、`get_process_status` で定期定期に内省監視を行う。
3.  **Survival First**: サーバー再起動や通信断絶が発生しても、`State Persistence` によりプロセスを再補足するレジリエンスを維持する。
4.  **Clean First**: 実行前に「場をきれいにする」。古いプロセスやロックファイルは敵である。
5.  **Predictive Resources**: 実行前に必要なリソース（CPU, メモリ, 時間）を予測し、天井ではなく枠として宣言する。
6.  **Log Always**: 標準出力・エラー出力はすべてファイルに残す。ターミナルバッファに頼らない。
7.  **Compliance Check (Mandatory)**: ツール（特に `run_command`）を実行する前に、必ずプロジェクトルートの `.antigravityrules` を読み込み、現在の環境が実行条件を満たしているか確認する。
8.  **No Speculative Execution**: 「あるはずだ」という仮定に基づくコマンド実行を禁止する。ファイル操作の前には必ず `ls` や `stat` で存在を確認する「段階的確認（2-step検証）」を徹底せよ。

## 手順

### 1. 段階的確認とクリーンアップ (Pre-flight Confirmation & Cleanup)

実行前に、対象の存在確認と競合プロセスのチェックを Safe-Shell を通じて行います。

1.  **実在確認 (Existence Check)**:
    - `cat`, `grep`, `edit` などの「中身」に触れる操作の前に、必ず **`verify_target`** ツールを使用して対象が実在し、操作可能な状態（サイズ、行数、バイナリ判定）であることを確定させる。
    - **検索前確認**: `grep` を実行する前には、`verify_target` の `pattern` 引数を使用して、そもそも対象ファイル内にキーワードが含まれているかを確認せよ。**「ヒットしない検索」を繰り返すことはハングの元であり、厳禁とする。**
    - **ディレクトリ走査**: `find` や `ls -R` を実行する前には、必ず **`verify_directory_volume`** で対象ディレクトリのファイル数を確認し、巨大（1000件以上）な場合は深度を絞るか、操作を分割せよ。
2.  **Git 状態確認 (Git Awareness)**:
    - `git commit`, `git push`, `git rebase` 等の操作前には、**`verify_git_state`** でコンフリクトやリベースの進行状況を確認せよ。不整合な状態での Git 操作は迷走を招く。
3.  **編集の下見 (Edit Dry-run)**:
    - `replace_file_content` を実行する前には、**`verify_edit_target`** を使用して置換対象の文字列がファイル内に「唯一」かつ「想定通り」存在することを確認せよ。
4.  **掟の参照 (Rules Validation)**:
    - `.antigravityrules` を読み取り、実行しようとしているツールが `prohibited_tools` に含まれていないか確認する。
    - もし含まれている場合（例: `run_command`）、`.agent/local_insights.md` に正当な理由が記録されている（`## Compliance: Shell Evasion` ヘッダーが存在する）ことを確認しなければならない。記録がない場合、**実行を自己却下せよ。**
2.  **プロセス確認**:
    - `get_process_status` を実行し、既存のロックや実行中プロセスがないか確認する。
2.  **ゾンビパージ**:
    - 予期せぬ残留がある場合は、`cleanup` ツールを使用して「場」を物理的に浄化する。

### 2. インテリジェント実行 (Smart Execution)

タスクの特性に応じて、最適な実行方法を選択します。

#### A. 短時間タスク (単発コマンド)
- `execute_safe` を同期実行（`background=False`）で使用。
- `AUTO PYTHONPATH` により、サブモジュール内でもパス設定なしで実行可能。

#### B. 長時間タスク (テスト、ビルド)
1.  **背景への委ね**:
    - `execute_safe` または `execute_macro` を `background=True` で呼び出す。
2.  **監視プロセスの確立**:
    - 返された `pid` を保持し、一定間隔で `get_process_status` を実行する。
3.  **内省的パース**:
    - `log_tail` の内容を読み取り、進捗をユーザーに報告する。

### 3. レジリエンス復旧 (Recovery)

通信断絶 (EOF) やサーバー再起動が発生した場合の復元手順。

1.  **沈黙の掌握**:
    - 接続が回復次第、`get_process_status` を実行する（引数は不要。Lockから自動特定される）。
2.  **物理証跡の確認**:
    - `/tmp/safe_shell_logs/macro_history.log` 等を直接覗き、断絶中の挙動を確定させる。

## 使用例

```python
# 長時間テストの例
mcp.execute_macro(macro_id="run_tests", background=True)
# -> { "pid": 1234, ... }

# 定期監視
mcp.get_process_status(pid=1234)
# -> { "running": True, "log_tail": "..." }
```

> [!TIP]
> 複雑な環境が必要な場合は、まず `macro_forger` スキルで武器を「鍛造」してから実行することを強く推奨します。
