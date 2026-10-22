import os
import json
import re

EXAMS_DIR = "/Users/jigar/Downloads/CBT/test-android/public/data/exams"
MANIFEST_PATH = "/Users/jigar/Downloads/CBT/test-android/public/manifest.json"
CATALOG_INDEX_PATH = "/Users/jigar/Downloads/CBT/test-android/public/data/catalog_index.json"

def classify_test(filename, stage_name, exam_id):
    f = filename.lower()
    s = stage_name.lower()
    e = exam_id.lower()

    # 1. Current Affairs
    if 'current_affairs' in e or 'ca_202' in f or 'current affairs' in s or 'monthly ca' in s or 'yearly revision' in s:
        return 20, 20, 20

    # 2. State PSC / UPSC Subject Level Tests (History, Polity, Geography)
    if 'geography_all_psc' in e or 'history_all_psc' in e or 'polity_all_psc' in e or 'state psc level test' in s or 'upsc level tests' in s:
        return 10, 10, 10

    # 3. NCERT Foundation & Practice
    if 'ncert' in e or 'ncert' in s:
        return 15, 15, 15

    # 4. UPSC CSAT
    if 'csat' in e or 'csat' in s:
        if 'full' in s or 'pyp' in s or 'previous year' in s:
            return 80, 120, 200
        return 15, 20, 37.5

    # 5. SSC Exams
    if 'ssc' in e:
        if '_ct_' in f or 'chapter' in s or 'pyct' in s or 'trick' in s:
            if 'math' in s or 'quant' in s or 'numerical' in s:
                return 15, 15, 30
            return 10, 10, 20
        if 'steno' in e and ('subject test' in s or 'sectional' in s):
            return 50, 30, 50
        if '_st_' in f or 'subject test' in s or 'sectional' in s or 'module test' in s or 'pyst' in s or 'eduquity' in s or 'basic pyq' in s or 'advanced pyq' in s:
            return 25, 15, 50
        if 'cpo' in e and ('full' in s or 'official' in s):
            return 200, 120, 200
        if 'full' in s or 'official' in s or 'tier1' in s or 'tier - i' in s or 'tier-1' in s or 'pyp' in s:
            return 100, 60, 200

    # 6. Banking & Insurance (IBPS, SBI, NICL, LIC)
    if any(k in e for k in ['ibps', 'sbi', 'banking', 'nicl', 'lic']):
        if 'most saved' in s or 'msq' in s:
            return 15, 15, 15
        if 'english' in s and ('sectional' in s or 'subject test' in s or 'memory based sts' in s or 'mbt' in s):
            return 30, 20, 30
        if ('quant' in s or 'numerical' in s) and ('sectional' in s or 'subject test' in s or 'memory based sts' in s or 'mbt' in s):
            return 35, 20, 35
        if 'reasoning' in s and ('sectional' in s or 'subject test' in s or 'memory based sts' in s or 'mbt' in s):
            return 35, 20, 35
        if ('general awareness' in s or 'current' in s or 'banking' in s) and ('sectional' in s or 'subject test' in s):
            return 40, 20, 40
        if 'mains' in s and ('full' in s or 'memory based paper' in s):
            return 155, 180, 200
        if 'prelims' in s and ('full' in s or 'mega' in s):
            return 100, 60, 100

    # 7. Railways (RRB NTPC, RRB JE, Group D)
    if 'rrb' in e:
        if 'pyct' in s or 'chapter' in s:
            return 15, 15, 15
        if 'subject test' in s or 'sectional' in s:
            return 30, 25, 30
        if 'study plan' in s or 'accelerator' in s:
            return 20, 15, 20
        if 'cbt 2' in s or 'cbt2' in s or 'cbt - 2' in s:
            return 120, 90, 120
        if 'cbt 1' in s or 'cbt1' in s or 'cbt - 1' in s:
            return 100, 90, 100

    # 8. Coal India (CIL) & Technical
    if 'cil' in e:
        if 'most saved' in s:
            return 15, 15, 15
        if 'subject test' in s:
            return 30, 25, 30
        if 'full' in s or 'official' in s or 'pyps' in s:
            return 100, 90, 100

    # 9. UPSC CSE / Civil Services
    if 'upsc' in e:
        if 'chapter' in s or 'drill' in s or '_ct_' in f or 'antim prahar' in s:
            return 10, 12, 10
        if 'sectional' in s or '_st_' in f:
            return 25, 30, 50
        if 'full' in s or 'previous year' in s or 'pyp' in s:
            return 100, 120, 200

    # Generic Chapter / Sectional Fallbacks
    if '_ct_' in f or 'chapter' in s or 'topic drill' in s:
        return 10, 10, 10
    if '_st_' in f or 'sectional' in s or 'subject test' in s:
        return 25, 20, 25

    return 100, 60, 100

def main():
    print("🚀 Re-indexing All Catalog Files with Precision Exam Specs...")

    exam_files = sorted([f for f in os.listdir(EXAMS_DIR) if f.endswith('.json')])
    total_updated = 0
    total_tests = 0
    manifest_map = {}

    for f in exam_files:
        full_path = os.path.join(EXAMS_DIR, f)
        with open(full_path, 'r', encoding='utf-8') as fh:
            data = json.load(fh)

        eid = f.replace('.json', '')
        file_changed = False

        for stage in data.get('stages', []):
            sname = stage.get('name', '')
            for test in stage.get('tests', []):
                total_tests += 1
                fn = test.get('filename', '')

                # Determine true specs
                q, dur, marks = classify_test(fn, sname, eid)

                if test.get('totalQuestions') != q or test.get('totalDurationMinutes') != dur or test.get('totalMarks') != marks:
                    test['totalQuestions'] = q
                    test['solutionsCount'] = q
                    test['totalDurationMinutes'] = dur
                    test['totalMarks'] = marks
                    total_updated += 1
                    file_changed = True

        if file_changed:
            with open(full_path, 'w', encoding='utf-8') as fh:
                json.dump(data, fh, separators=(',', ':'))

        manifest_map[eid] = data

    print(f"✅ Updated {total_updated} / {total_tests} tests across all catalogs!")

    # Synchronize public/manifest.json
    if os.path.exists(MANIFEST_PATH):
        print(f"🔄 Syncing {MANIFEST_PATH}...")
        with open(MANIFEST_PATH, 'r', encoding='utf-8') as fh:
            m = json.load(fh)

        for cat in m.get('categories', []):
            for ex in cat.get('exams', []):
                ex_id = ex.get('id')
                if ex_id in manifest_map:
                    full_ex = manifest_map[ex_id]
                    ex['stages'] = full_ex.get('stages', [])
                    ex['totalTests'] = full_ex.get('totalTests', sum(len(s.get('tests', [])) for s in ex['stages']))

        with open(MANIFEST_PATH, 'w', encoding='utf-8') as fh:
            json.dump(m, fh, separators=(',', ':'))
        print("✅ manifest.json fully synced!")

    # Synchronize public/data/catalog_index.json
    if os.path.exists(CATALOG_INDEX_PATH):
        print(f"🔄 Syncing {CATALOG_INDEX_PATH}...")
        with open(CATALOG_INDEX_PATH, 'r', encoding='utf-8') as fh:
            idx = json.load(fh)

        for cat in idx.get('categories', []):
            for ex in cat.get('exams', []):
                ex_id = ex.get('id')
                if ex_id in manifest_map:
                    full_ex = manifest_map[ex_id]
                    ex['totalTests'] = full_ex.get('totalTests', 0)
                    ex['stageCount'] = len(full_ex.get('stages', []))
                    ex['stagesSummary'] = [
                        {'id': s.get('id'), 'name': s.get('name'), 'totalTests': len(s.get('tests', []))}
                        for s in full_ex.get('stages', [])
                    ]

        with open(CATALOG_INDEX_PATH, 'w', encoding='utf-8') as fh:
            json.dump(idx, fh, indent=2)
        print("✅ catalog_index.json fully synced!")

if __name__ == '__main__':
    main()
