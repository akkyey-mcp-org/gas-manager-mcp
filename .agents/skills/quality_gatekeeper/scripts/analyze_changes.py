#!/usr/bin/env python3
"""
Quality Gatekeeper Analysis Script
==================================

Gitの変更差分とRadonによる品質メトリクスを収集し、
AIエージェントが判断するためのコンテキスト情報を生成するスクリプト。
履歴管理機能と閾値アラート機能を追加。

Usage:
    python analyze_changes.py [--staged] [--save] [--check] [--all]

Options:
    --staged : ステージングされた変更のみを対象とする
    --save   : 現在のメトリクスを履歴として保存する
    --check  : 履歴と比較して品質アラートを出す (diff時はデフォルト)
    --all    : 全ての追跡対象Pythonファイルを検査する (Auditモード)
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# --- Configuration ---
HISTORY_DIR = Path(".agent/metrics_history")
VENV_RADON = Path("venv/bin/radon")

# Alert Thresholds (from User)
THRESHOLD_MI_DROP = 15.0  # MIがこれ以上低下したら警告
THRESHOLD_MI_LOW = 65.0  # MIがこれ未満なら警告
THRESHOLD_CC_PER_FUNC = 15  # 関数CCがこれを超えたら警告


def run_command(command, cwd=None):
    """Run shell command and return stdout."""
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        # radon sometimes returns non-zero for warnings, but we want output if possible
        if e.stdout:
            return e.stdout.strip()
        print(f"Error executing command: {command}", file=sys.stderr)
        print(f"Stderr: {e.stderr}", file=sys.stderr)
        return ""


def get_changed_files(staged=False):
    """Get list of changed Python files."""
    if staged:
        cmd = "git diff --cached --name-only --diff-filter=ACMR"
    else:
        cmd = "git diff --name-only --diff-filter=ACMR"

    output = run_command(cmd)
    files = [f for f in output.split("\n") if f.endswith(".py") and Path(f).exists()]
    return files


def get_git_diff(files, staged=False):
    """Get git diff content."""
    if not files:
        return ""

    file_args = " ".join(files)
    if staged:
        cmd = f"git diff --cached {file_args}"
    else:
        cmd = f"git diff {file_args}"

    return run_command(cmd)


def get_radon_path():
    """Resolve radon executable path."""
    if VENV_RADON.exists():
        return str(VENV_RADON)
    elif shutil.which("radon"):
        return "radon"
    else:
        print(
            "Error: 'radon' command not found. Please install via 'pip install radon'.",
            file=sys.stderr,
        )
        sys.exit(1)


def measure_metrics(files):
    """Measure CC and MI for given files using Radon (JSON output)."""
    if not files:
        return {}, {}

    radon_cmd = get_radon_path()

    # Check if list is too long
    chunk_size = 50
    all_cc_data = {}
    all_mi_data = {}

    for i in range(0, len(files), chunk_size):
        chunk_files = files[i : i + chunk_size]
        file_args = " ".join(chunk_files)

        # Measure CC
        cc_json_str = run_command(f"{radon_cmd} cc -a -s --json {file_args}")
        try:
            chunk_cc = json.loads(cc_json_str) if cc_json_str else {}
            all_cc_data.update(chunk_cc)
        except json.JSONDecodeError:
            pass

        # Measure MI
        mi_json_str = run_command(f"{radon_cmd} mi -s --json {file_args}")
        try:
            chunk_mi = json.loads(mi_json_str) if mi_json_str else {}
            all_mi_data.update(chunk_mi)
        except json.JSONDecodeError:
            pass

    return all_cc_data, all_mi_data


def calculate_avg_cc(cc_blocks):
    """Calculate average CC from 'radon cc' JSON blocks."""
    if not cc_blocks:
        return 0.0

    total_cc = sum(block.get("complexity", 0) for block in cc_blocks)
    return total_cc / len(cc_blocks)


def save_history(cc_data, mi_data):
    """Save current metrics to history."""
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)

    # Identify commit
    commit_hash = run_command("git rev-parse --short HEAD")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    filename = f"metrics_{timestamp}_{commit_hash}.json"
    filepath = HISTORY_DIR / filename

    history_data = {
        "timestamp": timestamp,
        "commit": commit_hash,
        "metrics": {"cc": cc_data, "mi": mi_data},
    }

    with open(filepath, "w") as f:
        json.dump(history_data, f, indent=2)

    print(f"[System] Metrics history saved to: {filepath}")


def load_latest_history():
    """Load the most recent metrics history file."""
    if not HISTORY_DIR.exists():
        return None

    files = sorted(
        HISTORY_DIR.glob("metrics_*.json"), key=os.path.getmtime, reverse=True
    )
    if not files:
        return None

    try:
        with open(files[0], "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Failed to load history file {files[0]}: {e}", file=sys.stderr)
        return None


def analyze_changes(changed_files, current_cc, current_mi, latest_history):
    """Analyze changes and generate alerts."""
    alerts = []

    prev_metrics = latest_history.get("metrics", {}) if latest_history else {}
    prev_mi = prev_metrics.get("mi", {})

    for fname in changed_files:
        # Check MI
        cur_file_mi = current_mi.get(fname, {}).get("mi", None)
        prev_file_mi = prev_mi.get(fname, {}).get("mi", None)

        if cur_file_mi is not None:
            # 1. MI Low check
            if cur_file_mi < THRESHOLD_MI_LOW:
                alerts.append(
                    f"[WARNING] {fname}: MI is LOW ({cur_file_mi:.2f} < {THRESHOLD_MI_LOW}). Refactoring recommended."
                )

            # 2. MI Drop check
            if prev_file_mi is not None:
                diff = cur_file_mi - prev_file_mi
                if diff <= -THRESHOLD_MI_DROP:
                    alerts.append(
                        f"[CRITICAL] {fname}: MI DROPPED significantly ({prev_file_mi:.2f} -> {cur_file_mi:.2f}, Diff: {diff:.2f}). IMMEDIATE REFACTORING REQUIRED."
                    )

        # Check CC (Function level)
        file_cc_list = current_cc.get(fname, [])
        for func in file_cc_list:
            func_name = func.get("name", "unknown")
            func_cc = func.get("complexity", 0)

            # 3. High CC check
            if func_cc > THRESHOLD_CC_PER_FUNC:
                alerts.append(
                    f"[WARNING] {fname}::{func_name}: CC is HIGH ({func_cc} > {THRESHOLD_CC_PER_FUNC}). Split this function."
                )

    return alerts


# --- Refactored Helper Functions ---


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Analyze code changes for quality gatekeeper."
    )
    parser.add_argument(
        "--staged", action="store_true", help="Analyze staged changes only"
    )
    parser.add_argument(
        "--save", action="store_true", help="Save current metrics as history baseline"
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Compare against history and check thresholds (default for staged)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Analyze ALL tracked Python files (Audit mode)",
    )
    args = parser.parse_args()

    # Default logic: if --staged is used, imply --check
    if args.staged and not args.save:
        args.check = True
    # If --all is used, imply --check, unless --save
    if args.all and not args.save:
        args.check = True

    return args


def determine_target_files(args):
    """Determine which files to analyze based on arguments."""
    target_files = []
    if args.save or args.all:
        try:
            all_py_files = run_command("git ls-files '*.py'").split("\n")
            target_files = [f for f in all_py_files if f]
        except Exception:
            # Fallback if git command fails (though run_command handles errors usually)
            target_files = []
    else:
        target_files = get_changed_files(args.staged)

    return target_files


def generate_report_lines(args, target_files, alerts, cc_data, mi_data, diff_content):
    """Generate the report content as a list of lines."""
    output_lines = []
    output_lines.append("--- [Quality Gatekeeper Analysis] ---")
    if args.all:
        output_lines.append("Mode: FULL AUDIT (Checking all files)")

    target_count = len(target_files)
    output_lines.append(f"Target Files: {target_count} files.")

    if alerts:
        output_lines.append("\n## 🚨 QUALITY ALERTS (Action Required)")
        if len(alerts) > 50:
            output_lines.append(f"(Showing first 50 of {len(alerts)} alerts)")
            # Truncate for display but maybe keep full for file?
            # For now follow expected behavior
            display_alerts = alerts[:50]
        else:
            display_alerts = alerts

        for alert in display_alerts:
            output_lines.append(f"- {alert}")

        output_lines.append("\n### 🤖 エージェントへの指示")
        output_lines.append("判定: **[REFACTORING REQUIRED]**")
        output_lines.append(
            "上記のファイルが品質基準を下回っています。優先順位をつけてリファクタリングを計画してください。"
        )
    else:
        output_lines.append("\n## ✅ Quality Check Passed")
        output_lines.append(
            "No critical quality issues detected based on current thresholds."
        )

    output_lines.append("\n## Current Metrics (Changed/Target Files)")

    # Sort files by MI ascending (worst first)
    metrics_list = []
    for fname in target_files:
        f_mi = mi_data.get(fname, {}).get("mi", 0)
        f_cc_list = cc_data.get(fname, [])
        f_avg_cc = calculate_avg_cc(f_cc_list)
        metrics_list.append((fname, f_mi, f_avg_cc))

    metrics_list.sort(key=lambda x: x[1])

    # Display rule
    if target_count > 50:
        output_lines.append(
            f"(Total {target_count} files. Showing top 30 worst MI files)"
        )
        display_list = metrics_list[:30]
    else:
        display_list = metrics_list

    output_lines.append("| File | MI (Avg) | CC (Avg) |")
    output_lines.append("| :--- | :--- | :--- |")
    for fname, val_mi, val_cc in display_list:
        output_lines.append(f"| {fname} | {val_mi:.2f} | {val_cc:.2f} |")

    if diff_content:
        output_lines.append("\n## Git Diff Summary")
        if len(diff_content) > 5000:
            output_lines.append(diff_content[:5000] + "\n... (truncated)")
        else:
            output_lines.append(diff_content)

    return output_lines


def save_report(output_lines, args):
    """Save the generated report to a file."""
    output_str = "\n".join(output_lines)

    report_dir = Path("reports/quality_gate")
    report_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    suffix = "_audit" if args.all else ""
    report_file = report_dir / f"qc_{timestamp}{suffix}.md"

    with open(report_file, "w") as f:
        f.write(output_str)

    print(output_str)
    print(f"\n[System] Report saved to: {report_file}")


def main():
    args = parse_arguments()
    target_files = determine_target_files(args)

    if not target_files:
        if args.save:
            print("No Python files found to save.")
        else:
            print("No Python files changed.")
        return

    # Measure current metrics
    print(f"Measuring metrics for {len(target_files)} files...")
    cc_data, mi_data = measure_metrics(target_files)

    if args.save:
        save_history(cc_data, mi_data)
        return

    # Logic for Analysis/Check
    diff_content = ""
    if not args.all:
        diff_content = get_git_diff(target_files, args.staged)

    latest_history = load_latest_history()
    alerts = analyze_changes(target_files, cc_data, mi_data, latest_history)

    report_lines = generate_report_lines(
        args, target_files, alerts, cc_data, mi_data, diff_content
    )
    save_report(report_lines, args)


if __name__ == "__main__":
    main()
