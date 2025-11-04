/**
 * 自訂 SVG Icon 系統
 * 使用 react-native-svg 建立的輕量級 icons
 * 參考 Heroicons 風格
 */

import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

/**
 * 訂單/包裹 Icon
 */
export function PackageIcon({ size = 24, color = "#3B82F6" }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      onLayout={undefined}
    >
      <Path
        d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 現金/營收 Icon
 */
export function CashIcon({ size = 24, color = "#10B981" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={2}
        y={6}
        width={20}
        height={12}
        rx={2}
        stroke={color}
        strokeWidth={2}
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
      <Path
        d="M18 12C18 12 18 12 18 12M6 12C6 12 6 12 6 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * 時鐘/待處理 Icon
 */
export function ClockIcon({ size = 24, color = "#F59E0B" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
      <Path
        d="M12 7V12L15 15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * OFlow Logo Icon
 * 簡潔的文件/訂單圖示
 */
export function LogoIcon({ size = 64, color = "#00B900" }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      onLayout={undefined}
    >
      {/* 外框 */}
      <Rect
        x={12}
        y={8}
        width={40}
        height={48}
        rx={4}
        stroke={color}
        strokeWidth={3}
      />
      {/* 文件折角 */}
      <Path
        d="M36 8V16C36 17.1046 36.8954 18 38 18H52"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 內容線條 */}
      <Path
        d="M20 28H44M20 36H44M20 44H36"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * 勾選圓圈 Icon（營業中）
 */
export function CheckCircleIcon({ size = 32, color = "#10B981" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill={color} opacity={0.15} />
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
      <Path
        d="M8 12L11 15L16 9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 關閉圓圈 Icon（休息）
 */
export function CloseCircleIcon({ size = 32, color = "#9CA3AF" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill={color} opacity={0.15} />
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
      <Path
        d="M15 9L9 15M9 9L15 15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
