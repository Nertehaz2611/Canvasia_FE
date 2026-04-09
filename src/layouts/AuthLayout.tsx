import { useEffect, useState, type ReactNode } from "react";
import "./AuthLayout.css";

type AuthLayoutProps = {
  children: ReactNode;
};

const wallpapers = Object.entries(
  import.meta.glob("../assets/wallpapers/*.webp", {
    eager: true,
    import: "default",
  }),
)
  .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
  .map(([, module]) => module as string);
const CHANGE_INTERVAL_MS = 8_000;
const FADE_DURATION_MS = 2_000;

function AuthLayout({ children }: Readonly<AuthLayoutProps>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (wallpapers.length < 2) {
      return;
    }

    const intervalId = globalThis.setInterval(() => {
      setIncomingIndex((activeIndex + 1) % wallpapers.length);
    }, CHANGE_INTERVAL_MS);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [activeIndex]);

  useEffect(() => {
    if (incomingIndex === null) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setActiveIndex(incomingIndex);
      setIncomingIndex(null);
    }, FADE_DURATION_MS);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [incomingIndex]);

  return (
    <main className="auth-layout">
      <div
        className="auth-layout__background"
        style={{ backgroundImage: `url(${wallpapers[activeIndex]})` }}
        aria-hidden="true"
      />
      {incomingIndex !== null && (
        <div
          className="auth-layout__background auth-layout__background--incoming"
          style={{
            backgroundImage: `url(${wallpapers[incomingIndex]})`,
            animationDuration: `${FADE_DURATION_MS}ms`,
          }}
          aria-hidden="true"
        />
      )}
      <div className="auth-layout__content">{children}</div>
    </main>
  );
}

export default AuthLayout;
