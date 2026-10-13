#!/usr/bin/env bash
# Byte-for-byte check of the JS GP5 writer against PyGuitarPro (pip install pyguitarpro)
set -e; cd "$(dirname "$0")"; mkdir -p out
python3 gp5_reference.py && node gp5_writer_test.js && cmp out/ref.gp5 out/js.gp5 && echo "basic: identical"
python3 gp5_reference_fx.py && node gp5_writer_fx_test.js && cmp out/ref_fx.gp5 out/js_fx.gp5 && echo "effects: identical"
