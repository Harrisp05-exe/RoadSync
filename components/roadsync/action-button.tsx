import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

type ActionButtonProps = PressableProps & {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  variant?: "primary" | "secondary";
};

export function ActionButton({
  label,
  icon,
  variant = "primary",
  style,
  ...props
}: ActionButtonProps) {
  const isSecondary = variant === "secondary";

  return (
    <Pressable
      accessibilityRole="button"
      style={(state) => [
        styles.button,
        isSecondary ? styles.secondary : styles.primary,
        state.pressed ? styles.pressed : undefined,
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      <MaterialIcons
        name={icon}
        size={20}
        color={isSecondary ? "#0f172a" : "#ffffff"}
      />
      <Text
        style={[
          styles.label,
          isSecondary ? styles.secondaryLabel : styles.primaryLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
  },
  primary: {
    backgroundColor: "#102d63",
  },
  secondary: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe7ff",
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
  primaryLabel: {
    color: "#ffffff",
  },
  secondaryLabel: {
    color: "#102d63",
  },
});
