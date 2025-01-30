/* graph.js */

window.initGraph = function () {
  const container = document.getElementById("graphContainer");

  // Disable right-click context menu
  mxEvent.disableContextMenu(container);

  const graph = new mxGraph(container);
  window.graph = graph;
  graph.setPanning(true);
  graph.panningHandler.useLeftButtonForPanning = true;
  graph.setCellsMovable(true);
  graph.setConnectable(true);
  graph.setCellsResizable(true);
  graph.setHtmlLabels(true); // Allows HTML for embedded elements
  graph.centerZoom = false; // Avoid zoom centering
  new mxRubberband(graph);

  // Ensure all nodes maintain a consistent width but grow in height as text expands
  graph.setAutoSizeCells(true);

  // Auto-resize nodes when text content changes
  graph.getModel().addListener(mxEvent.CHANGE, function (sender, evt) {
    const changes = evt.getProperty("changes");
    if (!changes) return;

    changes.forEach((change) => {
      if (change.constructor.name === "mxValueChange") {
        const cell = change.cell;
        if (cell && cell.vertex) {
          autoResizeNode(cell);
        }
      }
    });
  });

  function autoResizeNode(cell) {
    if (!cell || !cell.vertex) return;

    graph.getModel().beginUpdate();
    try {
      let geometry = cell.geometry;
      if (geometry) {
        let newHeight = estimateTextHeight(cell.value, geometry.width);
        geometry = new mxGeometry(geometry.x, geometry.y, geometry.width, newHeight);
        graph.getModel().setGeometry(cell, geometry);
      }
    } finally {
      graph.getModel().endUpdate();
    }
  }

  function estimateTextHeight(text, width) {
    let lines = text.split("\n");
    let lineHeight = 20; // Estimated line height in pixels
    let charPerLine = Math.floor(width / 8); // Estimate character count per line
    let totalLines = lines.reduce((count, line) => count + Math.ceil(line.length / charPerLine), 0);
    return Math.max(40, totalLines * lineHeight); // Minimum height of 40px
  }

  // Ensure text inside nodes is always inside an input field
  graph.convertValueToString = function (cell) {
    if (cell.vertex) {
      return `<input type="text" class="nodeInput" value="${cell.value || ""}" data-cell-id="${cell.id}" style="width: 100%; background: rgba(255,255,255,0.8); border-radius: 5px; border: 1px solid #ccc; padding: 4px;" />`;
    }
    return cell.value;
  };

  // Event listener for real-time resizing as user types
  document.addEventListener("input", function (event) {
    if (event.target.classList.contains("nodeInput")) {
      const cellId = event.target.getAttribute("data-cell-id");
      const cell = graph.getModel().getCell(cellId);
      if (cell) {
        graph.getModel().beginUpdate();
        try {
          cell.value = event.target.value;
          autoResizeNode(cell);
        } finally {
          graph.getModel().endUpdate();
        }
      }
    }
  });

  // Helper functions for node properties
  window.refreshNodeIdFromLabel = function (cell) {
    if (!cell) return;
    const label = (cell.value || "").trim();
    const nodeId = label.replace(/\s+/g, "_");
    window.setNodeId(cell, nodeId);
  };

  window.setNodeId = function (cell, nodeId) {
    let style = cell.style || "";
    style = style.replace(/nodeId=[^;]+/, "");
    style += `;nodeId=${encodeURIComponent(nodeId)};`;
    graph.getModel().setStyle(cell, style);
  };

  window.getNodeId = function (cell) {
    const style = cell.style || "";
    const match = style.match(/nodeId=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  };

  window.isQuestionNode = function (cell) {
    return cell && cell.style && cell.style.includes("nodeType=question");
  };

  window.isOptionsNode = function (cell) {
    return cell && cell.style && cell.style.includes("nodeType=options");
  };

  window.getQuestionType = function (cell) {
    const style = cell.style || "";
    const match = style.match(/questionType=([^;]+)/);
    return match ? match[1] : "dropdown";
  };

  window.setQuestionType = function (cell, newType) {
    let style = cell.style || "";
    style = style.replace(/questionType=[^;]+/, "");
    style += `;questionType=${newType};`;
    graph.getModel().setStyle(cell, style);
  };

  window.colorNode = function (cell) {
    if (!cell.vertex) return;
    if (window.isQuestionNode(cell)) {
      const qType = window.getQuestionType(cell);
      let fillColor = window.colorPreferences[qType] || "#ADD8E6";

      let style = cell.style || "";
      style = style.replace(/fillColor=[^;]+/, "");
      style += `;fillColor=${fillColor};`;
      graph.getModel().setStyle(cell, style);
    } else if (window.isOptionsNode(cell)) {
      let style = cell.style || "";
      style = style.replace(/fillColor=[^;]+/, "");
      style += ";fillColor=#ffffff;";
      graph.getModel().setStyle(cell, style);
    }
  };

  window.refreshAllCells = function () {
    const parent = graph.getDefaultParent();
    const vertices = graph.getChildVertices(parent);

    graph.getModel().beginUpdate();
    try {
      vertices.forEach((cell) => {
        window.colorNode(cell);
        autoResizeNode(cell);
      });
    } finally {
      graph.getModel().endUpdate();
    }
  };

  // Dragging shapes from toolbar into graph
  document.querySelectorAll(".shape").forEach((shapeEl) => {
    const baseStyle = shapeEl.dataset.style;
    mxUtils.makeDraggable(shapeEl, graph, function (graph, evt, targetCell, x, y) {
      const parent = graph.getDefaultParent();
      graph.getModel().beginUpdate();
      let newVertex;
      try {
        newVertex = graph.insertVertex(parent, null, "New Node", x, y, 140, 60, baseStyle);
      } finally {
        graph.getModel().endUpdate();
      }

      if (window.isQuestionNode(newVertex) && window.getQuestionType(newVertex) === "initial") {
        newVertex.value = createQuestionTypeDropdown(newVertex.id);
      } else if (window.isOptionsNode(newVertex)) {
        window.refreshNodeIdFromLabel(newVertex);
      }

      window.refreshAllCells();
      return newVertex;
    });
  });

  function createQuestionTypeDropdown(cellId) {
    return `
      <select class="questionTypeSelect" data-cell-id="${cellId}">
        <option value="">Select type</option>
        <option value="text">Text</option>
        <option value="checkbox">Checkbox</option>
        <option value="dropdown">Dropdown</option>
        <option value="money">Money</option>
      </select>`;
  }

  // Zoom with mouse wheel
  container.addEventListener("wheel", function (evt) {
    evt.preventDefault();
    if (evt.deltaY > 0) {
      graph.zoomOut();
    } else {
      graph.zoomIn();
    }
  }, { passive: false });

  // Initial refresh
  window.refreshAllCells();
};

// Run `initGraph` when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  window.initGraph();
});
