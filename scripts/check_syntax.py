import re
import subprocess
import os
import sys
import json

def check_html():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Chỉ bắt các thẻ <script> nội tuyến (không có thuộc tính src=...)
    pattern = re.compile(r'<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>', re.IGNORECASE)
    matches = pattern.findall(html)
    print(f'Total inline script tags found in index.html: {len(matches)}')

    has_err = False
    for idx, code in enumerate(matches, 1):
        if not code.strip():
            continue
        tmp_file = f'temp_check_{idx}.js'
        with open(tmp_file, 'w', encoding='utf-8') as tf:
            tf.write(code)
        res = subprocess.run(['node', '--check', tmp_file], capture_output=True, text=True)
        if res.returncode != 0:
            print(f'Syntax ERROR in inline script #{idx}:\n{res.stderr}')
            has_err = True
        else:
            print(f'Inline script #{idx}: OK')
        if os.path.exists(tmp_file):
            os.remove(tmp_file)

    if has_err:
        return False
    print('ALL index.html inline scripts passed node syntax checks!')
    return True

def check_file(filename):
    res = subprocess.run(['node', '--check', filename], capture_output=True, text=True)
    if res.returncode != 0:
        print(f'Syntax ERROR in {filename}:\n{res.stderr}')
        return False
    print(f'{filename}: OK')
    return True

def check_version_sync():
    with open('changelog.js', 'r', encoding='utf-8') as f:
        cl_text = f.read()
    m = re.search(r"version:\s*['\"](v?\d+\.\d+\.\d+)['\"]", cl_text)
    cl_ver = m.group(1).lstrip('v') if m else ''

    with open('package.json', 'r', encoding='utf-8') as f:
        pkg_ver = json.load(f).get('version', '').lstrip('v')

    with open('sw.js', 'r', encoding='utf-8') as f:
        sw_text = f.read()
    m_sw = re.search(r"\|\|\s*['\"]v?(\d+\.\d+\.\d+)['\"]", sw_text)
    sw_ver = m_sw.group(1) if m_sw else ''

    if cl_ver and cl_ver == pkg_ver == sw_ver:
        print(f'Version sync check: OK (v{cl_ver})')
        return True
    print(f'Version MISMATCH: changelog={cl_ver}, package.json={pkg_ver}, sw.js={sw_ver}')
    return False

if __name__ == '__main__':
    ok_html = check_html()
    js_files = [
        'changelog.js',
        'bridge.js',
        'admin.js',
        'sw.js',
        'lib/admin-auth.js',
        'lib/call-ai.js',
        'api/ai/explain.js'
    ]
    ok_js = all(check_file(f) for f in js_files)
    ok_ver = check_version_sync()
    if ok_html and ok_js and ok_ver:
        print('\n--> ALL FILES & VERSIONS PASSED CHECK!')
        sys.exit(0)
    else:
        print('\n--> CHECK FAILED!')
        sys.exit(1)
