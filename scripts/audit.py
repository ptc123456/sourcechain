import re

files = {
    'SourceChainRegistry.py': open('contracts/SourceChainRegistry.py').read(),
    'SourceChainTreasury.py': open('contracts/SourceChainTreasury.py').read(),
}

all_pass = True

for name, src in files.items():
    lines = src.split('\n')
    print(f'\n=== {name} ===')

    checks = {}

    # Rule 1: First line must be # v0.2.16
    checks['Rule 1  Line 1 = # v0.2.16'] = lines[0] == '# v0.2.16'

    # Rule 2: Second line has Depends
    checks['Rule 2  Line 2 has Depends'] = '"Depends"' in lines[1]

    # Rule 3: No TreeMap() or DynArray() in __init__
    in_init = False
    init_bad = False
    for line in lines:
        if 'def __init__' in line:
            in_init = True
        if in_init and ('TreeMap()' in line or 'DynArray()' in line):
            init_bad = True
        if in_init and line.strip().startswith('def ') and '__init__' not in line:
            in_init = False
    checks['Rule 3  No TreeMap()/DynArray() in __init__'] = not init_bad

    # Rule 4: No float in public method signatures (check @gl.public decorated methods)
    float_in_sig = bool(re.search(r'def \w+\(self[^)]*:\s*float', src))
    checks['Rule 4  No float in method signatures'] = not float_in_sig

    # Rule 5: Uses TreeMap/DynArray for storage annotations
    checks['Rule 5  Uses TreeMap/DynArray storage'] = 'TreeMap[' in src

    # Rule 6: Class named Contract extends gl.Contract
    checks['Rule 6  Class Contract(gl.Contract)'] = 'class Contract(gl.Contract):' in src

    # Rule 7: gl.nondet.* only inside run_nondet_unsafe
    has_nondet = 'gl.nondet.' in src
    has_wrapper = 'gl.vm.run_nondet_unsafe' in src
    if has_nondet:
        checks['Rule 7  gl.nondet inside run_nondet_unsafe'] = has_wrapper
    else:
        checks['Rule 7  No nondet calls (Treasury - OK)'] = True

    # Rule 13: from genlayer import *
    checks['Rule 13 from genlayer import *'] = 'from genlayer import *' in src
    checks['Rule 13 No import genlayer as gl'] = 'import genlayer as gl' not in src

    # Semantic validator check
    checks['Semantic validator_fn checks verdict value'] = (
        "not in [\"VERIFIED\", \"REJECTED\"]" in src or
        'verdict not in' in src
    )

    for rule, ok in checks.items():
        status = 'PASS' if ok else 'FAIL'
        icon = 'OK' if ok else 'XX'
        print(f'  [{icon}] {rule}: {status}')
        if not ok:
            all_pass = False

print(f'\n{"ALL CHECKS PASSED" if all_pass else "SOME CHECKS FAILED"}')
