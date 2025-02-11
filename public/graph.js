/***************************************
   ADDED this line to prevent mxGraph
   from attempting to load graph.txt,
   editor.txt, etc. If you can put
   mxLoadResources = false in HTML
   before mxClient.min.js, that’s better.
***************************************/
mxLoadResources = false;

let graph = null;
let selectedCell = null;
let currentMouseEvent = null;
let lastSelectedCell = null;
let jumpModeNode = null;
const jumpBorderStyle = ";strokeWidth=3;strokeColor=#ff0000;dashed=1;dashPattern=4 4;";

document.addEventListener("DOMContentLoaded", function () {
  // Make sure updateLegendColors exists before calling it
  if (typeof updateLegendColors === 'function') {
    updateLegendColors();
  }

  if (typeof mxGraph === "undefined") {
    alert("mxGraph library not found!");
    return;
  }

  const container = document.getElementById("graphContainer");
  const contextMenu = document.getElementById("contextMenu");
  const deleteNodeButton = document.getElementById("deleteNode");
  const jumpNodeButton = document.getElementById("jumpNode");
  const changeTypeButton = document.getElementById("changeType");
  const newSectionButton = document.getElementById("newSectionButton");
  const propertiesButton = document.getElementById("propertiesButton");
  const yesNoNodeButton = document.getElementById("yesNoNode");

  const typeSubmenu = document.getElementById("typeSubmenu");
  const dropdownTypeBtn = document.getElementById("dropdownType");
  const checkboxTypeBtn = document.getElementById("checkboxType");
  const textTypeBtn = document.getElementById("textType");
  const moneyTypeBtn = document.getElementById("moneyType");

  const propertiesMenu = document.getElementById("propertiesMenu");
  const propNodeText = document.getElementById("propNodeText");
  const propNodeId = document.getElementById("propNodeId");
  const propNodeType = document.getElementById("propNodeType");
  const propSectionName = document.getElementById("propSectionName");

  const colorBoxText = document.getElementById("colorText");
  const colorBoxCheckbox = document.getElementById("colorCheckbox");
  const colorBoxDropdown = document.getElementById("colorDropdown");
  const colorBoxMoney = document.getElementById("colorMoney");
  const colorPickerText = document.getElementById("colorPickerText");
  const colorPickerCheckbox = document.getElementById("colorPickerCheckbox");
  const colorPickerDropdown = document.getElementById("colorPickerDropdown");
  const colorPickerMoney = document.getElementById("colorPickerMoney");

  graph = new mxGraph(container);
  graph.setAutoSizeCells(true);
  graph.setHtmlLabels(true);

  mxEvent.disableContextMenu(container);
  graph.setPanning(true);
  graph.panningHandler.useLeftButtonForPanning = true;
  graph.setCellsMovable(true);
  graph.setConnectable(true);
  graph.setCellsResizable(true);
  new mxRubberband(graph);

  const defStyle = graph.getStylesheet().getDefaultVertexStyle();
  defStyle["labelBackgroundColor"] = "#ffffff";
  defStyle["labelBorderColor"] = "#cccccc";
  defStyle["rounded"] = "1";
  defStyle["arcSize"] = "24";
  defStyle["whiteSpace"] = "wrap";
  defStyle["html"] = "1";
  defStyle["autosize"] = "1";
  defStyle["spacingTop"] = 16;
  defStyle["spacingBottom"] = 16;
  defStyle["spacingLeft"] = 16;
  defStyle["spacingRight"] = 16;

  graph.getModel().addListener(mxEvent.CHANGE, (sender, evt) => {
    const changes = evt.getProperty("changes") || [];
    changes.forEach(change => {
      if (change.constructor.name === "mxGeometryChange") {
        const changedCell = change.cell;
        if (changedCell && changedCell.vertex) {
          const geo = changedCell.geometry;
          if (geo) {
            if (geo.width < 120) geo.width = 120;
            if (geo.height < 60) geo.height = 60;
          }
        }
      }
    });
  });

  (function overrideCellEditor() {
    const oldInstallListeners = mxCellEditor.prototype.installListeners;
    mxCellEditor.prototype.installListeners = function(elt) {
      oldInstallListeners.apply(this, arguments);
      // Removed real-time updateCellSize on 'input'.
    };
    const oldStopEditing = mxCellEditor.prototype.stopEditing;
    mxCellEditor.prototype.stopEditing = function(cancel) {
      if (!cancel && this.editingCell != null) {
        graph.updateCellSize(this.editingCell);
      }
      oldStopEditing.apply(this, arguments);
    };
  })();

  graph.getSelectionModel().addListener(mxEvent.CHANGE, () => {
    if (lastSelectedCell) {
      autoUpdateNodeIdBasedOnLabel(lastSelectedCell);
    }
    lastSelectedCell = graph.getSelectionCell();
  });

  const toolbarShapes = document.querySelectorAll(".shape");
  toolbarShapes.forEach((shapeEl) => {
    const baseStyle = shapeEl.dataset.style;
    mxUtils.makeDraggable(
      shapeEl,
      graph,
      function (graph, evt, targetCell, x, y) {
        const parent = graph.getDefaultParent();
        graph.getModel().beginUpdate();
        let newVertex;
        try {
          const label = shapeEl.dataset.type + " node";
          newVertex = graph.insertVertex(
            parent,
            null,
            label,
            x,
            y,
            160,
            80,
            baseStyle + ";autosize=1;"
          );
        } finally {
          graph.getModel().endUpdate();
        }
        if (isQuestion(newVertex)) {
          refreshNodeIdFromLabel(newVertex);
        } else if (isOptions(newVertex)) {
          refreshOptionNodeId(newVertex);
        }
        refreshAllCells();
        return newVertex;
      }
    );
  });

  graph.popupMenuHandler.factoryMethod = function(menu, cell, evt) {
    selectedCell = cell;
    currentMouseEvent = evt;
    if (cell) {
      showContextMenu(evt);
    } else {
      hideContextMenu();
    }
  };

  function showContextMenu(evt) {
    contextMenu.style.display = "block";
    contextMenu.style.left = evt.clientX + "px";
    contextMenu.style.top = evt.clientY + "px";
    typeSubmenu.style.display = "none";
  }
  function hideContextMenu() {
    contextMenu.style.display = "none";
    typeSubmenu.style.display = "none";
  }
  document.addEventListener("click", (e) => {
    if (
      !contextMenu.contains(e.target) &&
      !typeSubmenu.contains(e.target) &&
      !propertiesMenu.contains(e.target)
    ) {
      hideContextMenu();
      propertiesMenu.style.display = "none";
    }
  });

  deleteNodeButton.addEventListener("click", () => {
    if (selectedCell) {
      graph.removeCells([selectedCell]);
      refreshAllCells();
    }
    hideContextMenu();
  });
  jumpNodeButton.addEventListener("click", () => {
    if (selectedCell) {
      if (jumpModeNode && jumpModeNode !== selectedCell) {
        removeJumpStyling(jumpModeNode);
      }
      jumpModeNode = selectedCell;
      addJumpStyling(jumpModeNode);
    }
    hideContextMenu();
  });
  changeTypeButton.addEventListener("click", () => {
    const rect = contextMenu.getBoundingClientRect();
    typeSubmenu.style.display = "block";
    typeSubmenu.style.left = rect.right + "px";
    typeSubmenu.style.top = rect.top + "px";
  });
  dropdownTypeBtn.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      setQuestionType(selectedCell, "dropdown");
      selectedCell.value = "Dropdown question node";
      refreshAllCells();
    }
    hideContextMenu();
  });
  checkboxTypeBtn.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      setQuestionType(selectedCell, "checkbox");
      selectedCell.value = "Checkbox question node";
      refreshAllCells();
    }
    hideContextMenu();
  });
  textTypeBtn.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      setQuestionType(selectedCell, "text");
      selectedCell.value = "Text question node";
      refreshAllCells();
    }
    hideContextMenu();
  });
  moneyTypeBtn.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      setQuestionType(selectedCell, "money");
      selectedCell.value = "Money question node";
      refreshAllCells();
    }
    hideContextMenu();
  });
  newSectionButton.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      const oldSec = getSectionId(selectedCell);
      const newSec = oldSec + 1;
      setSectionId(selectedCell, newSec);
      markAsNewSection(selectedCell);
      refreshAllCells();
    }
    hideContextMenu();
  });
  propertiesButton.addEventListener("click", () => {
    if (selectedCell) {
      showPropertiesMenu(selectedCell, currentMouseEvent);
    }
    hideContextMenu();
  });
  yesNoNodeButton.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      createYesNoOptions(selectedCell);
    }
    hideContextMenu();
  });

  function createYesNoOptions(parentCell) {
    const parentGeo = parentCell.geometry;
    if (!parentGeo) return;
    const parent = graph.getDefaultParent();
    graph.getModel().beginUpdate();
    try {
      const yesX = parentGeo.x - 80;
      const yesY = parentGeo.y + parentGeo.height + 50;
      const yesStyle = "rounded=1;whiteSpace=wrap;html=1;nodeType=options;questionType=dropdown;";
      const yesVertex = graph.insertVertex(parent, null, "Yes", yesX, yesY, 100, 60, yesStyle);
      refreshOptionNodeId(yesVertex);
      graph.insertEdge(parent, null, "", parentCell, yesVertex);

      const noX = parentGeo.x + parentGeo.width + 20;
      const noY = parentGeo.y + parentGeo.height + 50;
      const noStyle = "rounded=1;whiteSpace=wrap;html=1;nodeType=options;questionType=dropdown;";
      const noVertex = graph.insertVertex(parent, null, "No", noX, noY, 100, 60, noStyle);
      refreshOptionNodeId(noVertex);
      graph.insertEdge(parent, null, "", parentCell, noVertex);
    } finally {
      graph.getModel().endUpdate();
    }
    refreshAllCells();
  }

  function showPropertiesMenu(cell, evt) {
    if (!cell) return;
    propertiesMenu.style.display = "block";
    propertiesMenu.style.left = evt.clientX + 10 + "px";
    propertiesMenu.style.top = evt.clientY + 10 + "px";

    propNodeText.textContent = cell.value || "";
    propNodeId.textContent = getNodeId(cell) || "";
    if (isQuestion(cell)) {
      propNodeType.textContent = getQuestionType(cell);
    } else if (isOptions(cell)) {
      propNodeType.textContent = "options";
    } else {
      propNodeType.textContent = "other";
    }
    propSectionName.textContent = "Section " + getSectionId(cell);
  }
  makeEditableField(propNodeText, onNodeTextFieldChange);
  makeEditableField(propNodeId, onNodeIdFieldChange);

  function makeEditableField(spanEl, onChangeCb) {
    spanEl.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      e.preventDefault();
      spanEl.contentEditable = "true";
      spanEl.focus();
    });
    spanEl.addEventListener("blur", () => {
      spanEl.contentEditable = "false";
      onChangeCb(spanEl.textContent);
    });
    spanEl.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        spanEl.blur();
      }
    });
  }
  function onNodeTextFieldChange(newText) {
    if (!selectedCell) return;
    graph.getModel().beginUpdate();
    try {
      selectedCell.value = newText.trim();
      if (isQuestion(selectedCell)) {
        refreshNodeIdFromLabel(selectedCell);
      } else if (isOptions(selectedCell)) {
        refreshOptionNodeId(selectedCell);
      }
    } finally {
      graph.getModel().endUpdate();
    }
    refreshAllCells();
  }
  function onNodeIdFieldChange(newId) {
    if (!selectedCell) return;
    graph.getModel().beginUpdate();
    try {
      setNodeId(selectedCell, newId);
    } finally {
      graph.getModel().endUpdate();
    }
    refreshAllCells();
  }

  const keyHandler = new mxKeyHandler(graph);
  keyHandler.bindControlKey(67, () => {
    mxClipboard.copy(graph);
  });
  keyHandler.bindControlKey(86, () => {
    const pasted = mxClipboard.paste(graph);
    if (pasted && pasted.length > 0) {
      graph.moveCells(pasted, 40, 40);
      refreshAllCells();
    }
  });

  graph.getModel().addListener(mxEvent.EVENT_CHANGE, function(sender, evt) {
    const changes = evt.getProperty("changes");
    if (!changes) return;
    changes.forEach((change) => {
      if (change.constructor.name === "mxValueChange") {
        const { cell, value } = change;
        if (value && typeof value === "string") {
          if (value.trim().endsWith("?")) {
            if (!isQuestion(cell)) {
              let style = cell.style || "";
              style += ";nodeType=question;";
              graph.getModel().setStyle(cell, style);
              refreshNodeIdFromLabel(cell);
            }
          }
        }
      }
    });
    refreshAllCells();
  });

  graph.connectionHandler.addListener(mxEvent.CONNECT, function(sender, evt) {
    const edge = evt.getProperty("cell");
    if (!edge) return;
    const parent = edge.source;
    const child = edge.target;
    const parentIsJump = (parent && parent === jumpModeNode);
    let parentQuestion = null;
    if (parent && isOptions(parent)) {
      parentQuestion = parent.source;
    } else if (parent && isQuestion(parent)) {
      parentQuestion = parent;
    }
    const gpIsJump = (parentQuestion && parentQuestion === jumpModeNode);

    if (parentIsJump || gpIsJump) {
      addSkipReassign(child);
    } else {
      const parentSec = getSectionId(parent);
      setSectionId(child, parentSec);
    }
    refreshAllCells();
  });

  // If "helpers.js" was successfully loaded, the color pickers can call updateLegendColors
  colorBoxText.addEventListener("click", () => colorPickerText.click());
  colorBoxCheckbox.addEventListener("click", () => colorPickerCheckbox.click());
  colorBoxDropdown.addEventListener("click", () => colorPickerDropdown.click());
  colorBoxMoney.addEventListener("click", () => colorPickerMoney.click());

  colorPickerText.addEventListener("input", (e) => {
    colorPreferences.text = e.target.value;
    if (typeof saveUserColorPrefs === 'function') {
      saveUserColorPrefs().then(()=>{
        if (typeof updateLegendColors === 'function') {
          updateLegendColors();
        }
        refreshAllCells();
      });
    }
  });
  colorPickerCheckbox.addEventListener("input", (e) => {
    colorPreferences.checkbox = e.target.value;
    if (typeof saveUserColorPrefs === 'function') {
      saveUserColorPrefs().then(()=>{
        if (typeof updateLegendColors === 'function') {
          updateLegendColors();
        }
        refreshAllCells();
      });
    }
  });
  colorPickerDropdown.addEventListener("input", (e) => {
    colorPreferences.dropdown = e.target.value;
    if (typeof saveUserColorPrefs === 'function') {
      saveUserColorPrefs().then(()=>{
        if (typeof updateLegendColors === 'function') {
          updateLegendColors();
        }
        refreshAllCells();
      });
    }
  });
  colorPickerMoney.addEventListener("input", (e) => {
    colorPreferences.money = e.target.value;
    if (typeof saveUserColorPrefs === 'function') {
      saveUserColorPrefs().then(()=>{
        if (typeof updateLegendColors === 'function') {
          updateLegendColors();
        }
        refreshAllCells();
      });
    }
  });
});
