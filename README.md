# BigQuery Release Notes Tracker & X/Twitter Composer

A premium, responsive web application built with **Python Flask** and vanilla web languages (**HTML5, CSS3, JavaScript**). The app parses Google Cloud BigQuery's official release notes feed, divides combined daily releases into separate, categorized cards, and provides a smart writing editor to instantly share specific updates on X (Twitter).

---

## ✨ Features

- **Granular Update Splitter**: Scans release log contents and splits them by category headers (`Feature`, `Issue`, `Deprecated`, etc.) so you can read and tweet about individual updates.
- **In-Memory Feed Caching**: Implements a 10-minute caching layer on the Flask server to minimize remote network requests, increase load times, and prevent API rate-limiting.
- **Live X/Twitter Post Composer**:
  - **Auto-Draft**: Instantly generates an update-specific draft with computed safe text limits.
  - **Dynamic Character Limiter**: Interactive counter with a circular progress SVG loader showing remaining characters out of 280.
  - **WYSIWYG Mock Card**: A pixel-perfect dark-mode preview of how the post will render on the X timeline (including mock account avatar, badges, timestamps, domain links, and buttons).
- **Glassmorphism Interface**: Premium dark indigo theme utilizing CSS custom properties, backdrop blur filters, and micro-interactive badges.
- **Fuzzy Search & Filters**: Search titles/body text instantly and filter updates by category types in the sidebar.
- **Responsive Stacking**: Fluid viewport optimization that collapses to a single-column layout on mobile devices with navigation controls.

---

## 📁 Project Structure

```text
chrispin-event-talks-app/
├── app.py                      # Flask Server, XML parser, Feed caching layer
├── templates/
│   └── index.html              # Main dashboard HTML template
├── static/
│   ├── css/
│   │   └── style.css           # Glassmorphism design system & X layout
│   └── js/
│       └── app.js              # State manager, search, tweet compiler logic
├── docs/
│   └── detailed_project_architecture.md # Deep dive sequence and system design
├── .gitignore                  # Git commit exclusions
└── README.md                   # Setup and execution guide
```

---

## 🚀 Setup & Execution

### 1. Prerequisites
Ensure you have **Python 3.8+** installed.

### 2. Install Dependencies
Install the required packages using pip:
```bash
pip install Flask requests beautifulsoup4
```

### 3. Start the Server
Run the Flask app:
```bash
python app.py
```
By default, the server runs in debug mode on **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 🐙 Git & GitHub Integration

To push this project to a new repository in your GitHub account:

1. Create a blank repository named `chrispin-event-talks-app` on GitHub (**[github.com/new](https://github.com/new)**). Do not check any initialization options (README, gitignore, or license).
2. Connect your local directory and push:
   ```bash
   git remote add origin https://github.com/<your-username>/chrispin-event-talks-app.git
   git push -u origin main
   ```
   *Alternatively, if you have the GitHub CLI installed (`gh`), run:*
   ```bash
   gh repo create chrispin-event-talks-app --public --source=. --remote=origin --push
   ```
