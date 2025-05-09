import { supabase } from './supabaseAPI.js';

// Function to load user's projects
async function loadProjects() {
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
            .order('created_at', { ascending: false });

        if (error) throw error;

        const projectsGrid = document.querySelector('.projects-grid');
        const emptyState = document.querySelector('.empty-state');

        // Clear existing projects
        projectsGrid.innerHTML = '';

        if (projects.length === 0) {
            // Show empty state if no projects
            projectsGrid.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            // Hide empty state and show projects
            projectsGrid.style.display = 'grid';
            emptyState.style.display = 'none';

            // Add each project to the grid
            projects.forEach(project => {
                const projectCard = createProjectCard(project);
                projectsGrid.appendChild(projectCard);
            });
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        alert('Error loading projects. Please try again.');
    }
}

// Function to create a project card element
function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    
    // Create the image section
    const imageSection = document.createElement('div');
    imageSection.className = 'project-image';
    
    if (project.photo_url) {
        const img = document.createElement('img');
        img.src = project.photo_url;
        img.alt = project.title;
        imageSection.appendChild(img);
    } else {
        // Default icon if no photo
        imageSection.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4 13C4 12.4477 4.44772 12 5 12H11C11.5523 12 12 12.4477 12 13V19C12 19.5523 11.5523 20 11 20H5C4.44772 20 4 19.5523 4 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 13C16 12.4477 16.4477 12 17 12H19C19.5523 12 20 12.4477 20 13V19C20 19.5523 19.5523 20 19 20H17C16.4477 20 16 19.5523 16 19V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    }

    // Create the content section
    const contentSection = document.createElement('div');
    contentSection.className = 'project-content';
    
    const title = document.createElement('h3');
    title.className = 'project-title';
    title.textContent = project.title;

    const tech = document.createElement('p');
    tech.className = 'project-tech';
    tech.textContent = `Technology Used: ${project.languages.join(', ')}`;

    contentSection.appendChild(title);
    contentSection.appendChild(tech);

    // Add click event to view project details
    card.addEventListener('click', () => {
        // TODO: Implement project details view
        console.log('View project:', project);
    });

    // Assemble the card
    card.appendChild(imageSection);
    card.appendChild(contentSection);

    return card;
}

// Load projects when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
}); 