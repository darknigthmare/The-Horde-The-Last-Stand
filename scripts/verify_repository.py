#!/usr/bin/env python3
"""Check the current release and pinned guides without changing their files."""

import argparse
import ast
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / "game"


def safe_file(base, relative):
    name = PurePosixPath(relative)
    if name.is_absolute() or ".." in name.parts:
        raise ValueError(f"Unsafe manifest path: {relative}")
    path = base / Path(*name.parts)
    if not path.is_file() or path.is_symlink() or base.resolve() not in path.resolve().parents:
        raise ValueError(f"Missing or unsafe file: {relative}")
    return path


def verify_bytes(path, size, sha256, git_blob_sha=None):
    data = path.read_bytes()
    if len(data) != size or hashlib.sha256(data).hexdigest() != sha256:
        raise ValueError(f"Content differs from manifest: {path.relative_to(ROOT)}")
    if git_blob_sha:
        blob = b"blob " + str(len(data)).encode("ascii") + b"\0" + data
        if hashlib.sha1(blob).hexdigest() != git_blob_sha:
            raise ValueError(f"Git blob differs from upstream: {path.relative_to(ROOT)}")


def verify_game():
    manifest = json.loads((GAME / "MANIFEST_SHA256.json").read_text(encoding="utf-8"))
    expected = set()
    for item in manifest["files"]:
        if item["path"] in expected:
            raise ValueError(f"Duplicate game path: {item['path']}")
        expected.add(item["path"])
        verify_bytes(safe_file(GAME, item["path"]), item["bytes"], item["sha256"])
    expected.add("MANIFEST_SHA256.json")
    actual = {p.relative_to(GAME).as_posix() for p in GAME.rglob("*") if p.is_file()}
    if actual != expected:
        raise ValueError(f"Game inventory differs: missing={sorted(expected-actual)}, extra={sorted(actual-expected)}")
    return {"version": manifest["version"], "hashed_files": len(manifest["files"]), "total_files": len(actual)}


def verify_skills():
    lock = json.loads((ROOT / ".agents/gamedev-skills.lock.json").read_text(encoding="utf-8"))
    expected = set()
    for item in lock["files"]:
        if item["path"] in expected:
            raise ValueError(f"Duplicate skill path: {item['path']}")
        expected.add(item["path"])
        verify_bytes(safe_file(ROOT, item["path"]), item["size_bytes"], item["sha256"], item["git_blob_sha"])
    actual = {p.relative_to(ROOT).as_posix() for p in (ROOT / ".agents").rglob("*") if p.is_file()}
    if actual != expected | {".agents/gamedev-skills.lock.json"}:
        raise ValueError("The installed guide inventory differs from its lock file")
    names = set(lock["selection"])
    found = {p.parent.name for p in (ROOT / ".agents/skills").glob("*/SKILL.md")}
    if found != names:
        raise ValueError("Selected skills and installed SKILL.md files differ")
    local_references = 0
    for name in sorted(names):
        skill = ROOT / ".agents/skills" / name / "SKILL.md"
        text = skill.read_text(encoding="utf-8")
        front = re.match(r"\A---\r?\n(.*?)\r?\n---(?:\r?\n|\Z)", text, re.S)
        if not front or not re.search(r"^name:\s*" + re.escape(name) + r"\s*$", front[1], re.M):
            raise ValueError(f"Invalid skill name/frontmatter: {name}")
        if not re.search(r"^description:\s*\S", front[1], re.M):
            raise ValueError(f"Missing skill description: {name}")
        # Fenced examples also name hypothetical game assets, not bundled resources.
        prose = re.sub(r"```[\s\S]*?```", "", text)
        for relative in set(re.findall(r"(?:references|assets|scripts)/[\w./-]+\.[\w]+", prose)):
            safe_file(skill.parent, relative)
            local_references += 1
    python_files = list((ROOT / ".agents/skills").rglob("*.py"))
    for path in python_files:
        ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    return {"skills": len(names), "upstream_files": len(expected), "local_references": local_references,
            "python_scripts_parsed": len(python_files), "revision": lock["upstream"]["revision"]}


def verify_build_and_syntax():
    if not shutil.which("node"):
        raise RuntimeError("Node.js is required for the build and JavaScript checks")
    with tempfile.TemporaryDirectory(prefix="the-horde-verification-") as directory:
        temp = Path(directory)
        shutil.copy2(GAME / "build.mjs", temp / "build.mjs")
        (temp / "base").mkdir()
        shutil.copy2(GAME / "base/0.40.7.html", temp / "base/0.40.7.html")
        shutil.copytree(GAME / "src", temp / "src")
        build = subprocess.run(["node", str(temp / "build.mjs")], cwd=temp, check=True,
                               capture_output=True, text=True)
        outputs = ["JOUER_DERNIERE_LIGNE.html", "rapports/PATCHES_0_44_2.json"]
        for relative in outputs:
            if (temp / relative).read_bytes() != (GAME / relative).read_bytes():
                raise ValueError(f"Build output differs from the shipped release: {relative}")
        html = (temp / outputs[0]).read_text(encoding="utf-8")
        scripts = re.findall(r"<script(?:\s[^>]*)?>([\s\S]*?)</script>", html, re.I)
        checked = 0
        for index, source in enumerate(scripts):
            if not source.strip():
                continue
            script = temp / f"inline-{index}.js"
            script.write_text(source, encoding="utf-8")
            subprocess.run(["node", "--check", str(script)], check=True, capture_output=True, text=True)
            checked += 1
    return {"identical_outputs": outputs, "inline_scripts_parsed": checked,
            "build": json.loads(build.stdout), "node_version": subprocess.check_output(["node", "--version"], text=True).strip()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, help="Optional JSON report outside game/ and .agents/")
    args = parser.parse_args()
    if args.report and any(args.report.resolve().is_relative_to(p.resolve()) for p in (GAME, ROOT / ".agents")):
        parser.error("Write the report outside the imported game and upstream guides")
    result = {"checked_at": datetime.now(timezone.utc).isoformat(), "checks": {}, "ok": False}
    try:
        for label, action in [("game_manifest", verify_game), ("gamedev_guides", verify_skills),
                              ("reproducible_build_and_syntax", verify_build_and_syntax)]:
            result["checks"][label] = action()
        result["ok"] = True
    except (ValueError, OSError, RuntimeError, KeyError, SyntaxError, subprocess.CalledProcessError) as error:
        result["error"] = str(error)
        if isinstance(error, subprocess.CalledProcessError):
            result["stderr"] = error.stderr
    output = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(output, encoding="utf-8")
    print(output, end="")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
