// Test script for transitive conditional logic in export function
const fs = require('fs');

// Mock a simple graph structure for testing - replicating our flowchart
const mockGraph = {
  getModel: () => ({
    getChildCells: () => [
      // Create mock cells - questions and options
      { id: '1', value: { nodetype: 'question', text: 'Do you have a lawyer?', number: '1' } },
      { id: '2', value: { nodetype: 'option', text: 'Yes', number: '1' } },
      { id: '3', value: { nodetype: 'option', text: 'No', number: '1' } },
      { id: '4', value: { nodetype: 'question', text: 'Who is your lawyer?', number: '2' } },
      { id: '5', value: { nodetype: 'question', text: 'Has your lawyer agreed to help?', number: '3' } },
      { id: '6', value: { nodetype: 'option', text: 'Yes', number: '3' } },
      { id: '7', value: { nodetype: 'option', text: 'No', number: '3' } },
      { id: '8', value: { nodetype: 'question', text: 'Where are you?', number: '4' } },
      { id: '9', value: { nodetype: 'question', text: 'What is your name?', number: '5' } },
    ],
    getCell: (id) => mockGraph.getModel().getChildCells().find(cell => cell.id === id)
  }),
  getIncomingEdges: (cell) => {
    // Map of target cell ID to list of source cell IDs
    const edgeMap = {
      '4': [{ source: mockGraph.getModel().getCell('2') }], // Who is your lawyer? <- Yes from Q1
      '5': [{ source: mockGraph.getModel().getCell('4') }], // Has your lawyer agreed to help? <- Who is your lawyer?
      '8': [{ source: mockGraph.getModel().getCell('6') }], // Where are you? <- Yes from Q3
      '9': [
        { source: mockGraph.getModel().getCell('3') }, // What is your name? <- No from Q1
        { source: mockGraph.getModel().getCell('7') }  // What is your name? <- No from Q3
      ],
    };
    return edgeMap[cell.id] || [];
  }
};

// Identify if a cell is a question
function isQuestion(cell) {
  return cell && cell.value && cell.value.nodetype === 'question';
}

// Identify if a cell is an option
function isOptions(cell) {
  return cell && cell.value && cell.value.nodetype === 'option';
}

// Function to export GUI JSON (simplified for testing)
function exportGuiJson() {
  const model = mockGraph.getModel();
  const allCells = model.getChildCells();
  
  // Map to track question IDs
  const questionIdMap = new Map();
  const questionCellMap = new Map();
  
  // First pass: create the questions array
  const questions = allCells.filter(cell => isQuestion(cell));
  
  const questionsJson = questions.map((cell, index) => {
    const questionId = index + 1;
    questionIdMap.set(cell.id, questionId);
    questionCellMap.set(questionId, cell);
    
    return {
      questionId: questionId,
      text: cell.value.text,
      number: cell.value.number,
      logic: {
        enabled: false,
        conditions: []
      },
      options: []
    };
  });
  
  // Second pass: Assign options to their parent questions
  const options = allCells.filter(cell => isOptions(cell));
  options.forEach(cell => {
    // Find parent question (in a real graph, this would be different)
    const parentNumber = cell.value.number;
    const question = questionsJson.find(q => q.number === parentNumber);
    if (question) {
      question.options.push(cell.value.text);
    }
  });
  
  // Third pass: Determine conditional logic between questions
  questionsJson.forEach(question => {
    const questionCell = questionCellMap.get(question.questionId);
    if (!questionCell) return;
    
    // Clear existing conditions
    question.logic.conditions = [];
    question.logic.enabled = false;
    
    // Get incoming edges to this question
    const incomingEdges = mockGraph.getIncomingEdges(questionCell);
    
    // For each incoming edge
    incomingEdges.forEach(edge => {
      const sourceCell = edge.source;
      if (!sourceCell) return;
      
      if (isOptions(sourceCell)) {
        // This is a direct condition - question depends on this option being selected
        const optionText = sourceCell.value.text;
        
        // Find the parent question of this option
        const parentQuestionNumber = sourceCell.value.number;
        const parentQuestion = questionsJson.find(q => q.number === parentQuestionNumber);
        
        if (parentQuestion) {
          // We found a direct conditional relationship - add it to the logic
          question.logic.enabled = true;
          
          // Only add if this specific condition doesn't already exist
          const existingCondition = question.logic.conditions.find(
            c => c.prevQuestion === parentQuestion.questionId.toString() && c.prevAnswer === optionText
          );
          
          if (!existingCondition) {
            question.logic.conditions.push({
              prevQuestion: parentQuestion.questionId.toString(),
              prevAnswer: optionText
            });
          }
        }
      } else if (isQuestion(sourceCell)) {
        // This is a question-to-question connection
        // The current question should inherit all conditions from the parent question
        const parentQuestionId = questionIdMap.get(sourceCell.id);
        
        if (parentQuestionId) {
          // Find the parent question in the JSON
          const parentQuestion = questionsJson.find(q => q.questionId === parentQuestionId);
          
          if (parentQuestion && parentQuestion.logic.enabled) {
            // Mark this question's logic as enabled
            question.logic.enabled = true;
            
            // Inherit all conditions from the parent question
            parentQuestion.logic.conditions.forEach(condition => {
              // Only add if this specific condition doesn't already exist
              const existingCondition = question.logic.conditions.find(
                c => c.prevQuestion === condition.prevQuestion && c.prevAnswer === condition.prevAnswer
              );
              
              if (!existingCondition) {
                question.logic.conditions.push({
                  prevQuestion: condition.prevQuestion,
                  prevAnswer: condition.prevAnswer
                });
              }
            });
          }
        }
      }
    });
    
    // Check for duplicate conditions that could have been added by multiple paths
    if (question.logic.conditions.length > 0) {
      // Create a unique set of conditions based on prevQuestion and prevAnswer
      const uniqueConditions = [];
      const conditionMap = new Map();
      
      for (const condition of question.logic.conditions) {
        const key = `${condition.prevQuestion}_${condition.prevAnswer}`;
        if (!conditionMap.has(key)) {
          conditionMap.set(key, true);
          uniqueConditions.push(condition);
        }
      }
      
      // Replace with the unique set
      question.logic.conditions = uniqueConditions;
    }
  });
  
  return { questions: questionsJson };
}

// Run the test
const result = exportGuiJson();
console.log(JSON.stringify(result, null, 2));

// Save to a file for inspection
fs.writeFileSync('test_transitive_export.json', JSON.stringify(result, null, 2));
console.log('Test export saved to test_transitive_export.json'); 