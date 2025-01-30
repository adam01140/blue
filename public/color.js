/* color.js */

// We'll attach event listeners to the color blocks, open the #colorPickerInput, etc.

// This function updates the legend squares from the global colorPreferences
window.updateLegendBlocks = function() {
  document.getElementById("colorBlockText").style.backgroundColor = window.colorPreferences.text;
  document.getElementById("colorBlockCheckbox").style.backgroundColor = window.colorPreferences.checkbox;
  document.getElementById("colorBlockDropdown").style.backgroundColor = window.colorPreferences.dropdown;
  document.getElementById("colorBlockMoney").style.backgroundColor = window.colorPreferences.money;
};

/** 
 * Called when user clicks a color block in the legend.
 * We'll open the hidden #colorPickerInput, let them select, 
 * and on "change", update colorPreferences & refresh the graph.
 */
window.onColorBlockClick = function(questionType) {
  const input = document.getElementById("colorPickerInput");
  // Ensure it’s visible enough to let user pick
  input.style.visibility = "visible";

  // Set current color
  input.value = window.colorPreferences[questionType] || "#ADD8E6";

  // We'll define a cleanup function
  const cleanup = () => {
    // Hide again
    input.style.visibility = "hidden";
    input.removeEventListener("change", onChange);
    input.removeEventListener("input", onInput);
  };

  const onChange = async (e) => {
    window.colorPreferences[questionType] = e.target.value;
    await saveColorPreferencesToFirestore(); // from firebase.js
    updateLegendBlocks();
    if (window.refreshAllCells) window.refreshAllCells();
    cleanup();
  };

  // If you want real-time as they drag the slider, use "input" 
  const onInput = async (e) => {
    window.colorPreferences[questionType] = e.target.value;
    await saveColorPreferencesToFirestore();
    updateLegendBlocks();
    if (window.refreshAllCells) window.refreshAllCells();
  };

  input.addEventListener("change", onChange);
  input.addEventListener("input", onInput);

  // Now actually open the color picker
  input.click();
};

// We attach the event listeners in a function
window.initColorLegend = function() {
  // For each color block, on click => onColorBlockClick
  document.getElementById("colorBlockText")
    .addEventListener("click", ()=>onColorBlockClick("text"));
  document.getElementById("colorBlockCheckbox")
    .addEventListener("click", ()=>onColorBlockClick("checkbox"));
  document.getElementById("colorBlockDropdown")
    .addEventListener("click", ()=>onColorBlockClick("dropdown"));
  document.getElementById("colorBlockMoney")
    .addEventListener("click", ()=>onColorBlockClick("money"));

  // Refresh squares from colorPreferences
  updateLegendBlocks();
};
