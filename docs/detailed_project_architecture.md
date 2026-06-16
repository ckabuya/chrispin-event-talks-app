# Detailed Project Architecture & Request-Response Flow

This document provides a deep-dive analysis of the **BigQuery Release Tracker & X/Twitter Composer** project. It details the main features, system boundaries (Server vs. Client), and traces a sample request-response lifecycle.

---

## 🌟 Main Features Overview

1. **Category-Granular Extraction**: Instead of presenting a whole day's release notes as a single wall of text, the app extracts individual updates by splitting them on category headers (`<h3>` tags like `Feature`, `Issue`, `Deprecated`, etc.).
2. **In-Memory Server-Side Caching**: Protects Google's feed server from rate-limiting and speeds up page load times by caching parsed JSON data locally for 10 minutes (600 seconds).
3. **Circular SVG Character Progress**: Features an animated, color-shifting circular progress bar that mirrors X's composer UI, indicating the remaining character count out of 280.
4. **Intelligent Auto-Draft Truncation**: Prevents tweet text truncation issues by computing the exact character overhead of metadata headers and footer links first, then safely truncating the description body to fit exactly inside X's 280-character limit.
5. **Real-time WYSIWYG X Preview**: A pixel-perfect recreation of a Twitter/X post in dark mode that synchronizes immediately with text changes.

---

## 🖥️ Server-Side Breakdown (`app.py`)

The backend is built with **Python Flask** and operates as a stateless API gateway.

```
┌────────────────────────────────────────────────────────┐
│                        app.py                          │
├───────────────┬────────────────────────────────────────┤
│ Routes        │ - / : Serves HTML index template       │
│               │ - /api/releases : JSON endpoint        │
├───────────────┼────────────────────────────────────────┤
│ Feed Fetcher  │ urllib.request with User-Agent & TTL   │
├───────────────┼────────────────────────────────────────┤
│ XML/HTML      │ - xml.etree.ElementTree for Atom parsing│
│ Parsing       │ - bs4.BeautifulSoup for content split  │
└───────────────┴────────────────────────────────────────┘
```

### Feed Parsing Logic Detail
When raw XML is retrieved, it contains entries like:
```xml
<entry>
  <title>June 15, 2026</title>
  <content type="html"><![CDATA[<h3>Feature</h3><p>Content A</p><h3>Issue</h3><p>Content B</p>]]></content>
</entry>
```
The server-side parser:
1. Loops through each `<entry>`.
2. Takes the HTML text and feeds it into `BeautifulSoup(html, 'html.parser')`.
3. Finds all `<h3>` elements.
4. For each `<h3>`, it scans the following sibling nodes (paragraphs `<p>`, lists `<ul>`, etc.) using `.next_siblings` until it encounters the next `<h3>` tag.
5. Concatenates these siblings to rebuild a clean HTML block for that specific update, while extracting plain text for the tweet generator.
6. Returns an array of updates to the route helper.

---

## 🎨 Client-Side Breakdown

The frontend uses standard, lightweight vanilla web technologies.

### 1. Structure (`templates/index.html`)
The page layout uses a high-performance CSS grid structure:
- **Left Panel (Sidebar)**: Search bars, category selectors (`All`, `Feature`, `Issue`, etc.), statistics, and the updates scroll list.
- **Right Panel (Main View)**: Dynamic display panel showing either the initial instructions or the selected update's HTML article and the X/Twitter composer.

### 2. Styling (`static/css/style.css`)
- **Glassmorphism Theme**: Uses HSL color tokens (`#121829` to `#080c14`), `backdrop-filter: blur(16px)`, and semi-transparent borders (`rgba(255, 255, 255, 0.08)`).
- **Responsive Layout**: Utilizing CSS grid on desktop, transitioning to a media-queried stacked layout for mobile screens where a back button switches views.
- **Type Badges**: Styled with custom class variables (e.g. `.badge.feature` has an emerald glow, `.badge.issue` has a crimson border).

### 3. State Management (`static/js/app.js`)
Manages the application's runtime variables:
- `releaseNotes`: Holds the complete master list of parsed releases.
- `filteredNotes`: Stores subset of releases currently matching search query and category filters.
- `selectedNote`: Keeps track of the currently selected release note.
- `searchQuery` & `currentFilter`: Hold user selection values to re-run filter passes.

---

## 🔄 Sample Request-Response Flow

Below is the step-by-step lifecycle of what happens when a user clicks the **Refresh** button in the UI:

### Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Browser (app.js)
    participant Server as Flask Server (app.py)
    participant Feed as Google Cloud RSS Feed

    User->>Client: Clicks "Refresh" Button
    Note over Client: Trigger spinning loader icon & disabled states
    Client->>Server: GET /api/releases?refresh=true
    
    alt Force Refresh (refresh=true)
        Server->>Feed: Fetch Feed XML (with User-Agent headers)
        Feed-->>Server: Return updated XML
        Note over Server: BeautifulSoup parses and splits XML into JSON updates
        Note over Server: Update Server Cache & timestamps
    else Cached Data Available (refresh=false)
        Note over Server: Skip Feed Fetch; retrieve from in-memory Cache
    end

    Server-->>Client: Return JSON response { success: true, data: [...] }
    Note over Client: Stop spinning loader
    Note over Client: Calculate stats (total, features, issues)
    Note over Client: Run applyFilters() (Text Search + Category filter)
    Note over Client: Render list items in Sidebar
    Client-->>User: Show Toast Notification & Rendered List
```

### Step-by-Step Data State Lifecycle

#### 1. API Call Initiated
The JS code calls the API:
```javascript
const response = await fetch('/api/releases?refresh=true');
```

#### 2. Server Fetches & Formats
The server makes the network request to `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml` and parses the entries. For a "Feature" on June 15, 2026, it returns JSON resembling:
```json
{
  "success": true,
  "source": "live",
  "count": 68,
  "data": [
    {
      "id": "tag:google.com,2016:bigquery-release-notes#June_15_2026_0",
      "date": "June 15, 2026",
      "type": "Feature",
      "content": "<p>Use Gemini Cloud Assist to analyze your SQL queries...</p>",
      "text": "Use Gemini Cloud Assist to analyze your SQL queries...",
      "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_15_2026"
    }
  ]
}
```

#### 3. Client Receives & Renders
- The client receives the JSON payload, saves it into memory (`releaseNotes = result.data`), and updates count badges.
- `applyFilters()` executes. If the user typed "Gemini" in the search box, only updates containing that word remain in `filteredNotes`.
- The sidebar list is populated by generating list elements `<li>` dynamically.

#### 4. Selection & Default Tweet Drafting
When a user clicks on an update card:
1. `selectUpdate(note)` is called.
2. The HTML element `#detail-content` is updated: `detailContent.innerHTML = note.content;`.
3. `draftDefaultTweet(note)` computes:
   - Header size: `📢 Google #BigQuery #Feature (June 15, 2026):\n\n` (48 characters)
   - Footer size: `\n\nRead more: https://docs.cloud.google.com/...` (93 characters)
   - Remaining character limit: $280 - 48 - 93 - 10 = 129$ characters.
   - Truncates the text body to 126 characters, appends `...`, merges all segments, and sets the value of the tweet textarea.
4. The X post preview card updates in real-time, syncing details to the mock template.
