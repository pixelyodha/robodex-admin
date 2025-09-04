import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBNaxvvv_w3DimTJHIbLWRNpGyZDR9ET70",
  authDomain: "robodex-4f848.firebaseapp.com",
  projectId: "robodex-4f848",
  storageBucket: "robodex-4f848.appspot.com",
  messagingSenderId: "28240235204",
  appId: "1:28240235204:web:2e7c3cdbb59dd6aa139791",
  measurementId: "G-BRWP89KCJT"
};

const ADMIN_UID = "MX3biaKU71WE0EMXxnYsuYwExO93"; // Your admin UID

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM Elements
const loginForm = document.getElementById("login-form");
const loginSection = document.getElementById("login-section");
const adminPanel = document.getElementById("admin-panel");
const logoutBtn = document.getElementById("logout-btn");

// Track base64 images for each section
const base64Images = {
  member: "",
  event: "",
  project: "",
  gallery: ""
};

// Password toggle functionality
const togglePassword = document.getElementById("toggle-password");
const passwordInput = document.getElementById("password");

togglePassword?.addEventListener("click", () => {
  const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);
  togglePassword.textContent = type === "password" ? "show" : "hide";
});

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user && user.uid === ADMIN_UID) {
    // User is signed in and is admin
    loginSection.style.display = "none";
    adminPanel.style.display = "block";
    initializeAdminPanel(user);
    updateSystemInfo(user);
  } else {
    // User is signed out or not admin
    loginSection.style.display = "block";
    adminPanel.style.display = "none";
  }
});

// Login functionality
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (user.uid !== ADMIN_UID) {
      await signOut(auth);
      alert("Access Denied: Not authorized.");
    }
  } catch (err) {
    alert("Login failed: " + err.message);
    console.error(err);
  }
});

// Logout functionality
logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    alert("Logged out successfully!");
  } catch (err) {
    console.error("Error signing out:", err);
  }
});

// Update system info
function updateSystemInfo(user) {
  document.getElementById("admin-email").textContent = user.email;
  document.getElementById("last-login").textContent = new Date().toLocaleString();
}

// Escape HTML (for security)
function escapeHtml(str) {
  if (!str) return '';
  return str.toString().replace(/[&<>'"]/g, (tag) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[tag]));
}

// Initialize Admin Panel (setup forms, listeners, rendering)
function initializeAdminPanel(user) {
  // Tab Switching
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
      tab.classList.add("active");
      const target = document.getElementById(tab.dataset.tab);
      if (target) target.classList.add("active");
    });
  });

  // Quick action buttons
  document.querySelectorAll(".quick-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
      
      document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add("active");
      document.getElementById(tabId).classList.add("active");
    });
  });

  // Initialize image upload for each section
  initImageUpload("member");
  initImageUpload("event");
  initImageUpload("project");
  
  // Setup forms with image handling
  setupFormWithImage("member-form", "members", "members-list");
  setupFormWithImage("event-form", "events", "events-list");
  setupFormWithImage("project-form", "projects", "projects-list");
  
  // Setup Gallery Form
  initGalleryForm();

  // Load data
  loadAllData();
}

// Initialize image upload for a section
function initImageUpload(section) {
  const fileInput = document.getElementById(`${section}-image-upload`);
  const fileNameDisplay = document.getElementById(`${section}-file-name`);
  const imagePreview = document.getElementById(`${section}-image-preview`);
  const fileInputButton = document.querySelector(`#${section}-form .file-input-button`);
  const progressBar = document.querySelector(`#${section}-form .progress-bar`);
  const progressText = document.querySelector(`#${section}-form .progress-text`);
  const uploadProgress = document.querySelector(`#${section}-form .upload-progress`);
  
  if (!fileInput || !imagePreview) return;
  
  // Connect file input to button
  fileInputButton?.addEventListener("click", () => {
    fileInput.click();
  });
  
  // File selection
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.match('image.*')) {
      alert('Please select an image file (jpg, png, gif, etc.)');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Please select an image under 5MB.');
      return;
    }
    
    // Display filename
    if (fileNameDisplay) fileNameDisplay.textContent = file.name;
    
    // Show progress
    if (uploadProgress) uploadProgress.style.display = "block";
    if (progressBar) progressBar.style.width = "0%";
    if (progressText) progressText.textContent = "0%";
    
    // Process image
    compressImage(file, 1200, 1200, 0.7).then(compressedBase64 => {
      base64Images[section] = compressedBase64;
      imagePreview.src = compressedBase64;
      imagePreview.style.display = "block";
      
      if (progressBar) progressBar.style.width = "100%";
      if (progressText) progressText.textContent = "Ready!";
      
      // Hide progress bar after a moment
      setTimeout(() => {
        if (uploadProgress) uploadProgress.style.display = "none";
      }, 1000);
    }).catch(err => {
      console.error(`Error compressing ${section} image:`, err);
      alert("Error processing image: " + err.message);
      if (uploadProgress) uploadProgress.style.display = "none";
    });
  });
}

// Setup form with image handling
function setupFormWithImage(formId, collectionName, listId) {
  const form = document.getElementById(formId);
  if (!form) return;
  
  const section = formId.split('-')[0]; // Extract section name (member, event, project)
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!base64Images[section]) {
      alert("Please select an image first");
      return;
    }
    
    try {
      const formData = new FormData(form);
      const obj = Object.fromEntries(formData.entries());
      
      // Special handling for boolean values
      if (obj.isPresident !== undefined) {
        obj.isPresident = obj.isPresident === "true";
      }
      
      // Special handling for comma-separated values
      if (obj.technologies) {
        obj.technologies = obj.technologies
          .split(",")
          .map(tech => tech.trim())
          .filter(tech => tech.length > 0);
      }
      
      // Add base64 image
      obj.imageURL = base64Images[section];
      
      // Add timestamp
      obj.timestamp = serverTimestamp();
      
      await addDoc(collection(db, collectionName), obj);
      
      // Reset form and image
      form.reset();
      document.getElementById(`${section}-image-preview`).style.display = "none";
      document.getElementById(`${section}-file-name`).textContent = "No file chosen";
      base64Images[section] = "";
      
      // Update UI
      renderList(collectionName, listId);
      updateCounts();
      
      alert(`New ${collectionName.slice(0, -1)} added successfully!`);
    } catch (err) {
      console.error(`Error adding ${collectionName}:`, err);
      alert(`Failed to add ${collectionName.slice(0, -1)}: ${err.message}`);
    }
  });
}

// Load all data for dashboard and lists
async function loadAllData() {
  try {
    // Load counts for dashboard
    updateCounts();
    
    // Load lists
    renderList("events", "events-list");
    renderList("members", "members-list");
    renderList("projects", "projects-list");
    renderGalleryItems();
  } catch (err) {
    console.error("Error loading data:", err);
  }
}

// Update counts for dashboard
async function updateCounts() {
  try {
    const collections = ["members", "events", "projects", "gallery"];
    
    for (const collName of collections) {
      const snapshot = await getDocs(collection(db, collName));
      const countElement = document.getElementById(`${collName}-count`);
      if (countElement) {
        countElement.textContent = snapshot.size;
      }
    }
  } catch (err) {
    console.error("Error updating counts:", err);
  }
}

// Render List of Items
async function renderList(type, listId) {
  try {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = "";

    const snapshot = await getDocs(collection(db, type));
    
    if (snapshot.empty) {
      list.innerHTML = `<div class="empty-message">No ${type} found. Add some!</div>`;
      return;
    }
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.className = "item";
      
      // For image preview in list items
      let imagePreview = "";
      if (data.imageURL && data.imageURL.startsWith('data:image')) {
        imagePreview = `<img src="${data.imageURL}" alt="${escapeHtml(data.name || '')}" style="max-width:200px; max-height:150px; margin-bottom:10px;">`;
      }
      
      div.innerHTML = `
        ${imagePreview}
        <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
        <button onclick="deleteItem('${type}', '${docSnap.id}', '${listId}')">Delete</button>
      `;
      list.appendChild(div);
    });
  } catch (err) {
    console.error("Error rendering list:", err);
    document.getElementById(listId).innerHTML = 
      `<div class="error-message">Error loading data: ${err.message}</div>`;
  }
}

// Delete Document
window.deleteItem = async function (type, id, listId) {
  if (!confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) {
    return;
  }
  
  try {
    await deleteDoc(doc(db, type, id));
    
    if (listId === "gallery-list") {
      renderGalleryItems();
    } else {
      renderList(type, listId);
    }
    
    updateCounts();
    alert(`${type.slice(0, -1)} deleted successfully!`);
  } catch (err) {
    console.error("Error deleting item:", err);
    alert("Failed to delete item: " + err.message);
  }
};

// Initialize Gallery Form
function initGalleryForm() {
  const galleryForm = document.getElementById("gallery-form");
  if (!galleryForm) return;
  
  const mediaTypeSelect = document.getElementById("media-type");
  const imageUploadContainer = document.getElementById("image-upload-container");
  const videoUrlContainer = document.getElementById("video-url-container");
  const imageUpload = document.getElementById("image-upload");
  const imagePreview = document.getElementById("image-preview");
  const videoPreviewContainer = document.getElementById("video-preview-container");
  const videoUrlInput = document.getElementById("video-url");
  const fileNameDisplay = document.getElementById("file-name");
  const progressBar = document.querySelector("#gallery-form .progress-bar");
  const progressText = document.querySelector("#gallery-form .progress-text");
  const uploadProgress = document.querySelector("#gallery-form .upload-progress");
  const fileInputButton = document.querySelector("#gallery-form .file-input-button");
  
  // Media type toggle
  mediaTypeSelect?.addEventListener("change", () => {
    const isVideo = mediaTypeSelect.value === "video";
    if (imageUploadContainer) imageUploadContainer.style.display = isVideo ? "none" : "block";
    if (videoUrlContainer) videoUrlContainer.style.display = isVideo ? "block" : "none";
    if (imagePreview) imagePreview.style.display = "none";
    if (videoPreviewContainer) videoPreviewContainer.style.display = "none";
  });
  
  // Connect file input to button
  fileInputButton?.addEventListener("click", () => {
    imageUpload.click();
  });
  
  // Video URL input handler
  videoUrlInput?.addEventListener("input", () => {
    if (videoPreviewContainer) {
      videoPreviewContainer.style.display = videoUrlInput.value ? "block" : "none";
    }
  });
  
  // File selection
  imageUpload?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.match('image.*')) {
      alert('Please select an image file (jpg, png, gif, etc.)');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Please select an image under 5MB.');
      return;
    }
    
    // Display filename
    if (fileNameDisplay) fileNameDisplay.textContent = file.name;
    
    // Show progress
    if (uploadProgress) uploadProgress.style.display = "block";
    if (progressBar) progressBar.style.width = "0%";
    if (progressText) progressText.textContent = "0%";
    
    // Process image
    compressImage(file, 1200, 1200, 0.7).then(compressedBase64 => {
      base64Images.gallery = compressedBase64;
      if (imagePreview) {
        imagePreview.src = compressedBase64;
        imagePreview.style.display = "block";
      }
      if (progressBar) progressBar.style.width = "100%";
      if (progressText) progressText.textContent = "Ready!";
      
      // Hide progress bar after a moment
      setTimeout(() => {
        if (uploadProgress) uploadProgress.style.display = "none";
      }, 1000);
    }).catch(err => {
      console.error("Error compressing image:", err);
      alert("Error processing image: " + err.message);
      if (uploadProgress) uploadProgress.style.display = "none";
    });
  });
  
  // Form submission
  galleryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const isVideo = mediaTypeSelect?.value === "video";
    
    if (isVideo && videoUrlInput && !videoUrlInput.value) {
      alert("Please enter a video URL");
      return;
    } else if (!isVideo && !base64Images.gallery) {
      alert("Please select an image first");
      return;
    }
    
    try {
      const title = galleryForm.elements.title.value;
      const date = galleryForm.elements.date.value;
      const category = galleryForm.elements.category.value;
      const description = galleryForm.elements.description.value;
      
      // Prepare data based on media type
      const galleryData = {
        title,
        date,
        category,
        description,
        mediaType: isVideo ? "video" : "image",
        timestamp: serverTimestamp()
      };
      
      if (isVideo) {
        // Extract video ID and platform
        const videoInfo = parseVideoUrl(videoUrlInput.value);
        if (!videoInfo) {
          alert("Please enter a valid YouTube or Vimeo URL");
          return;
        }
        
        galleryData.videoURL = videoUrlInput.value;
        galleryData.videoId = videoInfo.id;
        galleryData.videoPlatform = videoInfo.platform;
      } else {
        galleryData.imageURL = base64Images.gallery;
      }
      
      await addDoc(collection(db, "gallery"), galleryData);
      
      // Reset form
      galleryForm.reset();
      if (imagePreview) imagePreview.style.display = "none";
      if (videoPreviewContainer) videoPreviewContainer.style.display = "none";
      if (fileNameDisplay) fileNameDisplay.textContent = "No file chosen";
      base64Images.gallery = "";
      
      // Reset media type to default (image)
      if (mediaTypeSelect) {
        mediaTypeSelect.value = "image";
        if (imageUploadContainer) imageUploadContainer.style.display = "block";
        if (videoUrlContainer) videoUrlContainer.style.display = "none";
      }
      
      // Refresh gallery list
      renderGalleryItems();
      updateCounts();
      
      alert("Media added to gallery successfully!");
    } catch (err) {
      console.error("Error adding gallery item:", err);
      alert("Failed to add gallery item: " + err.message);
    }
  });
}

// Parse video URL to extract platform and ID
function parseVideoUrl(url) {
  if (!url) return null;
  
  // YouTube
  let match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (match) {
    return { platform: 'youtube', id: match[1] };
  }
  
  // Vimeo
  match = url.match(/(?:vimeo\.com\/)([0-9]+)/);
  if (match) {
    return { platform: 'vimeo', id: match[1] };
  }
  
  return null;
}

// Compress and resize image
function compressImage(file, maxWidth, maxHeight, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }
        
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress image
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get as base64
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      
      img.onerror = reject;
      img.src = event.target.result;
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Render Gallery Items
async function renderGalleryItems() {
  try {
    const galleryList = document.getElementById("gallery-list");
    if (!galleryList) return;
    galleryList.innerHTML = "";
    
    const snapshot = await getDocs(collection(db, "gallery"));
    
    if (snapshot.empty) {
      galleryList.innerHTML = "<div class='empty-message'>No gallery items found. Add some!</div>";
      return;
    }
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.className = "item";
      
      const isVideo = data.mediaType === "video";
      
      let mediaHtml = '';
      if (isVideo) {
        // Generate embed HTML based on platform
        if (data.videoPlatform === 'youtube') {
          mediaHtml = `
            <div class="video-container">
              <span class="media-type-badge">Video</span>
              <iframe src="https://www.youtube.com/embed/${data.videoId}" 
                title="${escapeHtml(data.title)}" allow="accelerometer; autoplay; clipboard-write; 
                encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
          `;
        } else if (data.videoPlatform === 'vimeo') {
          mediaHtml = `
            <div class="video-container">
              <span class="media-type-badge">Video</span>
              <iframe src="https://player.vimeo.com/video/${data.videoId}" 
                title="${escapeHtml(data.title)}" allow="autoplay; fullscreen; 
                picture-in-picture" allowfullscreen></iframe>
            </div>
          `;
        } else {
          mediaHtml = `<p>Video URL: ${escapeHtml(data.videoURL)}</p>`;
        }
      } else {
        // Image
        mediaHtml = `
          <img src="${data.imageURL}" alt="${escapeHtml(data.title)}">
          <span class="media-type-badge">Image</span>
        `;
      }
      
      div.innerHTML = `
        ${mediaHtml}
        <div class="details">
          <h3>${escapeHtml(data.title)}</h3>
          <p>${escapeHtml(data.date)}</p>
          <span class="category">${escapeHtml(data.category)}</span>
          ${data.description ? `<p>${escapeHtml(data.description)}</p>` : ""}
          <button onclick="deleteItem('gallery', '${docSnap.id}', 'gallery-list')">Delete</button>
        </div>
      `;
      
      galleryList.appendChild(div);
    });
  } catch (err) {
    console.error("Error rendering gallery items:", err);
    document.getElementById("gallery-list").innerHTML = 
      `<div class="error-message">Error loading gallery: ${err.message}</div>`;
  }
}

// Initial check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
  // The onAuthStateChanged listener above will handle the auth state
  console.log("Admin panel initialized");
});