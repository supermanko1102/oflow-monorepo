/**
 * StepIndicator 組件
 * 顯示多步驟流程的指示器，標記當前步驟和已完成步驟
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface Step {
  id: number;
  title: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number; // 當前步驟（1-based）
  completedSteps?: number[]; // 已完成的步驟 ID 列表
  orientation?: "horizontal" | "vertical";
}

export function StepIndicator({
  steps,
  currentStep,
  completedSteps = [],
  orientation = "horizontal",
}: StepIndicatorProps) {
  if (orientation === "vertical") {
    return (
      <View className="space-y-4">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const isPast = step.id < currentStep;

          return (
            <View key={step.id} className="flex-row items-start">
              {/* 步驟圖標 */}
              <View className="items-center mr-3">
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    isCompleted
                      ? "bg-green-500"
                      : isCurrent
                      ? "bg-line-green"
                      : isPast
                      ? "bg-gray-400"
                      : "bg-gray-200"
                  }`}
                >
                  {isCompleted ? (
                    <MaterialCommunityIcons name="check" size={20} color="white" />
                  ) : (
                    <Text
                      className={`text-sm font-bold ${
                        isCurrent || isPast ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {step.id}
                    </Text>
                  )}
                </View>
                {/* 連接線 */}
                {index < steps.length - 1 && (
                  <View
                    className={`w-0.5 h-8 mt-1 ${
                      isPast || isCompleted ? "bg-gray-400" : "bg-gray-200"
                    }`}
                  />
                )}
              </View>

              {/* 步驟內容 */}
              <View className="flex-1 pb-4">
                <Text
                  className={`text-base font-semibold ${
                    isCurrent ? "text-gray-900" : "text-gray-600"
                  }`}
                >
                  {step.title}
                </Text>
                {step.description && (
                  <Text className="text-sm text-gray-500 mt-1">
                    {step.description}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  // Horizontal orientation (簡化版，用於頂部顯示)
  return (
    <View className="flex-row items-center justify-between w-full">
      {steps.map((step, index) => {
        const isCurrent = step.id === currentStep;
        const isCompleted = completedSteps.includes(step.id);
        const isPast = step.id < currentStep;

        return (
          <React.Fragment key={step.id}>
            {/* 步驟點 */}
            <View className="items-center">
              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  isCompleted
                    ? "bg-green-500"
                    : isCurrent
                    ? "bg-line-green"
                    : isPast
                    ? "bg-gray-400"
                    : "bg-gray-200"
                }`}
              >
                {isCompleted ? (
                  <MaterialCommunityIcons name="check" size={16} color="white" />
                ) : (
                  <Text
                    className={`text-xs font-bold ${
                      isCurrent || isPast ? "text-white" : "text-gray-500"
                    }`}
                  >
                    {step.id}
                  </Text>
                )}
              </View>
              <Text
                className={`text-xs mt-1 ${
                  isCurrent ? "text-gray-900 font-semibold" : "text-gray-500"
                }`}
              >
                {step.title}
              </Text>
            </View>

            {/* 連接線 */}
            {index < steps.length - 1 && (
              <View
                className={`flex-1 h-0.5 mx-2 ${
                  isPast || isCompleted ? "bg-gray-400" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

