import { UI } from "@/styles/ui";

interface Props {
  children: React.ReactNode;
  size?: "xs" | "sm" | "md";
}

export function UILabel({ children, size = "xs" }: Props) {
  const fontSize      = size === "xs" ? 8 : size === "sm" ? 10 : 12;
  const letterSpacing = size === "xs" ? 2 : size === "sm" ? 1.5 : 1;

  return (
    <span
      style={{
        fontFamily:    UI.font,
        fontSize,
        letterSpacing,
        color:         UI.colors.textFaint,
        textTransform: "uppercase",
        userSelect:    "none",
        lineHeight:    1,
      }}
    >
      {children}
    </span>
  );
}
