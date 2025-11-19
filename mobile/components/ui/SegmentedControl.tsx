import { Text, TouchableOpacity, View } from "react-native";
import { Palette } from "@/constants/palette";

type Option = {
    label: string;
    value: string;
    badge?: number;
};

type SegmentedControlProps = {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    theme?: "light" | "dark" | "brand" | "danger";
};

export function SegmentedControl({
    options,
    value,
    onChange,
    theme = "light",
}: SegmentedControlProps) {
    const isBrand = theme === "brand";
    const isDanger = theme === "danger";

    return (
        <View
            className={`flex-row rounded-full p-1 ${isBrand || isDanger ? "bg-slate-100" : "bg-gray-100"
                }`}
        >
            {options.map((option) => {
                const isActive = value === option.value;
                let activeBg = "bg-white ";
                let activeText = "text-gray-900";

                if (isActive) {
                    if (isBrand) {
                        activeBg = "bg-brand-teal ";
                        activeText = "text-white";
                    } else if (isDanger) {
                        activeBg = "bg-red-50 "; // Pale red background
                        activeText = "text-red-600";
                    }
                }

                return (
                    <TouchableOpacity
                        key={option.value}
                        onPress={() => onChange(option.value)}
                        className={`px-4 py-1.5 rounded-full flex-row items-center gap-1 ${isActive ? activeBg : ""
                            }`}
                    >
                        <Text
                            className={`text-xs font-semibold ${isActive ? activeText : "text-gray-500"
                                }`}
                        >
                            {option.label}
                        </Text>
                        {option.badge ? (
                            <View
                                className={`${isActive && isBrand ? "bg-white" : "bg-red-500"
                                    } rounded-full px-1.5 min-w-[16px] h-4 items-center justify-center`}
                            >
                                <Text
                                    className={`text-[10px] font-bold ${isActive && isBrand ? "text-brand-teal" : "text-white"
                                        }`}
                                >
                                    {option.badge}
                                </Text>
                            </View>
                        ) : null}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
