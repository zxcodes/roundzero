"use client";

import { BoldRules, CodeRules, ItalicRules, StrikethroughRules } from "@platejs/basic-nodes";
import {
  BoldPlugin,
  CodePlugin,
  ItalicPlugin,
  StrikethroughPlugin,
} from "@platejs/basic-nodes/react";

import { CodeLeaf } from "@/components/ui/code-node";

export const BasicMarksKit = [
  BoldPlugin.configure({
    inputRules: [BoldRules.markdown({ variant: "*" }), BoldRules.markdown({ variant: "_" })],
  }),
  ItalicPlugin.configure({
    inputRules: [ItalicRules.markdown({ variant: "*" }), ItalicRules.markdown({ variant: "_" })],
  }),
  CodePlugin.configure({
    inputRules: [CodeRules.markdown()],
    node: { component: CodeLeaf },
    shortcuts: { toggle: { keys: "mod+e" } },
  }),
  StrikethroughPlugin.configure({
    inputRules: [StrikethroughRules.markdown()],
    shortcuts: { toggle: { keys: "mod+shift+x" } },
  }),
];
