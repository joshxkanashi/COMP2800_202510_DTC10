// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Import Supabase client
  import('./supabaseAPI.js')
    .then(module => {
      const supabase = module.supabase;
      initializePortfolio(supabase);
    })
    .catch(error => {
      console.error('Error importing Supabase:', error);
      // Initialize without Supabase for fallback
      initializePortfolio(null);
    });

  function initializePortfolio(supabase) {
    // Global variables
    let isEditMode = false;
    let originalData = {};
    let portfolioData = {};
    
    // DOM Elements
    const editProfileButton = document.getElementById('editProfileButton');
    const saveProfileButton = document.getElementById('saveProfileButton');
    const cancelEditButton = document.getElementById('cancelEditButton');
    const editControls = document.querySelector('.edit-controls');
    const savingIndicator = document.getElementById('savingIndicator');
    const editableElements = document.querySelectorAll('.editable-content');
    const addEducationButton = document.getElementById('addEducationButton');
    const addExperienceButton = document.getElementById('addExperienceButton');
    const addSkill1Button = document.getElementById('addSkill1Button');
    const addSkill2Button = document.getElementById('addSkill2Button');
    
    // Initialize portfolio data from Supabase if available
    async function initializePortfolioData() {
      if (!supabase) return;
      
      // Show loading indicator
      showSavingIndicator('Loading profile...');
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('portfolios')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
          if (error && error.code !== 'PGRST116') {
            console.error('Error loading portfolio:', error);
          }
          
          if (data) {
            portfolioData = data.portfolio_data || {};
            renderPortfolioData();
          } else {
            // Create new portfolio record if none exists
            portfolioData = gatherPortfolioData();
          }
        }
      } catch (error) {
        console.error('Error initializing portfolio:', error);
      } finally {
        // Hide loading indicator
        hideSavingIndicator();
      }
    }
    
    // Render portfolio data from Supabase
    function renderPortfolioData() {
      // Exit if no data
      if (!portfolioData || Object.keys(portfolioData).length === 0) return;
      
      // Update each editable element based on field
      editableElements.forEach(element => {
        const field = element.dataset.field;
        if (field && portfolioData[field]) {
          element.textContent = portfolioData[field];
        }
      });
      
      // Update skill progress bars
      const skillItems = document.querySelectorAll('.skill-item');
      skillItems.forEach(item => {
        const itemId = item.dataset.itemId;
        const progress = portfolioData[`${itemId}_progress`];
        if (progress) {
          const progressBar = item.querySelector('.skill-progress');
          progressBar.setAttribute('data-progress', progress);
          const progressBarFill = item.querySelector('.skill-progress-bar');
          progressBarFill.style.width = `${progress}%`;
        }
      });
    }
    
    // Gather all current portfolio data
    function gatherPortfolioData() {
      const data = {};
      
      // Get all editable field values
      editableElements.forEach(element => {
        const field = element.dataset.field;
        if (field) {
          data[field] = element.textContent.trim();
        }
      });
      
      // Get all skill progress values
      const skillItems = document.querySelectorAll('.skill-item');
      skillItems.forEach(item => {
        const itemId = item.dataset.itemId;
        const progressBar = item.querySelector('.skill-progress');
        if (progressBar) {
          data[`${itemId}_progress`] = progressBar.getAttribute('data-progress');
        }
      });
      
      // Get all project tech tags
      const techContainers = document.querySelectorAll('.portfolio-project-tech');
      techContainers.forEach(container => {
        const projectId = container.dataset.project;
        const tags = container.querySelectorAll('.tech-tag');
        
        // Store tags as an array
        data[`${projectId}_tags`] = Array.from(tags).map(tag => {
          return tag.getAttribute('data-tag') || tag.textContent.trim();
        });
      });
      
      return data;
    }
    
    // Show saving indicator
    function showSavingIndicator(message = 'Saving changes...') {
      const messageElement = savingIndicator.querySelector('span');
      messageElement.textContent = message;
      savingIndicator.classList.add('show');
    }
    
    // Hide saving indicator
    function hideSavingIndicator() {
      savingIndicator.classList.remove('show');
    }
    
    // Enable edit mode
    function enableEditMode() {
      if (!isEditMode) {
        // Store original data for canceling
        originalData = JSON.parse(JSON.stringify(gatherPortfolioData()));
        
        // Update UI
        isEditMode = true;
        editProfileButton.classList.add('active');
        editControls.classList.add('active');
        document.body.classList.add('edit-mode');
        
        // Check if we're on mobile view
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          // Scroll to top for better visibility when starting edit mode on mobile
          window.scrollTo({top: 0, behavior: 'smooth'});
          
          // Show a mobile-friendly editing message
          showSavingIndicator('Editing mode activated. Tap text to edit.');
          setTimeout(hideSavingIndicator, 3000);
        }
        
        // Make elements editable
        editableElements.forEach(element => {
          element.setAttribute('contenteditable', 'true');
          element.setAttribute('spellcheck', 'true');
          
          // Add placeholder if empty
          if (element.textContent.trim() === '') {
            element.textContent = `Enter ${element.dataset.field}...`;
            element.classList.add('edit-placeholder');
          }
          
          // Handle focus to remove placeholder
          element.addEventListener('focus', handleElementFocus);
          
          // Handle blur to restore placeholder if empty
          element.addEventListener('blur', handleElementBlur);
          
          // For mobile: ensure element is visible when tapped
          element.addEventListener('click', ensureEditableElementVisible);
        });
        
        // Show add buttons
        addEducationButton.style.display = 'flex';
        addExperienceButton.style.display = 'flex';
        addSkill1Button.style.display = 'flex';
        addSkill2Button.style.display = 'flex';
        
        // Show add project button
        const addProjectButton = document.getElementById('addProjectButton');
        if (addProjectButton) {
          addProjectButton.style.display = 'flex';
        }
        
        // Add delete buttons to timeline and skill items
        addDeleteButtons();
        
        // Add progress editors to skill items
        addProgressEditors();
        
        // Make project tech tags editable
        makeTagsEditable();
        
        // Add project action buttons
        addProjectActionButtons();
      }
    }
    
    // Make sure edited element is properly visible on screen, especially on mobile
    function ensureEditableElementVisible(e) {
      // Only needed on mobile views
      if (window.innerWidth >= 768) return;
      
      const element = e.target;
      
      // Wait a bit for the mobile keyboard to appear
      setTimeout(() => {
        // Get element position
        const rect = element.getBoundingClientRect();
        
        // If element is not fully visible in viewport, scroll to it
        if (rect.bottom > window.innerHeight || rect.top < 0) {
          // Calculate position to scroll to (with some padding)
          const scrollTarget = window.pageYOffset + rect.top - 80;
          
          // Smooth scroll to element
          window.scrollTo({
            top: scrollTarget,
            behavior: 'smooth'
          });
        }
      }, 300);
    }
    
    // Disable edit mode
    function disableEditMode() {
      if (isEditMode) {
        // Update UI
        isEditMode = false;
        editProfileButton.classList.remove('active');
        editControls.classList.remove('active');
        document.body.classList.remove('edit-mode');
        
        // Make elements non-editable
        editableElements.forEach(element => {
          element.removeAttribute('contenteditable');
          element.removeAttribute('spellcheck');
          element.classList.remove('edit-placeholder');
          
          // Remove event listeners
          element.removeEventListener('focus', handleElementFocus);
          element.removeEventListener('blur', handleElementBlur);
          element.removeEventListener('click', ensureEditableElementVisible);
        });
        
        // Hide add buttons
        addEducationButton.style.display = 'none';
        addExperienceButton.style.display = 'none';
        addSkill1Button.style.display = 'none';
        addSkill2Button.style.display = 'none';
        
        // Hide add project button
        const addProjectButton = document.getElementById('addProjectButton');
        if (addProjectButton) {
          addProjectButton.style.display = 'none';
        }
        
        // Remove delete buttons
        removeDeleteButtons();
        
        // Remove progress editors
        removeProgressEditors();
        
        // Remove tag editing
        removeTagEditing();
        
        // Remove project action buttons
        removeProjectActionButtons();
      }
    }
    
    // Reset to original data
    function resetToOriginalData() {
      if (Object.keys(originalData).length > 0) {
        // Restore editable content
        editableElements.forEach(element => {
          const field = element.dataset.field;
          if (field && originalData[field]) {
            element.textContent = originalData[field];
            element.classList.remove('edit-placeholder');
          }
        });
        
        // Restore skill progress bars
        const skillItems = document.querySelectorAll('.skill-item');
        skillItems.forEach(item => {
          const itemId = item.dataset.itemId;
          const progress = originalData[`${itemId}_progress`];
          if (progress) {
            const progressBar = item.querySelector('.skill-progress');
            progressBar.setAttribute('data-progress', progress);
            const progressBarFill = item.querySelector('.skill-progress-bar');
            progressBarFill.style.width = `${progress}%`;
          }
        });
        
        // TODO: Handle deletion/addition of items when that's implemented
      }
    }
    
    // Handle element focus
    function handleElementFocus(e) {
      const element = e.target;
      if (element.classList.contains('edit-placeholder')) {
        element.textContent = '';
        element.classList.remove('edit-placeholder');
      }
    }
    
    // Handle element blur
    function handleElementBlur(e) {
      const element = e.target;
      if (element.textContent.trim() === '') {
        element.textContent = `Enter ${element.dataset.field}...`;
        element.classList.add('edit-placeholder');
      }
    }
    
    // Add delete buttons to timeline and skill items
    function addDeleteButtons() {
      const timelineItems = document.querySelectorAll('.timeline-item');
      const skillItems = document.querySelectorAll('.skill-item');
      
      // Add delete buttons to timeline items
      timelineItems.forEach(item => {
        // Skip if already has delete button
        if (item.querySelector('.delete-item-button')) return;
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-item-button';
        deleteButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        deleteButton.setAttribute('type', 'button');
        deleteButton.setAttribute('aria-label', 'Delete item');
        
        // Add click handler for delete
        deleteButton.addEventListener('click', function() {
          if (confirm('Are you sure you want to delete this item?')) {
            item.remove();
          }
        });
        
        item.prepend(deleteButton);
      });
      
      // Add delete buttons to skill items
      skillItems.forEach(item => {
        // Skip if already has delete button
        if (item.querySelector('.delete-item-button')) return;
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-item-button';
        deleteButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        deleteButton.setAttribute('type', 'button');
        deleteButton.setAttribute('aria-label', 'Delete item');
        
        // Add click handler for delete
        deleteButton.addEventListener('click', function() {
          if (confirm('Are you sure you want to delete this skill?')) {
            item.remove();
          }
        });
        
        item.appendChild(deleteButton);
      });
    }
    
    // Remove delete buttons
    function removeDeleteButtons() {
      const deleteButtons = document.querySelectorAll('.delete-item-button');
      deleteButtons.forEach(button => button.remove());
    }
    
    // Add progress editors to skill items
    function addProgressEditors() {
      const skillItems = document.querySelectorAll('.skill-item');
      
      skillItems.forEach(item => {
        // Skip if already has progress editor
        if (item.querySelector('.progress-editor')) return;
        
        const progressBar = item.querySelector('.skill-progress');
        const currentProgress = progressBar.getAttribute('data-progress');
        
        const editor = document.createElement('div');
        editor.className = 'progress-editor';
        editor.innerHTML = `
          <input type="number" min="0" max="100" value="${currentProgress}" aria-label="Skill progress percentage">
          <button type="button">Set</button>
        `;
        
        // Add click handler for progress update
        editor.querySelector('button').addEventListener('click', function() {
          const input = editor.querySelector('input');
          const newProgress = Math.min(100, Math.max(0, parseInt(input.value) || 0));
          
          progressBar.setAttribute('data-progress', newProgress);
          const progressBarFill = item.querySelector('.skill-progress-bar');
          progressBarFill.style.width = `${newProgress}%`;
        });
        
        item.appendChild(editor);
      });
    }
    
    // Remove progress editors
    function removeProgressEditors() {
      const progressEditors = document.querySelectorAll('.progress-editor');
      progressEditors.forEach(editor => editor.remove());
    }
    
    // Function to make tech tags editable
    function makeTagsEditable() {
      const techContainers = document.querySelectorAll('.portfolio-project-tech');
      
      techContainers.forEach(container => {
        const projectId = container.dataset.project;
        const tags = container.querySelectorAll('.tech-tag');
        
        // Add delete button to each tag
        tags.forEach(tag => {
          tag.classList.add('editable');
          
          const deleteBtn = document.createElement('span');
          deleteBtn.className = 'tech-tag-delete';
          deleteBtn.innerHTML = '×';
          deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (confirm('Delete this tag?')) {
              tag.remove();
            }
          });
          
          tag.appendChild(deleteBtn);
        });
        
        // Add "Add Tag" button
        const addTagButton = document.createElement('button');
        addTagButton.className = 'add-tag-button';
        addTagButton.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Add Tag
        `;
        
        addTagButton.addEventListener('click', function() {
          // Hide add button temporarily
          addTagButton.style.display = 'none';
          
          // Create input for new tag
          const tagInputContainer = document.createElement('div');
          tagInputContainer.className = 'tag-input-container';
          tagInputContainer.innerHTML = `
            <input type="text" class="tag-input" placeholder="Tag name">
            <div class="tag-input-actions">
              <button class="tag-input-confirm">✓</button>
              <button class="tag-input-cancel">×</button>
            </div>
          `;
          
          container.insertBefore(tagInputContainer, addTagButton);
          const tagInput = tagInputContainer.querySelector('input');
          tagInput.focus();
          
          // Confirm button action
          tagInputContainer.querySelector('.tag-input-confirm').addEventListener('click', function() {
            const tagName = tagInput.value.trim();
            if (tagName) {
              // Create new tag
              const newTag = document.createElement('span');
              newTag.className = 'tech-tag editable';
              newTag.setAttribute('data-tag', tagName);
              newTag.textContent = tagName;
              
              // Add delete button to new tag
              const deleteBtn = document.createElement('span');
              deleteBtn.className = 'tech-tag-delete';
              deleteBtn.innerHTML = '×';
              deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm('Delete this tag?')) {
                  newTag.remove();
                }
              });
              
              newTag.appendChild(deleteBtn);
              
              // Insert new tag before the input container
              container.insertBefore(newTag, tagInputContainer);
            }
            
            // Remove input and show add button
            tagInputContainer.remove();
            addTagButton.style.display = 'inline-flex';
          });
          
          // Cancel button action
          tagInputContainer.querySelector('.tag-input-cancel').addEventListener('click', function() {
            tagInputContainer.remove();
            addTagButton.style.display = 'inline-flex';
          });
          
          // Handle Enter key
          tagInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
              tagInputContainer.querySelector('.tag-input-confirm').click();
            } else if (e.key === 'Escape') {
              tagInputContainer.querySelector('.tag-input-cancel').click();
            }
          });
        });
        
        container.appendChild(addTagButton);
      });
    }
    
    // Function to add project action buttons
    function addProjectActionButtons() {
      const projectCards = document.querySelectorAll('.portfolio-project-card');
      
      projectCards.forEach(card => {
        // Skip if already has project actions
        if (card.querySelector('.project-actions')) return;
        
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'project-actions';
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'project-delete-btn';
        deleteBtn.setAttribute('aria-label', 'Delete project');
        deleteBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        
        // Add click handler for delete project
        deleteBtn.addEventListener('click', function() {
          if (confirm('Are you sure you want to delete this project?')) {
            card.remove();
          }
        });
        
        actionsContainer.appendChild(deleteBtn);
        card.appendChild(actionsContainer);
      });
    }
    
    // Function to remove tag editing
    function removeTagEditing() {
      // Remove tag delete buttons
      const tagDeleteButtons = document.querySelectorAll('.tech-tag-delete');
      tagDeleteButtons.forEach(btn => btn.remove());
      
      // Remove editable class from tags
      const editableTags = document.querySelectorAll('.tech-tag.editable');
      editableTags.forEach(tag => tag.classList.remove('editable'));
      
      // Remove add tag buttons
      const addTagButtons = document.querySelectorAll('.add-tag-button');
      addTagButtons.forEach(btn => btn.remove());
      
      // Remove any active tag inputs
      const tagInputContainers = document.querySelectorAll('.tag-input-container');
      tagInputContainers.forEach(container => container.remove());
    }
    
    // Function to remove project action buttons
    function removeProjectActionButtons() {
      const projectActions = document.querySelectorAll('.project-actions');
      projectActions.forEach(actions => actions.remove());
    }
    
    // Event Listeners
    
    // Edit button click handler
    if (editProfileButton) {
      editProfileButton.addEventListener('click', function() {
        if (isEditMode) {
          disableEditMode();
        } else {
          enableEditMode();
        }
      });
    }
    
    // Save button click handler
    if (saveProfileButton) {
      saveProfileButton.addEventListener('click', async function() {
        // Gather all portfolio data
        portfolioData = gatherPortfolioData();
        
        // Show saving indicator
        showSavingIndicator();
        
        // Save to Supabase if available
        if (supabase) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
              const { data, error } = await supabase
                .from('portfolios')
                .upsert({
                  user_id: user.id,
                  portfolio_data: portfolioData,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'user_id'
                });
                
              if (error) {
                console.error('Error saving portfolio:', error);
                alert('Failed to save your profile. Please try again.');
              } else {
                console.log('Portfolio saved successfully!');
              }
            } else {
              alert('You must be logged in to save your profile.');
            }
          } catch (error) {
            console.error('Error saving portfolio:', error);
            alert('Failed to save your profile. Please try again.');
          } finally {
            hideSavingIndicator();
            disableEditMode();
          }
        } else {
          // For demo/development without Supabase
          console.log('Portfolio data saved to local variable:', portfolioData);
          
          // Simulate API delay
          setTimeout(() => {
            hideSavingIndicator();
            disableEditMode();
          }, 1000);
        }
      });
    }
    
    // Cancel button click handler
    if (cancelEditButton) {
      cancelEditButton.addEventListener('click', function() {
        resetToOriginalData();
        disableEditMode();
      });
    }
    
    // Add event listeners for add buttons
    if (addEducationButton) {
      addEducationButton.addEventListener('click', function() {
        addNewEducationItem();
      });
    }
    
    if (addExperienceButton) {
      addExperienceButton.addEventListener('click', function() {
        addNewExperienceItem();
      });
    }
    
    if (addSkill1Button) {
      addSkill1Button.addEventListener('click', function() {
        addNewSkillItem('skillsGrid1');
      });
    }
    
    if (addSkill2Button) {
      addSkill2Button.addEventListener('click', function() {
        addNewSkillItem('skillsGrid2');
      });
    }
    
    // Add new education item
    function addNewEducationItem() {
      const timelineContainer = document.getElementById('educationTimeline');
      const items = timelineContainer.querySelectorAll('.timeline-item');
      const newItemId = `edu${items.length + 1}`;
      
      const newItem = document.createElement('div');
      newItem.className = 'timeline-item new-item';
      newItem.dataset.itemId = newItemId;
      
      newItem.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-date editable-content" data-field="${newItemId}_date">Enter date...</div>
        <div class="timeline-content">
          <h3 class="timeline-title editable-content" data-field="${newItemId}_degree">Enter degree/certification...</h3>
          <p class="timeline-subtitle editable-content" data-field="${newItemId}_school">Enter school/institution...</p>
          <p class="timeline-description editable-content" data-field="${newItemId}_description">Enter description...</p>
        </div>
      `;
      
      timelineContainer.appendChild(newItem);
      
      // Add delete button to new item
      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-item-button';
      deleteButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      deleteButton.setAttribute('type', 'button');
      deleteButton.setAttribute('aria-label', 'Delete item');
      
      // Add click handler for delete
      deleteButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this item?')) {
          newItem.remove();
        }
      });
      
      newItem.prepend(deleteButton);
      
      // Make new elements editable
      const editableElements = newItem.querySelectorAll('.editable-content');
      editableElements.forEach(element => {
        element.setAttribute('contenteditable', 'true');
        element.setAttribute('spellcheck', 'true');
        
        // Add placeholder styles
        element.classList.add('edit-placeholder');
        
        // Handle focus to remove placeholder
        element.addEventListener('focus', handleElementFocus);
        
        // Handle blur to restore placeholder if empty
        element.addEventListener('blur', handleElementBlur);
      });
      
      // Focus the first editable element
      editableElements[0].focus();
    }
    
    // Add new experience item
    function addNewExperienceItem() {
      const timelineContainer = document.getElementById('experienceTimeline');
      const items = timelineContainer.querySelectorAll('.timeline-item');
      const newItemId = `exp${items.length + 1}`;
      
      const newItem = document.createElement('div');
      newItem.className = 'timeline-item new-item';
      newItem.dataset.itemId = newItemId;
      
      newItem.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-date editable-content" data-field="${newItemId}_date">Enter date...</div>
        <div class="timeline-content">
          <h3 class="timeline-title editable-content" data-field="${newItemId}_title">Enter job title...</h3>
          <p class="timeline-subtitle editable-content" data-field="${newItemId}_company">Enter company...</p>
          <p class="timeline-description editable-content" data-field="${newItemId}_description">Enter job description...</p>
        </div>
      `;
      
      timelineContainer.appendChild(newItem);
      
      // Add delete button to new item
      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-item-button';
      deleteButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      deleteButton.setAttribute('type', 'button');
      deleteButton.setAttribute('aria-label', 'Delete item');
      
      // Add click handler for delete
      deleteButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this item?')) {
          newItem.remove();
        }
      });
      
      newItem.prepend(deleteButton);
      
      // Make new elements editable
      const editableElements = newItem.querySelectorAll('.editable-content');
      editableElements.forEach(element => {
        element.setAttribute('contenteditable', 'true');
        element.setAttribute('spellcheck', 'true');
        
        // Add placeholder styles
        element.classList.add('edit-placeholder');
        
        // Handle focus to remove placeholder
        element.addEventListener('focus', handleElementFocus);
        
        // Handle blur to restore placeholder if empty
        element.addEventListener('blur', handleElementBlur);
      });
      
      // Focus the first editable element
      editableElements[0].focus();
    }
    
    // Add new skill item
    function addNewSkillItem(gridId) {
      const skillsGrid = document.getElementById(gridId);
      const items = skillsGrid.querySelectorAll('.skill-item');
      const allSkillItems = document.querySelectorAll('.skill-item');
      const newItemId = `skill${allSkillItems.length + 1}`;
      
      const newItem = document.createElement('div');
      newItem.className = 'skill-item new-item';
      newItem.dataset.itemId = newItemId;
      
      newItem.innerHTML = `
        <div class="skill-progress" data-progress="50">
          <div class="skill-progress-bar" style="width: 50%"></div>
        </div>
        <div class="skill-info">
          <span class="skill-name editable-content" data-field="${newItemId}_name">Enter skill name...</span>
          <span class="skill-level editable-content" data-field="${newItemId}_level">Intermediate</span>
        </div>
      `;
      
      skillsGrid.appendChild(newItem);
      
      // Add delete button to new item
      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-item-button';
      deleteButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      deleteButton.setAttribute('type', 'button');
      deleteButton.setAttribute('aria-label', 'Delete item');
      
      // Add click handler for delete
      deleteButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this skill?')) {
          newItem.remove();
        }
      });
      
      newItem.appendChild(deleteButton);
      
      // Add progress editor to new item
      const progressBar = newItem.querySelector('.skill-progress');
      
      const editor = document.createElement('div');
      editor.className = 'progress-editor';
      editor.innerHTML = `
        <input type="number" min="0" max="100" value="50" aria-label="Skill progress percentage">
        <button type="button">Set</button>
      `;
      
      // Add click handler for progress update
      editor.querySelector('button').addEventListener('click', function() {
        const input = editor.querySelector('input');
        const newProgress = Math.min(100, Math.max(0, parseInt(input.value) || 0));
        
        progressBar.setAttribute('data-progress', newProgress);
        const progressBarFill = newItem.querySelector('.skill-progress-bar');
        progressBarFill.style.width = `${newProgress}%`;
      });
      
      newItem.appendChild(editor);
      
      // Make new elements editable
      const editableElements = newItem.querySelectorAll('.editable-content');
      editableElements.forEach(element => {
        element.setAttribute('contenteditable', 'true');
        element.setAttribute('spellcheck', 'true');
        
        // Add placeholder styles
        element.classList.add('edit-placeholder');
        
        // Handle focus to remove placeholder
        element.addEventListener('focus', handleElementFocus);
        
        // Handle blur to restore placeholder if empty
        element.addEventListener('blur', handleElementBlur);
      });
      
      // Focus the first editable element
      editableElements[0].focus();
    }
    
    // Add new project functionality
    if (document.getElementById('addProjectButton')) {
      document.getElementById('addProjectButton').addEventListener('click', function() {
        addNewProject();
      });
    }
    
    // Function to add new project
    function addNewProject() {
      const projectsContainer = document.getElementById('projectsContainer');
      const projects = projectsContainer.querySelectorAll('.portfolio-project-card');
      const newItemId = `proj${projects.length + 1}`;
      
      // Create new project card
      const newProject = document.createElement('div');
      newProject.className = 'portfolio-project-card new-item';
      newProject.dataset.itemId = newItemId;
      
      // Determine random project icon
      const icons = [
        `<path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
        `<path d="M12 18.0001V14.0001M12 14.0001V10.0001M12 14.0001H16M12 14.0001H8M21 12.0001C21 16.9707 16.9706 21.0001 12 21.0001C7.02944 21.0001 3 16.9707 3 12.0001C3 7.02956 7.02944 3.00012 12 3.00012C16.9706 3.00012 21 7.02956 21 12.0001Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
        `<path d="M3 10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H13C16.7712 2 18.6569 2 19.8284 3.17157C21 4.34315 21 6.22876 21 10V14C21 17.7712 21 19.6569 19.8284 20.8284C18.6569 22 16.7712 22 13 22H11C7.22876 22 5.34315 22 4.17157 20.8284C3 19.6569 3 17.7712 3 14V10Z" stroke="currentColor" stroke-width="2"/><path d="M7 16.5H10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 12.5H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 8.5H12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14 16.5H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
      ];
      
      // Randomly select project badge type
      const badgeTypes = ['Web App', 'Mobile App', 'AI Project', 'Game', 'API', 'Plugin'];
      const randomBadge = badgeTypes[Math.floor(Math.random() * badgeTypes.length)];
      
      newProject.innerHTML = `
        <div class="portfolio-project-image">
          <span class="project-badge editable-content" data-field="${newItemId}_badge">${randomBadge}</span>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            ${icons[Math.floor(Math.random() * icons.length)]}
          </svg>
        </div>
        <div class="portfolio-project-content">
          <h3 class="portfolio-project-title editable-content" data-field="${newItemId}_title">New Project</h3>
          <p class="portfolio-project-description editable-content" data-field="${newItemId}_description">Enter project description here...</p>
          <div class="portfolio-project-tech" data-project="${newItemId}">
            <span class="tech-tag" data-tag="Tag1">Tag1</span>
          </div>
          <div class="portfolio-project-links">
            <a href="#" class="project-link editable-content" data-field="${newItemId}_link">View Project</a>
            <a href="#" class="project-link editable-content" data-field="${newItemId}_github">GitHub</a>
          </div>
        </div>
      `;
      
      projectsContainer.appendChild(newProject);
      
      // Make new elements editable
      const newEditableElements = newProject.querySelectorAll('.editable-content');
      newEditableElements.forEach(element => {
        element.setAttribute('contenteditable', 'true');
        element.setAttribute('spellcheck', 'true');
        
        // Add placeholder styles if needed
        if (element.textContent.trim() === 'New Project' || element.textContent.trim() === 'Enter project description here...') {
          element.classList.add('edit-placeholder');
        }
        
        // Handle focus to remove placeholder
        element.addEventListener('focus', handleElementFocus);
        
        // Handle blur to restore placeholder if empty
        element.addEventListener('blur', handleElementBlur);
      });
      
      // Add project action buttons
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'project-actions';
      
      // Create delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'project-delete-btn';
      deleteBtn.setAttribute('aria-label', 'Delete project');
      deleteBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      
      // Add click handler for delete project
      deleteBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this project?')) {
          newProject.remove();
        }
      });
      
      actionsContainer.appendChild(deleteBtn);
      newProject.appendChild(actionsContainer);
      
      // Make tags editable
      const techContainer = newProject.querySelector('.portfolio-project-tech');
      const tags = techContainer.querySelectorAll('.tech-tag');
      
      // Add delete button to each tag
      tags.forEach(tag => {
        tag.classList.add('editable');
        
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'tech-tag-delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (confirm('Delete this tag?')) {
            tag.remove();
          }
        });
        
        tag.appendChild(deleteBtn);
      });
      
      // Add "Add Tag" button
      const addTagButton = document.createElement('button');
      addTagButton.className = 'add-tag-button';
      addTagButton.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Add Tag
      `;
      
      addTagButton.addEventListener('click', createAddTagHandler(techContainer, addTagButton));
      techContainer.appendChild(addTagButton);
      
      // Focus the title for immediate editing
      newProject.querySelector('.portfolio-project-title').focus();
    }
    
    // Create a reusable handler for adding tags
    function createAddTagHandler(container, addTagButton) {
      return function() {
        // Hide add button temporarily
        addTagButton.style.display = 'none';
        
        // Create input for new tag
        const tagInputContainer = document.createElement('div');
        tagInputContainer.className = 'tag-input-container';
        tagInputContainer.innerHTML = `
          <input type="text" class="tag-input" placeholder="Tag name">
          <div class="tag-input-actions">
            <button class="tag-input-confirm">✓</button>
            <button class="tag-input-cancel">×</button>
          </div>
        `;
        
        container.insertBefore(tagInputContainer, addTagButton);
        const tagInput = tagInputContainer.querySelector('input');
        tagInput.focus();
        
        // Confirm button action
        tagInputContainer.querySelector('.tag-input-confirm').addEventListener('click', function() {
          const tagName = tagInput.value.trim();
          if (tagName) {
            // Create new tag
            const newTag = document.createElement('span');
            newTag.className = 'tech-tag editable';
            newTag.setAttribute('data-tag', tagName);
            newTag.textContent = tagName;
            
            // Add delete button to new tag
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'tech-tag-delete';
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              if (confirm('Delete this tag?')) {
                newTag.remove();
              }
            });
            
            newTag.appendChild(deleteBtn);
            
            // Insert new tag before the input container
            container.insertBefore(newTag, tagInputContainer);
          }
          
          // Remove input and show add button
          tagInputContainer.remove();
          addTagButton.style.display = 'inline-flex';
        });
        
        // Cancel button action
        tagInputContainer.querySelector('.tag-input-cancel').addEventListener('click', function() {
          tagInputContainer.remove();
          addTagButton.style.display = 'inline-flex';
        });
        
        // Handle Enter key
        tagInput.addEventListener('keyup', function(e) {
          if (e.key === 'Enter') {
            tagInputContainer.querySelector('.tag-input-confirm').click();
          } else if (e.key === 'Escape') {
            tagInputContainer.querySelector('.tag-input-cancel').click();
          }
        });
      };
    }
    
    // Initialize portfolio
    initializePortfolioData();
  }

  // Portfolio navigation smooth scrolling
  const portfolioNavLinks = document.querySelectorAll('.portfolio-nav-item');
  
  portfolioNavLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remove active class from all links
      portfolioNavLinks.forEach(item => item.classList.remove('active'));
      
      // Add active class to clicked link
      this.classList.add('active');
      
      // Get the target section id from the href attribute
      const targetId = this.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      
      // Smooth scroll to target section
      if (targetSection) {
        scrollToElement(targetSection);
      }
    });
  });
  
  // Handle skill tag clicks
  const skillTags = document.querySelectorAll('.skill-tag');
  
  skillTags.forEach(tag => {
    tag.addEventListener('click', function() {
      // Toggle active class
      this.classList.toggle('active');
    });
  });
  
  // Connect button smooth scrolling
  const connectButtons = document.querySelectorAll('.connect-button, a[href="#contact"]');
  
  connectButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        scrollToElement(contactSection);
      }
    });
  });
  
  // Handle form submission with improved validation
  const contactForm = document.querySelector('.contact-form');
  
  if (contactForm) {
    // Create feedback elements for form validation
    const createFeedbackElement = (inputId) => {
      const input = document.getElementById(inputId);
      const feedbackEl = document.createElement('div');
      feedbackEl.className = 'form-feedback';
      feedbackEl.setAttribute('aria-live', 'polite');
      input.parentNode.appendChild(feedbackEl);
      return feedbackEl;
    };
    
    // Create feedback elements for each required field
    const nameFeedback = createFeedbackElement('name');
    const emailFeedback = createFeedbackElement('email');
    const messageFeedback = createFeedbackElement('message');
    
    // Add input validation as user types
    const validateInput = (input, feedbackEl, validationFn) => {
      input.addEventListener('blur', function() {
        const isValid = validationFn(input.value);
        if (!isValid && input.value.trim() !== '') {
          feedbackEl.textContent = `Please enter a valid ${input.placeholder.toLowerCase()}`;
          feedbackEl.className = 'form-feedback error';
          input.setAttribute('aria-invalid', 'true');
        } else {
          feedbackEl.textContent = '';
          feedbackEl.className = 'form-feedback';
          input.removeAttribute('aria-invalid');
        }
      });
      
      // Clear error on input
      input.addEventListener('input', function() {
        feedbackEl.textContent = '';
        feedbackEl.className = 'form-feedback';
        input.removeAttribute('aria-invalid');
      });
    };
    
    // Validation functions
    const validateName = (name) => name.trim().length >= 2;
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validateMessage = (message) => message.trim().length >= 10;
    
    // Set up validation for each field
    validateInput(document.getElementById('name'), nameFeedback, validateName);
    validateInput(document.getElementById('email'), emailFeedback, validateEmail);
    validateInput(document.getElementById('message'), messageFeedback, validateMessage);
    
    // Handle form submission
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form values
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const subject = document.getElementById('subject').value;
      const message = document.getElementById('message').value;
      
      // Validate all fields
      let isValid = true;
      
      if (!validateName(name)) {
        nameFeedback.textContent = 'Please enter your name (min 2 characters)';
        nameFeedback.className = 'form-feedback error';
        document.getElementById('name').setAttribute('aria-invalid', 'true');
        isValid = false;
      }
      
      if (!validateEmail(email)) {
        emailFeedback.textContent = 'Please enter a valid email address';
        emailFeedback.className = 'form-feedback error';
        document.getElementById('email').setAttribute('aria-invalid', 'true');
        isValid = false;
      }
      
      if (!validateMessage(message)) {
        messageFeedback.textContent = 'Please enter a message (min 10 characters)';
        messageFeedback.className = 'form-feedback error';
        document.getElementById('message').setAttribute('aria-invalid', 'true');
        isValid = false;
      }
      
      if (isValid) {
        // Create success notification
        const successNotification = document.createElement('div');
        successNotification.className = 'form-notification success';
        successNotification.setAttribute('role', 'alert');
        successNotification.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 11.0857V12.0057C21.9988 14.1621 21.3005 16.2604 20.0093 17.9875C18.7182 19.7147 16.9033 20.9782 14.8354 21.5896C12.7674 22.201 10.5573 22.1276 8.53447 21.3803C6.51168 20.633 4.78465 19.2518 3.61096 17.4428C2.43727 15.6338 1.87979 13.4938 2.02168 11.342C2.16356 9.19029 2.99721 7.14205 4.39828 5.5028C5.79935 3.86354 7.69279 2.72111 9.79619 2.24587C11.8996 1.77063 14.1003 1.98806 16.07 2.86572" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M22 4L12 14.01L9 11.01" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Message sent successfully!</span>
        `;
        contactForm.appendChild(successNotification);
        
        // Reset form
        contactForm.reset();
        
        // Remove notification after 5 seconds
        setTimeout(() => {
          successNotification.classList.add('fade-out');
          setTimeout(() => {
            contactForm.removeChild(successNotification);
          }, 500);
        }, 5000);
        
        // In a real app, this would send data to the server
        console.log({
          name,
          email,
          subject,
          message
        });
      } else {
        // Scroll to the first error
        const firstError = document.querySelector('.form-feedback.error');
        if (firstError) {
          const inputWithError = firstError.previousElementSibling;
          inputWithError.focus();
          window.scrollTo({
            top: firstError.offsetTop - 100,
            behavior: 'smooth'
          });
        }
      }
    });
  }
  
  // Animate skill bars on scroll
  const animateSkillBars = () => {
    const skillBars = document.querySelectorAll('.skill-progress-bar');
    
    skillBars.forEach(bar => {
      const parent = bar.parentElement;
      const progress = parent.getAttribute('data-progress');
      
      if (isElementInViewport(parent)) {
        bar.style.width = progress + '%';
        bar.style.opacity = '1';
      }
    });
  };
  
  // Check if element is in viewport
  const isElementInViewport = (el) => {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };
  
  // Helper function for smooth scrolling
  function scrollToElement(element) {
    window.scrollTo({
      top: element.offsetTop - 100,
      behavior: 'smooth'
    });
  }
  
  // Run animation check on scroll
  window.addEventListener('scroll', animateSkillBars);
  
  // Run once on page load
  animateSkillBars();
  
  // Handle mobile navigation
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      if (item.getAttribute('aria-label').toLowerCase() === 'connect') {
        e.preventDefault();
        const contactSection = document.getElementById('contact');
        if (contactSection) {
          scrollToElement(contactSection);
        }
      }
      
      // Visual feedback
      navItems.forEach(navItem => navItem.classList.remove('active'));
      item.classList.add('active');
    });
  });
  
  // Enable intersection observer for scroll animations
  if ('IntersectionObserver' in window) {
    // Create observers for elements that should animate on scroll
    const fadeInElements = document.querySelectorAll('.portfolio-section');
    
    const fadeInObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-visible');
          fadeInObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    fadeInElements.forEach(element => {
      element.classList.add('fade-in');
      fadeInObserver.observe(element);
    });
  }
}); 