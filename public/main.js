/* main.js */

// We'll wire up the page: 
// - Login / SignUp / Logout
// - Initialize the graph
// - Hooks for "Export" / "Import" 
// - The shapes in the toolbar

document.addEventListener("DOMContentLoaded", function() {
  // Login Buttons
  const loginBtn = document.getElementById("loginButton");
  const signupBtn = document.getElementById("signupButton");
  const logoutBtn = document.getElementById("logoutButton");

  loginBtn.addEventListener("click", async () => {
    const email = (document.getElementById("loginEmail").value || "").trim();
    const pass = (document.getElementById("loginPassword").value || "").trim();
    if (!email || !pass) return alert("Please fill email/password");
    try {
      await auth.signInWithEmailAndPassword(email, pass);
    } catch(e) {
      alert("Login failed: " + e.message);
    }
  });

  signupBtn.addEventListener("click", async () => {
    const email = (document.getElementById("loginEmail").value || "").trim();
    const pass = (document.getElementById("loginPassword").value || "").trim();
    if (!email || !pass) return alert("Please fill email/password");
    try {
      await auth.createUserWithEmailAndPassword(email, pass);
      window.location.reload();
    } catch(e) {
      alert("Sign up failed: " + e.message);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    setCookie("flowchartUserId","",-1);
    document.getElementById("loginOverlay").style.display = "flex";
  });

  // Initialize the graph
  const graph = initGraph();

  // Dragging shapes: 
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
          // Make it 200 wide by default
          newVertex = graph.insertVertex(
            parent,
            null,
            shapeEl.dataset.type + " node",
            x,
            y,
            200, // <--- bigger initial width
            60,
            baseStyle
          );
        } finally {
          graph.getModel().endUpdate();
        }
        // If it's an "initial" question => show select
        if (isQuestion(newVertex) && newVertex.style.includes("questionType=initial")) {
          const cId = newVertex.id;
          newVertex.value = createQuestionTypeSelectHTML(cId);
        } else if (isOptions(newVertex)) {
          refreshOptionNodeId(newVertex);
        }
        window.refreshAllCells();
        return newVertex;
      }
    );
  });

  // Hook Import Flowchart
  document.getElementById("importFlowchartFile").addEventListener("change", function(e) {
    importFlowchartJson(e);
  });

  // Initialize color legend
  initColorLegend();
});

// We also define the “Export / Import” hooking in a global so it can be called from HTML
window.exportFlowchartJson = function() {
  const data = [];
  const cells = window.graph.getModel().cells;
  for (let id in cells) {
    if (id==="0"||id==="1") continue;
    const cell = cells[id];
    data.push({
      id: cell.id,
      value: cell.value,
      geometry: cell.geometry ? {
        x: cell.geometry.x,
        y: cell.geometry.y,
        width: cell.geometry.width,
        height: cell.geometry.height
      } : null,
      style: cell.style||"",
      vertex: !!cell.vertex,
      edge: !!cell.edge,
      source: (cell.edge && cell.source) ? cell.source.id : null,
      target: (cell.edge && cell.target) ? cell.target.id : null
    });
  }
  downloadJson(JSON.stringify(data,null,2), "flowchart_data.json");
};

window.importFlowchartJson = function(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const jsonData = JSON.parse(e.target.result);
    loadFlowchartData(jsonData);
  };
  reader.readAsText(file);
};

window.loadFlowchartData = function(data) {
  const graph = window.graph;
  graph.getModel().beginUpdate();
  try {
    const parent=graph.getDefaultParent();
    graph.removeCells(graph.getChildVertices(parent));
    let created={};
    data.forEach(item=>{
      if(item.vertex){
        const geo = new mxGeometry(
          item.geometry.x,
          item.geometry.y,
          item.geometry.width,
          item.geometry.height
        );
        const newCell = new mxCell(item.value, geo, item.style);
        newCell.vertex=true; newCell.id=item.id;
        graph.addCell(newCell, parent);
        created[item.id] = newCell;
      }
    });
    data.forEach(item=>{
      if(item.edge){
        const newEdge = new mxCell(item.value, new mxGeometry(), item.style);
        newEdge.edge=true; newEdge.id=item.id;
        const src=created[item.source];
        const trg=created[item.target];
        graph.addCell(newEdge, parent, undefined, src, trg);
      }
    });
  } finally {
    graph.getModel().endUpdate();
  }
  window.refreshAllCells();
};

window.downloadJson = function(str, filename) {
  const blob = new Blob([str], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; 
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Export GUI JSON
window.exportGuiJson = function() {
  // Similar approach to your existing code...
  // gather question data, produce JSON
  // ...
  // This is a placeholder. 
  alert("Export GUI JSON clicked (implement as needed).");
};

// Some small helpers for “initial question type” select
window.createQuestionTypeSelectHTML = function(cellId) {
  return `
    <select class="initialQuestionTypeSelect" data-cell-id="${cellId}">
      <option value="">Select question type</option>
      <option value="text">Text</option>
      <option value="checkbox">Checkbox</option>
      <option value="dropdown">Dropdown</option>
      <option value="money">Money</option>
    </select>
  `;
};

// If the user picks a type from the dropdown, finalize
document.addEventListener("change", function(e) {
  if (e.target.classList.contains("initialQuestionTypeSelect")) {
    const chosen = e.target.value;
    const cId = e.target.getAttribute("data-cell-id");
    if (chosen && cId) {
      let cell = window.graph.getModel().getCell(cId);
      if (cell) {
        window.graph.getModel().beginUpdate();
        try {
          let st=cell.style||"";
          st=st.replace(/questionType=initial/,"questionType="+chosen);
          cell.value="";
          window.graph.getModel().setStyle(cell, st);
        } finally {
          window.graph.getModel().endUpdate();
        }
        window.refreshNodeIdFromLabel(cell); // from graph.js or your code
        window.refreshAllCells();
      }
    }
  }
});
