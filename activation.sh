#!/bin/sh
set -e

os=$(uname -s | tr '[:upper:]' '[:lower:]')
case $os in
linux)
  export PATH="${PWD}/bin/linux-64:${PATH}"
  ;;
darwin)
  export PATH="${PWD}/bin/osx-64:${PATH}"
  ;;
*)
  echo "Unsupported OS: $os" >&2
  exit 1
  ;;
esac
