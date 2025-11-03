/**
 * ErrorBoundary 組件
 * 捕獲並顯示組件錯誤
 */

import { Button } from "@/components/native/Button";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { Component, ReactNode } from "react";
import { Text, View } from "react-native";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[ErrorBoundary] 捕獲到錯誤:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 bg-white items-center justify-center px-6">
          <View className="bg-red-50 w-20 h-20 rounded-full items-center justify-center mb-4">
            <MaterialCommunityIcons
              name="alert-circle"
              size={48}
              color="#DC2626"
            />
          </View>
          <Text className="text-2xl font-black text-gray-900 mb-2 text-center">
            發生錯誤
          </Text>
          <Text className="text-base text-gray-600 text-center mb-6">
            {this.state.error?.message || "抱歉，發生了未預期的錯誤"}
          </Text>
          <Button onPress={this.handleReset} variant="primary">
            重試
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}

