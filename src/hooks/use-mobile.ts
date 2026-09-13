import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function subscribe(onChange: () => void) {
  const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

  media.addEventListener("change", onChange);

  return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
