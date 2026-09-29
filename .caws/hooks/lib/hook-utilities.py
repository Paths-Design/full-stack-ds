#!/usr/bin/env python3
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
"""Opt-in consumer policies. Observed violations and unresolved analysis differ.

The shared shell lexer supplies command positions and argument bytes. Commands
are never evaluated. The only subprocess probes are fixed read-only Git queries.
"""
import json
import os
from pathlib import Path
import re
import subprocess
import stat
import sys

SHARED=Path(__file__).resolve().parent.parent


def commands(raw):
    result=subprocess.run(['/bin/bash','-c',
        'source "$1/lib/heredoc.sh"; source "$1/lib/bash-mutation-targets.sh"; caws_bash_token_records "$2"',
        '-',str(SHARED),raw],capture_output=True,timeout=3)
    if result.returncode:
        raise ValueError('shared command lexer failed')
    fields=result.stdout.decode().split('\0')
    if fields[-1]!='' or (len(fields)-1)%3:
        raise ValueError('malformed token carrier')
    triples=list(zip(fields[0:-1:3],fields[1:-1:3],fields[2:-1:3]))
    # Flattened executable spans cannot preserve subshell/control-flow cwd.
    # Keep unrelated advice, but explicitly decline coordinate-sensitive probes.
    if any(kind=='word' and value=='cd' for kind,value,_ in triples) and any(
            (kind=='op' and value not in (';', '&&')) or
            (kind=='word' and value in ('if','while','for','until','case'))
            for kind,value,_ in triples):
        yield '__caws_uncertain_cwd',[]
    groups=[]
    current=[]
    skip=0
    for index in range(0,len(fields)-1,3):
        kind,value,dynamic=fields[index:index+3]
        if kind=='op':
            if current: groups.append(current)
            current=[]
        elif kind in ('redirect','input_redirect'):
            skip=1
        elif skip:
            skip=0
        elif kind=='word':
            current.append((value,dynamic=='1'))
    if current: groups.append(current)
    for group in groups:
        index=0
        while index<len(group):
            value,_=group[index]
            if value in ('if','then','elif','else','do','!','{') or re.match(r'^[A-Za-z_][A-Za-z_0-9]*=',value):
                index+=1
                continue
            name=Path(value).name
            if name in ('env','command','builtin','exec'):
                index+=1
                while index<len(group) and group[index][0].startswith('-'):
                    index+=2 if name=='env' and group[index][0] in ('-u','--unset') else 1
                continue
            break
        if index<len(group):
            yield Path(group[index][0]).name,group[index+1:]


def rg_replaces(args):
    index=0
    # Options with values must consume them, even if those bytes spell -rn.
    valued={'-e','--regexp','-f','--file','-g','--glob','--iglob','-t','--type','-T','--type-not',
            '-A','--after-context','-B','--before-context','-C','--context','--color','--colors',
            '--encoding','--sort','--sortr','--max-count','--max-depth','--max-filesize','--pre'}
    while index<len(args):
        value,_=args[index]
        if value=='--': return False
        if value in ('--replace','-r') or value.startswith('--replace='):
            return True
        if value in valued:
            index+=2
            continue
        if value.startswith('-') and not value.startswith('--'):
            # Stop at any option taking a value; the remaining cluster is its value.
            for char in value[1:]:
                if char=='r': return True
                if '-'+char in valued: break
        index+=1
    return False


def ignored_staging(args,cwd):
    # Ordinary Git operations must not acquire optional-policy noise.
    if not any(value=='add' for value,_ in args): return [],None
    literal=False
    index=0
    while index<len(args) and args[index][0].startswith('-'):
        option,dynamic=args[index]
        if option=='-C' and index+1<len(args) and not args[index+1][1]:
            cwd=(cwd/args[index+1][0]).resolve()
            index+=2
        elif option in ('--no-pager','--literal-pathspecs'):
            literal=literal or option=='--literal-pathspecs'
            index+=1
        else:
            return [],'Git global options outside this utility envelope'
    if index>=len(args) or args[index][0]!='add': return [],None
    args=args[index+1:]
    force=False
    dry_run=False
    paths=[]
    pathfile=None
    nul=False
    options=True
    update=False
    index=0
    while index<len(args):
        value,dynamic=args[index]
        if dynamic: return [],'dynamic forced-staging path is unresolved'
        if options and value=='--':
            options=False
        elif options and value in ('--pathspec-from-file',):
            index+=1
            if index>=len(args): return [],'missing pathspec file'
            if args[index][1]: return [],'dynamic pathspec file is unresolved'
            pathfile=args[index][0]
        elif options and value.startswith('--pathspec-from-file='):
            pathfile=value.split('=',1)[1]
        elif options and value=='--pathspec-file-nul': nul=True
        elif options and value.startswith('-'):
            force=force or value=='--force' or (not value.startswith('--') and 'f' in value[1:])
            dry_run=dry_run or value=='--dry-run' or (not value.startswith('--') and 'n' in value[1:])
            update=update or value=='--update' or (not value.startswith('--') and 'u' in value[1:])
            known={'--force','--dry-run','--update','--all','--ignore-removal','--intent-to-add',
                   '--refresh','--renormalize','--ignore-errors','--ignore-missing','--sparse','--verbose'}
            if value.startswith('--') and value not in known and value not in ('--chmod=+x','--chmod=-x'):
                return [],'Git add option outside this utility envelope'
            if not value.startswith('--') and any(char not in 'fnuANv' for char in value[1:]):
                return [],'Git add short option outside this utility envelope'
        else: paths.append(value)
        index+=1
    if not force or dry_run: return [],None
    if pathfile:
        if pathfile=='-': return [],'stdin pathspecs are unavailable before execution'
        fd=os.open(cwd/pathfile,os.O_RDONLY|os.O_NONBLOCK|os.O_NOFOLLOW)
        with os.fdopen(fd,'rb') as source:
            metadata=os.fstat(source.fileno())
            if not stat.S_ISREG(metadata.st_mode): return [],'pathspec source is not a regular file'
            if metadata.st_size>1024*1024: return [],'pathspec file exceeds utility budget'
            data=source.read(1024*1024+1)
        if len(data)>1024*1024: return [],'pathspec file exceeds utility budget'
        if not nul and (b'"' in data or b'\\' in data):
            return [],'quoted pathspec file requires Git C-string decoding'
        paths += [part.decode() for part in data.split(b'\0' if nul else b'\n') if part]
    ignored=[]
    modes=['--cached'] if update else ['--cached','--others']
    for mode in modes:
        argv=['git',*(['--literal-pathspecs'] if literal else []),'--no-optional-locks','-c','core.fsmonitor=false','-C',str(cwd),
              'ls-files',mode,'--ignored','--exclude-standard','-z','--',*(paths or ['.'])]
        probe=subprocess.run(argv,capture_output=True,timeout=3)
        if probe.returncode:
            return [],'read-only Git ignored-path query failed'
        ignored += [path.decode() for path in probe.stdout.split(b'\0') if path]
    return sorted(set(ignored)),None


def evaluate(policy,tool,tool_input,cwd):
    notices=[]
    violations=[]
    if tool=='Bash':
        for executable,args in commands(tool_input.get('command','')):
            if executable=='__caws_uncertain_cwd':
                cwd=None
                continue
            if executable=='cd':
                cwd=(cwd/args[0][0]).resolve() if cwd is not None and len(args)==1 and not args[0][1] else None
                continue
            if executable=='rg' and policy.get('rg_replace') and rg_replaces(args):
                notices.append('Ripgrep replacement is active: displayed matches are transformed. -r means --replace, not recursive.')
            if executable=='git' and policy.get('ignored_staging'):
                if cwd is None:
                    notices.append('Ignored-staging check unresolved: shell cwd is dynamic.')
                else:
                    try:
                        ignored,uncertain=ignored_staging(args,cwd)
                    except (OSError,ValueError,subprocess.SubprocessError) as error:
                        ignored,uncertain=[],str(error)
                    if ignored: violations.append('Consumer ignored-staging policy: '+', '.join(ignored))
                    if uncertain: notices.append('Ignored-staging check unresolved: '+uncertain+'.')
            tests=policy.get('focused_tests',{})
            test_command=executable in tests.get('executables',[])
            test_command=test_command or (executable.startswith('python') and [a[0] for a in args[:2]]==['-m','pytest'] and 'pytest' in tests.get('executables',[]))
            if test_command:
                notices.append('Consumer focused-test entry point: '+tests['entry_point']+'. This notice does not grant resource admission.')
    documents=policy.get('documents',{})
    path=tool_input.get('file_path','')
    if tool=='Write' and documents and isinstance(path,str):
        relative=Path(path)
        if relative.is_absolute():
            try: relative=relative.relative_to(cwd)
            except (ValueError,TypeError): return notices,violations
        if any(str(relative).startswith(prefix) for prefix in documents.get('roots',[])):
            content=tool_input.get('content','')
            header=content.split('---',2)[1] if isinstance(content,str) and content.startswith('---\n') and content.count('---')>=2 else ''
            missing=[key for key in documents.get('required_frontmatter',[]) if not re.search(r'^'+re.escape(key)+r'\s*:',header,re.M)]
            if missing: notices.append('Consumer document metadata missing: '+', '.join(missing)+'.')
    return notices,violations


def main():
    try:
        policy=json.loads(Path(sys.argv[1]).read_text())
        if not isinstance(policy,dict) or policy.get('version')!=1:
            raise ValueError('expected policy version 1')
        if set(policy)-{'version','rg_replace','ignored_staging','focused_tests','documents'}:
            raise ValueError('unknown policy keys')
        for key in ('rg_replace','ignored_staging'):
            if key in policy and not isinstance(policy[key],bool):
                raise ValueError(key+' must be boolean')
        for key in ('focused_tests','documents'):
            if key in policy and not isinstance(policy[key],dict):
                raise ValueError(key+' must be an object')
        tests=policy.get('focused_tests',{})
        if tests and (not isinstance(tests.get('entry_point'),str) or
                      not isinstance(tests.get('executables'),list) or
                      not all(isinstance(x,str) for x in tests['executables'])):
            raise ValueError('focused_tests requires executable names and a display entry_point')
        if os.environ.get('HOOK_PAYLOAD_FILE'):
            payload=json.loads(Path(os.environ['HOOK_PAYLOAD_FILE']).read_text())
        else:
            payload={'tool_input':json.loads(os.environ.get('HOOK_TOOL_INPUT_JSON','{}'))}
        notices,violations=evaluate(policy,os.environ.get('HOOK_TOOL_NAME',payload.get('tool_name','')),
                                   payload.get('tool_input',{}),Path(os.environ.get('HOOK_CWD','.')).resolve())
    except (OSError,ValueError,KeyError,TypeError,subprocess.SubprocessError) as error:
        notices=['Optional utility analysis incomplete: '+str(error)]
        violations=[]
    if violations:
        print(json.dumps({'decision':'block','reason':'\n'.join(violations)}))
        return 2
    if notices:
        print(json.dumps({'hookSpecificOutput':{'hookEventName':'PreToolUse','additionalContext':'\n'.join(dict.fromkeys(notices))}}))
    return 0


if __name__=='__main__':
    sys.exit(main())
