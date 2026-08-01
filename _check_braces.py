lines = open(r"C:\Users\89682\Desktop\game competition\minigame\omega\game\src\components\FloatingWindow.tsx", "r", encoding="utf8").readlines()
depth = 0
for i, line in enumerate(lines, 1):
    for ch in line:
        if ch == "{": depth += 1
        elif ch == "}": depth -= 1
print(f"Total lines: {len(lines)}")
print(f"Final depth: {depth}")
for i in range(max(0, len(lines)-5), len(lines)):
    print(f"  {i+1}: {lines[i].rstrip()}")
