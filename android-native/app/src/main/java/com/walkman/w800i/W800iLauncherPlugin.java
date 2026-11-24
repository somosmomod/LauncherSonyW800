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
import java.net.URI;
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
    private final ExecutorService executor = Executors.newCachedThreadPool();

    private static class AppEntry {
        String name;
        String packageName;
        String iconDataUrl;
    }

    private void emitDownloadProgress(int pct) {
        JSObject prog = new JSObject();
        prog.put("progress", Math.max(0, Math.min(100, pct)));
        notifyListeners("apkDownloadProgress", prog);
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
    public void openExternalUrl(PluginCall call) {
        String targetUrl = call.getString("url");
        if (targetUrl == null || targetUrl.trim().isEmpty()) {
            call.reject("URL requerida");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl.trim()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject res = new JSObject();
            res.put("opened", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("No se pudo abrir la URL: " + e.getMessage());
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

        emitDownloadProgress(1);

        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                String currentUrl = apkUrl.trim();
                int finalCode = -1;
                for (int i = 0; i < 8; i++) {
                    URL url;
                    try {
                        url = URI.create(currentUrl).toURL();
                    } catch (IllegalArgumentException badUri) {
                        url = new URL(currentUrl);
                    }
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setConnectTimeout(25000);
                    conn.setReadTimeout(60000);
                    conn.setRequestProperty("User-Agent", "W800iWalkmanLauncher/2.5 (Android)");
                    conn.setRequestProperty("Accept", "application/octet-stream, */*");
                    conn.setRequestProperty("Accept-Encoding", "identity");

                    finalCode = conn.getResponseCode();
                    if (finalCode == HttpURLConnection.HTTP_MOVED_TEMP
                        || finalCode == HttpURLConnection.HTTP_MOVED_PERM
                        || finalCode == HttpURLConnection.HTTP_SEE_OTHER
                        || finalCode == 307
                        || finalCode == 308) {
                        String location = conn.getHeaderField("Location");
                        conn.disconnect();
                        conn = null;
                        if (location == null || location.trim().isEmpty()) break;
                        currentUrl = new URL(url, location).toString();
                    } else {
                        break;
                    }
                }

                if (conn == null || finalCode < 200 || finalCode >= 400) {
                    call.reject("Error descargando APK desde GitHub (HTTP " + finalCode + ")");
                    return;
                }

                emitDownloadProgress(3);

                long totalLen = conn.getContentLengthLong();
                File updateDir = new File(ctx.getCacheDir(), "updates");
                if (!updateDir.exists()) updateDir.mkdirs();

                String baseName = (fileName != null && !fileName.trim().isEmpty())
                    ? fileName
                    : "w800i-walkman-launcher.apk";
                String safeName = baseName.replaceAll("[^a-zA-Z0-9._-]", "_");
                if (!safeName.endsWith(".apk")) safeName += ".apk";
                File apkFile = new File(updateDir, safeName);

                try (InputStream in = conn.getInputStream();
                     FileOutputStream out = new FileOutputStream(apkFile)) {
                    byte[] buf = new byte[16384];
                    int read;
                    long downloaded = 0;
                    int lastPct = 3;
                    long lastEmitMs = System.currentTimeMillis();
                    long estimatedTotal = totalLen > 0 ? totalLen : (7L * 1024L * 1024L);

                    while ((read = in.read(buf)) != -1) {
                        out.write(buf, 0, read);
                        downloaded += read;
                        long nowMs = System.currentTimeMillis();
                        int rawPct = (int) ((downloaded * 100L) / Math.max(1L, estimatedTotal));
                        int pct = totalLen > 0
                            ? Math.max(3, Math.min(99, rawPct))
                            : Math.max(3, Math.min(95, rawPct));
                        if (pct >= lastPct + 2 || nowMs - lastEmitMs >= 350) {
                            if (pct > lastPct) {
                                lastPct = pct;
                            }
                            lastEmitMs = nowMs;
                            emitDownloadProgress(lastPct);
                        }
                    }
                }

                emitDownloadProgress(100);

                final File readyFile = apkFile;
                if (getActivity() == null) {
                    call.reject("Actividad no disponible para instalar APK.");
                    return;
                }
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
