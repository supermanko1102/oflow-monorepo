#!/bin/bash
# 移除所有 dark: 樣式的腳本

# 處理所有 .tsx 文件
find app components -name "*.tsx" -type f | while read file; do
  # 使用 sed 移除 dark: 樣式
  # 匹配 dark:xxx-xxx 或 dark:xxx 的模式，包括前面的空格
  sed -i '' 's/ dark:[a-zA-Z0-9\-]*//g' "$file"
done

echo "已完成移除所有 dark: 樣式"

