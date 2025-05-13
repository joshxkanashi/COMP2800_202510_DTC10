import { supabase } from './supabaseAPI.js';

// Function to load featured projects
async function loadFeaturedProjects() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Fetch projects for the current user
        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(3); // Only get the 3 most recent projects for featured section

        if (error) throw error;

        const projectsContainer = document.getElementById('projectsContainer');
        
        // Clear existing projects
        projectsContainer.innerHTML = '';

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
        console.error('Error loading featured projects:', error);
        alert('Error loading featured projects. Please try again.');
    }
}

// Function to create a featured project card element
function createFeaturedProjectCard(project, index) {
    const card = document.createElement('div');
    card.className = 'portfolio-project-card';
    card.setAttribute('data-item-id', `proj${index}`);
    
    // Photo section
    const photoSection = document.createElement('div');
    photoSection.className = 'portfolio-project-photo';
    if (project.photo_url) {
        const img = document.createElement('img');
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
    const infoSection = document.createElement('div');
    infoSection.className = 'portfolio-project-info';

    // Title
    const title = document.createElement('h3');
    title.className = 'portfolio-project-title';
    title.textContent = project.title;
    infoSection.appendChild(title);

    // Description
    const description = document.createElement('p');
    description.className = 'portfolio-project-description';
    description.textContent = project.description;
    infoSection.appendChild(description);

    // Languages/Tech
    const techSection = document.createElement('div');
    techSection.className = 'portfolio-project-languages';
    if (project.languages && project.languages.length > 0) {
        project.languages.forEach(lang => {
            const techTag = document.createElement('span');
            techTag.className = 'tech-tag';
            techTag.setAttribute('data-tag', lang);
            techTag.textContent = lang;
            techSection.appendChild(techTag);
        });
    }
    infoSection.appendChild(techSection);

    // Links
    const linksSection = document.createElement('div');
    linksSection.className = 'portfolio-project-links';
    if (project.project_url) {
        const projectLink = document.createElement('a');
        projectLink.href = project.project_url;
        projectLink.className = 'project-link';
        projectLink.textContent = 'View';
        linksSection.appendChild(projectLink);
    }
    if (project.github_url) {
        const githubLink = document.createElement('a');
        githubLink.href = project.github_url;
        githubLink.className = 'project-link';
        githubLink.textContent = 'GitHub';
        linksSection.appendChild(githubLink);
    }
    infoSection.appendChild(linksSection);

    // Assemble card
    card.appendChild(photoSection);
    card.appendChild(infoSection);

    return card;
}

// Load featured projects when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProjects();
}); 