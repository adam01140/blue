// **********************************************
// ******** Import/Export & Library *************
// **********************************************

// Utility to download JSON
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

// Export the flowchart structure as JSON
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

// Import a flowchart JSON file
window.importFlowchartJson = function (evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      let jsonString = e.target.result;
      if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
        jsonString = jsonString.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
      let jsonData;
      try { jsonData = JSON.parse(jsonString); }
      catch { jsonData = JSON.parse(JSON.stringify(eval("(" + jsonString + ")"))); }
      if (!jsonData || !jsonData.cells || !Array.isArray(jsonData.cells)) {
        throw new Error("Invalid flowchart data: missing cells array");
      }
      loadFlowchartData(jsonData);
      currentFlowchartName = null;
    } catch (error) {
      alert("Error importing flowchart: " + error.message);
    }
  };
  reader.readAsText(file);
};

// Direct import from pasted JSON string
window.importFlowchartJsonDirectly = function(jsonString) {
  try {
    if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
      jsonString = jsonString.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    let jsonData;
    try { jsonData = JSON.parse(jsonString); }
    catch { jsonData = JSON.parse(JSON.stringify(eval("(" + jsonString + ")"))); }
    if (!jsonData || !jsonData.cells || !Array.isArray(jsonData.cells)) {
      throw new Error('Import a flowchart JSON (with cells) not GUI JSON');
    }
    loadFlowchartData(jsonData);
    currentFlowchartName = null;
  } catch (error) {
    alert("Error importing flowchart: " + error.message);
  }
};

// Export GUI JSON (sections + hidden fields)
function isJumpNode(cell) {
  const style = cell.style || "";
  return style.includes("strokeWidth=3") && style.includes("strokeColor=#ff0000") && style.includes("dashed=1");
}
function findAllUpstreamOptions(questionCell) {
  // BFS helper (omitted for brevity)
  // ... (existing BFS code) ...
}
function detectSectionJumps(cell, questionCellMap, questionIdMap) {
  // Section jump detection (existing code)
}
window.exportGuiJson = function() {
  // Entire BFS + export logic (existing code)
};

// Fix capitalization in jump/logic conditions
titleCaseFix:
window.fixCapitalizationInJumps = function() {
  // ... (existing fix code) ...
};
window.fixCapitalizationInJumps();

// Save flowchart to Firebase
window.saveFlowchart = function() {
  if (!currentUser) { alert("Please log in first."); return;}  
  renumberQuestionIds();
  let flowchartName = currentFlowchartName;
  if (!flowchartName) {
    flowchartName = prompt("Enter a name for this flowchart:");
    if (!flowchartName || !flowchartName.trim()) return;
    currentFlowchartName = flowchartName;
  }
  // Gather data and save
  const data = { cells: [] };
  const cells = graph.getModel().cells;
  for (let id in cells) {
    if (id === "0" || id === "1") continue;
    const cell = cells[id];
    const cellData = {
      id: cell.id, value: cell.value || "",
      geometry: cell.geometry ? { x:cell.geometry.x, y:cell.geometry.y, width:cell.geometry.width, height:cell.geometry.height } : null,
      style: cell.style || "",
      vertex: !!cell.vertex, edge: !!cell.edge,
      source: cell.edge ? (cell.source? cell.source.id:null) : null,
      target: cell.edge ? (cell.target? cell.target.id:null) : null,
      _textboxes: cell._textboxes||null, _questionText: cell._questionText||null,
      _twoNumbers: cell._twoNumbers||null, _nameId: cell._nameId||null,
      _placeholder: cell._placeholder||"", _questionId: cell._questionId||null,
      _image: cell._image||null
    };
    if (isCalculationNode(cell)) {
      cellData._calcTitle = cell._calcTitle;
      cellData._calcAmountLabel = cell._calcAmountLabel;
      cellData._calcOperator = cell._calcOperator;
      cellData._calcThreshold = cell._calcThreshold;
      cellData._calcFinalText = cell._calcFinalText;
      cellData._calcTerms = cell._calcTerms;
    }
    data.cells.push(cellData);
  }
  data.sectionPrefs = sectionPrefs;
  db.collection("users").doc(currentUser.uid).collection("flowcharts").doc(flowchartName).set({ flowchart: data })
    .then(()=>alert("Flowchart saved as: " + flowchartName))
    .catch(err=>alert("Error saving: " + err));
};

// View saved flowcharts
window.viewSavedFlowcharts = function() {
  if (!currentUser) { alert("Please log in first."); return; }
  db.collection("users").doc(currentUser.uid).collection("flowcharts").get()
    .then(snapshot=>{
      let html = snapshot.empty ? "<p>No saved flowcharts.</p>" : "";
      snapshot.forEach(doc=>{
        const name = doc.id;
        html += `<div class="flowchart-item"><strong ondblclick="renameFlowchart('${name}', this)">${name}</strong>
                  <button onclick="openSavedFlowchart('${name}')">Open</button>
                  <button onclick="deleteSavedFlowchart('${name}')">Delete</button></div>`;
      });
      document.getElementById("flowchartList").innerHTML = html;
      document.getElementById("flowchartListOverlay").style.display = "flex";
    })
    .catch(err=>alert("Error fetching: " + err));
};

window.openSavedFlowchart = function(name) {
  if (!currentUser) return;
  db.collection("users").doc(currentUser.uid).collection("flowcharts").doc(name)
    .get().then(docSnap=>{
      if (!docSnap.exists) { alert("No flowchart named " + name); return; }
      loadFlowchartData(docSnap.data().flowchart);
      currentFlowchartName = name;
      document.getElementById("flowchartListOverlay").style.display = "none";
    }).catch(err=>alert("Error loading: " + err));
};

window.renameFlowchart = function(oldName, element) {
  let newName = prompt("New name:", oldName);
  if (!newName||!newName.trim()||newName===oldName) return;
  const docRef = db.collection("users").doc(currentUser.uid).collection("flowcharts").doc(oldName);
  docRef.get().then(docSnap=>{
    if (docSnap.exists) {
      db.collection("users").doc(currentUser.uid).collection("flowcharts").doc(newName).set(docSnap.data())
        .then(()=>{ docRef.delete(); element.textContent=newName; if(currentFlowchartName===oldName) currentFlowchartName=newName; alert("Renamed to: " + newName); })
        .catch(err=>alert("Error renaming: " + err));
    }
  });
};

window.deleteSavedFlowchart = function(name) {
  if (!currentUser) return;
  if (!confirm("Delete '"+name+"'?")) return;
  db.collection("users").doc(currentUser.uid).collection("flowcharts").doc(name).delete()
    .then(()=>{ alert("Deleted: " + name); if(currentFlowchartName===name) currentFlowchartName=null; window.viewSavedFlowcharts(); })
    .catch(err=>alert("Error deleting: " + err));
}; 