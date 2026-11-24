package com.walkman.w800i;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import java.lang.ref.WeakReference;

public class MainActivity extends BridgeActivity {
    private static WeakReference<MainActivity> activeInstance = new WeakReference<>(null);

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(W800iLauncherPlugin.class);
        super.onCreate(savedInstanceState);
        activeInstance = new WeakReference<>(this);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('w800i-back'));",
                        null
                    );
                }
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        activeInstance = new WeakReference<>(this);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        MainActivity current = activeInstance.get();
        if (current == this) {
            activeInstance = new WeakReference<>(null);
        }
    }

    public static void dispatchNotificationToWeb(final String jsonPayload) {
        final MainActivity activity = activeInstance.get();
        if (activity == null || activity.isFinishing()) return;
        activity.runOnUiThread(() -> {
            if (activity.bridge != null && activity.bridge.getWebView() != null) {
                activity.bridge.getWebView().evaluateJavascript(
                    "if (window.pushSonyNotification) { window.pushSonyNotification(" + jsonPayload + "); }",
                    null
                );
            }
        });
    }
}
