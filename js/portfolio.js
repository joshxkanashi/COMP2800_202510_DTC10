import { supabase } from './supabaseAPI.js';

// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Import Supabase client
  let supabaseLoaded = false;

  // Try importing Supabase
  import("./supabaseAPI.js")
    .then((module) => {
      const supabase = module.supabase;
      if (supabase) {
        console.log("Supabase client successfully imported");
        supabaseLoaded = true;
      initializePortfolio(supabase);
      } else {
        console.error("Error: Supabase module imported but client is undefined");
        initializePortfolio(null);
      }
    })
    .catch((error) => {
      console.error("Error importing Supabase:", error);
      // Initialize without Supabase for fallback
      initializePortfolio(null);
    });

  // Safety timeout - if Supabase doesn't load in 3 seconds, initialize without it
  setTimeout(() => {
    if (!supabaseLoaded) {
      console.warn("Supabase client didn't load in time, initializing without it");
      initializePortfolio(null);
    }
  }, 3000);

  function initializePortfolio(supabase) {
    // Check if portfolio is already initialized
    if (window.portfolioInitialized) {
      console.log("Portfolio already initialized, skipping");
      return;
    }
    window.portfolioInitialized = true;
    
    // Make sure Supabase is properly initialized or fallback to localStorage only
    if (supabase) {
      // Test the Supabase connection before proceeding
      supabase.auth.getSession()
        .then(response => {
          if (response.error) {
            console.error("Supabase session test failed:", response.error);
            console.warn("Continuing with localStorage only");
          } else {
            console.log("Supabase connection verified");
          }
        })
        .catch(error => {
          console.error("Error testing Supabase connection:", error);
          console.warn("Continuing with localStorage only");
        });
    } else {
      console.warn("Supabase not available, using localStorage only");
    }

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
      if (!supabase) {
        console.warn("Supabase client not available, skipping load from Supabase");
        return null;
      }
      
      try {
        console.log("Attempting to load data from Supabase...");
        const user = await getCurrentUser();
        
        if (!user) {
          console.log("Not authenticated, can't load from Supabase");
          return null;
        }
        
        console.log("User authenticated, querying portfolios table...");
        
        // Check if portfolios table exists by attempting to fetch
        // Use .maybeSingle() to ensure we only get one result, even if multiple exist
          const { data, error } = await supabase
            .from("portfolios")
          .select("data")
            .eq("user_id", user.id)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors if no rows exist
        
        if (error) {
          console.warn("Error querying portfolios:", error);
          
          // Check for specific error codes
          if (error.code === "PGRST116" || error.code === "406") {
            console.log("No portfolio found for this user, creating new one");
            // Create default portfolio data
            const defaultData = {
              updated_at: new Date().toISOString(),
              name: user.email?.split('@')[0] || 'CS Student',
              title: "Full Stack Developer & Computer Science Enthusiast",
              location: "City, Country",
              email: user.email,
              about1: "I'm a passionate Computer Science student with a strong interest in web development, artificial intelligence, and cybersecurity.",
              about2: "When I'm not coding, you can find me exploring new technologies, contributing to open-source projects, or mentoring junior developers."
            };
            
            // Insert a new portfolio for this user (use upsert to avoid duplicates)
            // IMPORTANT: Ensure you have a unique constraint on user_id in the Supabase table:
            // ALTER TABLE portfolios ADD CONSTRAINT unique_user_id UNIQUE (user_id);
            const { error: insertError } = await supabase
              .from("portfolios")
              .upsert([{ 
                user_id: user.id,
                data: defaultData
              }], { onConflict: ["user_id"] });
              
            if (insertError) {
              // Handle errors when inserting
              console.error("Error creating portfolio:", insertError);
              
              if (insertError.code === "42703") {
                console.error("The portfolios table might be missing the data column");
              }
              
              return null;
            }
            
            console.log("New portfolio created successfully");
            return defaultData;
          } else if (error.code === "42703") {
            // This is likely a column error
            console.error("Column not found - The portfolios table might be missing the data column");
            return null;
          } else if (error.code === "PGRST115") {
            // Multiple results found when single was expected
            console.warn("Multiple portfolio entries found for this user. Trying to get the first one.");
            
            // Try again without using .single()
            const { data: multiData, error: multiError } = await supabase
              .from("portfolios")
              .select("data")
              .eq("user_id", user.id)
              .limit(1);
              
            if (multiError) {
              console.error("Error getting first portfolio:", multiError);
              return null;
            }
            
            if (multiData && multiData.length > 0 && multiData[0].data) {
              console.log("Successfully retrieved first portfolio entry");
              return multiData[0].data;
            }
          }
          
          console.error("Unhandled error querying portfolios:", error);
          return null;
        }
        
        if (data && data.data) {
          console.log("Portfolio data successfully loaded from Supabase");
          return data.data;
        }
        
        console.log("No portfolio data found in Supabase response");
        return null;
      } catch (error) {
        console.error("Error loading from Supabase:", error);
        
        // Check if it's a connection error
        if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('Network error'))) {
          console.error("Supabase connection error. Please check your internet connection.");
        }
        
        // Check if it's a permission error
        if (error.code && (error.code === '42501' || error.code === '42403')) {
          console.error("Permission denied. Check your Supabase Row Level Security policies.");
        }
        
        return null;
      }
    }
    
    // Initialize portfolio data from Supabase only
    async function initializePortfolioData() {
      // Show loading indicator
      showSavingIndicator("Loading profile...");
      
      try {
        // Only load from Supabase
        if (supabase) {
          const supabaseData = await loadFromSupabase();
          console.log("Portfolio data loaded from Supabase:", supabaseData);
          
          if (supabaseData) {
            // If we have Supabase data, use it
            portfolioData = supabaseData;
          } else {
            // Initialize with default data for new users
            portfolioData = {
              title: "Enter Your Professional Title",
              about1: "Write a brief introduction about yourself...",
              about2: "Share more about your interests and expertise...",
              skills: [
                {
                  id: "skill1",
                  name: "Enter Skill",
                  level: "Select Level",
                  progress: "0"
                }
              ],
              sections: [
                { id: "about", type: "about", title: "About Me", visible: true },
                { id: "education", type: "education", title: "Education", visible: true },
                { id: "skills", type: "skills", title: "Technical Skills", visible: true },
                { id: "experience", type: "experience", title: "Work Experience", visible: true },
                { id: "projects", type: "projects", title: "Featured Projects", visible: true }
              ],
              education: [
                {
                  id: "edu1",
                  date: "Enter Date",
                  degree: "Enter Degree/Certificate",
                  school: "Enter Institution Name",
                  description: "Describe your education..."
                }
              ],
              experience: [
                {
                  id: "exp1",
                  date: "Enter Date",
                  title: "Enter Job Title",
                  company: "Enter Company Name",
                  description: "Describe your role and responsibilities..."
                }
              ],
              skill_cat1: "Enter Skill Category",
              skill_cat2: "Enter Another Category",
              education_summary: "Enter your latest education",
              project_new1_link: "Project URL",
              project_new1_title: "Enter Project Title",
              project_new1_github: "GitHub URL",
              project_new1_description: "Enter project description..."
            };
            console.log("Initialized with default portfolio data for new user");
          }
        } else {
          // Supabase not available - show error
          console.error("Supabase is not available. Unable to load portfolio data.");
          showSavingIndicator("Error: Unable to connect to database", "error");
          setTimeout(() => {
            hideSavingIndicator();
          }, 2000);
          return Promise.reject(new Error("Supabase not available"));
        }
        
        // Add current timestamp for future comparisons
        portfolioData.updated_at = new Date().toISOString();
        
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
        showSavingIndicator("Error loading profile", "error");
        setTimeout(() => {
        hideSavingIndicator();
        }, 2000);
        return Promise.reject(error);
      }
    }

    // Render portfolio data from localStorage or Supabase
    function renderPortfolioData() {
      // Exit if no data
      if (!portfolioData || Object.keys(portfolioData).length === 0) return;

      // --- Dynamically Render Sections ---
      const mainContainer = document.querySelector('main.container');
      const existingSections = Array.from(document.querySelectorAll('.portfolio-section'));
      const sectionIds = portfolioData.sections ? portfolioData.sections.map(s => s.id) : [];

      // Remove sections not in the data
      existingSections.forEach(section => {
        if (!sectionIds.includes(section.id)) {
          section.remove();
        }
      });

      // Add or update sections from the data
      if (portfolioData.sections && Array.isArray(portfolioData.sections)) {
        portfolioData.sections.forEach(sectionData => {
          let section = document.getElementById(sectionData.id);
          if (!section) {
            section = document.createElement('section');
            section.id = sectionData.id;
            section.className = 'portfolio-section';
            section.dataset.sectionType = sectionData.type;
            let templateHTML = '';
            if (sectionData.type === 'custom') {
              templateHTML = `<div class=\"custom-section-content editable-content\" data-field=\"${sectionData.id}_content\">${sectionData.content || ''}</div>`;
            } else if (sectionTemplateHTML && sectionTemplateHTML[sectionData.type]) {
              templateHTML = sectionTemplateHTML[sectionData.type];
            }
            section.innerHTML = `
              <div class="section-header">
                <h2 class="section-title">${sectionData.title}</h2>
                <div class="section-actions"></div>
              </div>
              ${templateHTML}
            `;
            // Insert in correct order
            // Find the next section in the order
            let nextSection = null;
            for (let i = sectionIds.indexOf(sectionData.id) + 1; i < sectionIds.length; i++) {
              nextSection = document.getElementById(sectionIds[i]);
              if (nextSection) break;
            }
            if (nextSection) {
              mainContainer.insertBefore(section, nextSection);
            } else {
              mainContainer.appendChild(section);
            }
          } else {
            // Update title/type
            const titleEl = section.querySelector('.section-title');
            if (titleEl) titleEl.textContent = sectionData.title;
            section.dataset.sectionType = sectionData.type;
            if (sectionData.type === 'custom') {
              const customContent = section.querySelector('.custom-section-content');
              if (customContent) customContent.innerHTML = sectionData.content || '';
            }
          }
          // Set visibility
          if (sectionData.visible === false) {
            section.classList.add('hidden');
          } else {
            section.classList.remove('hidden');
          }

          // Ensure section-actions has the three buttons (move up, move down, remove)
          const actionsDiv = section.querySelector('.section-actions');
          if (actionsDiv && actionsDiv.children.length < 3) {
            actionsDiv.innerHTML = `
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
            `;
          }
        });
      }

      // Update each editable element based on field (for about, meta, etc.)
      const editableElements = document.querySelectorAll('.editable-content');
      editableElements.forEach((element) => {
        const field = element.dataset.field;
        if (field && portfolioData[field]) {
          element.textContent = portfolioData[field];
        }
      });

      // --- Render Education Timeline ---
      const educationTimeline = document.getElementById('educationTimeline');
      if (educationTimeline && Array.isArray(portfolioData.education)) {
        educationTimeline.innerHTML = '';
        portfolioData.education.forEach(edu => {
          const item = document.createElement('div');
          item.className = 'timeline-item';
          item.dataset.itemId = edu.id;
          item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-date editable-content" data-field="${edu.id}_date">${edu.date || ''}</div>
            <div class="timeline-content">
              <h3 class="timeline-title editable-content" data-field="${edu.id}_degree">${edu.degree || ''}</h3>
              <p class="timeline-subtitle editable-content" data-field="${edu.id}_school">${edu.school || ''}</p>
              <p class="timeline-description editable-content" data-field="${edu.id}_description">${edu.description || ''}</p>
            </div>
          `;
          educationTimeline.appendChild(item);
        });
      }
      // Update hero education summary to match most recent timeline entry
      const heroEducation = document.querySelector('[data-field="education"]');
      if (Array.isArray(portfolioData.education) && portfolioData.education.length > 0) {
        const latest = portfolioData.education[0];
        portfolioData.education_summary = `${latest.degree} at ${latest.school}`;
        if (heroEducation) {
          heroEducation.textContent = portfolioData.education_summary;
        }
      } else {
        if (heroEducation) {
          heroEducation.textContent = 'Education not inputted';
        }
      }

      // --- Render Experience Timeline ---
      const experienceTimeline = document.getElementById('experienceTimeline');
      if (experienceTimeline && Array.isArray(portfolioData.experience)) {
        experienceTimeline.innerHTML = '';
        portfolioData.experience.forEach(exp => {
          const item = document.createElement('div');
          item.className = 'timeline-item';
          item.dataset.itemId = exp.id;
          item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-date editable-content" data-field="${exp.id}_date">${exp.date || ''}</div>
            <div class="timeline-content">
              <h3 class="timeline-title editable-content" data-field="${exp.id}_title">${exp.title || ''}</h3>
              <p class="timeline-subtitle editable-content" data-field="${exp.id}_company">${exp.company || ''}</p>
              <p class="timeline-description editable-content" data-field="${exp.id}_description">${exp.description || ''}</p>
            </div>
          `;
          experienceTimeline.appendChild(item);
        });
      }

      // --- Render Skills ---
      const skillsGrid1 = document.getElementById('skillsGrid1');
      const skillsGrid2 = document.getElementById('skillsGrid2');
      if (Array.isArray(portfolioData.skills)) {
        if (skillsGrid1) skillsGrid1.innerHTML = '';
        if (skillsGrid2) skillsGrid2.innerHTML = '';
        // Split skills into two categories if possible
        portfolioData.skills.forEach((skill, idx) => {
          const item = document.createElement('div');
          item.className = 'skill-item';
          item.dataset.itemId = skill.id;
          item.innerHTML = `
            <div class="skill-progress" data-progress="${skill.progress || 0}">
              <div class="skill-progress-bar" style="width: ${skill.progress || 0}%"></div>
            </div>
            <div class="skill-info">
              <span class="skill-name editable-content" data-field="${skill.id}_name">${skill.name || ''}</span>
              <span class="skill-level editable-content" data-field="${skill.id}_level">${skill.level || ''}</span>
            </div>
          `;
          // Distribute to grid1 or grid2 based on index (or your own logic)
          if (skillsGrid1 && idx < 4) skillsGrid1.appendChild(item);
          else if (skillsGrid2) skillsGrid2.appendChild(item);
        });
      }

      // --- Render Projects ---
      // const projectsContainer = document.getElementById('projectsContainer');
      // if (projectsContainer && Array.isArray(portfolioData.projects)) {
      //   projectsContainer.innerHTML = '';
      //   portfolioData.projects.forEach(proj => {
      //     const card = document.createElement('div');
      //     card.className = 'portfolio-project-card';
      //     card.dataset.itemId = proj.id;
      //     card.innerHTML = `
      //       <div class="portfolio-project-image">
      //         <span class="project-badge editable-content" data-field="${proj.id}_badge">${proj.badge || ''}</span>
      //         <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      //           <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="#e5e7eb"/>
      //         </svg>
      //       </div>
      //       <div class="portfolio-project-content">
      //         <h3 class="portfolio-project-title editable-content" data-field="${proj.id}_title">${proj.title || ''}</h3>
      //         <p class="portfolio-project-description editable-content" data-field="${proj.id}_description">${proj.description || ''}</p>
      //         <div class="portfolio-project-tech" data-project="${proj.id}">
      //           ${(proj.tech || []).map(tag => `<span class="tech-tag" data-tag="${tag}">${tag}</span>`).join('')}
      //         </div>
      //         <div class="portfolio-project-links">
      //           <a href="#" class="project-link editable-content" data-field="${proj.id}_link">${proj.link || 'View Project'}</a>
      //           <a href="#" class="project-link editable-content" data-field="${proj.id}_github">${proj.github || 'GitHub'}</a>
      //         </div>
      //       </div>
      //     `;
      //     projectsContainer.appendChild(card);
      //   });
      // }
      // Instead, always fetch and render projects from Supabase
      loadFeaturedProjects();

      // Load avatar image if exists
      if (portfolioData.avatarImage) {
        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) {
          let avatarImg = profileAvatar.querySelector('img');
          if (!avatarImg) {
            avatarImg = document.createElement('img');
            profileAvatar.appendChild(avatarImg);
          }
          avatarImg.src = portfolioData.avatarImage;
        }
      }

      // Update skill progress bars (redundant, but ensures correct width)
      const skillItems = document.querySelectorAll('.skill-item');
      skillItems.forEach((item) => {
        const itemId = item.dataset.itemId;
        const progress = portfolioData[`${itemId}_progress`];
        if (progress) {
          const progressBar = item.querySelector('.skill-progress');
          progressBar.setAttribute('data-progress', progress);
          const progressBarFill = item.querySelector('.skill-progress-bar');
          progressBarFill.style.width = `${progress}%`;
        }
      });

      // Restore section order and navigation
      if (portfolioData.sections && Array.isArray(portfolioData.sections)) {
        sectionOrder = portfolioData.sections;
        updatePortfolioNavigation();
      }
      // If in edit mode, re-apply editable setup
      if (isEditMode) {
        makeEditableElementsEditable();
      }

      // Ensure all section action buttons are set up (fix for custom sections loaded from data)
      setupSectionActionButtons();
    }

    // Gather all current portfolio data
    function gatherPortfolioData() {
      const data = {};

      // --- Education Timeline ---
      data.education = [];
      const educationItems = document.querySelectorAll('#educationTimeline .timeline-item');
      educationItems.forEach(item => {
        const itemId = item.dataset.itemId;
        const edu = {
          id: itemId,
          date: item.querySelector('[data-field$="_date"]')?.textContent || '',
          degree: item.querySelector('[data-field$="_degree"]')?.textContent || '',
          school: item.querySelector('[data-field$="_school"]')?.textContent || '',
          description: item.querySelector('[data-field$="_description"]')?.textContent || ''
        };
        data[`$${itemId}_date`] = edu.date;
        data[`$${itemId}_degree`] = edu.degree;
        data[`$${itemId}_school`] = edu.school;
        data[`$${itemId}_description`] = edu.description;
        data.education.push(edu);
      });
      if (data.education.length > 0) {
        const latest = data.education[0];
        data.education_summary = `${latest.degree} at ${latest.school}`;
        const heroEducation = document.querySelector('[data-field="education"]');
        if (heroEducation) {
          heroEducation.textContent = data.education_summary;
        }
      }

      // --- Experience Timeline ---
      data.experience = [];
      const experienceItems = document.querySelectorAll('#experienceTimeline .timeline-item');
      experienceItems.forEach(item => {
        const itemId = item.dataset.itemId;
        const exp = {
          id: itemId,
          date: item.querySelector('[data-field$="_date"]')?.textContent || '',
          title: item.querySelector('[data-field$="_title"]')?.textContent || '',
          company: item.querySelector('[data-field$="_company"]')?.textContent || '',
          description: item.querySelector('[data-field$="_description"]')?.textContent || ''
        };
        data[`$${itemId}_date`] = exp.date;
        data[`$${itemId}_title`] = exp.title;
        data[`$${itemId}_company`] = exp.company;
        data[`$${itemId}_description`] = exp.description;
        data.experience.push(exp);
      });

      // --- Skills ---
      data.skills = [];
      const skillItems = document.querySelectorAll('.skill-item');
      skillItems.forEach(item => {
        const itemId = item.dataset.itemId;
        const name = item.querySelector('[data-field$="_name"]')?.textContent || '';
        const level = item.querySelector('[data-field$="_level"]')?.textContent || '';
        const progressBar = item.querySelector('.skill-progress');
        const progress = progressBar ? progressBar.getAttribute('data-progress') : '0';
        data[`$${itemId}_name`] = name;
        data[`$${itemId}_level`] = level;
        data[`$${itemId}_progress`] = progress;
        data.skills.push({ id: itemId, name, level, progress });
      });

      // --- Other editable fields (about, meta, etc.) ---
      const editableElements = document.querySelectorAll('.editable-content');
      editableElements.forEach((element) => {
        const field = element.dataset.field;
        if (field && !data.hasOwnProperty(field)) {
          data[field] = element.textContent;
        }
      });

      // Avatar image
      const avatarImg = document.querySelector('.avatar.large img');
      if (avatarImg && avatarImg.src) {
        data.avatarImage = avatarImg.src;
      }

      // Section order
      data.sections = sectionOrder.map(section => {
        if (section.type === 'custom') {
          // Get the current content from the DOM
          const customContentEl = document.querySelector(`#${section.id} .custom-section-content`);
          return {
            ...section,
            content: customContentEl ? customContentEl.innerHTML : section.content || ''
          };
        }
        return { ...section };
      });

      // --- Preserve featured_project_ids if present ---
      if (portfolioData && portfolioData.featured_project_ids) {
        data.featured_project_ids = [...portfolioData.featured_project_ids];
      }

      // Timestamp
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

    // Utility to make all editable elements and section titles editable
    function makeEditableElementsEditable() {
      // Make all .editable-content elements editable
      const editableElements = document.querySelectorAll('.editable-content');
      editableElements.forEach((element) => {
        element.setAttribute('contenteditable', 'true');
        element.setAttribute('spellcheck', 'true');
        // Add placeholder if empty
        if (element.textContent.trim() === '') {
          element.textContent = `Enter ${element.dataset.field || 'text'}...`;
          element.classList.add('edit-placeholder');
        }
        // Remove old listeners to avoid duplicates
        element.removeEventListener('focus', handleElementFocus);
        element.removeEventListener('blur', handleElementBlur);
        // Add listeners
        element.addEventListener('focus', handleElementFocus);
        element.addEventListener('blur', handleElementBlur);
      });
      // Do NOT make section titles editable anymore
    }

    // In enableEditMode, call makeEditableElementsEditable()
    function enableEditMode() {
      if (!isEditMode) {
        originalData = JSON.parse(JSON.stringify(gatherPortfolioData()));
        isEditMode = true;
        editProfileButton.classList.add('active');
        editControls.classList.add('active');
        document.body.classList.add('edit-mode');
        setupProfileAvatarEdit();
        makeEditableElementsEditable();
        // ... rest of enableEditMode ...
        addEducationButton.style.display = "flex";
        addExperienceButton.style.display = "flex";
        addSkill1Button.style.display = "flex";
        addSkill2Button.style.display = "flex";

              // Show manage featured projects button
        const addProjectButton = document.getElementById("addProjectButton");
        if (addProjectButton) {
          addProjectButton.textContent = "Manage Featured Projects";
          addProjectButton.style.display = "flex";
          
          // Set click handler to open project selector
          // First remove any existing event listeners to prevent duplicates
          addProjectButton.replaceWith(addProjectButton.cloneNode(true));
          document.getElementById("addProjectButton").addEventListener("click", openProjectSelector);
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
        
        // Make section actions visible ONLY in edit mode
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
        
        // Show all add item buttons in dynamic sections
        document.querySelectorAll('.portfolio-section .add-item-button').forEach(button => {
          button.style.display = "flex";
          
          // Ensure add buttons in all dynamic sections work after refresh
          if (button.closest('.portfolio-section[data-section-type="education"]') || 
              button.closest('.portfolio-section[data-section-type="experience"]') || 
              button.closest('.portfolio-section[data-section-type="skills"]')) {
            
            // Reset the button by cloning it to remove any stale event handlers
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Set the appropriate handler based on section type
            const section = newButton.closest('.portfolio-section');
            if (section.dataset.sectionType === "education") {
              newButton.addEventListener("click", function() {
                const timelineContainer = section.querySelector(".timeline");
                if (!timelineContainer) return;
                
                const items = timelineContainer.querySelectorAll(".timeline-item");
                const newItemId = `edu_${section.id}_${items.length + 1}`;
                
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
                
                // Add delete button
                const deleteButton = document.createElement("button");
                deleteButton.className = "delete-item-button";
                deleteButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                deleteButton.setAttribute("type", "button");
                deleteButton.setAttribute("aria-label", "Delete item");
                
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
                  element.classList.add("edit-placeholder");
                  element.addEventListener("focus", handleElementFocus);
                  element.addEventListener("blur", handleElementBlur);
                });
                
                editableElements[0].focus();
              });
            } else if (section.dataset.sectionType === "experience") {
              newButton.addEventListener("click", function() {
                const timelineContainer = section.querySelector(".timeline");
                if (!timelineContainer) return;
                
                const items = timelineContainer.querySelectorAll(".timeline-item");
                const newItemId = `exp_${section.id}_${items.length + 1}`;
                
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
                
                // Add delete button
                const deleteButton = document.createElement("button");
                deleteButton.className = "delete-item-button";
                deleteButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                deleteButton.setAttribute("type", "button");
                deleteButton.setAttribute("aria-label", "Delete item");
                
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
                  element.classList.add("edit-placeholder");
                  element.addEventListener("focus", handleElementFocus);
                  element.addEventListener("blur", handleElementBlur);
                });
                
                editableElements[0].focus();
              });
            } else if (section.dataset.sectionType === "skills") {
              newButton.addEventListener("click", function() {
                const skillsGrid = section.querySelector(".skill-grid");
                if (!skillsGrid) return;
                
                const items = skillsGrid.querySelectorAll(".skill-item");
                const newItemId = `skill_${section.id}_${items.length + 1}`;
                
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
                
                // Add delete button
                const deleteButton = document.createElement("button");
                deleteButton.className = "delete-item-button";
                deleteButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                deleteButton.setAttribute("type", "button");
                deleteButton.setAttribute("aria-label", "Delete item");
                
                deleteButton.addEventListener("click", function () {
                  if (confirm("Are you sure you want to delete this skill?")) {
                    newItem.remove();
                  }
                });
                
                newItem.appendChild(deleteButton);
                
                // Add progress editor
                const progressBar = newItem.querySelector(".skill-progress");
                const editor = document.createElement("div");
                editor.className = "progress-editor";
                editor.innerHTML = `
                  <input type="number" min="0" max="100" value="50" aria-label="Skill progress percentage">
                  <button type="button">Set</button>
                `;
                
                editor.querySelector("button").addEventListener("click", function () {
                  const input = editor.querySelector("input");
                  const newProgress = Math.min(100, Math.max(0, parseInt(input.value) || 0));
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
                  element.classList.add("edit-placeholder");
                  element.addEventListener("focus", handleElementFocus);
                  element.addEventListener("blur", handleElementBlur);
                });
                
                editableElements[0].focus();
              });
            }
          }
        });
      }
    }

    // Setup profile avatar edit functionality
    function setupProfileAvatarEdit() {
      const profileAvatar = document.getElementById("profileAvatar");
      const avatarFileInput = document.getElementById("avatarFileInput");
      
      if (profileAvatar && avatarFileInput) {
        // Add click event to trigger file input
        profileAvatar.addEventListener("click", function() {
          if (isEditMode) {
            avatarFileInput.click();
          }
        });
        
        // Handle file selection
        avatarFileInput.addEventListener("change", function(event) {
          const file = event.target.files[0];
          if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
              // Check if img already exists
              let avatarImg = profileAvatar.querySelector("img");
              
              if (!avatarImg) {
                // Create new image if it doesn't exist
                avatarImg = document.createElement("img");
                profileAvatar.appendChild(avatarImg);
              }
              
              // Set image source
              avatarImg.src = e.target.result;
              
              // Store the image data in a format that can be saved
              portfolioData.avatarImage = e.target.result;
              
              // Add success animation
              profileAvatar.classList.add("avatar-upload-success");
              setTimeout(() => {
                profileAvatar.classList.remove("avatar-upload-success");
              }, 1000);
              
              // Show notification
              showSavingIndicator("Profile picture updated! Don't forget to save your changes.", "success");
              setTimeout(() => {
                hideSavingIndicator();
              }, 3000);
            };
            
            reader.readAsDataURL(file);
          }
        });
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

        // Disable profile avatar editing
        const profileAvatar = document.getElementById("profileAvatar");
        if (profileAvatar) {
          profileAvatar.removeEventListener("click", function() {});
        }

        // Make all editable elements non-editable
        document.querySelectorAll('.editable-content, .section-title').forEach((element) => {
          element.removeAttribute("contenteditable");
          element.removeAttribute("spellcheck");
          element.classList.remove("edit-placeholder");
          // Remove any inline styles that may have been added for edit mode
          element.style.backgroundColor = '';
          element.style.outline = '';
          element.style.padding = '';
          element.style.margin = '';
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
        
        // Hide section actions in non-edit mode
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
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        deleteButton.setAttribute("type", "button");
        deleteButton.setAttribute("aria-label", "Delete item");

        // Add click handler for delete
        deleteButton.addEventListener("click", function () {
          if (confirm("Are you sure you want to delete this item?")) {
            item.remove();
            
            // Save changes after deletion
            saveItemDeletion();
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
            
            // Save changes after deletion
            saveItemDeletion();
          }
        });

        item.appendChild(deleteButton);
      });
      
      // Helper function to save changes after an item is deleted
      function saveItemDeletion() {
        // Gather updated data
        portfolioData = gatherPortfolioData();
        
        // Save to Supabase
        if (supabase) {
          console.log("Saving item deletion to Supabase");
          saveToSupabase(portfolioData)
            .then(result => {
              if (result.success) {
                console.log("Item deletion saved to Supabase successfully");
              } else {
                console.error("Error saving item deletion to Supabase:", result.error);
                showSaveNotification("Error saving changes. Please try again.");
              }
            })
            .catch(error => {
              console.error("Exception saving item deletion to Supabase:", error);
              showSaveNotification("Error saving changes. Please try again.");
            });
        } else {
          console.error("Supabase is not available. Unable to save item deletion.");
          showSaveNotification("Error: Unable to connect to database");
        }
      }
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

    // Function to add project action buttons - simplified for optimization
    function addProjectActionButtons() {
      // Projects are now managed through the "Manage Featured Projects" functionality
      // This function is kept for compatibility with the enableEditMode function
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
      // Kept for compatibility with disableEditMode function
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
          // Save only to Supabase
          if (supabase) {
            const result = await saveToSupabase(portfolioData);
            
            if (!result.success) {
              console.error("Error saving to Supabase:", result.error);
              showSavingIndicator("Error saving changes", "error");
              setTimeout(() => {
                hideSavingIndicator();
              }, 2500);
              return;
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
              } else {
            console.error("Supabase is not available. Unable to save changes.");
            showSavingIndicator("Error: Unable to connect to database", "error");
            setTimeout(() => {
              hideSavingIndicator();
            }, 2500);
            }
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

    // Add new project functionality (using project selector)
    if (document.getElementById("addProjectButton")) {
      document
        .getElementById("addProjectButton")
        .addEventListener("click", function () {
          openProjectSelector();
        });
    }

// Project selector modal for choosing which projects to feature
async function openProjectSelector() {
  console.log("Opening project selector modal");
  
  // First, if the selector grid already exists, clear it to prevent duplicates
  const existingGrid = document.getElementById('projectSelectorGrid');
  if (existingGrid) {
    existingGrid.innerHTML = '<p class="loading-text">Loading projects...</p>';
  }
  
  // Create modal if it doesn't exist
  if (!document.getElementById('projectSelectorModal')) {
    console.log("Creating project selector modal");
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'project-modal-backdrop';
    modalBackdrop.id = 'projectSelectorBackdrop';
    
    const modalHTML = `
      <div class="project-modal" id="projectSelectorModal" style="max-width: 900px;">
        <button class="project-modal-close" id="projectSelectorClose" aria-label="Close modal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="project-modal-header">
          <h2 class="project-modal-title">Manage Featured Projects</h2>
          <p style="margin-top: 8px; color: #666;">Select the projects you want to feature on your portfolio homepage.</p>
        </div>
        <div class="project-modal-content" style="padding-top: 0;">
          <div class="project-selector-grid" id="projectSelectorGrid">
            <p class="loading-text">Loading projects...</p>
          </div>
          <div class="project-selector-actions" style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px;">
            <button id="cancelFeaturedProjects" class="btn-secondary">Cancel</button>
            <button id="saveFeaturedProjects" class="btn-primary">Save Featured Projects</button>
          </div>
          </div>
        </div>
      `;

    modalBackdrop.innerHTML = modalHTML;
    document.body.appendChild(modalBackdrop);

    // Add event listeners
    document.getElementById('projectSelectorClose').addEventListener('click', closeProjectSelector);
    document.getElementById('cancelFeaturedProjects').addEventListener('click', closeProjectSelector);
    document.getElementById('saveFeaturedProjects').addEventListener('click', saveFeaturedProjects);
    
    modalBackdrop.addEventListener('click', function(e) {
      if (e.target === modalBackdrop) {
        closeProjectSelector();
      }
    });

    // Add styles if needed
    if (!document.getElementById('projectSelectorStyles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'projectSelectorStyles';
      styleEl.textContent = `
        /* Fix for project modal layout with long descriptions */
        .project-modal {
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }
        .project-modal-gallery {
          min-height: 40vh;
          max-height: 50vh;
        }
        .project-modal-content {
          flex: 1;
          /* overflow-y: auto; */
          padding: 20px;
          max-height: 40vh;
        }
        .project-modal-image img {
          object-fit: contain;
          max-height: 50vh;
        }
        .project-modal-description.long-description {
          max-height: none; /* Let the container handle scrolling */
          border-left: 3px solid var(--primary);
          padding-left: 15px;
          margin: 10px 0;
        }
        .project-modal-scroll-container {
          max-height: 35vh;
          overflow-y: auto;
          padding-right: 10px;
        }
        
        /* Mobile responsiveness for project modal */
        @media (max-width: 768px) {
          .project-modal {
            max-height: 95vh;
            width: 95%;
          }
          .project-modal-gallery {
            min-height: 30vh;
            max-height: 40vh;
          }
          .project-modal-scroll-container {
            max-height: 40vh;
          }
        }
        .project-selector-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          max-height: 500px;
          /* overflow-y: auto; */
          padding: 10px;
        }
        .project-select-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          background: #fff;
        }
        .project-select-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .project-select-card.selected {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
        }
        .project-select-card.selected:before {
          content: "";
          position: absolute;
          top: 8px;
          right: 8px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: var(--primary);
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 12L10 17L19 8' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: center;
        }
        .project-select-thumb {
          width: 100%;
          height: 140px;
          border-radius: 8px;
          background-color: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          overflow: hidden;
        }
        .project-select-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .project-select-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .project-select-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }
        .project-select-tag {
          font-size: 12px;
          padding: 2px 8px;
          background: #f3f4f6;
          color: #4b5563;
          border-radius: 4px;
        }
        .loading-text {
          text-align: center;
          padding: 24px;
          color: #6b7280;
        }
        .empty-projects {
          text-align: center;
          padding: 24px;
          color: #6b7280;
        }
        .project-selector-grid.empty-center {
          display: flex !important;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 180px;
        }
        .project-selector-grid.empty-center .empty-projects {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }
      `;
      document.head.appendChild(styleEl);
    }
  } else {
    console.log("Project selector modal already exists");
    // If the modal already exists, make sure to clear its content
    const projectsGrid = document.getElementById('projectSelectorGrid');
    if (projectsGrid) {
      projectsGrid.innerHTML = '<p class="loading-text">Loading projects...</p>';
        }
  }
  
  // Show the modal
  const modalBackdrop = document.getElementById('projectSelectorBackdrop');
  modalBackdrop.classList.add('active');
  document.body.classList.add('modal-open');
  
  // Load all projects from database
  await loadProjectsForSelector();
}

// Close project selector modal
function closeProjectSelector() {
  const modalBackdrop = document.getElementById('projectSelectorBackdrop');
  if (modalBackdrop) {
    modalBackdrop.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
}

// Load all user's projects for selection
async function loadProjectsForSelector() {
  const projectsGrid = document.getElementById('projectSelectorGrid');
  if (!projectsGrid) return;
  
  // Clear previous content and set loading state
  projectsGrid.innerHTML = '<p class="loading-text">Loading projects...</p>';
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      projectsGrid.innerHTML = '<p class="empty-projects">You need to be logged in to manage projects.</p>';
      return;
    }
    
    // Get all projects for this user
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error loading projects:", error);
      projectsGrid.innerHTML = '<p class="empty-projects">Error loading projects. Please try again.</p>';
      return;
    }
    
    if (!projects || projects.length === 0) {
      projectsGrid.innerHTML = `
        <div class="empty-projects">
          <p>You don't have any projects yet.</p>
          <p>Add projects in the <a href="projects.html" style="color: var(--primary); text-decoration: underline;">Projects page</a> first.</p>
        </div>
      `;
      projectsGrid.classList.add('empty-center');
      return;
    } else {
      projectsGrid.classList.remove('empty-center');
    }
    
    // IMPORTANT: Clear the grid completely before adding new projects
    // This prevents duplicate projects from appearing
    projectsGrid.innerHTML = '';
    
        // Get currently featured project IDs from portfolio data instead
      let featuredProjectIds = [];
      try {
        // Get featured project IDs from the portfolios table instead
        const { data: portfolioData, error: portfolioError } = await supabase
          .from('portfolios')
          .select('data')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (portfolioError) {
          console.warn("Error fetching portfolio:", portfolioError);
        } else if (portfolioData && portfolioData.data && portfolioData.data.featured_project_ids) {
          // Get the IDs from portfolio data
          featuredProjectIds = portfolioData.data.featured_project_ids;
          console.log("Loaded featured project IDs from portfolio data:", featuredProjectIds);
        }
      } catch (error) {
        console.warn("Exception getting featured projects:", error);
      }
    
    // Debug output of projects and featured IDs
    console.log("Projects to display:", projects.map(p => ({id: p.id, title: p.title})));
    console.log("Featured project IDs:", featuredProjectIds);
    
    // First clear any existing content to avoid duplication
    projectsGrid.innerHTML = "";
    
    // Create project cards - one per project
    projects.forEach(project => {
      const card = document.createElement('div');
      card.className = 'project-select-card';
      
      // Convert to string for comparison if needed
      const projectId = project.id;
      
      // Check if this project is in the featured list
      // Using more reliable string comparison to avoid type mismatch issues
      const isSelected = featuredProjectIds.some(featuredId => 
        featuredId && projectId && featuredId.toString() === projectId.toString()
      );
      
      if (isSelected) {
        card.classList.add('selected');
        console.log(`Project ${projectId} (${project.title}) is selected`);
      }
      
      card.setAttribute('data-project-id', project.id);
      
      // Create thumbnail
      const thumb = document.createElement('div');
      thumb.className = 'project-select-thumb';
      if (project.photo_url) {
        const img = document.createElement('img');
        img.src = project.photo_url;
        img.alt = project.title;
        thumb.appendChild(img);
      } else {
        // Default icon if no photo
        thumb.innerHTML = `
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        `;
      }
      
      // Create info
      const title = document.createElement('div');
      title.className = 'project-select-title';
      title.textContent = project.title;
      
      // Create tags
      const tags = document.createElement('div');
      tags.className = 'project-select-tags';
      if (project.languages && project.languages.length > 0) {
        project.languages.slice(0, 3).forEach(lang => {
          const tag = document.createElement('span');
          tag.className = 'project-select-tag';
          tag.textContent = lang;
          tags.appendChild(tag);
        });
        
        // Add +X more if needed
        if (project.languages.length > 3) {
          const moreTag = document.createElement('span');
          moreTag.className = 'project-select-tag';
          moreTag.textContent = `+${project.languages.length - 3} more`;
          tags.appendChild(moreTag);
        }
      }
      
      // Assemble card
      card.appendChild(thumb);
      card.appendChild(title);
      card.appendChild(tags);
      
      // Add click handler to toggle selection
      card.addEventListener('click', () => {
        card.classList.toggle('selected');
      });
      
      projectsGrid.appendChild(card);
    });
  } catch (error) {
    console.error("Error in loadProjectsForSelector:", error);
    projectsGrid.innerHTML = '<p class="empty-projects">An error occurred. Please try again.</p>';
  }
}

// Save featured projects selection
async function saveFeaturedProjects() {
  const selectedCards = document.querySelectorAll('.project-select-card.selected');
  const projectIds = Array.from(selectedCards).map(card => card.getAttribute('data-project-id'));
  
  console.log("Saving featured projects:", projectIds);
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You need to be logged in to save featured projects.");
      return;
    }
    
    // First get current portfolio data
    const { data: portfolioData, error: getError } = await supabase
      .from('portfolios')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (getError) {
      console.error("Error getting portfolio data:", getError);
      alert("Error saving featured projects. Please try again.");
      return;
    }
    
    // Create or update portfolio data
    let updatedData = portfolioData?.data || {};
    
    // Store featured project IDs in the main portfolio data structure
    // This preserves both the selection and the order
    updatedData.featured_project_ids = projectIds;
    updatedData.updated_at = new Date().toISOString();
    
    console.log("Saving featured project IDs to portfolio data:", projectIds);
    
    // Save to portfolios table
    const { error } = await supabase
      .from('portfolios')
      .update({ 
        data: updatedData
      })
      .eq('user_id', user.id);
    
    if (error) {
      console.error("Error saving featured projects:", error);
      alert("Error saving featured projects. Please try again.");
      return;
    }
    
    // Close modal
    closeProjectSelector();
    
    // Refresh featured projects
    loadFeaturedProjects();
    
    // Show success notification
    showSavingIndicator("Featured projects updated!", "success");
    setTimeout(() => {
      hideSavingIndicator();
    }, 2000);
  } catch (error) {
    console.error("Error in saveFeaturedProjects:", error);
    alert("An error occurred. Please try again.");
  }
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
      
      // Setup event listeners for "Add" buttons in the new section
      setupAddButtonsInNewSection(newSection, sectionId);
      
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
      
      // Attach event listener for Manage Featured Projects if this is a projects section
      if (newSection.dataset.sectionType === "projects") {
        const addProjectButton = newSection.querySelector("#addProjectButton");
        if (addProjectButton) {
          // Remove any old listeners by cloning
          const newButton = addProjectButton.cloneNode(true);
          addProjectButton.parentNode.replaceChild(newButton, addProjectButton);
          newButton.addEventListener("click", openProjectSelector);
        }
      }
      
      // Scroll to the new section
      setTimeout(() => {
        newSection.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          newSection.classList.remove("adding");
        }, 500);
      }, 100);
    }
    
    // New function to set up "Add" buttons in newly created sections
    function setupAddButtonsInNewSection(newSection, sectionId) {
      // For Education section
      if (newSection.dataset.sectionType === "education") {
        const addEducationBtn = newSection.querySelector(".add-item-button");
        if (addEducationBtn) {
          // First remove any existing listeners to avoid duplicates
          if (addEducationBtn._clickHandler) {
            addEducationBtn.removeEventListener("click", addEducationBtn._clickHandler);
          }
          
          // Create and store handler function
          addEducationBtn._clickHandler = function() {
            const timelineContainer = newSection.querySelector(".timeline");
            if (!timelineContainer) return;
            
            const items = timelineContainer.querySelectorAll(".timeline-item");
            const newItemId = `edu_${sectionId}_${items.length + 1}`;
            
            // Create new timeline item with unique ID
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
            deleteButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
          };
          
          // Add event listener
          addEducationBtn.addEventListener("click", addEducationBtn._clickHandler);
          
          // Make button visible in edit mode
          if (isEditMode) {
            addEducationBtn.style.display = "flex";
          }
        }
      }
      
      // For Experience section
      if (newSection.dataset.sectionType === "experience") {
        const addExperienceBtn = newSection.querySelector(".add-item-button");
        if (addExperienceBtn) {
          // First remove any existing listeners to avoid duplicates
          if (addExperienceBtn._clickHandler) {
            addExperienceBtn.removeEventListener("click", addExperienceBtn._clickHandler);
          }
          
          // Create and store handler function
          addExperienceBtn._clickHandler = function() {
            const timelineContainer = newSection.querySelector(".timeline");
            if (!timelineContainer) return;
            
            const items = timelineContainer.querySelectorAll(".timeline-item");
            const newItemId = `exp_${sectionId}_${items.length + 1}`;
            
            // Create new timeline item with unique ID
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
            deleteButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
          };
          
          // Add event listener
          addExperienceBtn.addEventListener("click", addExperienceBtn._clickHandler);
          
          // Make button visible in edit mode
          if (isEditMode) {
            addExperienceBtn.style.display = "flex";
          }
        }
      }
      
      // For Skills section
      if (newSection.dataset.sectionType === "skills") {
        const addSkillBtn = newSection.querySelector(".add-item-button");
        if (addSkillBtn) {
          // First remove any existing listeners to avoid duplicates
          if (addSkillBtn._clickHandler) {
            addSkillBtn.removeEventListener("click", addSkillBtn._clickHandler);
          }
          
          // Create and store handler function
          addSkillBtn._clickHandler = function() {
            const skillsGrid = newSection.querySelector(".skill-grid");
            if (!skillsGrid) return;
            
            const items = skillsGrid.querySelectorAll(".skill-item");
            const newItemId = `skill_${sectionId}_${items.length + 1}`;
            
            // Create new skill item with unique ID
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
            deleteButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
          };
          
          // Add event listener
          addSkillBtn.addEventListener("click", addSkillBtn._clickHandler);
          
          // Make button visible in edit mode
          if (isEditMode) {
            addSkillBtn.style.display = "flex";
          }
        }
      }
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
          <div class="empty-state">
            <div class="project-image">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="empty-state-content">
              <h3>No Featured Projects</h3>
              <p>Select projects to feature in your portfolio</p>
            </div>
          </div>
        </div>
        <button class="add-item-button" id="addProjectButton" style="display: none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Manage Featured Projects
        </button>
        <div class="view-all-link">
          <a href="projects.html" class="btn-primary">View All Projects</a>
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
      const timestamp = new Date().getTime();
      const sectionId = `custom_${timestamp}`;
      // Add to sectionOrder with content
      sectionOrder.push({
        id: sectionId,
        type: "custom",
        title: title,
        visible: true,
        content: content
      });
      // Create new section
      const newSection = document.createElement("section");
      newSection.id = sectionId;
      newSection.className = "portfolio-section adding";
      newSection.dataset.sectionType = "custom";
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
        makeEditableElementsEditable();
      }
      // Close the modal
      closeAddSectionModal();
      // Scroll to the new section
      setTimeout(() => {
        newSection.scrollIntoView({ behavior: "smooth", block: "start" });
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
          // Remove previous listener if present
          if (moveUpBtn._moveUpHandler) {
            moveUpBtn.removeEventListener("click", moveUpBtn._moveUpHandler);
          }
          // Create and store handler
          moveUpBtn._moveUpHandler = function() {
            moveSection(section, "up");
          };
          moveUpBtn.addEventListener("click", moveUpBtn._moveUpHandler);
        }
        
        // Move down button
        const moveDownBtn = section.querySelector(".move-down-btn");
        if (moveDownBtn) {
          if (moveDownBtn._moveDownHandler) {
            moveDownBtn.removeEventListener("click", moveDownBtn._moveDownHandler);
          }
          moveDownBtn._moveDownHandler = function() {
            moveSection(section, "down");
          };
          moveDownBtn.addEventListener("click", moveDownBtn._moveDownHandler);
        }
        
        // Remove button
        const removeBtn = section.querySelector(".remove-section-btn");
        if (removeBtn) {
          if (removeBtn._removeHandler) {
            removeBtn.removeEventListener("click", removeBtn._removeHandler);
          }
          removeBtn._removeHandler = function() {
            if (confirm("Are you sure you want to remove this section?")) {
              removeSection(section);
            }
          };
          removeBtn.addEventListener("click", removeBtn._removeHandler);
        }
        
        // Section title click for settings
        const sectionTitle = section.querySelector(".section-title");
        if (sectionTitle && isEditMode) {
          if (sectionTitle._settingsHandler) {
            sectionTitle.removeEventListener("click", sectionTitle._settingsHandler);
          }
          sectionTitle._settingsHandler = function(event) {
            // Only open settings if in edit mode and not editing other content
            if (isEditMode && !event.target.hasAttribute("contenteditable")) {
              openSectionSettings(section);
            }
          };
          sectionTitle.addEventListener("click", sectionTitle._settingsHandler);
        }
      });
    }
    
    // Move section up or down
    function moveSection(section, direction) {
      // Find the sectionOrder entry for this section
      const sectionId = section.id;
      const index = sectionOrder.findIndex(s => s.id === sectionId);
      if (direction === "up" && index > 0) {
        // Swap in the array
        [sectionOrder[index - 1], sectionOrder[index]] = [sectionOrder[index], sectionOrder[index - 1]];
      } else if (direction === "down" && index < sectionOrder.length - 1) {
        [sectionOrder[index], sectionOrder[index + 1]] = [sectionOrder[index + 1], sectionOrder[index]];
      }
      // Reorder the DOM to match sectionOrder
      const mainContainer = document.querySelector("main.container");
      sectionOrder.forEach(s => {
        const el = document.getElementById(s.id);
        if (el) mainContainer.appendChild(el);
      });
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
        
        // Gather updated data
        portfolioData = gatherPortfolioData();
        
        // Save to Supabase
        if (supabase) {
          console.log("Saving section removal to Supabase");
          saveToSupabase(portfolioData)
            .then(result => {
              if (result.success) {
                console.log("Section removal saved to Supabase successfully");
              } else {
                console.error("Error saving section removal to Supabase:", result.error);
                showSaveNotification("Error saving changes. Please try again.");
              }
            })
            .catch(error => {
              console.error("Exception saving section removal to Supabase:", error);
              showSaveNotification("Error saving changes. Please try again.");
            });
        } else {
          console.error("Supabase is not available. Unable to save section removal.");
          showSaveNotification("Error: Unable to connect to database");
        }
        
        console.log("Section removed");
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
      
      // No longer saving to localStorage
      console.log("Section order updated:", sectionOrder);
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
      
      // Gather updated data
      portfolioData = gatherPortfolioData();
      console.log("Section order updated");
      
      // Save to Supabase
      if (supabase) {
        console.log("Saving section order to Supabase");
        showSavingIndicator("Saving changes...");
        
        saveToSupabase(portfolioData)
          .then(result => {
            if (result.success) {
              console.log("Section order saved to Supabase successfully");
              showSavingIndicator("Changes saved successfully!", "success");
              setTimeout(() => {
                hideSavingIndicator();
              }, 1500);
            } else {
              console.error("Error saving section order to Supabase:", result.error);
              showSavingIndicator("Error saving changes", "error");
              setTimeout(() => {
                hideSavingIndicator();
              }, 1500);
            }
          })
          .catch(error => {
            console.error("Exception saving section order to Supabase:", error);
            showSavingIndicator("Error saving changes", "error");
            setTimeout(() => {
              hideSavingIndicator();
            }, 1500);
          });
      } else {
        console.error("Supabase is not available. Unable to save section order.");
        showSavingIndicator("Error: Unable to connect to database", "error");
        setTimeout(() => {
          hideSavingIndicator();
        }, 1500);
      }
      
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
      
      // Gather updated data
      portfolioData = gatherPortfolioData();
      
      // Save to Supabase
      if (supabase) {
        console.log("Saving section settings to Supabase");
        showSavingIndicator("Saving changes...");
        
        saveToSupabase(portfolioData)
          .then(result => {
            if (result.success) {
              console.log("Section settings saved to Supabase successfully");
              showSavingIndicator("Changes saved successfully!", "success");
              setTimeout(() => {
                hideSavingIndicator();
              }, 1500);
            } else {
              console.error("Error saving section settings to Supabase:", result.error);
              showSavingIndicator("Error saving changes", "error");
              setTimeout(() => {
                hideSavingIndicator();
              }, 1500);
            }
          })
          .catch(error => {
            console.error("Exception saving section settings to Supabase:", error);
            showSavingIndicator("Error saving changes", "error");
            setTimeout(() => {
              hideSavingIndicator();
            }, 1500);
          });
      } else {
        console.error("Supabase is not available. Unable to save section settings.");
        showSavingIndicator("Error: Unable to connect to database", "error");
        setTimeout(() => {
          hideSavingIndicator();
        }, 1500);
      }
      
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
      if (!supabase) {
        console.warn("Supabase client not available, cannot get current user");
        return null;
      }
      
      try {
        console.log("Attempting to get current user...");
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error("Error getting user:", error);
          
          // Check for specific auth errors
          if (error.message.includes('JWT')) {
            console.error("JWT token invalid or expired. User may need to log in again.");
          }
          
          return null;
        }
        
        if (data && data.user) {
          console.log("User authenticated successfully");
          return data.user;
        } else {
          console.log("No user found in session");
          return null;
        }
      } catch (error) {
        console.error("Exception getting user:", error);
        
        // Handle network errors
        if (error.message && error.message.includes('fetch')) {
          console.error("Network error connecting to Supabase. Check your internet connection.");
        }
        
        return null;
      }
    }
    
    // Save portfolio data to Supabase
    async function saveToSupabase(data) {
      if (!supabase) return { success: false, error: "Supabase not initialized" };
      
      try {
        console.log("Attempting to save portfolio to Supabase...");
        const user = await getCurrentUser();
        
        if (!user) {
          console.warn("Not authenticated, can't save to Supabase");
          return { success: false, error: "Not authenticated" };
        }
        
        // Add user ID to data
        data.user_id = user.id;
        
        // Add timestamp for when this data was saved
        data.updated_at = new Date().toISOString();
        
        // Handle avatar image
        if (data.avatarImage) {
          console.log("Saving avatar image to Supabase");
          
          // Also update the profile avatar_url
          try {
            await supabase
              .from("profiles")
              .update({ avatar_url: data.avatarImage, updated_at: new Date() })
              .eq("id", user.id);
          } catch (e) {
            console.warn("Could not update profile avatar:", e);
          }
        }
        
        // Check if user already has a portfolio entry
        console.log("Checking for existing portfolio...");
        const { data: existingData, error: fetchError } = await supabase
          .from("portfolios")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        if (fetchError && fetchError.code !== "PGRST116") {
          if (fetchError.code === "42703") {
            console.error("Column error when checking for existing portfolio. The portfolios table might be misconfigured.");
            return { success: false, error: fetchError, details: "Database schema issue" };
          }
          // Some error other than "not found"
          console.error("Error checking for existing portfolio:", fetchError);
          return { success: false, error: fetchError };
        }
        
        let result;
        
        if (existingData) {
          // Update existing portfolio
          console.log("Updating existing portfolio...");
          result = await supabase
            .from("portfolios")
            .update({ data: data })
            .eq("user_id", user.id);
        } else {
          // Insert new portfolio
          console.log("Creating new portfolio...");
          result = await supabase
            .from("portfolios")
            .insert([{ user_id: user.id, data: data }]);
        }
        
        if (result.error) {
          console.error("Error saving portfolio:", result.error);
          throw result.error;
        }
        
        console.log("Portfolio saved successfully to Supabase");
        return { success: true };
      } catch (error) {
        console.error("Exception saving to Supabase:", error);
        
        // Provide better error information based on error type
        if (error.code === "42703") {
          return { 
            success: false, 
            error, 
            details: "Database column missing. Make sure your portfolios table has a 'data' column of type JSONB." 
          };
        }
        
        if (error.code === "42P01") {
          return { 
            success: false, 
            error, 
            details: "Table not found. Make sure your database has a 'portfolios' table." 
          };
        }
        
        return { success: false, error };
      }
    }

    // Show save notification
    function showSaveNotification(message = "Changes saved successfully!") {
      const saveNotification = document.querySelector(".save-notification");
      if (!saveNotification) {
        console.warn("Save notification element not found in DOM.");
        return;
      }
      const messageElement = saveNotification.querySelector(".save-notification-text");
      if (messageElement) {
        messageElement.textContent = message;
        saveNotification.classList.add("show");
        setTimeout(() => {
          saveNotification.classList.remove("show");
        }, 3000);
      }
    }

    // Update profile timestamp
    function updateProfileTimestamp() {
      // Add current timestamp for tracking updates
      portfolioData.updated_at = new Date().toISOString();
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
      const href = item.getAttribute("href");
      if (href && href.startsWith("#")) {
        // Only prevent default for in-page anchors
        e.preventDefault();
        const targetSection = document.querySelector(href);
        if (targetSection) {
          scrollToElement(targetSection);
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
    try {
    // Get the logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

      console.log("User authenticated, attempting to load profile data");
      
      // First, check if the profiles table exists and has the correct structure
      let profileExists = false;
      let hasAvatarColumn = false;
      
      // Attempt to query the profile without using avatar_url column
      try {
        const { data: checkProfile, error: checkError } = await supabase
        .from('profiles')
          .select('id')
        .eq('id', user.id)
          .single();
          
        if (!checkError) {
          profileExists = true;
          
          // Now let's test if avatar_url exists
          try {
            const { error: colError } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', user.id)
              .single();
              
            if (!colError) {
              hasAvatarColumn = true;
            }
          } catch (e) {
            console.warn("The avatar_url column doesn't exist:", e);
          }
        }
      } catch (e) {
        console.warn("Error checking profile table:", e);
      }
      
      let profile = null;
      
      // If profile table exists, try to get profile data
      if (profileExists) {
        // Depending on whether avatar_url exists, construct the query differently
        const fields = hasAvatarColumn ? 'full_name, avatar_url' : 'full_name';
        
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select(fields)
          .eq('id', user.id)
          .maybeSingle();
          
        if (!error) {
          profile = profileData;
        } else {
          console.warn("Error loading profile:", error);
        }
      }
      
      // If profile doesn't exist or couldn't be loaded, create it
      if (!profile) {
        console.log("Attempting to create profile for user");
        
        // Prepare profile data
        const profileData = {
          id: user.id,
          full_name: user.email?.split('@')[0] || 'CS Student',
          updated_at: new Date().toISOString()
        };
        
        // Add avatar_url field only if the column exists
        if (hasAvatarColumn) {
          profileData.avatar_url = null;
        }
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(profileData);
        
        if (insertError) {
          console.error("Error creating profile:", insertError);
        } else {
          console.log("Profile created successfully");
          profile = profileData;
        }
      }

      // Set avatar circle to first letter of full name or load profile image
      const profileAvatar = document.getElementById("profileAvatar");
      if (profileAvatar) {
        // Always start with loading state and empty content
        profileAvatar.innerHTML = '';
        profileAvatar.classList.add('loading');
        
        // If we have an avatar URL from the profile and the column exists, use it
        if (hasAvatarColumn && profile?.avatar_url) {
          // Pre-load image before inserting into DOM
          const tempImg = new Image();
          tempImg.src = profile.avatar_url;
          
          // Handle successful load
          tempImg.onload = () => {
            const avatarImg = document.createElement("img");
            avatarImg.src = profile.avatar_url;
            avatarImg.alt = profile?.full_name || "Profile Picture";
            profileAvatar.appendChild(avatarImg);
            
            // Remove loading class with slight delay to ensure smooth transition
            setTimeout(() => {
              profileAvatar.classList.remove('loading');
            }, 100);
          };
          
          // Handle load error
          tempImg.onerror = () => {
            // If image fails to load, show first letter of name
            const initials = (profile?.full_name || user.email || 'U')[0].toUpperCase();
            // Insert initials after loading animation completes
            setTimeout(() => {
              profileAvatar.textContent = initials;
              profileAvatar.classList.remove('loading');
            }, 200);
          };
        } else {
          // Otherwise, use the initials but wait for animation to complete
          setTimeout(() => {
            const initials = (profile?.full_name || user.email || 'U')[0].toUpperCase();
            profileAvatar.textContent = initials;
            profileAvatar.classList.remove('loading');
          }, 200);
        }
      }

    // Set name to full name
    document.querySelector('.portfolio-title').textContent = profile?.full_name || 'CS Student';

    // Set email to user's email
    document.querySelector('[data-field="email"]').textContent = user.email;

    // Set location to a static value for now
    // document.querySelector('[data-field="location"]').textContent = 'Location';
    } catch (err) {
      console.error("Error in loadPortfolioHeader:", err);
    }
  }

  // Call it directly, since we're already inside DOMContentLoaded
  loadPortfolioHeader();

  // --- FEATURED PROJECTS SECTION ---
  async function loadFeaturedProjects() {
    try {
        const projectsContainer = document.getElementById('projectsContainer');
        // If container doesn't exist, exit early
        if (!projectsContainer) {
            console.log('Projects container not found, skipping featured projects render');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // First get featured project IDs from portfolio data
        let featuredProjectIds = [];
        const { data: portfolioData, error: portfolioError } = await supabase
          .from('portfolios')
          .select('data')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (portfolioError) {
            console.warn("Error fetching portfolio for featured projects:", portfolioError);
        } else if (portfolioData?.data?.featured_project_ids?.length > 0) {
            // If we have featured project IDs, use those
            featuredProjectIds = portfolioData.data.featured_project_ids;
            console.log("Loading featured projects with IDs:", featuredProjectIds);
            
            // Get all featured projects by their IDs
            const { data: projects, error } = await supabase
                .from('projects')
                .select('*')
                .in('id', featuredProjectIds);
                
            if (error) {
                console.error("Error loading featured projects by ID:", error);
                throw error;
            }
            
            // If we successfully got the featured projects, render them in the correct order
            if (projects && projects.length > 0) {
                projectsContainer.innerHTML = '';
                
                // Sort the projects based on the order in featured_project_ids
                const orderedProjects = featuredProjectIds.map(id => {
                    // Convert both to strings for safe comparison
                    return projects.find(project => project.id.toString() === id.toString());
                }).filter(Boolean); // Remove any null/undefined values
                
                console.log("Ordered featured projects:", orderedProjects.map(p => p.title));
                
                // Render the projects in the specified order
                orderedProjects.forEach(project => {
                    const card = createFeaturedProjectCard(project);
                    projectsContainer.appendChild(card);
                });
                
                return; // Exit early since we already handled the rendering
            }
        }
        
        // If we reach here, it means either:
        // 1. No featured projects are selected
        // 2. Error fetching projects
        // 3. No projects found
        // Show the empty state
        projectsContainer.innerHTML = `
            <div class="empty-state">
                <div class="project-image">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="empty-state-content">
                    <h3>No Featured Projects</h3>
                    <p>Select projects to feature in your portfolio</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading featured projects:', error);
        // Only show error state if container exists
        if (projectsContainer) {
            projectsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="project-image">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 8l-8 8-8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="empty-state-content">
                        <h3>Error Loading Projects</h3>
                        <p>There was an error loading your projects. Please try again later.</p>
                    </div>
                </div>
            `;
        }
    }
  }

  function createFeaturedProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'portfolio-project-card';

    // Photo section
    const photoSection = document.createElement('div');
    photoSection.className = 'portfolio-project-photo';
    if (project.photo_url) {
      const img = document.createElement('img');
      img.src = project.photo_url;
      img.alt = project.title;
      photoSection.appendChild(img);
    } else {
      photoSection.innerHTML = `
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `;
    }

    // Info section
    const infoSection = document.createElement('div');
    infoSection.className = 'portfolio-project-info';

    // Content section (title + languages)
    const contentSection = document.createElement('div');
    contentSection.className = 'portfolio-project-content';

    // Title
    const title = document.createElement('h3');
    title.className = 'portfolio-project-title';
    title.textContent = project.title || 'Unnamed Project';
    contentSection.appendChild(title);

    // Languages/Tech
    const techSection = document.createElement('div');
    techSection.className = 'portfolio-project-languages';
    (project.languages || []).forEach(lang => {
      const tag = document.createElement('span');
      tag.className = 'tech-tag';
      tag.textContent = lang;
      techSection.appendChild(tag);
    });
    contentSection.appendChild(techSection);
    infoSection.appendChild(contentSection);

    // Links section (View button + Link)
    const linksSection = document.createElement('div');
    linksSection.className = 'portfolio-project-links';

    // View button (blue)
    const viewBtn = document.createElement('button');
    viewBtn.className = 'portfolio-project-view-btn';
    viewBtn.textContent = 'View';
    viewBtn.addEventListener('click', () => {
      openProjectModal(project);
    });
    linksSection.appendChild(viewBtn);

    // Project Link (text link)
    if (project.project_url) {
      const projectLink = document.createElement('a');
      projectLink.href = project.project_url;
      projectLink.className = 'project-link';
      projectLink.textContent = 'Link';
      projectLink.target = '_blank';
      projectLink.rel = 'noopener noreferrer';
      linksSection.appendChild(projectLink);
    }
    infoSection.appendChild(linksSection);

    // Assemble card
    card.appendChild(photoSection);
    card.appendChild(infoSection);

    return card;
  }

  // Load featured projects when the page loads
  loadFeaturedProjects();
  
  // Project Modal Code
  // Current image index for the modal
  let currentImageIndex = 0;
  let totalImages = 0;
  
  function createProjectModal() {
  // Create modal elements if they don't exist
  if (!document.getElementById('projectModal')) {
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'project-modal-backdrop';
    modalBackdrop.id = 'projectModalBackdrop';
    
    const modalHTML = `
      <div class="project-modal" id="projectModal">
        <button class="project-modal-close" id="projectModalClose" aria-label="Close modal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="project-modal-header">
          <h2 class="project-modal-title" id="projectModalTitle">Project Title</h2>
        </div>
        <!-- Image gallery section - fixed height -->
        <div class="project-modal-gallery">
          <div class="project-modal-images" id="projectModalImages">
            <!-- Images will be inserted here -->
          </div>
          <button class="project-modal-nav project-modal-nav-prev" id="projectModalPrev" aria-label="Previous image">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="project-modal-nav project-modal-nav-next" id="projectModalNext" aria-label="Next image">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
            <div class="project-modal-dots" id="projectModalDots">
          <!-- Dots will be inserted here -->
        </div>
        </div>
      
        <!-- Scrollable content section -->
        <div class="project-modal-content">
          <div class="project-modal-scroll-container">
            <p class="project-modal-description" id="projectModalDescription">Project description</p>
            <div class="project-modal-tech" id="projectModalTech">
              <!-- Tech tags will be inserted here -->
            </div>
          </div>
        </div>
        <div class="project-modal-footer">
          <div class="project-modal-links" id="projectModalLinks">
            <!-- Links will be inserted here -->
          </div>
        </div>
      </div>
    `;
      
      modalBackdrop.innerHTML = modalHTML;
      document.body.appendChild(modalBackdrop);
      
      // Add event listeners for closing
      const closeButton = document.getElementById('projectModalClose');
      closeButton.addEventListener('click', closeProjectModal);
      
      modalBackdrop.addEventListener('click', function(e) {
        if (e.target === modalBackdrop) {
          closeProjectModal();
        }
      });
      
      // Add keyboard support for closing and navigation
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeProjectModal();
        } else if (e.key === 'ArrowLeft') {
          navigateProjectImages('prev');
        } else if (e.key === 'ArrowRight') {
          navigateProjectImages('next');
        }
      });
      
      // Add navigation button listeners
      document.getElementById('projectModalPrev').addEventListener('click', () => navigateProjectImages('prev'));
      document.getElementById('projectModalNext').addEventListener('click', () => navigateProjectImages('next'));
    }
  }
  
  // Open the project modal - expose globally
window.openProjectModal = function(project) {
    createProjectModal();
    
    // Set the project title
    document.getElementById('projectModalTitle').textContent = project.title;
    
    // Set the project description with enhanced handling for long text
    const descriptionEl = document.getElementById('projectModalDescription');
    if (descriptionEl) {
      descriptionEl.textContent = project.description || 'No description available';
      
      // Add class for long descriptions to enable scrolling
      if (project.description && project.description.length > 300) {
        descriptionEl.classList.add('long-description');
      } else {
        descriptionEl.classList.remove('long-description');
      }
    }
    
    // Clear previous images
    const modalImages = document.getElementById('projectModalImages');
    const modalDots = document.getElementById('projectModalDots');
    const prevButton = document.getElementById('projectModalPrev');
    const nextButton = document.getElementById('projectModalNext');
    modalImages.innerHTML = '';
    modalDots.innerHTML = '';
    const photoUrls = project.photo_urls || (project.photo_url ? [project.photo_url] : []);
    let currentImageIndex = 0;

    function navigateToImage(index) {
      const images = modalImages.querySelectorAll('.project-modal-image');
      const dots = modalDots.querySelectorAll('.project-modal-dot');
      images.forEach((img, i) => {
        img.style.display = i === index ? 'block' : 'none';
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
      currentImageIndex = index;
    }

    function handleKeyPress(e) {
      if (e.key === 'ArrowLeft' && prevButton.style.display !== 'none') {
        prevButton.click();
      } else if (e.key === 'ArrowRight' && nextButton.style.display !== 'none') {
        nextButton.click();
      } else if (e.key === 'Escape') {
        closeProjectModal();
      }
    }

    if (photoUrls.length > 0) {
      photoUrls.forEach((url, index) => {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'project-modal-image';
        imageDiv.style.display = index === 0 ? 'block' : 'none';
        const img = document.createElement('img');
        img.src = url;
        img.alt = `${project.title} - Image ${index + 1}`;
        imageDiv.appendChild(img);
        modalImages.appendChild(imageDiv);
      });
      if (photoUrls.length > 1) {
        prevButton.style.display = 'flex';
        nextButton.style.display = 'flex';
        modalDots.style.display = 'flex';
        modalDots.innerHTML = '';
        photoUrls.forEach((_, index) => {
          const dot = document.createElement('div');
          dot.className = `project-modal-dot ${index === 0 ? 'active' : ''}`;
          dot.addEventListener('click', () => navigateToImage(index));
          modalDots.appendChild(dot);
        });
        prevButton.onclick = () => {
          currentImageIndex = (currentImageIndex - 1 + photoUrls.length) % photoUrls.length;
          navigateToImage(currentImageIndex);
        };
        nextButton.onclick = () => {
          currentImageIndex = (currentImageIndex + 1) % photoUrls.length;
          navigateToImage(currentImageIndex);
        };
        document.addEventListener('keydown', handleKeyPress);
      } else {
        prevButton.style.display = 'none';
        nextButton.style.display = 'none';
        modalDots.style.display = 'none';
      }
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'project-modal-image';
      placeholder.innerHTML = `
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      modalImages.appendChild(placeholder);
      prevButton.style.display = 'none';
      nextButton.style.display = 'none';
      modalDots.style.display = 'none';
    }

    // Tech stack
    const techContainer = document.getElementById('projectModalTech');
    techContainer.innerHTML = '';
    if (project.languages && project.languages.length > 0) {
      project.languages.forEach(lang => {
        const tag = document.createElement('span');
        tag.className = 'tech-tag';
        tag.textContent = lang;
        techContainer.appendChild(tag);
      });
    } else {
      techContainer.style.display = 'none';
    }

    // Links
    const linksContainer = document.getElementById('projectModalLinks');
    linksContainer.innerHTML = '';
    // Always reset display so links show for projects that have them
    linksContainer.style.display = '';
    let hasLink = false;
    if (project.project_url) {
      const link = document.createElement('a');
      link.href = project.project_url;
      link.className = 'project-modal-link';
      link.textContent = 'Project Link';
      link.target = '_blank';
      linksContainer.appendChild(link);
      hasLink = true;
    }
    if (project.github_url) {
      const link = document.createElement('a');
      link.href = project.github_url;
      link.className = 'project-modal-link';
      link.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5229 6.47715 22 12 22C17.5229 22 22 17.5229 22 12C22 6.47715 17.5229 2 12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14.3333 19V17.137C14.3583 16.8275 14.3154 16.5163 14.2073 16.2242C14.0993 15.9321 13.9286 15.6657 13.7067 15.4428C15.8 15.2156 18 14.4431 18 10.8989C17.9998 9.99256 17.6418 9.12101 17 8.46461C17.3039 7.67171 17.2824 6.79528 16.94 6.01739C16.94 6.01739 16.1533 5.7902 14.3333 6.97433C12.8053 6.57853 11.1947 6.57853 9.66666 6.97433C7.84666 5.7902 7.05999 6.01739 7.05999 6.01739C6.71757 6.79528 6.69609 7.67171 6.99999 8.46461C6.35341 9.12588 5.99501 10.0053 5.99999 10.9183C5.99999 14.4366 8.19999 15.2091 10.2933 15.4622C10.074 15.6829 9.90483 15.9461 9.79686 16.2347C9.68889 16.5232 9.64453 16.8306 9.66666 17.137V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        GitHub
      `;
      link.target = '_blank';
      linksContainer.appendChild(link);
      hasLink = true;
    }
    if (!hasLink) {
      linksContainer.style.display = 'none';
    }

    // Show the modal
    const modalBackdrop = document.getElementById('projectModalBackdrop');
    modalBackdrop.classList.add('active');
    document.body.classList.add('modal-open');
  }
  
  // Close the project modal
  function closeProjectModal() {
    const modalBackdrop = document.getElementById('projectModalBackdrop');
    if (modalBackdrop) {
      modalBackdrop.classList.remove('active');
      document.body.classList.remove('modal-open');
    }
  }
  
  // Navigate between project images
  function navigateProjectImages(direction) {
    if (totalImages <= 1) return;
    
    const imagesContainer = document.getElementById('projectModalImages');
    const dots = document.querySelectorAll('.project-modal-dot');
    
    if (direction === 'next') {
      currentImageIndex = (currentImageIndex + 1) % totalImages;
    } else {
      currentImageIndex = (currentImageIndex - 1 + totalImages) % totalImages;
    }
    
    // Update the transform to show current image
    imagesContainer.style.transform = `translateX(-${currentImageIndex * 100}%)`;
    
    // Update active dot
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentImageIndex);
    });
  }
  
  // Set current image directly
  function setCurrentImage(index) {
    if (index < 0 || index >= totalImages) return;
    
    currentImageIndex = index;
    const imagesContainer = document.getElementById('projectModalImages');
    const dots = document.querySelectorAll('.project-modal-dot');
    
    // Update transform
    imagesContainer.style.transform = `translateX(-${index * 100}%)`;
    
    // Update active dot
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

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
        } else if (navigator.geolocation) {
          // If city not in Supabase, fetch using geolocation
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
              await supabase
                .from('profiles')
                .update({ city })
                .eq('id', user.id);
            } catch (err) {
              locationSpan.textContent = 'City unavailable';
            }
          }, (err) => {
            locationSpan.textContent = 'Location unavailable';
          });
        } else {
          locationSpan.textContent = 'Location unavailable';
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

      // Get avatar image if it exists
      const avatarImg = document.querySelector(".avatar.large img");
      if (avatarImg && avatarImg.src) {
        updates.avatar_url = avatarImg.src;
      }

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
