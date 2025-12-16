// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDS-tSSn7fdLBgwzfHQ_1MPG1w8S_4qb04",
  authDomain: "formwiz-3f4fd.firebaseapp.com",
  projectId: "formwiz-3f4fd",
  storageBucket: "formwiz-3f4fd.firebasestorage.app",
  messagingSenderId: "404259212529",
  appId: "1:404259212529:web:15a33bce82383b21cfed50",
  measurementId: "G-P07YEN0HPD"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const ticketForm = document.getElementById('ticket-form');
const ticketTitle = document.getElementById('ticket-title');
const ticketDescription = document.getElementById('ticket-description');
const ticketPriority = document.getElementById('ticket-priority');
const ticketDifficulty = document.getElementById('ticket-difficulty');
const difficultyValue = document.getElementById('difficulty-value');
const ticketCategory = document.getElementById('ticket-category');
const formError = document.getElementById('form-error');
const formSuccess = document.getElementById('form-success');
const ticketsContainer = document.getElementById('tickets-container');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const categoryList = document.getElementById('category-list');
const newCategoryInput = document.getElementById('new-category-input');
const addCategoryBtn = document.getElementById('add-category-btn');
const settingsError = document.getElementById('settings-error');
const stickyHeaderCheckbox = document.getElementById('sticky-header-checkbox');
const header = document.querySelector('.header');

let currentUser = null;
let categories = [];
let userPreferences = { stickyHeader: true }; // Default to sticky enabled

// Update difficulty value display
ticketDifficulty.addEventListener('input', (e) => {
  difficultyValue.textContent = e.target.value;
});

// Sign-in Modal Elements
const signinModal = document.getElementById('signin-modal');
const signinForm = document.getElementById('signin-form');
const signinEmail = document.getElementById('signin-email');
const signinPassword = document.getElementById('signin-password');
const signinError = document.getElementById('signin-error');
const signinSubmitBtn = document.getElementById('signin-submit-btn');
const signinSignupBtn = document.getElementById('signin-signup-btn');

// Show sign-in modal
function showSignInModal() {
  signinModal.classList.add('show');
  document.body.classList.add('modal-open');
  signinEmail.focus();
}

// Hide sign-in modal
function hideSignInModal() {
  signinModal.classList.remove('show');
  document.body.classList.remove('modal-open');
  signinError.textContent = '';
  signinForm.reset();
}

// Handle sign-in form submission
signinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  signinError.textContent = '';
  signinSubmitBtn.disabled = true;
  signinSubmitBtn.textContent = 'Signing in...';
  
  const email = signinEmail.value.trim();
  const password = signinPassword.value.trim();
  
  if (!email || !password) {
    signinError.textContent = 'Please enter both email and password.';
    signinSubmitBtn.disabled = false;
    signinSubmitBtn.textContent = 'Sign In';
    return;
  }
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
    // Modal will be hidden automatically when auth state changes
  } catch (error) {
    console.error('Sign-in error:', error);
    let errorMessage = 'Sign-in failed. ';
    if (error.code === 'auth/user-not-found') {
      errorMessage += 'No account found with this email.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage += 'Incorrect password.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage += 'Invalid email address.';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage += 'This account has been disabled.';
    } else {
      errorMessage += error.message || 'Please try again.';
    }
    signinError.textContent = errorMessage;
    signinSubmitBtn.disabled = false;
    signinSubmitBtn.textContent = 'Sign In';
  }
});

// Handle sign-up button
signinSignupBtn.addEventListener('click', async () => {
  const email = signinEmail.value.trim();
  const password = signinPassword.value.trim();
  
  if (!email || !password) {
    signinError.textContent = 'Please enter both email and password to sign up.';
    return;
  }
  
  if (password.length < 6) {
    signinError.textContent = 'Password must be at least 6 characters long.';
    return;
  }
  
  signinError.textContent = '';
  signinSignupBtn.disabled = true;
  signinSignupBtn.textContent = 'Signing up...';
  
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    // User will be automatically signed in after sign-up
  } catch (error) {
    console.error('Sign-up error:', error);
    let errorMessage = 'Sign-up failed. ';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage += 'An account with this email already exists. Please sign in instead.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage += 'Invalid email address.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage += 'Password is too weak. Please use a stronger password.';
    } else {
      errorMessage += error.message || 'Please try again.';
    }
    signinError.textContent = errorMessage;
    signinSignupBtn.disabled = false;
    signinSignupBtn.textContent = 'Sign Up';
  }
});

// Load user preferences from Firebase
async function loadUserPreferences() {
  try {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      if (data.preferences) {
        userPreferences = { ...userPreferences, ...data.preferences };
      }
    }
    applyUserPreferences();
  } catch (error) {
    console.error('Error loading user preferences:', error);
    applyUserPreferences(); // Apply defaults if loading fails
  }
}

// Save user preferences to Firebase
async function saveUserPreferences() {
  try {
    await db.collection('users').doc(currentUser.uid).set({
      preferences: userPreferences
    }, { merge: true });
    console.log('User preferences saved');
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}

// Apply user preferences to the UI
function applyUserPreferences() {
  // Apply sticky header preference
  if (header && stickyHeaderCheckbox) {
    if (userPreferences.stickyHeader) {
      header.classList.add('sticky');
      stickyHeaderCheckbox.checked = true;
    } else {
      header.classList.remove('sticky');
      stickyHeaderCheckbox.checked = false;
    }
  }
}

// Handle sticky header checkbox change
if (stickyHeaderCheckbox) {
  stickyHeaderCheckbox.addEventListener('change', async (e) => {
    userPreferences.stickyHeader = e.target.checked;
    applyUserPreferences();
    await saveUserPreferences();
  });
}

// Check authentication status
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    console.log('User authenticated:', user.uid);
    hideSignInModal();
    
    // Debug: Check what collections exist
    try {
      // Try to list collections (this might not work in client SDK, but worth trying)
      console.log('Checking for tickets and categories...');
    } catch (e) {
      console.log('Cannot list collections from client (this is normal)');
    }
    
    await loadUserPreferences();
    await loadCategories();
    await loadTickets();
  } else {
    // Show sign-in modal instead of redirecting
    console.log('User not authenticated, showing sign-in modal');
    showSignInModal();
  }
});

// Load categories from Firebase
async function loadCategories() {
  try {
    console.log('Loading categories for user:', currentUser.uid);
    categories = [];
    
    // Try different collection paths in order of preference
    const collectionPaths = [
      // Global collections (most likely based on your Firebase structure)
      { ref: db.collection('categories'), name: 'categories (global)' },
      { ref: db.collection('ticketCategories'), name: 'ticketCategories (global)' },
      // User-specific collections
      { ref: db.collection('users').doc(currentUser.uid).collection('ticketCategories'), name: 'users/{userId}/ticketCategories' },
      { ref: db.collection('users').doc(currentUser.uid).collection('categories'), name: 'users/{userId}/categories' }
    ];
    
    let snapshot = null;
    let foundPath = null;
    
    for (const pathInfo of collectionPaths) {
      try {
        console.log(`Trying to load from: ${pathInfo.name}`);
        snapshot = await pathInfo.ref.get();
        if (!snapshot.empty) {
          foundPath = pathInfo.name;
          console.log(`✓ Found categories in: ${pathInfo.name}`);
          break;
        }
      } catch (err) {
        console.warn(`✗ Permission error accessing ${pathInfo.name}:`, err.message);
        // Continue to next path
        continue;
      }
    }
    
    if (!snapshot || snapshot.empty) {
      console.log('No categories found in any collection');
      categories = [];
    } else {
      console.log(`Found ${snapshot.size} categories in ${foundPath}`);
      snapshot.forEach(doc => {
        const data = doc.data();
        categories.push({
          id: doc.id,
          name: data.name || data.categoryName || 'Unnamed Category',
          order: data.order !== undefined ? data.order : 999
        });
      });
    }
    
    console.log('Loaded categories:', categories);
    updateCategoryDropdown();
    updateCategoryList();
  } catch (error) {
    console.error('Error loading categories:', error);
    const errorMsg = error.code === 'permission-denied' 
      ? 'Permission denied. Please check Firestore security rules or contact an administrator.'
      : 'Error loading categories: ' + error.message;
    formError.textContent = errorMsg;
    
    // Show a helpful message about permissions
    if (error.code === 'permission-denied') {
      console.error('PERMISSION ERROR: Your Firestore security rules need to allow read access to the categories collection.');
      console.error('Example rule needed:');
      console.error('match /categories/{document=**} { allow read: if request.auth != null; }');
    }
  }
}

// Update category dropdown
function updateCategoryDropdown() {
  ticketCategory.innerHTML = '<option value="">Choose your category</option>';
  
  // Sort categories by order
  const sortedCategories = [...categories].sort((a, b) => {
    const aOrder = a.order !== undefined ? a.order : 999;
    const bOrder = b.order !== undefined ? b.order : 999;
    return aOrder - bOrder;
  });
  
  sortedCategories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    ticketCategory.appendChild(option);
  });
}

// Update category list in settings modal
function updateCategoryList() {
  if (categories.length === 0) {
    categoryList.innerHTML = '<div class="empty-state"><p>No categories yet. Add your first category below.</p></div>';
    return;
  }
  
  // Sort categories by order
  const sortedCategories = [...categories].sort((a, b) => {
    const aOrder = a.order !== undefined ? a.order : 999;
    const bOrder = b.order !== undefined ? b.order : 999;
    return aOrder - bOrder;
  });
  
  categoryList.innerHTML = '';
  sortedCategories.forEach((category, index) => {
    const categoryItem = document.createElement('div');
    categoryItem.className = 'category-item';
    categoryItem.draggable = true;
    categoryItem.dataset.categoryId = category.id;
    categoryItem.dataset.order = category.order !== undefined ? category.order : index;
    categoryItem.innerHTML = `
      <span class="category-drag-handle">☰</span>
      <span class="category-name">${escapeHtml(category.name)}</span>
      <button type="button" class="btn btn-small btn-danger" data-category-id="${category.id}">Delete</button>
    `;
    
    const deleteBtn = categoryItem.querySelector('button');
    deleteBtn.addEventListener('click', () => deleteCategory(category.id));
    
    // Drag and drop event listeners
    categoryItem.addEventListener('dragstart', handleDragStart);
    categoryItem.addEventListener('dragover', handleDragOver);
    categoryItem.addEventListener('drop', handleDrop);
    categoryItem.addEventListener('dragend', handleDragEnd);
    
    categoryList.appendChild(categoryItem);
  });
}

// Drag and drop handlers
let draggedElement = null;

function handleDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  
  const afterElement = getDragAfterElement(categoryList, e.clientY);
  const dragging = document.querySelector('.dragging');
  
  if (afterElement == null) {
    categoryList.appendChild(dragging);
  } else {
    categoryList.insertBefore(dragging, afterElement);
  }
  
  return false;
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  
  // Update order in Firebase
  updateCategoryOrder();
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.category-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Update category order in Firebase
async function updateCategoryOrder() {
  const categoryItems = categoryList.querySelectorAll('.category-item');
  const updates = [];
  
  categoryItems.forEach((item, index) => {
    const categoryId = item.dataset.categoryId;
    const newOrder = index;
    
    // Find the category in our array
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
      category.order = newOrder;
      updates.push({ id: categoryId, order: newOrder });
    }
  });
  
  // Update in Firebase - try different collection paths
  const collectionPaths = [
    db.collection('categories'),
    db.collection('ticketCategories'),
    db.collection('users').doc(currentUser.uid).collection('ticketCategories')
  ];
  
  // Try to update in each collection (some may not exist, that's okay)
  for (const update of updates) {
    for (const collectionRef of collectionPaths) {
      try {
        const docRef = collectionRef.doc(update.id);
        await docRef.update({ order: update.order });
        console.log(`Updated category ${update.id} order to ${update.order}`);
        break; // Successfully updated, move to next update
      } catch (err) {
        // Document might not exist in this collection, try next
        if (err.code === 'not-found') {
          continue;
        }
        // Other errors, log and continue
        console.warn(`Error updating ${update.id} in collection:`, err.message);
        continue;
      }
    }
  }
  
  // Update dropdown to reflect new order
  updateCategoryDropdown();
}

// Add category
addCategoryBtn.addEventListener('click', async () => {
  const categoryName = newCategoryInput.value.trim();
  
  if (!categoryName) {
    settingsError.textContent = 'Please enter a category name.';
    return;
  }
  
  // Check if category already exists
  if (categories.some(cat => cat.name.toLowerCase() === categoryName.toLowerCase())) {
    settingsError.textContent = 'This category already exists.';
    return;
  }
  
  try {
    settingsError.textContent = '';
    const userCategoriesRef = db.collection('users').doc(currentUser.uid)
      .collection('ticketCategories');
    
    // Get the next order value (highest order + 1, or 0 if no categories)
    const maxOrder = categories.length > 0 
      ? Math.max(...categories.map(cat => cat.order !== undefined ? cat.order : 0))
      : -1;
    const newOrder = maxOrder + 1;
    
    const docRef = await userCategoriesRef.add({
      name: categoryName,
      order: newOrder,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    categories.push({
      id: docRef.id,
      name: categoryName,
      order: newOrder
    });
    
    newCategoryInput.value = '';
    updateCategoryDropdown();
    updateCategoryList();
  } catch (error) {
    console.error('Error adding category:', error);
    settingsError.textContent = 'Error adding category. Please try again.';
  }
});

// Delete category
async function deleteCategory(categoryId) {
  if (!confirm('Are you sure you want to delete this category? Tickets with this category will keep their category ID but the category name will be unavailable.')) {
    return;
  }
  
  try {
    await db.collection('users').doc(currentUser.uid)
      .collection('ticketCategories')
      .doc(categoryId)
      .delete();
    
    categories = categories.filter(cat => cat.id !== categoryId);
    updateCategoryDropdown();
    updateCategoryList();
  } catch (error) {
    console.error('Error deleting category:', error);
    settingsError.textContent = 'Error deleting category. Please try again.';
  }
}

// Submit ticket form
ticketForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';
  formSuccess.textContent = '';
  
  const title = ticketTitle.value.trim();
  const description = ticketDescription.value.trim();
  const priority = ticketPriority.value;
  const difficulty = parseInt(ticketDifficulty.value);
  const categoryId = ticketCategory.value;
  
  if (!title || !priority || !difficulty) {
    formError.textContent = 'Please fill in all required fields.';
    return;
  }
  
  try {
    const ticketsRef = db.collection('users').doc(currentUser.uid)
      .collection('tickets');
    
    const ticketData = {
      title,
      description,
      priority,
      difficulty,
      categoryId: categoryId || null,
      status: 'open',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await ticketsRef.add(ticketData);
    
    // Reset form
    ticketForm.reset();
    difficultyValue.textContent = '5';
    ticketDifficulty.value = 5;
    
    formSuccess.textContent = 'Ticket submitted successfully!';
    setTimeout(() => {
      formSuccess.textContent = '';
    }, 3000);
    
    // Reload tickets
    await loadTickets();
  } catch (error) {
    console.error('Error submitting ticket:', error);
    formError.textContent = 'Error submitting ticket. Please try again.';
  }
});

// Load tickets from Firebase
async function loadTickets() {
  try {
    console.log('Loading tickets for user:', currentUser.uid);
    
    const ticketsArray = [];
    let foundAny = false;

    // Helper to load from a ref and push into array
    async function loadFromRef(ref, name) {
      try {
        console.log(`Trying to load from: ${name}`);
        let snap;
        try {
          snap = await ref.orderBy('createdAt', 'desc').get();
        } catch (orderByError) {
          console.warn('orderBy failed, trying without orderBy:', orderByError.message);
          snap = await ref.get();
        }
        if (!snap.empty) {
          console.log(`✓ Found ${snap.size} tickets in: ${name}`);
          snap.forEach(doc => {
            ticketsArray.push({ id: doc.id, ...doc.data() });
          });
          foundAny = true;
        }
      } catch (err) {
        console.warn(`✗ Error accessing ${name}:`, err.message);
      }
    }

    // Load user-specific first, then global, then merge
    const userRef = db.collection('users').doc(currentUser.uid).collection('tickets');
    const globalRef = db.collection('tickets');
    await loadFromRef(userRef, 'users/{userId}/tickets');
    await loadFromRef(globalRef, 'tickets (global)');

    if (!foundAny || ticketsArray.length === 0) {
      console.log('No tickets found in any collection');
      ticketsContainer.innerHTML = '<div class="empty-state"><p>No tickets submitted yet.</p></div>';
      return;
    }

    // Deduplicate by id (if any overlap)
    const unique = {};
    ticketsArray.forEach(t => { unique[t.id] = t; });
    const dedupedTickets = Object.values(unique);

    // Sort by priority first (high > medium > low), then by difficulty (easiest first)
    dedupedTickets.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      const aDifficulty = a.difficulty || 10;
      const bDifficulty = b.difficulty || 10;
      return aDifficulty - bDifficulty;
    });

    ticketsContainer.innerHTML = '';
    dedupedTickets.forEach(ticketData => {
      const ticketItem = createTicketElement(ticketData.id, ticketData);
      ticketsContainer.appendChild(ticketItem);
    });
  } catch (error) {
    console.error('Error loading tickets:', error);
    const errorMsg = error.code === 'permission-denied'
      ? 'Permission denied. Please check Firestore security rules or contact an administrator.'
      : 'Error loading tickets: ' + error.message;
    ticketsContainer.innerHTML = '<div class="empty-state"><p>' + errorMsg + '</p></div>';
    
    if (error.code === 'permission-denied') {
      console.error('PERMISSION ERROR: Your Firestore security rules need to allow read access to the tickets collection.');
      console.error('Example rule needed:');
      console.error('match /tickets/{document=**} { allow read: if request.auth != null; }');
    }
  }
}

// Create ticket element
function createTicketElement(ticketId, ticket) {
  const ticketItem = document.createElement('div');
  ticketItem.className = 'ticket-item';
  
  const categoryName = ticket.categoryId 
    ? categories.find(cat => cat.id === ticket.categoryId)?.name || 'Unknown Category'
    : null;
  
  const priorityClass = `priority-${ticket.priority}`;
  
  ticketItem.innerHTML = `
    <div class="ticket-header">
      <div class="ticket-title">${escapeHtml(ticket.title)}</div>
      <button type="button" class="ticket-delete-btn" data-ticket-id="${ticketId}" title="Delete ticket">×</button>
    </div>
    ${ticket.description ? `<div class="ticket-description">${escapeHtml(ticket.description)}</div>` : ''}
    <div class="ticket-meta">
      <span class="ticket-badge ${priorityClass}">Priority: ${ticket.priority.toUpperCase()}</span>
      <span class="ticket-badge difficulty-badge">Difficulty: ${ticket.difficulty}/10</span>
      ${categoryName ? `<span class="ticket-badge category-badge">${escapeHtml(categoryName)}</span>` : ''}
    </div>
  `;
  
  // Add delete button event listener
  const deleteBtn = ticketItem.querySelector('.ticket-delete-btn');
  deleteBtn.addEventListener('click', () => deleteTicket(ticketId));
  
  return ticketItem;
}

// Delete ticket
async function deleteTicket(ticketId) {
  if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
    return;
  }
  
  try {
    // Delete in both user-specific and global collections (whichever exist)
    const userDocRef = db.collection('users').doc(currentUser.uid).collection('tickets').doc(ticketId);
    const globalDocRef = db.collection('tickets').doc(ticketId);

    let deleted = false;

    // Try user-specific
    try {
      const userDoc = await userDocRef.get();
      if (userDoc.exists) {
        await userDocRef.delete();
        console.log('✓ Deleted ticket from: users/{userId}/tickets');
        deleted = true;
      }
    } catch (err) {
      console.warn('Error deleting from users/{userId}/tickets:', err.message);
    }

    // Try global
    try {
      const globalDoc = await globalDocRef.get();
      if (globalDoc.exists) {
        await globalDocRef.delete();
        console.log('✓ Deleted ticket from: tickets (global)');
        deleted = true;
      }
    } catch (err) {
      console.warn('Error deleting from tickets (global):', err.message);
    }

    if (!deleted) {
      throw new Error('Could not find ticket to delete in user or global collections.');
    }
    
    // Reload tickets to update the list
    await loadTickets();
  } catch (error) {
    console.error('Error deleting ticket:', error);
    alert('Error deleting ticket: ' + error.message);
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Settings modal controls
settingsBtn.addEventListener('click', () => {
  settingsModal.classList.add('active');
});

closeSettingsBtn.addEventListener('click', () => {
  settingsModal.classList.remove('active');
  settingsError.textContent = '';
});

// Close modal when clicking outside
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.remove('active');
    settingsError.textContent = '';
  }
});

// Allow Enter key to add category
newCategoryInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addCategoryBtn.click();
  }
});
