const VALID_TYPES = ["note", "tip", "important", "warning", "caution"];

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

      const m = firstText.value.match(/^\[\!(\w+)\]\s*/i);
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
