# scripts/sync_version.py
# Tự động đồng bộ số phiên bản mới nhất từ CHANGELOG[0] trong changelog.js sang index.html, sw.js và package.json
import json
import re
import sys

def get_latest_info():
    with open('changelog.js', 'r', encoding='utf-8') as f:
        text = f.read()
    m_ver = re.search(r"version:\s*['\"](v?\d+\.\d+\.\d+)['\"]", text)
    if not m_ver:
        raise RuntimeError('Không tìm thấy version trong changelog.js')
    ver = m_ver.group(1)
    if not ver.startswith('v'):
        ver = 'v' + ver

    m_date = re.search(r"date:\s*['\"]([^'\"]+)['\"]", text)
    date_str = ''
    if m_date:
        raw_date = m_date.group(1)
        # Parse ISO date YYYY-MM-DDTHH:MM:SS
        dm = re.match(r"(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})", raw_date)
        if dm:
            yyyy, mm, dd, hh, mi = dm.groups()
            date_str = f"{dd}/{mm}/{yyyy} {hh}:{mi}"

    return ver, date_str

def sync_all():
    ver_with_v, date_str = get_latest_info()
    ver_clean = ver_with_v.lstrip('v')

    # 1. Cập nhật package.json
    with open('package.json', 'r', encoding='utf-8') as f:
        pkg = json.load(f)
    pkg['version'] = ver_clean
    with open('package.json', 'w', encoding='utf-8') as f:
        json.dump(pkg, f, indent=2, ensure_ascii=False)
        f.write('\n')

    # 2. Cập nhật sw.js
    with open('sw.js', 'r', encoding='utf-8') as f:
        sw = f.read()
    sw = re.sub(r"PWA v\d+\.\d+\.\d+", f"PWA {ver_with_v}", sw)
    sw = re.sub(r"APP_VERSION v\d+\.\d+\.\d+", f"APP_VERSION {ver_with_v}", sw)
    sw = re.sub(r"\|\|\s*['\"]v\d+\.\d+\.\d+['\"]", f"|| '{ver_with_v}'", sw)
    with open('sw.js', 'w', encoding='utf-8') as f:
        f.write(sw)

    # 3. Cập nhật index.html
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    # 3.1. Query params ?v=...
    html = re.sub(r'(\./(?:changelog\.js|styles\.css|bridge\.js)\?v=)[\d\.]+', rf'\g<1>{ver_clean}', html)

    # 3.2. CURRENT_APP_VERSION fallback
    html = re.sub(r"CHANGELOG\[0\]\.version\s*:\s*['\"]v\d+\.\d+\.\d+['\"]", f"CHANGELOG[0].version : '{ver_with_v}'", html)

    # 3.3. Embedded changelog block fallback
    html = re.sub(r"(window\.CHANGELOG\s*=\s*\[\s*\{\s*version:\s*['\"])v\d+\.\d+\.\d+(['\"])", rf"\g<1>{ver_with_v}\g<2>", html)

    # 3.4. desktopAppVersionLabel & mobileAppVersionLabel
    label_pattern = r'(<span id="(?:desktop|mobile)AppVersionLabel">Thư viện Sách HTML )v\d+\.\d+\.\d+(?: • build [^<]*)?(</span>)'
    if date_str:
        replacement = rf'\g<1>{ver_with_v} • build {date_str}\g<2>'
    else:
        replacement = rf'\g<1>{ver_with_v}\g<2>'
    html = re.sub(label_pattern, replacement, html)

    # 3.5. menuVersionBadge
    html = re.sub(r'(<span id="menuVersionBadge"[^>]*>)v\d+\.\d+\.\d+(</span>)', rf'\g<1>{ver_with_v}\g<2>', html)

    # 3.6. whatsNewTitle & whatsNewVersionBadge
    html = re.sub(r'(<h3 id="whatsNewTitle"[^>]*>Có gì mới ở )v\d+\.\d+\.\d+(</h3>)', rf'\g<1>{ver_with_v}\g<2>', html)
    html = re.sub(r'(<span id="whatsNewVersionBadge"[^>]*>)v\d+\.\d+\.\d+(</span>)', rf'\g<1>{ver_with_v}\g<2>', html)

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)

    print(f'Synced version {ver_with_v} ({date_str}) across changelog.js, index.html, sw.js, and package.json!')

if __name__ == '__main__':
    sync_all()
