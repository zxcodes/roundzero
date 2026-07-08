import { useHotkey } from "@/shared/hotkeys";

export function useCommandPaletteShortcut(onToggle: () => void) {
  useHotkey("Mod+K", onToggle, {
    allowInInput: true,
    allowInOverlay: true,
    description: "Open command palette",
    group: "Global",
  });
}
