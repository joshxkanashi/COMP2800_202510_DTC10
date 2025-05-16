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
    
    if (project.photo_urls && project.photo_urls.length > 0) {
        // Create carousel container
        const carousel = document.createElement('div');
        carousel.className = 'photo-carousel';
        
        // Add all images to carousel
        project.photo_urls.forEach((url, index) => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = `${project.title} - Image ${index + 1}`;
            img.className = 'carousel-image';
            if (index === 0) {
                img.classList.add('active');
            }
            carousel.appendChild(img);
        });

        // Add navigation arrows if multiple photos
        if (project.photo_urls.length > 1) {
            // Left arrow
            const leftArrow = document.createElement('button');
            leftArrow.className = 'carousel-arrow carousel-arrow-left';
            leftArrow.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            
            // Right arrow
            const rightArrow = document.createElement('button');
            rightArrow.className = 'carousel-arrow carousel-arrow-right';
            rightArrow.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 6L15 12L9 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;

            // Add dots indicator
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'carousel-dots';
            project.photo_urls.forEach((_, index) => {
                const dot = document.createElement('span');
                dot.className = 'carousel-dot';
                dot.classList.toggle('active', index === 0);
                dotsContainer.appendChild(dot);
            });

            // Add carousel controls
            carousel.appendChild(leftArrow);
            carousel.appendChild(rightArrow);
            carousel.appendChild(dotsContainer);

            // Carousel functionality
            let currentIndex = 0;
            const images = carousel.querySelectorAll('.carousel-image');
            const dots = carousel.querySelectorAll('.carousel-dot');
            let isAnimating = false;

            function showImage(index, direction = 'next') {
                if (isAnimating) return;
                isAnimating = true;

                const currentImage = images[currentIndex];
                const nextImage = images[index];

                // Remove active class from current image
                currentImage.classList.remove('active');
                if (direction === 'next') {
                    currentImage.classList.add('prev');
                }

                // Add active class to next image
                nextImage.classList.add('active');
                if (direction === 'prev') {
                    nextImage.style.transform = 'translateX(-100%)';
                    // Force reflow
                    nextImage.offsetHeight;
                    nextImage.style.transform = 'translateX(0)';
                }

                // Update dots
                dots.forEach(dot => dot.classList.remove('active'));
                dots[index].classList.add('active');

                currentIndex = index;

                // Reset animation flag after transition
                setTimeout(() => {
                    isAnimating = false;
                    currentImage.classList.remove('prev');
                }, 300);
            }

            leftArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                const newIndex = (currentIndex - 1 + images.length) % images.length;
                showImage(newIndex, 'prev');
            });

            rightArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                const newIndex = (currentIndex + 1) % images.length;
                showImage(newIndex, 'next');
            });

            // Add touch swipe support
            let touchStartX = 0;
            let touchEndX = 0;

            carousel.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            });

            carousel.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            });

            function handleSwipe() {
                if (isAnimating) return;
                const swipeThreshold = 50;
                if (touchEndX < touchStartX - swipeThreshold) {
                    // Swipe left
                    const newIndex = (currentIndex + 1) % images.length;
                    showImage(newIndex, 'next');
                } else if (touchEndX > touchStartX + swipeThreshold) {
                    // Swipe right
                    const newIndex = (currentIndex - 1 + images.length) % images.length;
                    showImage(newIndex, 'prev');
                }
            }
        }

        imageSection.appendChild(carousel);
    } else if (project.photo_url) {
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

    const description = document.createElement('p');
    description.className = 'project-description';
    description.textContent = project.description || 'No description available';

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'project-actions';
    actions.style.display = 'flex';
    actions.style.gap = '0.5rem';
    actions.style.marginTop = '1rem';

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        window.location.href = `editproject.html?id=${project.id}`;
    };

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this project?')) {
            try {
                const { error } = await supabase
                    .from('projects')
                    .delete()
                    .eq('id', project.id);
                if (error) throw error;
                card.remove();
            } catch (err) {
                alert('Failed to delete project.');
            }
        }
    };

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    contentSection.appendChild(title);
    contentSection.appendChild(tech);
    contentSection.appendChild(description);
    contentSection.appendChild(actions);

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