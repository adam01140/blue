// Test script for conditional logic in export function
const fs = require('fs');

// Mock a simple graph structure for testing
const mockGraph = {
  getModel: () => ({
    getChildCells: () => [
      // Create mock cells - questions and options
      { id: '1', value: { nodetype: 'question', text: 'Do you have a lawyer?', number: '1' } },
      { id: '2', value: { nodetype: 'option', text: 'Yes', number: '1' } },
      { id: '3', value: { nodetype: 'option', text: 'No', number: '1' } },
      { id: '4', value: { nodetype: 'question', text: 'Who is your lawyer?', number: '2' } },
      { id: '5', value: { nodetype: 'question', text: 'Do you want a lawyer?', number: '3' } },
      { id: '6', value: { nodetype: 'option', text: 'Yes', number: '3' } },
      { id: '7', value: { nodetype: 'option', text: 'No', number: '3' } },
      { id: '8', value: { nodetype: 'question', text: 'What is your name?', number: '4' } },
      { id: '9', value: { nodetype: 'question', text: 'Where are you?', number: '5' } },
    ],
    getCell: (id) => mockGraph.getModel().getChildCells().find(cell => cell.id === id)
  }),
  getIncomingEdges: (cell) => {
    // Map of target cell ID to list of source cell IDs
    const edgeMap = {
      '4': [{ source: mockGraph.getModel().getCell('2') }], // Who is your lawyer? <- Yes from Q1
      '5': [{ source: mockGraph.getModel().getCell('3') }], // Do you want a lawyer? <- No from Q1
      '8': [
        { source: mockGraph.getModel().getCell('3') }, // What is your name? <- No from Q1
        { source: mockGraph.getModel().getCell('7') }  // What is your name? <- No from Q3
      ],
      '9': [{ source: mockGraph.getModel().getCell('6') }], // Where are you? <- Yes from Q3
    };
    return edgeMap[cell.id] || [];
  }
};

// Function to export GUI JSON (simplified for testing)
function exportGuiJson() {
  const model = mockGraph.getModel();
  const allCells = model.getChildCells();
  
  const questions = allCells.filter(cell => 
    cell.value && cell.value.nodetype === 'question'
  );
  
  const options = allCells.filter(cell => 
    cell.value && cell.value.nodetype === 'option'
  );
  
  // First pass: create the questions array
  const questionsJson = questions.map(cell => {
    return {
      text: cell.value.text,
      number: cell.value.number,
      options: [],
      conditions: []
    };
  });
  
  // Second pass: Assign options to their parent questions
  options.forEach(cell => {
    // Find parent question (in a real graph, this would be different)
    const parentNumber = cell.value.number;
    const question = questionsJson.find(q => q.number === parentNumber);
    if (question) {
      question.options.push({
        text: cell.value.text
      });
    }
  });
  
  // Third pass: Determine conditional logic between questions
  questionsJson.forEach(question => {
    const questionCell = allCells.find(cell => 
      cell.value && 
      cell.value.nodetype === 'question' && 
      cell.value.number === question.number
    );
    
    if (!questionCell) return;
    
    // Clear existing conditions
    question.conditions = [];
    
    // Get incoming edges to this question
    const incomingEdges = mockGraph.getIncomingEdges(questionCell);
    
    // For each incoming edge
    incomingEdges.forEach(edge => {
      const sourceCell = edge.source;
      if (!sourceCell || !sourceCell.value) return;
      
      // If the source is an option
      if (sourceCell.value.nodetype === 'option') {
        // Find the question this option belongs to
        const sourceQuestionNumber = sourceCell.value.number;
        const sourceQuestion = questionsJson.find(q => q.number === sourceQuestionNumber);
        
        if (sourceQuestion) {
          // Add this as a condition
          question.conditions.push({
            prevQuestion: sourceQuestionNumber,
            prevAnswer: sourceCell.value.text
          });
        }
      }
    });
    
    // Remove duplicate conditions
    const uniqueConditions = [];
    const seen = new Set();
    
    question.conditions.forEach(condition => {
      const key = `${condition.prevQuestion}_${condition.prevAnswer}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueConditions.push(condition);
      }
    });
    
    question.conditions = uniqueConditions;
  });
  
  return { questions: questionsJson };
}

// Run the test
const result = exportGuiJson();
console.log(JSON.stringify(result, null, 2));

// Save to a file for inspection
fs.writeFileSync('test_export.json', JSON.stringify(result, null, 2));
console.log('Test export saved to test_export.json'); 