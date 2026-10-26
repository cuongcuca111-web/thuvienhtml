import os
import zipfile
import json

root_dir = r'C:\Users\PV\.gemini\antigravity\scratch\thuvienhtml'

# Lấy version từ package.json
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

# Loại trừ thư mục không cần thiết
EXCLUDE_DIRS = {'.git', '__pycache__', 'node_modules', '.vscode', '.idea', '_archive'}
EXCLUDE_EXTS = {'.pyc', '.zip'}

print(f"Creating clean zip archive: {zip_filename}...", flush=True)
count = 0
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(root_dir):
        # Lọc thư mục loại trừ
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

file_size_mb = os.path.getsize(zip_path) / (1024 * 1024)
print(f"Zip created successfully! Total files: {count}, Size: {file_size_mb:.2f} MB", flush=True)
print(f"Saved at: {zip_path}", flush=True)
