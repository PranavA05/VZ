import { useCallback, useEffect, useState } from "react";

function isEditableTarget(target) {
  const tagName = target?.tagName;
  return (
    target?.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}

export function useCinemaMode(isAvailable) {
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const isActive = isAvailable && isCinemaMode;

  const enterCinemaMode = useCallback(async () => {
    if (!isAvailable) {
      return;
    }

    setIsCinemaMode(true);

    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // The clean display layout still works when fullscreen is blocked.
      }
    }
  }, [isAvailable]);

  const exitCinemaMode = useCallback(async () => {
    setIsCinemaMode(false);

    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // The layout can still exit even if the browser keeps fullscreen active.
      }
    }
  }, []);

  const toggleCinemaMode = useCallback(() => {
    if (isActive) {
      void exitCinemaMode();
    } else {
      void enterCinemaMode();
    }
  }, [enterCinemaMode, exitCinemaMode, isActive]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && isActive) {
        void exitCinemaMode();
        return;
      }

      if (
        event.key.toLowerCase() !== "f" ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      toggleCinemaMode();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exitCinemaMode, isActive, toggleCinemaMode]);

  useEffect(() => {
    if (!isAvailable && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, [isAvailable]);

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        setIsCinemaMode(false);
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return {
    isCinemaMode: isActive,
    enterCinemaMode,
    exitCinemaMode,
  };
}
