/**
 * React Query DevTools Wrapper
 * 
 * 注意：@tanstack/react-query-devtools 主要為 web 設計
 * 在 React Native 中功能有限，建議使用：
 * - Flipper plugin: flipper-plugin-react-query-native-devtools
 * - Reactotron plugin: reactotron-react-query
 * 
 * 目前這個 component 只在開發環境載入，生產環境不會打包進去
 */

import React from 'react';

export function QueryDevTools() {
  // 只在開發環境且為 web 平台時顯示
  if (__DEV__ && typeof window !== 'undefined' && 'document' in window) {
    // 動態 import，避免在 React Native 中載入
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ReactQueryDevtools } = require('@tanstack/react-query-devtools');
      return <ReactQueryDevtools initialIsOpen={false} />;
    } catch (e) {
      console.log('[QueryDevTools] DevTools not available in this environment');
      return null;
    }
  }
  
  return null;
}

