import { useEffect, useRef } from "react";

// Lightweight in-house keyboard shortcut registry. A single document-level
// listener dispatches to every registered hotkey, so ⌘K, ⌘B, and the report
// shortcuts share one code path (input/overlay filtering, Mod handling).

type HotkeyOptions = {
  // Registration is skipped entirely while false.
  enabled?: boolean;
  // Fire even while focus is in an input/textarea/select/contenteditable.
  allowInInput?: boolean;
  // Fire even while a dialog/menu/listbox overlay is open.
  allowInOverlay?: boolean;
  // Call event.preventDefault() before the handler (default true).
  preventDefault?: boolean;
  // Human-readable label + group for a future shortcuts help overlay.
  description?: string;
  group?: string;
};

type ParsedCombo = { mod: boolean; shift: boolean; alt: boolean; key: string };

type Registration = {
  combo: string;
  parsed: ParsedCombo;
  handler: (event: KeyboardEvent) => void;
  allowInInput: boolean;
  allowInOverlay: boolean;
  preventDefault: boolean;
  description?: string;
  group?: string;
};

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

// Radix overlays: Dialog (dialog), AlertDialog (alertdialog),
// DropdownMenu/ContextMenu (menu), Select/Combobox (listbox).
const OVERLAY_SELECTOR = '[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"]';

function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

function normalizeKey(key: string) {
  return key.length === 1 ? key.toLowerCase() : key;
}

function parseCombo(combo: string): ParsedCombo {
  const parts = combo.split("+").map((part) => part.trim());
  const key = normalizeKey(parts[parts.length - 1] ?? "");
  const mods = parts.slice(0, -1).map((part) => part.toLowerCase());
  return {
    mod: mods.includes("mod"),
    shift: mods.includes("shift"),
    alt: mods.includes("alt"),
    key,
  };
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return EDITABLE_TAGS.has(target.tagName) || target.isContentEditable;
}

function isOverlayOpen() {
  return document.querySelector(OVERLAY_SELECTOR) !== null;
}

function eventMatches(event: KeyboardEvent, parsed: ParsedCombo) {
  const primaryMod = isMac() ? event.metaKey : event.ctrlKey;
  const secondaryMod = isMac() ? event.ctrlKey : event.metaKey;
  if (parsed.mod) {
    if (!primaryMod) {
      return false;
    }
  } else if (primaryMod || secondaryMod) {
    return false;
  }
  if (parsed.shift !== event.shiftKey) {
    return false;
  }
  if (parsed.alt !== event.altKey) {
    return false;
  }
  return normalizeKey(event.key) === parsed.key;
}

const registrations = new Set<Registration>();
let listening = false;

function handleKeyDown(event: KeyboardEvent) {
  const typing = isTypingTarget(event.target);
  const overlay = isOverlayOpen();
  for (const registration of registrations) {
    if (typing && !registration.allowInInput) {
      continue;
    }
    if (overlay && !registration.allowInOverlay) {
      continue;
    }
    if (!eventMatches(event, registration.parsed)) {
      continue;
    }
    if (registration.preventDefault) {
      event.preventDefault();
    }
    registration.handler(event);
  }
}

function registerHotkey(registration: Registration) {
  registrations.add(registration);
  if (!listening && typeof document !== "undefined") {
    document.addEventListener("keydown", handleKeyDown);
    listening = true;
  }
  return () => {
    registrations.delete(registration);
    if (listening && registrations.size === 0) {
      document.removeEventListener("keydown", handleKeyDown);
      listening = false;
    }
  };
}

export function useHotkey(
  combo: string,
  handler: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {},
) {
  const {
    enabled = true,
    allowInInput = false,
    allowInOverlay = false,
    preventDefault = true,
    description,
    group,
  } = options;

  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    return registerHotkey({
      combo,
      parsed: parseCombo(combo),
      handler: (event) => handlerRef.current(event),
      allowInInput,
      allowInOverlay,
      preventDefault,
      description,
      group,
    });
  }, [combo, enabled, allowInInput, allowInOverlay, preventDefault, description, group]);
}
