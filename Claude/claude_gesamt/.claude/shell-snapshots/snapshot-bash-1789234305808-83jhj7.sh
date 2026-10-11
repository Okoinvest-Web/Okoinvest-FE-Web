# Snapshot file
# Unset all aliases to avoid conflicts with functions
unalias -a 2>/dev/null || true
shopt -s expand_aliases
# Check for rg availability
if ! (unalias rg 2>/dev/null; command -v rg) >/dev/null 2>&1; then
  function rg {
  local _cc_bin="${CLAUDE_CODE_EXECPATH:-}"
  [[ -x $_cc_bin ]] || _cc_bin=/c/Users/SALEADMIN/.local/bin/claude.exe
  if [[ ! -x $_cc_bin ]]; then command rg ${1+"$@"}; return; fi
  if [[ -n ${ZSH_VERSION:-} ]]; then
    ARGV0=rg "$_cc_bin" ${1+"$@"}
  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    ARGV0=rg "$_cc_bin" ${1+"$@"}
  else
    (exec -a rg "$_cc_bin" ${1+"$@"})
  fi
}
fi
# Shadow pkill to refuse patterns matching the CLI process
unalias pkill 2>/dev/null || true
function pkill {
  if [ -n "${CLAUDE_PID:-}" ] && [ -r "/proc/${CLAUDE_PID}/comm" ]; then
    local _cc_skip="" _cc_a
    local -a _cc_probe=()
    for _cc_a in ${1+"$@"}; do
      if [ -n "$_cc_skip" ]; then _cc_skip=""; continue; fi
      case "$_cc_a" in
        --signal) _cc_skip=1 ;;
        --signal=*|-e|--echo) ;;
        -[0-9]*) ;;
        -[PUGOF]?*) _cc_probe+=("$_cc_a") ;;
        -[ABCDEFGHIJKLMNOPQRSTUVWXYZ][ABCDEFGHIJKLMNOPQRSTUVWXYZ0-9]*) ;;
        *) _cc_probe+=("$_cc_a") ;;
      esac
    done
    if command pgrep ${_cc_probe[@]+"${_cc_probe[@]}"} 2>/dev/null | command grep -qx "${CLAUDE_PID}"; then
      printf 'pkill: refusing to run — this pattern matches the Claude CLI process (PID %s). Narrow the pattern, or target your own children with `pkill -P $$ ...`.\n' "${CLAUDE_PID}" >&2
      return 1
    fi
  fi
  command pkill ${1+"$@"}
}
export PATH='/c/Users/SALEADMIN/bin:/mingw64/bin:/usr/local/bin:/usr/bin:/bin:/mingw64/bin:/usr/bin:/c/Users/SALEADMIN/bin:/c/WINDOWS/system32:/c/WINDOWS:/c/WINDOWS/System32/Wbem:/c/WINDOWS/System32/WindowsPowerShell/v1.0:/c/WINDOWS/System32/OpenSSH:/c/Program Files/PuTTY:/c/Users/SALEADMIN/AppData/Local/Microsoft/WindowsApps:/cmd:/mingw64/bin:/usr/bin/vendor_perl:/usr/bin/core_perl:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_011v5h6QUzBZvas64y44XLhy/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_012ABz1xjgtJYWKrcJkXW6ad/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_014WxCYbLf7f3uw2isHFR9US/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_016kCmK4LhtWJEFSRVcTBZeB/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_017zncz89kmhdPgdpZQZm5Dj/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_019TBdWa5NQJJuDFmEc4k6BJ/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_01AYHYqVLaZRH2Vi6aHgDwEw/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_01BYoFffWxgV8R5TZ6fEVCih/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_01Eeb9y5m4iFuY3yRtytYfdc/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_01FTLa86dhbVJ3HB1LdHdhN7/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_01KmRfL8EXGF3PeqMRzef1TR/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_01SfWJSiw6JtGbsuW75PKvPK/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_01VTbvGZYaCVU2CNSvhDCnkg/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_01VyNDLNYUZHHyKf7A691D7V/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/425cbda1-5a07-435d-8861-12372e8f6f40/a6253768-8123-463b-9100-96b85287bca0/rpm/plugin_01XXJmxLXPEhPMmnxmrgntNw/bin:/c/Users/SALEADMIN/AppData/Roaming/Claude/local-agent-mode-sessions/skills-plugin/a6253768-8123-463b-9100-96b85287bca0/425cbda1-5a07-435d-8861-12372e8f6f40/bin'
