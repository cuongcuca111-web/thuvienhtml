import sys

def check_brackets(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    in_str = False
    str_char = ''
    i = 0
    while i < len(content):
        c = content[i]
        if not in_str:
            if c in ('"', "'", '`'):
                in_str = True
                str_char = c
            elif c == '/' and i + 1 < len(content) and content[i+1] == '/':
                while i < len(content) and content[i] != '\n':
                    i += 1
            elif c == '/' and i + 1 < len(content) and content[i+1] == '*':
                i += 2
                while i + 1 < len(content) and not (content[i] == '*' and content[i+1] == '/'):
                    i += 1
                i += 1
            elif c in '({[':
                stack.append((c, i))
            elif c in ')}]':
                if not stack or stack[-1][0] != pairs[c]:
                    print(f'Mismatch in {filepath}: unexpected {c} at pos {i}')
                    return False
                stack.pop()
        else:
            if c == '\\':
                i += 1
            elif c == str_char:
                in_str = False
        i += 1
    if stack:
        print(f'Unclosed brackets in {filepath}: {stack[-5:]}')
        return False
    print(f'{filepath}: OK!')
    return True

res1 = check_brackets('api/billing.js')
res2 = check_brackets('api/admin/codes.js')
res3 = check_brackets('api/admin/billing.js')
res4 = check_brackets('api/admin/plans.js')
res5 = check_brackets('api/admin/users.js')
if not (res1 and res2 and res3 and res4 and res5):
    sys.exit(1)
print('All syntax checks passed!')
