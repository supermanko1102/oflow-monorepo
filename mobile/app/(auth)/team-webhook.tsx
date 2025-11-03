import { StepInput } from "@/components/line-setup/StepInput";
import { StepIntroduction } from "@/components/line-setup/StepIntroduction";
import { StepPrepare } from "@/components/line-setup/StepPrepare";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAuthStore } from "@/stores/useAuthStore";
import { type LineSettingsFormData } from "@/types/team";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

const TOTAL_STEPS = 3;

export default function TeamLineSetupScreen() {
  const router = useRouter();

  // Auth Store
  const currentTeamId = useAuthStore((state) => state.currentTeamId);

  // Step management
  const [currentStep, setCurrentStep] = useState(1);

  // React Hook Form
  const form = useForm<LineSettingsFormData>({
    defaultValues: {
      channelId: "",
      channelSecret: "",
      accessToken: "",
      channelName: "",
    },
  });

  // 步驟導航
  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 完成設定，進入主頁
  const handleComplete = () => {
    router.replace("/(main)/(tabs)");
  };

  // 渲染當前步驟
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepIntroduction onNext={handleNext} />;

      case 2:
        return <StepPrepare onNext={handleNext} onBack={handleBack} />;

      case 3:
        return (
          <StepInput
            form={form}
            onComplete={handleComplete}
            onBack={handleBack}
            teamId={currentTeamId!}
          />
        );

      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white"
      >
        <View className="flex-1">
          {/* Header */}
          <View className="px-6 pt-12 pb-4 bg-white border-b border-gray-200">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <MaterialCommunityIcons
                  name="message-settings"
                  size={32}
                  color="#00B900"
                />
                <Text className="text-2xl font-black text-gray-900 ml-3">
                  設定 LINE
                </Text>
              </View>
              {currentStep > 1 && (
                <Pressable
                  onPress={handleBack}
                  className="bg-gray-100 w-10 h-10 rounded-full items-center justify-center"
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={24}
                    color="#374151"
                  />
                </Pressable>
              )}
            </View>

            {/* Progress Bar */}
            <ProgressBar current={currentStep} total={TOTAL_STEPS} />
          </View>

          {/* Content */}
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-6 py-6"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderStep()}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </ErrorBoundary>
  );
}
