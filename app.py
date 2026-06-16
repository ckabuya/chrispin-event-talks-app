import os
import time
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify, request
from bs4 import BeautifulSoup

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION = 600 # 10 minutes cache duration

# In-memory cache
_cache = {
    "data": None,
    "last_fetched": 0
}

def parse_feed(xml_content):
    root = ET.fromstring(xml_content)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    updates = []
    
    for entry in root.findall('atom:entry', ns):
        date_str = entry.find('atom:title', ns).text
        updated_date = entry.find('atom:updated', ns).text
        link_el = entry.find('atom:link', ns)
        link = link_el.attrib.get('href') if link_el is not None else ""
        content_el = entry.find('atom:content', ns)
        
        if content_el is not None and content_el.text:
            html = content_el.text
            soup = BeautifulSoup(html, 'html.parser')
            
            # Find all h3 tags (Feature, Issue, Deprecated, etc.)
            h3s = soup.find_all('h3')
            
            if not h3s:
                # If there are no h3 tags, take the entire content as one update
                entry_id = entry.find('atom:id', ns).text
                updates.append({
                    'id': entry_id,
                    'date': date_str,
                    'type': 'Update',
                    'content': str(soup),
                    'text': soup.get_text(separator=' ').strip(),
                    'link': link
                })
            else:
                for idx, h3 in enumerate(h3s):
                    update_type = h3.get_text(strip=True)
                    
                    # Gather all sibling elements after this h3 until the next h3
                    sibling_content = []
                    for sibling in h3.next_siblings:
                        if sibling.name == 'h3':
                            break
                        if sibling.name:
                            sibling_content.append(str(sibling))
                    
                    sub_soup = BeautifulSoup("".join(sibling_content), 'html.parser')
                    plain_text = sub_soup.get_text(separator=' ').strip()
                    html_content = "".join(sibling_content)
                    
                    entry_id = entry.find('atom:id', ns).text
                    updates.append({
                        'id': f"{entry_id}_{idx}",
                        'date': date_str,
                        'type': update_type,
                        'content': html_content,
                        'text': plain_text,
                        'link': link
                    })
    return updates

def get_feed_data(force_refresh=False):
    global _cache
    now = time.time()
    
    if not force_refresh and _cache["data"] and (now - _cache["last_fetched"] < CACHE_DURATION):
        return _cache["data"], "cache"
    
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BigQueryReleaseNotesApp/1.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_content = response.read()
            
        data = parse_feed(xml_content)
        _cache["data"] = data
        _cache["last_fetched"] = now
        return data, "live"
    except Exception as e:
        # Fallback to cache if feed fetch fails
        if _cache["data"]:
            return _cache["data"], "cache_fallback"
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        data, source = get_feed_data(force_refresh=force_refresh)
        return jsonify({
            "success": True,
            "source": source,
            "count": len(data),
            "data": data
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
