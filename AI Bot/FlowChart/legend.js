/**************************************************
 ************ Section Preferences & Legend ********
 **************************************************/

/**
 * Determines the default color for a section based on its number.
 * Creates a color gradient where higher section numbers are darker.
 */
function getDefaultSectionColor(sectionNum) {
  let lightness = Math.max(30, 80 - (sectionNum - 1) * 10);
  return `hsl(0, 100%, ${lightness}%)`;
}

/**
 * Sets the section number for a cell and updates its style.
 * Also handles propagating section changes to connected cells.
 */
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

  // If this is a question node, update all connected option nodes
  if (isQuestion(cell)) {
    const outgoingEdges = graph.getOutgoingEdges(cell) || [];
    outgoingEdges.forEach(edge => {
      const targetCell = edge.target;
      if (targetCell && isOptions(targetCell)) {
        // Recursively set section without triggering infinite loop
        let targetStyle = targetCell.style || "";
        targetStyle = targetStyle.replace(/section=[^;]+/, "");
        targetStyle += `;section=${sectionNum};`;
        graph.getModel().setStyle(targetCell, targetStyle);
      }
    });
  }
  // If this is an option node, check if it's connected to a question and match its section
  else if (isOptions(cell)) {
    const incomingEdges = graph.getIncomingEdges(cell) || [];
    for (const edge of incomingEdges) {
      const sourceCell = edge.source;
      if (sourceCell && isQuestion(sourceCell)) {
        const questionSection = getSection(sourceCell);
        if (questionSection !== sectionNum) {
          // Use the question's section instead
          style = style.replace(/section=[^;]+/, "");
          style += `;section=${questionSection};`;
          graph.getModel().setStyle(cell, style);
        }
        break;
      }
    }
  }
}

/**
 * Gets the section number from a cell's style.
 */
function getSection(cell) {
  const style = cell.style || "";
  const match = style.match(/section=([^;]+)/);
  return match ? match[1] : "1";
}

/**
 * Deletes a section and moves all higher-numbered sections down.
 * Also handles deletion of dependent cells.
 */
function deleteSection(sectionNum) {
  const sections = Object.keys(sectionPrefs).sort((a, b) => parseInt(a) - parseInt(b));
  const sectionToDelete = parseInt(sectionNum);
  
  // If this is the only section, don't allow deletion
  if (sections.length === 1) {
    alert("Cannot delete the only remaining section");
    return;
  }
  
  // Start a graph update
  graph.getModel().beginUpdate();
  try {
    const parent = graph.getDefaultParent();
    const vertices = graph.getChildVertices(parent);
    
    // First identify question nodes in the section being deleted
    const questionsInSection = vertices.filter(cell => {
      const sec = parseInt(getSection(cell) || "1", 10);
      return sec === sectionToDelete && isQuestion(cell);
    });
    
    // Find all calculation nodes that depend on these questions
    const calcNodesToDependencies = new Map(); // Map to track calc nodes and their dependencies
    
    questionsInSection.forEach(questionCell => {
      // findCalcNodesDependentOnQuestion is in calc.js
      const dependentCalcNodes = findCalcNodesDependentOnQuestion(questionCell);
      
      dependentCalcNodes.forEach(calcNode => {
        if (!calcNodesToDependencies.has(calcNode.id)) {
          calcNodesToDependencies.set(calcNode.id, {
            cell: calcNode,
            dependencies: []
          });
        }
        
        // Add this question to the dependency list
        calcNodesToDependencies.get(calcNode.id).dependencies.push(questionCell);
      });
    });
    
    // Log the found dependencies
    if (calcNodesToDependencies.size > 0) {
      console.log(`Found ${calcNodesToDependencies.size} calculation nodes dependent on questions in section ${sectionToDelete}`);
      calcNodesToDependencies.forEach((data, id) => {
        const depNames = data.dependencies.map(q => getNodeId(q) || q.value || 'unnamed').join(', ');
        console.log(`  - Calc node ${id} depends on: ${depNames}`);
      });
    }
    
    // Collect all calc nodes to delete
    const calcNodesToDelete = Array.from(calcNodesToDependencies.values()).map(data => data.cell);
    
    // Delete all cells in the section being deleted (excluding calculation nodes)
    const cellsToDelete = vertices.filter(cell => {
      const sec = parseInt(getSection(cell) || "1", 10);
      // isCalculationNode is defined in calc.js
      return sec === sectionToDelete && !isCalculationNode(cell);
    });
    
    // Add the dependent calculation nodes to the deletion list
    const allCellsToDelete = [...cellsToDelete, ...calcNodesToDelete];
    
    if (allCellsToDelete.length > 0) {
      graph.removeCells(allCellsToDelete);
      console.log(`Deleted ${cellsToDelete.length} cells from section ${sectionToDelete} and ${calcNodesToDelete.length} dependent calculation nodes`);
    }
    
    // Then move all cells from higher sections down one level
    vertices.forEach(cell => {
      // Skip cells that were already deleted
      if (!cell.parent) return;
      
      const cellSection = parseInt(getSection(cell) || "1", 10);
      if (cellSection > sectionToDelete) {
        setSection(cell, cellSection - 1);
      }
    });
    
    // Update sectionPrefs
    const newSectionPrefs = {};
    Object.keys(sectionPrefs).forEach(sec => {
      const secNum = parseInt(sec);
      if (secNum < sectionToDelete) {
        newSectionPrefs[sec] = sectionPrefs[sec];
      } else if (secNum > sectionToDelete) {
        // Move section down one level but keep its name
        newSectionPrefs[(secNum - 1).toString()] = {
          ...sectionPrefs[sec],
          borderColor: getDefaultSectionColor(secNum - 1)
        };
      }
    });
    sectionPrefs = newSectionPrefs;
    
  } finally {
    graph.getModel().endUpdate();
  }
  
  updateSectionLegend();
  refreshAllCells();
}

/**
 * Adds a new section after the specified section number.
 */
function addSection(afterSectionNum) {
  const sections = Object.keys(sectionPrefs).sort((a, b) => parseInt(a) - parseInt(b));
  const insertAfter = parseInt(afterSectionNum);
  const newSectionNum = insertAfter + 1;
  
  // Start a graph update
  graph.getModel().beginUpdate();
  try {
    // First, move all cells from higher sections up one level
    const parent = graph.getDefaultParent();
    const vertices = graph.getChildVertices(parent);
    
    vertices.forEach(cell => {
      const cellSection = parseInt(getSection(cell) || "1", 10);
      if (cellSection > insertAfter) {
        setSection(cell, cellSection + 1);
      }
    });
    
    // Update sectionPrefs
    const newSectionPrefs = {};
    Object.keys(sectionPrefs).forEach(sec => {
      const secNum = parseInt(sec);
      if (secNum <= insertAfter) {
        newSectionPrefs[sec] = sectionPrefs[sec];
      } else {
        // Move section up one level but keep its name
        newSectionPrefs[(secNum + 1).toString()] = {
          ...sectionPrefs[sec],
          borderColor: getDefaultSectionColor(secNum + 1)
        };
      }
    });
    
    // Add the new section
    newSectionPrefs[newSectionNum.toString()] = {
      borderColor: getDefaultSectionColor(newSectionNum),
      name: `Section ${newSectionNum}`
    };
    
    sectionPrefs = newSectionPrefs;
    
  } finally {
    graph.getModel().endUpdate();
  }
  
  updateSectionLegend();
  refreshAllCells();
}

/**
 * Updates the section legend UI based on current sectionPrefs.
 */
function updateSectionLegend() {
  const legend = document.getElementById("sectionLegend");
  let innerHTML = "<h4>Section Names</h4>";
  const sections = Object.keys(sectionPrefs).sort((a, b) => parseInt(a) - parseInt(b));
  sections.forEach(sec => {
    innerHTML += `
      <div class="section-item" data-section="${sec}">
        <div class="section-header">
        <div class="section-color-box" style="background-color: ${sectionPrefs[sec].borderColor};" data-section="${sec}"></div>
        <span class="section-number">${sec}:</span>
        <span class="section-name" contenteditable="true" data-section="${sec}">${sectionPrefs[sec].name}</span>
        </div>
        <div class="section-buttons">
          <button class="delete-section-btn" onclick="deleteSection('${sec}')">Delete</button>
          <button class="add-section-btn" onclick="addSection('${sec}')">Add Below</button>
        </div>
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
  
  // Add click handler for section items
  const sectionItems = legend.querySelectorAll(".section-item");
  sectionItems.forEach(item => {
    // Clicking on section item (except on buttons or editable fields)
    item.addEventListener("click", (e) => {
      // Ignore clicks on buttons or editable fields
      if (e.target.tagName === "BUTTON" || e.target.contentEditable === "true" || e.target.classList.contains("section-color-box")) {
        return;
      }
      
      const sec = item.getAttribute("data-section");
      
      // Select all cells in this section
      const vertices = graph.getChildVertices(graph.getDefaultParent());
      const cellsInSection = vertices.filter(cell => getSection(cell) === sec);
      
      // Clear existing selection
      graph.clearSelection();
      
      // Select all cells in this section
      graph.addSelectionCells(cellsInSection);
      
      // Highlight this section in the legend
      highlightSectionInLegend(sec);
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
  
  // If there's a currently selected cell, highlight its section
  if (selectedCell) {
    const sec = getSection(selectedCell);
    highlightSectionInLegend(sec);
  }
}

/**
 * Highlights a section in the legend by adding a CSS class.
 */
function highlightSectionInLegend(sectionNum) {
  // Remove highlighting from all section items
  const allSectionItems = document.querySelectorAll(".section-item");
  allSectionItems.forEach(item => {
    item.classList.remove("highlighted");
  });
  
  // Add highlighting to the specified section
  const sectionItem = document.querySelector(`.section-item[data-section="${sectionNum}"]`);
  if (sectionItem) {
    sectionItem.classList.add("highlighted");
  }
}

/**
 * Convert RGB color string to HEX color string.
 */
function rgbToHex(rgb) {
  const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgb);
  return result ? "#" +
    ("0" + parseInt(result[1], 10).toString(16)).slice(-2) +
    ("0" + parseInt(result[2], 10).toString(16)).slice(-2) +
    ("0" + parseInt(result[3], 10).toString(16)).slice(-2) : rgb;
}

/**
 * Event handler for the section color picker change.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Event listener for section color picker
  document.getElementById("sectionColorPicker").addEventListener("input", (e) => {
    if (selectedSectionForColor) {
      sectionPrefs[selectedSectionForColor].borderColor = e.target.value;
      updateSectionLegend();
      refreshAllCells();
    }
  });
}); 