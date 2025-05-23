import { supabase } from "./supabaseAPI.js";

// Function to open project modal
window.openProjectModal = function (project) {
  const modalBackdrop = document.getElementById("projectModalBackdrop");
  const modalTitle = document.getElementById("projectModalTitle");
  const modalImages = document.getElementById("projectModalImages");
  const modalDescription = document.getElementById("projectModalDescription");
  const modalTech = document.getElementById("projectModalTech");
  const modalLinks = document.getElementById("projectModalLinks");
  const modalDots = document.getElementById("projectModalDots");
  const prevButton = document.getElementById("projectModalPrev");
  const nextButton = document.getElementById("projectModalNext");
  const closeBtn = document.getElementById("projectModalClose");

  // Set title
  modalTitle.textContent = project.title || "Project Details";

  // Set description
  modalDescription.textContent =
    project.description || "No description available.";

  // Handle images
  modalImages.innerHTML = "";
  modalDots.innerHTML = ""; // Clear existing dots
  const photoUrls =
    project.photo_urls || (project.photo_url ? [project.photo_url] : []);
  let currentImageIndex = 0;

  // Function to navigate to specific image
  function navigateToImage(index) {
    const images = modalImages.querySelectorAll(".project-modal-image");
    const dots = modalDots.querySelectorAll(".project-modal-dot");

    images.forEach((img, i) => {
      img.style.display = i === index ? "block" : "none";
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });

    currentImageIndex = index;
  }

  // Keyboard navigation handler
  function handleKeyPress(e) {
    if (e.key === "ArrowLeft" && prevButton.style.display !== "none") {
      prevButton.click();
    } else if (e.key === "ArrowRight" && nextButton.style.display !== "none") {
      nextButton.click();
    } else if (e.key === "Escape") {
      closeModal();
    }
  }

  // Close modal function
  const closeModal = () => {
    modalBackdrop.classList.remove("active");
    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", handleKeyPress);
  };

  if (photoUrls.length > 0) {
    photoUrls.forEach((url, index) => {
      const imageDiv = document.createElement("div");
      imageDiv.className = "project-modal-image";
      imageDiv.style.display = index === 0 ? "block" : "none";

      const img = document.createElement("img");
      img.src = url;
      img.alt = `${project.title} - Image ${index + 1}`;
      imageDiv.appendChild(img);
      modalImages.appendChild(imageDiv);
    });

    // Set up navigation if there are multiple images
    if (photoUrls.length > 1) {
      // Show navigation buttons
      prevButton.style.display = "flex";
      nextButton.style.display = "flex";
      modalDots.style.display = "flex";

      // Clear and create dots
      modalDots.innerHTML = "";
      photoUrls.forEach((_, index) => {
        const dot = document.createElement("div");
        dot.className = `project-modal-dot ${index === 0 ? "active" : ""}`;
        dot.addEventListener("click", () => navigateToImage(index));
        modalDots.appendChild(dot);
      });

      // Set up navigation button click handlers
      prevButton.onclick = () => {
        currentImageIndex =
          (currentImageIndex - 1 + photoUrls.length) % photoUrls.length;
        navigateToImage(currentImageIndex);
      };

      nextButton.onclick = () => {
        currentImageIndex = (currentImageIndex + 1) % photoUrls.length;
        navigateToImage(currentImageIndex);
      };

      // Add keyboard navigation
      document.addEventListener("keydown", handleKeyPress);
    } else {
      // Hide navigation for single image
      prevButton.style.display = "none";
      nextButton.style.display = "none";
      modalDots.style.display = "none";
    }
  } else {
    // Show placeholder for no images
    const placeholder = document.createElement("div");
    placeholder.className = "project-modal-image";
    placeholder.innerHTML = `
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    modalImages.appendChild(placeholder);

    // Hide navigation
    prevButton.style.display = "none";
    nextButton.style.display = "none";
    modalDots.style.display = "none";
  }

  // Set tech stack
  modalTech.innerHTML = "";
  if (project.languages && project.languages.length > 0) {
    project.languages.forEach((lang) => {
      const tag = document.createElement("span");
      tag.className = "tech-tag";
      tag.textContent = lang;
      modalTech.appendChild(tag);
    });
  }

  // Set links
  modalLinks.innerHTML = "";
  // Always reset display so links show for projects that have them
  modalLinks.style.display = "";
  let hasLink = false;
  if (project.project_url) {
    const demoLink = document.createElement("a");
    demoLink.href = project.project_url;
    demoLink.className = "project-modal-link";
    demoLink.textContent = "Project Link";
    demoLink.target = "_blank";
    modalLinks.appendChild(demoLink);
    hasLink = true;
  }
  if (project.github_url) {
    const githubLink = document.createElement("a");
    githubLink.href = project.github_url;
    githubLink.className = "project-modal-link";
    githubLink.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5229 6.47715 22 12 22C17.5229 22 22 17.5229 22 12C22 6.47715 17.5229 2 12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14.3333 19V17.137C14.3583 16.8275 14.3154 16.5163 14.2073 16.2242C14.0993 15.9321 13.9286 15.6657 13.7067 15.4428C15.8 15.2156 18 14.4431 18 10.8989C17.9998 9.99256 17.6418 9.12101 17 8.46461C17.3039 7.67171 17.2824 6.79528 16.94 6.01739C16.94 6.01739 16.1533 5.7902 14.3333 6.97433C12.8053 6.57853 11.1947 6.57853 9.66666 6.97433C7.84666 5.7902 7.05999 6.01739 7.05999 6.01739C6.71757 6.79528 6.69609 7.67171 6.99999 8.46461C6.35341 9.12588 5.99501 10.0053 5.99999 10.9183C5.99999 14.4366 8.19999 15.2091 10.2933 15.4622C10.074 15.6829 9.90483 15.9461 9.79686 16.2347C9.68889 16.5232 9.64453 16.8306 9.66666 17.137V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            GitHub
        `;
    githubLink.target = "_blank";
    modalLinks.appendChild(githubLink);
    hasLink = true;
  }
  if (!hasLink) {
    modalLinks.style.display = "none";
  }

  // Only add View Portfolio button if we're not already on the portfolio page
  if (!window.location.pathname.includes("eachConnectLanding.html")) {
    let viewPortfolioBtn = document.getElementById("projectModalViewPortfolio");
    if (!viewPortfolioBtn) {
      viewPortfolioBtn = document.createElement("button");
      viewPortfolioBtn.id = "projectModalViewPortfolio";
      viewPortfolioBtn.className = "view-portfolio-btn";
      viewPortfolioBtn.style.marginTop = "18px";
      modalLinks.parentNode.appendChild(viewPortfolioBtn);
    }
    viewPortfolioBtn.textContent = "View Portfolio";
    viewPortfolioBtn.onclick = () => {
      localStorage.setItem("selectedProfileId", project.user_id);
      window.location.href = "eachConnectLanding.html";
    };
  }

  // Set up close functionality
  if (closeBtn) {
    closeBtn.onclick = closeModal;
  }

  // Click outside modal
  modalBackdrop.onclick = (event) => {
    if (event.target === modalBackdrop) {
      closeModal();
    }
  };

  // Show modal
  modalBackdrop.classList.add("active");
  document.body.classList.add("modal-open");
};

// Function to load featured projects
async function loadFeaturedProjects() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // Fetch projects for the current user
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3); // Only get the 3 most recent projects for featured section

    if (error) throw error;

    const projectsContainer = document.getElementById("projectsContainer");

    // Skip if container doesn't exist (we're on a different page)
    if (!projectsContainer) {
      console.log(
        "Projects container not found, skipping featured projects render"
      );
      return;
    }

    // Clear existing projects
    projectsContainer.innerHTML = "";

    if (projects.length === 0) {
      // Show empty state if no projects
      projectsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No projects yet. Add your first project to see it featured here!</p>
                    <a href="addproject.html" class="btn-primary">Add Project</a>
                </div>
            `;
    } else {
      // Add each project to the container
      projects.forEach((project, index) => {
        const card = createFeaturedProjectCard(project, index + 1);
        projectsContainer.appendChild(card);
      });
    }
  } catch (error) {
    console.error("Error loading featured projects:", error);
    // Don't show alert if container doesn't exist
    if (document.getElementById("projectsContainer")) {
      alert("Error loading featured projects. Please try again.");
    }
  }
}

// Function to create a featured project card element
function createFeaturedProjectCard(project, index) {
  const card = document.createElement("div");
  card.className = "portfolio-project-card";
  card.setAttribute("data-item-id", `proj${index}`);

  // Photo section
  const photoSection = document.createElement("div");
  photoSection.className = "portfolio-project-photo";
  if (project.photo_url) {
    const img = document.createElement("img");
    img.src = project.photo_url;
    img.alt = project.title;
    photoSection.appendChild(img);
  } else {
    // Default icon if no photo
    photoSection.innerHTML = `
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
  }

  // Info section
  const infoSection = document.createElement("div");
  infoSection.className = "portfolio-project-info";

  // Title
  const title = document.createElement("h3");
  title.className = "portfolio-project-title";
  title.textContent = project.title;
  infoSection.appendChild(title);

  // Description
  const description = document.createElement("p");
  description.className = "portfolio-project-description";
  description.textContent = project.description;
  infoSection.appendChild(description);

  // Languages/Tech
  const techSection = document.createElement("div");
  techSection.className = "portfolio-project-languages";
  if (project.languages && project.languages.length > 0) {
    project.languages.forEach((lang) => {
      const techTag = document.createElement("span");
      techTag.className = "tech-tag";
      techTag.setAttribute("data-tag", lang);
      techTag.textContent = lang;
      techSection.appendChild(techTag);
    });
  }
  infoSection.appendChild(techSection);

  // Links
  const linksSection = document.createElement("div");
  linksSection.className = "portfolio-project-links";

  // View button (opens modal)
  const viewButton = document.createElement("button");
  viewButton.className = "portfolio-project-view-btn";
  viewButton.textContent = "View";
  viewButton.addEventListener("click", () => {
    // Check if openProjectModal function exists in window scope (from portfolio.js)
    if (typeof window.openProjectModal === "function") {
      window.openProjectModal(project);
    } else if (typeof openProjectModal === "function") {
      openProjectModal(project);
    } else {
      console.error("openProjectModal function not found");
      // Fallback action - you could redirect to a project detail page or external URL
      if (project.project_url) {
        window.open(project.project_url, "_blank");
      }
    }
  });
  linksSection.appendChild(viewButton);

  // External links (if provided)
  if (project.project_url) {
    const projectLink = document.createElement("a");
    projectLink.href = project.project_url;
    projectLink.className = "project-link";
    projectLink.textContent = "Project Link";
    projectLink.target = "_blank";
    linksSection.appendChild(projectLink);
  }
  if (project.github_url) {
    const githubLink = document.createElement("a");
    githubLink.href = project.github_url;
    githubLink.className = "project-link";
    githubLink.textContent = "GitHub";
    githubLink.target = "_blank";
    linksSection.appendChild(githubLink);
  }
  infoSection.appendChild(linksSection);

  // Assemble card
  card.appendChild(photoSection);
  card.appendChild(infoSection);

  return card;
}

// Load featured projects when the page loads
document.addEventListener("DOMContentLoaded", () => {
  loadFeaturedProjects();
});
