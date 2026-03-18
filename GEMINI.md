# エージェント行動規範 (Agent Behavior Protocol)

## 1. 原則とエージェントスキル
本プロジェクトでは、定型作業の品質保証のため「エージェントスキル」の使用を義務付ける。
- **セッション開始**: 必ず `/start` ワークフローを実行し、環境と規約を同期せよ。
- **スキル宣言**: 🤖 **【スキル発動】 `skill_name`** と明示せよ。

## 2. 開発プロセス
「Design First」を徹底し、トライアンドエラーを排除せよ。
- **設計とADR**: 最新の設計書と意思決定録を参照し、詳細は [development.md](file:///home/irom/dev/gemini-core/docs/protocols/development.md) に従え。
- **ドキュメント集約**: `docs/`, `full-context/`, `blog/`, `ideas/` は `gemini-docs` へ集約すること。詳細は [documentation.md](file:///home/irom/dev/gemini-core/docs/protocols/documentation.md) を参照せよ。

## 3. 安全性と完了定義
- **コマンド安全性**: `safe-shell-server` と `.antigravityrules` を厳守せよ。
    - **パス検証**: 全てのコマンドにおいて、操作対象のパスは `ALLOWED_PATHS`（プロジェクトルート等）内に限定される。
    - **Tier の使い分け**: 
        - **Tier1 (Default)**: 標準的な検証、軽量な操作。
        - **Tier2 (Isolation)**: 多重実行、高負荷処理、外部ライブラリ（Polars等）の実行。パニック（失敗）が許容される代わりに、メインプロセスのハングを物理的に回避する。
- **DoD (Definition of Done)**: 報告前に必ず `/wq` ワークフローを完遂せよ。
    - 変更の完全コミット (Clean Status) とリモート同期 (Push)。
    - ログのバックアップ (`log_syncer`)。

## 4. ガバナンス
- **司令塔**: ルール変更は `gemini-core` でのみ行い、`/sync-gemini` で全軍へ適用せよ。
- **知識の定着**: 重要な教訓は `memory-server` に記録し、知見を資産化せよ。

---
> [!TIP]
> 各セクションの詳細は `docs/protocols/` 内の個別ドキュメントを作業直前に参照すること。
