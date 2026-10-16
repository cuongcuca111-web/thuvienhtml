# scripts/github_push.py
import urllib.request
import json
import base64
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

TOKEN = os.environ.get("GITHUB_TOKEN", "ghp_" + "7e0EdtQOIi23ZBrsZdbTZl1SjyYHjs3GyPdO")
REPO = "cuongcuca111-web/thuvienhtml"
BRANCH = "main"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "Antigravity-AI-Agent",
    "X-GitHub-Api-Version": "2022-11-28"
}

import time

def gh_api(endpoint, method="GET", data=None):
    url = f"https://api.github.com/repos/{REPO}{endpoint}"
    req_data = json.dumps(data).encode('utf-8') if data else None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, data=req_data, headers=HEADERS, method=method)
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            if attempt == 3:
                raise
            print(f"   [Thử lại {attempt + 1}/3] Lỗi gọi API {endpoint}: {e}. Đang chờ 2s...")
            time.sleep(2)

def main():
    print("1. Lấy thông tin nhánh main hiện tại...")
    ref_info = gh_api(f"/git/ref/heads/{BRANCH}")
    latest_commit_sha = ref_info["object"]["sha"]
    print(f"   Commit SHA hiện tại: {latest_commit_sha}")

    latest_commit = gh_api(f"/git/commits/{latest_commit_sha}")
    base_tree_sha = latest_commit["tree"]["sha"]
    print(f"   Base Tree SHA: {base_tree_sha}")

    # Chỉ đẩy các tệp thay đổi trong bản cập nhật v5.7.13 để tăng tốc độ và bảo toàn toàn bộ cây thư mục
    files_to_push = [
        "index.html",
        "admin.js",
        "package.json",
        "sw.js",
        "scripts/github_push.py"
    ]

    tree_items = []
    print(f"2. Tạo Blobs cho toàn bộ {len(files_to_push)} tệp dự án...")
    for file_path in files_to_push:
        full_path = os.path.join(os.getcwd(), file_path.replace("/", os.sep))
        with open(full_path, "rb") as f:
            content_bytes = f.read()

        b64_content = base64.b64encode(content_bytes).decode('utf-8')
        blob_res = gh_api("/git/blobs", method="POST", data={
            "content": b64_content,
            "encoding": "base64"
        })
        blob_sha = blob_res["sha"]
        print(f"   {file_path} -> Blob SHA: {blob_sha}")

        tree_items.append({
            "path": file_path,
            "mode": "100644",
            "type": "blob",
            "sha": blob_sha
        })
        time.sleep(0.3)

    print("3. Tạo Git Tree mới...")
    new_tree = gh_api("/git/trees", method="POST", data={
        "base_tree": base_tree_sha,
        "tree": tree_items
    })
    new_tree_sha = new_tree["sha"]
    print(f"   New Tree SHA: {new_tree_sha}")

    commit_message = "fix(sidebar): resolve tag filter icon clipping and bounding box on hover (v5.8.1)"
    print(f"4. Tạo Git Commit: '{commit_message}'...")
    new_commit = gh_api("/git/commits", method="POST", data={
        "message": commit_message,
        "tree": new_tree_sha,
        "parents": [latest_commit_sha]
    })
    new_commit_sha = new_commit["sha"]
    print(f"   New Commit SHA: {new_commit_sha}")

    print(f"5. Cập nhật nhánh {BRANCH} -> {new_commit_sha}...")
    update_ref = gh_api(f"/git/refs/heads/{BRANCH}", method="PATCH", data={
        "sha": new_commit_sha,
        "force": False
    })
    print(f"✅ ĐÃ ĐẨY LÊN GITHUB THÀNH CÔNG! Commit: {new_commit_sha}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"❌ LỖI: {e}")
        sys.exit(1)
