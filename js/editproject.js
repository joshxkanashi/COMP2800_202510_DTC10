import { supabase } from './supabaseAPI.js';

// Get project ID from URL
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('id');
if (!projectId) {
    alert('No project ID provided.');
    window.location.href = 'projects.html';
}

const form = document.getElementById('editProjectForm');
const titleInput = document.getElementById('projectTitle');
const descInput = document.getElementById('projectDescription');
const photoUpload = document.getElementById('photoUpload');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const languageTags = document.querySelectorAll('.language-tag');
const selectedLanguages = new Set();
let selectedPhotos = [];
let currentPhotoUrls = [];
const urlInput = document.getElementById('projectUrl');

// Fetch project data and pre-fill form
async function loadProject() {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
    if (error || !data) {
        alert('Project not found.');
        window.location.href = 'projects.html';
        return;
    }
    titleInput.value = data.title;
    descInput.value = data.description;
    urlInput.value = data.project_url || '';

    // Load existing photos
    if (data.photo_urls && Array.isArray(data.photo_urls)) {
        currentPhotoUrls = data.photo_urls;
        selectedPhotos = data.photo_urls.map(url => ({ preview: url, file: null }));
        updatePhotoPreview();
    } else if (data.photo_url) {
        currentPhotoUrls = [data.photo_url];
        selectedPhotos = [{ preview: data.photo_url, file: null }];
        updatePhotoPreview();
    }

    // Pre-select languages
    if (Array.isArray(data.languages)) {
        data.languages.forEach(lang => {
            selectedLanguages.add(lang);
            languageTags.forEach(tag => {
                if (tag.dataset.lang === lang) tag.classList.add('selected');
            });
        });
    }
}

function updatePhotoPreview() {
    photoPreview.innerHTML = '';
    selectedPhotos.forEach((photo, index) => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `
            <img src="${photo.preview}" alt="Preview">
            <button type="button" class="remove-photo" data-index="${index}">×</button>
        `;
        photoPreview.appendChild(div);
    });
}

photoUpload.addEventListener('click', () => {
    photoInput.click();
});

photoInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedPhotos.push({
                    file,
                    preview: e.target.result
                });
                updatePhotoPreview();
            };
            reader.readAsDataURL(file);
        }
    });
});

photoPreview.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-photo')) {
        const index = e.target.dataset.index;
        selectedPhotos.splice(index, 1);
        updatePhotoPreview();
    }
});

languageTags.forEach(tag => {
    tag.addEventListener('click', () => {
        tag.classList.toggle('selected');
        const lang = tag.dataset.lang;
        if (selectedLanguages.has(lang)) {
            selectedLanguages.delete(lang);
        } else {
            selectedLanguages.add(lang);
        }
    });
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('.submit-btn');
    submitBtn.disabled = true;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Upload new photos
        const newPhotoUrls = [];
        for (const photo of selectedPhotos) {
            if (photo.file) {
                const fileExt = photo.file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${user.id}/${fileName}`;
                const { error: uploadError } = await supabase.storage
                    .from('project-photos')
                    .upload(filePath, photo.file, {
                        cacheControl: '3600',
                        upsert: false
                    });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage
                    .from('project-photos')
                    .getPublicUrl(filePath);
                newPhotoUrls.push(publicUrl);
            } else {
                // Keep existing photo URLs
                newPhotoUrls.push(photo.preview);
            }
        }

        // Update project
        const { error } = await supabase
            .from('projects')
            .update({
                title: form.title.value,
                description: form.description.value,
                photo_url: newPhotoUrls[0] || null, // Store first photo as main photo
                photo_urls: newPhotoUrls, // Store all photo URLs
                languages: Array.from(selectedLanguages),
                project_url: form.project_url.value // Add project_url
            })
            .eq('id', projectId);
        if (error) throw error;
        window.location.href = 'projects.html';
    } catch (error) {
        alert(error.message || 'Error updating project.');
    } finally {
        submitBtn.disabled = false;
    }
});

// Load project data on page load
loadProject(); 