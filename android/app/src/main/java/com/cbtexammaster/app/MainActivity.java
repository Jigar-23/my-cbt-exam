package com.cbtexammaster.app;

import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {

    @CapacitorPlugin(name = "SystemTheme")
    public static class SystemThemePlugin extends Plugin {
        @PluginMethod
        public void setSystemBars(PluginCall call) {
            String statusBarColor = call.getString("statusBarColor", "#18181b");
            String navBarColor = call.getString("navBarColor", "#0f1015");
            boolean isDark = call.getBoolean("isDark", true);

            MainActivity activity = (MainActivity) getActivity();
            if (activity != null) {
                activity.runOnUiThread(() -> {
                    activity.applyBarColors(statusBarColor, navBarColor, isDark);
                    call.resolve();
                });
            } else {
                call.resolve();
            }
        }
    }

    public void applyBarColors(String statusBarColor, String navBarColor, boolean isDark) {
        try {
            Window window = getWindow();
            int statusColor = isDark ? Color.parseColor("#18181b") : Color.parseColor("#ffffff");
            int navColor = isDark ? Color.parseColor("#0f1015") : Color.parseColor("#ffffff");
            int canvasColor = isDark ? Color.parseColor("#0f1015") : Color.parseColor("#ffffff");

            // 1. Ensure system bar backgrounds can be drawn
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

            // 2. Set bar colors directly
            window.setStatusBarColor(statusColor);
            window.setNavigationBarColor(navColor);

            // 3. Set Window background
            window.setBackgroundDrawable(new ColorDrawable(canvasColor));

            View decorView = window.getDecorView();
            if (decorView != null) {
                decorView.setBackgroundColor(canvasColor);

                // 4. Modern Insets Controller
                WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, decorView);
                if (insetsController != null) {
                    insetsController.setAppearanceLightStatusBars(!isDark);
                    insetsController.setAppearanceLightNavigationBars(!isDark);
                }

                // 5. Direct System UI flags for Samsung One UI & Android 6-15
                int flags = decorView.getSystemUiVisibility();
                if (!isDark) {
                    // Light mode: Black system icons on White bar
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    }
                } else {
                    // Dark mode: White system icons on Dark bar
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    }
                }
                decorView.setSystemUiVisibility(flags);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setNavigationBarContrastEnforced(false);
            }

            // 6. WebView Background
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().setBackgroundColor(canvasColor);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SystemThemePlugin.class);
        super.onCreate(savedInstanceState);

        int nightModeFlags = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        boolean isNight = nightModeFlags == Configuration.UI_MODE_NIGHT_YES;

        if (isNight) {
            applyBarColors("#18181b", "#0f1015", true);
        } else {
            applyBarColors("#ffffff", "#ffffff", false);
        }
    }
}
