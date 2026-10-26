import re
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

def analyze():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    print("=== TONG QUAN TEP INDEX.HTML ===")
    print(f"Tong dung luong: {len(content):,} bytes ({len(content)/1024/1024:.2f} MB)")
    print(f"Tong so dong: {content.count(chr(10)):,}")

    scripts = re.findall(r'<script([^>]*)>([\s\S]*?)<\/script>', content)
    styles = re.findall(r'<style([^>]*)>([\s\S]*?)<\/style>', content)
    svgs = re.findall(r'<svg([^>]*)>([\s\S]*?)<\/svg>', content)

    print(f"\nThe Script: {len(scripts)}")
    for i, (attrs, body) in enumerate(scripts):
        print(f"  [{i}] {attrs.strip() or 'inline'}: {len(body):,} chars")

    print(f"\nThe Style: {len(styles)}")
    for i, (attrs, body) in enumerate(styles):
        print(f"  [{i}] {attrs.strip() or 'inline'}: {len(body):,} chars")

    msg_listeners = re.findall(r'window\.addEventListener\([\'"]message[\'"]', content)
    print(f"\nMessage listeners on window: {len(msg_listeners)}")

    # Check localStorage keys
    ls_keys = set(re.findall(r'localStorage\.(?:getItem|setItem|removeItem)\([\'"]([^\'"]+)[\'"]', content))
    print(f"\nCac key localStorage dang dung ({len(ls_keys)} keys):")
    for k in sorted(ls_keys):
        print(f"  - {k}")

    # Check external CDN dependencies
    cdns = set(re.findall(r'(?:src|href)=[\'"](https:\/\/[^\'"]+)[\'"]', content))
    print(f"\nCac lien ket CDN ben ngoai ({len(cdns)} links):")
    for c in sorted(cdns):
        print(f"  - {c}")

if __name__ == '__main__':
    analyze()
