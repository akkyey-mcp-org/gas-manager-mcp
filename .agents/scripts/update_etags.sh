#!/bin/bash
# Hierarchy of Reliability (Layer 1) 用のインデックスを生成
# -maxdepth 4 で主要ファイルをカバーし、隠しファイルやvenv等を除外
find . -maxdepth 4 -not -path '*/.*' -not -path './venv*' -not -path './node_modules*' -printf "%M %n %u %g %s %TY-%Tm-%Td %TT %p\n" > etags_snapshot.txt
echo "✅ etags_snapshot.txt generated."
