import { supabase } from './supabaseAPI.js';

// Handle photo upload
const photoUpload = document.getElementById('photoUpload');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
let selectedPhotos = [];

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

photoPreview.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-photo')) {
        const index = e.target.dataset.index;
        selectedPhotos.splice(index, 1);
        updatePhotoPreview();
    }
});

// Handle language selection
const languageTags = document.querySelectorAll('.language-tag');
const selectedLanguages = new Set();

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

// Handle form submission
const form = document.getElementById('addProjectForm');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('.submit-btn');
    submitBtn.disabled = true;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Upload photos first
        const photoUrls = [];
        for (const photo of selectedPhotos) {
            try {
                const fileExt = photo.file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${user.id}/${fileName}`;

                // Upload the file
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('project-photos')
                    .upload(filePath, photo.file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    throw uploadError;
                }

                // Get the public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('project-photos')
                    .getPublicUrl(filePath);

                photoUrls.push(publicUrl);
            } catch (error) {
                console.error('Error uploading photo:', error);
                throw new Error('Failed to upload photo. Please try again.');
            }
        }

        // Create project
        const { data, error } = await supabase
            .from('projects')
            .insert([
                {
                    user_id: user.id,
                    title: form.title.value,
                    description: form.description.value,
                    photo_url: photoUrls[0] || null, // Store first photo as main photo
                    photo_urls: photoUrls, // Store all photo URLs
                    languages: Array.from(selectedLanguages),
                    project_url: form.project_url.value // Add project_url
                }
            ]);

        if (error) {
            console.error('Project creation error:', error);
            throw error;
        }

        // Redirect to projects page
        window.location.href = 'projects.html';
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error creating project. Please try again.');
    } finally {
        submitBtn.disabled = false;
    }
}); 