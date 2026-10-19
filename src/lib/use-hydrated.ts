"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

// Controlled forms must not accept input before React attaches their handlers.
export function useHydrated() {
  return useSyncExternalStore(subscribe, clientReady, serverReady);
}
