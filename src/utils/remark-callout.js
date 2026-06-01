const VALID_TYPES = ["note", "tip", "important", "warning", "caution"];

const ICONS = {
  note: `<svg class="callout-icon" viewBox="0 0 16 16" width="16" height="16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 7.5V11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="4.75" r="0.75" fill="currentColor"/></svg>`,
  tip: `<svg class="callout-icon" viewBox="0 0 16 16" width="16" height="16" fill="none"><path d="M8 1.5a5.5 5.5 0 0 0-1.5 10.8v.95a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-.95A5.5 5.5 0 0 0 8 1.5Z" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 14v.5h1V14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  important: `<svg class="callout-icon" viewBox="0 0 16 16" width="16" height="16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="11.25" r="0.75" fill="currentColor"/></svg>`,
  warning: `<svg class="callout-icon" viewBox="0 0 16 16" width="16" height="16" fill="none"><path d="M6.89 2.61a1.5 1.5 0 0 1 2.22 0l4.28 4.28a1.5 1.5 0 0 1 0 2.22l-4.28 4.28a1.5 1.5 0 0 1-2.22 0L2.61 9.11a1.5 1.5 0 0 1 0-2.22Z" stroke="currentColor" stroke-width="1.4"/><path d="M8 5.5v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="10.75" r="0.75" fill="currentColor"/></svg>`,
  caution: `<svg class="callout-icon" viewBox="0 0 16 16" width="16" height="16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
};

const LABELS = {
  note: "Catatan",
  tip: "Tips",
  important: "Penting",
  warning: "Perhatian",
  caution: "Hati-hati",
};

export function remarkCallout() {
  return (tree) => {
    visit(tree, (node, index, parent) => {
      if (node.type !== "blockquote") return;
      if (!parent || index === undefined) return;
      if (!node.children?.length) return;

      const firstChild = node.children[0];
      if (firstChild.type !== "paragraph" || !firstChild.children?.length) return;

      const firstText = firstChild.children[0];
      if (firstText.type !== "text") return;

      const m = firstText.value.match(/^\[!(\w+)\]\s*/i);
      if (!m) return;

      const type = m[1].toLowerCase();
      if (!VALID_TYPES.includes(type)) return;

      // Remove the [!TYPE] marker from the text
      firstText.value = firstText.value.slice(m[0].length);

      // Clean up empty text/paragraph nodes
      if (!firstText.value) {
        firstChild.children.shift();
      }
      if (!firstChild.children.length) {
        node.children.shift();
      }

      // Inject title paragraph with icon at the front
      const titleHtml = {
        type: "html",
        value: `<p class="callout-title">${ICONS[type]}<span>${LABELS[type]}</span></p>`,
      };
      node.children.unshift(titleHtml);

      // Transform blockquote to a styled div
      node.data = node.data || {};
      node.data.hName = "div";
      node.data.hProperties = {
        className: ["callout", `callout-${type}`],
      };
    });
  };
}

/**
 * Walk a remark AST depth-first and call a callback for every node
 * with its index and parent reference.
 */
function visit(tree, callback, parent, index) {
  if (!tree || typeof tree !== "object") return;

  callback(tree, index, parent);

  if (tree.children && Array.isArray(tree.children)) {
    for (let i = 0; i < tree.children.length; i++) {
      visit(tree.children[i], callback, tree, i);
    }
  }
}
