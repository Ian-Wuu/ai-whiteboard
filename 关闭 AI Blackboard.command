#!/bin/zsh
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
cd -- "${0:A:h}" || exit 1
node scripts/ai-blackboard.mjs stop
read -k 1 "?按任意键关闭这个窗口…"
