import { useEffect, useRef, useState, CSSProperties } from "react";

type Variant = "up" | "down" | "left" | "right" | "scale" | "rotate" | "blur" | "clip";

interface Props {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  style?: CSSProperties;
  variant?: Variant;
  duration?: number;
}

const getInitial = (variant: Variant, y: number): CSSProperties => {
  switch (variant) {
    case "down":
      return { transform: `translateY(-${y}px)`, opacity: 0 };
    case "left":
      return { transform: `translateX(-${y}px)`, opacity: 0 };
    case "right":
      return { transform: `translateX(${y}px)`, opacity: 0 };
    case "scale":
      return { transform: "scale(0.85)", opacity: 0 };
    case "rotate":
      return { transform: `translateY(${y}px) rotate(-4deg)`, opacity: 0 };
    case "blur":
      return { transform: `translateY(${y}px)`, opacity: 0, filter: "blur(12px)" };
    case "clip":
      return { clipPath: "inset(0 100% 0 0)", opacity: 0 };
    case "up":
    default:
      return { transform: `translateY(${y}px)`, opacity: 0 };
  }
};

const getFinal = (variant: Variant): CSSProperties => {
  if (variant === "clip") return { clipPath: "inset(0 0 0 0)", opacity: 1 };
  if (variant === "blur") return { transform: "none", opacity: 1, filter: "blur(0)" };
  return { transform: "none", opacity: 1, filter: "blur(0)" };
};

const ScrollReveal = ({
  children,
  className = "",
  delay = 0,
  y = 60,
  once = true,
  style,
  variant = "up",
  duration = 0.9,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) obs.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);

  const dynamic = visible ? getFinal(variant) : getInitial(variant, y);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        ...dynamic,
        transition: `transform ${duration}s cubic-bezier(0.16,1,0.3,1) ${delay}s, opacity ${duration}s ease ${delay}s, filter ${duration}s ease ${delay}s, clip-path ${duration}s cubic-bezier(0.76,0,0.24,1) ${delay}s`,
        willChange: "transform, opacity, filter, clip-path",
      }}
    >
      {children}
    </div>
  );
};

export default ScrollReveal;
