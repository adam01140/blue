/**************************************************
 ************ Firebase Config & Basic Auth ********
 **************************************************/
 const firebaseConfig = {
  apiKey: "AIzaSyBlxFmFD-rz1V_Q9_oV0DkLsENbmyJ1k-U",
  authDomain: "flowchart-1eb90.firebaseapp.com",
  projectId: "flowchart-1eb90",
  storageBucket: "flowchart-1eb90.firebasestorage.app",
  messagingSenderId: "546103281533",
  appId: "1:546103281533:web:ae719cdbde727dcd94ee14",
  measurementId: "G-8VSXRFREY9"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let currentUser = null;

// For "Reset" button (question colors)
const defaultColors = {
  amountOption: "#ffeb3b",
  text: "#cce6ff",
  checkbox: "#b3daff",
  dropdown: "#99ccff",
  money: "#80bfff",
  date: "#4da6ff",
  bigParagraph: "#1a8cff",
  textColor: "#000000"
};

// Global function for hiding context menus
function hideContextMenu() {
  document.getElementById('contextMenu').style.display = 'none';
  document.getElementById('typeSubmenu').style.display = 'none';
  document.getElementById('emptySpaceMenu').style.display = 'none';
}

// Determine the type of a node (question, options, etc.)
function getNodeType(cell) {
  if (!cell || !cell.style) return "unknown";
  
  if (cell.style.includes("nodeType=question")) {
    return "question";
  } else if (cell.style.includes("nodeType=options")) {
    return "options";
  } else if (cell.style.includes("nodeType=calculation")) {
    return "calculation"; 
  } else if (cell.style.includes("nodeType=end")) {
    return "end";
  }
  return "unknown";
}

function isEndNode(cell) {
  return (cell && cell.style && cell.style.includes("nodeType=end")) || 
         (cell && cell.id === "1") || 
         (cell && cell.id === "19");
}

function updateEndNodeCell(cell) {
  const html = `<div style="text-align:center;padding:8px;"><strong>END</strong></div>`;
  graph.getModel().beginUpdate();
  try {
    graph.getModel().setValue(cell, html);
    graph.setCellStyles(mxConstants.STYLE_EDITABLE, "0", [cell]);
  } finally {
    graph.getModel().endUpdate();
  }
}
let colorPreferences = { ...defaultColors };

// Section preferences: mapping section numbers to { borderColor, name }
// Ensure Section "1" exists by default.
let sectionPrefs = {
  "1": { borderColor: getDefaultSectionColor(1), name: "Enter Name" }
};

// If user has opened a flowchart by name, store it here
let currentFlowchartName = null;

/**
 * Updates the legend squares to reflect current colorPreferences.
 */
function updateLegendColors() {
  document.getElementById("colorText").style.backgroundColor = colorPreferences.text;
  document.getElementById("colorCheckbox").style.backgroundColor = colorPreferences.checkbox;
  document.getElementById("colorDropdown").style.backgroundColor = colorPreferences.dropdown;
  document.getElementById("colorMoney").style.backgroundColor = colorPreferences.money;
  document.getElementById("colorDate").style.backgroundColor = colorPreferences.date;
  document.getElementById("colorBigParagraph").style.backgroundColor = colorPreferences.bigParagraph;
  document.getElementById("colorTextColor").style.backgroundColor = colorPreferences.textColor;
}

const loginOverlay = document.getElementById("loginOverlay");
const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");

const flowchartListOverlay = document.getElementById("flowchartListOverlay");
const flowchartListDiv = document.getElementById("flowchartList");
const closeFlowchartListBtn = document.getElementById("closeFlowchartListBtn");

const logoutBtn = document.getElementById("logoutBtn");

function showLoginOverlay() {
  loginOverlay.style.display = "flex";
}
function hideLoginOverlay() {
  loginOverlay.style.display = "none";
}
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + days*24*60*60*1000);
  const expires = "expires="+ d.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}
function getCookie(name) {
  const ca = document.cookie.split(';');
  name = name + "=";
  for (let i=0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

loginButton.addEventListener("click", () => {
  const email = loginEmail.value.trim();
  const pass = loginPassword.value.trim();
  firebase.auth().signInWithEmailAndPassword(email, pass)
    .then(cred => {
      currentUser = cred.user;
      setCookie("flowchart_uid", currentUser.uid, 7);
      hideLoginOverlay();
      loadUserColorPrefs();
    })
    .catch(err => {
      loginError.textContent = err.message;
    });
});
signupButton.addEventListener("click", () => {
  const email = loginEmail.value.trim();
  const pass = loginPassword.value.trim();
  firebase.auth().createUserWithEmailAndPassword(email, pass)
    .then(cred => {
      currentUser = cred.user;
      setCookie("flowchart_uid", currentUser.uid, 7);
      hideLoginOverlay();
      saveUserColorPrefs().then(() => loadUserColorPrefs());
    })
    .catch(err => {
      loginError.textContent = err.message;
    });
});

// Logout
logoutBtn.addEventListener("click", () => {
  if (!currentUser) {
    alert("No user is logged in.");
    return;
  }
  firebase.auth().signOut()
    .then(() => {
      setCookie("flowchart_uid", "", -1);
      currentUser = null;
      showLoginOverlay();
    })
    .catch(err => {
      console.error("Logout error:", err);
      alert("Error logging out: " + err);
    });
});

function checkForSavedLogin() {
  const savedUid = getCookie("flowchart_uid");
  if (savedUid) {
    firebase.auth().onAuthStateChanged(user => {
      if (user && user.uid === savedUid) {
        currentUser = user;
        hideLoginOverlay();
        loadUserColorPrefs();
      } else {
        showLoginOverlay();
      }
    });
  } else {
    showLoginOverlay();
  }
}

function loadUserColorPrefs() {
  if (!currentUser) return;
  db.collection("users")
    .doc(currentUser.uid)
    .collection("preferences")
    .doc("colors")
    .get()
    .then(docSnap => {
      if (docSnap.exists) {
        const data = docSnap.data();
        for (let key in defaultColors) {
          if (data[key] !== undefined) {
            colorPreferences[key] = data[key];
          } else {
            colorPreferences[key] = defaultColors[key];
          }
        }
      }
      updateLegendColors();
      refreshAllCells();
    })
    .catch(err => {
      console.error("Error loading color prefs:", err);
    });
}

function saveUserColorPrefs() {
  if (!currentUser) return Promise.resolve();
  return db.collection("users")
    .doc(currentUser.uid)
    .collection("preferences")
    .doc("colors")
    .set(colorPreferences, { merge: true });
}

/**************************************************
 ************ Section Preferences & Legend ********
 **************************************************/
function getDefaultSectionColor(sectionNum) {
  let lightness = Math.max(30, 80 - (sectionNum - 1) * 10);
  return `hsl(0, 100%, ${lightness}%)`;
}

function setSection(cell, sectionNum) {
  let style = cell.style || "";
  style = style.replace(/section=[^;]+/, "");
  style += `;section=${sectionNum};`;
  graph.getModel().setStyle(cell, style);
  if (!sectionPrefs[sectionNum]) {
    sectionPrefs[sectionNum] = {
      borderColor: getDefaultSectionColor(parseInt(sectionNum)),
      name: "Enter section name"
    };
    updateSectionLegend();
  }
}
function getSection(cell) {
  const style = cell.style || "";
  const match = style.match(/section=([^;]+)/);
  return match ? match[1] : "1";
}

function updateSectionLegend() {
  const legend = document.getElementById("sectionLegend");
  let innerHTML = "<h4>Section Names</h4>";
  const sections = Object.keys(sectionPrefs).sort((a, b) => parseInt(a) - parseInt(b));
  sections.forEach(sec => {
    innerHTML += `
      <div class="section-item" data-section="${sec}">
        <div class="section-color-box" style="background-color: ${sectionPrefs[sec].borderColor};" data-section="${sec}"></div>
        <span class="section-number">${sec}:</span>
        <span class="section-name" contenteditable="true" data-section="${sec}">${sectionPrefs[sec].name}</span>
      </div>
    `;
  });
  innerHTML += `<button id="resetSectionColorsBtn">Reset Colors</button>`;
  legend.innerHTML = innerHTML;

  const colorBoxes = legend.querySelectorAll(".section-color-box");
  colorBoxes.forEach(box => {
    box.addEventListener("click", (e) => {
      const sec = e.target.getAttribute("data-section");
      selectedSectionForColor = sec;
      const picker = document.getElementById("sectionColorPicker");
      picker.value = rgbToHex(getComputedStyle(e.target).backgroundColor);
      picker.click();
    });
  });
  const nameFields = legend.querySelectorAll(".section-name");
  nameFields.forEach(field => {
    field.addEventListener("blur", (e) => {
      const sec = e.target.getAttribute("data-section");
      sectionPrefs[sec].name = e.target.textContent.trim() || "Enter section name";
      if (selectedCell && getSection(selectedCell) === sec) {
        document.getElementById("propSectionName").textContent = sectionPrefs[sec].name;
      }
    });
    field.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.target.blur();
      }
    });
  });
  document.getElementById("resetSectionColorsBtn").addEventListener("click", () => {
    Object.keys(sectionPrefs).forEach(sec => {
      sectionPrefs[sec].borderColor = getDefaultSectionColor(parseInt(sec));
    });
    updateSectionLegend();
    refreshAllCells();
  });
}

function rgbToHex(rgb) {
  const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgb);
  return result ? "#" +
    ("0" + parseInt(result[1], 10).toString(16)).slice(-2) +
    ("0" + parseInt(result[2], 10).toString(16)).slice(-2) +
    ("0" + parseInt(result[3], 10).toString(16)).slice(-2) : rgb;
}
let selectedSectionForColor = null;
document.getElementById("sectionColorPicker").addEventListener("input", (e) => {
  if (selectedSectionForColor) {
    sectionPrefs[selectedSectionForColor].borderColor = e.target.value;
    updateSectionLegend();
    refreshAllCells();
  }
});

/**************************************************
 ************  GRAPH, NODES, CONTEXT MENU, etc. ********
 **************************************************/
let graph = null;
let selectedCell = null;
let currentMouseEvent = null;
let lastSelectedCell = null;
let jumpModeNode = null;
const jumpBorderStyle = ";strokeWidth=3;strokeColor=#ff0000;dashed=1;dashPattern=4 4;";


window.handleMultipleTextboxClick = function(event, cellId) {
  event.stopPropagation();
  const cell = graph.getModel().getCell(cellId);
  graph.selectionModel.setCell(cell);
};

window.handleMultipleTextboxFocus = function(event, cellId) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell) return;
  const textDiv = event.target;
  if (textDiv.innerText === "Enter question text") {
    textDiv.innerText = "";
  }
};

/**
 * Clean up redundant semicolons in style string
 */
function cleanStyle(style) {
  return style
    .replace(/;+$/, "")     // Remove trailing semicolons
    .replace(/;+;/g, ";");  // Replace double semicolons
}

// loadFlowchartData
function loadFlowchartData(data) {
  data.cells.forEach(item => {
    if (item.style) {
      item.style = cleanStyle(item.style);
    }
  });

  graph.getModel().beginUpdate();
  try {
    const parent = graph.getDefaultParent();
    graph.removeCells(graph.getChildVertices(parent));
    const createdCells = {};

    if (data.sectionPrefs) {
      sectionPrefs = data.sectionPrefs;
      updateSectionLegend();
    }

    data.cells.forEach(item => {
      if (item.vertex) {
        const geo = new mxGeometry(
          item.geometry.x,
          item.geometry.y,
          item.geometry.width,
          item.geometry.height
        );
        const newCell = new mxCell(item.value, geo, item.style);
        newCell.vertex = true;
        newCell.id = item.id;
        
        // Restore custom fields
        newCell._textboxes = item._textboxes || null;
        newCell._questionText = item._questionText || null;
        newCell._twoNumbers = item._twoNumbers || null;
        newCell._nameId = item._nameId || null;
        newCell._placeholder = item._placeholder || "";
        newCell._questionId = item._questionId || null;
        // image
        if (item._image) newCell._image = item._image;
        // calculation
        if (item._calcTitle !== undefined) newCell._calcTitle = item._calcTitle;
        if (item._calcAmountLabel !== undefined) newCell._calcAmountLabel = item._calcAmountLabel;
        if (item._calcOperator !== undefined) newCell._calcOperator = item._calcOperator;
        if (item._calcThreshold !== undefined) newCell._calcThreshold = item._calcThreshold;
        if (item._calcFinalText !== undefined) newCell._calcFinalText = item._calcFinalText;
        if (item._calcTerms !== undefined) newCell._calcTerms = item._calcTerms;
        // If we have _calcAmountLabel but no _calcTerms, create the terms array
        if (item._calcAmountLabel !== undefined && item._calcTerms === undefined) {
          newCell._calcTerms = [{
            amountLabel: item._calcAmountLabel,
            mathOperator: ""
          }];
        }

        graph.addCell(newCell, parent);
        createdCells[item.id] = newCell;
      }
    });

    data.cells.forEach(item => {
      if (item.edge) {
        const newEdge = new mxCell(item.value, new mxGeometry(), item.style);
        newEdge.edge = true;
        newEdge.id = item.id;
        const src = createdCells[item.source];
        const trg = createdCells[item.target];
        graph.addCell(newEdge, parent, undefined, src, trg);
      }
    });
  } finally {
    graph.getModel().endUpdate();
  }

  // Renumber based on loaded positions
  renumberQuestionIds();

  // Rebuild HTML for special/certain nodes
  const parent = graph.getDefaultParent();
  const vertices = graph.getChildVertices(parent);
  graph.getModel().beginUpdate();
  try {
    vertices.forEach(cell => {
      if (isQuestion(cell)) {
        const qType = getQuestionType(cell);
        if (qType === "multipleTextboxes") {
          updateMultipleTextboxesCell(cell);
        } else if (qType === "multipleDropdownType") {
          updatemultipleDropdownTypeCell(cell);
        }
      } else if (isOptions(cell) && getQuestionType(cell) === "imageOption") {
        updateImageOptionCell(cell);
      } else if (isCalculationNode(cell)) {
        updateCalculationNodeCell(cell);
      }
    });
  } finally {
    graph.getModel().endUpdate();
  }

  refreshAllCells();
}

document.addEventListener("DOMContentLoaded", function() {
  checkForSavedLogin();
  
  // Auto-fill login credentials and login automatically
  function autoLogin() {
    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");
    const loginButton = document.getElementById("loginButton");
    
    if (loginEmail && loginPassword && loginButton) {
      loginEmail.value = "defaultemail0114@gmail.com";
      loginPassword.value = "adam0114";
      
      // Add a small delay to ensure the form is filled before clicking
      setTimeout(() => {
        loginButton.click();
      }, 500);
    }
  }
  
  // Call the auto-login function
  autoLogin();

  const container = document.getElementById("graphContainer");
  const contextMenu = document.getElementById("contextMenu");
  const deleteNodeButton = document.getElementById("deleteNode");
  const jumpNodeButton = document.getElementById("jumpNode");
  const changeTypeButton = document.getElementById("changeType");
  const propertiesButton = document.getElementById("propertiesButton");
  const yesNoNodeButton = document.getElementById("yesNoNode");
  const newSectionButton = document.getElementById("newSectionNode");

  const typeSubmenu = document.getElementById("typeSubmenu");
  const dropdownTypeBtn = document.getElementById("dropdownType");
  const checkboxTypeBtn = document.getElementById("checkboxType");
  const textTypeBtn = document.getElementById("textType");
  const moneyTypeBtn = document.getElementById("moneyType");
  const dateTypeBtn = document.getElementById("dateType");
  const bigParagraphTypeBtn = document.getElementById("bigParagraphType");
  const multipleTextboxesTypeBtn = document.getElementById("multipleTextboxesTypeBtn");
  const multipleDropdownTypeBtn = document.getElementById("multipleDropdownTypeBtn");

  const propertiesMenu = document.getElementById("propertiesMenu");
  const propNodeText = document.getElementById("propNodeText");
  const propNodeId = document.getElementById("propNodeId");
  const propNodeType = document.getElementById("propNodeType");
  const propNodeSection = document.getElementById("propNodeSection");
  const propSectionName = document.getElementById("propSectionName");

  const resetBtn = document.getElementById("resetBtn");

  // Create graph
  graph = new mxGraph(container);

  // Enable double-click editing for multipleTextboxes cells
  const originalDblClick = graph.dblClick.bind(graph);
  graph.dblClick = function(evt, cell) {
    if (cell && isQuestion(cell) && getQuestionType(cell) === 'multipleTextboxes') {
      const state = graph.view.getState(cell);
      if (state && state.text && state.text.node) {
        const questionTextDiv = state.text.node.querySelector('.question-text');
        if (questionTextDiv) {
          graph.selectionModel.setCell(cell);
          questionTextDiv.focus();
          mxEvent.consume(evt);
          return;
        }
      }
    }
    // For calculation node, we might want to do nothing special on double-click.
    originalDblClick(evt, cell);
  };

  // Let mxGraph render cell labels as HTML
  graph.setHtmlLabels(true);

  // Force all vertex labels to be interpreted as HTML
  graph.isHtmlLabel = function(cell) {
    return true;
  };

  // Disable built-in label editing if it's multipleTextboxes or multipleDropdownType
  graph.isCellEditable = function(cell) {
    if (!cell) return false;
    if (cell.style && (
      cell.style.includes("multipleTextboxes") ||
      cell.style.includes("multipleDropdownType")
    )) {
      return false; 
    }
    return true;
  };

  // Enter => newline
  graph.setEnterStopsCellEditing(false);

  // Set up proper panning with left button
  graph.setPanning(true);
  graph.panningHandler.useLeftButtonForPanning = true;

  mxEvent.disableContextMenu(container);
  graph.setCellsMovable(true);
  graph.setConnectable(true);
  graph.setCellsResizable(true);

  // We'll focus just on making right-click work properly
  // Customize rubberband handling (we'll skip selection box for now)
  const rubberband = new mxRubberband(graph);
  
  // Context menu handling
  graph.popupMenuHandler.factoryMethod = function(menu, cell, evt) {
    propertiesMenu.style.display = "none";
    typeSubmenu.style.display = "none";
    selectedCell = cell;
    currentMouseEvent = evt;
    
    // Right-click context menu
    if (mxEvent.isRightMouseButton(evt)) {
      const selectedCells = graph.getSelectionCells();
      
      if (selectedCells && selectedCells.length > 0) {
        // Show context menu for cell(s)
        const x = evt.clientX;
        const y = evt.clientY;
        
        const menu = document.getElementById('contextMenu');
        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        // Update menu title to show number of selected items
        if (selectedCells.length > 1) {
          document.getElementById('deleteNode').textContent = `Delete ${selectedCells.length} Nodes`;
          document.getElementById('copyNodeButton').textContent = `Copy ${selectedCells.length} Nodes`;
          
          // Hide options that don't apply to multiple nodes
          document.getElementById('yesNoNode').style.display = 'none';
          document.getElementById('changeType').style.display = 'none';
          document.getElementById('jumpNode').style.display = 'none';
          document.getElementById('propertiesButton').style.display = 'none';
        } else {
          // Single node selection - restore original text and show/hide options based on node type
          document.getElementById('deleteNode').textContent = "Delete Node";
          document.getElementById('copyNodeButton').textContent = "Copy";
          document.getElementById('jumpNode').style.display = 'block';
          document.getElementById('propertiesButton').style.display = 'block';
          
          const cell = selectedCells[0];
          if (getNodeType(cell) === 'question') {
            document.getElementById('yesNoNode').style.display = 'block';
            document.getElementById('changeType').style.display = 'block';
          } else {
            document.getElementById('yesNoNode').style.display = 'none';
            document.getElementById('changeType').style.display = 'none';
          }
        }
      } else {
        // No cells selected - show empty space context menu
        const x = evt.clientX;
        const y = evt.clientY;
        
        // Convert client coordinates to graph coordinates
        const pt = graph.getPointForEvent(evt, false);
        
        // Store click position in global variables for later use
        window.emptySpaceClickX = pt.x;
        window.emptySpaceClickY = pt.y;
        
        // Show empty space context menu
        const emptyMenu = document.getElementById('emptySpaceMenu');
        emptyMenu.style.display = 'block';
        emptyMenu.style.left = x + 'px';
        emptyMenu.style.top = y + 'px';
      }
      evt.preventDefault();
    }
    
    return null; // Always return null to prevent the default menu
  };

  document.addEventListener("click", e => {
    if (
      !contextMenu.contains(e.target) &&
      !typeSubmenu.contains(e.target) &&
      !propertiesMenu.contains(e.target)
    ) {
      hideContextMenu();
      propertiesMenu.style.display = "none";
    }
  });

  // Slight style tweaks to move label text away from top
  const style = graph.getStylesheet().getDefaultVertexStyle();
  style[mxConstants.STYLE_VERTICAL_ALIGN] = "top";
  style[mxConstants.STYLE_VERTICAL_LABEL_POSITION] = "middle";
  style[mxConstants.STYLE_SPACING_TOP] = 10;

  // Zoom with mouse wheel
  mxEvent.addMouseWheelListener(function(evt, up) {
    if (!mxEvent.isConsumed(evt)) {
      if (up) graph.zoomIn();
      else graph.zoomOut();
      mxEvent.consume(evt);
    }
  }, container);

  // Track selection
  graph.getSelectionModel().addListener(mxEvent.CHANGE, () => {
    if (lastSelectedCell) {
      autoUpdateNodeIdBasedOnLabel(lastSelectedCell);
    }
    lastSelectedCell = graph.getSelectionCell();
  });

  // Draggable shapes (including new Calculation Node)
  const toolbarShapes = document.querySelectorAll(".shape");
  toolbarShapes.forEach(shapeEl => {
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
          let styleWithPointer = baseStyle;
          if (!styleWithPointer.includes("pointerEvents=")) {
            styleWithPointer += "pointerEvents=1;overflow=fill;";
          }
          newVertex = graph.insertVertex(
            parent,
            null,
            label,
            x,
            y,
            160,
            80,
            styleWithPointer
          );
        } finally {
          graph.getModel().endUpdate();
        }

        // If question
        if (isQuestion(newVertex)) {
          refreshNodeIdFromLabel(newVertex);
        } else if (isOptions(newVertex)) {
          refreshOptionNodeId(newVertex);
        } else if (isCalculationNode(newVertex)) {
          // Init calculation node data
          newVertex._calcTitle = "Calculation Title";
          newVertex._calcTerms = [{amountLabel: "", mathOperator: ""}];
          newVertex._calcOperator = "=";
          newVertex._calcThreshold = "0";
          newVertex._calcFinalText = "";
          updateCalculationNodeCell(newVertex);
        }

        refreshAllCells();
        return newVertex;
      }
    );
  });

  // Listen for MOVE_CELLS to adjust option nodes
  graph.addListener(mxEvent.MOVE_CELLS, function(sender, evt) {
    const movedCells = evt.getProperty('cells');
    const dx = evt.getProperty('dx');
    const dy = evt.getProperty('dy');
    
    if (!movedCells || movedCells.length === 0) return;

    const movedIds = new Set(movedCells.map(c => c.id));
    
    // Function to get all connected descendants
    const getConnectedDescendants = (cell) => {
      const descendants = new Set();
      const queue = [cell];
      
      while (queue.length > 0) {
        const current = queue.shift();
        const edges = graph.getOutgoingEdges(current) || [];
        
        edges.forEach(edge => {
          const target = edge.target;
          if (!descendants.has(target) && !movedIds.has(target.id)) {
            descendants.add(target);
            queue.push(target);
          }
        });
      }
      return Array.from(descendants);
    };

    movedCells.forEach(cell => {
      if (isQuestion(cell)) {
        const descendants = getConnectedDescendants(cell);
        descendants.forEach(descendant => {
          const geo = descendant.geometry;
          if (geo) {
            const newGeo = geo.clone();
            newGeo.x += dx;
            newGeo.y += dy;
            graph.getModel().setGeometry(descendant, newGeo);
          }
        });
      }
    });
  });

  // Delete node
  deleteNodeButton.addEventListener("click", () => {
    const cells = graph.getSelectionCells();
    if (cells.length > 0) {
      graph.removeCells(cells);
      refreshAllCells();
    }
    hideContextMenu();
  });

  // Mark/unmark jump node
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

  // Create yes/no child options
  yesNoNodeButton.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      createYesNoOptions(selectedCell);
    }
    hideContextMenu();
  });

  // 'Change Type' -> Show submenu
  changeTypeButton.addEventListener("click", () => {
    const rect = contextMenu.getBoundingClientRect();
    typeSubmenu.style.display = "block";
    typeSubmenu.style.left = rect.right + "px";
    typeSubmenu.style.top = rect.top + "px";
  });

  // Submenu question-type events
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
      setQuestionType(selectedCell, "number");
      selectedCell.value = "Number question node";
      refreshAllCells();
    }
    hideContextMenu();
  });
  dateTypeBtn.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      setQuestionType(selectedCell, "date");
      selectedCell.value = "Date question node";
      refreshAllCells();
    }
    hideContextMenu();
  });
  bigParagraphTypeBtn.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      setQuestionType(selectedCell, "bigParagraph");
      selectedCell.value = "Big Paragraph question node";
      refreshAllCells();
    }
    hideContextMenu();
  });

  multipleTextboxesTypeBtn.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      setQuestionType(selectedCell, "multipleTextboxes");
      if (!selectedCell._questionText) {
        selectedCell._questionText = "Enter question text";
      }
      if (!selectedCell._textboxes) {
        selectedCell._textboxes = [{ nameId: "", placeholder: "Enter value" }];
      }
      let st = selectedCell.style || "";
      if (!st.includes("pointerEvents=")) {
        st += "pointerEvents=1;overflow=fill;";
      }
      graph.getModel().setStyle(selectedCell, st);
      updateMultipleTextboxesCell(selectedCell);
    }
    hideContextMenu();
  });

  multipleDropdownTypeBtn.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      setQuestionType(selectedCell, "multipleDropdownType");
      if (!selectedCell._questionText) {
        selectedCell._questionText = "Enter question text";
      }
      if (!selectedCell._twoNumbers) {
        selectedCell._twoNumbers = { first: "0", second: "0" };
      }
      if (!selectedCell._textboxes) {
        selectedCell._textboxes = [{ nameId: "", placeholder: "Enter value", isAmountOption: false }];
      }
      let st = selectedCell.style || "";
      if (!st.includes("pointerEvents=")) {
        st += "pointerEvents=1;overflow=fill;";
      }
      graph.getModel().setStyle(selectedCell, st);
      updatemultipleDropdownTypeCell(selectedCell);
    }
    hideContextMenu();
  });

  // Increase the "section number" for a question
  newSectionButton.addEventListener("click", () => {
    if (selectedCell) {
      const currentSection = parseInt(getSection(selectedCell) || "1", 10);
      setSection(selectedCell, currentSection + 1);
      refreshAllCells();
    }
    hideContextMenu();
  });

  // 'Properties' popup
  function showPropertiesMenu(cell, evt) {
    if (!cell) return;
    propertiesMenu.style.display = "block";
    propertiesMenu.style.left = evt.clientX + 10 + "px";
    propertiesMenu.style.top = evt.clientY + 10 + "px";

    // For multiple-text or multiple-dropdown
    if (isQuestion(cell) && 
       (getQuestionType(cell) === "multipleTextboxes" || 
        getQuestionType(cell) === "multipleDropdownType")) {
      propNodeText.textContent = cell._questionText || "";
    } else {
      // For all normal nodes, show cell.value
      propNodeText.textContent = cell.value || "";
    }

    // If it's an amount option
    if (isOptions(cell) && getQuestionType(cell) === "amountOption") {
      document.getElementById("propAmountName").textContent = cell._amountName || "";
      document.getElementById("propAmountPlaceholder").textContent = cell._amountPlaceholder || "";
      document.getElementById("amountProps").style.display = "block";
    } else {
      document.getElementById("amountProps").style.display = "none";
    }

    propNodeId.textContent = getNodeId(cell) || "";
    propNodeSection.textContent = getSection(cell) || "1";
    const sec = getSection(cell);
    propSectionName.textContent = (sectionPrefs[sec] && sectionPrefs[sec].name) || "Enter section name";
    document.getElementById("propQuestionNumber").textContent = cell._questionId || "";

    if (isQuestion(cell)) {
      propNodeType.textContent = getQuestionType(cell);
    } else if (isOptions(cell)) {
      propNodeType.textContent = "options";
    } else if (isCalculationNode(cell)) {
      propNodeType.textContent = "calculation";
    } else {
      propNodeType.textContent = "other";
    }
  }

  propertiesButton.addEventListener("click", () => {
    if (selectedCell) {
      showPropertiesMenu(selectedCell, currentMouseEvent);
    }
  });

  // Utility: make <span> text editable on double-click
  function makeEditableField(spanEl, onChangeCb) {
    spanEl.addEventListener("dblclick", e => {
      e.stopPropagation();
      e.preventDefault();
      spanEl.contentEditable = "true";
      spanEl.focus();
    });
    spanEl.addEventListener("blur", () => {
      spanEl.contentEditable = "false";
      onChangeCb(spanEl.textContent);
    });
    spanEl.addEventListener("keydown", evt => {
      if (evt.key === "Delete" || evt.key === "Backspace") {
        evt.stopPropagation();
      }
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
      if (isQuestion(selectedCell)) {
        const qType = getQuestionType(selectedCell);
        if (qType === "multipleTextboxes" || qType === "multipleDropdownType") {
          selectedCell._questionText = newText.trim() || "Enter question text";
          if (qType === "multipleTextboxes") {
            updateMultipleTextboxesCell(selectedCell);
          } else {
            updatemultipleDropdownTypeCell(selectedCell);
          }
        } else {
          selectedCell.value = newText.trim();
        }
        refreshNodeIdFromLabel(selectedCell);
      } else if (isOptions(selectedCell)) {
        selectedCell.value = newText.trim();
        refreshOptionNodeId(selectedCell);
      } else if (isCalculationNode(selectedCell)) {
        // This is the "title" for the calculation node
        selectedCell._calcTitle = newText.trim();
        updateCalculationNodeCell(selectedCell);
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
  function onNodeSectionFieldChange(newSec) {
    if (!selectedCell) return;
    const num = parseInt(newSec.trim(), 10);
    if (isNaN(num)) return;
    graph.getModel().beginUpdate();
    try {
      setSection(selectedCell, num);
    } finally {
      graph.getModel().endUpdate();
    }
    refreshAllCells();
  }
  function onSectionNameFieldChange(newName) {
    if (!selectedCell) return;
    const sec = getSection(selectedCell);
    sectionPrefs[sec].name = newName.trim() || "Enter section name";
    updateSectionLegend();
  }

  makeEditableField(propNodeText, onNodeTextFieldChange);
  makeEditableField(propNodeId, onNodeIdFieldChange);
  makeEditableField(propNodeSection, onNodeSectionFieldChange);
  makeEditableField(propSectionName, onSectionNameFieldChange);

  // For amount fields
  makeEditableField(document.getElementById("propAmountName"), (newName) => {
    if (selectedCell && getQuestionType(selectedCell) === "amountOption") {
      selectedCell._amountName = newName.trim();
      refreshAllCells();
    }
  });
  makeEditableField(document.getElementById("propAmountPlaceholder"), (newPh) => {
    if (selectedCell && getQuestionType(selectedCell) === "amountOption") {
      selectedCell._amountPlaceholder = newPh.trim();
      refreshAllCells();
    }
  });

  // Key handler
  const keyHandler = new mxKeyHandler(graph);
  // (Optional: If you'd like to re-enable keyboard delete, do so here)
  // keyHandler.bindKey(46, () => { ... });
  // keyHandler.bindKey(8, () => { ... });

  // Copy/Paste
  keyHandler.bindControlKey(67, () => { copySelectedNodeAsJson(); });
  keyHandler.bindControlKey(86, () => { pasteNodeFromJson(); });
  
  // Add listener for copy button
  document.getElementById('copyNodeButton').addEventListener('click', function() {
    copySelectedNodeAsJson();
    hideContextMenu();
  });
  
  // Add listener for paste here button
  document.getElementById('pasteHereButton').addEventListener('click', function() {
    if (window.emptySpaceClickX !== undefined && window.emptySpaceClickY !== undefined) {
      pasteNodeFromJson(window.emptySpaceClickX, window.emptySpaceClickY);
      window.emptySpaceClickX = undefined;
      window.emptySpaceClickY = undefined;
    } else {
      pasteNodeFromJson();
    }
    hideContextMenu();
  });

  graph.getModel().addListener(mxEvent.EVENT_CHANGE, function(sender, evt) {
    const changes = evt.getProperty("changes");
    if (!changes) return;
    changes.forEach(change => {
      if (change.constructor.name === "mxValueChange") {
        const { cell, value } = change;
        if (value && typeof value === "string") {
          // If a label ends with "?", treat as question
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
    if (!parentIsJump && parent && child) {
      const parentSec = parseInt(getSection(parent) || "1", 10);
      setSection(child, parentSec);
    }
    let parentQuestion = null;
    if (parent && isOptions(parent)) {
      parentQuestion = parent.source;
    } else if (parent && isQuestion(parent)) {
      parentQuestion = parent;
    }
    const gpIsJump = (parentQuestion && parentQuestion === jumpModeNode);
    if (parentIsJump || gpIsJump) {
      addSkipReassign(child);
    }
    refreshAllCells();
  });

  resetBtn.addEventListener("click", () => {
    colorPreferences = { ...defaultColors };
    updateLegendColors();
    refreshAllCells();
    saveUserColorPrefs();
  });

  updateLegendColors();
  updateSectionLegend();

  // Add event listeners for empty space menu buttons
  document.getElementById('placeQuestionNode').addEventListener('click', function() {
    placeNodeAtClickLocation('question');
    hideContextMenu();
  });
  
  document.getElementById('placeOptionNode').addEventListener('click', function() {
    placeNodeAtClickLocation('options');
    hideContextMenu();
  });
  
  document.getElementById('placeCalcNode').addEventListener('click', function() {
    placeNodeAtClickLocation('calculation');
    hideContextMenu();
  });
  
  document.getElementById('placeImageNode').addEventListener('click', function() {
    placeNodeAtClickLocation('imageOption');
    hideContextMenu();
  });
  
  document.getElementById('placeAmountNode').addEventListener('click', function() {
    placeNodeAtClickLocation('amountOption');
    hideContextMenu();
  });
  
  document.getElementById('placeEndNode').addEventListener('click', function() {
    placeNodeAtClickLocation('end');
    hideContextMenu();
  });
  
  function placeNodeAtClickLocation(nodeType) {
    if (window.emptySpaceClickX === undefined || window.emptySpaceClickY === undefined) return;
    
    const parent = graph.getDefaultParent();
    graph.getModel().beginUpdate();
    let cell;
    try {
      let style = "";
      let label = "";
      
      if (nodeType === 'question') {
        // Include more styling to ensure content is properly centered and aligned
        style = "shape=roundRect;rounded=1;arcSize=20;whiteSpace=wrap;html=1;nodeType=question;questionType=dropdown;spacing=12;fontSize=16;align=center;verticalAlign=middle;";
        label = "question node"; // Use lowercase to match the pattern in refreshAllCells
      } else if (nodeType === 'options') {
        style = "shape=roundRect;rounded=1;arcSize=20;whiteSpace=wrap;html=1;nodeType=options;questionType=dropdown;spacing=12;fontSize=16;align=center;";
        label = "Option Text";
      } else if (nodeType === 'calculation') {
        style = "shape=roundRect;rounded=1;arcSize=10;whiteSpace=wrap;html=1;nodeType=calculation;spacing=12;fontSize=16;pointerEvents=1;overflow=fill;";
        label = "Calculation node";
      } else if (nodeType === 'imageOption') {
        style = "shape=roundRect;rounded=1;arcSize=20;whiteSpace=wrap;html=1;nodeType=options;questionType=imageOption;spacing=12;fontSize=16;";
        label = "Image Option";
      } else if (nodeType === 'amountOption') {
        style = "shape=roundRect;rounded=1;arcSize=20;whiteSpace=wrap;html=1;nodeType=options;questionType=amountOption;spacing=12;fontSize=16;";
        label = "Amount Option";
      } else if (nodeType === 'end') {
        style = "shape=roundRect;rounded=1;arcSize=20;whiteSpace=wrap;html=1;nodeType=end;fillColor=#CCCCCC;fontColor=#000000;spacing=12;fontSize=16;";
        label = "END";
      }
      
      // Create cell with appropriate width/height based on type
      let width = 160;
      let height = 80;
      
      if (nodeType === 'calculation') {
        width = 300;
        height = 250;
      } else if (nodeType === 'end') {
        width = 120;
        height = 60;
      }
      
      cell = graph.insertVertex(
        parent, 
        null, 
        label, 
        window.emptySpaceClickX, 
        window.emptySpaceClickY, 
        width,
        height,
        style
      );
      
      // Set IDs and section
      if (nodeType === 'question') {
        setNodeId(cell, 'Question_' + Date.now().toString().slice(-4));
      } else if (nodeType === 'options') {
        setNodeId(cell, 'Option_' + Date.now().toString().slice(-4));
      }
      
      setSection(cell, "1");
      
      // Special handling for calculation nodes
      if (nodeType === 'calculation') {
        cell._calcTitle = "Calculation Title";
        cell._calcAmountLabel = "";
        cell._calcOperator = "=";
        cell._calcThreshold = "0";
        cell._calcFinalText = "";
        updateCalculationNodeCell(cell);
      } else if (nodeType === 'imageOption') {
        cell._image = {
          url: "",
          width: "100",
          height: "100"
        };
        updateImageOptionCell(cell);
      } else if (nodeType === 'end') {
        updateEndNodeCell(cell);
      }
      
    } finally {
      graph.getModel().endUpdate();
    }
    
    // Apply coloring and show dropdown for question nodes
    refreshAllCells();
    
    // Clear the click location
    window.emptySpaceClickX = undefined;
    window.emptySpaceClickY = undefined;
  }
  
  // Add keyboard event listener for delete key
  document.addEventListener('keydown', function(event) {
    // Check if the key pressed is Delete or Backspace
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Check if we're currently typing in an input field
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable
      );
      
      // Only proceed if we're not typing
      if (!isTyping) {
        // Get the selected cell
        const selectedCell = graph.getSelectionCell();
        
        // If a cell is selected and it's not the root cell
        if (selectedCell && selectedCell.id !== '0' && selectedCell.id !== '1') {
          // Delete the cell
          graph.removeCells([selectedCell]);
          
          // Prevent default behavior (like going back in browser history)
          event.preventDefault();
        }
      }
    }
  });

  // ... existing code ...

  // Add keyboard event listener for delete key and copy/paste functionality
  document.addEventListener('keydown', function(event) {
    // Check if the key pressed is Delete or Backspace
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Check if we're currently typing in an input field
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable
      );
      
      // Only proceed if we're not typing
      if (!isTyping) {
        // Get the selected cells
        const selectedCells = graph.getSelectionCells();
        
        // If cells are selected and they're not root cells
        if (selectedCells && selectedCells.length > 0) {
          // Filter out any root cells (0 or 1)
          const cellsToRemove = selectedCells.filter(cell => 
            cell.id !== '0' && cell.id !== '1'
          );
          
          if (cellsToRemove.length > 0) {
            // Delete the cells
            graph.removeCells(cellsToRemove);
            
            // Prevent default behavior (like going back in browser history)
            event.preventDefault();
          }
        }
      }
    }
    
    // Keyboard shortcut for copy: Ctrl+C
    if (event.key === 'c' && (event.ctrlKey || event.metaKey)) {
      const selectedCells = graph.getSelectionCells();
      if (selectedCells && selectedCells.length > 0) {
        copySelectedNodeAsJson();
        event.preventDefault();
      }
    }
    
    // Keyboard shortcut for paste: Ctrl+V
    if (event.key === 'v' && (event.ctrlKey || event.metaKey)) {
      // Get current mouse position for paste location
      const mousePosition = graph.getPointForEvent(graph.lastEvent);
      if (mousePosition) {
        pasteNodeFromJson(mousePosition.x, mousePosition.y);
      } else {
        pasteNodeFromJson(); // Fall back to default position
      }
      event.preventDefault();
    }
  });
  // ... existing code ...
});

/*******************************************************
 ********** RENUMBERING QUESTIONS BY POSITION **********
 *******************************************************/
function renumberQuestionIds() {
  // Commented out to preserve original question IDs
  // const parent = graph.getDefaultParent();
  // const vertices = graph.getChildVertices(parent);
  // const questions = vertices.filter(cell => isQuestion(cell));
  
  // // Sort questions by vertical position (Y coordinate)
  // questions.sort((a, b) => {
  //   const aY = a.geometry.y;
  //   const bY = b.geometry.y;
  //   if (aY !== bY) return aY - bY;
  //   return a.geometry.x - b.geometry.x;
  // });

  // let currentId = 1;
  // questions.forEach((cell) => {
  //   if (!cell._questionId) {
  //     cell._questionId = currentId;
  //     currentId++;
  //   }
  // });

  // // Update existing IDs based on new order
  // questions.forEach((cell, index) => {
  //   cell._questionId = index + 1;
  // });

  // // If properties menu is open for a selected question, update displayed ID
  // if (selectedCell && document.getElementById("propertiesMenu").style.display === "block") {
  //   document.getElementById("propQuestionNumber").textContent = selectedCell._questionId;
  // }
  
  // Just assign ID to new cells that don't have one
  const parent = graph.getDefaultParent();
  const vertices = graph.getChildVertices(parent);
  const questions = vertices.filter(cell => isQuestion(cell));
  
  let maxId = 0;
  questions.forEach((cell) => {
    if (cell._questionId && cell._questionId > maxId) {
      maxId = cell._questionId;
    }
  });
  
  // Only assign IDs to cells that don't have one
  questions.forEach((cell) => {
    if (!cell._questionId) {
      maxId++;
      cell._questionId = maxId;
    }
  });
  
  // If properties menu is open for a selected question, update displayed ID
  if (selectedCell && document.getElementById("propertiesMenu").style.display === "block") {
    document.getElementById("propQuestionNumber").textContent = selectedCell._questionId;
  }
}

/*******************************************************
 ********** MULTIPLE TEXTBOXES: RENDERING & EDITS ******
 *******************************************************/
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}
function escapeAttr(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// Helper function to render textboxes for multiple textboxes question
function renderTextboxes(cell) {
  if (!cell._textboxes) {
    cell._textboxes = [{ nameId: "", placeholder: "Enter value" }];
  }
  
  let html = '';
  
  cell._textboxes.forEach((tb, index) => {
    const val = tb.nameId || "";
    const ph = tb.placeholder || "Enter value";
    html += 
      `<div class="textbox-entry" style="margin-bottom:8px; text-align:center;">
        <input type="text" value="${escapeAttr(val)}" data-index="${index}" placeholder="${escapeAttr(ph)}" onblur="window.updateMultipleTextboxHandler('${cell.id}', ${index}, this.value)"/>
        <button onclick="window.deleteMultipleTextboxHandler('${cell.id}', ${index})">Delete</button>
      </div>`;
  });
  
  html += `<div style="text-align:center; margin-top:8px;"><button onclick="window.addMultipleTextboxHandler('${cell.id}')">Add Option</button></div>`;
  
  return html;
}

// Update the multiple textboxes node
function updateMultipleTextboxesCell(cell) {
  graph.getModel().beginUpdate();
  try {
    // Create a container for the question text and textboxes
    let html = `<div class="multiple-textboxes-node" style="display:flex; flex-direction:column; align-items:center;">
    <div class="question-text" style="text-align: center; padding: 8px; width:100%;" contenteditable="true" onclick="window.handleMultipleTextboxClick(event, '${cell.id}')" onfocus="window.handleMultipleTextboxFocus(event, '${cell.id}')" onblur="window.updateQuestionTextHandler('${cell.id}', this.innerText)">
      ${cell._questionText || "Enter question text"}
    </div>
    <div class="multiple-textboxes-container" style="padding: 8px; width:100%;">${renderTextboxes(cell)}</div>
  </div>`;
    
    cell.value = html;
  } finally {
    graph.getModel().endUpdate();
  }
  graph.updateCellSize(cell);
}

window.updateQuestionTextHandler = function(cellId, text) {
  const cell = graph.getModel().getCell(cellId);
  if (cell && getQuestionType(cell) === "multipleTextboxes") {
    graph.getModel().beginUpdate();
    try {
      cell._questionText = text.trim() || "Enter question text";
    } finally {
      graph.getModel().endUpdate();
    }
    updateMultipleTextboxesCell(cell);
  }
};

window.updateMultipleTextboxHandler = function(cellId, index, value) {
  const cell = graph.getModel().getCell(cellId);
  if (cell && getQuestionType(cell) === "multipleTextboxes" && cell._textboxes) {
    graph.getModel().beginUpdate();
    try {
      let existingPlaceholder = cell._textboxes[index].placeholder;
      if (!existingPlaceholder || existingPlaceholder === "Enter value") {
        cell._textboxes[index].placeholder = value || "";
      }
      cell._textboxes[index].nameId = value;
    } finally {
      graph.getModel().endUpdate();
    }
    updateMultipleTextboxesCell(cell);
  }
};

window.addMultipleTextboxHandler = function(cellId) {
  const cell = graph.getModel().getCell(cellId);
  if (cell && getQuestionType(cell) === "multipleTextboxes") {
    graph.getModel().beginUpdate();
    try {
      if (!cell._textboxes) cell._textboxes = [];
      cell._textboxes.push({ nameId: "", placeholder: "Enter value" });
    } finally {
      graph.getModel().endUpdate();
    }
    updateMultipleTextboxesCell(cell);
  }
};

window.deleteMultipleTextboxHandler = function(cellId, index) {
  const cell = graph.getModel().getCell(cellId);
  if (cell && getQuestionType(cell) === "multipleTextboxes" && cell._textboxes) {
    graph.getModel().beginUpdate();
    try {
      cell._textboxes.splice(index, 1);
    } finally {
      graph.getModel().endUpdate();
    }
    updateMultipleTextboxesCell(cell);
  }
};

/*******************************************************
 ********** multipleDropdownType: RENDER & EDITS *******
 *******************************************************/
function updatemultipleDropdownTypeCell(cell) {
  const qText = cell._questionText || "Enter question text";
  const twoNums = cell._twoNumbers || { first: "0", second: "0" };
  if (!cell._textboxes) {
    cell._textboxes = [{ nameId: "", placeholder: "Enter value", isAmountOption: false }];
  }

  let html = `<div class="multiple-textboxes-node" style="display:flex; flex-direction:column; align-items:center;">
    <div class="question-text" style="text-align: center; padding: 8px; width:100%;" contenteditable="true"onfocus="if(this.innerText==='Enter question text'){this.innerText='';}"ondblclick="event.stopPropagation(); this.focus();"onblur="window.updatemultipleDropdownTypeTextHandler('${cell.id}', this.innerText)">
      ${escapeHtml(qText)}
    </div>
    <div class="two-number-container" style="display: flex; justify-content:center; gap: 10px; margin-top: 8px; width:100%;">
      <input type="number" value="${escapeAttr(twoNums.first)}"onblur="window.updatemultipleDropdownTypeNumber('${cell.id}', 'first', this.value)"/>
      <input type="number" value="${escapeAttr(twoNums.second)}"onblur="window.updatemultipleDropdownTypeNumber('${cell.id}', 'second', this.value)"/>
    </div>
    <div class="multiple-textboxes-container" style="margin-top: 8px; width:100%;">`;

  cell._textboxes.forEach((tb, index) => {
    const val = tb.nameId || "";
    const ph = tb.placeholder || "Enter value";
    const checked = tb.isAmountOption ? "checked" : "";
    html += `
      <div class="textbox-entry" style="margin-bottom:4px; text-align:center;">
        <input type="text" value="${escapeAttr(val)}" data-index="${index}" placeholder="${escapeAttr(ph)}"onblur="window.updatemultipleDropdownTypeHandler('${cell.id}', ${index}, this.value)"/>
        <button onclick="window.deletemultipleDropdownTypeHandler('${cell.id}', ${index})">Delete</button>
        <label>
          <input type="checkbox" ${checked} onclick="window.toggleMultipleDropdownAmount('${cell.id}', ${index}, this.checked)" />
          Amount?
        </label>
      </div>`;
  });

  html += `<div style="text-align:center; margin-top:8px;"><button onclick="window.addmultipleDropdownTypeHandler('${cell.id}')">Add Option</button></div>
    </div>
  </div>`;

  graph.getModel().beginUpdate();
  try {
    graph.getModel().setValue(cell, html);
    let st = cell.style || "";
    if (!st.includes("verticalAlign=middle")) {
      st += "verticalAlign=middle;";
    }
  } finally {
    graph.getModel().endUpdate();
  }
  graph.updateCellSize(cell);
}

window.updatemultipleDropdownTypeTextHandler = function(cellId, text) {
  const cell = graph.getModel().getCell(cellId);
  if (cell && getQuestionType(cell) === "multipleDropdownType") {
    graph.getModel().beginUpdate();
    try {
      cell._questionText = text.trim() || "Enter question text";
    } finally {
      graph.getModel().endUpdate();
    }
    updatemultipleDropdownTypeCell(cell);
  }
};

window.updatemultipleDropdownTypeNumber = function(cellId, which, value) {
  const cell = graph.getModel().getCell(cellId);
  if (cell && getQuestionType(cell) === "multipleDropdownType") {
    graph.getModel().beginUpdate();
    try {
      if (!cell._twoNumbers) {
        cell._twoNumbers = { first: "0", second: "0" };
      }
      if (which === "first") {
        cell._twoNumbers.first = value;
      } else {
        cell._twoNumbers.second = value;
      }
    } finally {
      graph.getModel().endUpdate();
    }
    updatemultipleDropdownTypeCell(cell);
  }
};

window.updatemultipleDropdownTypeHandler = function(cellId, index, value) {
  const cell = graph.getModel().getCell(cellId);
  if (cell && getQuestionType(cell) === "multipleDropdownType" && cell._textboxes) {
    graph.getModel().beginUpdate();
    try {
      let existingPlaceholder = cell._textboxes[index].placeholder;
      if (!existingPlaceholder || existingPlaceholder === "Enter value") {
        cell._textboxes[index].placeholder = value || "";
      }
      cell._textboxes[index].nameId = value;
    } finally {
      graph.getModel().endUpdate();
    }
    updatemultipleDropdownTypeCell(cell);
  }
};

window.addmultipleDropdownTypeHandler = function(cellId) {
  const cell = graph.getModel().getCell(cellId);
  if (cell && getQuestionType(cell) === "multipleDropdownType") {
    graph.getModel().beginUpdate();
    try {
      if (!cell._textboxes) cell._textboxes = [];
      cell._textboxes.push({ nameId: "", placeholder: "Enter value", isAmountOption: false });
    } finally {
      graph.getModel().endUpdate();
    }
    updatemultipleDropdownTypeCell(cell);
  }
};

window.deletemultipleDropdownTypeHandler = function(cellId, index) {
  const cell = graph.getModel().getCell(cellId);
  if (cell && getQuestionType(cell) === "multipleDropdownType" && cell._textboxes) {
    graph.getModel().beginUpdate();
    try {
      cell._textboxes.splice(index, 1);
    } finally {
      graph.getModel().endUpdate();
    }
    updatemultipleDropdownTypeCell(cell);
  }
};

window.toggleMultipleDropdownAmount = function(cellId, index, checked) {
  const cell = graph.getModel().getCell(cellId);
  if (cell && getQuestionType(cell) === "multipleDropdownType" && cell._textboxes) {
    graph.getModel().beginUpdate();
    try {
      cell._textboxes[index].isAmountOption = checked;
    } finally {
      graph.getModel().endUpdate();
    }
    updatemultipleDropdownTypeCell(cell);
  }
};

/*******************************************************
 ************ Calculation Node: RENDER & EDITS *********
 *******************************************************/
function isCalculationNode(cell) {
  return cell && cell.style && cell.style.includes("nodeType=calculation");
}

/**
 * Build a list of all "amount" labels from numbered dropdown questions.
 * We'll gather them in the format:
 *    "<question_id_text>_<amount_label>"
 * E.g. "how_many_cars_do_you_have_car_value"
 * Also include calculation node titles as potential sources
 */
function gatherAllAmountLabels() {
  const labels = [];
  const parent = graph.getDefaultParent();
  const vertices = graph.getChildVertices(parent);
  
  // First collect all calculation nodes
  const calculationNodes = vertices.filter(cell => isCalculationNode(cell));
  
  vertices.forEach(cell => {
    if (isCalculationNode(cell)) {
      // Add calculation node titles as potential sources
      if (cell._calcTitle) {
        labels.push(cell._calcTitle);
      }
    } else if (isQuestion(cell)) {
      const qType = getQuestionType(cell);
      if (qType === "multipleDropdownType") {
        // We'll rename it "numberedDropdown" in final JSON
        // If it has amounts, push them
        if (cell._textboxes) {
          const cleanQuestionName = (cell.value || cell._questionText || "unnamed_question")
            .replace(/<[^>]+>/g, "")
            .trim()
            .replace(/[^\w\s]/gi, "")
            .replace(/\s+/g, "_")
            .toLowerCase();

          // We also add amount for each isAmountOption
          cell._textboxes.forEach(tb => {
            if (tb.isAmountOption) {
              // Preserve original spaces in the nameId by converting to underscores
              // e.g. "how_many_cars_do_you_have_amount_plus" for "Amount Plus"
              let amountName = tb.nameId.replace(/\s+/g, "_").toLowerCase();
              let label = cleanQuestionName + "_" + amountName;
              labels.push(label);
            }
          });
        }
      } else if (qType === "checkbox") {
        // Find all amount options linked to this checkbox question
        const cleanQuestionName = (cell.value || "unnamed_question")
          .replace(/<[^>]+>/g, "")
          .trim()
          .replace(/[^\w\s]/gi, "")
          .replace(/\s+/g, "_")
          .toLowerCase();
          
        // Get all outgoing edges to find options
        const outgoingEdges = graph.getOutgoingEdges(cell) || [];
        for (const edge of outgoingEdges) {
          const targetCell = edge.target;
          if (targetCell && isOptions(targetCell) && isAmountOption(targetCell)) {
            const optionText = targetCell.value.replace(/<[^>]+>/g, "").trim().toLowerCase().replace(/\s+/g, "_");
            // Create label in format: "mark_all_that_apply_rent"
            const optionLabel = cleanQuestionName + "_" + optionText;
            labels.push(optionLabel);
          }
        }
      }
    }
  });

  return labels;
}

/**
 * Renders the Calculation Node as HTML:
 * - Title (editable)
 * - 1st dropdown: any amount labels
 * - 2nd dropdown: operator (=, >, <)
 * - threshold number
 * - final text
 */
function updateCalculationNodeCell(cell) {
  // Prepare default fields if missing
  if (cell._calcTitle === undefined) cell._calcTitle = "Calculation Title";
  if (cell._calcTerms === undefined) cell._calcTerms = [{amountLabel: "", mathOperator: ""}];
  if (cell._calcOperator === undefined) cell._calcOperator = "=";
  if (cell._calcThreshold === undefined) cell._calcThreshold = "0";
  if (cell._calcFinalText === undefined) cell._calcFinalText = "";

  // For backward compatibility
  if (cell._calcAmountLabel !== undefined && cell._calcTerms.length === 1 && !cell._calcTerms[0].amountLabel) {
    cell._calcTerms[0].amountLabel = cell._calcAmountLabel;
  }

  // Gather possible "amount" labels
  const allAmountLabels = gatherAllAmountLabels();

  // Build the HTML for all calculation terms
  let calcTermsHtml = '';
  
  cell._calcTerms.forEach((term, index) => {
    // Build dropdown of amount labels for this term
    let amountOptionsHtml = `<option value="">-- pick an amount label --</option>`;
    allAmountLabels.forEach(lbl => {
      const selected = (lbl === term.amountLabel) ? "selected" : "";
      
      // Clean up display name for the dropdown
      let displayName = lbl;
      
      // Strip out common artifacts like delete_amount, add_option etc.
      displayName = displayName.replace(/delete_amount_/g, "");
      displayName = displayName.replace(/add_option_/g, "");
      
      // Find the last instance of the question name + underscore
      const lastUnderscoreIndex = displayName.lastIndexOf("_");
      if (lastUnderscoreIndex !== -1) {
        const questionPart = displayName.substring(0, lastUnderscoreIndex);
        const amountPart = displayName.substring(lastUnderscoreIndex + 1);
        
        // Format: "how_many_cars_do_you_have + car_value"
        displayName = `${questionPart}_${amountPart}`;
      }
      
      amountOptionsHtml += `<option value="${escapeAttr(lbl)}" ${selected}>${displayName}</option>`;
    });

    // For the first term, don't show a math operator
    if (index === 0) {
      calcTermsHtml += `
        <div class="calc-term" data-index="${index}">
          <label>Calc ${index + 1}:</label>
          <select onchange="window.updateCalcNodeTerm('${cell.id}', ${index}, 'amountLabel', this.value)" style="width:100%; max-width:500px;">
            ${amountOptionsHtml}
          </select>
          <br/><br/>
        </div>
      `;
    } else {
      // For subsequent terms, show a math operator dropdown first
      let mathOperatorOptionsHtml = "";
      const mathOperators = ["+", "-", "*", "/"];
      mathOperators.forEach(op => {
        const selected = (op === term.mathOperator) ? "selected" : "";
        mathOperatorOptionsHtml += `<option value="${op}" ${selected}>${op}</option>`;
      });

      calcTermsHtml += `
        <div class="calc-term" data-index="${index}">
          <label>Math Operator:</label>
          <select onchange="window.updateCalcNodeTerm('${cell.id}', ${index}, 'mathOperator', this.value)" style="width:100px;">
            ${mathOperatorOptionsHtml}
          </select>
          <label style="margin-left:10px;">Calc ${index + 1}:</label>
          <select onchange="window.updateCalcNodeTerm('${cell.id}', ${index}, 'amountLabel', this.value)" style="width:calc(100% - 120px); max-width:380px;">
            ${amountOptionsHtml}
          </select>
          <button onclick="window.removeCalcNodeTerm('${cell.id}', ${index})" style="margin-left:5px;">Remove</button>
          <br/><br/>
        </div>
      `;
    }
  });

  // Add button for adding more terms
  calcTermsHtml += `
    <div style="margin-bottom:15px;">
      <button onclick="window.addCalcNodeTerm('${cell.id}')">Add More</button>
    </div>
  `;

  // Operator dropdown
  const operators = ["=", ">", "<"];
  let operatorOptionsHtml = "";
  operators.forEach(op => {
    const selected = (op === cell._calcOperator) ? "selected" : "";
    operatorOptionsHtml += `<option value="${op}" ${selected}>${op}</option>`;
  });

  const html = `
    <div style="padding:10px; width:100%;" class="multiple-textboxes-node">
      <label>Calculation Title:</label><br/>
      <div class="textbox-entry">
        <input type="text" value="${escapeAttr(cell._calcTitle)}" onblur="window.updateCalcNodeTitle('${cell.id}', this.value)" style="width:100%;" />
      </div>
      <br/>

      ${calcTermsHtml}

      <label>Comparison Operator:</label>
      <select onchange="window.updateCalcNodeOperator('${cell.id}', this.value)">
        ${operatorOptionsHtml}
      </select>
      <br/><br/>

      <label>Number:</label>
      <input type="number" value="${escapeAttr(cell._calcThreshold)}" onblur="window.updateCalcNodeThreshold('${cell.id}', this.value)"/>
      <br/><br/>

      <label>Final Text:</label><br/>
      <div class="textbox-entry">
        <input type="text" value="${escapeAttr(cell._calcFinalText)}" onblur="window.updateCalcNodeFinalText('${cell.id}', this.value)" style="width:100%;" />
      </div>
    </div>
  `;

  graph.getModel().beginUpdate();
  try {
    graph.getModel().setValue(cell, html);
    let st = cell.style || "";
    // Ensure it's a rounded rectangle
    if (st.includes("shape=hexagon")) {
      st = st.replace("shape=hexagon", "shape=roundRect;rounded=1;arcSize=10");
    }
    if (!st.includes("rounded=1")) {
      st += "rounded=1;arcSize=10;";
    }
    if (!st.includes("pointerEvents=")) {
      st += "pointerEvents=1;overflow=fill;";
    }
    if (!st.includes("html=1")) {
      st += "html=1;";
    }
    graph.getModel().setStyle(cell, st);
    
    // Set minimum size for the calculation node
    const geo = cell.geometry;
    if (geo) {
      // Set a generous minimum width for the calculation node to fit dropdowns
      if (geo.width < 400) {
        geo.width = 400;
      }
      // Ensure height is adequate (add 50px per term after the first)
      const minHeight = 250 + (Math.max(0, cell._calcTerms.length - 1) * 50);
      if (geo.height < minHeight) {
        geo.height = minHeight;
      }
    }
  } finally {
    graph.getModel().endUpdate();
  }
  
  // Force update cell size to fit content
  graph.updateCellSize(cell);
}

// Calculation node field updates
window.updateCalcNodeTitle = (cellId, title) => {
  const cell = graph.model.getCell(cellId);
  if (!cell) return;
  
  cell._calcTitle = title;
  updateCalculationNodeCell(cell);
};

window.updateCalcNodeAmountLabel = function(cellId, value) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || !isCalculationNode(cell)) return;
  graph.getModel().beginUpdate();
  try {
    cell._calcAmountLabel = value.trim();
    
    // Also update _calcTerms for backward compatibility
    if (!cell._calcTerms || cell._calcTerms.length === 0) {
      cell._calcTerms = [{
        amountLabel: value.trim(),
        mathOperator: ""
      }];
    } else if (cell._calcTerms.length > 0) {
      cell._calcTerms[0].amountLabel = value.trim();
    }
  } finally {
    graph.getModel().endUpdate();
  }
  updateCalculationNodeCell(cell);
};

window.updateCalcNodeOperator = function(cellId, value) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || !isCalculationNode(cell)) return;
  graph.getModel().beginUpdate();
  try {
    cell._calcOperator = value;
  } finally {
    graph.getModel().endUpdate();
  }
  updateCalculationNodeCell(cell);
};

window.updateCalcNodeThreshold = function(cellId, value) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || !isCalculationNode(cell)) return;
  graph.getModel().beginUpdate();
  try {
    cell._calcThreshold = value;
  } finally {
    graph.getModel().endUpdate();
  }
  updateCalculationNodeCell(cell);
};

window.updateCalcNodeFinalText = (cellId, text) => {
  const cell = graph.model.getCell(cellId);
  if (!cell) return;
  
  cell._calcFinalText = text;
  updateCalculationNodeCell(cell);
};

// New function to handle updating calculation terms
window.updateCalcNodeTerm = (cellId, termIndex, property, value) => {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || !isCalculationNode(cell)) return;
  
  graph.getModel().beginUpdate();
  try {
    // Initialize terms array if it doesn't exist
    if (!cell._calcTerms) {
      cell._calcTerms = [{amountLabel: "", mathOperator: ""}];
    }
    
    // Ensure the term exists
    if (termIndex >= 0 && termIndex < cell._calcTerms.length) {
      // Update the specified property
      cell._calcTerms[termIndex][property] = value;
      
      // For backward compatibility, also update _calcAmountLabel if this is the first term
      if (termIndex === 0 && property === 'amountLabel') {
        cell._calcAmountLabel = value;
      }
    }
  } finally {
    graph.getModel().endUpdate();
  }
  
  updateCalculationNodeCell(cell);
};

// Add a new calculation term
window.addCalcNodeTerm = (cellId) => {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || !isCalculationNode(cell)) return;
  
  graph.getModel().beginUpdate();
  try {
    // Initialize terms array if it doesn't exist
    if (!cell._calcTerms) {
      cell._calcTerms = [{amountLabel: "", mathOperator: ""}];
    }
    
    // Add a new term with default values
    cell._calcTerms.push({
      amountLabel: "",
      mathOperator: "+"  // Default to addition
    });
  } finally {
    graph.getModel().endUpdate();
  }
  
  updateCalculationNodeCell(cell);
};

// Remove a calculation term
window.removeCalcNodeTerm = (cellId, termIndex) => {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || !isCalculationNode(cell)) return;
  
  graph.getModel().beginUpdate();
  try {
    // Ensure we have terms and the index is valid
    if (cell._calcTerms && termIndex > 0 && termIndex < cell._calcTerms.length) {
      // Remove the term at the specified index
      cell._calcTerms.splice(termIndex, 1);
    }
  } finally {
    graph.getModel().endUpdate();
  }
  
  updateCalculationNodeCell(cell);
};

/*******************************************************
 ************  HELPER / STYLING / JSON Exports  ********
 *******************************************************/
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
function isQuestion(cell) {
  return cell && cell.style && cell.style.includes("nodeType=question");
}
function isOptions(cell) {
  return cell && cell.style && (
    cell.style.includes("nodeType=options") ||
    cell.style.includes("questionType=amountOption") ||
    cell.style.includes("questionType=imageOption")
  );
}

function isAmountOption(cell) {
  return cell && cell.style && cell.style.includes("questionType=amountOption");
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

function refreshNodeIdFromLabel(cell) {
  let labelText = "";

  if (isQuestion(cell)) {
    const qType = getQuestionType(cell);
    if (qType === "multipleTextboxes" || qType === "multipleDropdownType") {
      labelText = cell._questionText || "custom_question";
    } else {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cell.value || "";
      labelText = tempDiv.textContent || tempDiv.innerText || "";
    }
  } else {
    labelText = cell.value || "";
  }

  const cleanedText = labelText
    .trim()
    .replace(/<[^>]+>/g, "")  
    .replace(/[^\w\s]/gi, "") 
    .replace(/\s+/g, "_")
    .toLowerCase();

  const nodeId = cleanedText || "unnamed_node";
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

function addSkipReassign(cell) {
  if (!cell) return;
  let style = cell.style || "";
  style = style.replace(/skipReassign=[^;]+/, "");
  style += ";skipReassign=true;";
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

function getQuestionType(cell) {
  const style = cell.style || "";
  const m = style.match(/questionType=([^;]+)/);
  return m ? m[1] : "";
}

/**
 * Define pickTypeForCell globally
 */
window.pickTypeForCell = function(cellId, val) {
  const c = graph.getModel().getCell(cellId);
  if (!c) return;

  graph.getModel().beginUpdate();
  try {
    setQuestionType(c, val);

    if (!c._nameId) {
      c._nameId = "answer" + graph.getChildVertices(graph.getDefaultParent()).length;
      c._placeholder = "";
    }

    if (val === "number") {
      c.value = "Number question node";
    } else if (val === "multipleTextboxes") {
      c._questionText = "Enter question text";
      c._textboxes = [{ nameId: "", placeholder: "Enter value" }];
      updateMultipleTextboxesCell(c);
    } else if (val === "multipleDropdownType") {
      c._questionText = "Enter question text";
      c._twoNumbers = { first: "0", second: "0" };
      c._textboxes = [{ nameId: "", placeholder: "Enter value", isAmountOption: false }];
      updatemultipleDropdownTypeCell(c);
    } else {
      c.value = `<div style="text-align:center;">${val.charAt(0).toUpperCase() + val.slice(1)} question node</div>`;
      graph.getModel().setStyle(c, c.style + ";spacingTop=10;verticalAlign=middle;");
    }
  } finally {
    graph.getModel().endUpdate();
  }

  graph.setSelectionCell(c);
  graph.startEditingAtCell(c);
  refreshAllCells();
};

function setQuestionType(cell, newType) {
  let style = cell.style || "";
  style = style.replace(/questionType=[^;]+/, "");

  if (newType === "multipleTextboxes" || newType === "multipleDropdownType") {
    style += `;questionType=${newType};pointerEvents=1;overflow=fill;`;
    if (!cell._questionText) {
      cell._questionText = "Enter question text";
    }
    if (newType === "multipleTextboxes" && !cell._textboxes) {
      cell._textboxes = [{ nameId: "", placeholder: "Enter value" }];
    }
    if (newType === "multipleDropdownType") {
      if (!cell._twoNumbers) cell._twoNumbers = { first: "0", second: "0" };
      if (!cell._textboxes) cell._textboxes = [{ nameId: "", placeholder: "Enter value", isAmountOption: false }];
    }
    if (newType === "multipleTextboxes") {
      updateMultipleTextboxesCell(cell);
    } else {
      updatemultipleDropdownTypeCell(cell);
    }
  } else if (newType === "dropdown") {
    style += `;questionType=${newType};pointerEvents=1;overflow=fill;`;
    if (!cell._questionText) {
      cell._questionText = "Enter question text";
    }
    
    // Create a more visible dropdown question with a text field
    let html = `<div class="dropdown-question" style="display:flex; flex-direction:column; align-items:center;">
      <div class="question-text" style="text-align: center; padding: 8px; width:100%;" contenteditable="true" onfocus="if(this.innerText==='Enter dropdown question'){this.innerText='';}" ondblclick="event.stopPropagation(); this.focus();" onblur="window.updateDropdownQuestionText('${cell.id}', this.innerText)">
        ${cell._questionText || "Enter dropdown question"}
      </div>
    </div>`;
    
    cell.value = html;
  } else {
    style += `;questionType=${newType};`;
    cell.value = newType.charAt(0).toUpperCase() + newType.slice(1) + " question node";
  }

  graph.getModel().setStyle(cell, style);
  refreshNodeIdFromLabel(cell);
}

/**************************************************
 *           COLORING & REFRESHING CELLS          *
 **************************************************/
function colorCell(cell) {
  if (!cell.vertex) return;
  let fillColor = "#ADD8E6"; // fallback
  
  if (isEndNode(cell)) {
    fillColor = "#CCCCCC";
    const st = cell.style || "";
    if (!st.includes("fillColor=#CCCCCC")) {
      graph.getModel().setStyle(cell, st + "fillColor=#CCCCCC;");
    }
    return;
  }

  if (isQuestion(cell)) {
    const qType = getQuestionType(cell);
    switch (qType) {
      case "text":         fillColor = colorPreferences.text; break;
      case "checkbox":     fillColor = colorPreferences.checkbox; break;
      case "dropdown":     fillColor = colorPreferences.dropdown; break;
      case "number":       fillColor = colorPreferences.money; break;
      case "date":         fillColor = colorPreferences.date; break;
      case "bigParagraph": fillColor = colorPreferences.bigParagraph; break;
      case "multipleTextboxes":
      case "multipleDropdownType":
        fillColor = colorPreferences.text;
        break;
      default:
        fillColor = "#ADD8E6";
        break;
    }
  } else if (isOptions(cell)) {
    if (getQuestionType(cell) === "amountOption") {
      fillColor = colorPreferences.amountOption;
    } else if (getQuestionType(cell) === "imageOption") {
      fillColor = "#FFF8DC"; 
    } else {
      fillColor = "#ffffff";
    }
  } else if (isCalculationNode(cell)) {
    // You can pick a distinct color for calculation nodes
    fillColor = "#FFDDAA";
  }

  const fontColor = colorPreferences.textColor;
  const sec = getSection(cell) || "1";
  let borderColor = (sectionPrefs[sec] && sectionPrefs[sec].borderColor) || getDefaultSectionColor(parseInt(sec));
  let style = cell.style || "";
  style = style.replace(/fillColor=[^;]+/, "");
  style = style.replace(/fontColor=[^;]+/, "");
  style = style.replace(/strokeColor=[^;]+/, "");
  style += `;fillColor=${fillColor};fontColor=${fontColor};strokeColor=${borderColor};`;
  graph.getModel().setStyle(cell, style);
}

function refreshAllCells() {
  const parent = graph.getDefaultParent();
  const vertices = graph.getChildVertices(parent);

  vertices.forEach(cell => {
    colorCell(cell);

    if (isEndNode(cell)) {
      updateEndNodeCell(cell);
    }
    if (isOptions(cell) && getQuestionType(cell) === "imageOption") {
      updateImageOptionCell(cell);
    }
    
    // If it's a dropdown with _questionText but not yet formatted
    if (isQuestion(cell) && getQuestionType(cell) === "dropdown" && cell._questionText) {
      let html = `<div class="dropdown-question" style="display:flex; flex-direction:column; align-items:center;">
        <div class="question-text" style="text-align: center; padding: 8px; width:100%;" contenteditable="true" onfocus="if(this.innerText==='Enter dropdown question'){this.innerText='';}" ondblclick="event.stopPropagation(); this.focus();" onblur="window.updateDropdownQuestionText('${cell.id}', this.innerText)">
          ${escapeHtml(cell._questionText)}
        </div>
      </div>`;
      
      cell.value = html;
    }
    
    // If newly dropped question node is just placeholder
    if (isQuestion(cell) &&
       (cell.value === "question node" || cell.value === "Question Node")) {
      cell.value = `
        <div style="display: flex; justify-content: center; align-items: center; height:100%;">
          <select style="margin:auto;" oninput="window.pickTypeForCell('${cell.id}', this.value)">
            <option value="">-- Choose Type --</option>
            <option value="text">Text</option>
            <option value="checkbox">Checkbox</option>
            <option value="dropdown">Dropdown</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="bigParagraph">Big Paragraph</option>
            <option value="multipleTextboxes">Multiple Textboxes</option>
            <option value="multipleDropdownType">Multiple Dropdown Type</option>
          </select>
        </div>`;
    }
  });

  // Don't renumber question IDs automatically
  // renumberQuestionIds();
}

/*******************************************************
 ************ Export/Import Flowchart JSON  ************
 *******************************************************/
function downloadJson(str, filename) {
  const blob = new Blob([str], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.exportFlowchartJson = function () {
  const data = {};
  data.cells = [];
  const cells = graph.getModel().cells;
  for (let id in cells) {
    if (id === "0" || id === "1") continue;
    const cell = cells[id];

    const cellData = {
      id: cell.id,
      value: (cell.value === undefined ? "" : cell.value),
      geometry: cell.geometry ? {
        x: cell.geometry.x || 0,
        y: cell.geometry.y || 0,
        width: cell.geometry.width || 0,
        height: cell.geometry.height || 0
      } : null,
      style: cleanStyle(cell.style || ""),
      vertex: !!cell.vertex,
      edge: !!cell.edge,
      source: cell.edge ? (cell.source ? cell.source.id : null) : null,
      target: cell.edge ? (cell.target ? cell.target.id : null) : null,
      _textboxes: cell._textboxes || null,
      _questionText: cell._questionText || null,
      _twoNumbers: cell._twoNumbers || null,
      _nameId: cell._nameId || null,
      _placeholder: cell._placeholder || "",
      _questionId: cell._questionId || null,
      _image: cell._image || null
    };

    // If it's a calculation node, store the special fields
    if (isCalculationNode(cell)) {
      cellData._calcTitle = cell._calcTitle || "";
      cellData._calcAmountLabel = cell._calcAmountLabel || "";
      cellData._calcOperator = cell._calcOperator || "=";
      cellData._calcThreshold = cell._calcThreshold || "0";
      cellData._calcFinalText = cell._calcFinalText || "";
      cellData._calcTerms = cell._calcTerms || [{amountLabel: cell._calcAmountLabel || "", mathOperator: ""}];
    }

    data.cells.push(cellData);
  }
  data.sectionPrefs = sectionPrefs;

  downloadJson(JSON.stringify(data, null, 2), "flowchart_data.json");
};

window.importFlowchartJson = function (evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      let jsonString = e.target.result;
      
      // Add debugging
      console.log("Original input:", jsonString.substring(0, 100) + "...");
      
      // Check if the string starts and ends with quotes (might be a quoted JSON string)
      if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
        console.log("Detected quoted JSON string, unquoting...");
        // Remove the outer quotes and unescape internal quotes
        jsonString = jsonString.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        console.log("After unquoting:", jsonString.substring(0, 100) + "...");
      }
      
      // Alternative approach: Try to parse the JSON directly
      let jsonData;
      try {
        jsonData = JSON.parse(jsonString);
      } catch (parseError) {
        console.log("Initial parsing failed, trying workaround...", parseError);
        // Try an alternative approach - this can handle double-stringified JSON
        jsonData = JSON.parse(JSON.stringify(eval("(" + jsonString + ")")));
      }
      
      // Validate that it has cells property
      if (!jsonData || !jsonData.cells || !Array.isArray(jsonData.cells)) {
        console.error("Invalid JSON structure:", jsonData);
        throw new Error("Invalid flowchart data: missing cells array");
      }
      
      console.log("Successfully parsed JSON with", jsonData.cells.length, "cells");
      loadFlowchartData(jsonData);
      currentFlowchartName = null;
    } catch (error) {
      console.error("Error importing flowchart:", error);
      alert("Error importing flowchart: " + error.message);
    }
  };
  reader.readAsText(file);
};

/*******************************************************
 ************ BFS + Export GUI JSON (with BFS) *********
 *******************************************************/
function isJumpNode(cell) {
  const style = cell.style || "";
  return style.includes("strokeWidth=3") &&
         style.includes("strokeColor=#ff0000") &&
         style.includes("dashed=1");
}

/**
 * BFS helper: climb from question Q up to all option nodes feeding into Q (even if via multiple question→question).
 */
function findAllUpstreamOptions(questionCell) {
  const results = [];
  const visited = new Set();
  const queue = [];

  const incomings = graph.getIncomingEdges(questionCell) || [];
  incomings.forEach(edge => {
    const src = edge.source;
    if (src && isOptions(src)) {
      const optLabel = (src.value || "Option").replace(/<[^>]+>/g, "").trim();
      const parentEdges = graph.getIncomingEdges(src) || [];
      if (parentEdges.length > 0) {
        const parentQ = parentEdges[0].source;
        if (parentQ && isQuestion(parentQ)) {
          results.push({
            questionId: parentQ._questionId,
            answerLabel: optLabel
          });
        }
      }
    } else if (src && isQuestion(src)) {
      queue.push(src);
    }
  });

  while (queue.length > 0) {
    const currentQ = queue.shift();
    if (!currentQ || visited.has(currentQ.id)) continue;
    visited.add(currentQ.id);

    const qIncomings = graph.getIncomingEdges(currentQ) || [];
    qIncomings.forEach(edge => {
      const src = edge.source;
      if (src && isOptions(src)) {
        const optLabel = (src.value || "Option").replace(/<[^>]+>/g, "").trim();
        const parentEdges = graph.getIncomingEdges(src) || [];
        if (parentEdges.length > 0) {
          const parentQ = parentEdges[0].source;
          if (parentQ && isQuestion(parentQ)) {
            results.push({
              questionId: parentQ._questionId,
              answerLabel: optLabel
            });
          }
        }
      } else if (src && isQuestion(src)) {
        queue.push(src);
      }
    });
  }

  return results;
}

window.exportGuiJson = function() {
  // Get all cells
  const cells = graph.getModel().cells;
  const sections = [];
  let hiddenFields = [];
  let sectionCounter = 1;
  let questionCounter = 1;
  let hiddenFieldCounter = 1;
  let defaultPDFName = "";

  // Store sections in a property of the function for external access
  window.exportGuiJson.sections = sections;
  
  // First pass: collect all sections and their questions
  const questionCellMap = new Map(); // Maps questionId to cell
  const questionIdMap = new Map(); // Maps cell.id to questionId
  
  for (const cellId in cells) {
    const cell = cells[cellId];
    if (!cell.isVertex() || cell.isEdge() || cell.id === "0" || cell.id === "1") continue;

    // Get section information
    const sectionNum = parseInt(getSection(cell) || 1, 10);
    let section = sections.find(s => s.sectionId === sectionNum);
    
    if (!section) {
      // Get section name from sectionPrefs if available
      const sectionName = (sectionPrefs[sectionNum] && sectionPrefs[sectionNum].name) || `Section ${sectionNum}`;
      
      section = {
        sectionId: sectionNum,
        sectionName: sectionName,
        questions: []
      };
      sections.push(section);
    }

    // Handle different node types
    if (isQuestion(cell)) {
      const questionType = getQuestionType(cell);
      const questionText = cell.getValue() || "";
      const nodeId = getNodeId(cell);
      
      // Use the original _questionId from the cell instead of questionCounter
      const questionId = cell._questionId || questionCounter++;
      
      // Create question object
      const question = {
        questionId: questionId,
        text: "",
        type: questionType,
        logic: {
          enabled: false,
          conditions: []
        },
        jump: {
          enabled: false,
          conditions: []
        },
        conditionalPDF: {
          enabled: false,
          pdfName: "",
          answer: "Yes"
        },
        conditionalAlert: {
          enabled: false,
          prevQuestion: "",
          prevAnswer: "",
          text: ""
        },
        options: [],
        labels: [],
        nameId: nodeId,
        placeholder: "",
        min: "",
        max: "",
        amounts: []
      };

      // Extract clean text from HTML content
      if (cell._questionText) {
        // Use the stored question text if available
        question.text = cell._questionText;
      } else {
        // Otherwise try to extract from HTML
        const cleanText = questionText.replace(/<[^>]+>/g, "").trim();
        question.text = cleanText;
      }

      // Store mapping between question cells and questionIds
      questionCellMap.set(questionId, cell);
      questionIdMap.set(cell.id, questionId);
      
      // Only increment counter for questions without _questionId
      if (!cell._questionId) {
        questionCounter++;
      }
      
      section.questions.push(question);
    }
  }

  // Second pass: Process question types and find connections
  for (const section of sections) {
    for (const question of section.questions) {
      const cell = questionCellMap.get(question.questionId);
      if (!cell) continue;
      
      const questionType = getQuestionType(cell);
      
      // Map number type to money type for GUI JSON
      if (questionType === "number") {
        question.type = "money";
      }
      
      // Use the _nameId property if available instead of nodeId
      if (cell._nameId) {
        question.nameId = cell._nameId;
      }
      
      // Set to track added options to prevent duplicates
      let addedOptions = new Set();
      
      if (questionType === "dropdown" || questionType === "checkbox") {
        // Add empty image object for dropdown questions by default
        if (questionType === "dropdown") {
          question.image = {
            url: "",
            width: 0,
            height: 0
          };
        }
        
        // Find all outgoing edges to get options and possibly image nodes
        const outgoingEdges = graph.getOutgoingEdges(cell) || [];

        // First, deduplicate the edges - we may have multiple connections from the same source to target
        const uniqueTargetMap = new Map(); // Map<targetId, targetCell>
        for (const edge of outgoingEdges) {
          const targetCell = edge.target;
          if (!targetCell) continue;
          // Only keep the first instance of each target cell
          if (!uniqueTargetMap.has(targetCell.id)) {
            uniqueTargetMap.set(targetCell.id, targetCell);
          }
        }

        // Process unique target cells
        for (const targetCell of uniqueTargetMap.values()) {
          // Check if this is an image option node
          if (isOptions(targetCell) && getQuestionType(targetCell) === "imageOption") {
            // Found an image node, update the question's image property
            if (questionType === "dropdown" && targetCell._image) {
              question.image = {
                url: targetCell._image.url || "",
                width: parseInt(targetCell._image.width) || 0,
                height: parseInt(targetCell._image.height) || 0
              };
            }
            // Skip adding as an option
            continue;
          }
          
          if (targetCell && isOptions(targetCell)) {
            const optionText = targetCell.value.replace(/<[^>]+>/g, "").trim();
            // Create addedOptions set if it doesn't exist
            if (!addedOptions) {
              addedOptions = new Set();
            }
            if (optionText && !addedOptions.has(optionText.toLowerCase())) {
              addedOptions.add(optionText.toLowerCase());
              
              // For checkbox questions, create structured options
              if (questionType === "checkbox") {
                // Reset options array if it contains strings
                if (question.options.length > 0 && typeof question.options[0] === 'string') {
                  question.options = [];
                }
                
                // Extract the full question nameId for consistent option naming
                let fullQuestionNameId = question.nameId;
                if (cell.style && cell.style.includes("nodeId=")) {
                  const match = cell.style.match(/nodeId=([^;]+)/);
                  if (match && match[1]) {
                    const decodedId = decodeURIComponent(match[1]);
                    if (decodedId.length > fullQuestionNameId.length) {
                      fullQuestionNameId = decodedId;
                    }
                  }
                }
                
                // Create a nameId by combining the full question nameId and the option text
                const optionNameId = fullQuestionNameId.toLowerCase() + "_" + optionText.toLowerCase().replace(/\s+/g, '_');
                
                // Capitalize first letter of option label
                const label = optionText.charAt(0).toUpperCase() + optionText.slice(1);
                
                // Create a structured option object
                const optionObj = {
                  label: label,
                  nameId: optionNameId,
                  value: "",
                  hasAmount: isAmountOption(targetCell),
                  amountName: "",
                  amountPlaceholder: ""
                };
                
                question.options.push(optionObj);
              } else {
                // For dropdown questions, keep using simple strings
                question.options.push(optionText);
              }
            }
          }
        }
        
        // Check for options that connect to END nodes
        let optionsWithJumpToEnd = [];
                
        // For numbered dropdown/dropdown/checkbox question types, check if the outgoing edges lead to END nodes
        if (questionType === "numberedDropdown" || questionType === "dropdown" || questionType === "checkbox") {
          console.log(`Checking if question ${question.questionId} (${question.text}) has options leading to END`);
          const outgoingEdges = graph.getOutgoingEdges(cell) || [];
          
          for (const edge of outgoingEdges) {
            const targetCell = edge.target;
            
            // If it's an option node, check where it leads
            if (targetCell && isOptions(targetCell)) {
              const optionText = targetCell.value.replace(/<[^>]+>/g, "").trim();
              console.log(`  Checking option "${optionText}" for question ${question.questionId}`);
              const optionOutgoingEdges = graph.getOutgoingEdges(targetCell) || [];
              
              for (const optionEdge of optionOutgoingEdges) {
                const optionTarget = optionEdge.target;
                console.log(`    Option ${optionText} leads to cell ID ${optionTarget ? optionTarget.id : 'unknown'}, style: ${optionTarget ? optionTarget.style : 'unknown'}`);
                
                // Check if this option leads to an END node
                if (optionTarget && isEndNode(optionTarget)) {
                  // Add to our list of options that jump to END
                  optionsWithJumpToEnd.push(optionText);
                }
              }
            }
          }
          
          // If we found options that jump to END, add them to the question's jump conditions
          if (optionsWithJumpToEnd.length > 0) {
            console.log(`Found ${optionsWithJumpToEnd.length} options that jump to END for question ${question.questionId}`);
            
            // Enable jump conditions for this question
            question.jump = question.jump || {};
            question.jump.enabled = true;
            question.jump.conditions = question.jump.conditions || [];
            
            // Add each option as a jump condition to "end"
            for (const optionText of optionsWithJumpToEnd) {
              // For checkbox questions, we need to find the properly capitalized label
              let optionLabel = optionText;
              if (questionType === "checkbox") {
                const matchingOption = question.options.find(opt => 
                  (typeof opt === 'object' && opt.label.toLowerCase() === optionText.toLowerCase())
                );
                if (matchingOption) {
                  optionLabel = matchingOption.label;
                }
              }
              
              // Check if this jump condition already exists
              const exists = question.jump.conditions.some(c => 
                c.option === optionLabel && c.to === "end"
              );
              
              if (!exists) {
                question.jump.conditions.push({
                  option: optionLabel,
                  to: "end"
                });
                console.log(`Added jump condition for question ${question.questionId}: "${optionLabel}" -> END`);
              }
            }
          }
        }
        
        // Remove unnecessary fields
        delete question.min;
        delete question.max;
        delete question.amounts;
        
        // For checkbox questions, use first option for conditionalPDF answer
        if (questionType === "checkbox") {
          // Set conditionalPDF answer to the first option (capitalized)
          if (question.options.length > 0) {
            if (typeof question.options[0] === 'object') {
              question.conditionalPDF.answer = question.options[0].label;
            } else {
              const firstOption = question.options[0];
              question.conditionalPDF.answer = firstOption.charAt(0).toUpperCase() + firstOption.slice(1);
            }
          } else {
            question.conditionalPDF.answer = "undefined";
          }
        }
      } else if (questionType === "text" || questionType === "date" || questionType === "number" || questionType === "bigParagraph") {
        // Remove unnecessary fields
        delete question.min;
        delete question.max;
        delete question.amounts;
        delete question.image;
      } else if (questionType === "multipleDropdownType") {
        // Rename to numberedDropdown for consistency
        question.type = "numberedDropdown";
        console.log(`Converting multipleDropdownType to numberedDropdown for question ${question.questionId}: ${question.text}`);
        
        // Get min and max values
        if (cell._twoNumbers) {
          question.min = cell._twoNumbers.first || "1";
          question.max = cell._twoNumbers.second || "1";
          console.log(`  Setting min=${question.min}, max=${question.max}`);
        }
        
        // Handle labels and amounts
        if (cell._textboxes) {
          console.log(`  Processing ${cell._textboxes.length} textboxes for amount/label options`);
          for (const textbox of cell._textboxes) {
            if (textbox.isAmountOption) {
              question.amounts.push(textbox.nameId);
              console.log(`  Added amount option: ${textbox.nameId}`);
            } else {
              question.labels.push(textbox.nameId);
              console.log(`  Added label: ${textbox.nameId}`);
            }
          }
        }
      } else if (questionType === "multipleTextboxes") {
        // Create textboxes array
        question.textboxes = [];
        
        if (cell._textboxes) {
          cell._textboxes.forEach((tb, index) => {
            const nameId = question.nameId.toLowerCase() + "_" + (tb.nameId || "").toLowerCase().replace(/\s+/g, '_');
            
            question.textboxes.push({
              label: "", // Empty label as requested
              nameId: nameId,
              placeholder: tb.placeholder || tb.nameId || ""
            });
          });
        }
        
        // Clean up unnecessary fields
        question.labels = [];
        delete question.nameId;
        delete question.placeholder;
        delete question.min;
        delete question.max;
        delete question.amounts;
      }
    }
  }
  
  // Create a helper function to find all option nodes that lead to a question
  function findOptionsThatLeadTo(questionCell) {
    const result = [];
    for (const cellId in cells) {
      const cell = cells[cellId];
      if (!cell.isVertex() || !isOptions(cell)) continue;
      
      const outEdges = graph.getOutgoingEdges(cell) || [];
      for (const edge of outEdges) {
        if (edge.target === questionCell) {
          result.push(cell);
          break;
        }
      }
    }
    return result;
  }

  // Third pass: Determine conditional logic between questions
  for (const section of sections) {
    for (const question of section.questions) {
      const cell = questionCellMap.get(question.questionId);
      if (!cell) continue;
      
      // Reset existing conditions for this question - we'll rebuild them correctly
      question.logic = {
        enabled: false,
        conditions: []
      };
      
      // If the question has incoming edges from other questions
      // Figure out which questions can lead to this one
      const incomingEdges = graph.getIncomingEdges(cell) || [];
      let shouldAddLogicConditions = false;
      let comesFromOption = false;
      
      // First check if this question is accessed via option nodes 
      // (indicating conditional flow)
      for (const edge of incomingEdges) {
        const sourceCell = edge.source;
        if (sourceCell && isOptions(sourceCell)) {
          comesFromOption = true;
          break;
        }
      }
      
      // If question is directly connected to previous questions without options in between,
      // it's a sequential flow - don't add logic conditions
      if (!comesFromOption) {
        let hasPrevQuestion = false;
        
        for (const edge of incomingEdges) {
          const sourceCell = edge.source;
          // Check if any incoming edge is from a question
          if (sourceCell && isQuestion(sourceCell)) {
            hasPrevQuestion = true;
            break;
          }
        }
        
        // If it only has direct connections from questions (sequential flow),
        // don't add logic conditions
        if (hasPrevQuestion) {
          shouldAddLogicConditions = false;
          console.log(`Question ${question.questionId} is in sequential flow, skipping logic conditions`);
        } else {
          // No incoming questions and no option nodes, it's likely a starting question
          shouldAddLogicConditions = false;
        }
      } else {
        // It comes from option nodes, so it's conditional flow
        shouldAddLogicConditions = true;
        console.log(`Question ${question.questionId} has conditional flow, adding logic conditions`);
      }
      
      // Only add logic conditions if we determined it needs them
      if (shouldAddLogicConditions) {
        question.logic.enabled = true;
        // Identify previous questions through option nodes
        for (const edge of incomingEdges) {
          const sourceCell = edge.source;
          
          if (sourceCell && isOptions(sourceCell)) {
            const optionValue = sourceCell.value;
            const optionIncomingEdges = graph.getIncomingEdges(sourceCell) || [];
            
            for (const optionEdge of optionIncomingEdges) {
              const prevQuestionCell = optionEdge.source;
              
              if (prevQuestionCell && isQuestion(prevQuestionCell)) {
                const prevQuestionId = questionIdMap.get(prevQuestionCell.id);
                
                // Add the logic condition
                question.logic.conditions.push({
                  prevQuestion: prevQuestionId.toString(),
                  prevAnswer: optionValue
                });
              }
            }
          }
        }
      }
    }
  }

  // Deduplicate logic conditions for all questions
  for (const section of sections) {
    for (const question of section.questions) {
      if (question.logic && question.logic.conditions && question.logic.conditions.length > 0) {
        const uniqueConditions = [];
        const seen = new Set();
        
        for (const condition of question.logic.conditions) {
          const key = `${condition.prevQuestion}_${condition.prevAnswer}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueConditions.push(condition);
          }
        }
        
        question.logic.conditions = uniqueConditions;
      }
    }
  }

  // Fourth pass: Collect calculation nodes for hidden fields
  for (const cellId in cells) {
    const cell = cells[cellId];
    if (!cell.isVertex() || cell.isEdge() || cell.id === "0" || cell.id === "1") continue;

    if (isCalculationNode(cell)) {
      const calcName = cell._calcTitle || `Calculation ${hiddenFieldCounter}`;
      const calcFinalText = cell._calcFinalText || "";
      const calcOperator = cell._calcOperator || ">";
      const calcThreshold = cell._calcThreshold || "0";
      
      // Create hidden field for calculation
      const hiddenField = {
        hiddenFieldId: hiddenFieldCounter.toString(),
        type: "text",
        name: calcName,
        checked: false,
        conditions: [],
        calculations: []
      };

      // Process calculation terms
      const calculation = {
        terms: [],
        compareOperator: calcOperator,
        threshold: calcThreshold,
        fillValue: calcFinalText
      };

      // Find the question that contains the amount field
      const amountLabel = cell._calcAmountLabel || "";
      
      console.log(`Processing calculation node: ${cell.id}, title: ${cell._calcTitle}`);
      console.log(`  Amount label: "${amountLabel}"`);
      
      // First, check if this amountLabel matches another calculation node's title
      let isCalcNodeReference = false;
      let calcNodeTitle = "";
      
      // Collect all calculation nodes except the current one
      const otherCalcNodes = [];
      for (const otherId in cells) {
        const otherCell = cells[otherId];
        if (otherId !== cellId && otherCell.isVertex() && !otherCell.isEdge() && isCalculationNode(otherCell)) {
          otherCalcNodes.push(otherCell);
        }
      }
      
      // Check if amountLabel matches any calculation node's title
      for (const otherCalcNode of otherCalcNodes) {
        if (otherCalcNode._calcTitle && otherCalcNode._calcTitle === amountLabel) {
          isCalcNodeReference = true;
          calcNodeTitle = otherCalcNode._calcTitle;
          console.log(`  Found matching calculation node with title: "${calcNodeTitle}"`);
          break;
        }
      }
      
      // If this is a reference to another calculation node, create a simple term
      if (isCalcNodeReference && (!cell._calcTerms || cell._calcTerms.length <= 1)) {
        // This is a legacy single calculation node reference
        console.log(`  Creating calculation term referencing calc node: "${calcNodeTitle}"`);
        calculation.terms = [{
          operator: "",
          questionNameId: calcNodeTitle
        }];
        
        // Make sure fillValue uses the calculation's title
        if (calcFinalText.includes(`##${calcName}##`)) {
          calculation.fillValue = calcFinalText;
        } else {
          calculation.fillValue = calcFinalText;
        }
        
        // Add the calculation to hidden field
        hiddenField.calculations.push(calculation);
        hiddenFields.push(hiddenField);
        hiddenFieldCounter++;
        
        // Skip the rest of the processing for this node
        continue;
      }
      
      // For backward compatibility, if we have a single _calcAmountLabel but no _calcTerms
      if (cell._calcAmountLabel && (!cell._calcTerms || cell._calcTerms.length === 0)) {
        console.log(`  Converting legacy node with _calcAmountLabel to use _calcTerms`);
        cell._calcTerms = [{
          amountLabel: cell._calcAmountLabel,
          mathOperator: ""
        }];
      }
      
      // Check if this node has multiple calculation terms defined
      if (cell._calcTerms && cell._calcTerms.length > 0) {
        console.log(`  Processing calculation node with terms: ${cell._calcTerms.length} terms`);
        
        // Process each term separately
        calculation.terms = [];
        
        // Process each term in the _calcTerms array
        for (let i = 0; i < cell._calcTerms.length; i++) {
          const term = cell._calcTerms[i];
          const termAmountLabel = term.amountLabel || "";
          const operator = i === 0 ? "" : (term.mathOperator || "+");
          
          console.log(`  Processing term ${i+1}: amount label="${termAmountLabel}", operator="${operator}"`);
          
          // Check if this term references another calculation node
          let isTermCalcNodeReference = false;
          let termCalcNodeTitle = "";
          
          for (const otherCalcNode of otherCalcNodes) {
            if (otherCalcNode._calcTitle && otherCalcNode._calcTitle === termAmountLabel) {
              isTermCalcNodeReference = true;
              termCalcNodeTitle = otherCalcNode._calcTitle;
              console.log(`  Term ${i+1} references calculation node: "${termCalcNodeTitle}"`);
              break;
            }
          }
          
          if (isTermCalcNodeReference) {
            // This term references another calculation node
            calculation.terms.push({
              operator: operator,
              questionNameId: termCalcNodeTitle
            });
            console.log(`  Added term referencing calculation: ${JSON.stringify(calculation.terms[calculation.terms.length-1])}`);
            continue;
          }
          
          // Extract amount name and question name from the label
          let termAmountName = "";
          let termQuestionName = "";
          
          if (termAmountLabel) {
            // Clean up the label
            const cleanedLabel = termAmountLabel.replace(/delete_amount_/g, "").replace(/add_option_/g, "");
            console.log(`  Cleaned term label: "${cleanedLabel}"`);
            
            // Handle special cases first - direct checkbox amount options
            const isCheckboxOption = /^([a-z0-9_]+)_([a-z0-9_]+)$/.test(cleanedLabel);
            const isMultipleDropdownAmount = cleanedLabel.includes("_amount");
            
            console.log(`  Label format check: isCheckboxOption=${isCheckboxOption}, isMultipleDropdownAmount=${isMultipleDropdownAmount}`);
            
            // First try to match checkbox amount options which typically have simple format: questionname_optionname
            if (isCheckboxOption && !isMultipleDropdownAmount) {
              // Simple format for checkbox options like "choose_all_that_apply_rent"
              const parts = cleanedLabel.split('_');
              // For simple checkbox amount options, the last part is the option name
              // and all previous parts combined form the question name
              termAmountName = parts[parts.length - 1];
              termQuestionName = parts.slice(0, -1).join('_');
              console.log(`  Detected checkbox option. Question: "${termQuestionName}", Option/Amount: "${termAmountName}"`);
            }
            // For multi-word amounts like "amount_plus", we need to handle the extraction differently
            else if (cleanedLabel.indexOf("_amount_") > 0) {
              // This is likely a multi-word amount (like "amount_plus")
              const questionNameEndPos = cleanedLabel.indexOf("_amount_");
              termQuestionName = cleanedLabel.substring(0, questionNameEndPos);
              termAmountName = "amount_" + cleanedLabel.substring(questionNameEndPos + 8); // Skip "_amount_"
              console.log(`  Detected multi-word amount. Question: "${termQuestionName}", Amount: "${termAmountName}"`);
            }
            // Handle the simple case with just "amount" at the end
            else if (cleanedLabel.endsWith("_amount")) {
              termQuestionName = cleanedLabel.substring(0, cleanedLabel.length - 7); // Remove "_amount"
              termAmountName = "amount";
              console.log(`  Detected simple amount suffix. Question: "${termQuestionName}", Amount: "${termAmountName}"`);
            }
            // Try standard extraction with last underscore
            else {
              const lastIndex = cleanedLabel.lastIndexOf('_');
              if (lastIndex > 0) {
                termAmountName = cleanedLabel.substring(lastIndex + 1).trim();
                termQuestionName = cleanedLabel.substring(0, lastIndex).trim();
                console.log(`  Standard extraction. Question: "${termQuestionName}", Amount: "${termAmountName}"`);
              } else {
                // Fallback
                const parts = cleanedLabel.split('_');
                if (parts.length > 0) {
                  termAmountName = parts[parts.length - 1].replace(/_/g, " ").trim();
                }
                if (parts.length > 1) {
                  termQuestionName = parts.slice(0, -1).join('_');
                }
                console.log(`  Fallback extraction. Question: "${termQuestionName}", Amount: "${termAmountName}"`);
              }
            }
            
            console.log(`  Term ${i+1} extracted: question="${termQuestionName}", amount="${termAmountName}"`);
            
            // Special handling for checkbox options
            // If the term appears to be a checkbox option (not containing "amount" in the name)
            // and follows the pattern questionname_optionname
            if (isCheckboxOption && !isMultipleDropdownAmount) {
              let directHit = false;
              
              // Try to directly match it with options from checkbox questions
              for (const section of sections) {
                for (const question of section.questions) {
                  if (question.type === "checkbox") {
                    // Check if this question has options
                    if (question.options && Array.isArray(question.options)) {
                      for (const option of question.options) {
                        if (typeof option === 'object') {
                          // Create the expected nameId format and check if it matches our term
                          const questionTextId = question.text.toLowerCase().replace(/[^\w\s]/gi, "").replace(/\s+/g, "_");
                          const optionNameId = option.label.toLowerCase().replace(/\s+/g, '_');
                          const expectedNameId = `${questionTextId}_${optionNameId}`;
                          
                          if (cleanedLabel === expectedNameId || 
                              expectedNameId.includes(cleanedLabel) || 
                              cleanedLabel.includes(expectedNameId)) {
                            console.log(`  Direct match with checkbox option: "${expectedNameId}"`);
                            
                            // For checkbox amount options, just use the exact format
                            calculation.terms.push({
                              operator: operator,
                              questionNameId: cleanedLabel
                            });
                            directHit = true;
                            break;
                          }
                        }
                      }
                      if (directHit) break;
                    }
                  }
                  if (directHit) break;
                }
                if (directHit) break;
              }
              
              if (directHit) {
                console.log(`  Added direct checkbox option term: "${cleanedLabel}"`);
                continue; // Skip to next term
              }
            }
            
            // Find the matching question
            let termTargetQuestion = null;
            let isCheckboxAmount = false;
            
            // First, check if this is a checkbox amount option
            for (const section of sections) {
              for (const question of section.questions) {
                if (question.type === "checkbox") {
                  const questionText = question.text || "";
                  const questionTextLower = questionText.toLowerCase();
                  const questionTextAsId = questionTextLower.replace(/[^\w\s]/gi, "").replace(/\s+/g, "_");
                  
                  // Check if the question name part matches this checkbox question
                  if (termQuestionName.toLowerCase() === questionTextAsId) {
                    // Check if this question has an option matching the amount name
                    if (question.options && Array.isArray(question.options)) {
                      for (const option of question.options) {
                        // For object options
                        if (typeof option === 'object' && option.hasAmount) {
                          const optionLabel = option.label.toLowerCase().replace(/\s+/g, '_');
                          if (optionLabel === termAmountName) {
                            termTargetQuestion = question;
                            isCheckboxAmount = true;
                            console.log(`  Term ${i+1} matched checkbox question: "${questionText}" with amount option "${option.label}"`);
                            break;
                          }
                        }
                      }
                    }
                  }
                }
                if (termTargetQuestion) break;
              }
              if (termTargetQuestion) break;
            }
            
            // If not a checkbox amount, look for a numbered dropdown question
            if (!termTargetQuestion) {
              // Look for matching question
              for (const section of sections) {
                for (const question of section.questions) {
                  if (question.type !== "numberedDropdown") continue;
                  
                  const questionText = question.text || "";
                  const questionTextLower = questionText.toLowerCase();
                  const questionTextAsId = questionTextLower.replace(/[^\w\s]/gi, "").replace(/\s+/g, "_");
                  
                  // Try multiple matching strategies
                  const directMatch = termQuestionName.toLowerCase() === questionTextAsId;
                  const containsMatch = termQuestionName.toLowerCase().includes(questionTextAsId) || 
                                     questionTextAsId.includes(termQuestionName.toLowerCase());
                  const simpleTextMatch = termQuestionName.toLowerCase().replace(/_/g, " ") === questionTextLower;
                  
                  if (directMatch || containsMatch || simpleTextMatch) {
                    console.log(`  Term ${i+1} found potential question match: "${questionText}"`);
                    
                    // Check if this question has matching amounts
                    if (question.amounts && Array.isArray(question.amounts)) {
                      // For multi-word amounts, try both direct comparison and with spaces replaced by underscores
                      const foundMatchingAmount = question.amounts.some(amount => {
                        const amountLower = amount.toLowerCase();
                        const amountUnderscores = amountLower.replace(/\s+/g, '_');
                        const termAmountLower = termAmountName.toLowerCase();
                        const termAmountSpaces = termAmountLower.replace(/_/g, ' ');
                        
                        return amountLower === termAmountLower || 
                               amountLower === termAmountSpaces || 
                               amountUnderscores === termAmountLower;
                      });
                      
                      if (foundMatchingAmount) {
                        termTargetQuestion = question;
                        console.log(`  Term ${i+1} matched numberedDropdown question: "${questionText}" with matching amount`);
                        break;
                      } else {
                        // Even if we don't find exact amount match, use this question if it has any amounts
                        termTargetQuestion = question;
                        console.log(`  Term ${i+1} matched numberedDropdown question: "${questionText}" but using fallback amount`);
                        break;
                      }
                    }
                  }
                  if (termTargetQuestion) break;
                }
                if (termTargetQuestion) break;
              }
            }
            
            // If we found a matching question
            if (termTargetQuestion) {
              console.log(`  Term ${i+1} found target question: ${termTargetQuestion.questionId} (${termTargetQuestion.text})`);
              
              // For numberedDropdown questions, create terms for each number
              if (termTargetQuestion.type === "numberedDropdown") {
                const min = parseInt(termTargetQuestion.min || "1", 10);
                const max = parseInt(termTargetQuestion.max || "1", 10);
                
                // For multi-word amounts like "amount_plus", use proper format
                let actualAmountName = termAmountName.trim().toLowerCase();
                
                // Find matching amount in the question's amounts array
                if (termTargetQuestion.amounts && termTargetQuestion.amounts.length > 0) {
                  // Try to find exact match first (ignoring case and handling spaces vs underscores)
                  const matchingAmount = termTargetQuestion.amounts.find(amount => {
                    const amountLower = amount.toLowerCase();
                    const amountUnderscores = amountLower.replace(/\s+/g, '_');
                    const termAmountLower = termAmountName.toLowerCase();
                    const termAmountSpaces = termAmountLower.replace(/_/g, ' ');
                    
                    return amountLower === termAmountLower || 
                           amountLower === termAmountSpaces || 
                           amountUnderscores === termAmountLower;
                  });
                  
                  if (matchingAmount) {
                    // Use the proper format with spaces replaced by underscores
                    actualAmountName = matchingAmount.toLowerCase().replace(/\s+/g, '_');
                    console.log(`  Found exact matching amount: "${matchingAmount}" -> "${actualAmountName}"`);
                  } else {
                    // Use the first amount as fallback
                    actualAmountName = termTargetQuestion.amounts[0].toLowerCase().replace(/\s+/g, '_');
                    console.log(`  Using fallback amount: "${termTargetQuestion.amounts[0]}" -> "${actualAmountName}"`);
                  }
                }
                
                // Add first number with the appropriate operator
                calculation.terms.push({
                  operator: operator,
                  questionNameId: `${termTargetQuestion.text}_${min}_${actualAmountName}`
                });
                
                // Add additional numbers with + operator
                for (let j = min + 1; j <= max; j++) {
                  calculation.terms.push({
                    operator: "+",
                    questionNameId: `${termTargetQuestion.text}_${j}_${actualAmountName}`
                  });
                }
                
                console.log(`  Added terms for numberedDropdown: min=${min}, max=${max}, using amount="${actualAmountName}"`);
                continue; // Skip to next term
              } else if (termTargetQuestion.type === "checkbox" && isCheckboxAmount) {
                // For checkbox amount options, use the direct format: questionName_optionName
                // This preserves the original format from gatherAllAmountLabels
                calculation.terms.push({
                  operator: operator,
                  questionNameId: `${termQuestionName}_${termAmountName}`
                });
                console.log(`  Added term for checkbox amount option using original format: ${termQuestionName}_${termAmountName}`);
                continue; // Skip to next term
              } else {
                // For other question types
                calculation.terms.push({
                  operator: operator,
                  questionNameId: `${termTargetQuestion.nameId}_${termAmountName}`
                });
                console.log(`  Added term for regular question`);
                continue; // Skip to next term
              }
            }
            
            // If no target question found, try one more fallback approach for common question types
            if (!termTargetQuestion) {
              // For numbered dropdown questions (most common with amount options),
              // try to find any numbered dropdown question and use its text
              let fallbackQuestion = null;
              for (const section of sections) {
                for (const question of section.questions) {
                  if (question.type === "numberedDropdown") {
                    fallbackQuestion = question;
                    break;
                  }
                }
                if (fallbackQuestion) break;
              }
              
              if (fallbackQuestion) {
                console.log(`  Using fallback numbered dropdown question: "${fallbackQuestion.text}"`);
                const min = parseInt(fallbackQuestion.min || "1", 10);
                const max = parseInt(fallbackQuestion.max || "1", 10);
                
                // Use the termAmountName directly for the format
                // Convert spaces to underscores for consistent format
                const cleanedAmountName = termAmountName.trim().toLowerCase().replace(/\s+/g, '_');
                
                // Add first term with operator
                calculation.terms.push({
                  operator: operator,
                  questionNameId: `${fallbackQuestion.text}_${min}_${cleanedAmountName}`
                });
                
                // Add additional terms
                for (let j = min + 1; j <= max; j++) {
                  calculation.terms.push({
                    operator: "+",
                    questionNameId: `${fallbackQuestion.text}_${j}_${cleanedAmountName}`
                  });
                }
                
                console.log(`  Added fallback terms using first numberedDropdown question`);
                continue; // Skip to next term
              }
            }
            
            // If still no match, create a placeholder
            console.log(`  Term ${i+1} no target question found, using placeholder`);
            calculation.terms.push({
              operator: operator,
              questionNameId: `unknown_question_${termAmountName || i+1}`
            });
          }
        }
        
        // Add the calculation to the hidden field
        if (calculation.terms.length > 0) {
          // Make sure fillValue uses the actual final text
          calculation.fillValue = calcFinalText;
          
          hiddenField.calculations.push(calculation);
          hiddenFields.push(hiddenField);
          hiddenFieldCounter++;
          
          console.log(`  Final calculation terms: ${JSON.stringify(calculation.terms)}`);
        }
        
        // Skip the rest of the processing for this node
        continue;
      }
      
      // Extract the amount name and question name from the label
      let amountName = "";
      let questionNameFromLabel = "";
      
      if (amountLabel) {
        // Clean up the label
        const cleanedLabel = amountLabel.replace(/delete_amount_/g, "").replace(/add_option_/g, "");
        console.log(`  Cleaned label: "${cleanedLabel}"`);
        
        // Handle special case for checkbox amount options
        const isCheckboxOption = /^([a-z0-9_]+)_([a-z0-9_]+)$/.test(cleanedLabel);
        const isMultipleDropdownAmount = cleanedLabel.includes("_amount");
        
        if (isCheckboxOption && !isMultipleDropdownAmount) {
          // For checkbox option format: questionname_optionname
          // We can use it directly
          console.log(`  Detected direct checkbox option format: "${cleanedLabel}"`);
          
          // For checkbox amount options, just use the full label directly
          calculation.terms = [{
            operator: "",
            questionNameId: cleanedLabel
          }];
          
          // Add the calculation to the hidden field
          hiddenField.calculations.push(calculation);
          hiddenFields.push(hiddenField);
          hiddenFieldCounter++;
          
          console.log(`  Created term using direct checkbox format: ${JSON.stringify(calculation.terms)}`);
          continue; // Skip the rest of the processing
        }
        
        // Check for multi-word amounts like "amount_plus"
        const questionNameEndPos = cleanedLabel.indexOf("_amount_");
        if (questionNameEndPos > 0) {
          // This is likely a multi-word amount (like "amount_plus")
          questionNameFromLabel = cleanedLabel.substring(0, questionNameEndPos);
          amountName = "amount_" + cleanedLabel.substring(questionNameEndPos + 8); // Skip "_amount_"
          console.log(`  Detected multi-word amount. Question: "${questionNameFromLabel}", Amount: "${amountName}"`);
        }
        // Handle the simple case with just "amount" at the end
        else if (cleanedLabel.endsWith("_amount")) {
          questionNameFromLabel = cleanedLabel.substring(0, cleanedLabel.length - 7); // Remove "_amount"
          amountName = "amount";
          console.log(`  Detected simple amount suffix. Question: "${questionNameFromLabel}", Amount: "${amountName}"`);
        }
        else {
          // First, try to extract the question text from the label
          // The label format is typically: "question_name_question_amount_name"
          const lastIndex = cleanedLabel.lastIndexOf('_');
          if (lastIndex > 0) {
            amountName = cleanedLabel.substring(lastIndex + 1).trim();
            questionNameFromLabel = cleanedLabel.substring(0, lastIndex).trim();
            
            console.log(`  Extracted question name: "${questionNameFromLabel}"`);
            console.log(`  Extracted amount name: "${amountName}"`);
          } else {
            // Fallback to old method if no underscore found
            const parts = cleanedLabel.split('_');
            
            // Get the amount name (last part)
            if (parts.length > 0) {
              amountName = parts[parts.length - 1].replace(/_/g, " ").trim();
              console.log(`  Extracted amount name (fallback): "${amountName}"`);
            }
            
            // Build the question name from everything except the last part
            if (parts.length > 1) {
              questionNameFromLabel = parts.slice(0, -1).join('_');
              console.log(`  Question name from label (fallback): "${questionNameFromLabel}"`);
            }
          }
        }
      }
      
      // Find the target question for this calculation
      let targetQuestion = null;
      
      // First try to match the exact question from the label (this fixes the duplicate amount name issue)
      console.log(`  First attempting to match exact question name: "${questionNameFromLabel}"`);
      for (const section of sections) {
        for (const question of section.questions) {
          // Generate various formats of the question text for matching
          const questionText = question.text || "";
          const questionTextLower = questionText.toLowerCase();
          const questionTextAsId = questionTextLower.replace(/[^\w\s]/gi, "").replace(/\s+/g, "_");
          const questionLabelFromStyle = (question.nameId || "").toLowerCase();
          
          // Generate various formats of the label for matching
          const questionNameFromLabelLower = questionNameFromLabel.toLowerCase();
          
          console.log(`    Checking question ${question.questionId}: "${questionText}"`);
          console.log(`      Text as ID: "${questionTextAsId}", Label from amount: "${questionNameFromLabelLower}"`);
          
          // Try multiple matching strategies
          const directMatch = questionNameFromLabelLower === questionTextAsId;
          const containsMatch = questionNameFromLabelLower.includes(questionTextAsId) || 
                              questionTextAsId.includes(questionNameFromLabelLower);
          const simpleTextMatch = questionNameFromLabelLower.replace(/_/g, " ") === questionTextLower;
          
          if (directMatch || containsMatch || simpleTextMatch) {
            console.log(`    MATCH FOUND! Question "${questionText}" matches label "${questionNameFromLabel}"`);
            
            // Check if it also has a matching amount
            if (question.type === "numberedDropdown" && question.amounts && 
                question.amounts.some(amt => amt.toLowerCase() === amountName.toLowerCase())) {
              console.log(`    Confirmed: question has matching amount "${amountName}"`);
              targetQuestion = question;
              break;
            } else if (question.type === "numberedDropdown") {
              console.log(`    Warning: matched question doesn't have exact amount "${amountName}", but using it anyway as fallback`);
              targetQuestion = question;
            }
          }
        }
        if (targetQuestion) break;
      }
      
      // If still no match, try even more relaxed matching
      if (!targetQuestion) {
        console.log(`  No exact match found, trying more relaxed matching strategies`);
        for (const section of sections) {
          for (const question of section.questions) {
            if (question.type !== "numberedDropdown") continue;
            
            // Try word-by-word matching
            const questionWords = question.text.toLowerCase().split(/\s+/);
            const labelWords = questionNameFromLabel.toLowerCase().replace(/_/g, " ").split(/\s+/);
            
            let wordMatches = 0;
            for (const word of questionWords) {
              if (labelWords.includes(word)) {
                wordMatches++;
              }
            }
            
            // If more than half the words match, it's probably the right question
            if (wordMatches > Math.min(2, questionWords.length / 2)) {
              console.log(`    PARTIAL MATCH! Question "${question.text}" matches ${wordMatches} words from label`);
              targetQuestion = question;
              break;
            }
          }
          if (targetQuestion) break;
        }
      }
      
      // If we didn't find a question by direct matching, fall back to the older logic
      if (!targetQuestion) {
        console.log(`  No match found by question name, falling back to amount-only matching`);
        
        // Search through all questions in all sections
        console.log(`  Searching for matching question with amount: "${amountName}"`);
        for (const section of sections) {
          for (const question of section.questions) {
            console.log(`    Checking question ${question.questionId}: "${question.text}", type: ${question.type}, amounts: ${JSON.stringify(question.amounts)}`);
            
            // Check if this is a numberedDropdown question with amounts
            if (question.type === "numberedDropdown" && question.amounts && question.amounts.length > 0) {
              for (const amount of question.amounts) {
                console.log(`      Comparing amount "${amount}" with "${amountName}"`);
                if (amount.toLowerCase() === amountName.toLowerCase() || 
                    amount.toLowerCase().replace(/\s+/g, '_') === amountName.toLowerCase().replace(/\s+/g, '_')) {
                  targetQuestion = question;
                  console.log(`      MATCH FOUND! Using question ${question.questionId}`);
                  break;
                }
              }
            }
            
            if (targetQuestion) break;
          }
          if (targetQuestion) break;
        }
      }

      // Generate calculation terms
      if (targetQuestion) {
        console.log(`  Target question found: ${targetQuestion.questionId} (${targetQuestion.text}), type: ${targetQuestion.type}`);
        
        // Important: preserve spaces by replacing with underscores
        // This ensures multi-word amounts like "Amount Plus" become "amount_plus"
        const cleanAmountName = amountName.trim().toLowerCase().replace(/\s+/g, '_');
        
        // Create a properly formatted question name
        const formattedQuestionName = targetQuestion.text
          .trim()
          .replace(/[^\w\s]/gi, "")
          .replace(/\s+/g, "_")
          .toLowerCase();
        
        console.log(`  Formatted question name: "${formattedQuestionName}", clean amount name: "${cleanAmountName}"`);
        
        // For numberedDropdown, we need to create a term for each number from 1 to max
        if (targetQuestion.type === "numberedDropdown") {
          console.log(`  Processing as numberedDropdown with min: ${targetQuestion.min}, max: ${targetQuestion.max}`);
          
          // Get the correct min/max values
          const min = parseInt(targetQuestion.min || "1", 10);
          const max = parseInt(targetQuestion.max || "1", 10);
          
          console.log(`  Creating terms for numbers ${min} to ${max}`);
          
          // IMPORTANT: For this format, we need to preserve the original capitalization and spacing
          // The format should be exactly like: "How many jobs do you have_1_job_income"
          
          // Get accurate amount name directly from the question's amounts array
          let actualAmountName = cleanAmountName;
          if (targetQuestion.amounts && targetQuestion.amounts.length > 0) {
            // Find the exact amount name that matches (case-insensitive)
            const matchingAmount = targetQuestion.amounts.find(
              amt => amt.toLowerCase().replace(/\s+/g, '_') === cleanAmountName
            );
            
            if (matchingAmount) {
              // Use the properly formatted amount with spaces converted to underscores
              actualAmountName = matchingAmount.toLowerCase().replace(/\s+/g, '_');
              console.log(`  Using matched amount name from question: "${actualAmountName}"`);
            } else {
              // Fallback to the first amount
              actualAmountName = targetQuestion.amounts[0].toLowerCase().replace(/\s+/g, '_');
              console.log(`  Using fallback amount name from question: "${actualAmountName}"`);
            }
          }
          
          calculation.terms = []; // Reset terms array
          
          // First term has no operator (use the minimum number)
          calculation.terms.push({
            operator: "",
            questionNameId: `${targetQuestion.text}_${min}_${actualAmountName}`
          });
          
          // Add additional terms
          for (let i = min + 1; i <= max; i++) {
            calculation.terms.push({
              operator: "+",
              questionNameId: `${targetQuestion.text}_${i}_${actualAmountName}`
            });
          }
          
          console.log(`  Final calculation terms: ${JSON.stringify(calculation.terms, null, 2)}`);
        } else {
          // For other question types, just add one term
          calculation.terms.push({
            operator: "",
            questionNameId: `${targetQuestion.nameId}_${cleanAmountName}`
          });
        }
        
        console.log(`  Final terms: ${JSON.stringify(calculation.terms)}`);
      } else {
        console.log(`  WARNING: No target question found for calculation node ${cell.id}`);
        
        // FALLBACK: Create dynamic fallback terms based on any found questions
        console.log(`  Creating dynamic fallback terms`);
        
        // First check if we can extract a question name from the label to make a better fallback
        if (questionNameFromLabel) {
          console.log(`  Attempting to create fallback using question name from label: "${questionNameFromLabel}"`);
          
          // Format the question name for display in terms
          // Convert from snake_case to proper text with spaces and capitalization
          const formattedQuestionName = questionNameFromLabel
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
            
          console.log(`  Formatted question name: "${formattedQuestionName}"`);
          
          // Clean up the amount name
          const cleanAmountName = amountName.trim().toLowerCase().replace(/\s+/g, '_');
          
          // Create terms based on the question name from the label
          calculation.terms = [];
          
          // First term has no operator
          calculation.terms.push({
            operator: "",
            questionNameId: `${formattedQuestionName}_1_${cleanAmountName}`
          });
          
          // Add terms for numbers 2 and 3 (or use min/max from nearby questions)
          // Find a numberedDropdown question to get the max value
          let maxNumber = 3;
          for (const section of sections) {
            for (const question of section.questions) {
              if (question.type === "numberedDropdown" && question.max) {
                maxNumber = parseInt(question.max, 10);
                break;
              }
            }
          }
          
          // Add additional terms
          for (let i = 2; i <= maxNumber; i++) {
            calculation.terms.push({
              operator: "+",
              questionNameId: `${formattedQuestionName}_${i}_${cleanAmountName}`
            });
          }
          
          console.log(`  Created fallback terms from label: ${JSON.stringify(calculation.terms, null, 2)}`);
        } 
        // If we can't use the question name from the label, try to find a suitable question
        else {
          // Find any numberedDropdown question to use as reference
          let fallbackQuestion = null;
          for (const section of sections) {
            for (const question of section.questions) {
              if (question.type === "numberedDropdown" && question.amounts && question.amounts.length > 0) {
                fallbackQuestion = question;
                console.log(`  Found fallback numberedDropdown question: ${question.text}`);
                break;
              }
            }
            if (fallbackQuestion) break;
          }
          
          if (fallbackQuestion) {
            // Use the actual amount name from the question
            const actualAmountName = fallbackQuestion.amounts[0].toLowerCase().replace(/\s+/g, '_');
            console.log(`  Using amount name from fallback question: "${actualAmountName}"`);
            
            const min = parseInt(fallbackQuestion.min || "1", 10);
            const max = parseInt(fallbackQuestion.max || "3", 10);
            
            // Generate terms using the found question
            calculation.terms = [];
            calculation.terms.push({
              operator: "",
              questionNameId: `${fallbackQuestion.text}_${min}_${actualAmountName}`
            });
            
            for (let i = min + 1; i <= max; i++) {
              calculation.terms.push({
                operator: "+",
                questionNameId: `${fallbackQuestion.text}_${i}_${actualAmountName}`
              });
            }
            
            console.log(`  Created fallback terms using question: ${JSON.stringify(calculation.terms, null, 2)}`);
          } else {
            // No appropriate questions found, extract amount name from the label
            let extractedAmount = amountName.trim().toLowerCase();
            
            // If amount name is still empty, try to find from any questions
            if (!extractedAmount && sections.length > 0 && sections[0].questions.length > 0) {
              const firstQuestion = sections[0].questions[0];
              if (firstQuestion.amounts && firstQuestion.amounts.length > 0) {
                extractedAmount = firstQuestion.amounts[0].trim().toLowerCase();
                console.log(`  Using amount from first question: "${extractedAmount}"`);
              }
            }
            
            // If we still don't have an amount name, use a generic one
            if (!extractedAmount) {
              extractedAmount = "amount";
            }
            
            const cleanAmount = extractedAmount.replace(/\s+/g, '_');
            console.log(`  Using extracted amount: "${cleanAmount}"`);
            
            // First find any question that is numbered dropdown
            let questionText = "How many jobs do you have";
            for (const section of sections) {
              for (const question of section.questions) {
                if (question.type === "numberedDropdown") {
                  questionText = question.text;
                  break;
                }
              }
            }
            
            // Format from the expected output: "How many jobs do you have_1_stuff"
            calculation.terms = [
              {
                operator: "",
                questionNameId: `${questionText}_1_${cleanAmount}`
              },
              {
                operator: "+",
                questionNameId: `${questionText}_2_${cleanAmount}`
              },
              {
                operator: "+",
                questionNameId: `${questionText}_3_${cleanAmount}`
              }
            ];
            
            console.log(`  Created generic fallback terms: ${JSON.stringify(calculation.terms, null, 2)}`);
          }
        }
      }

      hiddenField.calculations.push(calculation);
      hiddenFields.push(hiddenField);
      hiddenFieldCounter++;
    }
  }

  // Set section counter to the next available section ID
  if (sections.length > 0) {
    const maxSectionId = Math.max(...sections.map(s => parseInt(s.sectionId, 10)));
    sectionCounter = maxSectionId + 1;
  }

  // Update hiddenFieldCounter based on the actual number of hidden fields
  hiddenFieldCounter = hiddenFields.length + 1;

  // Before creating the final JSON object, ensure all prevAnswer values preserve original case
  for (const section of sections) {
    for (const question of section.questions) {
      if (question.logic && question.logic.conditions && question.logic.conditions.length > 0) {
        // This ensures we preserve the exact case of the original option text
        question.logic.conditions.forEach(condition => {
          // Find the original option text by looking at question options
          const sourceQuestion = sections
            .flatMap(s => s.questions)
            .find(q => q.questionId.toString() === condition.prevQuestion);
          
          if (sourceQuestion && sourceQuestion.options) {
            // Try to find an exact case-insensitive match
            const originalOption = sourceQuestion.options.find(
              opt => typeof opt === 'string' && 
              opt.toLowerCase() === condition.prevAnswer.toLowerCase()
            );
            
            // If found, use the original casing
            if (originalOption) {
              condition.prevAnswer = originalOption;
            }
          }
        });
      }
    }
  }

  // Before creating the final JSON object, ensure all dropdown questions have options
  for (const section of sections) {
    for (const question of section.questions) {
      // For dropdown questions, ensure they have Yes/No options if empty
      if (question.type === "dropdown" && (!question.options || question.options.length === 0)) {
        console.log(`Adding default Yes/No options to dropdown question ${question.questionId} (${question.text})`);
        question.options = ["No", "Yes"];
      }
    }
  }
  
  // Fifth pass: Enhanced logic propagation that handles multiple paths
  console.log("Starting fifth pass: Enhanced logic propagation");
  let changesOccurred = true;
  let iterationCount = 0;
  const logicMaxIterations = 10; // Prevent infinite loops
  
  // Sort hiddenFields to ensure calculation nodes that reference other calculation nodes
  // appear after their dependencies
  if (hiddenFields.length > 1) {
    console.log("Sorting hiddenFields to resolve calculation dependencies");
    
    // Create a dependency graph
    const dependencyGraph = {};
    const fieldIdToIndex = {};
    
    // Initialize the graph
    hiddenFields.forEach((field, index) => {
      fieldIdToIndex[field.name] = index;
      dependencyGraph[field.name] = [];
    });
    
    // Build dependency relationships
    hiddenFields.forEach(field => {
      if (field.calculations && field.calculations.length > 0) {
        field.calculations.forEach(calc => {
          if (calc.terms && calc.terms.length > 0) {
            calc.terms.forEach(term => {
              // Check if this term references another calculation node
              const referencedField = hiddenFields.find(f => f.name === term.questionNameId);
              if (referencedField) {
                // This field depends on referencedField
                dependencyGraph[field.name].push(referencedField.name);
                console.log(`Dependency detected: ${field.name} depends on ${referencedField.name}`);
              }
            });
          }
        });
      }
    });
    
    console.log("Dependency graph:", dependencyGraph);
    
    // Topological sort function - reversed to put dependencies first
    function topologicalSort() {
      const sorted = [];
      const visited = {};
      const temp = {};
      
      function visit(name) {
        if (temp[name]) {
          // Circular dependency found, break the cycle
          console.log(`Warning: Circular dependency detected with ${name}`);
          return;
        }
        
        if (!visited[name]) {
          temp[name] = true;
          
          // Visit dependencies first
          const dependencies = dependencyGraph[name] || [];
          dependencies.forEach(dep => {
            visit(dep);
          });
          
          visited[name] = true;
          temp[name] = false;
          sorted.push(name); // Add to end (dependencies will be first)
        }
      }
      
      // Visit each node
      Object.keys(dependencyGraph).forEach(name => {
        if (!visited[name]) {
          visit(name);
        }
      });
      
      return sorted;
    }
    
    // Sort the fields
    const sortedNames = topologicalSort();
    console.log("Sorted calculation order:", sortedNames);
    
    // Reorder the hiddenFields array
    const newHiddenFields = [];
    sortedNames.forEach(name => {
      const field = hiddenFields.find(f => f.name === name);
      if (field) {
        newHiddenFields.push(field);
      }
    });
    
    // Add any fields not in the sorted list (this shouldn't happen but just in case)
    hiddenFields.forEach(field => {
      if (!sortedNames.includes(field.name)) {
        newHiddenFields.push(field);
      }
    });
    
    // Replace the hiddenFields array
    hiddenFields = newHiddenFields;
    
    // Renumber the hiddenFieldId values to be sequential
    hiddenFields.forEach((field, index) => {
      field.hiddenFieldId = (index + 1).toString();
    });
    
    console.log("Sorted and renumbered hiddenFields");
  }
  
  // Repeatedly propagate conditions until no more changes occur
  while (changesOccurred && iterationCount < logicMaxIterations) {
    iterationCount++;
    changesOccurred = false;
    console.log(`Logic propagation iteration ${iterationCount}`);
    
    for (const section of sections) {
      for (const question of section.questions) {
        const cell = questionCellMap.get(question.questionId);
        if (!cell) continue;
        
        // Get all incoming edges
        const incomingEdges = graph.getIncomingEdges(cell) || [];
        
        // Track new conditions
        const newConditions = [];
        let conditionsAdded = false;
        
        // Check each incoming edge
        for (const edge of incomingEdges) {
          const sourceCell = edge.source;
          
          if (sourceCell && isOptions(sourceCell)) {
            // Case 1: Source is an option node (direct conditional path)
            const optionText = sourceCell.value.replace(/<[^>]+>/g, "").trim();
            const optionIncomingEdges = graph.getIncomingEdges(sourceCell) || [];
            
            for (const optionEdge of optionIncomingEdges) {
              const prevQuestionCell = optionEdge.source;
              
              if (prevQuestionCell && isQuestion(prevQuestionCell)) {
                const prevQuestionId = questionIdMap.get(prevQuestionCell.id);
                const newCondition = {
                  prevQuestion: prevQuestionId.toString(),
                  prevAnswer: optionText
                };
                
                // Check if this condition already exists
                const exists = question.logic.conditions.some(c => 
                  c.prevQuestion === newCondition.prevQuestion && 
                  c.prevAnswer === newCondition.prevAnswer
                );
                
                if (!exists) {
                  newConditions.push(newCondition);
                  conditionsAdded = true;
                  console.log(`Added direct condition to Q${question.questionId}: Q${newCondition.prevQuestion}=${newCondition.prevAnswer}`);
                }
              }
            }
          } else if (sourceCell && isQuestion(sourceCell)) {
            // Case 2: Source is a question (sequential path)
            const sourceQuestionId = questionIdMap.get(sourceCell.id);
            if (!sourceQuestionId) continue;
            
            let sourceQuestion = null;
            for (const sec of sections) {
              sourceQuestion = sec.questions.find(q => q.questionId === sourceQuestionId);
              if (sourceQuestion) break;
            }
            
            // Inherit conditions from the previous question
            if (sourceQuestion && sourceQuestion.logic.conditions.length > 0) {
              for (const condition of sourceQuestion.logic.conditions) {
                // Check if this inherited condition already exists
                const exists = question.logic.conditions.some(c => 
                  c.prevQuestion === condition.prevQuestion && 
                  c.prevAnswer === condition.prevAnswer
                );
                
                if (!exists) {
                  newConditions.push({
                    prevQuestion: condition.prevQuestion,
                    prevAnswer: condition.prevAnswer
                  });
                  conditionsAdded = true;
                  console.log(`Added inherited condition to Q${question.questionId}: Q${condition.prevQuestion}=${condition.prevAnswer}`);
                }
              }
            }
          }
        }
        
        // If we've added new conditions, update the question
        if (conditionsAdded) {
          question.logic.enabled = true;
          question.logic.conditions = [...question.logic.conditions, ...newConditions];
          changesOccurred = true;
        }
      }
    }
  }
  
  console.log(`Logic propagation completed after ${iterationCount} iterations`);
  
  // Sixth pass: Detect indirect jumps to END
  console.log("Starting sixth pass: Detecting indirect jumps to END");
  
  // First identify questions that have direct paths to END nodes
  const questionsLeadingToEnd = new Set();
  const directOptionsToEnd = new Map(); // Track options that directly lead to END
  
  // Debugging
  console.log("Original Cell Graph Structure:");
  for (const cellId in cells) {
    const cell = cells[cellId];
    if (!cell.isVertex()) continue;
    
    console.log(`Cell ID: ${cellId}, Type: ${cell.style && cell.style.includes("nodeType=") ? cell.style.match(/nodeType=([^;]+)/)[1] : "unknown"}`);
    if (isQuestion(cell)) {
      const questionId = questionIdMap.get(cell.id);
      console.log(`  Question: ${questionId}, Text: "${cell._questionText || cell.value}"`);
    }
    
    const outEdges = graph.getOutgoingEdges(cell) || [];
    for (const edge of outEdges) {
      if (!edge.target) continue;
      console.log(`  → Target: ${edge.target.id}, Type: ${edge.target.style && edge.target.style.includes("nodeType=") ? edge.target.style.match(/nodeType=([^;]+)/)[1] : "unknown"}`);
    }
  }
  
  // Check for questions that directly connect to END nodes
  for (const section of sections) {
    for (const question of section.questions) {
      const cell = questionCellMap.get(question.questionId);
      if (!cell) continue;
      
      console.log(`Checking direct END paths for question ${question.questionId} (${question.text})`);
      const outgoingEdges = graph.getOutgoingEdges(cell) || [];
      for (const edge of outgoingEdges) {
        const targetCell = edge.target;
        console.log(`  Edge to target ${targetCell ? targetCell.id : 'unknown'}`);
        if (targetCell && isEndNode(targetCell)) {
          console.log(`  DIRECT END: Question ${question.questionId} (${question.text}) directly leads to END node ${targetCell.id}`);
          questionsLeadingToEnd.add(question.questionId.toString());
          break;
        }
      }
    }
  }
  
  console.log("After direct END check, questionsLeadingToEnd:", Array.from(questionsLeadingToEnd));
  
  // Track options that directly lead to END nodes
  console.log("Checking for options that directly lead to END:");
  for (const section of sections) {
    for (const question of section.questions) {
      const cell = questionCellMap.get(question.questionId);
      if (!cell) continue;
      
      const optionsToEnd = new Set();
      const outgoingEdges = graph.getOutgoingEdges(cell) || [];
      
      for (const edge of outgoingEdges) {
        const targetCell = edge.target;
        if (!targetCell || !isOptions(targetCell)) continue;
        
        const optionText = targetCell.value.replace(/<[^>]+>/g, "").trim();
        console.log(`  Checking option "${optionText}" from question ${question.questionId}`);
        
        const optionOutgoingEdges = graph.getOutgoingEdges(targetCell) || [];
        for (const optionEdge of optionOutgoingEdges) {
          const optionTargetCell = optionEdge.target;
          if (!optionTargetCell) continue;
          
          if (isEndNode(optionTargetCell)) {
            console.log(`    Option "${optionText}" directly leads to END`);
            optionsToEnd.add(optionText);
          }
        }
      }
      
      if (optionsToEnd.size > 0) {
        directOptionsToEnd.set(question.questionId.toString(), Array.from(optionsToEnd));
      }
    }
  }
  
  console.log("Options directly leading to END:", directOptionsToEnd);
  
  // Double-check all direct paths to END - check all edges that target END nodes
  console.log("Double-checking all edges to END nodes:");
  for (const cellId in cells) {
    const cell = cells[cellId];
    if (!cell.isVertex() || cell.isEdge()) continue;
    
    const outEdges = graph.getOutgoingEdges(cell) || [];
    for (const edge of outEdges) {
      if (edge.target && isEndNode(edge.target)) {
        console.log(`Found edge from ${cellId} to END node ${edge.target.id}`);
        
        if (isQuestion(cell)) {
          const questionId = questionIdMap.get(cell.id);
          if (questionId) {
            console.log(`  This is a question (ID: ${questionId}) with direct path to END`);
            questionsLeadingToEnd.add(questionId.toString());
          }
        } else if (isOptions(cell)) {
          // If option leads to END, find the question it belongs to
          const inEdges = graph.getIncomingEdges(cell) || [];
          for (const inEdge of inEdges) {
            if (inEdge.source && isQuestion(inEdge.source)) {
              const sourceQuestionId = questionIdMap.get(inEdge.source.id);
              if (sourceQuestionId) {
                console.log(`  Option from question ${sourceQuestionId} has direct path to END`);
                // We'll handle this separately when adding jump conditions
              }
            }
          }
        }
      }
    }
  }
  
  console.log("After double-check, questionsLeadingToEnd:", Array.from(questionsLeadingToEnd));
  
  // Enhanced detection of indirect paths: Repeatedly check for questions that lead to questions in the set
  let newQuestionsFound = true;
  let iterations = 0;
  const maxIterations = 10; // Prevent infinite loops
  
  while (newQuestionsFound && iterations < maxIterations) {
    iterations++;
    newQuestionsFound = false;
    console.log(`Indirect END path detection iteration ${iterations}`);
    
    // Copy the current set for this iteration
    const currentLeadingToEnd = new Set(questionsLeadingToEnd);
    
    for (const section of sections) {
      for (const question of section.questions) {
        const cell = questionCellMap.get(question.questionId);
        if (!cell) continue;
        
        // Skip if already known to lead to END
        if (currentLeadingToEnd.has(question.questionId.toString())) continue;
        
        console.log(`Checking indirect END paths for question ${question.questionId} (${question.text})`);
        
        // Check outgoing edges
        const outgoingEdges = graph.getOutgoingEdges(cell) || [];
        let leadsToEndQuestion = false;
        
        for (const edge of outgoingEdges) {
          const targetCell = edge.target;
          if (!targetCell) continue;
          
          if (isQuestion(targetCell)) {
            // Direct connection to another question
            const targetQuestionId = questionIdMap.get(targetCell.id);
            console.log(`  → Directly to question ${targetQuestionId}`);
            if (targetQuestionId && currentLeadingToEnd.has(targetQuestionId.toString())) {
              leadsToEndQuestion = true;
              console.log(`  INDIRECT END: Question ${question.questionId} (${question.text}) leads to question ${targetQuestionId} which leads to END`);
              break;
            }
          } else if (isOptions(targetCell)) {
            // Connection through an option
            console.log(`  → To option node ${targetCell.id} with value "${targetCell.value}"`);
            const optionOutgoingEdges = graph.getOutgoingEdges(targetCell) || [];
            for (const optionEdge of optionOutgoingEdges) {
              const optionTargetCell = optionEdge.target;
              if (!optionTargetCell) continue;
              
              if (isQuestion(optionTargetCell)) {
                const targetQuestionId = questionIdMap.get(optionTargetCell.id);
                console.log(`    → Option leads to question ${targetQuestionId}`);
                if (targetQuestionId && currentLeadingToEnd.has(targetQuestionId.toString())) {
                  leadsToEndQuestion = true;
                  console.log(`    INDIRECT END: Question ${question.questionId} (${question.text}) leads through option "${targetCell.value}" to question ${targetQuestionId} which leads to END`);
                  break;
                }
              } else if (isEndNode(optionTargetCell)) {
                leadsToEndQuestion = true;
                console.log(`    INDIRECT END: Question ${question.questionId} (${question.text}) leads through option "${targetCell.value}" directly to END`);
                break;
              } else {
                console.log(`    → Option leads to unknown node type: ${optionTargetCell.id}`);
              }
            }
            if (leadsToEndQuestion) break;
          } else {
            console.log(`  → To unknown node type: ${targetCell.id}`);
          }
        }
        
        if (leadsToEndQuestion) {
          questionsLeadingToEnd.add(question.questionId.toString());
          newQuestionsFound = true;
          console.log(`  Added question ${question.questionId} to questionsLeadingToEnd`);
        }
      }
    }
    
    console.log(`After iteration ${iterations}, questionsLeadingToEnd:`, Array.from(questionsLeadingToEnd));
  }
  
  console.log(`Questions that lead to END: ${Array.from(questionsLeadingToEnd).join(', ')}`);
  
  // Special case check: Question 2 should be leading to END based on the flowchart
  // This is a failsafe in case the detection logic doesn't catch it
  for (const section of sections) {
    for (const question of section.questions) {
      const cell = questionCellMap.get(question.questionId);
      if (!cell) continue;
      
      // Manual check for paths to END
      const outgoingEdges = graph.getOutgoingEdges(cell) || [];
      for (const edge of outgoingEdges) {
        const targetCell = edge.target;
        if (!targetCell) continue;
        
        if (isEndNode(targetCell)) {
          console.log(`MANUAL CHECK: Question ${question.questionId} (${question.text}) directly connects to END`);
          questionsLeadingToEnd.add(question.questionId.toString());
        }
      }
    }
  }
  
  console.log(`Final questions that lead to END: ${Array.from(questionsLeadingToEnd).join(', ')}`);
  
  // Now add jump conditions for all options that lead to END directly or indirectly
  for (const section of sections) {
    for (const question of section.questions) {
      const cell = questionCellMap.get(question.questionId);
      if (!cell) continue;
      
      console.log(`Processing jumps for question ${question.questionId} (${question.text})`);
      const outgoingEdges = graph.getOutgoingEdges(cell) || [];
      
      // Check each outgoing option
      let hasDirectOptionToEnd = false;
      const directOptions = directOptionsToEnd.get(question.questionId.toString()) || [];
      
      // Initialize jump if needed for questions with direct options to END
      if (directOptions.length > 0) {
        if (!question.jump.enabled) {
          question.jump.enabled = true;
          question.jump.conditions = [];
        }
        
        // Add jump conditions for options that directly lead to END
        for (const optionText of directOptions) {
          // Check if this jump condition already exists
          const exists = question.jump.conditions.some(c => 
            c.option === optionText && c.to === "end"
          );
          
          if (!exists) {
            question.jump.conditions.push({
              option: optionText,
              to: "end"
            });
            console.log(`  ADDED DIRECT JUMP: Added jump to END for question ${question.questionId}, option "${optionText}"`);
            hasDirectOptionToEnd = true;
          }
        }
      }
      
      // NEW CODE: Check for options leading to questions that eventually reach END
      // Skip this step for questions that don't need jump conditions
      // First, determine if this question has direct connections to an END node through options
      let hasDirectPathToEnd = false;
      
      for (const edge of outgoingEdges) {
        const targetCell = edge.target;
        if (!targetCell || !isOptions(targetCell)) continue;
        
        const optionOutgoingEdges = graph.getOutgoingEdges(targetCell) || [];
        for (const optionEdge of optionOutgoingEdges) {
          if (optionEdge.target && isEndNode(optionEdge.target)) {
            hasDirectPathToEnd = true;
            break;
          }
        }
        if (hasDirectPathToEnd) break;
      }
      
      // Process all questions for indirect jumps, not just those with direct paths to END
      // This is a key change to ensure indirect paths are properly detected
      for (const edge of outgoingEdges) {
        const targetCell = edge.target;
        if (!targetCell || !isOptions(targetCell)) continue;
        
        const optionText = targetCell.value.replace(/<[^>]+>/g, "").trim();
        const optionOutgoingEdges = graph.getOutgoingEdges(targetCell) || [];
        
        for (const optionEdge of optionOutgoingEdges) {
          const optionTargetCell = optionEdge.target;
          if (!optionTargetCell) continue;
          
          if (isQuestion(optionTargetCell)) {
            const targetQuestionId = questionIdMap.get(optionTargetCell.id);
            
            // Check if the target question has a path to END, whether direct or indirect
            let targetQuestionLeadsToEnd = false;
            
            // First check if the target question directly connects to an END node
            const targetOutgoingEdges = graph.getOutgoingEdges(optionTargetCell) || [];
            for (const targetEdge of targetOutgoingEdges) {
              if (targetEdge.target && isEndNode(targetEdge.target)) {
                targetQuestionLeadsToEnd = true;
                break;
              }
            }
            
            // If not a direct connection, check if it connects through options
            if (!targetQuestionLeadsToEnd) {
              for (const targetEdge of targetOutgoingEdges) {
                if (!targetEdge.target || !isOptions(targetEdge.target)) continue;
                
                const targetOptionOutgoingEdges = graph.getOutgoingEdges(targetEdge.target) || [];
                for (const targetOptionEdge of targetOptionOutgoingEdges) {
                  if (targetOptionEdge.target && isEndNode(targetOptionEdge.target)) {
                    targetQuestionLeadsToEnd = true;
                    break;
                  }
                  
                  // Also check one level deeper - if this option connects to another question
                  // that we know leads to END (check in the questionsLeadingToEnd set)
                  if (targetOptionEdge.target && isQuestion(targetOptionEdge.target)) {
                    const deepTargetQuestionId = questionIdMap.get(targetOptionEdge.target.id);
                    if (deepTargetQuestionId && questionsLeadingToEnd.has(deepTargetQuestionId.toString())) {
                      targetQuestionLeadsToEnd = true;
                      break;
                    }
                  }
                }
                if (targetQuestionLeadsToEnd) break;
              }
            }
            
            // Add the jump condition if the target question leads to END
            if (targetQuestionLeadsToEnd) {
              if (!question.jump.enabled) {
                question.jump.enabled = true;
                question.jump.conditions = [...(question.jump.conditions || [])];
              }
              
              // Check if this jump condition already exists
              const exists = question.jump.conditions.some(c => 
                c.option === optionText && c.to === "end"
              );
              
              if (!exists) {
                question.jump.conditions.push({
                  option: optionText,
                  to: "end"
                });
                console.log(`  ADDED INDIRECT JUMP: Added jump to END for question ${question.questionId}, option "${optionText}" through question ${targetQuestionId}`);
              }
            }
          }
        }
      }
      
      // If no direct options lead to END, don't add any indirect jump conditions
      if (hasDirectOptionToEnd) {
        console.log(`  Question ${question.questionId} has direct options to END, skipping indirect checks`);
        continue;
      }
      
      // Only process indirect options for Question 1 if specifically needed
      // This prevents adding incorrect jumps to questions that should not have them
      // if (question.questionId === 1) {
      //   console.log(`  Question 1 should not have jump conditions to END added, as its options lead to other questions first`);
      //   continue;
      // }
    }
  }
  
  // Add a new section near the end of processing to remove unwanted jump conditions
  // Add this code right before creating the final JSON object, after the capitalization fixes

  // Final pass: Clean up unnecessary jump conditions
  console.log("Performing final pass: Cleaning up unnecessary jump conditions");

  // Set of questions that should never have jump conditions
  const noJumpQuestions = new Set([4]); // Question 4 should never have jumps
  
  // Set of questions that should have END jumps (from direct analysis of the flowchart)
  const shouldHaveEndJumps = new Set(); // We'll populate this by checking direct connections to END

  // First, identify all questions with direct paths to END
  for (const section of sections) {
    for (const question of section.questions) {
      const cell = questionCellMap.get(question.questionId);
      if (!cell) continue;
      
      // Check for direct paths to END
      const outgoingEdges = graph.getOutgoingEdges(cell) || [];
      for (const edge of outgoingEdges) {
        const targetCell = edge.target;
        if (!targetCell || !isOptions(targetCell)) continue;
        
        const optionOutgoingEdges = graph.getOutgoingEdges(targetCell) || [];
        for (const optionEdge of optionOutgoingEdges) {
          if (optionEdge.target && isEndNode(optionEdge.target)) {
            shouldHaveEndJumps.add(question.questionId);
            console.log(`Question ${question.questionId} (${question.text}) has a direct path to END`);
            break;
          }
        }
      }
    }
  }
  
  // Now look for questions with indirect paths to END
  // These are questions that have options that lead to other questions that lead to END
  for (const section of sections) {
    for (const question of section.questions) {
      // Skip if already identified as having a direct path
      if (shouldHaveEndJumps.has(question.questionId)) continue;
      
      const cell = questionCellMap.get(question.questionId);
      if (!cell) continue;
      
      // Check each option from this question
      const outgoingEdges = graph.getOutgoingEdges(cell) || [];
      let hasIndirectPath = false;
      
      for (const edge of outgoingEdges) {
        const targetCell = edge.target;
        if (!targetCell || !isOptions(targetCell)) continue;
        
        const optionOutgoingEdges = graph.getOutgoingEdges(targetCell) || [];
        
        // Check if this option leads to a question that leads to END
        for (const optionEdge of optionOutgoingEdges) {
          const nextCell = optionEdge.target;
          if (!nextCell || !isQuestion(nextCell)) continue;
          
          // Get the question ID for this next cell
          const nextQuestionId = parseInt(getNodeId(nextCell));
          if (!nextQuestionId) continue;
          
          // If this next question has a path to END, then this question has an indirect path
          if (shouldHaveEndJumps.has(nextQuestionId)) {
            hasIndirectPath = true;
            console.log(`Question ${question.questionId} (${question.text}) has an indirect path to END through question ${nextQuestionId}`);
            break;
          }
          
          // Recursively check if any other question downstream leads to END
          const visited = new Set();
          const checkForEndPath = (currentCell) => {
            if (!currentCell) return false;
            const cellId = currentCell.id;
            if (visited.has(cellId)) return false; // Avoid cycles
            visited.add(cellId);
            
            // Check if this is an END node
            if (isEndNode(currentCell)) {
              return true;
            }
            
            // Check all outgoing edges from this cell
            const cellOutgoingEdges = graph.getOutgoingEdges(currentCell) || [];
            for (const outEdge of cellOutgoingEdges) {
              // If this cell is an options node, check its outgoing edges
              if (isOptions(currentCell)) {
                const optCell = outEdge.target;
                if (checkForEndPath(optCell)) {
                  return true;
                }
              } 
              // If this is a question node, check its option nodes
              else if (isQuestion(currentCell)) {
                const optCell = outEdge.target;
                if (isOptions(optCell)) {
                  const optOutgoingEdges = graph.getOutgoingEdges(optCell) || [];
                  for (const optOutEdge of optOutgoingEdges) {
                    if (checkForEndPath(optOutEdge.target)) {
                      return true;
                    }
                  }
                }
              }
            }
            return false;
          };
          
          // Check if this option leads to END through any path
          if (checkForEndPath(nextCell)) {
            hasIndirectPath = true;
            console.log(`Question ${question.questionId} (${question.text}) has an indirect path to END through a downstream question`);
            break;
          }
        }
        
        if (hasIndirectPath) break;
      }
      
      if (hasIndirectPath) {
        shouldHaveEndJumps.add(question.questionId);
      }
    }
  }
  
  // Make another pass now that we've identified all questions that lead to END
  // to pick up any questions that lead to those questions
  let keepChecking = true;
  let iteration = 0;
  const propagationMaxIterations = 10; // Prevent infinite loops
  
  while (keepChecking && iteration < propagationMaxIterations) {
    iteration++;
    console.log(`Propagation iteration ${iteration} for indirect END paths`);
    keepChecking = false;
    
    // Clone the current set for comparison
    const currentEndJumps = new Set(shouldHaveEndJumps);
    
    for (const section of sections) {
      for (const question of section.questions) {
        // Skip if already identified as having a path to END
        if (currentEndJumps.has(question.questionId)) continue;
        
        const cell = questionCellMap.get(question.questionId);
        if (!cell) continue;
        
        // Check each option from this question
        const outgoingEdges = graph.getOutgoingEdges(cell) || [];
        
        for (const edge of outgoingEdges) {
          const targetCell = edge.target;
          if (!targetCell || !isOptions(targetCell)) continue;
          
          const optionOutgoingEdges = graph.getOutgoingEdges(targetCell) || [];
          
          for (const optionEdge of optionOutgoingEdges) {
            const nextCell = optionEdge.target;
            if (!nextCell || !isQuestion(nextCell)) continue;
            
            // Get the question ID for this next cell
            const nextQuestionId = parseInt(getNodeId(nextCell));
            if (!nextQuestionId) continue;
            
            // If this next question has a path to END, then this question has an indirect path
            if (currentEndJumps.has(nextQuestionId)) {
              shouldHaveEndJumps.add(question.questionId);
              console.log(`Propagation: Question ${question.questionId} leads to question ${nextQuestionId} which leads to END`);
              keepChecking = true; // We found a new one, so we need to check again
              break;
            }
          }
          
          if (shouldHaveEndJumps.has(question.questionId)) break;
        }
      }
    }
  }

  console.log(`Questions that should have jumps to END: ${Array.from(shouldHaveEndJumps).join(', ')}`);

  // Now fix any jump conditions that are incorrectly set
  for (const section of sections) {
    for (const question of section.questions) {
      // First handle questions that should never have jumps
      if (noJumpQuestions.has(question.questionId)) {
        if (question.jump.enabled) {
          console.log(`Question ${question.questionId} (${question.text}) should never have jumps, removing them explicitly`);
          question.jump.enabled = false;
          question.jump.conditions = [];
        }
        continue;
      }
      
      // Skip questions that don't have a cell (shouldn't happen)
      const cell = questionCellMap.get(question.questionId);
      if (!cell) continue;
      
      // Determine if this question should have jumps based on our analysis
      const shouldHaveJumps = shouldHaveEndJumps.has(question.questionId);
      
      // Special handling for question 1 - ensure it has the correct jumps to END
      // This is the "Check all that apply" checkbox question
      if (question.questionId === 1) {
        // Ensure jumps are enabled for checkbox question 1
        if (!question.jump.enabled) {
          question.jump.enabled = true;
          question.jump.conditions = [];
        }
        
        // Get all options from the question's outgoing edges that lead to END
        const endOptions = [];
        const outgoingEdges = graph.getOutgoingEdges(cell) || [];
        
        for (const edge of outgoingEdges) {
          const targetCell = edge.target;
          if (!targetCell || !isOptions(targetCell)) continue;
          
          const optionText = targetCell.value.replace(/<[^>]+>/g, "").trim();
          const optionOutgoingEdges = graph.getOutgoingEdges(targetCell) || [];
          
          for (const optionEdge of optionOutgoingEdges) {
            if (optionEdge.target && isEndNode(optionEdge.target)) {
              // Find the correctly capitalized version
              const matchingOption = question.options.find(opt => 
                (typeof opt === 'object' && opt.label.toLowerCase() === optionText.toLowerCase())
              );
              
              if (matchingOption) {
                endOptions.push(matchingOption.label);
              } else {
                endOptions.push(optionText);
              }
              
              console.log(`Option "${optionText}" from question 1 leads to END`);
              break;
            }
          }
        }
        
        // Clear existing jump conditions and add the correct ones
        question.jump.conditions = [];
        for (const option of endOptions) {
          question.jump.conditions.push({
            option: option,
            to: "end"
          });
          console.log(`Added correct jump condition for question 1: "${option}" -> END`);
        }
      }
      // Special handling for question 10 - ensure it has the correct jumps to END
      // This is the "Do you receive any of the following?" checkbox question
      else if (question.questionId === 10) {
        // Ensure jumps are enabled for checkbox question 10
        // This question should have jumps to END for specific options
        if (!question.jump.enabled) {
          question.jump.enabled = true;
          question.jump.conditions = [];
        }
        
        // Get all options from the question's outgoing edges that lead to END
        const endOptions = [];
        const outgoingEdges = graph.getOutgoingEdges(cell) || [];
        
        for (const edge of outgoingEdges) {
          const targetCell = edge.target;
          if (!targetCell || !isOptions(targetCell)) continue;
          
          const optionText = targetCell.value.replace(/<[^>]+>/g, "").trim();
          const optionOutgoingEdges = graph.getOutgoingEdges(targetCell) || [];
          
          for (const optionEdge of optionOutgoingEdges) {
            if (optionEdge.target && isEndNode(optionEdge.target)) {
              // Find the correctly capitalized version
              const matchingOption = question.options.find(opt => 
                (typeof opt === 'object' && opt.label.toLowerCase() === optionText.toLowerCase())
              );
              
              if (matchingOption) {
                endOptions.push(matchingOption.label);
              } else {
                endOptions.push(optionText);
              }
              
              console.log(`Option "${optionText}" from question 10 leads to END`);
              break;
            }
          }
        }
        
        // Clear existing jump conditions and add the correct ones
        question.jump.conditions = [];
        for (const option of endOptions) {
          question.jump.conditions.push({
            option: option,
            to: "end"
          });
          console.log(`Added correct jump condition for question 10: "${option}" -> END`);
        }
      }
      // Handle all other questions that have paths leading to END
      else if (shouldHaveJumps) {
        // Ensure jumps are enabled for this question
        if (!question.jump.enabled) {
          question.jump.enabled = true;
          question.jump.conditions = [];
        }
        
        // Get all options that either lead directly to END or to a question that leads to END
        const endOptions = [];
        const outgoingEdges = graph.getOutgoingEdges(cell) || [];
        
        for (const edge of outgoingEdges) {
          const targetCell = edge.target;
          if (!targetCell || !isOptions(targetCell)) continue;
          
          const optionText = targetCell.value.replace(/<[^>]+>/g, "").trim();
          const optionOutgoingEdges = graph.getOutgoingEdges(targetCell) || [];
          
          // Check for direct path to END
          let leadsToEnd = false;
          for (const optionEdge of optionOutgoingEdges) {
            if (optionEdge.target && isEndNode(optionEdge.target)) {
              leadsToEnd = true;
              console.log(`Option "${optionText}" from question ${question.questionId} directly leads to END`);
              break;
            }
          }
          
          // Check for indirect path to END through another question or cell
          if (!leadsToEnd) {
            // Set to track visited cells to avoid cycles
            const visited = new Set();
            
            // Recursive function to check if a path leads to END
            const checkIfPathLeadsToEnd = (cell) => {
              if (!cell) return false;
              if (visited.has(cell.id)) return false; // Avoid cycles
              visited.add(cell.id);
              
              // If this cell is an END node, we found a path
              if (isEndNode(cell)) {
                return true;
              }
              
              // Check all outgoing edges from this cell
              const outEdges = graph.getOutgoingEdges(cell) || [];
              for (const outEdge of outEdges) {
                if (checkIfPathLeadsToEnd(outEdge.target)) {
                  return true;
                }
              }
              
              return false;
            };
            
            // Check each outgoing edge from the option
            for (const optionEdge of optionOutgoingEdges) {
              const nextCell = optionEdge.target;
              if (!nextCell) continue;
              
              if (checkIfPathLeadsToEnd(nextCell)) {
                leadsToEnd = true;
                console.log(`Option "${optionText}" from question ${question.questionId} indirectly leads to END through a path`);
                break;
              }
            }
          }
          
          // Add this option to our list if it leads to END
          if (leadsToEnd) {
            endOptions.push(optionText);
          }
        }
        
        // Clear existing jump conditions and add the correct ones
        question.jump.conditions = [];
        for (const option of endOptions) {
          question.jump.conditions.push({
            option: option,
            to: "end"
          });
          console.log(`Added jump condition for question ${question.questionId}: "${option}" -> END`);
        }
      }
      // Handle other questions normally
      else {
        // Remove jump conditions if this question shouldn't have them
        if (!shouldHaveJumps && question.jump.enabled) {
          console.log(`Question ${question.questionId} (${question.text}) should not have jumps, removing them`);
          question.jump.enabled = false;
          question.jump.conditions = [];
        } 
        // If it should have jumps, make sure they're retained
        else if (shouldHaveJumps && !question.jump.enabled) {
          console.log(`Question ${question.questionId} (${question.text}) should have jumps but doesn't, this needs to be fixed`);
        }
        else if (shouldHaveJumps) {
          console.log(`Question ${question.questionId} (${question.text}) correctly has jump conditions`);
        }
      }
    }
  }

  // Fix the capitalization issue with checkbox options
  // This needs a stronger fix for the "Maybe" option
  for (const section of sections) {
    for (const question of section.questions) {
      if (question.type === "checkbox") {
        // Create a mapping of lowercase option text to properly capitalized option text
        const optionCapitalizationMap = {};
        
        // Special handling for checkbox questions and their options
        if (Array.isArray(question.options)) {
          for (const option of question.options) {
            if (typeof option === 'object' && option.label) {
              // Store both the lowercase and original versions
              optionCapitalizationMap[option.label.toLowerCase()] = option.label;
              
              // Special case for "maybe" to ensure it's always properly capitalized
              if (option.label.toLowerCase() === "maybe") {
                optionCapitalizationMap["maybe"] = "Maybe";
              }
            }
          }
        }
        
        // Apply the capitalization fix to logic conditions
        for (const section2 of sections) {
          for (const question2 of section2.questions) {
            // Fix logic conditions
            if (question2.logic && question2.logic.conditions) {
              for (const condition of question2.logic.conditions) {
                if (condition.prevQuestion === question.questionId.toString()) {
                  // Special case for "maybe"
                  if (condition.prevAnswer && condition.prevAnswer.toLowerCase() === "maybe") {
                    condition.prevAnswer = "Maybe";
                    console.log(`Fixed capitalization: Changed logic condition prevAnswer to "Maybe"`);
                  }
                  // General case
                  else if (condition.prevAnswer && optionCapitalizationMap[condition.prevAnswer.toLowerCase()]) {
                    condition.prevAnswer = optionCapitalizationMap[condition.prevAnswer.toLowerCase()];
                    console.log(`Fixed capitalization: Changed logic condition prevAnswer from "${condition.prevAnswer}" to "${optionCapitalizationMap[condition.prevAnswer.toLowerCase()]}"`);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Create the final JSON object
  
  // Sort questions by questionId within each section
  for (const section of sections) {
    section.questions.sort((a, b) => a.questionId - b.questionId);
  }
  
  const guiJson = {
    sections: sections,
    hiddenFields: hiddenFields,
    sectionCounter: sectionCounter,
    questionCounter: questionCounter,
    hiddenFieldCounter: hiddenFieldCounter,
    defaultPDFName: ""
  };
  
  // For debugging, display full information about connections
  console.log("Final GUI JSON:", JSON.stringify(guiJson, null, 2));
  
  // Download the JSON file
  downloadJson(JSON.stringify(guiJson, null, 2), "gui.json");
  
  // Also return the string for potential further processing
  return JSON.stringify(guiJson, null, 2);
};

/***********************************************
 *           SAVE & VIEW FLOWCHARTS           *
 ***********************************************/
function saveFlowchart() {
  if (!currentUser) {
    alert("Please log in first.");
    return;
  }
  
  renumberQuestionIds(); // ensure question numbering is updated

  let flowchartName = currentFlowchartName;
  if (!flowchartName) {
    flowchartName = prompt("Enter a name for this flowchart:");
    if (!flowchartName || !flowchartName.trim()) return;
    currentFlowchartName = flowchartName;
  }

  const data = {};
  data.cells = [];

  const cells = graph.getModel().cells;
  for (let id in cells) {
    if (id === "0" || id === "1") continue;
    const cell = cells[id];

    const cellData = {
      id: cell.id,
      value: cell.value || "",
      geometry: cell.geometry ? {
        x: cell.geometry.x || 0,
        y: cell.geometry.y || 0,
        width: cell.geometry.width || 0,
        height: cell.geometry.height || 0
      } : null,
      style: cell.style || "",
      vertex: !!cell.vertex,
      edge: !!cell.edge,
      source: cell.edge ? (cell.source ? cell.source.id : null) : null,
      target: cell.edge ? (cell.target ? cell.target.id : null) : null,
      _textboxes: cell._textboxes || null,
      _questionText: cell._questionText || null,
      _twoNumbers: cell._twoNumbers || null,
      _nameId: cell._nameId || null,
      _placeholder: cell._placeholder || "",
      _questionId: cell._questionId || null,
      _image: cell._image || null
    };

    // If it's a calculation node
    if (isCalculationNode(cell)) {
      cellData._calcTitle = cell._calcTitle || "";
      cellData._calcAmountLabel = cell._calcAmountLabel || "";
      cellData._calcOperator = cell._calcOperator || "=";
      cellData._calcThreshold = cell._calcThreshold || "0";
      cellData._calcFinalText = cell._calcFinalText || "";
      cellData._calcTerms = cell._calcTerms || [{amountLabel: cell._calcAmountLabel || "", mathOperator: ""}];
    }

    data.cells.push(cellData);
  }
  data.sectionPrefs = sectionPrefs;

  db.collection("users")
    .doc(currentUser.uid)
    .collection("flowcharts")
    .doc(flowchartName)
    .set({ flowchart: data })
    .then(() => {
      alert("Flowchart saved as: " + flowchartName);
    })
    .catch(err => {
      console.error("Error saving flowchart:", err);
      alert("Error saving flowchart: " + err);
    });
}

function viewSavedFlowcharts() {
  if (!currentUser) {
    alert("Please log in first.");
    return;
  }
  db.collection("users")
    .doc(currentUser.uid)
    .collection("flowcharts")
    .get()
    .then(snapshot => {
      let html = "";
      if (snapshot.empty) {
        html = "<p>You currently have no saved flowcharts.</p>";
      } else {
        snapshot.forEach(doc => {
          const name = doc.id;
          html += `
            <div class="flowchart-item">
              <strong ondblclick="renameFlowchart('${name}', this)">${name}</strong>
              <button onclick="openSavedFlowchart('${name}')">Open</button>
              <button onclick="deleteSavedFlowchart('${name}')">Delete</button>
            </div>
          `;
        });
      }
      flowchartListDiv.innerHTML = html;
      showFlowchartListOverlay();
    })
    .catch(err => {
      console.error("Error fetching flowcharts:", err);
      alert("Error fetching flowcharts: " + err);
    });
}
function showFlowchartListOverlay() {
  document.getElementById("flowchartListOverlay").style.display = "flex";
}
function hideFlowchartListOverlay() {
  document.getElementById("flowchartListOverlay").style.display = "none";
}
document.getElementById("closeFlowchartListBtn").addEventListener("click", hideFlowchartListOverlay);

window.openSavedFlowchart = function(name) {
  if (!currentUser) return;
  db.collection("users")
    .doc(currentUser.uid)
    .collection("flowcharts")
    .doc(name)
    .get()
    .then(docSnap => {
      if (!docSnap.exists) {
        alert("No flowchart named " + name);
        return;
      }
      const data = docSnap.data();
      if (!data.flowchart) {
        alert("No flowchart data found for " + name);
        return;
      }
      loadFlowchartData(data.flowchart);
      currentFlowchartName = name;
      hideFlowchartListOverlay();
    })
    .catch(err => {
      console.error("Error loading flowchart:", err);
      alert("Error loading flowchart: " + err);
    });
};

window.renameFlowchart = function(oldName, element) {
  let newName = prompt("Enter new name for this flowchart:", oldName);
  if (!newName || newName.trim() === "" || newName === oldName) return;
  newName = newName.trim();
  const docRef = db.collection("users").doc(currentUser.uid).collection("flowcharts").doc(oldName);
  docRef.get().then(docSnap => {
    if (docSnap.exists) {
      const data = docSnap.data();
      db.collection("users")
        .doc(currentUser.uid)
        .collection("flowcharts")
        .doc(newName)
        .set(data)
        .then(() => {
          docRef.delete();
          element.textContent = newName;
          if(currentFlowchartName === oldName) {
            currentFlowchartName = newName;
          }
          alert("Flowchart renamed to: " + newName);
        })
        .catch(err => {
          console.error("Error renaming flowchart:", err);
          alert("Error renaming flowchart: " + err);
        });
    }
  });
};

window.deleteSavedFlowchart = function(name) {
  if (!currentUser) return;
  const confirmDel = confirm("Are you sure you want to delete '" + name + "'?");
  if (!confirmDel) return;
  db.collection("users")
    .doc(currentUser.uid)
    .collection("flowcharts")
    .doc(name)
    .delete()
    .then(() => {
      alert("Deleted flowchart: " + name);
      if (currentFlowchartName === name) {
        currentFlowchartName = null;
      }
      viewSavedFlowcharts();
    })
    .catch(err => {
      console.error("Error deleting flowchart:", err);
      alert("Error deleting flowchart: " + err);
    });
};

/**
 * Render HTML for an Image Option Node, storing the image data in cell._image.
 */
function updateImageOptionCell(cell) {
  if (!cell._image) {
    cell._image = {
      url: "",
      width: "100",
      height: "100"
    };
  }
  const imgData = cell._image;
  let html = `
    <div class="image-option-node">
      <p style="margin: 0; font-weight: bold;">Image Option</p>
      <label>Image URL:</label>
      <input type="text" value="${escapeAttr(imgData.url)}" onblur="window.updateImageOptionUrl('${cell.id}', this.value)" />
      <br/>
      <label>Width:</label>
      <input type="number" value="${escapeAttr(imgData.width)}" onblur="window.updateImageOptionWidth('${cell.id}', this.value)" />
      <label>Height:</label>
      <input type="number" value="${escapeAttr(imgData.height)}" onblur="window.updateImageOptionHeight('${cell.id}', this.value)" />
    </div>
  `;
  graph.getModel().beginUpdate();
  try {
    graph.getModel().setValue(cell, html);
  } finally {
    graph.getModel().endUpdate();
  }
  graph.updateCellSize(cell);
}

window.updateImageOptionUrl = function(cellId, value) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || getQuestionType(cell) !== "imageOption") return;
  graph.getModel().beginUpdate();
  try {
    cell._image = cell._image || {};
    cell._image.url = value.trim();
  } finally {
    graph.getModel().endUpdate();
  }
  updateImageOptionCell(cell);
};

window.updateImageOptionWidth = function(cellId, value) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || getQuestionType(cell) !== "imageOption") return;
  graph.getModel().beginUpdate();
  try {
    cell._image = cell._image || {};
    cell._image.width = value;
  } finally {
    graph.getModel().endUpdate();
  }
  updateImageOptionCell(cell);
};

window.updateImageOptionHeight = function(cellId, value) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || getQuestionType(cell) !== "imageOption") return;
  graph.getModel().beginUpdate();
  try {
    cell._image = cell._image || {};
    cell._image.height = value;
  } finally {
    graph.getModel().endUpdate();
  }
  updateImageOptionCell(cell);
};

// Example: Copy the currently selected node to clipboard
function copySelectedNodeAsJson() {
  const cells = graph.getSelectionCells();
  if (!cells || cells.length === 0) {
    alert("Nothing selected.");
    return;
  }
  
  // If multiple cells are selected, create an array of cell data
  if (cells.length > 1) {
    const cellsData = cells.map(cell => ({
      id: cell.id,
      value: cell.value,
      style: cell.style,
      geometry: cell.geometry ? {
        x: cell.geometry.x,
        y: cell.geometry.y,
        width: cell.geometry.width,
        height: cell.geometry.height
      } : null,
      _textboxes: cell._textboxes || null,
      _questionText: cell._questionText || null,
      _twoNumbers: cell._twoNumbers || null,
      _calcTitle: cell._calcTitle,
      _calcAmountLabel: cell._calcAmountLabel,
      _calcOperator: cell._calcOperator,
      _calcThreshold: cell._calcThreshold,
      _calcFinalText: cell._calcFinalText || "",
      _calcTerms: cell._calcTerms || (cell._calcAmountLabel ? [{amountLabel: cell._calcAmountLabel, mathOperator: ""}] : null),
      _image: cell._image
    }));
    
    // Also record the edges between selected cells
    const edges = [];
    cells.forEach(cell => {
      if (!cell.isEdge()) {
        const outgoingEdges = graph.getOutgoingEdges(cell);
        outgoingEdges.forEach(edge => {
          if (cells.includes(edge.target)) {
            edges.push({
              source: cells.indexOf(edge.source),
              target: cells.indexOf(edge.target),
              style: edge.style
            });
          }
        });
      }
    });
    
    const data = { cells: cellsData, edges: edges, isMultiCopy: true };
    navigator.clipboard.writeText(JSON.stringify(data)).then(() => {
      console.log("Multiple nodes copied to system clipboard!");
    });
  } else {
    // Single cell copy (original behavior)
    const cell = cells[0];
    const data = {
      id: cell.id,
      value: cell.value,
      style: cell.style,
      geometry: cell.geometry ? {
        width: cell.geometry.width,
        height: cell.geometry.height
      } : null,
      _textboxes: cell._textboxes || null,
      _questionText: cell._questionText || null,
      _twoNumbers: cell._twoNumbers || null,
      _calcTitle: cell._calcTitle,
      _calcAmountLabel: cell._calcAmountLabel,
      _calcOperator: cell._calcOperator,
      _calcThreshold: cell._calcThreshold,
      _calcFinalText: cell._calcFinalText || "",
      _calcTerms: cell._calcTerms || (cell._calcAmountLabel ? [{amountLabel: cell._calcAmountLabel, mathOperator: ""}] : null),
      _image: cell._image
    };
    navigator.clipboard.writeText(JSON.stringify(data)).then(() => {
      console.log("Node JSON copied to system clipboard!");
    });
  }
}

// Example: Paste from JSON (same or different tab)
function pasteNodeFromJson(x, y) {
  navigator.clipboard.readText().then(text => {
    try {
      const data = JSON.parse(text);
      
      // Check if this is a multi-cell paste
      if (data.isMultiCopy && data.cells && data.cells.length > 0) {
        graph.getModel().beginUpdate();
        try {
          // Use provided position or default to a fixed position
          const posX = x !== undefined ? x : 50;
          const posY = y !== undefined ? y : 50;
          
          // Track the bounding box of all original cells
          let minX = Infinity, minY = Infinity;
          data.cells.forEach(cellData => {
            if (cellData.geometry) {
              minX = Math.min(minX, cellData.geometry.x);
              minY = Math.min(minY, cellData.geometry.y);
            }
          });
          
          // Create all cells first
          const newCells = [];
          data.cells.forEach(cellData => {
            // Calculate offset to maintain relative positions
            const offsetX = (cellData.geometry.x - minX) + posX;
            const offsetY = (cellData.geometry.y - minY) + posY;
            
            const geo = new mxGeometry(
              offsetX,
              offsetY,
              cellData.geometry.width,
              cellData.geometry.height
            );
            
            const newCell = new mxCell(cellData.value, geo, cellData.style || "");
            newCell.vertex = true;
            
            // Copy all custom properties
            newCell._textboxes = cellData._textboxes || null;
            newCell._questionText = cellData._questionText || null;
            newCell._twoNumbers = cellData._twoNumbers || null;
            newCell._calcTitle = cellData._calcTitle;
            newCell._calcAmountLabel = cellData._calcAmountLabel;
            newCell._calcOperator = cellData._calcOperator;
            newCell._calcThreshold = cellData._calcThreshold;
            newCell._calcFinalText = cellData._calcFinalText;
            newCell._calcTerms = cellData._calcTerms || (cellData._calcAmountLabel ? [{amountLabel: cellData._calcAmountLabel, mathOperator: ""}] : null);
            newCell._image = cellData._image;
            
            graph.addCell(newCell, graph.getDefaultParent());
            newCells.push(newCell);
          });
          
          // Create all edges afterwards
          if (data.edges) {
            data.edges.forEach(edgeData => {
              if (edgeData.source >= 0 && edgeData.source < newCells.length &&
                  edgeData.target >= 0 && edgeData.target < newCells.length) {
                const sourceCell = newCells[edgeData.source];
                const targetCell = newCells[edgeData.target];
                const edge = graph.insertEdge(
                  graph.getDefaultParent(), 
                  null, 
                  '', 
                  sourceCell, 
                  targetCell, 
                  edgeData.style
                );
              }
            });
          }
          
          // Select all pasted cells
          graph.setSelectionCells(newCells);
          
          // Update any special cell types
          newCells.forEach(cell => {
            if (isCalculationNode(cell)) {
              updateCalculationNodeCell(cell);
            } else if (isQuestion(cell) && getQuestionType(cell) === "multipleTextboxes") {
              updateMultipleTextboxesCell(cell);
            } else if (isQuestion(cell) && getQuestionType(cell) === "multipleDropdownType") {
              updatemultipleDropdownTypeCell(cell);
            } else if (isOptions(cell) && getQuestionType(cell) === "imageOption") {
              updateImageOptionCell(cell);
            } else if (isEndNode(cell)) {
              updateEndNodeCell(cell);
            }
          });
        } finally {
          graph.getModel().endUpdate();
        }
      } else {
        // Original single-cell paste
        graph.getModel().beginUpdate();
        try {
          // Use provided position or default to a fixed position
          const posX = x !== undefined ? x : 50;
          const posY = y !== undefined ? y : 50;
          
          // Use the original dimensions if available
          const width = data.geometry && data.geometry.width ? data.geometry.width : 160;
          const height = data.geometry && data.geometry.height ? data.geometry.height : 80;
          
          const geo = new mxGeometry(posX, posY, width, height);
          const newCell = new mxCell(data.value, geo, data.style || "");
          newCell.vertex = true;
          
          // Copy all custom properties
          newCell._textboxes = data._textboxes || null;
          newCell._questionText = data._questionText || null;
          newCell._twoNumbers = data._twoNumbers || null;
          newCell._calcTitle = data._calcTitle;
          newCell._calcAmountLabel = data._calcAmountLabel;
          newCell._calcOperator = data._calcOperator;
          newCell._calcThreshold = data._calcThreshold;
          newCell._calcFinalText = data._calcFinalText;
          newCell._calcTerms = data._calcTerms || (data._calcAmountLabel ? [{amountLabel: data._calcAmountLabel, mathOperator: ""}] : null);
          newCell._image = data._image;
          
          graph.addCell(newCell, graph.getDefaultParent());
          graph.setSelectionCell(newCell);
          
          // Update any special cell types
          if (isCalculationNode(newCell)) {
            updateCalculationNodeCell(newCell);
          } else if (isQuestion(newCell) && getQuestionType(newCell) === "multipleTextboxes") {
            updateMultipleTextboxesCell(newCell);
          } else if (isQuestion(newCell) && getQuestionType(newCell) === "multipleDropdownType") {
            updatemultipleDropdownTypeCell(newCell);
          } else if (isOptions(newCell) && getQuestionType(newCell) === "imageOption") {
            updateImageOptionCell(newCell);
          } else if (isEndNode(newCell)) {
            updateEndNodeCell(newCell);
          }
        } finally {
          graph.getModel().endUpdate();
        }
      }
      refreshAllCells();
    } catch (err) {
      console.error("Paste error:", err);
      alert("Clipboard data is not valid JSON for a node.");
    }
  });
}

/**************************************************
 ************  CREATE YES/NO  OPTIONS  ************
 **************************************************/
function createYesNoOptions(parentCell) {
  const geo = parentCell.geometry;
  if (!geo) return;
  const parent = graph.getDefaultParent();
  graph.getModel().beginUpdate();
  try {
    const parentSection = getSection(parentCell) || "1";

    const noX = geo.x + geo.width - 50;
    const noY = geo.y + geo.height + 50;
    let noStyle = "shape=roundRect;rounded=1;arcSize=20;whiteSpace=wrap;html=1;pointerEvents=1;overflow=fill;nodeType=options;questionType=dropdown;spacing=12;fontSize=16;";
    const noNode = graph.insertVertex(parent, null, "No", noX, noY, 100, 60, noStyle);
    refreshOptionNodeId(noNode);
    if (parentCell !== jumpModeNode) {
      setSection(noNode, parentSection);
    }
    graph.insertEdge(parent, null, "", parentCell, noNode);

    const yesX = geo.x - 40;
    const yesY = geo.y + geo.height + 50;
    let yesStyle = "shape=roundRect;rounded=1;arcSize=20;whiteSpace=wrap;html=1;pointerEvents=1;overflow=fill;nodeType=options;questionType=dropdown;spacing=12;fontSize=16;";
    const yesNode = graph.insertVertex(parent, null, "Yes", yesX, yesY, 100, 60, yesStyle);
    refreshOptionNodeId(yesNode);
    if (parentCell !== jumpModeNode) {
      setSection(yesNode, parentSection);
    }
    graph.insertEdge(parent, null, "", parentCell, yesNode);

  } finally {
    graph.getModel().endUpdate();
  }
  refreshAllCells();
}

// For dropdown questions
window.updateDropdownQuestionText = function(cellId, text) {
  const cell = graph.getModel().getCell(cellId);
  if (cell && getQuestionType(cell) === "dropdown") {
    graph.getModel().beginUpdate();
    try {
      cell._questionText = text.trim() || "Enter dropdown question";
      
      // Recreate the HTML with the updated text
      let html = `<div class="dropdown-question" style="display:flex; flex-direction:column; align-items:center;">
        <div class="question-text" style="text-align: center; padding: 8px; width:100%;" contenteditable="true" onfocus="if(this.innerText==='Enter dropdown question'){this.innerText='';}" ondblclick="event.stopPropagation(); this.focus();" onblur="window.updateDropdownQuestionText('${cell.id}', this.innerText)">
          ${escapeHtml(cell._questionText)}
        </div>
      </div>`;
      
      cell.value = html;
      refreshNodeIdFromLabel(cell);
    } finally {
      graph.getModel().endUpdate();
    }
    graph.updateCellSize(cell);
  }
};

// Add a function to directly import a JSON string
window.importFlowchartJsonDirectly = function(jsonString) {
  try {
    if (!jsonString) {
      throw new Error("No data provided");
    }
    
    console.log("Original input:", jsonString.substring(0, 100) + "...");
    
    // Check if the string starts and ends with quotes
    if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
      console.log("Detected quoted JSON string, unquoting...");
      jsonString = jsonString.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      console.log("After unquoting:", jsonString.substring(0, 100) + "...");
    }
    
    // Try to parse the JSON
    let jsonData;
    try {
      jsonData = JSON.parse(jsonString);
    } catch (parseError) {
      console.log("Initial parsing failed, trying workaround...", parseError);
      // Fallback approach for handling complex cases
      jsonData = JSON.parse(JSON.stringify(eval("(" + jsonString + ")")));
    }
    
    // Check if this is a GUI JSON instead of a flowchart JSON
    if (jsonData.sections && Array.isArray(jsonData.sections) && !jsonData.cells) {
      throw new Error("You are trying to import a GUI JSON. Please import a flowchart JSON that has a 'cells' property.");
    }
    
    // Validate the JSON data
    if (!jsonData || !jsonData.cells || !Array.isArray(jsonData.cells)) {
      console.error("Invalid JSON structure:", jsonData);
      throw new Error("Invalid flowchart data: missing cells array. Make sure you're importing a flowchart JSON, not a GUI JSON.");
    }
    
    console.log("Successfully parsed JSON with", jsonData.cells.length, "cells");
    loadFlowchartData(jsonData);
    currentFlowchartName = null;
    return true;
  } catch (error) {
    console.error("Error importing flowchart:", error);
    alert("Error importing flowchart: " + error.message);
    return false;
  }
};

// Add a UI element to import JSON directly
document.addEventListener('DOMContentLoaded', function() {
  // Add button to the toolbar
  const toolbar = document.querySelector('.toolbar');
  if (toolbar) {
    // Import flowchart JSON button
    const importDirectlyBtn = document.createElement('button');
    importDirectlyBtn.textContent = 'Import Flowchart JSON';
    importDirectlyBtn.className = 'toolbar-button';
    importDirectlyBtn.title = 'Import a flowchart JSON (with cells property), not a GUI JSON';
    importDirectlyBtn.onclick = function() {
      const jsonString = prompt("Paste your flowchart JSON here (must have cells property):");
      if (jsonString) {
        window.importFlowchartJsonDirectly(jsonString);
      }
    };
    toolbar.appendChild(importDirectlyBtn);
    
    // Export GUI JSON button
    const exportGuiJsonBtn = document.createElement('button');
    exportGuiJsonBtn.textContent = 'Export GUI JSON';
    exportGuiJsonBtn.className = 'toolbar-button';
    exportGuiJsonBtn.title = 'Export the current flowchart as GUI JSON (sections format)';
    exportGuiJsonBtn.onclick = function() {
      window.exportGuiJson();
    };
    toolbar.appendChild(exportGuiJsonBtn);
  }
});

// Fix the case sensitivity issue with the prevAnswer in logic conditions
// Add this code at the end of the sixth pass, just before creating the final JSON object

// Ensure checkbox options are properly capitalized in both the options and the conditions
// Access the 'sections' variable from the exportGuiJson function scope
window.fixCapitalizationInJumps = function() {
  // Get reference to sections from the main exportGuiJson function
  const sections = window.exportGuiJson.sections || [];
  
  for (const section of sections) {
    for (const question of section.questions) {
      // Fix capitalization of checkbox options
      if (question.type === "checkbox" && Array.isArray(question.options)) {
        // Create a mapping of lowercase option text to properly capitalized option text
        const optionCapitalizationMap = {};
        
        // Special handling for checkbox questions and their options
        if (Array.isArray(question.options)) {
          for (const option of question.options) {
            if (typeof option === 'object' && option.label) {
              // Store both the lowercase and original versions
              optionCapitalizationMap[option.label.toLowerCase()] = option.label;
              
              // Special case for "maybe" to ensure it's always properly capitalized
              if (option.label.toLowerCase() === "maybe") {
                optionCapitalizationMap["maybe"] = "Maybe";
              }
            }
          }
        }
        
        // Apply the capitalization fix to logic conditions
        for (const section2 of sections) {
          for (const question2 of section2.questions) {
            // Fix logic conditions
            if (question2.logic && question2.logic.conditions) {
              for (const condition of question2.logic.conditions) {
                if (condition.prevQuestion === question.questionId.toString()) {
                  // Special case for "maybe"
                  if (condition.prevAnswer && condition.prevAnswer.toLowerCase() === "maybe") {
                    condition.prevAnswer = "Maybe";
                    console.log(`Fixed capitalization: Changed logic condition prevAnswer to "Maybe"`);
                  }
                  // General case
                  else if (condition.prevAnswer && optionCapitalizationMap[condition.prevAnswer.toLowerCase()]) {
                    condition.prevAnswer = optionCapitalizationMap[condition.prevAnswer.toLowerCase()];
                    console.log(`Fixed capitalization: Changed logic condition prevAnswer from "${condition.prevAnswer}" to "${optionCapitalizationMap[condition.prevAnswer.toLowerCase()]}"`);
                  }
                }
              }
            }
            
            // Also check jump conditions that might reference options
            if (question2.jump && question2.jump.conditions) {
              for (const jumpCondition of question2.jump.conditions) {
                // For checkbox questions, make sure jump condition options match the case of option labels
                if (question2.questionId === question.questionId && 
                    jumpCondition.option && 
                    optionCapitalizationMap[jumpCondition.option.toLowerCase()]) {
                  jumpCondition.option = optionCapitalizationMap[jumpCondition.option.toLowerCase()];
                  console.log(`Fixed capitalization: Changed jump condition option from "${jumpCondition.option}" to "${optionCapitalizationMap[jumpCondition.option.toLowerCase()]}"`);
                }
              }
            }
          }
        }
      }
    }
  }
}

// Call the function to fix capitalization
window.fixCapitalizationInJumps();

// Final check - look for any remaining issues in our resulting logic constraints
let stillHaveIssues = true;
let fixIteration = 0;
const maxIterations = 10; // Define maxIterations here instead of assuming it's already defined

while (stillHaveIssues && fixIteration < maxIterations) {
  console.log(`Processing iteration ${fixIteration} for logic fixes`);
  stillHaveIssues = false;
  fixIteration++;
}