import os
import sys
import json
import re
import time
import ctypes

libc = ctypes.cdll.LoadLibrary('/usr/lib/libc.dylib')
getxattr = libc.getxattr
getxattr.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_char_p, ctypes.c_size_t, ctypes.c_uint32, ctypes.c_int]
getxattr.restype = ctypes.c_ssize_t

buf = ctypes.create_string_buffer(256)
attr_name = b'com.google.drivefs.item-id#S'

GDRIVE_ROOT = "/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER"
EXAMS_DIR = "/Users/jigar/Downloads/CBT/test-android/public/data/exams"
CATALOG_INDEX_PATH = "/Users/jigar/Downloads/CBT/test-android/public/data/catalog_index.json"
MANIFEST_PATH = "/Users/jigar/Downloads/CBT/test-android/public/manifest.json"

q_re = re.compile(r'"totalQuestions":\s*(\d+)')
dur_re = re.compile(r'"(?:totalDurationMinutes|durationMinutes)":\s*(\d+)')
marks_re = re.compile(r'"totalMarks":\s*(\d+)')
title_re = re.compile(r'"title":\s*"([^"]+)"')

def clean_title(raw_title, filename):
    t = raw_title or filename.replace('.json', '')
    t = re.sub(r'^[A-Z0-9_]+_(?:CT|ST|PYST|Test)_\d+_?', '', t)
    t = re.sub(r'^[A-Z0-9_]+_\d+_?', '', t)
    t = t.replace('_', ' ').strip()
    return t or raw_title

def infer_test_metrics(test, filename, stage_name, exam_code):
    lower_f = filename.lower()
    lower_s = stage_name.lower()
    lower_e = exam_code.lower()

    # 1. Chapter tests
    if '_ct_' in lower_f or 'chapter test' in lower_s or 'topic test' in lower_s or 'drill' in lower_s:
        if 'csat' in lower_s or 'quant' in lower_s or 'math' in lower_s:
            return 15, 15, 15
        if 'upsc' in lower_e:
            return 10, 12, 10
        return 10, 10, 10

    # 2. Sectional tests
    if '_st_' in lower_f or 'sectional' in lower_s:
        if 'english' in lower_s:
            return 30, 25, 30
        if 'reasoning' in lower_s or 'quant' in lower_s:
            return 35, 20, 35
        return 25, 20, 25

    # 3. PYST / Shift tests
    if '_pyst_' in lower_f or 'shift' in lower_s or 'pyst' in lower_s:
        if 'ssc' in lower_e or 'rrb' in lower_e:
            return 25, 15, 25
        return 50, 35, 50

    # 4. Mini mocks / speed tests
    if 'mini' in lower_f or 'mini' in lower_s or 'speed' in lower_s:
        return 15, 15, 15

    # 5. Full length mocks / official papers / PYPs
    if 'cpo' in lower_e and ('full' in lower_s or 'official' in lower_s):
        return 200, 120, 200
    if 'upsc_cse' in lower_e and ('full' in lower_s or 'mock' in lower_s):
        if 'csat' in lower_s:
            return 80, 120, 200
        return 100, 120, 200

    # Default full mocks
    return 100, 60, 100

def main():
    start_time = time.time()
    print("🚀 Running Precision Catalog & DriveFileId Enrichment...")

    exam_files = sorted([f for f in os.listdir(EXAMS_DIR) if f.endswith('.json')])
    print(f"📦 Found {len(exam_files)} exam files in public/data/exams")

    total_tests_processed = 0
    total_drive_ids_matched = 0
    total_local_headers_read = 0

    manifest_map = {}

    for f in exam_files:
        full_path = os.path.join(EXAMS_DIR, f)
        try:
            with open(full_path, 'r', encoding='utf-8') as fh:
                exam_data = json.load(fh)
        except Exception as e:
            print(f"❌ Failed to load {f}: {e}")
            continue

        exam_code = exam_data.get('code', f.replace('.json', ''))
        file_changed = False

        for stage in exam_data.get('stages', []):
            stage_name = stage.get('name', '')
            for test in stage.get('tests', []):
                total_tests_processed += 1
                rp = test.get('relativePath', '')
                fn = test.get('filename', os.path.basename(rp))

                target_file = os.path.join(GDRIVE_ROOT, rp)

                # 1. Extract driveFileId via ctypes getxattr (0 quota cost!)
                if os.path.exists(target_file):
                    res = getxattr(target_file.encode('utf-8'), attr_name, buf, 256, 0, 0)
                    if res > 0:
                        drive_id = buf.raw[:res].decode('utf-8')
                        if test.get('driveFileId') != drive_id:
                            test['driveFileId'] = drive_id
                            file_changed = True
                        total_drive_ids_matched += 1

                    # 2. Check if file is already hydrated locally (not UF_DATALESS)
                    try:
                        st = os.stat(target_file)
                        is_dataless = bool(getattr(st, 'st_flags', 0) & 0x40)
                        if not is_dataless:
                            # Safely read local header without network quota!
                            with open(target_file, 'rb') as tf:
                                chunk = tf.read(2048).decode('utf-8', errors='ignore')
                            qm = q_re.search(chunk)
                            dm = dur_re.search(chunk)
                            mm = marks_re.search(chunk)
                            tm = title_re.search(chunk)
                            if qm:
                                test['totalQuestions'] = int(qm.group(1))
                                test['solutionsCount'] = int(qm.group(1))
                            if dm:
                                test['totalDurationMinutes'] = int(dm.group(1))
                            if mm:
                                test['totalMarks'] = int(mm.group(1))
                            if tm and tm.group(1).strip():
                                test['title'] = tm.group(1).strip()
                            total_local_headers_read += 1
                            file_changed = True
                            continue
                    except Exception:
                        pass

                # 3. For dataless files, use precision pattern inference if currently hardcoded to 100
                if test.get('totalQuestions') == 100:
                    iq, idur, imarks = infer_test_metrics(test, fn, stage_name, exam_code)
                    if iq != 100 or idur != 60:
                        test['totalQuestions'] = iq
                        test['solutionsCount'] = iq
                        test['totalDurationMinutes'] = idur
                        test['totalMarks'] = imarks
                        file_changed = True

                # Clean title if needed
                if test.get('title'):
                    cleaned = clean_title(test['title'], fn)
                    if cleaned and cleaned != test['title']:
                        test['title'] = cleaned
                        file_changed = True

        if file_changed:
            with open(full_path, 'w', encoding='utf-8') as fh:
                json.dump(exam_data, fh, separators=(',', ':'))

        manifest_map[f.replace('.json', '')] = exam_data

    print(f"\n📊 Summary:")
    print(f"  Processed tests: {total_tests_processed}")
    print(f"  Drive IDs matched via xattr: {total_drive_ids_matched}")
    print(f"  Local headers read from SSD: {total_local_headers_read}")

    # Now synchronize public/manifest.json
    if os.path.exists(MANIFEST_PATH):
        try:
            print(f"🔄 Synchronizing {MANIFEST_PATH} with driveFileIds and accurate metrics...")
            with open(MANIFEST_PATH, 'r', encoding='utf-8') as fh:
                manifest_data = json.load(fh)

            updated_manifest_tests = 0
            for cat in manifest_data.get('categories', []):
                for ex in cat.get('exams', []):
                    ex_id = ex.get('id')
                    if ex_id in manifest_map:
                        full_exam = manifest_map[ex_id]
                        ex['stages'] = full_exam.get('stages', [])
                        ex['totalTests'] = full_exam.get('totalTests', sum(len(s.get('tests', [])) for s in ex['stages']))
                        updated_manifest_tests += ex['totalTests']

            manifest_data['lastUpdated'] = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
            with open(MANIFEST_PATH, 'w', encoding='utf-8') as fh:
                json.dump(manifest_data, fh, separators=(',', ':'))
            print(f"✅ Successfully updated manifest.json ({updated_manifest_tests} tests synchronized)")
        except Exception as e:
            print(f"⚠️ Error updating manifest.json: {e}")

    # Synchronize public/data/catalog_index.json
    if os.path.exists(CATALOG_INDEX_PATH):
        try:
            with open(CATALOG_INDEX_PATH, 'r', encoding='utf-8') as fh:
                cat_idx = json.load(fh)

            grand_total = 0
            for cat in cat_idx.get('categories', []):
                cat_total = 0
                for ex in cat.get('exams', []):
                    ex_id = ex.get('id')
                    if ex_id in manifest_map:
                        full_exam = manifest_map[ex_id]
                        ex['totalTests'] = full_exam.get('totalTests', 0)
                        ex['stageCount'] = len(full_exam.get('stages', []))
                        ex['stagesSummary'] = [
                            {'id': s.get('id'), 'name': s.get('name'), 'totalTests': len(s.get('tests', []))}
                            for s in full_exam.get('stages', [])
                        ]
                    cat_total += ex.get('totalTests', 0)
                cat['totalTests'] = cat_total
                grand_total += cat_total

            cat_idx['totalTests'] = grand_total
            cat_idx['lastUpdated'] = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
            with open(CATALOG_INDEX_PATH, 'w', encoding='utf-8') as fh:
                json.dump(cat_idx, fh, indent=2)
            print(f"✅ Synchronized catalog_index.json (Total tests: {grand_total})")
        except Exception as e:
            print(f"⚠️ Error updating catalog_index.json: {e}")

    print(f"\n🎉 Finished in {time.time() - start_time:.2f}s!")

if __name__ == '__main__':
    main()
