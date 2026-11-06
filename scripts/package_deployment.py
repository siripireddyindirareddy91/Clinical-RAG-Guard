"""Print only deployable tracked source as inline Vercel file payloads."""
import base64, json, pathlib, subprocess, sys
root=pathlib.Path(sys.argv[1]).resolve()
files=[]
for name in subprocess.check_output(['git','ls-files',str(root)],text=True).splitlines():
    path=pathlib.Path(name)
    if not path.is_absolute(): path=pathlib.Path.cwd()/path
    if path.is_file(): files.append({'file':path.relative_to(root).as_posix(),'data':base64.b64encode(path.read_bytes()).decode(),'encoding':'base64'})
print(json.dumps(files))
