"use client";

import { BulletedListRules, isOrderedList, OrderedListRules } from "@platejs/list";
import { ListPlugin } from "@platejs/list/react";
import { KEYS } from "platejs";

import { IndentKit } from "@/components/editor/plugins/indent-kit";
import { BlockList } from "@/components/ui/block-list";

export const ListKit = [
  ...IndentKit,
  ListPlugin.configure({
    inputRules: [
      BulletedListRules.markdown({ variant: "-" }),
      BulletedListRules.markdown({ variant: "*" }),
      OrderedListRules.markdown({ variant: "." }),
      OrderedListRules.markdown({ variant: ")" }),
    ],
    inject: {
      nodeProps: {
        nodeKey: KEYS.listType,
        query: ({ nodeProps }) => {
          const element = nodeProps.element;

          return !!element?.listStyleType && !isOrderedList(element);
        },
        transformProps: ({ props }) => ({
          ...props,
          role: "listitem",
          style: Object.assign({}, props.style, { display: "list-item" }),
        }),
      },
      targetPlugins: [
        ...KEYS.heading,
        KEYS.p,
        KEYS.blockquote,
        KEYS.codeBlock,
        KEYS.toggle,
        KEYS.img,
      ],
    },
    render: {
      belowNodes: BlockList,
    },
  }),
];
