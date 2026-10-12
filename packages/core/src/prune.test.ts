import { describe, expect, it } from "vitest";
import { markModificationsInTree } from "./markModificationsInTree.js";
import { prune } from "./prune.js";
import type { Modification, PageNode } from "./schemas.js";
import { targetFor } from "./target.js";
import { findNodePath, nodeText } from "./tree.js";

const banner: PageNode = {
  id: "aside:1",
  kind: "aside",
  tag: "aside",
  children: [
    {
      id: "aside:1>paragraph:1",
      kind: "paragraph",
      tag: "p",
      text: "We use cookies to improve your experience.",
    },
    {
      id: "aside:1>button:1",
      kind: "button",
      tag: "button",
      text: "Accept all",
    },
  ],
};

const figure: PageNode = {
  id: "main:1>figure:1",
  kind: "figure",
  tag: "figure",
  children: [
    {
      id: "main:1>figure:1>image:1",
      kind: "image",
      tag: "img",
      attrs: { src: "https://x.com/growth.png", alt: "Customer growth" },
    },
    {
      id: "main:1>figure:1>paragraph:1",
      kind: "paragraph",
      tag: "p",
      children: [
        {
          id: "main:1>figure:1>paragraph:1>text:1",
          kind: "text",
          tag: "#text",
          text: "Source: ",
        },
        {
          id: "main:1>figure:1>paragraph:1>link:1",
          kind: "link",
          tag: "a",
          text: "our report",
          attrs: { href: "https://x.com/report" },
        },
      ],
    },
  ],
};

const pricing: PageNode = {
  id: "main:1>paragraph:1",
  kind: "paragraph",
  tag: "p",
  text: "Plans start at $9.",
};
const main: PageNode = {
  id: "main:1",
  kind: "main",
  tag: "main",
  children: [figure, pricing],
};
const root: PageNode = {
  id: "",
  kind: "page",
  tag: "body",
  children: [banner, main],
};

function hide(id: string, selector: string): Modification {
  const element = findNodePath(root, selector)?.at(-1);
  if (!element) throw new Error(`No node ${selector} in the test page`);
  return { id, type: "hide", target: targetFor(element) };
}

describe("prune", () => {
  it("removes a hidden element with its text, links, images and nested elements", () => {
    const { tree: markedPage } = markModificationsInTree(root, [
      hide("m1", "aside:1"),
      hide("m2", "main:1>figure:1"),
    ]);

    const agentTree = prune(markedPage);

    expect(agentTree.children?.map((child) => child.id)).toEqual(["main:1"]);
    expect(agentTree.children?.[0]?.children?.map((child) => child.id)).toEqual(
      ["main:1>paragraph:1"],
    );
    expect(JSON.stringify(agentTree)).not.toMatch(
      /cookies|Accept all|growth\.png|our report|x\.com\/report/,
    );
  });

  it("keeps everything else, sharing the nodes off the removed path", () => {
    const { tree: markedPage } = markModificationsInTree(root, [
      hide("m1", "aside:1"),
    ]);

    const agentTree = prune(markedPage);

    expect(agentTree.children?.[0]).toBe(main);
    expect(nodeText(agentTree)).toBe(nodeText(main));
  });

  it("never changes its input", () => {
    const { tree: markedPage } = markModificationsInTree(root, [
      hide("m1", "main:1>figure:1>image:1"),
    ]);
    const markedPageBefore = structuredClone(markedPage);

    prune(markedPage);

    expect(markedPage).toEqual(markedPageBefore);
  });

  it("keeps a container left empty", () => {
    const { tree: markedPage } = markModificationsInTree(root, [
      hide("m1", "aside:1>paragraph:1"),
      hide("m2", "aside:1>button:1"),
    ]);

    expect(prune(markedPage).children?.[0]).toEqual({
      ...banner,
      children: [],
    });
  });

  it("returns the page itself when nothing is hidden", () => {
    expect(prune(markModificationsInTree(root, []).tree)).toBe(root);
  });
});
