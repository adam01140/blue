function updateLegendColors() {
  document.getElementById("colorText").style.backgroundColor = colorPreferences.text;
  document.getElementById("colorCheckbox").style.backgroundColor = colorPreferences.checkbox;
  document.getElementById("colorDropdown").style.backgroundColor = colorPreferences.dropdown;
  document.getElementById("colorMoney").style.backgroundColor = colorPreferences.money;
}

function autoUpdateNodeIdBasedOnLabel(cell) {
  if (!cell.vertex) return;
  const label = (cell.value || "").trim();
  if (!label) return;
  if (isQuestion(cell)) {
    refreshNodeIdFromLabel(cell);
  } else if (isOptions(cell)) {
    refreshOptionNodeId(cell);
  }
}

function setNodeId(cell, nodeId) {
  let style = cell.style || "";
  style = style.replace(/nodeId=[^;]+/, "");
  style += `;nodeId=${encodeURIComponent(nodeId)};`;
  graph.getModel().setStyle(cell, style);
}

function getNodeId(cell) {
  const style = cell.style || "";
  const m = style.match(/nodeId=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

function isQuestion(cell) {
  return cell && cell.style && cell.style.includes("nodeType=question");
}

function isOptions(cell) {
  return cell && cell.style && cell.style.includes("nodeType=options");
}

function refreshNodeIdFromLabel(cell) {
  const label = (cell.value || "").toString().trim();
  const nodeId = label.replace(/\s+/g, "_");
  setNodeId(cell, nodeId);
}

function refreshOptionNodeId(cell) {
  const edges = graph.getIncomingEdges(cell) || [];
  let parentNodeId = "ParentQuestion";
  for (let e of edges) {
    const p = e.source;
    if (isQuestion(p)) {
      parentNodeId = getNodeId(p) || "ParentQuestion";
      break;
    }
  }
  let label = (cell.value || "Option").toString().trim().replace(/\s+/g, "_");
  setNodeId(cell, parentNodeId + label);
}

function setSectionId(cell, sid) {
  if (!cell) return;
  let style = cell.style || "";
  style = style.replace(/sectionId=[^;]+/, "");
  style += `;sectionId=${sid};`;
  graph.getModel().setStyle(cell, style);
}

function getSectionId(cell) {
  const style = cell.style || "";
  const m = style.match(/sectionId=([^;]+)/);
  return m ? parseInt(m[1], 10) : 1;
}

function hasSkipReassign(cell) {
  return cell && cell.style && cell.style.includes("skipReassign=true");
}

function addSkipReassign(cell) {
  if (!cell) return;
  let style = cell.style || "";
  style = style.replace(/skipReassign=[^;]+/, "");
  style += ";skipReassign=true;";
  graph.getModel().setStyle(cell, style);
}

function markAsNewSection(cell) {
  if (!cell) return;
  let style = cell.style || "";
  style = style.replace(/newSection=[^;]+/, "");
  style += ";newSection=true;";
  graph.getModel().setStyle(cell, style);
}

function addJumpStyling(cell) {
  if (!cell) return;
  let style = cell.style || "";
  style = style.replace(/strokeWidth=\d+;?/, "");
  style = style.replace(/strokeColor=[^;]+;?/, "");
  style = style.replace(/dashed=\d;?/, "");
  style = style.replace(/dashPattern=[^;]+;?/, "");
  style += jumpBorderStyle;
  graph.getModel().setStyle(cell, style);
}

function removeJumpStyling(cell) {
  if (!cell) return;
  let style = cell.style || "";
  style = style.replace(/strokeWidth=\d+;?/, "");
  style = style.replace(/strokeColor=[^;]+;?/, "");
  style = style.replace(/dashed=\d;?/, "");
  style = style.replace(/dashPattern=[^;]+;?/, "");
  graph.getModel().setStyle(cell, style);
}

function colorCell(cell) {
  if (!cell.vertex) return;
  let fillColor = "#ADD8E6";
  if (isQuestion(cell)) {
    const qType = getQuestionType(cell);
    fillColor = getColorForQuestionType(qType);
  } else if (isOptions(cell)) {
    fillColor = "#ffffff";
  }
  let style = cell.style || "";
  style = style.replace(/fillColor=[^;]+/, "");
  style += `;fillColor=${fillColor};`;
  graph.getModel().setStyle(cell, style);
}

function getColorForQuestionType(qType) {
  switch (qType) {
    case "text":         return colorPreferences.text;
    case "checkbox":     return colorPreferences.checkbox;
    case "dropdown":     return colorPreferences.dropdown;
    case "money":        return colorPreferences.money;
    case "date":         return "#FFD700";
    case "bigparagraph": return "#FFA07A";
    default:             return "#ADD8E6";
  }
}

function getQuestionType(cell) {
  const style = cell.style || "";
  const m = style.match(/questionType=([^;]+)/);
  return m ? m[1] : "dropdown";
}

function setQuestionType(cell, newType) {
  let style = cell.style || "";
  style = style.replace(/questionType=[^;]+/, "");
  style += `;questionType=${newType};`;
  graph.getModel().setStyle(cell, style);
}

function refreshAllCells() {
  const parent = graph.getDefaultParent();
  const vertices = graph.getChildVertices(parent);
  vertices.forEach(cell => {
    if (!hasSkipReassign(cell)) {
      if (isOptions(cell)) {
        const incomingEdges = graph.getIncomingEdges(cell) || [];
        if (incomingEdges.length > 0) {
          const parentCell = incomingEdges[0].source;
          if (parentCell && isQuestion(parentCell)) {
            setSectionId(cell, getSectionId(parentCell));
          }
        }
      }
      if (isQuestion(cell)) {
        const thisSection = getSectionId(cell);
        const incomingEdges = graph.getIncomingEdges(cell) || [];
        const incomingOptions = (incomingEdges||[]).filter(e => e.source && isOptions(e.source));
        if (!cell.style.includes("newSection=true") && (thisSection <= 1) && incomingOptions.length > 0) {
          const parentOpt = incomingOptions[0].source;
          setSectionId(cell, getSectionId(parentOpt));
        }
      }
    }
    colorCell(cell);
    if (isQuestion(cell) && (cell.value === "question node" || cell.value === "Question Node")) {
      const cellId = cell.id;
      cell.value = `
        <select oninput="window.pickTypeForCell('${cellId}', this.value)">
          <option value="">-- Choose Type --</option>
          <option value="text">Text</option>
          <option value="checkbox">Checkbox</option>
          <option value="dropdown">Dropdown</option>
          <option value="money">Money</option>
          <option value="date">Date</option>
          <option value="bigparagraph">Big Paragraph</option>
        </select>
      `;
    }
  });
}

window.pickTypeForCell = function(cellId, val) {
  const c = graph.getModel().getCell(cellId);
  if (!c) return;
  graph.getModel().beginUpdate();
  try {
    setQuestionType(c, val);
    switch (val) {
      case "date":
        c.value = "Date question node";
        break;
      case "bigparagraph":
        c.value = "Big Paragraph question node";
        break;
      default:
        c.value = val
          ? val.charAt(0).toUpperCase() + val.slice(1) + " question node"
          : c.value;
        break;
    }
  } finally {
    graph.getModel().endUpdate();
  }
  refreshAllCells();
};
