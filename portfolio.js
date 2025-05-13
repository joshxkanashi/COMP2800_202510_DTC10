import { supabase } from './supabaseAPI.js';

// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Import Supabase client
  import("./supabaseAPI.js")
    .then((module) => {
      const supabase = module.supabase;
      initializePortfolio(supabase);
    })
    .catch((error) => {
      console.error("Error importing Supabase:", error);
      // Initialize without Supabase for fallback
      initializePortfolio(null);
    });

  function initializePortfolio(supabase) {
    // Global variables
    let isEditMode = false;
    let originalData = {};
    let portfolioData = {};
    let selectedSectionTemplate = null;
    let currentEditingSection = null;
    let sectionOrder = [];

    // DOM Elements
    const editProfileButton = document.getElementById("editProfileButton");
    const saveProfileButton = document.getElementById("saveProfileButton");
    const cancelEditButton = document.getElementById("cancelEditButton");
    const editControls = document.querySelector(".edit-controls");
    const savingIndicator = document.getElementById("savingIndicator");
    const editableElements = document.querySelectorAll(".editable-content");
    const addEducationButton = document.getElementById("addEducationButton");
    const addExperienceButton = document.getElementById("addExperienceButton");
    const addSkill1Button = document.getElementById("addSkill1Button");
    const addSkill2Button = document.getElementById("addSkill2Button");

    // Ensure all editable elements are not contenteditable on page load
    editableElements.forEach((element) => {
      element.removeAttribute("contenteditable");
    });

    // Section Management Elements
    const addSectionButton = document.getElementById("addSectionButton");
    const addSectionModal = document.getElementById("addSectionModal");
    const reorderSectionsModal = document.getElementById("reorderSectionsModal");
    const sectionSettingsModal = document.getElementById("sectionSettingsModal");
    const modalBackdrop = document.getElementById("modalBackdrop");
    const sectionTemplates = document.querySelectorAll(".section-template");
    const confirmAddSectionButton = document.getElementById("confirmAddSection");
    const cancelAddSectionButton = document.getElementById("cancelAddSection");
    const customSectionForm = document.getElementById("customSectionForm");
    const backToTemplatesButton = document.getElementById("backToTemplates");
    const addCustomSectionButton = document.getElementById("addCustomSection");
    const modalCloseButtons = document.querySelectorAll(".section-modal-close");
    const sectionOrderList = document.getElementById("sectionOrderList");
    const saveSectionOrderButton = document.getElementById("saveSectionOrder");
    const cancelSectionReorderButton = document.getElementById("cancelSectionReorder");
    const sectionTitleInput = document.getElementById("sectionTitle");
    const sectionIconSelect = document.getElementById("sectionIcon");
    const saveSectionSettingsButton = document.getElementById("saveSectionSettings");
    const cancelSectionSettingsButton = document.getElementById("cancelSectionSettings");
    
    // Hide actions initially for better UX
    document.querySelectorAll(".section-actions").forEach(actions => {
      actions.style.opacity = "0";
    });
    
    // Initialize portfolio data
    initializePortfolioData().then(() => {
      // Initialize section management after portfolio data is loaded
      initializeSectionManagement();
      
      // Ensure edit mode is disabled initially
      disableEditMode();
    });
    
    // Setup smooth scrolling
    setupSmoothScrolling();
    
    // Function to setup smooth scrolling
    function setupSmoothScrolling() {
      // Portfolio navigation smooth scrolling
      const portfolioNavLinks = document.querySelectorAll(".portfolio-nav-item");

      portfolioNavLinks.forEach((link) => {
        link.addEventListener("click", function (e) {
          e.preventDefault();

          // Remove active class from all links
          portfolioNavLinks.forEach((item) => item.classList.remove("active"));

          // Add active class to clicked link
          this.classList.add("active");

          // Get the target section id from the href attribute
          const targetId = this.getAttribute("href");
          const targetSection = document.querySelector(targetId);

          // Smooth scroll to target section
          if (targetSection) {
            scrollToElement(targetSection);
          }
        });
      });

      // Connect button smooth scrolling
      const connectButtons = document.querySelectorAll(
        '.connect-button, a[href="#contact"]'
      );

      connectButtons.forEach((button) => {
        button.addEventListener("click", function (e) {
          e.preventDefault();
          const contactSection = document.getElementById("contact");
          if (contactSection) {
            scrollToElement(contactSection);
          }
        });
      });
    }

    // Load portfolio data from Supabase
    async function loadFromSupabase() {
      if (!supabase) return null;
      
      try {
        const user = await getCurrentUser();
        
        if (!user) {
          console.log("Not authenticated, can't load from Supabase");
          return null;
        }
        
          const { data, error } = await supabase
            .from("portfolios")
          .select("data")
            .eq("user_id", user.id)
            .single();

        if (error) {
          if (error.code === "PGRST116") {
            // No portfolio found for this user
            console.log("No portfolio found for this user in Supabase");
            return null;
          }
          throw error;
        }
        
        if (data && data.data) {
          return data.data;
        }
        
        return null;
      } catch (error) {
        console.error("Error loading from Supabase:", error);
        return null;
      }
    }
    
    // Initialize portfolio data from localStorage or Supabase if available
    async function initializePortfolioData() {
      // Show loading indicator
      showSavingIndicator("Loading profile...");
      
      try {
        // Try to load from localStorage first
        const localData = localStorage.getItem('portfolioData');
        let localParsedData = null;
        
        if (localData) {
          try {
            localParsedData = JSON.parse(localData);
            console.log("Portfolio data loaded from localStorage:", localParsedData);
          } catch (e) {
            console.error("Error parsing localStorage data:", e);
          }
        }
        
        // Try to load from Supabase if available
        let supabaseData = null;
        if (supabase) {
          supabaseData = await loadFromSupabase();
          console.log("Portfolio data loaded from Supabase:", supabaseData);
        }
        
        // Use the most recent data based on updated_at timestamp or prioritize Supabase data
        if (supabaseData && localParsedData) {
          // If we have both, compare timestamps if available
          const supabaseUpdatedAt = supabaseData.updated_at ? new Date(supabaseData.updated_at) : null;
          const localUpdatedAt = localParsedData.updated_at ? new Date(localParsedData.updated_at) : null;
          
          if (supabaseUpdatedAt && localUpdatedAt) {
            // Use the most recently updated data
            portfolioData = supabaseUpdatedAt > localUpdatedAt ? supabaseData : localParsedData;
          } else {
            // Default to Supabase data if timestamps not available
            portfolioData = supabaseData;
          }
        } else {
          // Use whichever data source is available
          portfolioData = supabaseData || localParsedData || {};
        }
        
        // Add current timestamp for future comparisons
        portfolioData.updated_at = new Date().toISOString();
        
        // Save the result back to localStorage for consistency
        localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
        
        // Render the data
        renderPortfolioData();
        
        // Hide loading indicator when done
        setTimeout(() => {
          showSavingIndicator("Profile loaded successfully!", "success");
          setTimeout(() => {
            hideSavingIndicator();
          }, 1500);
        }, 500);
        
        return Promise.resolve();
      } catch (error) {
        console.error("Error initializing portfolio data:", error);
        hideSavingIndicator();
        return Promise.reject(error);
      }
    }

    // Render portfolio data from localStorage or Supabase
    function renderPortfolioData() {
      // Exit if no data
      if (!portfolioData || Object.keys(portfolioData).length === 0) return;

      // Update each editable element based on field
      editableElements.forEach((element) => {
        const field = element.dataset.field;
        if (field && portfolioData[field]) {
          element.textContent = portfolioData[field];
        }
      });

      // Update skill progress bars
      const skillItems = document.querySelectorAll(".skill-item");
      skillItems.forEach((item) => {
        const itemId = item.dataset.itemId;
        const progress = portfolioData[`${itemId}_progress`];
        if (progress) {
          const progressBar = item.querySelector(".skill-progress");
          progressBar.setAttribute("data-progress", progress);
          const progressBarFill = item.querySelector(".skill-progress-bar");
          progressBarFill.style.width = `${progress}%`;
        }
      });
      
      // Restore section order and visibility if available
      if (portfolioData.sections && Array.isArray(portfolioData.sections)) {
        sectionOrder = portfolioData.sections;
        console.log("Restoring section order from saved data:", sectionOrder);
        
        // Get all sections
        const mainContainer = document.querySelector("main.container");
        const sections = Array.from(document.querySelectorAll(".portfolio-section"));
        
        // First handle section visibility
        sections.forEach(section => {
          const sectionData = sectionOrder.find(s => s.id === section.id);
          if (sectionData && sectionData.visible === false) {
            section.classList.add("hidden");
          } else {
            section.classList.remove("hidden");
          }
        });
        
        // Then reorder sections according to saved order
        sectionOrder.forEach(entry => {
          const section = document.getElementById(entry.id);
          if (section) {
            // Move to end of container to maintain order
            mainContainer.appendChild(section);
          }
        });
        
        // Update navigation after reordering
        updatePortfolioNavigation();
      }
    }

    // Gather all current portfolio data
    function gatherPortfolioData() {
      const data = {};

      // Get data from editable elements
      editableElements.forEach((element) => {
        const field = element.dataset.field;
        if (field) {
          data[field] = element.textContent;
        }
      });

      // Get skill progress
      const skillItems = document.querySelectorAll(".skill-item");
      skillItems.forEach((item) => {
        const itemId = item.dataset.itemId;
        const progressBar = item.querySelector(".skill-progress");
        const progress = progressBar ? progressBar.getAttribute("data-progress") : "0";
        data[`${itemId}_progress`] = progress;
      });
      
      // Include section order
      data.sections = sectionOrder;
      
      // Update timestamp
      updateProfileTimestamp();
      data.updated_at = new Date().toISOString();

      return data;
    }

    // Show saving indicator with support for success messages
    function showSavingIndicator(message = "Saving changes...", type = "loading") {
      const messageElement = savingIndicator.querySelector("span");
      const spinner = savingIndicator.querySelector(".spinner");
      
      messageElement.textContent = message;
      
      // Handle success message differently
      if (type === "success") {
        spinner.style.display = "none";
        savingIndicator.style.background = "linear-gradient(135deg, var(--success), #20d997)";
        savingIndicator.style.boxShadow = "0 4px 15px rgba(16, 185, 129, 0.3)";
      } else {
        spinner.style.display = "block";
        savingIndicator.style.background = "linear-gradient(135deg, var(--primary), var(--primary-light))";
        savingIndicator.style.boxShadow = "0 4px 15px rgba(99, 102, 241, 0.3)";
      }
      
      savingIndicator.classList.add("show");
    }

    // Hide saving indicator
    function hideSavingIndicator() {
      savingIndicator.classList.remove("show");
    }

    // Enable edit mode
    function enableEditMode() {
      if (!isEditMode) {
        // Store original data for canceling
        originalData = JSON.parse(JSON.stringify(gatherPortfolioData()));

        // Update UI
        isEditMode = true;
        editProfileButton.classList.add("active");
        editControls.classList.add("active");
        document.body.classList.add("edit-mode");

        // Make elements editable
        editableElements.forEach((element) => {
          element.setAttribute("contenteditable", "true");
          element.setAttribute("spellcheck", "true");

          // Add placeholder if empty
          if (element.textContent.trim() === "") {
            element.textContent = `Enter ${element.dataset.field}...`;
            element.classList.add("edit-placeholder");
          }

          // Handle focus to remove placeholder
          element.addEventListener("focus", handleElementFocus);

          // Handle blur to restore placeholder if empty
          element.addEventListener("blur", handleElementBlur);
        });

        // Show add buttons
        addEducationButton.style.display = "flex";
        addExperienceButton.style.display = "flex";
        addSkill1Button.style.display = "flex";
        addSkill2Button.style.display = "flex";

        // Show add project button
        const addProjectButton = document.getElementById("addProjectButton");
        if (addProjectButton) {
          addProjectButton.style.display = "flex";
        }

        // Add delete buttons to timeline and skill items
        addDeleteButtons();

        // Add progress editors to skill items
        addProgressEditors();

        // Make project tech tags editable
        makeTagsEditable();

        // Add project action buttons
        addProjectActionButtons();
        
        // Show section controls for section management
        document.querySelector(".section-controls").style.display = "flex";
        
        // Make section actions visible
        document.querySelectorAll(".section-actions").forEach(actions => {
          actions.style.opacity = "1";
        });
        
        // Make section titles clickable for settings
        document.querySelectorAll(".section-title").forEach(title => {
          title.style.cursor = "pointer";
          title.setAttribute("title", "Click to edit section settings");
        });
        
        // Add reorder sections button to controls
        if (!document.getElementById("reorderSectionsButton")) {
          const reorderButton = document.createElement("button");
          reorderButton.id = "reorderSectionsButton";
          reorderButton.className = "btn-secondary";
          reorderButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Reorder Sections
          `;
          reorderButton.style.display = "flex";
          reorderButton.style.alignItems = "center";
          reorderButton.style.gap = "8px";
          
          reorderButton.addEventListener("click", openReorderModal);
          
          editControls.insertBefore(reorderButton, cancelEditButton);
        }
      }
    }

    // Disable edit mode
    function disableEditMode() {
      if (isEditMode) {
        // Update UI
        isEditMode = false;
        editProfileButton.classList.remove("active");
        editControls.classList.remove("active");
        document.body.classList.remove("edit-mode");

        // Make elements non-editable
        editableElements.forEach((element) => {
          element.removeAttribute("contenteditable");
          element.removeAttribute("spellcheck");
          element.classList.remove("edit-placeholder");

          // Remove event listeners
          element.removeEventListener("focus", handleElementFocus);
          element.removeEventListener("blur", handleElementBlur);
        });

        // Hide add buttons
        addEducationButton.style.display = "none";
        addExperienceButton.style.display = "none";
        addSkill1Button.style.display = "none";
        addSkill2Button.style.display = "none";

        // Hide add project button
        const addProjectButton = document.getElementById("addProjectButton");
        if (addProjectButton) {
          addProjectButton.style.display = "none";
        }

        // Remove delete buttons
        removeDeleteButtons();

        // Remove progress editors
        removeProgressEditors();

        // Remove tag editing
        removeTagEditing();

        // Remove project action buttons
        removeProjectActionButtons();
        
        // Hide section controls
        document.querySelector(".section-controls").style.display = "none";
        
        // Hide section actions
        document.querySelectorAll(".section-actions").forEach(actions => {
          actions.style.opacity = "0";
        });
        
        // Make section titles non-clickable
        document.querySelectorAll(".section-title").forEach(title => {
          title.style.cursor = "default";
          title.removeAttribute("title");
        });
        
        // Remove reorder sections button
        const reorderButton = document.getElementById("reorderSectionsButton");
        if (reorderButton) {
          reorderButton.remove();
        }
        
        // Close any open modals
        closeAllModals();
      }
    }

    // Reset to original data
    function resetToOriginalData() {
      if (Object.keys(originalData).length > 0) {
        // Restore editable content
        editableElements.forEach((element) => {
          const field = element.dataset.field;
          if (field && originalData[field]) {
            element.textContent = originalData[field];
            element.classList.remove("edit-placeholder");
          }
        });

        // Restore skill progress bars
        const skillItems = document.querySelectorAll(".skill-item");
        skillItems.forEach((item) => {
          const itemId = item.dataset.itemId;
          const progress = originalData[`${itemId}_progress`];
          if (progress) {
            const progressBar = item.querySelector(".skill-progress");
            progressBar.setAttribute("data-progress", progress);
            const progressBarFill = item.querySelector(".skill-progress-bar");
            progressBarFill.style.width = `${progress}%`;
          }
        });

        // TODO: Handle deletion/addition of items when that's implemented
      }
    }

    // Handle element focus
    function handleElementFocus(e) {
      const element = e.target;
      if (element.classList.contains("edit-placeholder")) {
        element.textContent = "";
        element.classList.remove("edit-placeholder");
      }
    }

    // Handle element blur
    function handleElementBlur(e) {
      const element = e.target;
      if (element.textContent.trim() === "") {
        element.textContent = `Enter ${element.dataset.field}...`;
        element.classList.add("edit-placeholder");
      }
    }

    // Add delete buttons to timeline and skill items
    function addDeleteButtons() {
      const timelineItems = document.querySelectorAll(".timeline-item");
      const skillItems = document.querySelectorAll(".skill-item");

      // Add delete buttons to timeline items
      timelineItems.forEach((item) => {
        // Skip if already has delete button
        if (item.querySelector(".delete-item-button")) return;

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-item-button";
        deleteButton.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        deleteButton.setAttribute("type", "button");
        deleteButton.setAttribute("aria-label", "Delete item");

        // Add click handler for delete
        deleteButton.addEventListener("click", function () {
          if (confirm("Are you sure you want to delete this item?")) {
            item.remove();
          }
        });

        item.prepend(deleteButton);
      });

      // Add delete buttons to skill items
      skillItems.forEach((item) => {
        // Skip if already has delete button
        if (item.querySelector(".delete-item-button")) return;

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-item-button";
        deleteButton.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        deleteButton.setAttribute("type", "button");
        deleteButton.setAttribute("aria-label", "Delete item");

        // Add click handler for delete
        deleteButton.addEventListener("click", function () {
          if (confirm("Are you sure you want to delete this skill?")) {
            item.remove();
          }
        });

        item.appendChild(deleteButton);
      });
    }

    // Remove delete buttons
    function removeDeleteButtons() {
      const deleteButtons = document.querySelectorAll(".delete-item-button");
      deleteButtons.forEach((button) => button.remove());
    }

    // Add progress editors to skill items
    function addProgressEditors() {
      const skillItems = document.querySelectorAll(".skill-item");

      skillItems.forEach((item) => {
        // Skip if already has progress editor
        if (item.querySelector(".progress-editor")) return;

        const progressBar = item.querySelector(".skill-progress");
        const currentProgress = progressBar.getAttribute("data-progress");

        const editor = document.createElement("div");
        editor.className = "progress-editor";
        editor.innerHTML = `
          <input type="number" min="0" max="100" value="${currentProgress}" aria-label="Skill progress percentage">
          <button type="button">Set</button>
        `;

        // Add click handler for progress update
        editor.querySelector("button").addEventListener("click", function () {
          const input = editor.querySelector("input");
          const newProgress = Math.min(
            100,
            Math.max(0, parseInt(input.value) || 0)
          );

          progressBar.setAttribute("data-progress", newProgress);
          const progressBarFill = item.querySelector(".skill-progress-bar");
          progressBarFill.style.width = `${newProgress}%`;
        });

        item.appendChild(editor);
      });
    }

    // Remove progress editors
    function removeProgressEditors() {
      const progressEditors = document.querySelectorAll(".progress-editor");
      progressEditors.forEach((editor) => editor.remove());
    }

    // Function to make tech tags editable
    function makeTagsEditable() {
      const techContainers = document.querySelectorAll(
        ".portfolio-project-tech"
      );

      techContainers.forEach((container) => {
        const projectId = container.dataset.project;
        const tags = container.querySelectorAll(".tech-tag");

        // Add delete button to each tag
        tags.forEach((tag) => {
          tag.classList.add("editable");

          const deleteBtn = document.createElement("span");
          deleteBtn.className = "tech-tag-delete";
          deleteBtn.innerHTML = "×";
          deleteBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            if (confirm("Delete this tag?")) {
              tag.remove();
            }
          });

          tag.appendChild(deleteBtn);
        });

        // Add "Add Tag" button
        const addTagButton = document.createElement("button");
        addTagButton.className = "add-tag-button";
        addTagButton.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Add Tag
        `;

        addTagButton.addEventListener("click", function () {
          // Hide add button temporarily
          addTagButton.style.display = "none";

          // Create input for new tag
          const tagInputContainer = document.createElement("div");
          tagInputContainer.className = "tag-input-container";
          tagInputContainer.innerHTML = `
            <input type="text" class="tag-input" placeholder="Tag name">
            <div class="tag-input-actions">
              <button class="tag-input-confirm">✓</button>
              <button class="tag-input-cancel">×</button>
            </div>
          `;

          container.insertBefore(tagInputContainer, addTagButton);
          const tagInput = tagInputContainer.querySelector("input");
          tagInput.focus();

          // Confirm button action
          tagInputContainer
            .querySelector(".tag-input-confirm")
            .addEventListener("click", function () {
              const tagName = tagInput.value.trim();
              if (tagName) {
                // Create new tag
                const newTag = document.createElement("span");
                newTag.className = "tech-tag editable";
                newTag.setAttribute("data-tag", tagName);
                newTag.textContent = tagName;

                // Add delete button to new tag
                const deleteBtn = document.createElement("span");
                deleteBtn.className = "tech-tag-delete";
                deleteBtn.innerHTML = "×";
                deleteBtn.addEventListener("click", function (e) {
                  e.stopPropagation();
                  if (confirm("Delete this tag?")) {
                    newTag.remove();
                  }
                });

                newTag.appendChild(deleteBtn);

                // Insert new tag before the input container
                container.insertBefore(newTag, tagInputContainer);
              }

              // Remove input and show add button
              tagInputContainer.remove();
              addTagButton.style.display = "inline-flex";
            });

          // Cancel button action
          tagInputContainer
            .querySelector(".tag-input-cancel")
            .addEventListener("click", function () {
              tagInputContainer.remove();
              addTagButton.style.display = "inline-flex";
            });

          // Handle Enter key
          tagInput.addEventListener("keyup", function (e) {
            if (e.key === "Enter") {
              tagInputContainer.querySelector(".tag-input-confirm").click();
            } else if (e.key === "Escape") {
              tagInputContainer.querySelector(".tag-input-cancel").click();
            }
          });
        });

        container.appendChild(addTagButton);
      });
    }

    // Function to add project action buttons
    function addProjectActionButtons() {
      const projectCards = document.querySelectorAll(".portfolio-project-card");

      projectCards.forEach((card) => {
        // Skip if already has project actions
        if (card.querySelector(".project-actions")) return;

        const actionsContainer = document.createElement("div");
        actionsContainer.className = "project-actions";

        // Create delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "project-delete-btn";
        deleteBtn.setAttribute("aria-label", "Delete project");
        deleteBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;

        // Add click handler for delete project
        deleteBtn.addEventListener("click", function () {
          if (confirm("Are you sure you want to delete this project?")) {
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
      const tagDeleteButtons = document.querySelectorAll(".tech-tag-delete");
      tagDeleteButtons.forEach((btn) => btn.remove());

      // Remove editable class from tags
      const editableTags = document.querySelectorAll(".tech-tag.editable");
      editableTags.forEach((tag) => tag.classList.remove("editable"));

      // Remove add tag buttons
      const addTagButtons = document.querySelectorAll(".add-tag-button");
      addTagButtons.forEach((btn) => btn.remove());

      // Remove any active tag inputs
      const tagInputContainers = document.querySelectorAll(
        ".tag-input-container"
      );
      tagInputContainers.forEach((container) => container.remove());
    }

    // Function to remove project action buttons
    function removeProjectActionButtons() {
      const projectActions = document.querySelectorAll(".project-actions");
      projectActions.forEach((actions) => actions.remove());
    }

    // Event Listeners

    // Edit button click handler
    if (editProfileButton) {
      editProfileButton.addEventListener("click", function () {
        if (isEditMode) {
          disableEditMode();
        } else {
          enableEditMode();
        }
      });
    }

    // Save button click handler
    if (saveProfileButton) {
      saveProfileButton.addEventListener("click", async function () {
        // Gather all portfolio data
        portfolioData = gatherPortfolioData();

        // Show saving indicator
        showSavingIndicator("Saving changes...");

        try {
          // Save to localStorage
          localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
          console.log("Portfolio data saved to localStorage:", portfolioData);

        // Save to Supabase if available
        if (supabase) {
            const result = await saveToSupabase(portfolioData);
            
            if (!result.success) {
              console.error("Error saving to Supabase:", result.error);
              // Show as warning but don't prevent continuing since localStorage saved
              showSavingIndicator("Saved locally but not to cloud", "warning");
              setTimeout(() => {
            hideSavingIndicator();
            disableEditMode();
              }, 2500);
              return;
          }
          }

          // Show success message
          showSavingIndicator("Changes saved successfully!", "success");
          
          // Hide success message and disable edit mode after a delay
          setTimeout(() => {
            hideSavingIndicator();
            // Show success notification
            showSaveNotification("Portfolio saved successfully!");
            disableEditMode();
          }, 2000);
          
        } catch (error) {
          console.error("Error saving portfolio:", error);
          
          // Show error in saving indicator
          showSavingIndicator("Error saving changes", "error");
          
          setTimeout(() => {
            hideSavingIndicator();
            // Show error notification
            showSaveNotification("Error saving changes. Please try again.");
          }, 3000);
        }
      });
    }

    // Cancel button click handler
    if (cancelEditButton) {
      cancelEditButton.addEventListener("click", function () {
        resetToOriginalData();
        disableEditMode();
      });
    }

    // Add event listeners for add buttons
    if (addEducationButton) {
      addEducationButton.addEventListener("click", function () {
        addNewEducationItem();
      });
    }

    if (addExperienceButton) {
      addExperienceButton.addEventListener("click", function () {
        addNewExperienceItem();
      });
    }

    if (addSkill1Button) {
      addSkill1Button.addEventListener("click", function () {
        addNewSkillItem("skillsGrid1");
      });
    }

    if (addSkill2Button) {
      addSkill2Button.addEventListener("click", function () {
        addNewSkillItem("skillsGrid2");
      });
    }

    // Add new education item
    function addNewEducationItem() {
      const timelineContainer = document.getElementById("educationTimeline");
      const items = timelineContainer.querySelectorAll(".timeline-item");
      const newItemId = `edu${items.length + 1}`;

      const newItem = document.createElement("div");
      newItem.className = "timeline-item new-item";
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
      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-item-button";
      deleteButton.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      deleteButton.setAttribute("type", "button");
      deleteButton.setAttribute("aria-label", "Delete item");

      // Add click handler for delete
      deleteButton.addEventListener("click", function () {
        if (confirm("Are you sure you want to delete this item?")) {
          newItem.remove();
        }
      });

      newItem.prepend(deleteButton);

      // Make new elements editable
      const editableElements = newItem.querySelectorAll(".editable-content");
      editableElements.forEach((element) => {
        element.setAttribute("contenteditable", "true");
        element.setAttribute("spellcheck", "true");

        // Add placeholder styles
        element.classList.add("edit-placeholder");

        // Handle focus to remove placeholder
        element.addEventListener("focus", handleElementFocus);

        // Handle blur to restore placeholder if empty
        element.addEventListener("blur", handleElementBlur);
      });

      // Focus the first editable element
      editableElements[0].focus();
    }

    // Add new experience item
    function addNewExperienceItem() {
      const timelineContainer = document.getElementById("experienceTimeline");
      const items = timelineContainer.querySelectorAll(".timeline-item");
      const newItemId = `exp${items.length + 1}`;

      const newItem = document.createElement("div");
      newItem.className = "timeline-item new-item";
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
      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-item-button";
      deleteButton.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      deleteButton.setAttribute("type", "button");
      deleteButton.setAttribute("aria-label", "Delete item");

      // Add click handler for delete
      deleteButton.addEventListener("click", function () {
        if (confirm("Are you sure you want to delete this item?")) {
          newItem.remove();
        }
      });

      newItem.prepend(deleteButton);

      // Make new elements editable
      const editableElements = newItem.querySelectorAll(".editable-content");
      editableElements.forEach((element) => {
        element.setAttribute("contenteditable", "true");
        element.setAttribute("spellcheck", "true");

        // Add placeholder styles
        element.classList.add("edit-placeholder");

        // Handle focus to remove placeholder
        element.addEventListener("focus", handleElementFocus);

        // Handle blur to restore placeholder if empty
        element.addEventListener("blur", handleElementBlur);
      });

      // Focus the first editable element
      editableElements[0].focus();
    }

    // Add new skill item
    function addNewSkillItem(gridId) {
      const skillsGrid = document.getElementById(gridId);
      const items = skillsGrid.querySelectorAll(".skill-item");
      const allSkillItems = document.querySelectorAll(".skill-item");
      const newItemId = `skill${allSkillItems.length + 1}`;

      const newItem = document.createElement("div");
      newItem.className = "skill-item new-item";
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
      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-item-button";
      deleteButton.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      deleteButton.setAttribute("type", "button");
      deleteButton.setAttribute("aria-label", "Delete item");

      // Add click handler for delete
      deleteButton.addEventListener("click", function () {
        if (confirm("Are you sure you want to delete this skill?")) {
          newItem.remove();
        }
      });

      newItem.appendChild(deleteButton);

      // Add progress editor to new item
      const progressBar = newItem.querySelector(".skill-progress");

      const editor = document.createElement("div");
      editor.className = "progress-editor";
      editor.innerHTML = `
        <input type="number" min="0" max="100" value="50" aria-label="Skill progress percentage">
        <button type="button">Set</button>
      `;

      // Add click handler for progress update
      editor.querySelector("button").addEventListener("click", function () {
        const input = editor.querySelector("input");
        const newProgress = Math.min(
          100,
          Math.max(0, parseInt(input.value) || 0)
        );

        progressBar.setAttribute("data-progress", newProgress);
        const progressBarFill = newItem.querySelector(".skill-progress-bar");
        progressBarFill.style.width = `${newProgress}%`;
      });

      newItem.appendChild(editor);

      // Make new elements editable
      const editableElements = newItem.querySelectorAll(".editable-content");
      editableElements.forEach((element) => {
        element.setAttribute("contenteditable", "true");
        element.setAttribute("spellcheck", "true");

        // Add placeholder styles
        element.classList.add("edit-placeholder");

        // Handle focus to remove placeholder
        element.addEventListener("focus", handleElementFocus);

        // Handle blur to restore placeholder if empty
        element.addEventListener("blur", handleElementBlur);
      });

      // Focus the first editable element
      editableElements[0].focus();
    }

    // Add new project functionality
    if (document.getElementById("addProjectButton")) {
      document
        .getElementById("addProjectButton")
        .addEventListener("click", function () {
          addNewProject();
        });
    }

    // Function to add new project
    function addNewProject() {
      const projectsContainer = document.getElementById("projectsContainer");
      const projects = projectsContainer.querySelectorAll(
        ".portfolio-project-card"
      );
      const newItemId = `proj${projects.length + 1}`;

      // Create new project card
      const newProject = document.createElement("div");
      newProject.className = "portfolio-project-card new-item";
      newProject.dataset.itemId = newItemId;

      // Determine random project icon
      const icons = [
        `<path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
        `<path d="M12 18.0001V14.0001M12 14.0001V10.0001M12 14.0001H16M12 14.0001H8M21 12.0001C21 16.9707 16.9706 21.0001 12 21.0001C7.02944 21.0001 3 16.9707 3 12.0001C3 7.02956 7.02944 3.00012 12 3.00012C16.9706 3.00012 21 7.02956 21 12.0001Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
        `<path d="M3 10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H13C16.7712 2 18.6569 2 19.8284 3.17157C21 4.34315 21 6.22876 21 10V14C21 17.7712 21 19.6569 19.8284 20.8284C18.6569 22 16.7712 22 13 22H11C7.22876 22 5.34315 22 4.17157 20.8284C3 19.6569 3 17.7712 3 14V10Z" stroke="currentColor" stroke-width="2"/><path d="M7 16.5H10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 12.5H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 8.5H12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14 16.5H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
      ];

      // Randomly select project badge type
      const badgeTypes = [
        "Web App",
        "Mobile App",
        "AI Project",
        "Game",
        "API",
        "Plugin",
      ];
      const randomBadge =
        badgeTypes[Math.floor(Math.random() * badgeTypes.length)];

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
      const newEditableElements =
        newProject.querySelectorAll(".editable-content");
      newEditableElements.forEach((element) => {
        element.setAttribute("contenteditable", "true");
        element.setAttribute("spellcheck", "true");

        // Add placeholder styles if needed
        if (
          element.textContent.trim() === "New Project" ||
          element.textContent.trim() === "Enter project description here..."
        ) {
          element.classList.add("edit-placeholder");
        }

        // Handle focus to remove placeholder
        element.addEventListener("focus", handleElementFocus);

        // Handle blur to restore placeholder if empty
        element.addEventListener("blur", handleElementBlur);
      });

      // Add project action buttons
      const actionsContainer = document.createElement("div");
      actionsContainer.className = "project-actions";

      // Create delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "project-delete-btn";
      deleteBtn.setAttribute("aria-label", "Delete project");
      deleteBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;

      // Add click handler for delete project
      deleteBtn.addEventListener("click", function () {
        if (confirm("Are you sure you want to delete this project?")) {
          newProject.remove();
        }
      });

      actionsContainer.appendChild(deleteBtn);
      newProject.appendChild(actionsContainer);

      // Make tags editable
      const techContainer = newProject.querySelector(".portfolio-project-tech");
      const tags = techContainer.querySelectorAll(".tech-tag");

      // Add delete button to each tag
      tags.forEach((tag) => {
        tag.classList.add("editable");

        const deleteBtn = document.createElement("span");
        deleteBtn.className = "tech-tag-delete";
        deleteBtn.innerHTML = "×";
        deleteBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (confirm("Delete this tag?")) {
            tag.remove();
          }
        });

        tag.appendChild(deleteBtn);
      });

      // Add "Add Tag" button
      const addTagButton = document.createElement("button");
      addTagButton.className = "add-tag-button";
      addTagButton.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Add Tag
      `;

      addTagButton.addEventListener(
        "click",
        createAddTagHandler(techContainer, addTagButton)
      );
      techContainer.appendChild(addTagButton);

      // Focus the title for immediate editing
      newProject.querySelector(".portfolio-project-title").focus();
    }

    // Create a reusable handler for adding tags
    function createAddTagHandler(container, addTagButton) {
      return function () {
        // Hide add button temporarily
        addTagButton.style.display = "none";

        // Create input for new tag
        const tagInputContainer = document.createElement("div");
        tagInputContainer.className = "tag-input-container";
        tagInputContainer.innerHTML = `
          <input type="text" class="tag-input" placeholder="Tag name">
          <div class="tag-input-actions">
            <button class="tag-input-confirm">✓</button>
            <button class="tag-input-cancel">×</button>
          </div>
        `;

        container.insertBefore(tagInputContainer, addTagButton);
        const tagInput = tagInputContainer.querySelector("input");
        tagInput.focus();

        // Confirm button action
        tagInputContainer
          .querySelector(".tag-input-confirm")
          .addEventListener("click", function () {
            const tagName = tagInput.value.trim();
            if (tagName) {
              // Create new tag
              const newTag = document.createElement("span");
              newTag.className = "tech-tag editable";
              newTag.setAttribute("data-tag", tagName);
              newTag.textContent = tagName;

              // Add delete button to new tag
              const deleteBtn = document.createElement("span");
              deleteBtn.className = "tech-tag-delete";
              deleteBtn.innerHTML = "×";
              deleteBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                if (confirm("Delete this tag?")) {
                  newTag.remove();
                }
              });

              newTag.appendChild(deleteBtn);

              // Insert new tag before the input container
              container.insertBefore(newTag, tagInputContainer);
            }

            // Remove input and show add button
            tagInputContainer.remove();
            addTagButton.style.display = "inline-flex";
          });

        // Cancel button action
        tagInputContainer
          .querySelector(".tag-input-cancel")
          .addEventListener("click", function () {
            tagInputContainer.remove();
            addTagButton.style.display = "inline-flex";
          });

        // Handle Enter key
        tagInput.addEventListener("keyup", function (e) {
          if (e.key === "Enter") {
            tagInputContainer.querySelector(".tag-input-confirm").click();
          } else if (e.key === "Escape") {
            tagInputContainer.querySelector(".tag-input-cancel").click();
          }
        });
      };
    }

    // Initialize portfolio
    initializePortfolioData();

    // Section Management Functions
    
    // Initialize section management
    function initializeSectionManagement() {
      // Store initial section order
      updateSectionOrder();
      
      // Add event listeners for section management
      addSectionButton.addEventListener("click", openAddSectionModal);
      confirmAddSectionButton.addEventListener("click", addNewSection);
      cancelAddSectionButton.addEventListener("click", closeAddSectionModal);
      
      // Template selection
      sectionTemplates.forEach(template => {
        template.addEventListener("click", () => {
          // If it's a custom section, show the custom form
          if (template.dataset.sectionType === "custom") {
            selectedSectionTemplate = "custom";
            document.querySelector(".section-template-grid").style.display = "none";
            customSectionForm.style.display = "block";
            confirmAddSectionButton.style.display = "none";
          } else {
            // Otherwise, select the template
            selectedSectionTemplate = template.dataset.sectionType;
            sectionTemplates.forEach(t => t.classList.remove("selected"));
            template.classList.add("selected");
            
            // If custom form is showing, hide it
            customSectionForm.style.display = "none";
            document.querySelector(".section-template-grid").style.display = "grid";
            confirmAddSectionButton.style.display = "block";
          }
        });
      });
      
      // Back to templates button
      backToTemplatesButton.addEventListener("click", () => {
        customSectionForm.style.display = "none";
        document.querySelector(".section-template-grid").style.display = "grid";
        confirmAddSectionButton.style.display = "block";
        selectedSectionTemplate = null;
        sectionTemplates.forEach(t => t.classList.remove("selected"));
      });
      
      // Add custom section button
      addCustomSectionButton.addEventListener("click", addCustomSection);
      
      // Close modals with X button
      modalCloseButtons.forEach(button => {
        button.addEventListener("click", () => {
          closeAllModals();
        });
      });
      
      // Save section order button
      saveSectionOrderButton.addEventListener("click", saveNewSectionOrder);
      
      // Cancel section reorder button
      cancelSectionReorderButton.addEventListener("click", closeReorderModal);
      
      // Save section settings button
      saveSectionSettingsButton.addEventListener("click", saveSectionSettings);
      
      // Cancel section settings button
      cancelSectionSettingsButton.addEventListener("click", closeSectionSettingsModal);
      
      // Setup section action buttons for existing sections
      setupSectionActionButtons();
    }
    
    // Open add section modal
    function openAddSectionModal() {
      addSectionModal.classList.add("active");
      modalBackdrop.classList.add("active");
      selectedSectionTemplate = null;
      
      // Reset selections
      sectionTemplates.forEach(t => t.classList.remove("selected"));
      
      // Reset custom form
      customSectionForm.style.display = "none";
      document.querySelector(".section-template-grid").style.display = "grid";
      confirmAddSectionButton.style.display = "block";
      document.getElementById("customSectionTitle").value = "";
      document.getElementById("customSectionContent").value = "";
    }
    
    // Close add section modal
    function closeAddSectionModal() {
      addSectionModal.classList.remove("active");
      modalBackdrop.classList.remove("active");
    }
    
    // Close all modals
    function closeAllModals() {
      addSectionModal.classList.remove("active");
      reorderSectionsModal.classList.remove("active");
      sectionSettingsModal.classList.remove("active");
      modalBackdrop.classList.remove("active");
    }
    
    // Add new section
    function addNewSection() {
      if (!selectedSectionTemplate || !sectionTemplateHTML[selectedSectionTemplate]) {
        alert("Please select a section template");
        return;
      }
      
      // Generate unique ID for the section
      const timestamp = new Date().getTime();
      const sectionId = `${selectedSectionTemplate}_${timestamp}`;
      
      // Get section title
      const sectionTitle = getSectionTitle(selectedSectionTemplate);
      
      // Create new section
      const newSection = document.createElement("section");
      newSection.id = sectionId;
      newSection.className = "portfolio-section adding";
      newSection.dataset.sectionType = selectedSectionTemplate;
      
      // Add section content
      newSection.innerHTML = `
        <div class="section-header">
          <h2 class="section-title">${sectionTitle}</h2>
          <div class="section-actions">
            <button class="section-action-btn move-up-btn" aria-label="Move section up">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="section-action-btn move-down-btn" aria-label="Move section down">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="section-action-btn remove-section-btn" aria-label="Remove section">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        ${sectionTemplateHTML[selectedSectionTemplate]}
      `;
      
      // Add to the main container before the contact section
      const mainContainer = document.querySelector("main.container");
      const contactSection = document.getElementById("contact");
      
      if (contactSection) {
        mainContainer.insertBefore(newSection, contactSection);
      } else {
        mainContainer.appendChild(newSection);
      }
      
      // Setup action buttons for the new section
      setupSectionActionButtons(newSection);
      
      // Update section order
      updateSectionOrder();
      
      // Update navigation
      updatePortfolioNavigation();
      
      // Make new section elements editable if in edit mode
      if (isEditMode) {
        const newEditableElements = newSection.querySelectorAll(".editable-content");
        newEditableElements.forEach(element => {
          element.setAttribute("contenteditable", "true");
          element.setAttribute("spellcheck", "true");
          
          // Add placeholder if empty
          if (element.textContent.trim() === "") {
            element.textContent = `Enter ${element.dataset.field}...`;
            element.classList.add("edit-placeholder");
          }
          
          // Handle focus to remove placeholder
          element.addEventListener("focus", handleElementFocus);
          
          // Handle blur to restore placeholder if empty
          element.addEventListener("blur", handleElementBlur);
        });
        
        // Show add buttons in the new section
        const addButtons = newSection.querySelectorAll(".add-item-button");
        addButtons.forEach(button => {
          button.style.display = "flex";
        });
      }
      
      // Close the modal
      closeAddSectionModal();
      
      // Save the updated data to localStorage
      portfolioData = gatherPortfolioData();
      localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
      
      // Scroll to the new section
      setTimeout(() => {
        newSection.scrollIntoView({ behavior: "smooth", block: "start" });
        
        // Remove animation class after animation completes
        setTimeout(() => {
          newSection.classList.remove("adding");
        }, 500);
      }, 100);
    }
    
    // Section template HTML - Updated to match index page styling
    const sectionTemplateHTML = {
      about: `
        <div class="about-content">
          <p class="about-text editable-content" data-field="${Date.now()}_about1">
            I'm a passionate Computer Science student with a strong interest in web development, artificial intelligence, 
            and cybersecurity. My journey in tech began when I was 15, teaching myself how to code through online resources.
          </p>
          <p class="about-text editable-content" data-field="${Date.now()}_about2">
            When I'm not coding, you can find me exploring new technologies, contributing to open-source projects,
            or mentoring junior developers. I believe in continuous learning and pushing the boundaries of what's possible with technology.
          </p>
        </div>
      `,
      education: `
        <div class="timeline" id="educationTimeline">
          <div class="timeline-item" data-item-id="edu_new1">
            <div class="timeline-dot"></div>
            <div class="timeline-date editable-content" data-field="edu_new1_date">2021 - Present</div>
            <div class="timeline-content">
              <h3 class="timeline-title editable-content" data-field="edu_new1_degree">Degree Name</h3>
              <p class="timeline-subtitle editable-content" data-field="edu_new1_school">Institution Name</p>
              <p class="timeline-description editable-content" data-field="edu_new1_description">Description of your education</p>
            </div>
          </div>
        </div>
        <button class="add-item-button" id="addEducationButton" style="display: none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Add Education
        </button>
      `,
      skills: `
        <div class="skills-container">
          <div class="skill-category">
            <h3 class="skill-category-title editable-content" data-field="skill_cat_new">Skills Category</h3>
            <div class="skill-grid" id="skillsGrid_new">
              <div class="skill-item" data-item-id="skill_new1">
                <div class="skill-progress" data-progress="80">
                  <div class="skill-progress-bar" style="width: 80%"></div>
                </div>
                <div class="skill-info">
                  <span class="skill-name editable-content" data-field="skill_new1_name">Skill Name</span>
                  <span class="skill-level editable-content" data-field="skill_new1_level">Advanced</span>
                </div>
              </div>
            </div>
            <button class="add-item-button" id="addSkillButton" style="display: none;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Add Skill
            </button>
          </div>

          <div class="skill-tags-container">
            <div class="skill-tag">Tag 1</div>
            <div class="skill-tag">Tag 2</div>
            <div class="skill-tag">Tag 3</div>
          </div>
        </div>
      `,
      experience: `
        <div class="timeline" id="experienceTimeline">
          <div class="timeline-item" data-item-id="exp_new1">
            <div class="timeline-dot"></div>
            <div class="timeline-date editable-content" data-field="exp_new1_date">2022 - Present</div>
            <div class="timeline-content">
              <h3 class="timeline-title editable-content" data-field="exp_new1_title">Position Title</h3>
              <p class="timeline-subtitle editable-content" data-field="exp_new1_company">Company Name</p>
              <p class="timeline-description editable-content" data-field="exp_new1_description">Description of your responsibilities and achievements</p>
            </div>
          </div>
        </div>
        <button class="add-item-button" id="addExperienceButton" style="display: none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Add Experience
        </button>
      `,
      projects: `
        <div class="projects-grid" id="projectsContainer">
          <div class="project-card">
            <div class="project-image">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div class="project-content">
              <h3 class="project-title editable-content" data-field="project_new1_title">Project Title</h3>
              <p class="project-tech editable-content" data-field="project_new1_tech">Technology: React, Node.js</p>
            </div>
          </div>
        </div>
        <button class="add-item-button" id="addProjectButton" style="display: none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Add Project
        </button>
        <div class="view-all-link">
          <a href="projects.html" class="btn-primary">View All Projects</a>
        </div>
      `,
      contact: `
        <div class="contact-container">
          <div class="contact-info">
            <h3 class="contact-subtitle">Let's Connect</h3>
            <p class="contact-text editable-content" data-field="contact_text">
              I'm currently open to new opportunities and collaborations. Whether you have a project in mind, 
              a question about my work, or just want to say hello, feel free to reach out!
            </p>
            
            <div class="contact-methods">
              <div class="contact-method">
                <div class="contact-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 8L10.8906 13.2604C11.5624 13.7083 12.4376 13.7083 13.1094 13.2604L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="contact-detail">
                  <h4 class="contact-label">Email</h4>
                  <p class="contact-value editable-content" data-field="contact_email">youremail@example.com</p>
                </div>
              </div>
              
              <div class="contact-method">
                <div class="contact-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 10C20 14.4183 12 22 12 22C12 22 4 14.4183 4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 12C13.1046 12 14 11.1046 14 10C14 8.89543 13.1046 8 12 8C10.8954 8 10 8.89543 10 10C10 11.1046 10.8954 12 12 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="contact-detail">
                  <h4 class="contact-label">Location</h4>
                  <p class="contact-value editable-content" data-field="contact_location">City, Country</p>
                </div>
              </div>
            </div>

            <div class="social-links">
              <a href="#" class="social-link">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5229 6.47715 22 12 22C17.5229 22 22 17.5229 22 12C22 6.47715 17.5229 2 12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M14.3333 19V17.137C14.3583 16.8275 14.3154 16.5163 14.2073 16.2242C14.0993 15.9321 13.9286 15.6657 13.7067 15.4428C15.8 15.2156 18 14.4431 18 10.8989C17.9998 9.99256 17.6418 9.12101 17 8.46461C17.3039 7.67171 17.2824 6.79528 16.94 6.01739C16.94 6.01739 16.1533 5.7902 14.3333 6.97433C12.8053 6.57853 11.1947 6.57853 9.66666 6.97433C7.84666 5.7902 7.05999 6.01739 7.05999 6.01739C6.71757 6.79528 6.69609 7.67171 6.99999 8.46461C6.35341 9.12588 5.99501 10.0053 5.99999 10.9183C5.99999 14.4366 8.19999 15.2091 10.2933 15.4622C10.074 15.6829 9.90483 15.9461 9.79686 16.2347C9.68889 16.5232 9.64453 16.8306 9.66666 17.137V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M9.66667 17.7018C7.66667 18.3335 6 17.7018 5 16.0684" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </a>
              <a href="#" class="social-link">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 8C17.5913 8 19.1174 8.63214 20.2426 9.75736C21.3679 10.8826 22 12.4087 22 14V21H18V14C18 13.4696 17.7893 12.9609 17.4142 12.5858C17.0391 12.2107 16.5304 12 16 12C15.4696 12 14.9609 12.2107 14.5858 12.5858C14.2107 12.9609 14 13.4696 14 14V21H10V14C10 12.4087 10.6321 10.8826 11.7574 9.75736C12.8826 8.63214 14.4087 8 16 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M6 9H2V21H6V9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M4 6C5.10457 6 6 5.10457 6 4C6 2.89543 5.10457 2 4 2C2.89543 2 2 2.89543 2 4C2 5.10457 2.89543 6 4 6Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </a>
            </div>
          </div>
          
          <div class="contact-form-container">
            <form class="contact-form" novalidate>
              <div class="form-group">
                <label for="name" class="form-label">Name</label>
                <input type="text" id="name" class="form-input" placeholder="Your name" required>
              </div>
              <div class="form-group">
                <label for="email" class="form-label">Email</label>
                <input type="email" id="email" class="form-input" placeholder="Your email" required>
              </div>
              <div class="form-group">
                <label for="subject" class="form-label">Subject</label>
                <input type="text" id="subject" class="form-input" placeholder="Subject">
              </div>
              <div class="form-group">
                <label for="message" class="form-label">Message</label>
                <textarea id="message" class="form-textarea" placeholder="Your message" rows="5" required></textarea>
              </div>
              <button type="submit" class="btn-primary form-submit">Send Message</button>
            </form>
          </div>
        </div>
      `,
      custom: `
        <div class="custom-section-content editable-content" data-field="custom_${Date.now()}_content">
          Custom section content goes here...
        </div>
      `
    };

    // Add custom section
    function addCustomSection() {
      const title = document.getElementById("customSectionTitle").value.trim();
      const content = document.getElementById("customSectionContent").value.trim();
      
      if (!title) {
        alert("Please enter a section title");
        return;
      }
      
      // Generate unique ID for the section
      const timestamp = new Date().getTime();
      const sectionId = `custom_${timestamp}`;
      
      // Create new section
      const newSection = document.createElement("section");
      newSection.id = sectionId;
      newSection.className = "portfolio-section adding";
      newSection.dataset.sectionType = "custom";
      
      // Add section content
      newSection.innerHTML = `
        <div class="section-header">
          <h2 class="section-title">${title}</h2>
          <div class="section-actions">
            <button class="section-action-btn move-up-btn" aria-label="Move section up">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="section-action-btn move-down-btn" aria-label="Move section down">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="section-action-btn remove-section-btn" aria-label="Remove section">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="custom-section-content editable-content" data-field="${sectionId}_content">
          ${content || "Custom section content goes here..."}
        </div>
      `;
      
      // Add to the main container before the contact section
      const mainContainer = document.querySelector("main.container");
      const contactSection = document.getElementById("contact");
      
      if (contactSection) {
        mainContainer.insertBefore(newSection, contactSection);
      } else {
        mainContainer.appendChild(newSection);
      }
      
      // Setup action buttons for the new section
      setupSectionActionButtons(newSection);
      
      // Update section order
      updateSectionOrder();
      
      // Update navigation
      updatePortfolioNavigation();
      
      // Make new section elements editable if in edit mode
      if (isEditMode) {
        const newEditableElements = newSection.querySelectorAll(".editable-content");
        newEditableElements.forEach(element => {
          element.setAttribute("contenteditable", "true");
          element.setAttribute("spellcheck", "true");
          
          // Handle focus to remove placeholder
          element.addEventListener("focus", handleElementFocus);
          
          // Handle blur to restore placeholder if empty
          element.addEventListener("blur", handleElementBlur);
        });
      }
      
      // Close the modal
      closeAddSectionModal();
      
      // Scroll to the new section
      setTimeout(() => {
        newSection.scrollIntoView({ behavior: "smooth", block: "start" });
        
        // Remove animation class after animation completes
        setTimeout(() => {
          newSection.classList.remove("adding");
        }, 500);
      }, 100);
    }
    
    // Get section title based on section type
    function getSectionTitle(sectionType) {
      const titles = {
        about: "About Me",
        education: "Education",
        skills: "Technical Skills",
        experience: "Work Experience",
        projects: "Featured Projects",
        contact: "Get In Touch",
        custom: "Custom Section"
      };
      
      return titles[sectionType] || "New Section";
    }
    
    // Setup section action buttons
    function setupSectionActionButtons(targetSection = null) {
      const sections = targetSection ? [targetSection] : document.querySelectorAll(".portfolio-section");
      
      sections.forEach(section => {
        // Move up button
        const moveUpBtn = section.querySelector(".move-up-btn");
        if (moveUpBtn) {
          moveUpBtn.addEventListener("click", function() {
            moveSection(section, "up");
          });
        }
        
        // Move down button
        const moveDownBtn = section.querySelector(".move-down-btn");
        if (moveDownBtn) {
          moveDownBtn.addEventListener("click", function() {
            moveSection(section, "down");
          });
        }
        
        // Remove button
        const removeBtn = section.querySelector(".remove-section-btn");
        if (removeBtn) {
          removeBtn.addEventListener("click", function() {
            if (confirm("Are you sure you want to remove this section?")) {
              removeSection(section);
            }
          });
        }
        
        // Section title click for settings
        const sectionTitle = section.querySelector(".section-title");
        if (sectionTitle && isEditMode) {
          sectionTitle.addEventListener("click", function(event) {
            // Only open settings if in edit mode and not editing other content
            if (isEditMode && !event.target.hasAttribute("contenteditable")) {
              openSectionSettings(section);
            }
          });
        }
      });
    }
    
    // Move section up or down
    function moveSection(section, direction) {
      const mainContainer = document.querySelector("main.container");
      const sections = Array.from(mainContainer.querySelectorAll(".portfolio-section"));
      const index = sections.indexOf(section);
      
      if (direction === "up" && index > 0) {
        // Move up
        mainContainer.insertBefore(section, sections[index - 1]);
      } else if (direction === "down" && index < sections.length - 1) {
        // Move down - need to insert after the next element
        if (index + 2 < sections.length) {
          mainContainer.insertBefore(section, sections[index + 2]);
        } else {
          mainContainer.appendChild(section);
        }
      }
      
      // Update order
      updateSectionOrder();
      
      // Update navigation
      updatePortfolioNavigation();
    }
    
    // Remove section
    function removeSection(section) {
      section.classList.add("removing");
      
      // Wait for animation to complete
      setTimeout(() => {
        section.remove();
        
        // Update order
        updateSectionOrder();
        
        // Update navigation
        updatePortfolioNavigation();
        
        // Check if empty state should be shown
        checkEmptyPortfolio();
        
        // Save the updated data to localStorage
        portfolioData = gatherPortfolioData();
        localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
        
        console.log("Section removed and saved to localStorage");
      }, 500);
    }
    
    // Update section order array
    function updateSectionOrder() {
      const sections = document.querySelectorAll(".portfolio-section");
      sectionOrder = Array.from(sections).map(section => ({
        id: section.id,
        type: section.dataset.sectionType,
        title: section.querySelector(".section-title").textContent,
        visible: !section.classList.contains("hidden")
      }));
      
      // Save updated section order to localStorage
      const currentData = localStorage.getItem('portfolioData');
      if (currentData) {
        try {
          const data = JSON.parse(currentData);
          data.sections = sectionOrder;
          localStorage.setItem('portfolioData', JSON.stringify(data));
          console.log("Section order updated in localStorage:", sectionOrder);
        } catch (error) {
          console.error("Error updating section order in localStorage:", error);
        }
      }
    }
    
    // Update portfolio navigation
    function updatePortfolioNavigation() {
      const portfolioNav = document.querySelector(".portfolio-nav");
      const sections = document.querySelectorAll(".portfolio-section");
      
      // Clear current navigation
      portfolioNav.innerHTML = "";
      
      // Add navigation items for each visible section
      sections.forEach(section => {
        if (!section.classList.contains("hidden")) {
          const navItem = document.createElement("a");
          navItem.href = `#${section.id}`;
          navItem.className = "portfolio-nav-item";
          navItem.textContent = section.querySelector(".section-title").textContent;
          
          // Add active class to first item by default
          if (portfolioNav.children.length === 0) {
            navItem.classList.add("active");
          }
          
          // Add click handler for smooth scrolling
          navItem.addEventListener("click", function(e) {
      e.preventDefault();

      // Remove active class from all links
            document.querySelectorAll(".portfolio-nav-item").forEach(item => item.classList.remove("active"));

      // Add active class to clicked link
      this.classList.add("active");

      // Smooth scroll to target section
            const targetSection = document.querySelector(this.getAttribute("href"));
      if (targetSection) {
        scrollToElement(targetSection);
      }
    });
          
          portfolioNav.appendChild(navItem);
        }
      });
    }
    
    // Open reorder sections modal
    function openReorderModal() {
      reorderSectionsModal.classList.add("active");
      modalBackdrop.classList.add("active");
      
      // Populate the section order list
      populateSectionOrderList();
      
      // Make the list sortable
      makeListSortable();
    }
    
    // Close reorder modal
    function closeReorderModal() {
      reorderSectionsModal.classList.remove("active");
      modalBackdrop.classList.remove("active");
    }
    
    // Populate section order list
    function populateSectionOrderList() {
      const sections = document.querySelectorAll(".portfolio-section");
      sectionOrderList.innerHTML = "";
      
      sections.forEach(section => {
        const li = document.createElement("li");
        li.className = "section-order-item";
        li.dataset.sectionId = section.id;
        
        li.innerHTML = `
          <div class="section-order-handle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="section-order-title">${section.querySelector(".section-title").textContent}</div>
          <div class="section-order-visibility">
            <span>Visible</span>
            <label class="section-visibility-toggle">
              <input type="checkbox" ${!section.classList.contains("hidden") ? "checked" : ""}>
              <span class="section-visibility-slider"></span>
            </label>
          </div>
        `;
        
        sectionOrderList.appendChild(li);
      });
      
      // Add visibility toggle functionality
      const toggles = sectionOrderList.querySelectorAll(".section-visibility-toggle input");
      toggles.forEach(toggle => {
        toggle.addEventListener("change", function() {
          const sectionId = this.closest(".section-order-item").dataset.sectionId;
          const section = document.getElementById(sectionId);
          
          if (this.checked) {
            section.classList.remove("hidden");
          } else {
            section.classList.add("hidden");
          }
        });
      });
    }
    
    // Make order list sortable
    function makeListSortable() {
      let draggedItem = null;
      
      const items = sectionOrderList.querySelectorAll(".section-order-item");
      
      items.forEach(item => {
        // Make handle trigger drag
        const handle = item.querySelector(".section-order-handle");
        
        handle.addEventListener("mousedown", () => {
          item.setAttribute("draggable", "true");
        });
        
        handle.addEventListener("mouseup", () => {
          item.removeAttribute("draggable");
        });
        
        // Handle drag start
        item.addEventListener("dragstart", function() {
          draggedItem = this;
          setTimeout(() => {
            this.classList.add("dragging");
          }, 0);
        });
        
        // Handle drag end
        item.addEventListener("dragend", function() {
          draggedItem = null;
          this.classList.remove("dragging");
          this.removeAttribute("draggable");
        });
        
        // Handle drag over
        item.addEventListener("dragover", function(e) {
          e.preventDefault();
          if (draggedItem !== this) {
            const boundingRect = this.getBoundingClientRect();
            const offset = boundingRect.y + (boundingRect.height / 2);
            
            if (e.clientY - offset > 0) {
              if (this.nextSibling !== draggedItem) {
                sectionOrderList.insertBefore(draggedItem, this.nextSibling);
              }
            } else {
              if (this !== draggedItem) {
                sectionOrderList.insertBefore(draggedItem, this);
              }
            }
          }
        });
      });
    }
    
    // Save new section order
    function saveNewSectionOrder() {
      const newOrder = [];
      const items = sectionOrderList.querySelectorAll(".section-order-item");
      
      // Get new order and visibility from the list
      items.forEach(item => {
        newOrder.push({
          id: item.dataset.sectionId,
          visible: item.querySelector(".section-visibility-toggle input").checked
        });
      });
      
      // Reorder the actual sections
      const mainContainer = document.querySelector("main.container");
      const sections = Array.from(document.querySelectorAll(".portfolio-section"));
      
      // Sort sections according to new order
      newOrder.forEach(entry => {
        const section = document.getElementById(entry.id);
        if (section) {
          // Update visibility
          if (entry.visible) {
            section.classList.remove("hidden");
          } else {
            section.classList.add("hidden");
          }
          
          // Move to end of container to maintain order
          mainContainer.appendChild(section);
        }
      });
      
      // Update stored section order
      updateSectionOrder();
      
      // Update navigation
      updatePortfolioNavigation();
      
      // Save the updated data to localStorage
      portfolioData = gatherPortfolioData();
      localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
      console.log("Section order saved to localStorage");
      
      // Close modal
      closeReorderModal();
    }
    
    // Open section settings
    function openSectionSettings(section) {
      currentEditingSection = section;
      sectionSettingsModal.classList.add("active");
      modalBackdrop.classList.add("active");
      
      // Populate settings
      sectionTitleInput.value = section.querySelector(".section-title").textContent;
      sectionIconSelect.value = section.dataset.sectionType || "custom";
    }
    
    // Close section settings modal
    function closeSectionSettingsModal() {
      sectionSettingsModal.classList.remove("active");
      modalBackdrop.classList.remove("active");
      currentEditingSection = null;
    }
    
    // Save section settings
    function saveSectionSettings() {
      if (!currentEditingSection) return;
      
      // Update section title
      const title = sectionTitleInput.value.trim();
      if (title) {
        currentEditingSection.querySelector(".section-title").textContent = title;
      }
      
      // Update section icon type
      const iconType = sectionIconSelect.value;
      currentEditingSection.dataset.sectionType = iconType;
      
      // Update section ID if needed to match type
      if (!currentEditingSection.id.startsWith(iconType)) {
        const timestamp = new Date().getTime();
        currentEditingSection.id = `${iconType}_${timestamp}`;
      }
      
      // Update navigation
      updatePortfolioNavigation();
      
      // Update section order
      updateSectionOrder();
      
      // Save the updated data to localStorage
      portfolioData = gatherPortfolioData();
      localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
      console.log("Section settings saved to localStorage");
      
      // Close modal
      closeSectionSettingsModal();
    }
    
    // Check if portfolio is empty and show empty state if needed
    function checkEmptyPortfolio() {
      const sections = document.querySelectorAll(".portfolio-section");
      const mainContainer = document.querySelector("main.container");
      
      if (sections.length === 0) {
        // Create empty state
        const emptyState = document.createElement("div");
        emptyState.className = "empty-portfolio-state";
        emptyState.innerHTML = `
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 18.5V19.5M7 3H17C18.1046 3 19 3.89543 19 5V21H5V5C5 3.89543 5.89543 3 7 3ZM5 8H19H5ZM8 11.5H16H8ZM8 15H13H8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h3>Your portfolio is empty</h3>
          <p>Add sections to showcase your skills, experience, and projects.</p>
          <button class="section-control-btn add-section-btn" id="emptyStateAddButton">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Add Section
          </button>
        `;
        
        mainContainer.appendChild(emptyState);
        
        // Add event listener to add button
        document.getElementById("emptyStateAddButton").addEventListener("click", openAddSectionModal);
      } else {
        // Remove empty state if it exists
        const emptyState = document.querySelector(".empty-portfolio-state");
        if (emptyState) {
          emptyState.remove();
        }
      }
    }

    // Get current user from Supabase
    async function getCurrentUser() {
      if (!supabase) return null;
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error("Error getting user:", error);
          return null;
        }
        
        return user;
      } catch (error) {
        console.error("Error getting user:", error);
        return null;
      }
    }
    
    // Save portfolio data to Supabase
    async function saveToSupabase(data) {
      if (!supabase) return { success: false, error: "Supabase not initialized" };
      
      try {
        const user = await getCurrentUser();
        
        if (!user) {
          return { success: false, error: "Not authenticated" };
        }
        
        // Add user ID to data
        data.user_id = user.id;
        
        // Check if user already has a portfolio entry
        const { data: existingData, error: fetchError } = await supabase
          .from("portfolios")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        if (fetchError && fetchError.code !== "PGRST116") {
          // Some error other than "not found"
          return { success: false, error: fetchError };
        }
        
        let result;
        
        if (existingData) {
          // Update existing portfolio
          result = await supabase
            .from("portfolios")
            .update({ data: data })
            .eq("user_id", user.id);
        } else {
          // Insert new portfolio
          result = await supabase
            .from("portfolios")
            .insert([{ user_id: user.id, data: data }]);
        }
        
        if (result.error) {
          throw result.error;
        }
        
        return { success: true };
      } catch (error) {
        console.error("Error saving to Supabase:", error);
        return { success: false, error };
      }
    }

    // Show save notification
    function showSaveNotification(message = "Changes saved successfully!") {
      const saveNotification = document.querySelector(".save-notification");
      const messageElement = saveNotification.querySelector(".save-notification-text");
      
      messageElement.textContent = message;
      saveNotification.classList.add("show");
      
      setTimeout(() => {
        saveNotification.classList.remove("show");
      }, 3000);
    }

    // Update profile timestamp
    function updateProfileTimestamp() {
      // Add current timestamp for tracking updates
      portfolioData.updated_at = new Date().toISOString();
      
      // Track update in localStorage even if we're not saving the whole object yet
      const metadata = JSON.parse(localStorage.getItem('portfolioMetadata') || '{}');
      metadata.last_modified = new Date().toISOString();
      localStorage.setItem('portfolioMetadata', JSON.stringify(metadata));
    }
  }

  // Handle skill tag clicks
  const skillTags = document.querySelectorAll(".skill-tag");

  skillTags.forEach((tag) => {
    tag.addEventListener("click", function () {
      // Toggle active class
      this.classList.toggle("active");
    });
  });

  // Connect button smooth scrolling
  const connectButtons = document.querySelectorAll(
    '.connect-button, a[href="#contact"]'
  );

  connectButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const contactSection = document.getElementById("contact");
      if (contactSection) {
        scrollToElement(contactSection);
      }
    });
  });

  // Handle form submission with improved validation
  const contactForm = document.querySelector(".contact-form");

  if (contactForm) {
    // Create feedback elements for form validation
    const createFeedbackElement = (inputId) => {
      const input = document.getElementById(inputId);
      const feedbackEl = document.createElement("div");
      feedbackEl.className = "form-feedback";
      feedbackEl.setAttribute("aria-live", "polite");
      input.parentNode.appendChild(feedbackEl);
      return feedbackEl;
    };

    // Create feedback elements for each required field
    const nameFeedback = createFeedbackElement("name");
    const emailFeedback = createFeedbackElement("email");
    const messageFeedback = createFeedbackElement("message");

    // Add input validation as user types
    const validateInput = (input, feedbackEl, validationFn) => {
      input.addEventListener("blur", function () {
        const isValid = validationFn(input.value);
        if (!isValid && input.value.trim() !== "") {
          feedbackEl.textContent = `Please enter a valid ${input.placeholder.toLowerCase()}`;
          feedbackEl.className = "form-feedback error";
          input.setAttribute("aria-invalid", "true");
        } else {
          feedbackEl.textContent = "";
          feedbackEl.className = "form-feedback";
          input.removeAttribute("aria-invalid");
        }
      });

      // Clear error on input
      input.addEventListener("input", function () {
        feedbackEl.textContent = "";
        feedbackEl.className = "form-feedback";
        input.removeAttribute("aria-invalid");
      });
    };

    // Validation functions
    const validateName = (name) => name.trim().length >= 2;
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validateMessage = (message) => message.trim().length >= 10;

    // Set up validation for each field
    validateInput(document.getElementById("name"), nameFeedback, validateName);
    validateInput(
      document.getElementById("email"),
      emailFeedback,
      validateEmail
    );
    validateInput(
      document.getElementById("message"),
      messageFeedback,
      validateMessage
    );

    // Handle form submission
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Get form values
      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const subject = document.getElementById("subject").value;
      const message = document.getElementById("message").value;

      // Validate all fields
      let isValid = true;

      if (!validateName(name)) {
        nameFeedback.textContent = "Please enter your name (min 2 characters)";
        nameFeedback.className = "form-feedback error";
        document.getElementById("name").setAttribute("aria-invalid", "true");
        isValid = false;
      }

      if (!validateEmail(email)) {
        emailFeedback.textContent = "Please enter a valid email address";
        emailFeedback.className = "form-feedback error";
        document.getElementById("email").setAttribute("aria-invalid", "true");
        isValid = false;
      }

      if (!validateMessage(message)) {
        messageFeedback.textContent =
          "Please enter a message (min 10 characters)";
        messageFeedback.className = "form-feedback error";
        document.getElementById("message").setAttribute("aria-invalid", "true");
        isValid = false;
      }

      if (isValid) {
        // Create success notification
        const successNotification = document.createElement("div");
        successNotification.className = "form-notification success";
        successNotification.setAttribute("role", "alert");
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
          successNotification.classList.add("fade-out");
          setTimeout(() => {
            contactForm.removeChild(successNotification);
          }, 500);
        }, 5000);

        // In a real app, this would send data to the server
        console.log({
          name,
          email,
          subject,
          message,
        });
      } else {
        // Scroll to the first error
        const firstError = document.querySelector(".form-feedback.error");
        if (firstError) {
          const inputWithError = firstError.previousElementSibling;
          inputWithError.focus();
          window.scrollTo({
            top: firstError.offsetTop - 100,
            behavior: "smooth",
          });
        }
      }
    });
  }

  // Animate skill bars on scroll
  const animateSkillBars = () => {
    const skillBars = document.querySelectorAll(".skill-progress-bar");

    skillBars.forEach((bar) => {
      const parent = bar.parentElement;
      const progress = parent.getAttribute("data-progress");

      if (isElementInViewport(parent)) {
        bar.style.width = progress + "%";
        bar.style.opacity = "1";
      }
    });
  };

  // Check if element is in viewport
  const isElementInViewport = (el) => {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };

  // Helper function for smooth scrolling
  function scrollToElement(element) {
    window.scrollTo({
      top: element.offsetTop - 100,
      behavior: "smooth",
    });
  }

  // Run animation check on scroll
  window.addEventListener("scroll", animateSkillBars);

  // Run once on page load
  animateSkillBars();

  // Handle mobile navigation
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      if (item.getAttribute("aria-label").toLowerCase() === "connect") {
        e.preventDefault();
        const contactSection = document.getElementById("contact");
        if (contactSection) {
          scrollToElement(contactSection);
        }
      }

      // Visual feedback
      navItems.forEach((navItem) => navItem.classList.remove("active"));
      item.classList.add("active");
    });
  });

  // Enable intersection observer for scroll animations
  if ("IntersectionObserver" in window) {
    // Create observers for elements that should animate on scroll
    const fadeInElements = document.querySelectorAll(".portfolio-section");

    const fadeInObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in-visible");
            fadeInObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    fadeInElements.forEach((element) => {
      element.classList.add("fade-in");
      fadeInObserver.observe(element);
    });
  }

  async function loadPortfolioHeader() {
    // Get the logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch profile from Supabase (only full_name, no location)
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error loading profile:', error);
        return;
    }

    // Set avatar circle to first letter of full name
    const initials = (profile?.full_name || user.email || 'U')[0].toUpperCase();
    document.querySelector('.avatar.large').textContent = initials;

    // Set name to full name
    document.querySelector('.portfolio-title').textContent = profile?.full_name || 'CS Student';

    // Set email to user's email
    document.querySelector('[data-field="email"]').textContent = user.email;

    // Set location to a static value for now
    document.querySelector('[data-field="location"]').textContent = 'Location';

    // Do not make title editable by default
    // This will be handled by the edit mode toggle
  }

  // Call it directly, since we're already inside DOMContentLoaded
  loadPortfolioHeader();

  // --- FEATURED PROJECTS SECTION ---
  async function loadFeaturedProjects() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch up to 3 most recent projects for the user
        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(3);

        if (error) throw error;

        const projectsContainer = document.getElementById('projectsContainer');
        projectsContainer.innerHTML = '';

        if (!projects || projects.length === 0) {
            // Show empty state if no projects
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = `<h2>No Featured Projects</h2><p>Add a project to feature it here!</p>`;
            projectsContainer.appendChild(empty);
            return;
        }

        // Only show up to 3 projects
        (projects.slice(0, 3)).forEach(project => {
            const card = createFeaturedProjectCard(project);
            projectsContainer.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading featured projects:', error);
    }
  }

  function createFeaturedProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';

    // Thumbnail
    const thumb = document.createElement('div');
    thumb.className = 'project-thumb';
    if (project.photo_url) {
        const img = document.createElement('img');
        img.src = project.photo_url;
        img.alt = project.title;
        thumb.appendChild(img);
    } else {
        thumb.style.background = '#e5e7eb';
    }

    // Title
    const title = document.createElement('div');
    title.className = 'project-title';
    title.textContent = project.title;

    // Languages
    const langs = document.createElement('div');
    langs.className = 'project-languages';
    (project.languages || []).forEach(lang => {
        const tag = document.createElement('span');
        tag.className = 'language-tag';
        tag.textContent = lang;
        langs.appendChild(tag);
    });

    card.appendChild(thumb);
    card.appendChild(title);
    card.appendChild(langs);

    return card;
  }

  // Load featured projects when the page loads
  loadFeaturedProjects();

  // === City Display from Supabase and Geolocation ===
  const locationSpan = document.getElementById('location-info');
  if (locationSpan && window.supabase) {
    // Step 4: Show city from Supabase profile on load
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('city')
          .eq('id', user.id)
          .single();
        if (profile && profile.city) {
          locationSpan.textContent = profile.city;
        }
      }
    });
  }

  if (locationSpan && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const apiKey = '6ed586b1c42a40068db9fc04056a9c90';
      const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        const components = data.results[0].components;
        const city = components.city || components.town || components.village || components.county || 'Unknown';
        locationSpan.textContent = city;
        // Save city to Supabase profile only if changed
        if (window.supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('city')
              .eq('id', user.id)
              .single();
            if (!profile || profile.city !== city) {
              await supabase
                .from('profiles')
                .update({ city })
                .eq('id', user.id);
            }
          }
        }
      } catch (err) {
        locationSpan.textContent = 'City unavailable';
      }
    }, (err) => {
      locationSpan.textContent = 'Location unavailable';
    });
  }

  // Function to update location in Supabase
  async function updateLocation() {
    const locationSpan = document.getElementById('location-info');
    if (locationSpan && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const apiKey = '6ed586b1c42a40068db9fc04056a9c90';
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`;
        try {
          const res = await fetch(url);
          const data = await res.json();
          const components = data.results[0].components;
          const city = components.city || components.town || components.village || components.county || 'Unknown';
          locationSpan.textContent = city;
          
          // Save city to Supabase profile
          if (window.supabase) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from('profiles')
                .update({ city })
                .eq('id', user.id);
            }
          }
        } catch (err) {
          locationSpan.textContent = 'City unavailable';
        }
      }, (err) => {
        locationSpan.textContent = 'Location unavailable';
      });
    }
  }

  // Modify the saveProfile function to include location update
  async function saveProfile() {
    const savingIndicator = document.getElementById('savingIndicator');
    savingIndicator.style.display = 'flex';
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = 'login.html';
        return;
      }

      // Get all editable content
      const editableContent = document.querySelectorAll('.editable-content');
      const updates = {};
      
      editableContent.forEach(element => {
        const field = element.getAttribute('data-field');
        if (field) {
          updates[field] = element.textContent;
        }
      });

      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Update location
      await updateLocation();

      // Show success message
      showMessage('Profile updated successfully!', 'success');
      
      // Exit edit mode
      exitEditMode();
    } catch (error) {
      console.error('Error saving profile:', error);
      showMessage('Error saving profile. Please try again.', 'error');
    } finally {
      savingIndicator.style.display = 'none';
    }
  }
});
