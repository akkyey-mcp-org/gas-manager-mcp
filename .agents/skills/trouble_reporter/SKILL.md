---
name: trouble_reporter
description: 不具合（バグ、テスト失敗、予期せぬエラー）発生時の公式報告フロー。レポート作成とユーザー指示の仰ぎ方ガイド。
---

# Trouble Reporter Skill

GEMINI.md の「不具合修正ポリシー」および「ファイル管理ポリシー（障害レポート）」に準拠し、不具合を適切に報告・記録するためのスキルです。
エージェントはバグやエラーに遭遇した際、**自己判断で修正せず**、必ずこのスキルを使用して状況を整理してください。

## 作業フロー

### 1. 状況の整理 (Triaging & Analysis)

1.  **情報の収集**:
    - エラーログ、スタックトレース、発生した環境（Colab/Local）、時刻を記録します。

2.  **根本原因分析 (Root Cause Analysis)**:
    - 表面的なエラーだけでなく、「なぜその状態になったか」を深掘りします。
    - コードロジック、依存関係、環境差異などを調査します。

3.  **水平展開の検討 (Horizontal Rollout)**:
    - **重要**: 同様の実装パターンやロジックが、プロジェクト内の他の箇所（他ファイル、他関数）に存在しないか調査します。
    - もし存在すれば、それらもまとめて修正対象として提案します。

### 2. レポートの作成 (Reporting)

1.  **PM MCPによるレポート生成**:
    - **`pm.report_incident`** ツールを使用してレポートを作成します。
    - **引数設定**:
        - `title`: "[HH:MM] 概要" (例: "14:30 Build failure in pm-server")
        - `details`:
            - **Impact**: 影響範囲 (Low/Medium/High/Critical)
            - **Horizontal Rollout**: 他箇所への展開要否
            - **Proposed Fix**: 修正案
        - `root_cause`: 根本原因分析の結果（「なぜ」を深掘りした内容）
        - `error_log`: エラーログの抜粋
    - *Note*: これにより `admin/trouble/` に自動的にファイルが生成されます。

2.  **ユーザーへの通知**:
    - `notify_user` またはチャット応答で、レポートの内容を要約して伝えます。
    - **以下の指示を仰いでください**:
        - "Use `Fix #N` to fix specific issue."
        - "Use `Fix ALL` to fix everything."

### 3. 修正実行 (Execution - Optional)

*ユーザーから `Fix ...` の指示があった場合のみ実行します。*

1.  **修正**:
    - 提案した修正案を実装します。
2.  **履歴**:
    - `history/YYYY-MM-DD.md` に「不具合No.X の対応」として記録します。
