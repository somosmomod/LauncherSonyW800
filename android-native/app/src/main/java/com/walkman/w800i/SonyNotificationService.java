package com.walkman.w800i;

import android.app.Notification;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import org.json.JSONObject;

public class SonyNotificationService extends NotificationListenerService {
    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;
        String pkg = sbn.getPackageName();
        if (pkg == null || pkg.equals(getPackageName())) return;
        if (sbn.isOngoing()) return;

        Notification notif = sbn.getNotification();
        Bundle extras = notif.extras;
        if (extras == null) return;

        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        String title = titleCs != null ? titleCs.toString() : "";
        String body = textCs != null ? textCs.toString() : "";
        if (title.isEmpty() && body.isEmpty()) return;

        String appName = pkg;
        try {
            PackageManager pm = getPackageManager();
            ApplicationInfo ai = pm.getApplicationInfo(pkg, 0);
            CharSequence label = pm.getApplicationLabel(ai);
            if (label != null) appName = label.toString();
        } catch (Exception ignored) {
        }

        try {
            JSONObject payload = new JSONObject();
            payload.put("appName", appName);
            payload.put("title", title.isEmpty() ? appName : title);
            payload.put("body", body);
            payload.put("packageName", pkg);
            MainActivity.dispatchNotificationToWeb(payload.toString());
        } catch (Exception ignored) {
        }
    }
}
