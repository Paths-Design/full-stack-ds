#!/bin/bash
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
# Typed, bounded Bash mutation recognition. Never evaluates captured commands.
# Recognized operands confer no authority. Empty output means unrecognized,
# not read-only: interpreters, aliases, functions and arbitrary programs remain
# outside this parser. FILE, DYNAMIC, BROAD, UNREPR and UNSUPPORTED are separate
# channels; callers must consume all five. Resolution requires explicit cwd.
# lib/heredoc.sh supplies the shared file-sink policy. Bash 3.2 compatible.

CAWS_TOK_VALUE=()   # byte-faithful token text, quotes and sentinels removed
CAWS_TOK_KIND=()    # word | op | redirect
CAWS_TOK_CTX=()     # the context the token STARTED in: root|dquote|squote|cmdsub|backtick
CAWS_TOK_DYNAMIC=() # 1 if the token carries RUNTIME-RESOLUTION syntax, else 0
# WHICH runtime resolution the token carries. Empty when TOK_DYNAMIC is 0.
# Glob is ONE SUBTYPE, not the definition: a target whose identity is resolved at
# execution cannot be handed to the ownership oracle as if it were the target.
#   pathname | parameter | command_sub | tilde | brace
CAWS_TOK_RESKIND=()
# The statically-known leading path segment, when the lexer can PROVE one from
# preserved lexical structure (core/*.py -> core/). Empty when none is provable.
# The guard must consume this rather than reparsing the expression -- two
# interpreters on opposite sides of the boundary is the defect this lane removes.
CAWS_TOK_PREFIX=()
CAWS_TOK_PREFIX_BASIS=() # lexically_proven | none
# 1 when the operand cannot be transported faithfully by a newline-delimited
# record stream (it contains a newline or tab). Detected at LEXICAL PRODUCTION
# time, before any serialization -- once a record has been split the
# authority-bearing information is already gone.
CAWS_TOK_UNREPR=()

# A command substitution has TWO simultaneous semantic roles and the recognizer
# must preserve BOTH: the outer word is runtime-resolved (its value is decided at
# execution), AND the nested text is executable shell code that may perform its
# own writes. Choosing one role was the defect -- `rm "$(cat f)"` emitted FILE
# [cat] and [f], fabricating two operands while never naming the real deletion
# target.
#
# So a nested span is queued here and lexed as its OWN command, separated from
# the outer token stream by a `;` op. The separator is load-bearing: without it
# an outer verb's operand walk runs straight into the nested command's words and
# consumes them as its own operands, which is exactly how the fabrication arose.
_CAWS_PENDING_SPANS=()

_caws_lex() {
  CAWS_TOK_VALUE=(); CAWS_TOK_KIND=(); CAWS_TOK_CTX=(); CAWS_TOK_DYNAMIC=()
  CAWS_TOK_RESKIND=(); CAWS_TOK_PREFIX=(); CAWS_TOK_PREFIX_BASIS=(); CAWS_TOK_UNREPR=()
  _CAWS_PENDING_SPANS=( "$1" )
  local _first=1 _span
  while [[ ${#_CAWS_PENDING_SPANS[@]} -gt 0 ]]; do
    _span="${_CAWS_PENDING_SPANS[0]}"
    if [[ ${#_CAWS_PENDING_SPANS[@]} -gt 1 ]]; then
      _CAWS_PENDING_SPANS=( "${_CAWS_PENDING_SPANS[@]:1}" )
    else
      _CAWS_PENDING_SPANS=()
    fi
    if [[ $_first -eq 0 ]]; then
      # Command boundary between the outer command and a nested one.
      CAWS_TOK_VALUE+=( ';' ); CAWS_TOK_KIND+=( op ); CAWS_TOK_CTX+=( root )
      CAWS_TOK_DYNAMIC+=( 0 ); CAWS_TOK_RESKIND+=( "" ); CAWS_TOK_PREFIX+=( "" )
      CAWS_TOK_PREFIX_BASIS+=( none ); CAWS_TOK_UNREPR+=( 0 )
    fi
    _first=0
    _caws_lex_span "$_span"
  done
}

_caws_lex_span() {
  local s="$1"

  # Context stack. stack[0] is the innermost context.
  local -a stack=( root )
  local cur=""        # accumulating token text
  local started=0     # is a token currently open
  local curstart=0    # raw source start, for unquoted numeric fd prefixes
  local curctx=root   # context the current token started in
  local curdyn=0      # has the current token seen runtime-resolution syntax
  local curres=""     # which resolution kind, when curdyn is 1
  # 1 while a redirect operator has been emitted and its target not yet taken.
  local curunsup=0    # token is/contains unsupported executable nesting
  local i=0 n=${#s}

  # Stack helpers operate on ${stack[0]} directly. They are deliberately NOT
  # command-substitution based: `top="$(_top)"` would fork a subshell per
  # character scanned, and in bash 3.2 a nested function using `local` leaks its
  # declaration onto stdout, silently polluting every channel's output.
  _push() { stack=( "$1" ${stack[@]+"${stack[@]}"} ); }
  _pop()  { stack=( ${stack[@]:1+0} ); }

  # Consume a balanced $( ... ) span as OPAQUE dynamic syntax, advancing $i past
  # it. Purely positional: counts parens, never evaluates. Used when a command
  # substitution supplies an operand's VALUE, where the inner words are not outer
  # operands and emitting them fabricates targets (the measured `$(choose_path)`
  # -> `choose_path` defect).
  # Consume a balanced $( ... ) span, advancing $i past it, and QUEUE its body
  # to be lexed as its own command. Purely positional: counts parens, never
  # evaluates. $i must already sit on the opening paren.
  _caws_skip_cmdsub() {
    local depth=0 start=$((i+1))
    local -a quotes=( "" )
    while [[ $i -lt $n ]]; do
      local ch="${s:$i:1}"
      local quote="${quotes[$depth]:-}"
      if [[ "$quote" == single ]]; then
        [[ "$ch" == "'" ]] && quotes[$depth]=""
      elif [[ "$ch" == '\' ]]; then
        i=$((i+2)); continue
      elif [[ "$quote" == double ]]; then
        if [[ "$ch" == '"' ]]; then quotes[$depth]=""
        elif [[ "${s:$i:2}" == '$(' ]]; then
          depth=$((depth+1)); quotes[$depth]=""; i=$((i+1))
        fi
      elif [[ "$ch" == "'" ]]; then quotes[$depth]=single
      elif [[ "$ch" == '"' ]]; then quotes[$depth]=double
      elif [[ "$ch" == '(' ]]; then depth=$((depth+1)); quotes[$depth]=""
      elif [[ "$ch" == ')' ]]; then
        depth=$((depth-1))
        if [[ $depth -le 0 ]]; then
          local body="${s:$start:$((i-start))}"
          [[ -n "$body" ]] && _CAWS_PENDING_SPANS+=( "$body" )
          i=$((i+1)); return 0
        fi
      fi
      i=$((i+1))
    done
    # Unterminated: queue the remainder so its writes stay observable.
    local body="${s:$start}"
    [[ -n "$body" ]] && _CAWS_PENDING_SPANS+=( "$body" )
    return 0
  }

  _caws_skip_backtick() {
    local body="" ch
    i=$((i+1))
    while [[ $i -lt $n ]]; do
      ch="${s:$i:1}"
      if [[ "$ch" == '`' ]]; then
        _CAWS_PENDING_SPANS+=( "$body" ); i=$((i+1)); return
      fi
      if [[ "$ch" == '\' ]]; then
        # Escaped nesting has different expansion rules; keep it visible as
        # uncertainty rather than pretending to adjudicate that command.
        if [[ "${s:$((i+1)):1}" == '`' ]]; then
          CAWS_TOK_VALUE+=( backtick_escaped_nesting ); CAWS_TOK_KIND+=( unsupported_nesting )
          CAWS_TOK_CTX+=( root ); CAWS_TOK_DYNAMIC+=( 0 ); CAWS_TOK_RESKIND+=( "" )
          CAWS_TOK_PREFIX+=( "" ); CAWS_TOK_PREFIX_BASIS+=( none ); CAWS_TOK_UNREPR+=( 0 )
        fi
        body+="$ch"; i=$((i+1)); ch="${s:$i:1}"
      fi
      body+="$ch"; i=$((i+1))
    done
    _CAWS_PENDING_SPANS+=( "$body" )
  }

  _flush() {
    # Empty quoted argv entries are real (e.g. BSD sed backup suffix).
    if [[ $started -eq 1 ]]; then
      CAWS_TOK_VALUE+=( "$cur" )
      CAWS_TOK_KIND+=( word )
      CAWS_TOK_CTX+=( "$curctx" )
      CAWS_TOK_DYNAMIC+=( "$curdyn" )
      CAWS_TOK_RESKIND+=( "$curres" )
      # Representability is decided on the OPERAND BYTES here, at production
      # time -- never by inspecting an already-serialized record.
      if [[ "$cur" == *$'\n'* || "$cur" == *$'\t'* ]]; then
        CAWS_TOK_UNREPR+=( 1 )
      else
        CAWS_TOK_UNREPR+=( 0 )
      fi
      # Static prefix: the longest leading run of path segments containing no
      # runtime-resolution syntax. Derived from the preserved lexical structure,
      # so it is absent (basis none) exactly when nothing is provable.
      local _pfx="" _basis=none
      if [[ "$curdyn" == "1" ]]; then
        local _head="${cur%%[\*\?\[\$~{]*}"
        if [[ "$_head" == */* ]]; then _pfx="${_head%/*}/"; _basis=lexically_proven; fi
      fi
      CAWS_TOK_PREFIX+=( "$_pfx" )
      CAWS_TOK_PREFIX_BASIS+=( "$_basis" )
    fi
    cur=""; started=0; curdyn=0; curres=""; curunsup=0
  }
  _emit_op() {
    _flush
    CAWS_TOK_VALUE+=( "$1" ); CAWS_TOK_KIND+=( "$2" )
    CAWS_TOK_CTX+=( "${stack[0]}" ); CAWS_TOK_DYNAMIC+=( 0 )
    CAWS_TOK_RESKIND+=( "" ); CAWS_TOK_PREFIX+=( "" )
    CAWS_TOK_PREFIX_BASIS+=( none ); CAWS_TOK_UNREPR+=( 0 )
  }
  _open() { [[ $started -eq 1 ]] || { started=1; curstart=$i; curctx="${stack[0]}"; }; }

  while [[ $i -lt $n ]]; do
    local c="${s:$i:1}" top="${stack[0]}"
    case "$top" in
      ansi)
        if [[ "$c" == "'" ]]; then
          _pop
        elif [[ "$c" == '\' ]]; then
          local escape="${s:$((i+1)):1}"
          case "$escape" in
            n) cur+=$'\n' ;; t) cur+=$'\t' ;; r) cur+=$'\r' ;;
            a) cur+=$'\a' ;; b) cur+=$'\b' ;; e|E) cur+=$'\033' ;;
            f) cur+=$'\f' ;; v) cur+=$'\v' ;; '\'|"'") cur+="$escape" ;;
            *) curdyn=1; curres=ansi_c_escape; cur+="\\$escape" ;;
          esac
          i=$((i+1))
        else
          cur+="$c"
        fi
        i=$((i+1)); continue ;;
      squote)
        # Inside single quotes NOTHING is special except the closing quote.
        # A $( here is literal data -- this is the control that proves the
        # lexer is not simply making all quoted regions opaque.
        if [[ "$c" == "'" ]]; then _pop; else _open; cur+="$c"; fi
        i=$((i+1)); continue ;;
      dquote)
        case "$c" in
          '"') _pop ;;
          '\') # in double quotes backslash escapes only a few bytes
               local nx="${s:$((i+1)):1}"
               case "$nx" in
                 '"'|'\'|'$'|'`') _open; cur+="$nx"; i=$((i+1)) ;;
                 *) _open; cur+="$c" ;;
               esac ;;
          '$') if [[ "${s:$i:3}" == '$((' ]]; then
               _open; curdyn=1; [[ -n "$curres" ]] || curres=arithmetic
               cur+='$((...))'
               _push arith; i=$((i+2))
               elif [[ "${s:$i:2}" == '$(' ]]; then
                 # BOTH roles, always: this word's value is runtime-resolved, and
                 # the nested body is queued as its own command.
                 _open; curdyn=1; curres=command_sub
                 cur+='$(...)'
                 i=$((i+1)); _caws_skip_cmdsub; continue
               else
                 # $VAR / ${VAR} -- parameter expansion.
                 _open; curdyn=1; [[ -n "$curres" ]] || curres=parameter
                 cur+="$c"
               fi ;;
          '`') _open; curdyn=1; curres=command_sub; cur+='$(...)'; _caws_skip_backtick; continue ;;
          *)  _open; cur+="$c" ;;
        esac
        i=$((i+1)); continue ;;
      arith)
        # A `>` HERE is comparison, not a redirect -- that narrow claim holds.
        # But arithmetic expansion is NOT inert: it produces a value (the word is
        # already marked dynamic at the `$((` entry), and tokens inside it still
        # undergo command substitution, so `$(( $(echo p > f; echo 1) + 1 ))`
        # really does perform the nested write. Queue any nested substitution
        # rather than swallowing the whole span.
        if [[ "${s:$i:2}" == '))' ]]; then _pop; i=$((i+2)); continue; fi
        if [[ "${s:$i:2}" == '$(' ]]; then i=$((i+1)); _caws_skip_cmdsub; continue; fi
        if [[ "$c" == '`' ]]; then _caws_skip_backtick; continue; fi
        i=$((i+1))
        continue ;;
    esac

    # root | cmdsub | backtick -- expansion-enabled contexts.
    case "$c" in
      "'") _open; _push squote; i=$((i+1)); continue ;;
      '"') _open; _push dquote; i=$((i+1)); continue ;;
      '\') local nx="${s:$((i+1)):1}"; _open; cur+="$nx"; i=$((i+2)); continue ;;
      '`') _open; curdyn=1; curres=command_sub; cur+='$(...)'
           _caws_skip_backtick; continue ;;
      '$') if [[ "${s:$i:2}" == "\$'" ]]; then
             _open; _push ansi; i=$((i+2)); continue
           elif [[ "${s:$i:3}" == '$((' ]]; then
             # Arithmetic expansion PRODUCES A VALUE; it is not inert. Only the
             # `>` INSIDE it is non-redirection.
             _open; curdyn=1; [[ -n "$curres" ]] || curres=arithmetic
             cur+='$((...))'
             _push arith; i=$((i+3)); continue
           elif [[ "${s:$i:2}" == '$(' ]]; then
             # BOTH roles, always: the outer word is runtime-resolved AND the
             # nested body is queued as its own command. Which role dominates is
             # not the lexer's call -- `rm "$(f)"` and `x="$(echo p > a)"` are
             # both real, and picking one fabricated operands in the other.
             _open; curdyn=1; curres=command_sub
             cur+='$(...)'
             i=$((i+1)); _caws_skip_cmdsub; continue
           else _open; curdyn=1; [[ -n "$curres" ]] || curres=parameter
                cur+="$c"; i=$((i+1)); continue; fi ;;
      '('|')') _emit_op "$c" op; i=$((i+1)); continue ;;
      '#') if [[ $started -eq 0 ]]; then
             while [[ $i -lt $n && "${s:$i:1}" != $'\n' ]]; do i=$((i+1)); done
             continue
           fi
           _open; cur+="$c"; i=$((i+1)); continue ;;
      $'\n') # A NEWLINE IS A COMMAND SEPARATOR, not ordinary whitespace.
           # Measured 2026-09-11 over the frozen A6 population: without this,
           # `sed 's/x/y/' f.txt` followed by a newline and `rm claimed.py`
           # emitted NOTHING -- the sed arm walks operands forward until it hits
           # a separator token, found none, and swallowed the next command whole,
           # losing a claimed write. The same hole fabricates in the other
           # direction: `tee out.log` + newline + `rm claimed.py` emitted the
           # VERB `rm` as a path operand. Both directions are authority defects.
           _emit_op ';' op; i=$((i+1)); continue ;;
      [[:space:]]) _flush; i=$((i+1)); continue ;;
      '~') # Tilde expansion resolves against $HOME at execution, and ONLY in
           # leading position -- a ~ inside a word is a literal byte.
           if [[ $started -eq 0 ]]; then _open; curdyn=1; curres=tilde; fi
           _open; cur+="$c"; i=$((i+1)); continue ;;
      '{') # Brace expansion selects a POPULATION at execution. Only treat it as
           # such when the word actually closes a brace containing a comma or
           # range -- `{}` in `find -exec` is not brace expansion.
           if [[ "${s:$i}" =~ ^\{[^{}]*[,\.][^{}]*\} ]]; then
             _open; curdyn=1; [[ -n "$curres" ]] || curres=brace
           fi
           _open; cur+="$c"; i=$((i+1)); continue ;;
      '*'|'?'|'[') # glob SYNTAX, and we are in an expansion-enabled context
           _open; curdyn=1; [[ -n "$curres" ]] || curres=pathname
           cur+="$c"; i=$((i+1)); continue ;;
      '>'|'<') if [[ "${s:$i:2}" == '>(' || "${s:$i:2}" == '<(' ]]; then
             # PROCESS SUBSTITUTION. It executes mutation-capable nested shell
             # code, so silently omitting it lets a claimed write through as
             # "nothing recognized" (measured: ec=0 where the plain form blocks).
             # This slice does not recursively parse it; it is recorded as an
             # UNSUPPORTED_EXECUTABLE_NESTING fact so the guard can refuse.
             _flush
             CAWS_TOK_VALUE+=( "${s:$i:2}" ); CAWS_TOK_KIND+=( unsupported_nesting )
             CAWS_TOK_CTX+=( "${stack[0]}" ); CAWS_TOK_DYNAMIC+=( 0 )
             CAWS_TOK_RESKIND+=( "" ); CAWS_TOK_PREFIX+=( "" )
             CAWS_TOK_PREFIX_BASIS+=( none ); CAWS_TOK_UNREPR+=( 0 )
             i=$((i+1)); _caws_skip_cmdsub; continue
           fi
           # Only raw, unquoted digits adjoining the operator name an fd.
           # Quoted/escaped numeric words remain real argv entries.
           if [[ $started -eq 1 && "$cur" =~ ^[0-9]+$ && "${s:$curstart:$((i-curstart))}" == "$cur" ]]; then
             cur=""; started=0
           fi
           if [[ "$c" == '<' ]]; then
             # An ordinary input redirect reads; it is not a mutation.
             _emit_op '<' input_redirect; i=$((i+1)); continue
           fi
           if [[ "${s:$i:2}" == '>>' ]]; then _emit_op '>>' redirect; i=$((i+2))
           else
             # fd-redirect forms (2>&1, >&2, N>&M, 2>&-) are fd plumbing, not
             # file writes. Detect structurally: current token is all digits and
             # the next byte is '&'.
             if [[ "${s:$((i+1)):1}" == '&' ]]; then
               _flush
               i=$((i+2))
               while [[ $i -lt $n && "${s:$i:1}" =~ [0-9-] ]]; do i=$((i+1)); done
             else
               _emit_op '>' redirect; i=$((i+1))
             fi
           fi
           continue ;;
      '|') if [[ "${s:$i:2}" == '||' ]]; then _emit_op '||' op; i=$((i+2))
           else _emit_op '|' op; i=$((i+1)); fi; continue ;;
      '&') if [[ "${s:$i:2}" == '&&' ]]; then _emit_op '&&' op; i=$((i+2))
           # A BARE `&` backgrounds the preceding command, so it ends that
           # command's operand list exactly as `;` does. Treating it as a
           # literal byte let a forward-walking verb arm run straight through it
           # into the next command -- the same defect the newline case carries.
           else _emit_op '&' op; i=$((i+1)); fi; continue ;;
      ';') _emit_op ';' op; i=$((i+1)); continue ;;
      *)   _open; cur+="$c"; i=$((i+1)); continue ;;
    esac
  done
  _flush
}

# ---------------------------------------------------------------------------
# Interpretation: typed tokens -> typed mutation records.
# ---------------------------------------------------------------------------
# RECORD KIND IS STRUCTURAL, NEVER INFERRED FROM BYTES. The previous scanner
# discriminated FILE from BROAD by asking whether a line contained a TAB. That
# was sound ONLY because the old tokenizer word-split on IFS, which made a tab
# byte unreachable inside a file operand. This lexer emits byte-faithful
# operands, so that proof is gone and the inference goes with it: records are
# accumulated into three separate arrays by explicit kind, and the public
# channels read those arrays directly rather than grepping a textual encoding.
#
# REPRESENTATION ENVELOPE, AND ITS FAILURE DIRECTION IS NOT SAFE. All public
# channels are newline-delimited record streams read with `while read -r`.
# Newline and tab are legal filename bytes, so byte-faithfulness is claimed
# WITHIN a record only.
#
# The former claim here -- that splitting such an operand is "over-recognition,
# never a bypass" -- was FALSIFIED by measurement: against a live file-specific
# scope.in claim, the plain path BLOCKS (ec=2) while the same path carrying an
# embedded newline ALLOWS (ec=0), because splitting destroys the exact match a
# canonical claim requires and NEITHER fragment matches. That is an ownership
# bypass. Such operands are therefore detected at LEXICAL PRODUCTION TIME and
# routed to CAWS_REC_UNREPR instead of entering the ordinary record stream.
CAWS_REC_FILE=()     # exact-path operands
CAWS_REC_BROAD=()    # directory-scoped mutation kinds (root supplied by caller)
CAWS_REC_DYNAMIC=()  # file-scoped operands whose population resolves at execution
# A valid operand the carrier cannot faithfully transport (embedded newline/tab).
CAWS_REC_UNREPR=()
# Syntax that executes mutation-capable nested shell code outside this slice's
# supported parser envelope (process substitution). A DIFFERENT FACT from
# DYNAMIC and from UNREPR: they merely share conservative downstream handling.
CAWS_REC_UNSUPPORTED=()

# Redirections are shell syntax, not argv entries or command terminators.
# Project each simple command into redirects followed by its unchanged argv.
# This keeps redirects out of option/value parsing even between an option and
# its value. Targets are emitted before argv targets, as the shell processes
# redirections before invoking the command (including cd). Original lexing and
# the policy token carrier retain source order; only mutation scanning uses
# this view. Every token's expansion/representability metadata moves with it.
_caws_mutation_argv_view() {
  local i=0 n=${#CAWS_TOK_VALUE[@]} index
  local -a order=() redirects=() words=()
  while [[ $i -lt $n ]]; do
    case "${CAWS_TOK_KIND[$i]}" in
      op)
        order+=( ${redirects[@]+"${redirects[@]}"} ${words[@]+"${words[@]}"} "$i" )
        redirects=(); words=() ;;
      redirect|input_redirect)
        redirects+=( "$i" )
        if [[ $((i+1)) -lt $n && "${CAWS_TOK_KIND[$((i+1))]}" == word ]]; then
          i=$((i+1)); redirects+=( "$i" )
        fi ;;
      *) words+=( "$i" ) ;;
    esac
    i=$((i+1))
  done
  order+=( ${redirects[@]+"${redirects[@]}"} ${words[@]+"${words[@]}"} )
  local -a values=() kinds=() contexts=() dynamics=() resolution=() prefixes=() bases=() unrepr=()
  for index in ${order[@]+"${order[@]}"}; do
    values+=( "${CAWS_TOK_VALUE[$index]}" ); kinds+=( "${CAWS_TOK_KIND[$index]}" )
    contexts+=( "${CAWS_TOK_CTX[$index]}" ); dynamics+=( "${CAWS_TOK_DYNAMIC[$index]}" )
    resolution+=( "${CAWS_TOK_RESKIND[$index]}" ); prefixes+=( "${CAWS_TOK_PREFIX[$index]}" )
    bases+=( "${CAWS_TOK_PREFIX_BASIS[$index]}" ); unrepr+=( "${CAWS_TOK_UNREPR[$index]}" )
  done
  CAWS_TOK_VALUE=( ${values[@]+"${values[@]}"} ); CAWS_TOK_KIND=( ${kinds[@]+"${kinds[@]}"} )
  CAWS_TOK_CTX=( ${contexts[@]+"${contexts[@]}"} ); CAWS_TOK_DYNAMIC=( ${dynamics[@]+"${dynamics[@]}"} )
  CAWS_TOK_RESKIND=( ${resolution[@]+"${resolution[@]}"} ); CAWS_TOK_PREFIX=( ${prefixes[@]+"${prefixes[@]}"} )
  CAWS_TOK_PREFIX_BASIS=( ${bases[@]+"${bases[@]}"} ); CAWS_TOK_UNREPR=( ${unrepr[@]+"${unrepr[@]}"} )
}

# In the mutation view, only a control operator ends an argv list.
_caws_tok_is_sep() {
  local k="${CAWS_TOK_KIND[$1]}"
  [[ "$k" == op ]]
}
# Is token $1 an option rather than an operand?
_caws_tok_is_opt() { [[ "${CAWS_TOK_VALUE[$1]}" == -* ]]; }

# Route one operand to FILE or DYNAMIC by its LEXICAL dynamic flag.
# Glob syntax counts only in an expansion-enabled context: a `*` inside quotes
# is a literal asterisk byte in a path, not a glob. DYNAMIC is never folded into
# BROAD -- "a directory-scoped operation" and "a file-scoped operation over an
# unresolved population" are different facts needing different policies.
_caws_emit_operand() {
  local i="$1"
  # Representability is adjudicated FIRST: an operand the record stream cannot
  # carry must never reach a channel whose consumer would split it.
  if [[ ${coordinate_changed:-0} -eq 1 && "${CAWS_TOK_VALUE[$i]}" != /* ]]; then
    CAWS_REC_UNSUPPORTED+=( changed_working_directory )
    return
  fi
  if [[ "${CAWS_TOK_UNREPR[$i]}" == "1" ]]; then
    CAWS_REC_UNREPR+=( "${CAWS_TOK_VALUE[$i]}" )
    return 0
  fi
  if [[ "${CAWS_TOK_DYNAMIC[$i]}" == "1" ]]; then
    # Tab-separated: expression, resolution_kind, static_prefix, prefix_basis.
    # The guard CONSUMES these; it must never reparse the expression to invent a
    # prefix, which would restore two interpreters across the shared boundary.
    printf -v _rec '%s\t%s\t%s\t%s' \
      "${CAWS_TOK_VALUE[$i]}" "${CAWS_TOK_RESKIND[$i]}" \
      "${CAWS_TOK_PREFIX[$i]}" "${CAWS_TOK_PREFIX_BASIS[$i]}"
    CAWS_REC_DYNAMIC+=( "$_rec" )
  else
    CAWS_REC_FILE+=( "${CAWS_TOK_VALUE[$i]}" )
  fi
}

_caws_bash_scan_tokens() {
  local cmd="$1"
  CAWS_REC_FILE=(); CAWS_REC_BROAD=(); CAWS_REC_DYNAMIC=()
  CAWS_REC_UNREPR=(); CAWS_REC_UNSUPPORTED=()
  # CAWS-GUARD-HEREDOC-BODY-READ-AS-COMMAND-01: a heredoc body is a PAYLOAD, not
  # a command line. Blanking safelisted sinks' bodies is load-bearing and its
  # loss is a real defect, not a simplification: measured 2026-09-11 over the
  # frozen A6 population, the unblanked path lexed TypeScript and Python heredoc
  # payloads as shell, so `const f = () => { g(h) }` produced the operand `{`
  # (bash really does read `=>` as `=` followed by a redirect) and eight
  # commands gained fabricated targets that the previous implementation did not
  # emit. The rewrite dropped this call while the file header kept claiming it,
  # so the documentation described behavior the code no longer had.
  # An interpreter heredoc deliberately keeps its body visible (lib/heredoc.sh),
  # and CAWS_HEREDOC_FILE_SINKS is a safelist both consumers inherit alike.
  if declare -F caws_blank_heredoc_bodies >/dev/null 2>&1; then
    cmd="$(caws_blank_heredoc_bodies "$cmd")"
  fi
  _caws_lex "$cmd"
  _caws_mutation_argv_view
  local _u=0
  while [[ $_u -lt ${#CAWS_TOK_VALUE[@]} ]]; do
    [[ "${CAWS_TOK_KIND[$_u]}" == unsupported_nesting ]] && \
      CAWS_REC_UNSUPPORTED+=( "${CAWS_TOK_VALUE[$_u]}" )
    _u=$((_u+1))
  done
  local n=${#CAWS_TOK_VALUE[@]}
  local i=0 command_start=1 wrapper="" coordinate_changed=0
  while [[ $i -lt $n ]]; do
    local t="${CAWS_TOK_VALUE[$i]}"
    if [[ "${CAWS_TOK_KIND[$i]}" == op ]]; then
      command_start=1; wrapper=""; i=$((i+1)); continue
    fi
    if [[ "${CAWS_TOK_KIND[$i]}" == input_redirect ]]; then i=$((i+2)); continue; fi
    # A redirect is recognized by KIND, so a literal ">" inside quotes (which
    # the lexer emits as a word) can never be mistaken for one.
    if [[ "${CAWS_TOK_KIND[$i]}" == redirect ]]; then
      local nx=$((i+1))
      if [[ $nx -lt $n && "${CAWS_TOK_KIND[$nx]}" == word ]]; then
        _caws_emit_operand "$nx"
      fi
      i=$((i+2)); continue
    fi
    # Words introduce verbs only in command position. Quoting a command name
    # is legal; quoting prose in an argument does not create a command.
    if [[ "${CAWS_TOK_KIND[$i]}" != word ]]; then i=$((i+1)); continue; fi
    if [[ $command_start -eq 0 ]]; then i=$((i+1)); continue; fi
    # Only an executable argv position can introduce a verb. Assignments and
    # supported wrappers precede that position; ordinary command arguments do
    # not become commands merely because their bytes spell rm, tee, or git.
    if [[ "$t" =~ ^[A-Za-z_][A-Za-z_0-9]*= ]]; then i=$((i+1)); continue; fi
    if [[ -n "$wrapper" && "$t" == -* ]]; then
      case "$wrapper:$t" in env:-u|env:--unset) i=$((i+2)) ;; *) i=$((i+1)) ;; esac
      continue
    fi
    t="${t##*/}"
    case "$t" in
      env|command|builtin|exec) wrapper="$t"; i=$((i+1)); continue ;;
      if|then|elif|else|do|'!'|'{') i=$((i+1)); continue ;;
    esac
    command_start=0
    case "$t" in
      cd|pushd|popd) coordinate_changed=1 ;;
      tee)
        local j=$((i+1))
        while [[ $j -lt $n ]]; do
          _caws_tok_is_sep "$j" && break
          case "${CAWS_TOK_VALUE[$j]}" in
            -a|--append) ;;
            -*) ;;
            *) _caws_emit_operand "$j" ;;
          esac
          j=$((j+1))
        done
        i=$j; continue ;;
      sed|perl)
        local inplace=0 script=0 j=$((i+1)) options=1
        local -a operands=()
        while [[ $j -lt $n ]]; do
          _caws_tok_is_sep "$j" && break
          local arg="${CAWS_TOK_VALUE[$j]}"
          if [[ $options -eq 1 ]]; then
            case "$arg" in
              --) options=0; j=$((j+1)); continue ;;
              -e|-f|--expression|--file) script=1; j=$((j+2)); continue ;;
              -e?*|-f?*|--expression=*|--file=*) script=1; j=$((j+1)); continue ;;
              -i|--in-place|--in-place=*|-i?*) inplace=1
                # BSD sed -i '' is an explicit empty backup suffix.
                if [[ "$t" == sed && "$arg" == -i && "${CAWS_TOK_VALUE[$((j+1))]-x}" == "" ]]; then j=$((j+1)); fi
                j=$((j+1)); continue ;;
              -*)
                if [[ "$t" == perl && "$arg" == *i* ]]; then inplace=1; fi
                if [[ "$t" == perl && "$arg" == *e ]]; then script=1; j=$((j+1)); fi
                j=$((j+1)); continue ;;
            esac
          fi
          if [[ $script -eq 0 ]]; then script=1; else operands+=( "$j" ); fi
          j=$((j+1))
        done
        if [[ $inplace -eq 1 ]]; then
          local operand
          for operand in "${operands[@]+"${operands[@]}"}"; do _caws_emit_operand "$operand"; done
        fi
        i=$j; continue ;;
      truncate|touch|rm|mv|cp)
        local j=$((i+1)) options=1 target=-1
        local -a operands=()
        while [[ $j -lt $n ]]; do
          _caws_tok_is_sep "$j" && break
          local arg="${CAWS_TOK_VALUE[$j]}"
          if [[ $options -eq 1 ]]; then
            case "$arg" in --) options=0; j=$((j+1)); continue ;; esac
            case "$t:$arg" in
              touch:-d|touch:--date|touch:-t|touch:-r|touch:--reference|truncate:-s|truncate:--size|truncate:-r|truncate:--reference)
                j=$((j+2)); continue ;;
              cp:-t|cp:--target-directory|mv:-t|mv:--target-directory)
                target=$((j+1)); j=$((j+2)); continue ;;
            esac
            case "$arg" in
              --target-directory=*)
                CAWS_TOK_VALUE[$j]="${arg#*=}"; target=$j; j=$((j+1)); continue ;;
              -*) j=$((j+1)); continue ;;
            esac
          fi
          operands+=( "$j" ); j=$((j+1))
        done
        if [[ "$t" == cp ]]; then
          if [[ $target -ge 0 && $target -lt $n ]]; then _caws_emit_operand "$target"
          elif [[ ${#operands[@]} -gt 1 ]]; then _caws_emit_operand "${operands[$((${#operands[@]}-1))]}"; fi
        else
          local operand
          for operand in "${operands[@]+"${operands[@]}"}"; do _caws_emit_operand "$operand"; done
          [[ $target -ge 0 && $target -lt $n ]] && _caws_emit_operand "$target"
        fi
        i=$j; continue ;;
      dd)
        local j=$((i+1))
        while [[ $j -lt $n ]]; do
          _caws_tok_is_sep "$j" && break
          case "${CAWS_TOK_VALUE[$j]}" in
            of=*)
              CAWS_TOK_VALUE[$j]="${CAWS_TOK_VALUE[$j]#of=}"
              # Prefix was derived before removal of of=; remove the field too.
              CAWS_TOK_PREFIX[$j]="${CAWS_TOK_PREFIX[$j]#of=}"
              _caws_emit_operand "$j" ;;
          esac
          j=$((j+1))
        done
        i=$j; continue ;;
      git)
        local g=$((i+1)) git_coordinate=$coordinate_changed
        while [[ $g -lt $n && "${CAWS_TOK_VALUE[$g]}" == -* ]]; do
          case "${CAWS_TOK_VALUE[$g]}" in
            -C|--git-dir|--work-tree) coordinate_changed=1; g=$((g+2)) ;;
            --git-dir=*|--work-tree=*|--bare) coordinate_changed=1; g=$((g+1)) ;;
            -c|--config-env) g=$((g+2)) ;;
            *) g=$((g+1)) ;;
          esac
        done
        local sub="${CAWS_TOK_VALUE[$g]:-}" j=$((g+1)) seen_dashdash=0
        case "$sub" in
          restore|checkout|reset)
            while [[ $j -lt $n ]]; do
              _caws_tok_is_sep "$j" && break
              local arg="${CAWS_TOK_VALUE[$j]}"
              if [[ $seen_dashdash -eq 0 ]]; then
                case "$arg" in
                  --) seen_dashdash=1; j=$((j+1)); continue ;;
                  -s|--source) j=$((j+2)); continue ;;
                  --hard)
                    if [[ $coordinate_changed -eq 1 ]]; then CAWS_REC_UNSUPPORTED+=( changed_working_directory )
                    else CAWS_REC_BROAD+=( git_reset_hard ); fi ;;
                  -*) j=$((j+1)); continue ;;
                esac
              fi
              if [[ "$sub" == restore || $seen_dashdash -eq 1 ]]; then _caws_emit_operand "$j"; fi
              j=$((j+1))
            done
            coordinate_changed=$git_coordinate; i=$j; continue ;;
          clean)
            if [[ $coordinate_changed -eq 1 ]]; then CAWS_REC_UNSUPPORTED+=( changed_working_directory )
            else CAWS_REC_BROAD+=( git_clean ); fi ;;
        esac
        coordinate_changed=$git_coordinate
        i=$((i+1)); continue ;;

    esac
    i=$((i+1))
  done
}

# ---------------------------------------------------------------------------
# Cleanup + resolution.
# ---------------------------------------------------------------------------
# Normalization: candidate lines on STDIN -> absolute, de-duplicated paths on
# STDOUT. Separated from extraction so the two questions stay distinct --
# extraction asks "what did this command name?", normalization asks "where does
# that resolve?". `base` is a RESOLUTION root for relative operands only: it is
# never used to invent a target, and it is not a broad-mutation root.
#
# `base` is REQUIRED. There is deliberately no $PWD fallback: an implicit cwd is
# exactly the ambient dependency this boundary was hardened against, and a
# default would let a caller that forgot the coordinate still get plausible
# output computed against the wrong directory.
caws_bash_mutation_normalize() {
  local base="${1-}"
  if [[ -z "$base" ]]; then
    printf 'caws_bash_mutation_normalize: base is required (no implicit cwd)\n' >&2
    return 2
  fi
  local cand abs
  local -a seen=()
  while IFS= read -r cand; do
    [[ -z "$cand" ]] && continue
    # Operands arrive byte-faithful: the lexer strips syntactic quote delimiters
    # as it consumes them and never introduces a sentinel, so there is nothing
    # here to un-escape. The previous sentinel restoration and quote stripping
    # existed only to undo damage the tokenizer did, and were removed with it.
    if [[ "$cand" == /* ]]; then
      abs="$cand"
    else
      abs="$base/$cand"
    fi
    # Collapse . and .. without requiring the path to exist: a planned file has
    # no inode yet and must still resolve (a new source file is exactly when
    # governing context is most useful).
    abs="$(printf '%s' "$abs" | awk -F/ '{
      n=0; for(i=1;i<=NF;i++){
        if($i=="."||$i==""){continue}
        if($i==".."){if(n>0)n--; continue}
        parts[++n]=$i
      }
      out=""; for(i=1;i<=n;i++){out=out"/"parts[i]}
      if(out=="")out="/"; print out
    }')"
    local dup=0 s
    for s in "${seen[@]+"${seen[@]}"}"; do
      [[ "$s" == "$abs" ]] && { dup=1; break; }
    done
    [[ "$dup" == "1" ]] && continue
    seen+=("$abs")
    printf '%s\n' "$abs"
  done
}

# FILE operands only, verbatim -- the sequence bash-write-guard has always
# consumed. Broad mutations are filtered out here and are reported by
# caws_bash_broad_mutations instead, so neither channel can be mistaken for the
# other. `grep` exits 1 on no match, which is an ordinary empty result and not a
# failure, hence the `|| true`.
caws_bash_mutation_candidates() {
  local cmd="$1"
  _caws_bash_scan_tokens "$cmd"
  printf '%s\n' ${CAWS_REC_FILE[@]+"${CAWS_REC_FILE[@]}"}
}


# Recognized DIRECTORY-scoped mutations as "<kind>\t<root>". `base` is REQUIRED:
# the scanner deliberately produces a kind with an empty root, and only a caller
# that owns a working directory may fill it in.
#
# This channel exists so that "a broad mutation was RECOGNIZED" survives even
# when a consumer declines to project it. Without it, declining and recognizing
# nothing produce the same empty observable, which is the defect
# CASR-SUPPORTED-MUTATION-FORM-COLLAPSES-INTO-NO-RECOGNITION-01 names.
caws_bash_broad_mutations() {
  local cmd="$1"
  local base="${2-}"
  if [[ -z "$base" ]]; then
    printf 'caws_bash_broad_mutations: base is required (no implicit cwd)\n' >&2
    return 2
  fi
  _caws_bash_scan_tokens "$cmd"
  local kind
  for kind in ${CAWS_REC_BROAD[@]+"${CAWS_REC_BROAD[@]}"}; do
    printf '%s\t%s\n' "$kind" "$base"
  done
}


# DYNAMIC operands: file-scoped mutations whose target POPULATION is resolved at
# execution time (rm core/*.py). Emitted as "<pattern>\t<base>" -- the
# UNEXPANDED pattern plus the explicit coordinate it would resolve against.
#
# THE RECOGNIZER NEVER PERFORMS PATHNAME EXPANSION. Expansion depends on
# filesystem state, shell options and timing, none of which a hook may consult
# on the caller's behalf; anchoring it to `base` would not rescue that. Nor may
# a consumer substitute the enclosing directory: measured 2026-09-11, the
# oracle's canonical branch tests globToRegExp(claim pattern).test(candidate),
# so the candidate "core" cannot match a file-specific claim on core/a.py and
# the claim is silently dropped.
#
# This channel is deliberately NOT folded into either other channel: a DYNAMIC
# operand is not a FILE (its population is unknown) and not BROAD (the operation
# is file-scoped, not directory-scoped).
caws_bash_dynamic_mutations() {
  local cmd="$1"
  local base="${2-}"
  if [[ -z "$base" ]]; then
    printf 'caws_bash_dynamic_mutations: base is required (no implicit cwd)\n' >&2
    return 2
  fi
  _caws_bash_scan_tokens "$cmd"
  local rec
  # QUOTED expansion: each record is already tab-separated
  # (expression, resolution_kind, static_prefix, prefix_basis) and an unquoted
  # expansion would word-split it back into meaningless fragments.
  for rec in ${CAWS_REC_DYNAMIC[@]+"${CAWS_REC_DYNAMIC[@]}"}; do
    printf '%s\t%s\n' "$rec" "$base"
  done
}

# Operands the newline-delimited carrier cannot transport faithfully (embedded
# newline or tab). Emitted as a SEPARATE channel so a consumer must handle the
# fact explicitly rather than receiving a silently split record. Records are
# NUL-delimited here because the value itself contains the delimiter the other
# channels use -- that is the whole reason this channel exists.
caws_bash_unrepresentable_targets() {
  local cmd="$1"
  local base="${2-}"
  if [[ -z "$base" ]]; then
    printf 'caws_bash_unrepresentable_targets: base is required (no implicit cwd)\n' >&2
    return 2
  fi
  _caws_bash_scan_tokens "$cmd"
  local rec
  for rec in ${CAWS_REC_UNREPR[@]+"${CAWS_REC_UNREPR[@]}"}; do
    printf '%s\0' "$rec"
  done
}

# Count of unrepresentable operands -- the shape a `while read -r` consumer can
# act on without needing to transport the bytes at all.
caws_bash_unrepresentable_count() {
  local cmd="$1"
  _caws_bash_scan_tokens "$cmd"
  printf '%s\n' "${#CAWS_REC_UNREPR[@]}"
}

# Executable nesting this slice does not parse (process substitution). Presence
# alone is authority-bearing: the nested command can mutate a claimed path that
# no other channel will ever name.
caws_bash_unsupported_nesting() {
  local cmd="$1"
  _caws_bash_scan_tokens "$cmd"
  local rec
  for rec in ${CAWS_REC_UNSUPPORTED[@]+"${CAWS_REC_UNSUPPORTED[@]}"}; do
    printf '%s\n' "$rec"
  done
}

# FILE targets, normalized to absolute de-duplicated paths. `base` is REQUIRED.
# Broad mutations are NOT carried here; a consumer that needs to know whether one
# was recognized asks caws_bash_broad_mutations. An empty result from THIS
# function therefore means "no file target was recognized" and nothing more.
caws_bash_mutation_targets() {
  local cmd="$1"
  local base="${2-}"
  if [[ -z "$base" ]]; then
    printf 'caws_bash_mutation_targets: base is required (no implicit cwd)\n' >&2
    return 2
  fi
  caws_bash_mutation_candidates "$cmd" | caws_bash_mutation_normalize "$base"
}

# Command-position view for the worktree-operation policy. Only these command
# heads are relevant. Multiword arguments are opaque placeholders so quoted
# prose cannot introduce a second operation. Nested executable spans remain
# separate lines. This is a policy view, never executable reconstructed shell.
caws_bash_command_lines() {
  local cmd="$1"
  if declare -F caws_blank_heredoc_bodies >/dev/null 2>&1; then
    cmd="$(caws_blank_heredoc_bodies "$cmd")"
  fi
  _caws_lex "$cmd"
  local i=0 start=1 selected=0 wrapper="" line="" t kind
  while [[ $i -lt ${#CAWS_TOK_VALUE[@]} ]]; do
    t="${CAWS_TOK_VALUE[$i]}"; kind="${CAWS_TOK_KIND[$i]}"
    if [[ "$kind" == op ]]; then
      [[ $selected -eq 1 ]] && printf '%s\n' "$line"
      start=1; selected=0; wrapper=""; line=""; i=$((i+1)); continue
    fi
    if [[ "$kind" == redirect || "$kind" == input_redirect ]]; then i=$((i+2)); continue; fi
    if [[ "$kind" != word ]]; then i=$((i+1)); continue; fi
    if [[ $start -eq 1 ]]; then
      if [[ "$t" =~ ^[A-Za-z_][A-Za-z_0-9]*= ]]; then i=$((i+1)); continue; fi
      if [[ -n "$wrapper" && "$t" == -* ]]; then
        case "$wrapper:$t" in env:-u|env:--unset) i=$((i+2)) ;; *) i=$((i+1)) ;; esac
        continue
      fi
      case "${t##*/}" in
        env|command|builtin|exec) wrapper="${t##*/}"; i=$((i+1)); continue ;;
        if|then|elif|else|do|'!'|'{') i=$((i+1)); continue ;;
        git|caws|cp|mv) selected=1; line="${t##*/}" ;;
      esac
      start=0
    elif [[ $selected -eq 1 ]]; then
      if [[ "$t" == *[[:space:]]* || "${CAWS_TOK_DYNAMIC[$i]}" == 1 ]]; then t=__caws_opaque_argument__; fi
      line+=" $t"
    fi
    i=$((i+1))
  done
  [[ $selected -eq 1 ]] && printf '%s\n' "$line"
  return 0
}

# Lossless token stream for optional policy readers. NUL cannot occur in a
# shell argument. Every record is exactly kind, value, dynamic flag.
caws_bash_token_records() {
  local cmd="$1" i=0
  if declare -F caws_blank_heredoc_bodies >/dev/null 2>&1; then
    cmd="$(caws_blank_heredoc_bodies "$cmd")"
  fi
  _caws_lex "$cmd"
  while [[ $i -lt ${#CAWS_TOK_VALUE[@]} ]]; do
    printf '%s\0%s\0%s\0' "${CAWS_TOK_KIND[$i]}" "${CAWS_TOK_VALUE[$i]}" "${CAWS_TOK_DYNAMIC[$i]}"
    i=$((i+1))
  done
}

# --- cross-repository predicate + interpreter write literals ----------------
# CAWS-GUARD-REMEDIATION-CROSS-REPO-CONSISTENCY-01 promoted both of these out
# of bash-write-guard.sh so a SECOND consumer can reach them: block-dangerous
# must know whether an opaque payload's write target is cross-repo before it
# decides which remediation to print. Two guards disagreeing about what
# "foreign" means is the defect this placement removes — one guard would refuse
# a route the other guard is busy recommending, which is what session 1aa3f0bd
# followed out of the repo.
#
# Both take their roots as ARGUMENTS. This library reads no ambient state, so
# each caller's posture stays its own decision rather than a hidden property of
# the library.

# caws_foreign_repo_root <target> <project_dir>
#   Echo the root of the git repository owning <target> when that repository is
#   NOT <project_dir>. Empty output means no other repository owns the path.
#
#   The boundary is deliberately NARROWER than scope-guard's "any absolute path
#   outside the project": applying that to Bash would refuse ordinary scratch
#   (`cat > /tmp/patch.py`), which is normal and safe. The harm actually named
#   is mutating files outside the governing repo, so the predicate is "inside a
#   DIFFERENT git repository" — which /tmp is not.
caws_foreign_repo_root() {
  local target="$1" project_dir="${2:-}" dir
  [[ -n "$project_dir" ]] || return 0
  case "$target" in
    "$project_dir"|"$project_dir"/*) return 0 ;;
    /*) ;;
    *) return 0 ;;
  esac
  dir="$target"
  [[ -d "$dir" ]] || dir="$(dirname "$dir")"
  while [[ -n "$dir" && "$dir" != "/" ]]; do
    if [[ -e "$dir/.git" ]]; then
      [[ "$dir" != "$project_dir" ]] && printf '%s' "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 0
}

# The write verbs that make an interpreter payload a WRITE payload. The open()
# arm requires a literal first argument AND a literal mode string containing
# w/a/x/+, so a read-only open does not register.
CAWS_PY_WRITE_VERBS="\.write_text\(|\.write_bytes\(|os\.(replace|rename|remove|unlink)\(|shutil\.(copyfile|copy|move)\(|open\([^)]*['\"][^'\"]*['\"][[:space:]]*,[[:space:]]*['\"][rwa+bt]*[wax+][rwa+bt]*['\"]"
CAWS_NODE_WRITE_VERBS="(writeFileSync|appendFileSync|fs\.(writeFile|appendFile|copyFile)|createWriteStream)\(|fs\.(renameSync|unlinkSync|rmSync)\("

# _caws_interp_payload_literals <payload> <verbs_regex>
#   Emit slash-bearing path fragments from ONE interpreter payload, when and
#   only when the payload also contains a write verb for that language.
#
#   Co-occurrence is what keeps reads legal: open("<sibling>/x").read() has no
#   write verb and yields nothing.
#
#   Fragments, not quote-delimited spans: when the code rides inside a quoted
#   -c/-e argument the outer "..." consumes the inner '...' and a span matcher
#   loses the real literal. A fragment reads the same in a script file, a
#   heredoc body, and a nested inline quote.
_caws_interp_payload_literals() {
  local payload="$1" verbs_re="$2" frag
  printf '%s' "$payload" | grep -qE "$verbs_re" || return 0
  while IFS= read -r frag; do
    [[ -z "$frag" ]] && continue
    printf '%s\n' "$frag"
  done < <(printf '%s' "$payload" | grep -oE "[A-Za-z0-9_./~-]*/[A-Za-z0-9_./~-]*" || true)
}

# caws_bash_interpreter_write_literals <command> [cwd]
#   Emit the path literals an interpreter invoked by <command> may WRITE to:
#   from the inline -c/-e code, quoted arguments and heredoc bodies, and from
#   the content of an entry script named on the command line.
#
#   This is WEAKER evidence than a named shell operand — a literal in a script
#   body says the script may write there, not that it will. Callers must treat
#   it accordingly; it is adjudicated at the cross-repository boundary only and
#   must never be fed to an ownership oracle, where any in-project path merely
#   MENTIONED in a script would become a claim conflict.
#
#   What it cannot see: a target COMPUTED at runtime — concatenated from shell
#   variables, read out of a config file, or piped in via `python3 -`. That is
#   a real residual; callers must state it rather than imply completeness.
caws_bash_interpreter_write_literals() {
  local cmd="$1" cwd="${2:-.}" verbs_re=""
  # Detect an interpreter as a COMMAND TOKEN, tokenizing the way the verb
  # extractors do, so `node` inside a path (./node_modules/.bin/tsc) never
  # matches and a chained invocation still does.
  local padded
  padded="$(printf '%s' "$cmd" \
    | sed -E 's/[0-9]*>&[0-9-]+/ /g; s/&>>?[0-9]*/ /g' \
    | sed -E 's/>>/ __CAWS_APPEND__ /g; s/>/ > /g; s/__CAWS_APPEND__/>>/g; s/\|/ | /g; s/;/ ; /g; s/&&/ \&\& /g')"
  # shellcheck disable=SC2206
  local toks=( $padded )
  local n=${#toks[@]} i t
  for ((i=0; i<n; i++)); do
    t="${toks[$i]}"
    case "$t" in
      python|python[0-9]*|python[0-9]*.*) verbs_re="$CAWS_PY_WRITE_VERBS" ;;
      node|nodejs) verbs_re="$CAWS_NODE_WRITE_VERBS" ;;
      *) continue ;;
    esac
    # Payload 1: the command text itself — inline -c/-e code, quoted path
    # arguments, and interpreter heredoc bodies. Deliberately the RAW command
    # (not the heredoc-BLANKED text the operand extractor reads) so an
    # interpreter heredoc body stays visible.
    _caws_interp_payload_literals "$cmd" "$verbs_re"
    # Payload 2: the entry script FILE named on the command line (bounded read).
    local j=$((i+1)) t2 script=""
    while [[ $j -lt $n ]]; do
      t2="${toks[$j]}"
      case "$t2" in
        -c|-e|-m) j=$((j+2)); continue ;;
        -*) j=$((j+1)); continue ;;
      esac
      case "$t2" in
        /*.py|/*.js|/*.mjs|/*.cjs) script="$t2" ;;
        *.py|*.js|*.mjs|*.cjs) script="$cwd/$t2" ;;
      esac
      if [[ -n "$script" ]]; then
        [[ -f "$script" ]] || script=""
        [[ -n "$script" ]] && break
      fi
      j=$((j+1))
    done
    if [[ -n "$script" ]]; then
      local body=""
      body="$(head -c 524288 "$script" 2>/dev/null || true)"
      _caws_interp_payload_literals "$body" "$verbs_re"
    fi
  done
}

# caws_bash_interpreter_foreign_repo <command> <project_dir> [cwd] [home]
#   Echo the FIRST foreign repository root an interpreter write literal in
#   <command> resolves into; empty when there is none.
#
#   A literal may be composed relative to $HOME rather than the agent cwd —
#   `Path.home() / "Desktop/Projects/<sibling>/..."` was the shape in the field
#   — so a non-absolute literal is resolved against BOTH roots and reports
#   foreign if EITHER resolution lands in a different repository.
caws_bash_interpreter_foreign_repo() {
  local cmd="$1" project_dir="$2" cwd="${3:-.}" home="${4:-${HOME:-/nonexistent-home}}"
  local frag res fr
  while IFS= read -r frag; do
    [[ -z "$frag" ]] && continue
    local -a cands=()
    case "$frag" in
      /*) cands=( "$frag" ) ;;
      ~*) cands=( "$cwd/$frag" "$home/${frag#\~}" ) ;;
      *)  cands=( "$cwd/$frag" "$home/$frag" ) ;;
    esac
    for res in "${cands[@]}"; do
      fr="$(caws_foreign_repo_root "$res" "$project_dir")"
      if [[ -n "$fr" ]]; then
        printf '%s\n' "$fr"
        return 0
      fi
    done
  done < <(caws_bash_interpreter_write_literals "$cmd" "$cwd")
  return 0
}
