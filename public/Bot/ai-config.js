// AI Flowchart Generator Configuration
// Replace 'YOUR_API_KEY_HERE' with your actual OpenAI API key
const AI_CONFIG = {
    apiKey: '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', // Add your OpenAI API key here or use the runtime setup
    model: 'gpt-3.5-turbo', // or 'gpt-4' for better responses
    maxTokens: 2000, // Increased for more complex flowcharts
    temperature: 0.3, // Lower temperature for more consistent JSON generation
    systemPrompt: `You are an AI Flowchart Generator designed to create structured flowcharts based on user descriptions. 

Your role is to:
- Generate valid JSON structures for flowchart creation tools
- Create logical flow sequences with proper question-answer patterns
- Use appropriate node types (questions, options, end nodes)
- Position nodes with proper spacing and layout
- Ensure the generated JSON is valid and can be imported directly

Always generate complete, valid JSON that represents the described flowchart structure.`
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI_CONFIG;
}
