/**
 * 簡化版的顏色主題 hook - 永遠返回 'light'
 */

export function useColorScheme() {
  return 'light' as const;
}

