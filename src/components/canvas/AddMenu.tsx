"use client";

type MenuItem = {
  icon: string;
  label: string;
  action: () => void;
};

type Props = {
  menuItems: MenuItem[];
  onClose: () => void;
};

export default function AddMenu({ menuItems, onClose }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 92,
        right: 32,
        background: "rgba(15,15,15,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        padding: "8px",
        backdropFilter: "blur(20px)",
        minWidth: 200,
        zIndex: 1000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item) => (
        <button
          key={item.label}
          onClick={() => { item.action(); onClose(); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "transparent",
            color: "rgba(255,255,255,0.75)",
            fontSize: 13,
            cursor: "pointer",
            textAlign: "left",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
