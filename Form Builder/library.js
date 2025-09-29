// **********************************************
// ******** Import/Export & Library *************
// **********************************************

// Helper function to check if a cell is a PDF node
function isPdfNode(cell) {
  return cell && cell.style && cell.style.includes("nodeType=pdfNode");
}

// Helper function to check if a cell is an options node
function isOptions(cell) {
  return cell && cell.style && cell.style.includes("nodeType=options");
}

// Helper function to check if a cell is an alert node
function isAlertNode(cell) {
  return cell && cell.style && cell.style.includes("questionType=alertNode");
}

// Download utility moved to export.js module

// Export functions moved to export.js module



// Import a flowchart JSON file
function importFlowchartJson(event) {
  const file = event.target.files[0];
  if (file) {
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
  }
}
window.importFlowchartJson = importFlowchartJson;

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
window.exportGuiJson = function(download = true) {
  // Renumber questions by Y position before export
  renumberQuestionIds();
  
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

  // Create a map of all questions by nodeId
  const questionCellMap = new Map();
  const questionIdMap = new Map();
  const optionCellMap = new Map();
  const vertices = graph.getChildVertices(graph.getDefaultParent());
  const questions = vertices.filter(cell => isQuestion(cell));

  // Create sections array structure and get top level data
  const sectionMap = {};
  // Get current section preferences using the proper function
  const currentSectionPrefs = window.getSectionPrefs ? window.getSectionPrefs() : (window.sectionPrefs || {});
  
  console.log('🔍 [GUI EXPORT DEBUG] Current section preferences:', JSON.stringify(currentSectionPrefs, null, 2));
  
  for (const num in currentSectionPrefs) {
    if (parseInt(num) >= sectionCounter) {
      sectionCounter = parseInt(num) + 1;
    }
    // Handle default section names
    let sectionName = currentSectionPrefs[num].name || `Section ${num}`;
    if (sectionName === "Enter section name" || sectionName === "Enter Name") {
      sectionName = `Section ${num}`;
    }
    
    sectionMap[num] = {
      sectionId: parseInt(num),
      sectionName: sectionName,
      questions: []
    };
    console.log(`🔍 [GUI EXPORT DEBUG] Section ${num} name: "${currentSectionPrefs[num].name || `Section ${num}`}"`);
  }
  
  // Find the maximum section number used by questions
  let maxSectionNumber = 1;
  for (const cell of questions) {
    const section = getSection(cell) || "1";
    const sectionNum = parseInt(section);
    if (sectionNum > maxSectionNumber) {
      maxSectionNumber = sectionNum;
    }
  }
  
  // Update sectionCounter to be the next available section number
  sectionCounter = Math.max(sectionCounter, maxSectionNumber + 1);

  // Ensure section 1 always exists
  if (!sectionMap["1"]) {
    // Get the section name from sectionPrefs, with fallback to default
    let sectionName = "Section 1";
    if (currentSectionPrefs["1"] && currentSectionPrefs["1"].name) {
      sectionName = currentSectionPrefs["1"].name;
      // Handle default section names
      if (sectionName === "Enter section name" || sectionName === "Enter Name") {
        sectionName = "Section 1";
      }
    }
    
    sectionMap["1"] = {
      sectionId: 1,
      sectionName: sectionName,
      questions: []
    };
  }

  // Add questions to sections by their section number
  for (const cell of questions) {
    let section = getSection(cell) || "1";
    
    // Special case: If this is the first question (lowest Y position), put it in Section 1
    const isFirstQuestion = questions.every(otherCell => 
      otherCell === cell || cell.geometry.y <= otherCell.geometry.y
    );
    
    if (isFirstQuestion && section !== "1") {
      section = "1";
    }
    
    if (!sectionMap[section]) {
      // Get the section name from sectionPrefs, with fallback to default
      let sectionName = `Section ${section}`;
      if (currentSectionPrefs[section] && currentSectionPrefs[section].name) {
        sectionName = currentSectionPrefs[section].name;
        // Handle default section names
        if (sectionName === "Enter section name" || sectionName === "Enter Name") {
          sectionName = `Section ${section}`;
        }
      }
      
      sectionMap[section] = {
        sectionId: parseInt(section),
        sectionName: sectionName,
        questions: []
      };
    }
    
    let questionType = getQuestionType(cell);
    let exportType = questionType;
    // --- PATCH: treat text2 as dropdown ---
    if (questionType === "text2") exportType = "dropdown";
    
    const question = {
      questionId: cell._questionId || questionCounter,
      text: cell._questionText || cell.value || "",
      type: exportType,
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
      pdfLogic: {
        enabled: false,
        pdfName: "",
        stripePriceId: "",
        conditions: []
      },
      alertLogic: {
        enabled: false,
        message: "",
        conditions: []
      },
      checklistLogic: {
        enabled: false,
        conditions: []
      },
      conditionalAlert: {
        enabled: false,
        prevQuestion: "",
        prevAnswer: "",
        text: ""
      },
      subtitle: {
        enabled: false,
        text: ""
      },
      infoBox: {
        enabled: false,
        text: ""
      },
      options: [],
      labels: []
    };
    
    // Add nameId and placeholder for non-multiple textboxes questions
    if (questionType !== "multipleTextboxes") {
      question.nameId = sanitizeNameId((typeof window.getNodeId === 'function' ? window.getNodeId(cell) : '') || cell._nameId || cell._questionText || cell.value || "unnamed");
      question.placeholder = cell._placeholder || "";
    }
    
    // For text2, clean the text from HTML
    if (questionType === "text2" && question.text) {
      const temp = document.createElement("div");
      temp.innerHTML = question.text;
      question.text = temp.textContent || temp.innerText || question.text;
    }
    
    // Clean HTML entities and tags from all question text
    if (question.text) {
      // First decode HTML entities
      const textarea = document.createElement('textarea');
      textarea.innerHTML = question.text;
      let cleanedText = textarea.value;
      
      // Then remove HTML tags
      const temp = document.createElement("div");
      temp.innerHTML = cleanedText;
      cleanedText = temp.textContent || temp.innerText || cleanedText;
      
      // Clean up extra whitespace
      cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
      
      question.text = cleanedText;
    }
    
    // For multiple textboxes, add the textboxes array and nodeId
    if (questionType === "multipleTextboxes" && cell._textboxes) {
      question.textboxes = cell._textboxes.map(tb => ({
        label: "", // Empty label field as required
        nameId: tb.nameId || "",
        placeholder: tb.nameId || "" // Use nameId as placeholder, not the generic "Enter value"
      }));
      // Add empty amounts array for multipleTextboxes
      question.amounts = [];
      
      // Add nodeId for multiple textboxes (use the sanitized nameId)
      question.nodeId = sanitizeNameId((typeof window.getNodeId === 'function' ? window.getNodeId(cell) : '') || cell._nameId || cell._questionText || cell.value || "unnamed");
    }
    
    // Handle outgoing edges to option nodes
    const outgoingEdges = graph.getOutgoingEdges(cell);
    const jumpConditions = [];
    let endOption = null;
    
    // Check for direct connections to END nodes or other questions (for text-based questions)
    if (outgoingEdges) {
      for (const edge of outgoingEdges) {
        const targetCell = edge.target;
        if (targetCell && isEndNode(targetCell)) {
          // This question connects directly to an END node
          // For text-based questions, add "Any Text" jump condition
          if (exportType === "text" || exportType === "bigParagraph" || exportType === "money" || exportType === "date" || exportType === "dateRange") {
            jumpConditions.push({
              option: "Any Text",
              to: "end"
            });
            endOption = "Any Text";
          }
        } else if (targetCell && isQuestion(targetCell)) {
          // This question connects directly to another question
          // For text-based questions, add "Any Text" jump condition to the target question
          // but only if the target is in a different section that meets the jump criteria
          if (exportType === "text" || exportType === "bigParagraph" || exportType === "money" || exportType === "date" || exportType === "dateRange") {
            const targetQuestionId = targetCell._questionId || "";
            if (targetQuestionId) {
              // Get the target question's section using the same logic as section assignment
              let targetSection = parseInt(getSection(targetCell) || "1", 10);
              
              // Apply the same section assignment logic for the target question
              const targetIsFirstQuestion = questions.every(otherCell => 
                otherCell === targetCell || targetCell.geometry.y <= otherCell.geometry.y
              );
              
              if (targetIsFirstQuestion && targetSection !== 1) {
                targetSection = 1;
              }
              
              const currentSection = parseInt(section || "1", 10);
              
              // Only add jump logic if:
              // 1. Target is in a section before current section, OR
              // 2. Target is more than 1 section above current section
              const shouldAddJump = targetSection < currentSection || targetSection > currentSection + 1;
              
              if (shouldAddJump) {
                jumpConditions.push({
                  option: "Any Text",
                  to: targetSection.toString()
                });
              }
            }
          }
        }
      }
    }
    
    if (outgoingEdges) {
      for (const edge of outgoingEdges) {
        const targetCell = edge.target;
        if (targetCell && isOptions(targetCell)) {
          let optionText = targetCell.value || "";
          // Clean HTML entities and tags from option text
          if (optionText) {
            // First decode HTML entities
            const textarea = document.createElement('textarea');
            textarea.innerHTML = optionText;
            let cleanedText = textarea.value;
            
            // Then remove HTML tags
            const temp = document.createElement("div");
            temp.innerHTML = cleanedText;
            cleanedText = temp.textContent || temp.innerText || cleanedText;
            
            // Clean up extra whitespace
            cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
            
            optionText = cleanedText;
          }
          const option = {
            text: optionText
          };
          
          // Check if this option leads to an end node (directly or through multipleDropdownType/multipleTextboxes)
          const optionOutgoingEdges = graph.getOutgoingEdges(targetCell);
          if (optionOutgoingEdges) {
            for (const optionEdge of optionOutgoingEdges) {
              const optionTarget = optionEdge.target;
              if (optionTarget && isEndNode(optionTarget)) {
                // This option leads directly to an end node
                jumpConditions.push({
                  option: optionText.trim(),
                  to: "end"
                });
                endOption = optionText.trim();
                break;
              } else if (optionTarget && isQuestion(optionTarget)) {
                // Check if this question leads to an end node
                const questionType = getQuestionType(optionTarget);
                if (questionType === "multipleDropdownType" || questionType === "multipleTextboxes") {
                  // For multipleDropdownType/multipleTextboxes, check if they lead to an end node
                  const questionOutgoingEdges = graph.getOutgoingEdges(optionTarget);
                  if (questionOutgoingEdges) {
                    for (const questionEdge of questionOutgoingEdges) {
                      const questionTarget = questionEdge.target;
                      if (questionTarget && isEndNode(questionTarget)) {
                        // This option leads to a multipleDropdownType/multipleTextboxes that leads to an end node
                        jumpConditions.push({
                          option: optionText.trim(),
                          to: "end"
                        });
                        endOption = optionText.trim();
                        break;
                      }
                    }
                  }
                }
                
                // Check for jumps to other questions - only add jump logic if target is in a different section
                // that is either before the current section or more than 1 section above
                const targetQuestionId = optionTarget._questionId || "";
                if (targetQuestionId) {
                  // Get the target question's section using the same logic as section assignment
                  let targetSection = parseInt(getSection(optionTarget) || "1", 10);
                  
                  // Apply the same section assignment logic for the target question
                  const targetIsFirstQuestion = questions.every(otherCell => 
                    otherCell === optionTarget || optionTarget.geometry.y <= otherCell.geometry.y
                  );
                  
                  if (targetIsFirstQuestion && targetSection !== 1) {
                    targetSection = 1;
                  }
                  
                  const currentSection = parseInt(section || "1", 10);
                  
                  // Only add jump logic if:
                  // 1. Target is in a section before current section, OR
                  // 2. Target is more than 1 section above current section
                  const shouldAddJump = targetSection < currentSection || targetSection > currentSection + 1;
                  
                  if (shouldAddJump) {
                    // Check if this jump already exists
                    const exists = jumpConditions.some(j => j.option === optionText.trim() && j.to === targetSection.toString());
                    if (!exists) {
                      jumpConditions.push({
                        option: optionText.trim(),
                        to: targetSection.toString()
                      });
                    }
                  }
                }
              }
            }
          }
          
          // Handle amount options
          if (getQuestionType(targetCell) === "amountOption") {
            option.amount = {
              name: targetCell._amountName || "value",
              placeholder: targetCell._amountPlaceholder || "Enter amount"
            };
          }
          // Handle image options
          if (getQuestionType(targetCell) === "imageOption" && targetCell._image) {
            option.image = targetCell._image;
          }
          question.options.push(option);
        }
      }
    }
    
    // Set jump logic if any options lead to end nodes or section jumps
    if (jumpConditions.length > 0) {
      question.jump.enabled = true;
      question.jump.conditions = jumpConditions;
    }
    
    // Set conditionalPDF answer to the option that leads to end (if any)
    if (endOption) {
      question.conditionalPDF.answer = endOption;
    }
    
    // --- PATCH: For dropdowns, convert options to array of strings and add linking/image fields ---
    if (exportType === "dropdown") {
      let imageData = null;
      
      // Sort options by their position (X coordinate, then Y coordinate)
      question.options.sort((a, b) => {
        // Find the option cells to get their positions
        const optionCells = [];
        if (outgoingEdges) {
          for (const edge of outgoingEdges) {
            const targetCell = edge.target;
            if (targetCell && isOptions(targetCell)) {
              let optionText = targetCell.value || "";
              // Clean HTML entities and tags from option text
              if (optionText) {
                const textarea = document.createElement('textarea');
                textarea.innerHTML = optionText;
                let cleanedText = textarea.value;
                const temp = document.createElement("div");
                temp.innerHTML = cleanedText;
                cleanedText = temp.textContent || temp.innerText || cleanedText;
                cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
                optionText = cleanedText;
              }
              
              if (optionText === a.text || optionText === b.text) {
                optionCells.push({ text: optionText, cell: targetCell });
              }
            }
          }
        }
        
        const aCell = optionCells.find(oc => oc.text === a.text)?.cell;
        const bCell = optionCells.find(oc => oc.text === b.text)?.cell;
        
        if (aCell && bCell) {
          const aX = aCell.geometry?.x || 0;
          const bX = bCell.geometry?.x || 0;
          if (aX !== bX) return aX - bX;
          const aY = aCell.geometry?.y || 0;
          const bY = bCell.geometry?.y || 0;
          return aY - bY;
        }
        return 0;
      });
      
      // Convert options to array of strings, and extract image node if present
      question.options = question.options.map(opt => {
        if (typeof opt.text === 'string') {
          // If this option is an image node, extract its image data and skip adding text
          if (opt.image && typeof opt.image === 'object') {
            imageData = opt.image;
            return null; // Skip this option text
          }
          return opt.text;
        }
        return "";
      }).filter(opt => opt !== null); // Remove null entries (image options)
      
      // Add linking field
      question.linking = { enabled: false, targetId: "" };
      // Add image field: use imageData if found, else default
      question.image = imageData || { url: "", width: 0, height: 0 };
    }
    
    // --- PATCH: For checkboxes, convert options to proper checkbox format ---
    if (exportType === "checkbox") {
      // Clean the question text from HTML
      if (question.text && question.text.includes("<")) {
        const temp = document.createElement("div");
        temp.innerHTML = question.text;
        question.text = temp.textContent || temp.innerText || question.text;
      }
      
      // Get the proper base nameId from the question's nodeId
      const baseNameId = (typeof window.getNodeId === 'function' ? window.getNodeId(cell) : '') || question.nameId || "unnamed";
      
      // Convert options to checkbox format with proper amount handling
      question.options = question.options.map(opt => {
        if (typeof opt.text === 'string') {
          const optionText = opt.text.trim();
          
          // Check if this option has amount properties
          const hasAmount = opt.amount && typeof opt.amount === 'object';
          
          return {
            label: optionText,
            nameId: `${baseNameId}_${optionText.toLowerCase().replace(/\s+/g, '_')}`,
            value: "",
            hasAmount: hasAmount,
            amountName: hasAmount ? (opt.amount.name || optionText) : "",
            amountPlaceholder: hasAmount ? (opt.amount.placeholder || "") : ""
          };
        }
        return {
          label: "",
          nameId: "",
          value: "",
          hasAmount: false,
          amountName: "",
          amountPlaceholder: ""
        };
      });
      
      // Set conditionalPDF answer to empty string for checkboxes
      question.conditionalPDF.answer = "";
    }
    
    // --- PATCH: For multipleDropdownType, convert to numberedDropdown format ---
    if (exportType === "multipleDropdownType") {
      // Change type to numberedDropdown
      question.type = "numberedDropdown";
      
      // Extract labels and amounts from textboxes
      if (cell._textboxes && Array.isArray(cell._textboxes)) {
        // Labels should only include non-amount options
        question.labels = [];
        // Amounts should be a simple array of strings for amount options
        question.amounts = [];
        
        cell._textboxes.forEach(tb => {
          if (tb.isAmountOption === true) {
            // Add to amounts as a simple string
            question.amounts.push(tb.nameId || tb.placeholder || "");
          } else {
            // Add to labels as a simple string
            question.labels.push(tb.nameId || tb.placeholder || "");
          }
        });
      } else {
        question.labels = [];
        question.amounts = [];
      }
      
      // Extract min and max from _twoNumbers
      if (cell._twoNumbers) {
        question.min = cell._twoNumbers.first || "1";
        question.max = cell._twoNumbers.second || "1";
      } else {
        question.min = "1";
        question.max = "1";
      }
      
      // Clear options array for numberedDropdown
      question.options = [];
    }
    
    // --- PATCH: For number type questions, convert to money type ---
    if (exportType === "number") {
      // Number questions should be exported as money type
      question.type = "money";
      question.placeholder = cell._placeholder || "";
      
      // Clear options array for money questions
      question.options = [];
      question.labels = [];
    }
    
    // --- PATCH: Add comprehensive parent conditional logic ---
    function findDirectParentCondition(cell) {
      const incomingEdges = graph.getIncomingEdges(cell) || [];
      const conditions = [];
      // For conditional logic, we need to check if the source and target are in the same logical flow
      // Since we're processing questions in order, we can determine this by position
      const currentSection = parseInt(getSection(cell) || "1", 10);
      
      for (const edge of incomingEdges) {
        const sourceCell = edge.source;
        if (sourceCell && isOptions(sourceCell)) {
          // Find the parent question of this option node
          const optionIncoming = graph.getIncomingEdges(sourceCell) || [];
          for (const optEdge of optionIncoming) {
            const parentQ = optEdge.source;
            if (parentQ && isQuestion(parentQ)) {
              const sourceSection = parseInt(getSection(parentQ) || "1", 10);
              
              // Only add conditional logic if the source section is the same as current section
              // Cross-section connections should be handled by jump logic
              if (sourceSection === currentSection) {
                const prevQuestionId = parentQ._questionId || "";
                let optionLabel = sourceCell.value || "";
                // Clean HTML entities and tags from option text
                if (optionLabel) {
                  // First decode HTML entities
                  const textarea = document.createElement('textarea');
                  textarea.innerHTML = optionLabel;
                  let cleanedLabel = textarea.value;
                  
                  // Then remove HTML tags
                  const temp = document.createElement("div");
                  temp.innerHTML = cleanedLabel;
                  cleanedLabel = temp.textContent || temp.innerText || cleanedLabel;
                  
                  // Clean up extra whitespace
                  cleanedLabel = cleanedLabel.replace(/\s+/g, ' ').trim();
                  
                  optionLabel = cleanedLabel;
                }
                conditions.push({
                  prevQuestion: String(prevQuestionId),
                  prevAnswer: optionLabel.trim()
                });
              }
            }
          }
        } else if (sourceCell && isQuestion(sourceCell)) {
          // This is a direct question-to-question connection
          const sourceSection = parseInt(getSection(sourceCell) || "1", 10);
          
          // Only add conditional logic if the source section is the same as current section
          if (sourceSection === currentSection) {
            // Check if the source is a multiple textbox/dropdown question or number question
            const sourceQuestionType = getQuestionType(sourceCell);
            if (sourceQuestionType === "multipleTextboxes" || sourceQuestionType === "multipleDropdownType" || sourceQuestionType === "number") {
              // For multiple textbox/dropdown/number questions, we need to find their parent condition
              const sourceParentCondition = findDirectParentCondition(sourceCell);
              if (sourceParentCondition) {
                if (Array.isArray(sourceParentCondition)) {
                  conditions.push(...sourceParentCondition);
                } else {
                  conditions.push(sourceParentCondition);
                }
              }
            }
          }
        }
      }
      
      // Remove duplicates based on prevQuestion and prevAnswer combination
      const uniqueConditions = [];
      const seen = new Set();
      for (const condition of conditions) {
        const key = `${condition.prevQuestion}:${condition.prevAnswer}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueConditions.push(condition);
        }
      }
      
      // If there are multiple conditions, return all of them
      if (uniqueConditions.length > 1) {
        return uniqueConditions;
      }
      
      // Return the first condition if only one, or null if none
      return uniqueConditions.length > 0 ? uniqueConditions[0] : null;
    }
    
    const directParentCondition = findDirectParentCondition(cell);
    if (directParentCondition) {
      question.logic.enabled = true;
      // Handle both single condition and array of conditions
      if (Array.isArray(directParentCondition)) {
        question.logic.conditions = directParentCondition;
      } else {
        question.logic.conditions = [directParentCondition];
      }
    }
    // --- END PATCH ---
    
    // --- PATCH: Add PDF Logic detection ---
    // Check if this question is connected to a PDF node (directly or through options)
    if (outgoingEdges) {
      for (const edge of outgoingEdges) {
        const targetCell = edge.target;
        
        // Check for direct connection to PDF node
        if (targetCell && isPdfNode(targetCell)) {
          // This question is directly connected to a PDF node
          question.pdfLogic.enabled = true;
          question.pdfLogic.pdfName = targetCell._pdfFile || targetCell._pdfUrl || "";
          question.pdfLogic.pdfDisplayName = targetCell._pdfName || "";
          question.pdfLogic.stripePriceId = targetCell._pdfPrice || targetCell._priceId || "";
          
          // If this is a Big Paragraph question and the PDF node has a character limit
          if (questionType === "bigParagraph" && targetCell._characterLimit) {
            question.pdfLogic.conditions = [{
              characterLimit: parseInt(targetCell._characterLimit) || 0
            }];
          } else {
            // For regular questions, use the same logic conditions as the question logic
            if (directParentCondition) {
              if (Array.isArray(directParentCondition)) {
                question.pdfLogic.conditions = directParentCondition;
              } else {
                question.pdfLogic.conditions = [directParentCondition];
              }
            }
          }
          break; // Only process the first PDF connection
        }
        
        // Check for connection through options
        if (targetCell && isOptions(targetCell)) {
          // Check if this option leads to a PDF node
          const optionOutgoingEdges = graph.getOutgoingEdges(targetCell);
          if (optionOutgoingEdges) {
            for (const optionEdge of optionOutgoingEdges) {
              const pdfCell = optionEdge.target;
              if (pdfCell && isPdfNode(pdfCell)) {
                // This question's option leads to a PDF node
                question.pdfLogic.enabled = true;
                question.pdfLogic.pdfName = pdfCell._pdfFile || pdfCell._pdfUrl || "";
                question.pdfLogic.pdfDisplayName = pdfCell._pdfName || "";
                question.pdfLogic.stripePriceId = pdfCell._pdfPrice || pdfCell._priceId || "";
                
                // Extract the option text
                let optionText = targetCell.value || "";
                // Clean HTML from option text
                if (optionText) {
                  const temp = document.createElement("div");
                  temp.innerHTML = optionText;
                  optionText = temp.textContent || temp.innerText || optionText;
                  optionText = optionText.trim();
                }
                
                // Set the conditions based on the option
                question.pdfLogic.conditions = [{
                  prevQuestion: String(cell._questionId || ""),
                  prevAnswer: optionText
                }];
                break; // Only process the first PDF connection
              }
            }
          }
        }
      }
    }
    // --- END PDF Logic PATCH ---
    
    // --- PATCH: Add Alert Logic detection ---
    // Check if this question is connected to an alert node through its options
    if (outgoingEdges) {
      for (const edge of outgoingEdges) {
        const optionCell = edge.target;
        if (optionCell && isOptions(optionCell)) {
          // Check if this option leads to an alert node
          const optionOutgoingEdges = graph.getOutgoingEdges(optionCell);
          if (optionOutgoingEdges) {
            for (const optionEdge of optionOutgoingEdges) {
              const targetCell = optionEdge.target;
              if (targetCell && isAlertNode(targetCell)) {
                // This question's option leads to an alert node
                question.alertLogic.enabled = true;
                
                // Extract alert text from the alert node's HTML content
                let alertText = "";
                
                // First, try the _questionText property (most current user-entered text)
                if (targetCell._questionText) {
                  alertText = targetCell._questionText;
                }
                // If no _questionText, try _alertText
                else if (targetCell._alertText) {
                  alertText = targetCell._alertText;
                }
                // If no stored properties, try to extract from the HTML input field
                else if (targetCell.value) {
                  const temp = document.createElement("div");
                  temp.innerHTML = targetCell.value;
                  const input = temp.querySelector('input[type="text"]');
                  if (input) {
                    alertText = input.value || input.getAttribute('value') || "";
                  }
                }
                
                // Clean up the alert text (remove any HTML entities or extra whitespace)
                if (alertText) {
                  alertText = alertText.replace(/&amp;/g, '&')
                                    .replace(/&lt;/g, '<')
                                    .replace(/&gt;/g, '>')
                                    .replace(/&quot;/g, '"')
                                    .replace(/&#39;/g, "'")
                                    .trim();
                }
                
                question.alertLogic.message = alertText;
                
                // Extract the option text
                let optionText = optionCell.value || "";
                // Clean HTML from option text
                if (optionText) {
                  const temp = document.createElement("div");
                  temp.innerHTML = optionText;
                  optionText = temp.textContent || temp.innerText || optionText;
                  optionText = optionText.trim();
                }
                
                question.alertLogic.conditions = [{
                  prevQuestion: String(cell._questionId || ""),
                  prevAnswer: optionText
                }];
                break; // Only process the first alert connection
              }
            }
          }
        }
      }
    }
    // --- END Alert Logic PATCH ---
    
    sectionMap[section].questions.push(question);
  }
  
  // Sort questions within each section by questionId
  for (const secNum in sectionMap) {
    sectionMap[secNum].questions.sort((a, b) => {
      const aId = parseInt(a.questionId) || 0;
      const bId = parseInt(b.questionId) || 0;
      return aId - bId;
    });
  }
  
  // Convert sectionMap to array and sort by sectionId
  for (const secNum in sectionMap) {
    sections.push(sectionMap[secNum]);
  }
  sections.sort((a, b) => a.sectionId - b.sectionId);
  
  // Calculate the maximum question ID found
  let maxQuestionId = 0;
  for (const section of sections) {
    for (const question of section.questions) {
      const questionId = parseInt(question.questionId) || 0;
      if (questionId > maxQuestionId) {
        maxQuestionId = questionId;
      }
    }
  }
  
  // Update questionCounter to be the next available question ID
  questionCounter = maxQuestionId + 1;
  
  // Get default PDF properties
  const defaultPdfProps = typeof window.getDefaultPdfProperties === 'function' ? 
    window.getDefaultPdfProperties() : { pdfName: "", pdfFile: "", pdfPrice: "" };
  
  // Create final output object
  const output = {
    sections: sections,
    groups: getGroupsData(),
    hiddenFields: hiddenFields,
    sectionCounter: sectionCounter,
    questionCounter: questionCounter,
    hiddenFieldCounter: hiddenFieldCounter,
    groupCounter: 1,
    defaultPDFName: defaultPdfProps.pdfName || "",
    pdfOutputName: defaultPdfProps.pdfFile || "",
    stripePriceId: defaultPdfProps.pdfPrice || "",
    additionalPDFs: [],
    checklistItems: []
  };
  
  // Convert to string and download
  const jsonStr = JSON.stringify(output, null, 2);
  
  // Copy to clipboard
  navigator.clipboard.writeText(jsonStr).then(() => {
    console.log('GUI JSON copied to clipboard');
    // Show user feedback
    const notification = document.createElement('div');
    notification.textContent = 'GUI JSON copied to clipboard!';
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 10px 20px; border-radius: 5px; z-index: 10000; font-family: Arial, sans-serif;';
    document.body.appendChild(notification);
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
  });
  
  if (download) {
    downloadJson(jsonStr, "gui.json");
  }
  return jsonStr;
};

// Export both flowchart and GUI JSON in a combined format
window.exportBothJson = function() {
  try {
    // Get flowchart JSON
    const parent = graph.getDefaultParent();
    const encoder = new mxCodec();
    const cells = graph.getChildCells(parent, true, true);

    // Map cells, keeping only needed properties
    const simplifiedCells = cells.map(cell => {
      // Basic info about the cell
      const cellData = {
        id: cell.id,
        vertex: cell.vertex,
        edge: cell.edge,
        value: cell.value,
        style: cleanStyle(cell.style), // Clean the style to remove excessive semicolons
      };

      // Handle geometry 
      if (cell.geometry) {
        cellData.geometry = {
          x: cell.geometry.x,
          y: cell.geometry.y,
          width: cell.geometry.width,
          height: cell.geometry.height,
        };
      }

      // Add source and target for edges
      if (cell.edge && cell.source && cell.target) {
        cellData.source = cell.source.id;
        cellData.target = cell.target.id;
      }

      // Custom fields for specific nodes
      if (cell._textboxes) cellData._textboxes = JSON.parse(JSON.stringify(cell._textboxes));
      if (cell._questionText) cellData._questionText = cell._questionText;
      if (cell._twoNumbers) cellData._twoNumbers = cell._twoNumbers;
      if (cell._nameId) cellData._nameId = cell._nameId;
      if (cell._placeholder) cellData._placeholder = cell._placeholder;
      if (cell._questionId) cellData._questionId = cell._questionId;
      
      // textbox properties
      if (cell._amountName) cellData._amountName = cell._amountName;
      if (cell._amountPlaceholder) cellData._amountPlaceholder = cell._amountPlaceholder;
      
      // image option
      if (cell._image) cellData._image = cell._image;
      
      // PDF node properties
      if (cell._pdfName !== undefined) cellData._pdfName = cell._pdfName;
      if (cell._pdfFile !== undefined) cellData._pdfFile = cell._pdfFile;
      if (cell._pdfPrice !== undefined) cellData._pdfPrice = cell._pdfPrice;
      
      // calculation node properties
      if (cell._calcTitle !== undefined) cellData._calcTitle = cell._calcTitle;
      if (cell._calcAmountLabel !== undefined) cellData._calcAmountLabel = cell._calcAmountLabel;
      if (cell._calcOperator !== undefined) cellData._calcOperator = cell._calcOperator;
      if (cell._calcThreshold !== undefined) cellData._calcThreshold = cell._calcThreshold;
      if (cell._calcFinalText !== undefined) cellData._calcFinalText = cell._calcFinalText;
      if (cell._calcTerms !== undefined) cellData._calcTerms = JSON.parse(JSON.stringify(cell._calcTerms));
      
      // subtitle & info nodes
      if (cell._subtitleText !== undefined) cellData._subtitleText = cell._subtitleText;
      if (cell._infoText !== undefined) cellData._infoText = cell._infoText;

      return cellData;
    });

    // Get default PDF properties
    const defaultPdfProps = typeof window.getDefaultPdfProperties === 'function' ? 
      window.getDefaultPdfProperties() : { pdfName: "", pdfFile: "", pdfPrice: "" };
    
    const flowchartExportObj = {
      cells: simplifiedCells,
      sectionPrefs: sectionPrefs,
      groups: getGroupsData(),
      defaultPdfProperties: defaultPdfProps
    };

    const flowchartJson = JSON.stringify(flowchartExportObj, null, 2);
    
    // Get GUI JSON (without downloading)
    const guiJson = exportGuiJson(false);
    
    // Combine both JSONs in the specified format
    const combinedText = `Okay great, here is my flowchart json: "${flowchartJson}" and here is the gui json produced: "${guiJson}"`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(combinedText).then(() => {
      console.log('Both JSONs copied to clipboard');
      // Show user feedback
      const notification = document.createElement('div');
      notification.textContent = 'Both JSONs copied to clipboard!';
      notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 10px 20px; border-radius: 5px; z-index: 10000; font-family: Arial, sans-serif;';
      document.body.appendChild(notification);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
    
  } catch (error) {
    console.error('Error in exportBothJson:', error);
    alert('Error exporting both JSONs: ' + error.message);
  }
};

// Fix capitalization in jump/logic conditions
titleCaseFix:
window.fixCapitalizationInJumps = function() {
  // ... (existing fix code) ...
};
window.fixCapitalizationInJumps();

// Save flowchart to Firebase
window.saveFlowchart = function() {
  if (!window.currentUser || window.currentUser.isGuest) { alert("Please log in with a real account to save flowcharts. Guest users cannot save."); return;}  
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
      id: cell.id, 
      value: cell.value || "",
      geometry: cell.geometry ? { 
        x: cell.geometry.x, 
        y: cell.geometry.y, 
        width: cell.geometry.width, 
        height: cell.geometry.height 
      } : null,
      style: cleanStyle(cell.style || ""),
      vertex: !!cell.vertex, 
      edge: !!cell.edge,
      source: cell.edge ? (cell.source? cell.source.id:null) : null,
      target: cell.edge ? (cell.target? cell.target.id:null) : null,
      // Save edge geometry (articulation points) if it exists
      edgeGeometry: cell.edge && cell.geometry && cell.geometry.points && cell.geometry.points.length > 0 ? {
        points: cell.geometry.points.map(point => ({
          x: point.x,
          y: point.y
        }))
      } : null,
      _textboxes: cell._textboxes||null, _questionText: cell._questionText||null,
      _twoNumbers: cell._twoNumbers||null, _nameId: cell._nameId||null,
      _placeholder: cell._placeholder||"", _questionId: cell._questionId||null,
      _image: cell._image||null,
      _notesText: cell._notesText||null, _notesBold: cell._notesBold||null, _notesFontSize: cell._notesFontSize||null,
      _checklistText: cell._checklistText||null, _alertText: cell._alertText||null, _pdfName: cell._pdfName||null, _pdfFile: cell._pdfFile||null, _pdfPrice: cell._pdfPrice||null, _pdfUrl: cell._pdfUrl||null, _priceId: cell._priceId||null
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
  // Get current section preferences using the proper function
  const currentSectionPrefs = window.getSectionPrefs ? window.getSectionPrefs() : (window.flowchartConfig?.sectionPrefs || window.sectionPrefs || {});
  data.sectionPrefs = currentSectionPrefs;
  data.groups = getGroupsData();
  
  // Get default PDF properties
  const defaultPdfProps = typeof window.getDefaultPdfProperties === 'function' ? 
    window.getDefaultPdfProperties() : { pdfName: "", pdfFile: "", pdfPrice: "" };
  data.defaultPdfProperties = defaultPdfProps;
  db.collection("users").doc(window.currentUser.uid).collection("flowcharts").doc(flowchartName).set({ 
    flowchart: data,
    lastUsed: Date.now()
  })
    .then(()=>alert("Flowchart saved as: " + flowchartName))
    .catch(err=>alert("Error saving: " + err));
};

// View saved flowcharts
window.viewSavedFlowcharts = function() {
  if (!window.currentUser || window.currentUser.isGuest) { alert("Please log in with a real account to view saved flowcharts. Guest users cannot load."); return; }
  db.collection("users").doc(window.currentUser.uid).collection("flowcharts").get()
    .then(snapshot=>{
      let flowcharts = [];
      snapshot.forEach(doc=>{
        const name = doc.id;
        const data = doc.data();
        const lastUsed = data.lastUsed || 0;
        flowcharts.push({
          name: name,
          lastUsed: lastUsed,
          data: data
        });
      });
      
      // Sort by recently used (most recent first)
      flowcharts.sort((a, b) => b.lastUsed - a.lastUsed);
      
      // Store flowcharts for search functionality
      window.currentFlowcharts = flowcharts;
      
      // Display flowcharts
      displayFlowcharts(flowcharts);
      
      // Set up search functionality
      const searchInput = document.getElementById("flowchartSearchInput");
      if (searchInput) {
        searchInput.value = "";
        searchInput.oninput = function() {
          const searchTerm = this.value.toLowerCase();
          const filteredFlowcharts = flowcharts.filter(fc => 
            fc.name.toLowerCase().includes(searchTerm)
          );
          displayFlowcharts(filteredFlowcharts);
        };
      }
      
      document.getElementById("flowchartListOverlay").style.display = "flex";
    })
    .catch(err=>alert("Error fetching: " + err));
};

// Display flowcharts in the list
function displayFlowcharts(flowcharts) {
  let html = flowcharts.length === 0 ? "<p>No saved flowcharts.</p>" : "";
  flowcharts.forEach(fc => {
    const lastUsedText = fc.lastUsed ? new Date(fc.lastUsed).toLocaleDateString() : "Never used";
    html += `<div class="flowchart-item">
              <div style="flex: 1;">
                <strong ondblclick="renameFlowchart('${fc.name}', this)">${fc.name}</strong>
                <br><small style="color: #666;">Last used: ${lastUsedText}</small>
              </div>
              <div>
                <button onclick="openSavedFlowchart('${fc.name}')">Open</button>
                <button onclick="deleteSavedFlowchart('${fc.name}')">Delete</button>
              </div>
            </div>`;
  });
  document.getElementById("flowchartList").innerHTML = html;
}

window.openSavedFlowchart = function(name) {
  if (!window.currentUser || window.currentUser.isGuest) { alert("Please log in with a real account to open saved flowcharts. Guest users cannot load."); return; }
  db.collection("users").doc(window.currentUser.uid).collection("flowcharts").doc(name)
    .get().then(docSnap=>{
      if (!docSnap.exists) { alert("No flowchart named " + name); return; }
      loadFlowchartData(docSnap.data().flowchart);
      currentFlowchartName = name;
      
      // Update last used timestamp
      db.collection("users").doc(window.currentUser.uid).collection("flowcharts").doc(name)
        .update({ lastUsed: Date.now() })
        .catch(err => console.log("Error updating last used timestamp:", err));
      
      document.getElementById("flowchartListOverlay").style.display = "none";
    }).catch(err=>alert("Error loading: " + err));
};

window.renameFlowchart = function(oldName, element) {
  if (!window.currentUser || window.currentUser.isGuest) { alert("Please log in with a real account to rename flowcharts. Guest users cannot rename."); return; }
  let newName = prompt("New name:", oldName);
  if (!newName||!newName.trim()||newName===oldName) return;
  const docRef = db.collection("users").doc(window.currentUser.uid).collection("flowcharts").doc(oldName);
  docRef.get().then(docSnap=>{
    if (docSnap.exists) {
      db.collection("users").doc(window.currentUser.uid).collection("flowcharts").doc(newName).set(docSnap.data())
        .then(()=>{ docRef.delete(); element.textContent=newName; if(currentFlowchartName===oldName) currentFlowchartName=newName; alert("Renamed to: " + newName); })
        .catch(err=>alert("Error renaming: " + err));
    }
  });
};

window.deleteSavedFlowchart = function(name) {
  if (!window.currentUser || window.currentUser.isGuest) { alert("Please log in with a real account to delete flowcharts. Guest users cannot delete."); return; }
  if (!confirm("Delete '"+name+"'?")) return;
  db.collection("users").doc(window.currentUser.uid).collection("flowcharts").doc(name).delete()
    .then(()=>{ alert("Deleted: " + name); if(currentFlowchartName===name) currentFlowchartName=null; window.viewSavedFlowcharts(); })
    .catch(err=>alert("Error deleting: " + err));
};

/**************************************************
 *            FILE I/O OPERATIONS               *
 **************************************************/

/**
 * Downloads a string as a JSON file.
 */
function downloadJson(str, filename) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(str);
  const dlAnchorElem = document.createElement("a");
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", filename);
  document.body.appendChild(dlAnchorElem);
  dlAnchorElem.click();
  document.body.removeChild(dlAnchorElem);
}

/**
 * Function to propagate PDF properties downstream through the flowchart
 */
function propagatePdfPropertiesDownstream(startCell, sourceCell, visited = new Set()) {
    if (!startCell || visited.has(startCell.id)) return;
    visited.add(startCell.id);
    
    const graph = window.graph;
    if (!graph) return;
    
    // Get all outgoing edges from the start cell
    const outgoingEdges = graph.getOutgoingEdges(startCell) || [];
    
    // Fallback: If getOutgoingEdges doesn't work, manually find edges
    if (outgoingEdges.length === 0) {
      const modelEdges = graph.getModel().getEdges();
      const childEdges = graph.getChildEdges(graph.getDefaultParent());
      const allEdges = childEdges.length > 0 ? childEdges : modelEdges;
      const manualOutgoingEdges = allEdges.filter(edge => 
        edge.source && edge.source.id === startCell.id
      );
      
      // Use manual edges if found
      if (manualOutgoingEdges.length > 0) {
        for (const edge of manualOutgoingEdges) {
          const targetCell = edge.target;
          if (targetCell && !visited.has(targetCell.id)) {
            // Check if target doesn't already have PDF properties
            if (!targetCell._pdfName && !targetCell._pdfFilename && !targetCell._pdfUrl && !targetCell._pdfFile && 
                !(typeof window.isPdfNode === 'function' && window.isPdfNode(targetCell))) {
              
              // Copy PDF properties from source to target
              if (sourceCell._pdfName) targetCell._pdfName = sourceCell._pdfName;
              if (sourceCell._pdfFilename) targetCell._pdfFilename = sourceCell._pdfFilename;
              if (sourceCell._pdfFile) targetCell._pdfFile = sourceCell._pdfFile;
              if (sourceCell._pdfPrice) targetCell._pdfPrice = sourceCell._pdfPrice;
              if (sourceCell._pdfUrl) targetCell._pdfUrl = sourceCell._pdfUrl;
              if (sourceCell._priceId) targetCell._priceId = sourceCell._priceId;
              if (sourceCell._characterLimit) targetCell._characterLimit = sourceCell._characterLimit;
              
              console.log(`🔍 [PDF INHERITANCE] Propagated PDF properties from ${sourceCell.id} to downstream ${targetCell.id}`);
              
              // Recursively propagate to further downstream nodes
              propagatePdfPropertiesDownstream(targetCell, sourceCell, visited);
            }
          }
        }
        return; // Exit early since we handled the manual edges
      }
    }
    
    for (const edge of outgoingEdges) {
        const targetCell = edge.target;
        if (targetCell && !visited.has(targetCell.id)) {
            // Check if target doesn't already have PDF properties
            if (!targetCell._pdfName && !targetCell._pdfFilename && !targetCell._pdfUrl && !targetCell._pdfFile && 
                !(typeof window.isPdfNode === 'function' && window.isPdfNode(targetCell))) {
                
                // Copy PDF properties from source to target
                if (sourceCell._pdfName) targetCell._pdfName = sourceCell._pdfName;
                if (sourceCell._pdfFilename) targetCell._pdfFilename = sourceCell._pdfFilename;
                if (sourceCell._pdfFile) targetCell._pdfFile = sourceCell._pdfFile;
                if (sourceCell._pdfPrice) targetCell._pdfPrice = sourceCell._pdfPrice;
                if (sourceCell._pdfUrl) targetCell._pdfUrl = sourceCell._pdfUrl;
                if (sourceCell._priceId) targetCell._priceId = sourceCell._priceId;
                if (sourceCell._characterLimit) targetCell._characterLimit = sourceCell._characterLimit;
                
                console.log(`🔍 [PDF INHERITANCE] Propagated PDF properties from ${sourceCell.id} to downstream ${targetCell.id}`);
                
                // Recursively propagate to further downstream nodes
                propagatePdfPropertiesDownstream(targetCell, sourceCell, visited);
            }
        }
    }
}

/**
 * Propagate PDF properties through the flowchart after import
 */
function propagatePdfPropertiesAfterImport() {
  const graph = window.graph;
  if (!graph) return;
  
  
  // Force graph model to update and refresh
  graph.getModel().beginUpdate();
  graph.getModel().endUpdate();
  graph.refresh();
  
  // Get all cells in the graph
  const allCells = graph.getModel().cells;
  const cells = Object.values(allCells).filter(cell => cell && cell.vertex);
  
  // Find all PDF nodes
  const pdfNodes = cells.filter(cell => {
    return cell._pdfName || cell._pdfFilename || cell._pdfUrl || cell._pdfFile || 
           (typeof window.isPdfNode === 'function' && window.isPdfNode(cell));
  });
  
  
  // For each PDF node, propagate its properties to all downstream nodes
  pdfNodes.forEach(pdfNode => {
    
    // Check all edges in the graph using multiple methods
    const modelEdges = graph.getModel().getEdges();
    const childEdges = graph.getChildEdges(graph.getDefaultParent());
    
    // Use childEdges as the primary source since it's more reliable
    const allEdges = childEdges.length > 0 ? childEdges : modelEdges;
    
    // Check edges specifically connected to this PDF node
    const connectedEdges = allEdges.filter(edge => 
      (edge.source && edge.source.id === pdfNode.id) || 
      (edge.target && edge.target.id === pdfNode.id)
    );
    
    // Check if PDF node has incoming edges (should propagate to source)
    const incomingEdges = allEdges.filter(edge => 
      edge.target && edge.target.id === pdfNode.id
    );
    
    // Check if PDF node has outgoing edges (should propagate to targets)
    const outgoingEdges = allEdges.filter(edge => 
      edge.source && edge.source.id === pdfNode.id
    );
    
    // Try both directions: outgoing edges (PDF node as source) and incoming edges (PDF node as target)
    if (outgoingEdges.length > 0) {
      propagatePdfPropertiesDownstream(pdfNode, pdfNode, new Set());
    } else if (incomingEdges.length > 0) {
      // If PDF node has no outgoing edges, check if we should propagate to its source nodes
      const visited = new Set();
      for (const edge of incomingEdges) {
        const sourceCell = edge.source;
        if (sourceCell && !visited.has(sourceCell.id)) {
          visited.add(sourceCell.id);
          // Copy PDF properties to the source node first
          if (!sourceCell._pdfFile && !sourceCell._pdfUrl) {
            sourceCell._pdfName = pdfNode._pdfName;
            sourceCell._pdfFile = pdfNode._pdfFile;
            sourceCell._pdfPrice = pdfNode._pdfPrice;
            sourceCell._pdfUrl = pdfNode._pdfUrl;
            sourceCell._priceId = pdfNode._priceId;
            sourceCell._pdfFilename = pdfNode._pdfFilename;
            sourceCell._characterLimit = pdfNode._characterLimit;
          }
          // Then propagate from the source node downstream
          propagatePdfPropertiesDownstream(sourceCell, pdfNode, new Set());
        }
      }
    }
  });
  
}

/**
 * Correct Node IDs to follow proper naming scheme after import
 */
window.correctNodeIdsAfterImport = function() {
  const graph = window.graph;
  if (!graph) return;
  
  console.log('🔧 [NODE ID CORRECTION] Starting Node ID correction after import');
  
  // Get all cells in the graph
  const allCells = graph.getModel().cells;
  const cells = Object.values(allCells).filter(cell => cell && cell.vertex);
  
  let correctedCount = 0;
  
  cells.forEach(cell => {
    if (cell && cell.vertex && typeof window.setNodeId === 'function') {
      // Clear the existing Node ID from the style to force regeneration
      let style = cell.style || '';
      const oldNodeId = style.match(/nodeId=([^;]+)/);
      if (oldNodeId) {
        const oldId = decodeURIComponent(oldNodeId[1]);
        style = style.replace(/nodeId=[^;]+/, '');
        graph.getModel().setStyle(cell, style);
        
        // Now get a fresh Node ID using getNodeId (which will apply proper naming scheme)
        const freshId = typeof window.getNodeId === 'function' ? window.getNodeId(cell) : (cell._nameId || cell.id);
        
        // Only update if the ID actually changed
        if (freshId !== oldId) {
          window.setNodeId(cell, freshId);
          correctedCount++;
          console.log(`🔧 [NODE ID CORRECTION] Corrected Node ID: "${oldId}" → "${freshId}"`);
        }
      }
    }
  });
  
  if (correctedCount > 0) {
    console.log(`🔧 [NODE ID CORRECTION] Corrected ${correctedCount} Node IDs to follow proper naming scheme`);
    // Refresh the graph to show the corrected Node IDs
    if (typeof window.refreshAllCells === 'function') {
      window.refreshAllCells();
    }
  } else {
    console.log('🔧 [NODE ID CORRECTION] No Node IDs needed correction');
  }
}

/**
 * Load a flowchart from JSON data.
 */
window.loadFlowchartData = function(data) {
  if (!data.cells) {
    alert("Invalid flowchart data");
    return;
  }
  
  // Check if we have edges without an existing edge style - add default style
  data.cells.forEach(item => {
    if (item.edge && (!item.style || item.style === "")) {
      item.style = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;";
    }
  });

  graph.getModel().beginUpdate();
  try {
    const parent = graph.getDefaultParent();
    graph.removeCells(graph.getChildVertices(parent));
    const createdCells = {};

    if (data.sectionPrefs) {
      console.log('🔍 [SECTION LOAD DEBUG] Loading section preferences:', JSON.stringify(data.sectionPrefs, null, 2));
      
      // Update section preferences through the proper accessor
      
      if (window.flowchartConfig && window.flowchartConfig.sectionPrefs) {
        window.flowchartConfig.sectionPrefs = data.sectionPrefs;
        console.log('🔍 [SECTION LOAD DEBUG] Set window.flowchartConfig.sectionPrefs');
      } else {
        window.sectionPrefs = data.sectionPrefs;
        console.log('🔍 [SECTION LOAD DEBUG] Set window.sectionPrefs');
      }
      
      // Test the getSectionPrefs function immediately after setting
      if (typeof getSectionPrefs === 'function') {
        const testResult = getSectionPrefs();
        console.log('🔍 [SECTION LOAD DEBUG] getSectionPrefs() result:', JSON.stringify(testResult, null, 2));
      }
      
      // Add a watcher to detect if section preferences are modified after this point
      const originalSectionPrefs = window.flowchartConfig?.sectionPrefs || window.sectionPrefs;
      
      // updateSectionLegend is defined in legend.js
      // Add a small delay to ensure DOM is ready
      setTimeout(() => {
        
        // Check if section preferences have changed since we set them
        const currentSectionPrefs = window.flowchartConfig?.sectionPrefs || window.sectionPrefs;
        
        if (typeof updateSectionLegend === 'function') {
          console.log('🔍 [SECTION LOAD DEBUG] Calling updateSectionLegend()');
          updateSectionLegend();
        } else {
          console.error('❌ [SECTION IMPORT DEBUG] updateSectionLegend function not available!');
        }
      }, 50);
    } else {
      // No section preferences in import data, but we need to check if cells have sections
      console.log('🔍 [IMPORT DEBUG] No sectionPrefs in import data, checking cells for sections');
    }
    
    // After creating cells, check for missing section preferences and create them
    setTimeout(() => {
      const currentSectionPrefs = window.flowchartConfig?.sectionPrefs || window.sectionPrefs || {};
      const usedSections = new Set();
      
      // Collect all sections used by cells
      data.cells.forEach(cell => {
        if (cell.style) {
          const sectionMatch = cell.style.match(/section=([^;]+)/);
          if (sectionMatch) {
            usedSections.add(sectionMatch[1]);
          }
        }
      });
      
      console.log('🔍 [IMPORT DEBUG] Sections found in imported cells:', Array.from(usedSections));
      console.log('🔍 [IMPORT DEBUG] Current section preferences:', Object.keys(currentSectionPrefs));
      
      // Create missing section preferences
      let needsUpdate = false;
      usedSections.forEach(sectionNum => {
        if (!currentSectionPrefs[sectionNum]) {
          console.log(`🔍 [IMPORT DEBUG] Creating missing section preference for section ${sectionNum}`);
          currentSectionPrefs[sectionNum] = {
            borderColor: window.getDefaultSectionColor ? window.getDefaultSectionColor(parseInt(sectionNum)) : "#cccccc",
            name: `Section ${sectionNum}`
          };
          needsUpdate = true;
        }
      });
      
      if (needsUpdate) {
        console.log('🔍 [IMPORT DEBUG] Updated section preferences:', currentSectionPrefs);
        
        // Update the section preferences
        if (window.flowchartConfig && window.flowchartConfig.sectionPrefs) {
          window.flowchartConfig.sectionPrefs = currentSectionPrefs;
        } else {
          window.sectionPrefs = currentSectionPrefs;
        }
        
        // Update the legend
        if (typeof updateSectionLegend === 'function') {
          updateSectionLegend();
        }
      }
    }, 100);

    // First pass: Create all cells
    data.cells.forEach(item => {
      if (item.vertex) {
        const geo = new mxGeometry(
          item.geometry.x,
          item.geometry.y,
          item.geometry.width,
          item.geometry.height
        );
        // Decode HTML entities in cell value to prevent double/triple encoding
        let cellValue = item.value;
        if (cellValue && typeof cellValue === 'string') {
          // Create a temporary div to decode HTML entities
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = cellValue;
          cellValue = tempDiv.textContent || tempDiv.innerText || cellValue;
        }
        const newCell = new mxCell(cellValue, geo, item.style);
        newCell.vertex = true;
        newCell.id = item.id;
        
        // Transfer all custom properties
        if (item._textboxes) newCell._textboxes = JSON.parse(JSON.stringify(item._textboxes));
        if (item._questionText) {
          // Decode HTML entities in _questionText as well
          let questionText = item._questionText;
          if (typeof questionText === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = questionText;
            questionText = tempDiv.textContent || tempDiv.innerText || questionText;
          }
          newCell._questionText = questionText;
        }
        if (item._twoNumbers) newCell._twoNumbers = item._twoNumbers;
        if (item._nameId) newCell._nameId = item._nameId;
        if (item._placeholder) newCell._placeholder = item._placeholder;
        if (item._questionId) newCell._questionId = item._questionId;
        
        // Amount option properties
        if (item._amountName) newCell._amountName = item._amountName;
        if (item._amountPlaceholder) newCell._amountPlaceholder = item._amountPlaceholder;
        
        // Image option
        if (item._image) newCell._image = item._image;
        
        // PDF node properties
        if (item._pdfName !== undefined) newCell._pdfName = item._pdfName;
        if (item._pdfFile !== undefined) newCell._pdfFile = item._pdfFile;
        if (item._pdfPrice !== undefined) newCell._pdfPrice = item._pdfPrice;
        // Legacy PDF properties for backward compatibility
        if (item._pdfUrl !== undefined) newCell._pdfUrl = item._pdfUrl;
        if (item._priceId !== undefined) newCell._priceId = item._priceId;
        if (item._characterLimit !== undefined) newCell._characterLimit = item._characterLimit;
        
        // Notes node properties
        if (item._notesText !== undefined) {
          let notesText = item._notesText;
          if (typeof notesText === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = notesText;
            notesText = tempDiv.textContent || tempDiv.innerText || notesText;
          }
          newCell._notesText = notesText;
        }
        if (item._notesBold !== undefined) newCell._notesBold = item._notesBold;
        if (item._notesFontSize !== undefined) newCell._notesFontSize = item._notesFontSize;
        
        // Checklist node properties
        if (item._checklistText !== undefined) {
          let checklistText = item._checklistText;
          if (typeof checklistText === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = checklistText;
            checklistText = tempDiv.textContent || tempDiv.innerText || checklistText;
          }
          newCell._checklistText = checklistText;
        }
        
        // Alert node properties
        if (item._alertText !== undefined) {
          let alertText = item._alertText;
          if (typeof alertText === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = alertText;
            alertText = tempDiv.textContent || tempDiv.innerText || alertText;
          }
          newCell._alertText = alertText;
        }
        
        // Calculation properties
        if (item._calcTitle !== undefined) {
          let calcTitle = item._calcTitle;
          if (typeof calcTitle === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = calcTitle;
            calcTitle = tempDiv.textContent || tempDiv.innerText || calcTitle;
          }
          newCell._calcTitle = calcTitle;
        }
        if (item._calcAmountLabel !== undefined) {
          let calcAmountLabel = item._calcAmountLabel;
          if (typeof calcAmountLabel === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = calcAmountLabel;
            calcAmountLabel = tempDiv.textContent || tempDiv.innerText || calcAmountLabel;
          }
          newCell._calcAmountLabel = calcAmountLabel;
        }
        if (item._calcOperator !== undefined) newCell._calcOperator = item._calcOperator;
        if (item._calcThreshold !== undefined) newCell._calcThreshold = item._calcThreshold;
        if (item._calcFinalText !== undefined) {
          let calcFinalText = item._calcFinalText;
          if (typeof calcFinalText === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = calcFinalText;
            calcFinalText = tempDiv.textContent || tempDiv.innerText || calcFinalText;
          }
          newCell._calcFinalText = calcFinalText;
        }
        if (item._calcTerms !== undefined) newCell._calcTerms = JSON.parse(JSON.stringify(item._calcTerms));
        
        // Subtitle and info node properties - decode HTML entities
        if (item._subtitleText !== undefined) {
          let subtitleText = item._subtitleText;
          if (typeof subtitleText === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = subtitleText;
            subtitleText = tempDiv.textContent || tempDiv.innerText || subtitleText;
          }
          newCell._subtitleText = subtitleText;
        }
        if (item._infoText !== undefined) {
          let infoText = item._infoText;
          if (typeof infoText === 'string') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = infoText;
            infoText = tempDiv.textContent || tempDiv.innerText || infoText;
          }
          newCell._infoText = infoText;
        }

        graph.addCell(newCell, parent);
        createdCells[item.id] = newCell;
      }
    });

    // Handle duplicate node IDs after all cells are created
    resolveDuplicateNodeIds(Object.values(createdCells));

    // Second pass: Connect the edges
    let edgesCreated = 0;
    data.cells.forEach(item => {
      if (item.edge === true && item.source && item.target) {
        const source = createdCells[item.source];
        const target = createdCells[item.target];
        
        if (source && target) {
          const geo = new mxGeometry();
          
          // Restore edge geometry (articulation points) if it exists
          if (item.edgeGeometry && item.edgeGeometry.points && item.edgeGeometry.points.length > 0) {
            geo.points = item.edgeGeometry.points.map(point => new mxPoint(point.x, point.y));
          }
          
          const edge = new mxCell("", geo, item.style);
          edge.edge = true;
          edge.id = item.id;
          edge.source = source;
          edge.target = target;
          graph.addCell(edge, parent);
          edgesCreated++;
        } else {
        }
      } else {
      }
    });

    // Third pass: Update cell displays based on types
    graph.getModel().beginUpdate();
    try {
      Object.values(createdCells).forEach(cell => {
        if (getQuestionType(cell) === 'multipleTextboxes') {
          updateMultipleTextboxesCell(cell);
        } else if (getQuestionType(cell) === 'multipleDropdownType') {
          updatemultipleDropdownTypeCell(cell);
        } else if (getQuestionType(cell) === 'text2') {
          updateText2Cell(cell);
        } else if (getQuestionType(cell) === 'amountOption') {
          // Amount options are handled in refreshAllCells
        } else if (getQuestionType(cell) === 'imageOption') {
          updateImageOptionCell(cell);
        } else if (getQuestionType(cell) === 'notesNode') {
          updateNotesNodeCell(cell);
        } else if (getQuestionType(cell) === 'checklistNode') {
          updateChecklistNodeCell(cell);
        } else if (getQuestionType(cell) === 'alertNode') {
          updateAlertNodeCell(cell);
        } else if (isPdfNode(cell)) {
          updatePdfNodeCell(cell);
        } else if (isCalculationNode(cell)) {
          updateCalculationNodeCell(cell);
        } else if (isSubtitleNode(cell)) {
          // Use the _subtitleText property if available, otherwise extract from value
          if (!cell._subtitleText && cell.value) {
            const cleanValue = cell.value.replace(/<[^>]+>/g, "").trim();
            cell._subtitleText = cleanValue || "Subtitle text";
          }
          updateSubtitleNodeCell(cell);
        } else if (isInfoNode(cell)) {
          // Use the _infoText property if available, otherwise extract from value
          if (!cell._infoText && cell.value) {
            const cleanValue = cell.value.replace(/<[^>]+>/g, "").trim();
            cell._infoText = cleanValue || "Information text";
          }
          updateInfoNodeCell(cell);
        }
      });
    } finally {
      graph.getModel().endUpdate();
    }
    
    // Fourth pass: Ensure question nodes are editable
    Object.values(createdCells).forEach(cell => {
      if (isQuestion(cell)) {
        // Make sure question nodes are editable
        let style = cell.style || '';
        if (!style.includes('editable=1') && !style.includes('editable=0')) {
          style += ';editable=1;';
          graph.getModel().setStyle(cell, style);
        }
      }
    });
  } finally {
    graph.getModel().endUpdate();
  }

  refreshAllCells();
  
  // Load groups data if present (after sections are fully processed)
  console.log('loadFlowchartData: checking for groups data');
  console.log('loadFlowchartData: data.groups =', data.groups);
  if (data.groups) {
    console.log('loadFlowchartData: calling loadGroupsFromData with:', data.groups);
    loadGroupsFromData(data.groups);
  } else {
    console.log('loadFlowchartData: no groups data found');
  }
  
  // Load default PDF properties if present, otherwise clear them
  console.log('loadFlowchartData: checking for default PDF properties');
  console.log('loadFlowchartData: data.defaultPdfProperties =', data.defaultPdfProperties);
  if (data.defaultPdfProperties) {
    console.log('loadFlowchartData: loading default PDF properties:', data.defaultPdfProperties);
    if (typeof window.setDefaultPdfProperties === 'function') {
      window.setDefaultPdfProperties(data.defaultPdfProperties);
    }
  } else {
    console.log('loadFlowchartData: no default PDF properties found, clearing them');
    // Clear default PDF properties if the loaded flowchart doesn't have them
    if (typeof window.setDefaultPdfProperties === 'function') {
      window.setDefaultPdfProperties({ pdfName: "", pdfFile: "", pdfPrice: "" });
    }
  }
  
  // Propagate PDF properties through the flowchart after all cells and edges are loaded
  setTimeout(() => {
    propagatePdfPropertiesAfterImport();
    // Also correct Node IDs to follow proper naming scheme
    correctNodeIdsAfterImport();
  }, 500); // Increased delay to ensure all edges are fully processed in graph model
  
  // Find node with smallest y-position (topmost on screen) and center on it
  setTimeout(() => {
    const vertices = graph.getChildVertices(graph.getDefaultParent());
    if (vertices.length > 0) {
      // Find the node with the smallest y-position (topmost on the screen)
      let topNode = vertices[0];
      let minY = vertices[0].geometry.y;
      vertices.forEach(cell => {
        if (cell.geometry.y < minY) {
          minY = cell.geometry.y;
          topNode = cell;
        }
      });
      // Center the view on the topmost node
      if (topNode) {
        const centerX = topNode.geometry.x + topNode.geometry.width / 2;
        const centerY = topNode.geometry.y + topNode.geometry.height / 2;
        const containerWidth = graph.container.clientWidth;
        const containerHeight = graph.container.clientHeight;
        const scale = graph.view.scale;
        const tx = (containerWidth / 2 - centerX * scale);
        const ty = (containerHeight / 2 - centerY * scale);
        graph.view.setTranslate(tx / scale, ty / scale);
        graph.view.refresh();
      }
    }
  }, 100); // Small delay to ensure all rendering is complete
};

/**
 * Resolves duplicate node IDs by adding numbering to duplicates
 */
function resolveDuplicateNodeIds(cells) {
  const nodeIdCounts = new Map();
  const nodeIdToCells = new Map();
  
  // First pass: collect all node IDs and their occurrences
  cells.forEach(cell => {
    const nodeId = (typeof window.getNodeId === 'function' ? window.getNodeId(cell) : '') || "";
    if (nodeId) {
      if (!nodeIdCounts.has(nodeId)) {
        nodeIdCounts.set(nodeId, 0);
        nodeIdToCells.set(nodeId, []);
      }
      nodeIdCounts.set(nodeId, nodeIdCounts.get(nodeId) + 1);
      nodeIdToCells.get(nodeId).push(cell);
    }
  });
  
  // Second pass: resolve duplicates by adding numbering
  nodeIdCounts.forEach((count, nodeId) => {
    if (count > 1) {
      const cellsWithThisId = nodeIdToCells.get(nodeId);
      
      // Keep the first occurrence as is, number the rest
      for (let i = 1; i < cellsWithThisId.length; i++) {
        const cell = cellsWithThisId[i];
        const newNodeId = `${nodeId}_${i}`;
        setNodeId(cell, newNodeId);
      }
    }
  });
}





