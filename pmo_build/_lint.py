import ast, builtins, sys, os

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, "pmo_build")

files = ["pmo_dash_exec.py", "pmo_dash_proj.py", "pmo_forms.py", "pmo_extras.py",
         "pmo_settings.py", "build.py"]
for f in files:
    path = os.path.join("pmo_build", f)
    tree = ast.parse(open(path, encoding="utf-8").read(), path)
    defined = set(dir(builtins))
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for a in node.names:
                defined.add((a.asname or a.name).split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            for a in node.names:
                defined.add(a.asname or a.name)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            defined.add(node.name)
        elif isinstance(node, ast.Name) and isinstance(node.ctx, (ast.Store, ast.Del)):
            defined.add(node.id)
        elif isinstance(node, ast.arg):
            defined.add(node.arg)
        elif isinstance(node, ast.comprehension):
            for t in ast.walk(node.target):
                if isinstance(t, ast.Name):
                    defined.add(t.id)
        elif isinstance(node, (ast.For,)):
            for t in ast.walk(node.target):
                if isinstance(t, ast.Name):
                    defined.add(t.id)
        elif isinstance(node, ast.ExceptHandler) and node.name:
            defined.add(node.name)
    used = {n.id for n in ast.walk(tree)
            if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load)}
    missing = sorted(used - defined)
    print(f"{f}: {missing if missing else 'ok'}")
