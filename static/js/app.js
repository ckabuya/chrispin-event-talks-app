// Application State
let releaseNotes = [];
let filteredNotes = [];
let selectedNote = null;
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const updatesList = document.getElementById('updates-list');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const retryBtn = document.getElementById('retry-btn');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const exportCsvBtn = document.getElementById('export-csv-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');

const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterBadges = document.getElementById('filter-badges');

const totalCountEl = document.getElementById('total-count');
const featureCountEl = document.getElementById('feature-count');
const issueCountEl = document.getElementById('issue-count');

const mainContent = document.getElementById('main-content');
const detailsPlaceholder = document.getElementById('details-placeholder');
const detailsView = document.getElementById('details-view');
const mobileBackBtn = document.getElementById('mobile-back-btn');

const detailDate = document.getElementById('detail-date');
const detailBadge = document.getElementById('detail-badge');
const detailTitle = document.getElementById('detail-title');
const detailLink = document.getElementById('detail-link');
const detailContent = document.getElementById('detail-content');

const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const progressCircle = document.getElementById('progress-circle');
const suggestBtn = document.getElementById('suggest-btn');
const copyBtn = document.getElementById('copy-btn');
const tweetBtn = document.getElementById('tweet-btn');
const tweetPreviewText = document.getElementById('tweet-preview-text');
const previewTweetTime = document.getElementById('preview-tweet-time');

const toastContainer = document.getElementById('toast-container');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Load theme on startup
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeIcon.setAttribute('data-lucide', 'moon');
        lucide.createIcons();
    }
    fetchReleases();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh & Retry
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    retryBtn.addEventListener('click', () => fetchReleases(true));
    exportCsvBtn.addEventListener('click', () => exportToCSV());
    themeToggleBtn.addEventListener('click', () => toggleTheme());

    // Search Input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'flex' : 'none';
        applyFilters();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFilters();
    });

    // Category Filter Badges
    filterBadges.addEventListener('click', (e) => {
        const badge = e.target.closest('.filter-badge');
        if (!badge) return;

        // Toggle active badge UI
        document.querySelectorAll('.filter-badge').forEach(b => b.classList.remove('active'));
        badge.classList.add('active');

        currentFilter = badge.dataset.type;
        applyFilters();
    });

    // Tweet Editor input
    tweetTextarea.addEventListener('input', () => {
        updateTweetLengthProgress();
    });

    // Suggest Tweet button
    suggestBtn.addEventListener('click', () => {
        if (selectedNote) {
            draftDefaultTweet(selectedNote);
            showToast('Auto-drafted tweet!', 'success');
        }
    });

    // Copy to clipboard
    copyBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
        }).catch(err => {
            showToast('Failed to copy text', 'error');
        });
    });

    // Share on Twitter/X
    tweetBtn.addEventListener('click', () => {
        const text = encodeURIComponent(tweetTextarea.value);
        const url = `https://x.com/intent/tweet?text=${text}`;
        window.open(url, '_blank');
        showToast('Opening Twitter / X...', 'info');
    });

    // Mobile Navigation Back Button
    mobileBackBtn.addEventListener('click', () => {
        mainContent.classList.remove('active');
        document.querySelector('.sidebar').classList.remove('hidden');
    });
}

// Fetch Release Notes from API
async function fetchReleases(forceRefresh = false) {
    showLoading(true);
    refreshIcon.classList.add('spin');
    refreshBtn.disabled = true;

    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            releaseNotes = result.data;
            applyFilters();
            updateStats();
            
            if (forceRefresh) {
                showToast('Release notes updated successfully!', 'success');
            }
        } else {
            throw new Error(result.error || 'Unknown server error');
        }
    } catch (err) {
        console.error(err);
        showError(err.message || 'Failed to fetch release notes.');
    } finally {
        showLoading(false);
        refreshIcon.classList.remove('spin');
        refreshBtn.disabled = false;
    }
}

// Stats Calculation
function updateStats() {
    totalCountEl.textContent = releaseNotes.length;
    
    const features = releaseNotes.filter(n => n.type.toLowerCase() === 'feature').length;
    featureCountEl.textContent = features;
    
    const issues = releaseNotes.filter(n => n.type.toLowerCase() === 'issue').length;
    issueCountEl.textContent = issues;
}

// Search and Category Filter logic
function applyFilters() {
    filteredNotes = releaseNotes.filter(note => {
        // Category check
        const categoryMatch = currentFilter === 'all' || 
                              note.type.toLowerCase() === currentFilter.toLowerCase();
        
        // Search query check (search date, type, content, plain text)
        const textMatch = !searchQuery || 
                          note.date.toLowerCase().includes(searchQuery) ||
                          note.type.toLowerCase().includes(searchQuery) ||
                          note.text.toLowerCase().includes(searchQuery);
                          
        return categoryMatch && textMatch;
    });

    renderUpdatesList();
}

// Render the updates list in the sidebar
function renderUpdatesList() {
    updatesList.innerHTML = '';
    
    if (filteredNotes.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    filteredNotes.forEach(note => {
        const li = document.createElement('li');
        li.className = 'update-item';
        if (selectedNote && selectedNote.id === note.id) {
            li.classList.add('active');
        }
        
        // Get badge class
        const badgeClass = getBadgeClass(note.type);
        
        // Clean text excerpt
        const excerpt = note.text.substring(0, 110) + (note.text.length > 110 ? '...' : '');

        li.innerHTML = `
            <div class="update-item-header">
                <span class="update-item-date">${note.date}</span>
                <div class="update-item-actions">
                    <span class="badge ${badgeClass}">${note.type}</span>
                    <button class="card-copy-btn" title="Copy release note text" data-id="${note.id}">
                        <i data-lucide="copy"></i>
                    </button>
                </div>
            </div>
            <p class="update-item-excerpt">${excerpt}</p>
        `;
        
        // Bind card copy button click specifically
        const cardCopyBtn = li.querySelector('.card-copy-btn');
        cardCopyBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop click from selecting the card
            navigator.clipboard.writeText(note.text).then(() => {
                showToast('Copied release note to clipboard!', 'success');
            }).catch(err => {
                showToast('Failed to copy text', 'error');
            });
        });
        
        li.addEventListener('click', () => {
            selectUpdate(note);
            
            // Handle active list item class
            document.querySelectorAll('.update-item').forEach(item => item.classList.remove('active'));
            li.classList.add('active');
        });
        
        updatesList.appendChild(li);
    });
    lucide.createIcons();
}

// Selected Update Display details
function selectUpdate(note) {
    selectedNote = note;
    
    // Show details view panel
    detailsPlaceholder.style.display = 'none';
    detailsView.style.display = 'flex';
    
    // Fill text
    detailDate.textContent = note.date;
    detailTitle.textContent = `Google BigQuery - ${note.type} Update`;
    detailLink.href = note.link;
    detailContent.innerHTML = note.content;
    
    // Badge Setup
    detailBadge.className = `badge ${getBadgeClass(note.type)}`;
    detailBadge.textContent = note.type;
    
    // Auto Draft Tweet
    draftDefaultTweet(note);
    
    // Re-init lucide icons inside details
    lucide.createIcons();
    
    // Responsive mobile view check: show active details panel
    if (window.innerWidth <= 768) {
        mainContent.classList.add('active');
        document.querySelector('.sidebar').classList.add('hidden');
    }
}

// Generate default tweet text based on note contents
function draftDefaultTweet(note) {
    const typeHash = note.type.toLowerCase() === 'feature' ? '#Feature' : 
                     note.type.toLowerCase() === 'issue' ? '#Issue' : 
                     note.type.toLowerCase() === 'deprecated' ? '#Deprecated' : '#Update';
    
    const prefix = `📢 Google #BigQuery ${typeHash} (${note.date}):\n\n`;
    const suffix = `\n\nRead more: ${note.link}`;
    
    const maxExcerpt = 280 - prefix.length - suffix.length - 10;
    let bodyText = note.text;
    
    if (bodyText.length > maxExcerpt) {
        bodyText = bodyText.substring(0, maxExcerpt - 3).trim() + '...';
    }
    
    const defaultTweet = `${prefix}"${bodyText}"${suffix}`;
    tweetTextarea.value = defaultTweet;
    
    updateTweetLengthProgress();
}

// Character counter and visual circular progress loader for X composer
function updateTweetLengthProgress() {
    const text = tweetTextarea.value;
    const len = text.length;
    const limit = 280;
    const remaining = limit - len;
    
    charCounter.textContent = remaining;
    
    // Progress calculation
    const progress = Math.min(len / limit, 1.0);
    const circleCircumference = 62.83; // 2 * pi * r
    const offset = circleCircumference * (1 - progress);
    
    progressCircle.style.strokeDashoffset = offset;
    
    // Colors and Alert classes
    charCounter.className = '';
    progressCircle.style.stroke = 'var(--color-twitter)';
    
    if (remaining <= 20 && remaining > 0) {
        charCounter.classList.add('warning');
        progressCircle.style.stroke = 'var(--color-deprecated)';
    } else if (remaining <= 0) {
        charCounter.classList.add('danger');
        progressCircle.style.stroke = 'var(--color-issue)';
    }
    
    // Update live preview text
    tweetPreviewText.textContent = text || '...';
    
    // Live X preview relative time
    previewTweetTime.textContent = 'now';
}

// Helpers
function getBadgeClass(type) {
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'feature';
    if (t.includes('issue')) return 'issue';
    if (t.includes('deprecat')) return 'deprecated';
    if (t.includes('change')) return 'change';
    if (t.includes('resolve')) return 'resolved';
    return 'update';
}

function showLoading(isLoading) {
    if (isLoading) {
        loadingState.style.display = 'flex';
        updatesList.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
    } else {
        loadingState.style.display = 'none';
        updatesList.style.display = 'block';
    }
}

function showError(msg) {
    loadingState.style.display = 'none';
    updatesList.style.display = 'none';
    emptyState.style.display = 'none';
    errorState.style.display = 'flex';
    errorMessage.textContent = msg;
}

// Toast Notifications System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-octagon';
    
    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    lucide.createIcons();
    
    // Trigger slide-in
    setTimeout(() => {
        toast.classList.add('showing');
    }, 10);
    
    // Remove Toast
    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3500);
}

// Export updates list to CSV format
function exportToCSV() {
    if (!filteredNotes || filteredNotes.length === 0) {
        showToast('No data to export', 'error');
        return;
    }
    
    // CSV headers
    const headers = ['Date', 'Type', 'Content Text', 'Documentation Link'];
    
    // Construct rows with double-quotes handling
    const rows = filteredNotes.map(note => {
        const date = `"${note.date.replace(/"/g, '""')}"`;
        const type = `"${note.type.replace(/"/g, '""')}"`;
        const text = `"${note.text.replace(/"/g, '""')}"`;
        const link = `"${note.link.replace(/"/g, '""')}"`;
        return [date, type, text, link].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create download link element and trigger it
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadLink.setAttribute('href', url);
    downloadLink.setAttribute('download', `bigquery_releases_${timestamp}.csv`);
    downloadLink.style.visibility = 'hidden';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    showToast(`Exported ${filteredNotes.length} updates to CSV!`, 'success');
}

// Toggle between light and dark themes
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    // Update Lucide icon
    themeIcon.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
    lucide.createIcons();
    
    showToast(`Switched to ${isLight ? 'Light' : 'Dark'} Mode!`, 'success');
}
