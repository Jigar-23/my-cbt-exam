#!/bin/bash
ADB="/Users/jigar/Library/Android/sdk/platform-tools/adb"
APK="/Users/jigar/Downloads/CBT-Exam-Master-2026.apk"

echo "Monitoring device RZGL41DHPXL..."
for i in {1..40}; do
  STATUS=$($ADB devices | grep RZGL41DHPXL | awk '{print $2}')
  if [ "$STATUS" = "device" ]; then
    echo "Device authorized! Pushing and installing APK..."
    $ADB install -r -d "$APK"
    if [ $? -eq 0 ]; then
      echo "=== INSTALL SUCCESSFUL ==="
      echo "Launching CBT Exam Master 2026 on your phone..."
      $ADB shell am start -n com.cbtexammaster.app/.MainActivity
      echo "=== APP LAUNCHED SUCCESSFULLY ==="
    else
      echo "Install command failed. Trying pm install..."
      $ADB push "$APK" /data/local/tmp/app.apk
      $ADB shell pm install -r -d /data/local/tmp/app.apk
      $ADB shell am start -n com.cbtexammaster.app/.MainActivity
    fi
    exit 0
  fi
  sleep 2
done

echo "Timed out waiting for authorization. Please unlock your phone and tap Allow."
