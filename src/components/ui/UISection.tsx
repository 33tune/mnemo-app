import { UI } from "@/styles/ui";
import { UILabel } from "./UILabel";

interface Props {
  title:        string;
  children:     React.ReactNode;
  /** Element rendered right-aligned in the header row (e.g. a "clear" button) */
  action?:      React.ReactNode;
  /** Render a subtle horizontal rule above this section */
  dividerAbove?: boolean;
}

export function UISection({ title, children, action, dividerAbove = false }: Props) {
  return (
    <div>
      {dividerAbove && (
        <div
          style={{
            height:     1,
            background: UI.colors.border,
            opacity:    0.65,
            margin:     "22px 0",
          }}
        />
      )}

      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          marginBottom:   14,
        }}
      >
        <UILabel>{title}</UILabel>
        {action != null && <div>{action}</div>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {children}
      </div>
    </div>
  );
}
