/*
###########################################################################################################
###########################################################################################################
###                                                                                                     ###
###     S E C T I O N 8:   E X P O R T / I M P O R T                                                    ###
###                                                                                                     ###
###########################################################################################################
###########################################################################################################
*/

// Download helper
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

// Export Flowchart JSON
window.exportFlowchartJson = function () {
  const data = [];
  const cells = graph.getModel().cells;
  for (let id in cells) {
    if (id === "0" || id === "1") continue;
    const cell = cells[id];
    data.push({
      id: cell.id,
      value: cell.value,
      geometry: cell.geometry
        ? {
            x: cell.geometry.x,
            y: cell.geometry.y,
            width: cell.geometry.width,
            height: cell.geometry.height
          }
        : null,
      style: cell.style || "",
      vertex: !!cell.vertex,
      edge: !!cell.edge,
      source: cell.edge ? cell.source?.id : null,
      target: cell.edge ? cell.target?.id : null
    });
  }
  downloadJson(JSON.stringify(data, null, 2), "flowchart_data.json");
};

// Import Flowchart JSON
window.importFlowchartJson = function (evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const jsonData = JSON.parse(e.target.result);
    loadFlowchartData(jsonData);
  };
  reader.readAsText(file);
};

function loadFlowchartData(data) {
  graph.getModel().beginUpdate();
  try {
    const parent = graph.getDefaultParent();
    graph.removeCells(graph.getChildVertices(parent));
    const createdCells = {};

    // pass1: create vertices
    data.forEach((item) => {
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
        graph.addCell(newCell, parent);
        createdCells[item.id] = newCell;
      }
    });

    // pass2: create edges
    data.forEach((item) => {
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
  refreshAllCells();
}

// Export GUI JSON
window.exportGuiJson = function () {
  const model = graph.getModel();
  const allCells = model.cells;
  const sectionsMap = {};
  let questionIdCounter = 1;
  let maxSectionId = 1;

  function getNodeType(cell) {
    if (cell.style && cell.style.includes("nodeType=question")) return "question";
    if (cell.style && cell.style.includes("nodeType=options")) return "options";
    return "other";
  }

  // gather question nodes
  for (let id in allCells) {
    if (id === "0" || id === "1") continue;
    const cell = allCells[id];
    if (cell.vertex && getNodeType(cell) === "question") {
      const sId = getSectionId(cell);
      if (sId > maxSectionId) maxSectionId = sId;
      const rawLabel = (cell.value || "").replace(/<[^>]+>/g, "").trim();
      const label = rawLabel || "Untitled";

      const qType = getQuestionType(cell);
      const questionObj = {
        questionId: questionIdCounter,
        nameId: getNodeId(cell) || "",
        placeholder: "",
        text: label,
        type: qType,
        logic: {
          enabled: false,
          conditions: []
        },
        jump: {
          enabled: false,
          option: "",
          to: ""
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
        labels: []
      };
      if (!sectionsMap[sId]) sectionsMap[sId] = [];
      sectionsMap[sId].push(questionObj);

      cell._questionId = questionIdCounter;
      questionIdCounter++;
    }
  }

  // gather "options"
  for (let id in allCells) {
    if (id === "0" || id === "1") continue;
    const cell = allCells[id];
    if (cell.vertex && getNodeType(cell) === "question") {
      const sId = getSectionId(cell);
      const rawLabel = (cell.value || "").replace(/<[^>]+>/g, "").trim();
      const label = rawLabel || "Untitled";
      const questionList = sectionsMap[sId] || [];
      const qObj = questionList.find(q => q.text === label);
      if (!qObj) continue;

      const outEdges = graph.getOutgoingEdges(cell) || [];
      outEdges.forEach(edge => {
        const target = edge.target;
        if (!target) return;
        if (getNodeType(target) === "options") {
          const optLabel = (target.value || "Option").replace(/<[^>]+>/g, "").trim();
          const optNodeId = getNodeId(target);

          // For date/bigparagraph, we keep consistent approach
          if (qObj.type === "checkbox") {
            qObj.options.push({
              label: capitalizeFirst(optLabel),
              nameId: optNodeId,
              value: ""
            });
          } else {
            qObj.options.push(capitalizeFirst(optLabel));
          }

          // Next edges from this option
          const nextEdges = graph.getOutgoingEdges(target) || [];
          nextEdges.forEach(ne => {
            const q2 = ne.target;
            if (q2 && getNodeType(q2) === "question") {
              const q2Sid = getSectionId(q2);
              const questionList2 = sectionsMap[q2Sid] || [];
              const rawLabel2 = (q2.value||"").replace(/<[^>]+>/g, "").trim();
              const label2 = rawLabel2 || "Untitled";
              const q2Obj = questionList2.find(o => o.text === label2);
              if (!q2Obj) return;

              // If it links "backwards" to an earlier question, treat it as a jump
              if (q2._questionId < cell._questionId) {
                qObj.jump.enabled = true;
                qObj.jump.option = capitalizeFirst(optLabel);
                qObj.jump.to = q2._questionId.toString();
              } else {
                // normal forward logic
                q2Obj.logic.enabled = true;
                q2Obj.logic.conditions.push({
                  prevQuestion: qObj.questionId.toString(),
                  prevAnswer: capitalizeFirst(optLabel)
                });
              }
            }
          });
        }
      });
    }
  }

  const sectionsArr = [];
  for (let s = 1; s <= maxSectionId; s++) {
    const qList = sectionsMap[s] || [];
    sectionsArr.push({
      sectionId: s,
      sectionName: "Section " + s,
      questions: qList
    });
  }

  const guiData = {
    sections: sectionsArr,
    hiddenFields: [],
    sectionCounter: maxSectionId + 1,
    questionCounter: questionIdCounter,
    hiddenFieldCounter: 1,
    defaultPDFName: ""
  };
  downloadJson(JSON.stringify(guiData, null, 2), "gui_data.json");
};

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
