package com.walkman.w800i;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "W800iLauncher")
public class W800iLauncherPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private static class AppEntry {
        String name;
        String packageName;
        String iconDataUrl;
    }

    private static String drawableToBase64Png(Drawable drawable) {
        if (drawable == null) return "";
        try {
            int size = 96;
            Bitmap bitmap;
            boolean shouldRecycle = false;
            if (drawable instanceof BitmapDrawable && ((BitmapDrawable) drawable).getBitmap() != null) {
                Bitmap src = ((BitmapDrawable) drawable).getBitmap();
                if (src.getWidth() == size && src.getHeight() == size) {
                    bitmap = src;
                } else {
                    bitmap = Bitmap.createScaledBitmap(src, size, size, true);
                    shouldRecycle = true;
                }
            } else {
                bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
                drawable.draw(canvas);
                shouldRecycle = true;
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, out);
            if (shouldRecycle && !bitmap.isRecycled()) {
                bitmap.recycle();
            }
            return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return "";
        }
    }

    @PluginMethod
    public void getInstalledApps(final PluginCall call) {
        executor.execute(() -> {
            try {
                Context ctx = getContext();
                PackageManager pm = ctx.getPackageManager();
                String selfPkg = ctx.getPackageName();

                Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
                mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);

                List<ResolveInfo> resolvedList = pm.queryIntentActivities(mainIntent, 0);
                Set<String> seen = new HashSet<>();
                List<AppEntry> entries = new ArrayList<>();

                for (ResolveInfo info : resolvedList) {
                    if (info.activityInfo == null) continue;
                    String pkg = info.activityInfo.packageName;
                    if (pkg == null || pkg.equals(selfPkg) || seen.contains(pkg)) continue;
                    seen.add(pkg);

                    AppEntry entry = new AppEntry();
                    CharSequence label = info.loadLabel(pm);
                    entry.name = label != null ? label.toString().trim() : pkg;
                    entry.packageName = pkg;
                    entry.iconDataUrl = drawableToBase64Png(info.loadIcon(pm));
                    entries.add(entry);
                }

                Collections.sort(entries, new Comparator<AppEntry>() {
                    @Override
                    public int compare(AppEntry a, AppEntry b) {
                        return a.name.compareToIgnoreCase(b.name);
                    }
                });

                JSArray arr = new JSArray();
                for (AppEntry e : entries) {
                    JSObject obj = new JSObject();
                    obj.put("name", e.name);
                    obj.put("packageName", e.packageName);
                    obj.put("iconDataUrl", e.iconDataUrl);
                    arr.put(obj);
                }

                JSObject res = new JSObject();
                res.put("apps", arr);
                call.resolve(res);
            } catch (Exception e) {
                call.reject("No se pudieron leer las apps instaladas: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void launchApp(PluginCall call) {
        String pkg = call.getString("packageName");
        if (pkg == null || pkg.trim().isEmpty()) {
            call.reject("packageName requerido");
            return;
        }
        try {
            PackageManager pm = getContext().getPackageManager();
            Intent intent = pm.getLaunchIntentForPackage(pkg.trim());
            if (intent == null) {
                call.reject("App no encontrada en el dispositivo: " + pkg);
                return;
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            getContext().startActivity(intent);
            JSObject res = new JSObject();
            res.put("launched", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Error al abrir la app: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isDefaultLauncher(PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_MAIN);
            intent.addCategory(Intent.CATEGORY_HOME);
            ResolveInfo resolveInfo = getContext().getPackageManager().resolveActivity(
                intent,
                PackageManager.MATCH_DEFAULT_ONLY
            );
            boolean isDefault = resolveInfo != null
                && resolveInfo.activityInfo != null
                && getContext().getPackageName().equals(resolveInfo.activityInfo.packageName);
            JSObject res = new JSObject();
            res.put("isDefault", isDefault);
            call.resolve(res);
        } catch (Exception e) {
            JSObject res = new JSObject();
            res.put("isDefault", false);
            call.resolve(res);
        }
    }

    @PluginMethod
    public void openSystemSettings(PluginCall call) {
        String target = call.getString("target", "home");
        try {
            Intent intent;
            String pkgUri = "package:" + getContext().getPackageName();
            if ("notifications".equals(target) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            } else if ("overlay".equals(target) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse(pkgUri));
            } else if ("unknown_sources".equals(target) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse(pkgUri));
            } else if ("wifi".equals(target)) {
                intent = new Intent(Settings.ACTION_WIFI_SETTINGS);
            } else if ("bluetooth".equals(target)) {
                intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
            } else if ("app_details".equals(target)) {
                intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse(pkgUri));
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    intent = new Intent(Settings.ACTION_HOME_SETTINGS);
                } else {
                    intent = new Intent(Settings.ACTION_SETTINGS);
                }
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject res = new JSObject();
            res.put("opened", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("No se pudo abrir ajustes: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndInstallApk(final PluginCall call) {
        final String apkUrl = call.getString("url");
        final String fileName = call.getString("fileName", "w800i-walkman-launcher.apk");
        if (apkUrl == null || apkUrl.trim().isEmpty()) {
            call.reject("URL de APK requerida");
            return;
        }

        final Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !ctx.getPackageManager().canRequestPackageInstalls()) {
            try {
                Intent permIntent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + ctx.getPackageName())
                );
                permIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(permIntent);
            } catch (Exception ignored) {
            }
            JSObject res = new JSObject();
            res.put("started", false);
            res.put("needsPermission", true);
            call.resolve(res);
            return;
        }

        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                String currentUrl = apkUrl.trim();
                for (int i = 0; i < 6; i++) {
                    URL url = new URL(currentUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(30000);
                    int code = conn.getResponseCode();
                    if (code == HttpURLConnection.HTTP_MOVED_TEMP
                        || code == HttpURLConnection.HTTP_MOVED_PERM
                        || code == HttpURLConnection.HTTP_SEE_OTHER
                        || code == 307
                        || code == 308) {
                        String location = conn.getHeaderField("Location");
                        conn.disconnect();
                        if (location == null) break;
                        currentUrl = location;
                    } else {
                        break;
                    }
                }

                if (conn == null || conn.getResponseCode() >= 400) {
                    call.reject("Error descargando APK desde GitHub");
                    return;
                }

                int totalLen = conn.getContentLength();
                File updateDir = new File(ctx.getCacheDir(), "updates");
                if (!updateDir.exists()) updateDir.mkdirs();

                String safeName = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
                if (!safeName.endsWith(".apk")) safeName += ".apk";
                File apkFile = new File(updateDir, safeName);

                try (InputStream in = conn.getInputStream();
                     FileOutputStream out = new FileOutputStream(apkFile)) {
                    byte[] buf = new byte[8192];
                    int read;
                    long downloaded = 0;
                    int lastPct = -1;
                    while ((read = in.read(buf)) != -1) {
                        out.write(buf, 0, read);
                        downloaded += read;
                        if (totalLen > 0) {
                            int pct = (int) Math.min(100, (downloaded * 100L) / totalLen);
                            if (pct != lastPct && (pct % 5 == 0 || pct == 100)) {
                                lastPct = pct;
                                JSObject prog = new JSObject();
                                prog.put("progress", pct);
                                notifyListeners("apkDownloadProgress", prog);
                            }
                        }
                    }
                }

                final File readyFile = apkFile;
                getActivity().runOnUiThread(() -> {
                    try {
                        Uri contentUri = FileProvider.getUriForFile(
                            ctx,
                            ctx.getPackageName() + ".fileprovider",
                            readyFile
                        );
                        Intent installIntent = new Intent(Intent.ACTION_VIEW);
                        installIntent.setDataAndType(contentUri, "application/vnd.android.package-archive");
                        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                        ctx.startActivity(installIntent);
                        JSObject res = new JSObject();
                        res.put("started", true);
                        res.put("needsPermission", false);
                        call.resolve(res);
                    } catch (Exception ex) {
                        call.reject("No se pudo abrir el instalador Android: " + ex.getMessage());
                    }
                });
            } catch (Exception e) {
                call.reject("Fallo descargando APK: " + e.getMessage());
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }
}
