package com.cbtexammaster.app;

import android.app.Dialog;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.provider.Settings;

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

        @PluginMethod
        public void dismissAuthDialog(PluginCall call) {
            MainActivity activity = (MainActivity) getActivity();
            if (activity != null) {
                activity.dismissAuthDialog();
            }
            call.resolve();
        }

        @PluginMethod
        public void getDevicePhysicalId(PluginCall call) {
            try {
                String androidId = Settings.Secure.getString(getContext().getContentResolver(), Settings.Secure.ANDROID_ID);
                String manufacturer = Build.MANUFACTURER != null ? Build.MANUFACTURER.toUpperCase().replaceAll("[^A-Z0-9]", "") : "ANDROID";
                String model = Build.MODEL != null ? Build.MODEL.toUpperCase().replaceAll("[^A-Z0-9]", "") : "DEVICE";
                String physicalId = "ANDROID-" + manufacturer + "-" + model + "-" + (androidId != null ? androidId : "DEFAULT");
                JSObject ret = new JSObject();
                ret.put("physicalId", physicalId);
                ret.put("platform", "android");
                call.resolve(ret);
            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("physicalId", "ANDROID-UNKNOWN-DEVICE");
                ret.put("platform", "android");
                call.resolve(ret);
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

    private Dialog currentAuthDialog = null;

    public void dismissAuthDialog() {
        runOnUiThread(() -> {
            try {
                if (currentAuthDialog != null && currentAuthDialog.isShowing()) {
                    currentAuthDialog.dismiss();
                    currentAuthDialog = null;
                }
            } catch (Exception ignored) {}
        });
    }

    public class CustomWebChromeClient extends BridgeWebChromeClient {

        public CustomWebChromeClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
            try {
                WebView popupWebView = new WebView(MainActivity.this);
                WebSettings popupSettings = popupWebView.getSettings();
                popupSettings.setJavaScriptEnabled(true);
                popupSettings.setDomStorageEnabled(true);
                popupSettings.setSupportMultipleWindows(true);
                popupSettings.setJavaScriptCanOpenWindowsAutomatically(true);
                popupSettings.setDatabaseEnabled(true);

                // User-Agent sanitization to avoid Google 403 disallowed_useragent
                String ua = popupSettings.getUserAgentString();
                if (ua != null && (ua.contains("; wv") || ua.contains("Version/"))) {
                    ua = ua.replace("; wv", "").replaceAll("Version/\\d+\\.\\d+\\s*", "");
                    popupSettings.setUserAgentString(ua);
                }

                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(popupWebView, true);

                if (currentAuthDialog != null && currentAuthDialog.isShowing()) {
                    currentAuthDialog.dismiss();
                }

                currentAuthDialog = new Dialog(MainActivity.this, android.R.style.Theme_DeviceDefault_Light_NoActionBar_Fullscreen);

                LinearLayout layout = new LinearLayout(MainActivity.this);
                layout.setOrientation(LinearLayout.VERTICAL);
                layout.setLayoutParams(new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.MATCH_PARENT
                ));

                // Header with Title and Cancel button
                LinearLayout header = new LinearLayout(MainActivity.this);
                header.setOrientation(LinearLayout.HORIZONTAL);
                header.setPadding(40, 32, 40, 32);
                header.setBackgroundColor(Color.parseColor("#18181b"));
                header.setGravity(Gravity.CENTER_VERTICAL);

                TextView title = new TextView(MainActivity.this);
                title.setText("Google Sign-In");
                title.setTextColor(Color.WHITE);
                title.setTextSize(16);
                title.setTypeface(null, Typeface.BOLD);
                LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
                title.setLayoutParams(titleParams);
                header.addView(title);

                TextView cancelBtn = new TextView(MainActivity.this);
                cancelBtn.setText("✕ Cancel");
                cancelBtn.setTextColor(Color.parseColor("#a1a1aa"));
                cancelBtn.setTextSize(14);
                cancelBtn.setPadding(20, 10, 20, 10);
                cancelBtn.setOnClickListener(v -> dismissAuthDialog());
                header.addView(cancelBtn);

                layout.addView(header);

                LinearLayout.LayoutParams webViewParams = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.MATCH_PARENT
                );
                layout.addView(popupWebView, webViewParams);

                currentAuthDialog.setContentView(layout);

                currentAuthDialog.setOnDismissListener(d -> {
                    try {
                        popupWebView.destroy();
                    } catch (Exception ignored) {}
                    currentAuthDialog = null;
                });

                currentAuthDialog.setOnKeyListener((d, keyCode, event) -> {
                    if (keyCode == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP) {
                        if (popupWebView.canGoBack()) {
                            popupWebView.goBack();
                        } else {
                            dismissAuthDialog();
                        }
                        return true;
                    }
                    return false;
                });

                popupWebView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onCloseWindow(WebView window) {
                        dismissAuthDialog();
                    }

                    @Override
                    public boolean onCreateWindow(WebView v, boolean isDialog, boolean isUserGesture, Message msg) {
                        WebView.WebViewTransport transport = (WebView.WebViewTransport) msg.obj;
                        transport.setWebView(v);
                        msg.sendToTarget();
                        return true;
                    }
                });

                popupWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        return false;
                    }
                });

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popupWebView);
                resultMsg.sendToTarget();

                currentAuthDialog.show();
                return true;
            } catch (Exception e) {
                e.printStackTrace();
                return false;
            }
        }

        @Override
        public void onCloseWindow(WebView window) {
            dismissAuthDialog();
            super.onCloseWindow(window);
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

        setupWebViewForOAuth();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupWebViewForOAuth();
    }

    private void setupWebViewForOAuth() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView mainWebView = getBridge().getWebView();
                WebSettings settings = mainWebView.getSettings();

                String ua = settings.getUserAgentString();
                if (ua != null && (ua.contains("; wv") || ua.contains("Version/"))) {
                    ua = ua.replace("; wv", "").replaceAll("Version/\\d+\\.\\d+\\s*", "");
                    settings.setUserAgentString(ua);
                }

                settings.setSupportMultipleWindows(true);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
                settings.setDomStorageEnabled(true);

                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(mainWebView, true);

                mainWebView.setWebChromeClient(new CustomWebChromeClient(getBridge()));
            }
        } catch (Exception ignored) {}
    }
}
