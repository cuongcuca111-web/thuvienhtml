import os
import subprocess
import json
import zipfile

root_dir = r'C:\Users\PV\.gemini\antigravity\scratch\thuvienhtml'
gdrive_cmd = r'C:\Users\PV\.gemini\config\plugins\gdrive\skills\gdrive\scripts\gdrive.cmd'
DEFAULT_FOLDER_ID = '1epyFRhhlrYlt6JOu2-LEW3C1KAIN8C3n'

# 1. Đọc version
pkg_path = os.path.join(root_dir, 'package.json')
version = 'v5.8.71'
if os.path.exists(pkg_path):
    try:
        with open(pkg_path, 'r', encoding='utf-8') as f:
            pkg = json.load(f)
            version = 'v' + pkg.get('version', '5.8.71').lstrip('v')
    except Exception as e:
        print('Error reading package.json:', e)

zip_filename = f'thuvienhtml_{version}.zip'
zip_path = os.path.join(root_dir, zip_filename)

# 2. Nén source code
EXCLUDE_DIRS = {'.git', '__pycache__', 'node_modules', '.vscode', '.idea', '_archive'}
EXCLUDE_EXTS = {'.pyc', '.zip'}

print(f"Creating zip {zip_filename}...", flush=True)
count = 0
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for file in files:
            if file == zip_filename:
                continue
            ext = os.path.splitext(file)[1].lower()
            if ext in EXCLUDE_EXTS:
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, root_dir)
            zipf.write(full_path, rel_path)
            count += 1

size_mb = os.path.getsize(zip_path) / (1024 * 1024)
print(f"Created {zip_filename} ({size_mb:.2f} MB, {count} files).", flush=True)

# 3. Upload lên Google Drive
print(f"Uploading to Google Drive (folder: {DEFAULT_FOLDER_ID})...", flush=True)
res = subprocess.run([gdrive_cmd, 'mutate', 'upload', zip_path, '--parent', DEFAULT_FOLDER_ID], capture_output=True, text=True)
print(res.stdout, flush=True)
if res.returncode == 0:
    print(f"SUCCESS: {zip_filename} uploaded to Google Drive!", flush=True)
else:
    print("Upload error:", res.stderr, flush=True)
