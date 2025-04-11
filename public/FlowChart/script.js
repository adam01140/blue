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

function isEndNode(cell) {
  return cell && cell.style && cell.style.includes("nodeType=end");
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

function saveUserToCookies(user, password) {
  if (user) {
    setCookie("flowchart_uid", user.uid, 7);
    setCookie("flowchart_email", user.email, 7);
    setCookie("flowchart_lastLogin", new Date().toISOString(), 7);
    if (password) {
      setCookie("flowchart_pass", password, 7);
    }
  }
}

function clearUserCookies() {
  setCookie("flowchart_uid", "", -1);
  setCookie("flowchart_email", "", -1);
  setCookie("flowchart_lastLogin", "", -1);
  setCookie("flowchart_pass", "", -1);
}

loginButton.addEventListener("click", () => {
  const email = loginEmail.value.trim();
  const pass = loginPassword.value.trim();
  firebase.auth().signInWithEmailAndPassword(email, pass)
    .then(cred => {
      currentUser = cred.user;
      saveUserToCookies(currentUser, pass);
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
      saveUserToCookies(currentUser, pass);
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
      clearUserCookies();
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
  const savedEmail = getCookie("flowchart_email");
  
  if (savedUid && savedEmail) {
    // Pre-fill the login form
    loginEmail.value = savedEmail;
    
    firebase.auth().onAuthStateChanged(user => {
      if (user && user.uid === savedUid && user.email === savedEmail) {
        currentUser = user;
        hideLoginOverlay();
        loadUserColorPrefs();
      } else {
        // If not authenticated but we have saved credentials, attempt auto-login
        firebase.auth().signInWithEmailAndPassword(savedEmail, getCookie("flowchart_pass"))
          .then(cred => {
            currentUser = cred.user;
            hideLoginOverlay();
            loadUserColorPrefs();
          })
          .catch(err => {
            console.error("Auto-login failed:", err);
            clearUserCookies();
            showLoginOverlay();
          });
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
    .replace(/;+$/, "")    
    .replace(/;+;/g, ";");
}

function loadFlowchartData(data) {
  // Handle both old format (array) and new format (object with cells)
  const cells = Array.isArray(data) ? data : (data.cells || []);
  
  cells.forEach(item => {
    if (item.style) {
      item.style = cleanStyle(item.style);
    }
  });

  graph.getModel().beginUpdate();
  try {
    const parent = graph.getDefaultParent();
    graph.removeCells(graph.getChildVertices(parent));
    const createdCells = {};

    // Handle section preferences if they exist
    if (!Array.isArray(data) && data.sectionPrefs) {
      sectionPrefs = data.sectionPrefs;
      updateSectionLegend();
    }

    cells.forEach(item => {
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
        if (typeof item._textboxes !== "undefined") newCell._textboxes = item._textboxes;
        if (typeof item._questionText !== "undefined") newCell._questionText = item._questionText;
        if (typeof item._twoNumbers !== "undefined") newCell._twoNumbers = item._twoNumbers;
        if (typeof item._calculation !== "undefined") newCell._calculation = item._calculation;

        if (item.style && item.style.includes("questionType=imageOption")) {
          if (item._image) {
            newCell._image = item._image;
          }
        }

        newCell._nameId = item._nameId || null;
        newCell._placeholder = item._placeholder || "";
        newCell._questionId = item._questionId || null;

        graph.addCell(newCell, parent);
        createdCells[item.id] = newCell;
      }
    });

    cells.forEach(item => {
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

  renumberQuestionIds();

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
        } else if (qType === "calculation") {
          updateCalculationNode(cell);
        }
      } else if (isOptions(cell) && getQuestionType(cell) === "imageOption") {
        updateImageOptionCell(cell);
      }
    });
  } finally {
    graph.getModel().endUpdate();
  }

  refreshAllCells();
}

document.addEventListener("DOMContentLoaded", function() {
  checkForSavedLogin();

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

  graph = new mxGraph(container);

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
    originalDblClick(evt, cell);
  };

  graph.setHtmlLabels(true);
  graph.isHtmlLabel = function(cell) {
    return true;
  };

  graph.isCellEditable = function(cell) {
    if (cell && cell.style && (
      cell.style.includes("multipleTextboxes") ||
      cell.style.includes("multipleDropdownType")
    )) {
      return false; 
    }
    return true;
  };

  graph.setEnterStopsCellEditing(false);

  graph.setPanning(true);
  graph.panningHandler.useLeftButtonForPanning = true;

  mxEvent.disableContextMenu(container);
  graph.setCellsMovable(true);
  graph.setConnectable(true);
  graph.setCellsResizable(true);
  new mxRubberband(graph);

  const style = graph.getStylesheet().getDefaultVertexStyle();
  style[mxConstants.STYLE_VERTICAL_ALIGN] = "top";
  style[mxConstants.STYLE_VERTICAL_LABEL_POSITION] = "middle";
  style[mxConstants.STYLE_SPACING_TOP] = 10;

  mxEvent.addMouseWheelListener(function(evt, up) {
    if (!mxEvent.isConsumed(evt)) {
      if (up) graph.zoomIn();
      else graph.zoomOut();
      mxEvent.consume(evt);
    }
  }, container);

  graph.getSelectionModel().addListener(mxEvent.CHANGE, () => {
    if (lastSelectedCell) {
      autoUpdateNodeIdBasedOnLabel(lastSelectedCell);
    }
    lastSelectedCell = graph.getSelectionCell();
  });

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

  graph.addListener(mxEvent.MOVE_CELLS, function(sender, evt) {
    const movedCells = evt.getProperty('cells');
    const dx = evt.getProperty('dx');
    const dy = evt.getProperty('dy');
    
    if (!movedCells || movedCells.length === 0) return;
    const movedIds = new Set(movedCells.map(c => c.id));
    
    function getConnectedDescendants(cell) {
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
    }

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

  graph.popupMenuHandler.factoryMethod = function(menu, cell, evt) {
    propertiesMenu.style.display = "none";
    typeSubmenu.style.display = "none";
    selectedCell = cell;
    currentMouseEvent = evt;
    if (cell) showContextMenu(evt);
    else hideContextMenu();
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
  document.addEventListener("click", e => {
    if (!contextMenu.contains(e.target) &&
        !typeSubmenu.contains(e.target) &&
        !propertiesMenu.contains(e.target)) {
      hideContextMenu();
      propertiesMenu.style.display = "none";
    }
  });

  deleteNodeButton.addEventListener("click", () => {
    const cells = graph.getSelectionCells();
    if (cells.length > 0) {
      graph.removeCells(cells);
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

  yesNoNodeButton.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      createYesNoOptions(selectedCell);
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
      window.setQuestionType(selectedCell, "dropdown");
      selectedCell.value = "Dropdown question node";
      refreshAllCells();
    }
    hideContextMenu();
  });
  checkboxTypeBtn.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      window.setQuestionType(selectedCell, "checkbox");
      selectedCell.value = "Checkbox question node";
      refreshAllCells();
    }
    hideContextMenu();
  });
  textTypeBtn.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      window.setQuestionType(selectedCell, "text");
      selectedCell.value = "Text question node";
      refreshAllCells();
    }
    hideContextMenu();
  });
  moneyTypeBtn.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      window.setQuestionType(selectedCell, "number");
      selectedCell.value = "Number question node";
      refreshAllCells();
    }
    hideContextMenu();
  });
  dateTypeBtn.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      window.setQuestionType(selectedCell, "date");
      selectedCell.value = "Date question node";
      refreshAllCells();
    }
    hideContextMenu();
  });
  bigParagraphTypeBtn.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      window.setQuestionType(selectedCell, "bigParagraph");
      selectedCell.value = "Big Paragraph question node";
      refreshAllCells();
    }
    hideContextMenu();
  });

  multipleTextboxesTypeBtn.addEventListener("click", () => {
    if (selectedCell && isQuestion(selectedCell)) {
      window.setQuestionType(selectedCell, "multipleTextboxes");
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
      window.setQuestionType(selectedCell, "multipleDropdownType");
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

  newSectionButton.addEventListener("click", () => {
    if (selectedCell) {
      const currentSection = parseInt(getSection(selectedCell) || "1", 10);
      setSection(selectedCell, currentSection + 1);
      refreshAllCells();
    }
    hideContextMenu();
  });

  function showPropertiesMenu(cell, evt) {
    if (!cell) return;
    propertiesMenu.style.display = "block";
    propertiesMenu.style.left = evt.clientX + 10 + "px";
    propertiesMenu.style.top = evt.clientY + 10 + "px";

    if (isQuestion(cell) && 
       (getQuestionType(cell) === "multipleTextboxes" || 
        getQuestionType(cell) === "multipleDropdownType")) {
      propNodeText.textContent = cell._questionText || "";
    } else {
      propNodeText.textContent = cell.value || "";
    }

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
    } else {
      propNodeType.textContent = "other";
    }
  }

  propertiesButton.addEventListener("click", () => {
    if (selectedCell) {
      showPropertiesMenu(selectedCell, currentMouseEvent);
    }
  });

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

  const keyHandler = new mxKeyHandler(graph);

  graph.getModel().addListener(mxEvent.EVENT_CHANGE, function(sender, evt) {
    const changes = evt.getProperty("changes");
    if (!changes) return;
    changes.forEach(change => {
      if (change.constructor.name === "mxValueChange") {
        const { cell, value } = change;
        if (value && typeof value === "string") {
          if (value.trim().endsWith("?")) {
            if (!isQuestion(cell)) {
              let st = cell.style || "";
              st += ";nodeType=question;";
              graph.getModel().setStyle(cell, st);
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
});

/*******************************************************
 ********** RENUMBERING QUESTIONS BY POSITION **********
 *******************************************************/
function renumberQuestionIds() {
  const parent = graph.getDefaultParent();
  const vertices = graph.getChildVertices(parent);
  const questions = vertices.filter(cell => isQuestion(cell));
  
  questions.sort((a, b) => {
    const aY = a.geometry.y;
    const bY = b.geometry.y;
    if (aY !== bY) return aY - bY;
    return a.geometry.x - b.geometry.x;
  });

  let currentId = 1;
  questions.forEach((cell) => {
    if (!cell._questionId) {
      cell._questionId = currentId;
      currentId++;
    }
  });

  questions.forEach((cell, index) => {
    cell._questionId = index + 1;
  });

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

function updateMultipleTextboxesCell(cell) {
  const qText = cell._questionText || "Enter question text";
  let html = `<div class="multiple-textboxes-node">
    <div class="question-text" style="text-align: center; padding: 8px;" contenteditable="true"onclick="window.handleMultipleTextboxClick(event, '${cell.id}')"onfocus="window.handleMultipleTextboxFocus(event, '${cell.id}')"onblur="window.updateQuestionTextHandler('${cell.id}', this.innerText)">${escapeHtml(qText)}</div>
    <div class="multiple-textboxes-container" style="padding: 8px;">`;

  if (!cell._textboxes) {
    cell._textboxes = [{ nameId: "", placeholder: "Enter value" }];
  }

  cell._textboxes.forEach((tb, index) => {
    const val = tb.nameId || "";
    const ph = tb.placeholder || "Enter value";
    html += 
      `<div class="textbox-entry">
        <input type="text" value="${escapeAttr(val)}" data-index="${index}" placeholder="${escapeAttr(ph)}" onblur="window.updateMultipleTextboxHandler('${cell.id}', ${index}, this.value)"/>
        <button onclick="window.deleteMultipleTextboxHandler('${cell.id}', ${index})">Delete</button>
      </div>`;
  });

  html += `<br><br><button onclick="window.addMultipleTextboxHandler('${cell.id}')">Add Option</button>
    </div>
  </div>`;

  graph.getModel().beginUpdate();
  try {
    graph.getModel().setValue(cell, html);
    refreshNodeIdFromLabel(cell);
    
    let style = cell.style || "";
    if (!style.includes("pointerEvents=")) {
      style += "pointerEvents=1;overflow=fill;";
    }
    if (!style.includes("html=1")) {
      style += "html=1;";
    }
    graph.getModel().setStyle(cell, style);
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

  let html = `<div class="multiple-textboxes-node">
    <div class="question-text" contenteditable="true"ondblclick="event.stopPropagation(); this.focus();"onfocus="if(this.innerText==='Enter question text'){this.innerText='';}"onblur="window.updatemultipleDropdownTypeTextHandler('${cell.id}', this.innerText)">${escapeHtml(qText)}</div>
    <div class="two-number-container" style="display: flex; gap: 10px; margin-top: 8px;">
      <input type="number" value="${escapeAttr(twoNums.first)}" onblur="window.updatemultipleDropdownTypeNumber('${cell.id}', 'first', this.value)"/>
      <input type="number" value="${escapeAttr(twoNums.second)}" onblur="window.updatemultipleDropdownTypeNumber('${cell.id}', 'second', this.value)"/>
    </div>
    <div class="multiple-textboxes-container" style="margin-top: 8px;">`;

  cell._textboxes.forEach((tb, index) => {
    const val = tb.nameId || "";
    const ph = tb.placeholder || "Enter value";
    const checked = tb.isAmountOption ? "checked" : "";
    html += `
      <div class="textbox-entry" style="margin-bottom:4px;">
        <input type="text" value="${escapeAttr(val)}" data-index="${index}" placeholder="${escapeAttr(ph)}" onblur="window.updatemultipleDropdownTypeHandler('${cell.id}', ${index}, this.value)"/>
        <button onclick="window.deletemultipleDropdownTypeHandler('${cell.id}', ${index})">Delete</button>
        <label>
          <input type="checkbox" ${checked} onclick="window.toggleMultipleDropdownAmount('${cell.id}', ${index}, this.checked)" />
          Amount?
        </label>
      </div>`;
  });

  html += `<button onclick="window.addmultipleDropdownTypeHandler('${cell.id}')">Add Option</button>
    </div>
  </div>`;

  graph.getModel().beginUpdate();
  try {
    graph.getModel().setValue(cell, html);
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
 ************ HELPER / STYLING / JSON Exports **********
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
  return m ? m[1] : "dropdown";
}

/**
 * Make setQuestionType a global function so pickTypeForCell can see it
 */
window.setQuestionType = function(cell, newType) {
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
  } else {
    style += `;questionType=${newType};`;
    cell.value = newType.charAt(0).toUpperCase() + newType.slice(1) + " question node";
  }

  graph.getModel().setStyle(cell, style);
  refreshNodeIdFromLabel(cell);
};

/**
 * Also define pickTypeForCell globally
 */
window.pickTypeForCell = function(cellId, val) {
  const c = graph.getModel().getCell(cellId);
  if (!c) return;

  graph.getModel().beginUpdate();
  try {
    window.setQuestionType(c, val);

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
      c.value = val.charAt(0).toUpperCase() + val.slice(1) + " question node";
      graph.getModel().setStyle(c, c.style + ";spacingTop=10;");
    }
  } finally {
    graph.getModel().endUpdate();
  }

  graph.setSelectionCell(c);
  graph.startEditingAtCell(c);
  refreshAllCells();
};

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
        if (!cell.style.includes("pointerEvents=")) {
          let st = cell.style;
          st += "pointerEvents=1;overflow=fill;";
          graph.getModel().setStyle(cell, st);
        }
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

    if (isQuestion(cell) && 
       (cell.value === "question node" || cell.value === "Question Node")) {
      cell.value = `
        <select oninput="window.pickTypeForCell('${cell.id}', this.value)">
          <option value="">-- Choose Type --</option>
          <option value="text">Text</option>
          <option value="checkbox">Checkbox</option>
          <option value="dropdown">Dropdown</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
          <option value="bigParagraph">Big Paragraph</option>
          <option value="multipleTextboxes">Multiple Textboxes</option>
          <option value="multipleDropdownType">Multiple Dropdown Type</option>
        </select>`;
    }
  });

  renumberQuestionIds();
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
    data.cells.push({
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
      _textboxes: cell._textboxes ? JSON.parse(JSON.stringify(cell._textboxes)) : null,
      _questionText: cell._questionText || null,
      _twoNumbers: cell._twoNumbers ? { ...cell._twoNumbers } : null,
      _nameId: cell._nameId || null,
      _placeholder: cell._placeholder || "",
      _questionId: cell._questionId || null,
      _image: cell._image || null
    });
  }
  data.sectionPrefs = sectionPrefs;

  downloadJson(JSON.stringify(data, null, 2), "flowchart_data.json");
};

window.importFlowchartJson = function (evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const jsonData = JSON.parse(e.target.result);
    loadFlowchartData(jsonData);
    currentFlowchartName = null;
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
  console.log("=== Starting GUI JSON Export ===");
  const allCells = graph.getModel().cells;
  const sectionMap = {};
  let maxQuestionId = 0;

  const questionCells = [];
  for (let id in allCells) {
    if (id === "0" || id === "1") continue;
    const cell = allCells[id];
    if (cell.vertex && isQuestion(cell)) {
      questionCells.push(cell);
      if (cell._questionId > maxQuestionId) {
        maxQuestionId = cell._questionId;
      }
    }
  }

  questionCells.forEach(cell => {
    const sec = parseInt(getSection(cell) || "1", 10);
    if (!sectionMap[sec]) {
      sectionMap[sec] = {
        sectionId: sec,
        sectionName: (sectionPrefs[sec] && sectionPrefs[sec].name) || ("Section " + sec),
        questions: []
      };
    }

    let rawLabel = (cell.value || "").replace(/<[^>]+>/g, "").trim() || "Untitled";
    const qType = getQuestionType(cell);
    if ((qType === "multipleTextboxes" || qType === "multipleDropdownType") && cell._questionText) {
      rawLabel = cell._questionText;
    }

    const questionObj = {
      questionId: cell._questionId,
      text: rawLabel,
      type: qType,
      logic: { enabled: false, conditions: [] },
      jump: { enabled: false, conditions: [] },
      conditionalPDF: { enabled: false, pdfName: "", answer: "Yes" },
      conditionalAlert: { enabled: false, prevQuestion: "", prevAnswer: "", text: "" },
      options: [],
      labels: [],
      nameId: cell._nameId || ("answer" + cell._questionId),
      placeholder: cell._placeholder || ""
    };

    if (qType === "multipleTextboxes") {
      questionObj.textboxes = (cell._textboxes || []).map(tb => ({
        label: "",
        nameId: tb.nameId || "",
        placeholder: tb.placeholder || ""
      }));
    } else if (qType === "multipleDropdownType") {
      questionObj.type = "numberedDropdown";
      questionObj.min = (cell._twoNumbers && cell._twoNumbers.first) || "";
      questionObj.max = (cell._twoNumbers && cell._twoNumbers.second) || "";

      const normalLabels = [];
      const amountLabels = [];
      (cell._textboxes || []).forEach(tb => {
        if (tb.isAmountOption) {
          amountLabels.push(tb.nameId || "");
        } else {
          normalLabels.push(tb.nameId || "");
        }
      });
      questionObj.labels = normalLabels;
      questionObj.amounts = amountLabels;
    }

    sectionMap[sec].questions.push(questionObj);
  });

  function findQuestionObj(qId) {
    for (const sKey in sectionMap) {
      const found = sectionMap[sKey].questions.find(q => q.questionId === qId);
      if (found) return found;
    }
    return null;
  }

  const cellMap = new Map();
  questionCells.forEach(cell => {
    cellMap.set(cell._questionId, cell);
  });

  questionCells.forEach(cell => {
    const qObjRef = findQuestionObj(cell._questionId);
    if (!qObjRef) return;

    const outEdges = graph.getOutgoingEdges(cell) || [];
    outEdges.forEach(edge => {
      const target = edge.target;
      if (!target || !isOptions(target)) return;

      const optType = getQuestionType(target);
      const optLabel = (target.value || "Option").replace(/<[^>]+>/g, "").trim();

      if (optType === "imageOption") {
        qObjRef.image = {
          url: (target._image && target._image.url) ? target._image.url : "",
          width: (target._image && target._image.width) ? parseInt(target._image.width, 10) : 100,
          height: (target._image && target._image.height) ? parseInt(target._image.height, 10) : 100
        };
      }
      else if (optType === "amountOption") {
        const optionObj = {
          label: optLabel,
          nameId: "option_" + optLabel.replace(/\s+/g, "_"),
          value: "",
          hasAmount: true,
          amountName: target._amountName || "",
          amountPlaceholder: target._amountPlaceholder || "Amount"
        };
        qObjRef.options.push(optionObj);
      } else {
        if (qObjRef.type === "checkbox") {
          const optionObj = {
            label: optLabel,
            nameId: "option_" + optLabel.replace(/\s+/g, "_"),
            value: ""
          };
          qObjRef.options.push(optionObj);
        } else {
          qObjRef.options.push(optLabel);
        }
      }

      const nextEdges = graph.getOutgoingEdges(target) || [];
      nextEdges.forEach(ne => {
        const q2 = ne.target;
        if (!q2) return;
        if (isEndNode(q2)) {
          qObjRef.jump.conditions.push({
            option: optLabel,
            to: "end"
          });
          qObjRef.jump.enabled = true;
        } else if (isQuestion(q2)) {
          const q2Ref = findQuestionObj(q2._questionId);
          if (!q2Ref) return;

          if (isJumpNode(cell)) {
            qObjRef.jump.conditions.push({
              option: optLabel,
              to: q2._questionId.toString()
            });
            qObjRef.jump.enabled = true;
          } else {
            q2Ref.logic.enabled = true;
            q2Ref.logic.conditions.push({
              prevQuestion: cell._questionId.toString(),
              prevAnswer: optLabel
            });
          }
        }
      });
    });
  });

  questionCells.forEach(cell => {
    const childQId = cell._questionId;
    const childRef = findQuestionObj(childQId);
    if (!childRef) return;

    const combos = findAllUpstreamOptions(cell);
    combos.forEach(({ questionId, answerLabel }) => {
      const parentCell = cellMap.get(questionId);
      if (parentCell && isJumpNode(parentCell)) {
        const parentQObj = findQuestionObj(questionId);
        if (parentQObj) {
          parentQObj.jump.conditions.push({
            option: answerLabel,
            to: childQId.toString()
          });
          parentQObj.jump.enabled = true;
        }
      } else {
        childRef.logic.enabled = true;
        childRef.logic.conditions.push({
          prevQuestion: questionId.toString(),
          prevAnswer: answerLabel
        });
      }
    });
  });

  const sortedSections = Object.keys(sectionMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map(sec => ({
      ...sectionMap[sec],
      questions: sectionMap[sec].questions.sort((a, b) => a.questionId - b.questionId)
    }));

  const finalJson = {
    sections: sortedSections,
    hiddenFields: [],
    sectionCounter: sortedSections.length > 0 ? Math.max(...sortedSections.map(s => s.sectionId)) + 1 : 1,
    questionCounter: maxQuestionId + 1,
    hiddenFieldCounter: 1,
    defaultPDFName: ""
  };

  downloadJson(JSON.stringify(finalJson, null, 2), "gui_data.json");
};

/***********************************************
 *           SAVE & VIEW FLOWCHARTS           *
 ***********************************************/
function saveFlowchart() {
  if (!currentUser) {
    alert("Please log in first.");
    return;
  }
  
  renumberQuestionIds();

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
    data.cells.push({
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
      _textboxes: cell._textboxes ? JSON.parse(JSON.stringify(cell._textboxes)) : null,
      _questionText: cell._questionText || null,
      _twoNumbers: cell._twoNumbers ? { ...cell._twoNumbers } : null,
      _nameId: cell._nameId || null,
      _placeholder: cell._placeholder || "",
      _questionId: cell._questionId || null,
      _image: cell._image || null
    });
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

/**
 * Render HTML for a Calculation Node, storing the calculation data in cell._calculation.
 */
function updateCalculationNode(cell) {
  if (!cell._calculation) {
    cell._calculation = {
      type: "checkbox", // or "text"
      terms: [],
      operator: "AND",
      threshold: 1
    };
  }
  const calcData = cell._calculation;
  
  let html = `
    <div class="calculation-node">
      <p style="margin: 0; font-weight: bold;">Calculation Node</p>
      <div class="calculation-type-selector">
        <label>Type:</label>
        <select onchange="window.updateCalculationType('${cell.id}', this.value)">
          <option value="checkbox" ${calcData.type === "checkbox" ? "selected" : ""}>Checkbox</option>
          <option value="text" ${calcData.type === "text" ? "selected" : ""}>Text</option>
        </select>
      </div>
      <div class="calculation-terms">
        ${generateCalculationTerms(cell)}
      </div>
      ${calcData.type === "checkbox" ? `
        <div class="calculation-operator">
          <label>Operator:</label>
          <select onchange="window.updateCalculationOperator('${cell.id}', this.value)">
            <option value="AND" ${calcData.operator === "AND" ? "selected" : ""}>AND</option>
            <option value="OR" ${calcData.operator === "OR" ? "selected" : ""}>OR</option>
          </select>
        </div>
        <div class="calculation-threshold">
          <label>Threshold:</label>
          <input type="number" value="${calcData.threshold}" onchange="window.updateCalculationThreshold('${cell.id}', this.value)" />
        </div>
      ` : ''}
      <button onclick="window.addCalculationTerm('${cell.id}')">Add Term</button>
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

function generateCalculationTerms(cell) {
  const calcData = cell._calculation;
  let termsHtml = '';
  
  if (!calcData.terms) {
    calcData.terms = [];
  }
  
  calcData.terms.forEach((term, index) => {
    termsHtml += `
      <div class="calculation-term">
        <select onchange="window.updateCalculationQuestion('${cell.id}', ${index}, this.value)">
          <option value="">Select Question</option>
          ${generateMoneyQuestionOptions()}
        </select>
        ${calcData.type === "checkbox" ? `
          <select onchange="window.updateCalculationComparison('${cell.id}', ${index}, this.value)">
            <option value="checked" ${term.comparison === "checked" ? "selected" : ""}>Checked</option>
            <option value="unchecked" ${term.comparison === "unchecked" ? "selected" : ""}>Unchecked</option>
          </select>
        ` : `
          <input type="text" placeholder="Fill value" value="${term.fillValue || ''}" 
                 onchange="window.updateCalculationFillValue('${cell.id}', ${index}, this.value)" />
        `}
        <button onclick="window.removeCalculationTerm('${cell.id}', ${index})">Remove</button>
      </div>
    `;
  });
  
  return termsHtml;
}

function generateMoneyQuestionOptions() {
    let options = '<option value="">Select a question</option>';
    
    // Find all nodes in the graph
    const nodes = graph.getNodes();
    
    // Iterate through nodes to find money questions
    nodes.forEach(node => {
        if (node.data && node.data.type === 'question' && node.data.questionType === 'money') {
            const questionId = node.id;
            const questionText = node.data.text || 'Untitled Question';
            options += `<option value="${questionId}">${questionText}</option>`;
        }
    });
    
    return options;
}

window.updateCalculationType = function(cellId, type) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || getQuestionType(cell) !== "calculation") return;
  graph.getModel().beginUpdate();
  try {
    cell._calculation = cell._calculation || {};
    cell._calculation.type = type;
    cell._calculation.terms = []; // Reset terms when changing type
  } finally {
    graph.getModel().endUpdate();
  }
  updateCalculationNode(cell);
};

window.updateCalculationOperator = function(cellId, operator) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || getQuestionType(cell) !== "calculation") return;
  graph.getModel().beginUpdate();
  try {
    cell._calculation = cell._calculation || {};
    cell._calculation.operator = operator;
  } finally {
    graph.getModel().endUpdate();
  }
  updateCalculationNode(cell);
};

window.updateCalculationThreshold = function(cellId, threshold) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || getQuestionType(cell) !== "calculation") return;
  graph.getModel().beginUpdate();
  try {
    cell._calculation = cell._calculation || {};
    cell._calculation.threshold = parseInt(threshold) || 1;
  } finally {
    graph.getModel().endUpdate();
  }
  updateCalculationNode(cell);
};

window.updateCalculationQuestion = function(cellId, index, questionId) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || getQuestionType(cell) !== "calculation") return;
  graph.getModel().beginUpdate();
  try {
    cell._calculation = cell._calculation || {};
    cell._calculation.terms = cell._calculation.terms || [];
    if (!cell._calculation.terms[index]) {
      cell._calculation.terms[index] = {};
    }
    cell._calculation.terms[index].questionId = questionId;
  } finally {
    graph.getModel().endUpdate();
  }
  updateCalculationNode(cell);
};

window.updateCalculationComparison = function(cellId, index, comparison) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || getQuestionType(cell) !== "calculation") return;
  graph.getModel().beginUpdate();
  try {
    cell._calculation = cell._calculation || {};
    cell._calculation.terms = cell._calculation.terms || [];
    if (!cell._calculation.terms[index]) {
      cell._calculation.terms[index] = {};
    }
    cell._calculation.terms[index].comparison = comparison;
  } finally {
    graph.getModel().endUpdate();
  }
  updateCalculationNode(cell);
};

window.updateCalculationFillValue = function(cellId, index, fillValue) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || getQuestionType(cell) !== "calculation") return;
  graph.getModel().beginUpdate();
  try {
    cell._calculation = cell._calculation || {};
    cell._calculation.terms = cell._calculation.terms || [];
    if (!cell._calculation.terms[index]) {
      cell._calculation.terms[index] = {};
    }
    cell._calculation.terms[index].fillValue = fillValue;
  } finally {
    graph.getModel().endUpdate();
  }
  updateCalculationNode(cell);
};

window.removeCalculationTerm = function(cellId, index) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || getQuestionType(cell) !== "calculation") return;
  graph.getModel().beginUpdate();
  try {
    cell._calculation = cell._calculation || {};
    cell._calculation.terms = cell._calculation.terms || [];
    cell._calculation.terms.splice(index, 1);
  } finally {
    graph.getModel().endUpdate();
  }
  updateCalculationNode(cell);
};

window.addCalculationTerm = function(cellId) {
  const cell = graph.getModel().getCell(cellId);
  if (!cell || getQuestionType(cell) !== "calculation") return;
  graph.getModel().beginUpdate();
  try {
    cell._calculation = cell._calculation || {};
    cell._calculation.terms = cell._calculation.terms || [];
    cell._calculation.terms.push({
      questionId: "",
      comparison: "checked",
      fillValue: ""
    });
  } finally {
    graph.getModel().endUpdate();
  }
  updateCalculationNode(cell);
};

function pasteNodeFromJson() {
  navigator.clipboard.readText().then(text => {
    try {
      const data = JSON.parse(text);
      graph.getModel().beginUpdate();
      try {
        const geo = new mxGeometry(50, 50, 160, 80);
        const newCell = new mxCell(data.value, geo, data.style || "");
        newCell.vertex = true;
        newCell._textboxes = data._textboxes || null;
        newCell._questionText = data._questionText || null;
        graph.addCell(newCell, graph.getDefaultParent());
        graph.setSelectionCell(newCell);
      } finally {
        graph.getModel().endUpdate();
      }
    } catch (err) {
      alert("Clipboard data is not valid JSON for a node.");
    }
  }).catch(err => {
    console.error('Failed to read clipboard:', err);
    alert("Failed to read clipboard data.");
  });
}

/**************************************************
 ************  CREATE YES/NO  OPTIONS  ************
 **************************************************/
// ... existing code ...

// Add styles for calculation nodes
const calculationStyles = document.createElement('style');
calculationStyles.textContent = `
    .calculation-node {
        margin: 10px;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: #fff;
    }
    
    .calculation-node label {
        font-weight: bold;
        margin-bottom: 5px;
        display: block;
    }
    
    .calculation-node select {
        margin: 5px;
        padding: 3px;
        width: 200px;
    }
    
    .calculation-node input[type="number"] {
        width: 80px;
        margin: 5px;
        padding: 3px;
    }
    
    .calculation-node input[type="text"] {
        width: 230px;
        margin: 5px;
        padding: 3px;
    }
    
    .calculation-node button {
        margin: 5px;
        padding: 5px 10px;
        background: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 3px;
        cursor: pointer;
    }
    
    .calculation-node button:hover {
        background: #e0e0e0;
    }
    
    .calculation-term {
        margin: 5px 0;
        padding: 5px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: #f9f9f9;
    }
`;
document.head.appendChild(calculationStyles);
