package io.github.zhuanght1201.buaatimetablesign;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.webkit.CookieManager;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

public class SigninMonitorService extends Service {
    private static final String CHANNEL_MONITOR = "buaa_monitor";
    private static final int FOREGROUND_ID = 3201;
    private static final long POLL_INTERVAL_MS = 60_000L;

    private HandlerThread workerThread;
    private Handler worker;
    private SharedPreferences prefs;
    private final Runnable pollTask = new Runnable() {
        @Override
        public void run() {
            pollSignins();
            if (worker != null) worker.postDelayed(this, POLL_INTERVAL_MS);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences(CampusBridgePlugin.MONITOR_PREFS, MODE_PRIVATE);
        createChannel();
        workerThread = new HandlerThread("BUAA-Signin-Monitor");
        workerThread.start();
        worker = new Handler(workerThread.getLooper());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!prefs.getBoolean(CampusBridgePlugin.KEY_MONITOR_ENABLED, false)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        Notification notification = buildMonitorNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                FOREGROUND_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            );
        } else {
            startForeground(FOREGROUND_ID, notification);
        }
        worker.removeCallbacks(pollTask);
        worker.post(pollTask);
        return START_STICKY;
    }

    private void pollSignins() {
        String userId = prefs.getString(CampusBridgePlugin.KEY_MONITOR_USER_ID, "");
        String sessionId = prefs.getString(CampusBridgePlugin.KEY_MONITOR_SESSION_ID, "");
        String scheduleUrl = prefs.getString(CampusBridgePlugin.KEY_MONITOR_SCHEDULE_URL, "");
        if (isBlank(userId) || isBlank(sessionId) || isBlank(scheduleUrl)) return;

        String date = new SimpleDateFormat("yyyyMMdd", Locale.US).format(new Date());
        JSONObject root = fetchSchedule(scheduleUrl, userId, sessionId, date);
        if (root == null) return;
        if (!isSuccess(root) && refreshSession()) {
            userId = prefs.getString(CampusBridgePlugin.KEY_MONITOR_USER_ID, userId);
            sessionId = prefs.getString(CampusBridgePlugin.KEY_MONITOR_SESSION_ID, sessionId);
            root = fetchSchedule(scheduleUrl, userId, sessionId, date);
        }
        if (root == null || !isSuccess(root)) return;

        JSONArray classes = root.optJSONArray("result");
        if (classes == null) return;
        for (int index = 0; index < classes.length(); index++) {
            JSONObject course = classes.optJSONObject(index);
            if (course == null) continue;
            if (!"0".equals(String.valueOf(course.opt("signStatus")))) continue;
            String courseId = String.valueOf(course.opt("id"));
            if (!isBlank(courseId) && !"null".equals(courseId)) {
                signCourse(courseId, sessionId, true);
            }
        }
    }

    private JSONObject fetchSchedule(String endpoint, String userId, String sessionId, String date) {
        String url = withQuery(
            endpoint,
            "id",
            userId,
            "dateStr",
            date
        );
        return requestJson(url, "GET", null, sessionId, null);
    }

    private boolean signCourse(String courseId, String sessionId, boolean allowRetry) {
        String timestampUrl = prefs.getString(CampusBridgePlugin.KEY_MONITOR_TIMESTAMP_URL, "");
        String signUrl = prefs.getString(CampusBridgePlugin.KEY_MONITOR_SIGN_URL, "");
        String userId = prefs.getString(CampusBridgePlugin.KEY_MONITOR_USER_ID, "");
        if (isBlank(timestampUrl) || isBlank(signUrl) || isBlank(userId)) return false;

        JSONObject timestampPayload = requestJson(
            timestampUrl,
            "GET",
            null,
            sessionId,
            null
        );
        String timestamp = timestampPayload == null ? "" : timestampPayload.optString("timestamp");
        if (isBlank(timestamp)) return false;

        String actionUrl = withQuery(
            signUrl,
            "courseSchedId",
            courseId,
            "timestamp",
            timestamp
        );
        String body = "id=" + Uri.encode(userId);
        JSONObject payload = requestJson(
            actionUrl,
            "POST",
            body,
            sessionId,
            "application/x-www-form-urlencoded"
        );
        if (payload == null) return false;

        JSONObject result = payload.optJSONObject("result");
        boolean signed = isSuccess(payload) &&
            result != null &&
            "1".equals(String.valueOf(result.opt("stuSignStatus")));
        String message = payload.optString("ERRMSG");
        if (!signed && message.contains("登录") && allowRetry && refreshSession()) {
            return signCourse(
                courseId,
                prefs.getString(CampusBridgePlugin.KEY_MONITOR_SESSION_ID, sessionId),
                false
            );
        }
        return signed || message.contains("已签到") || message.contains("已经签到");
    }

    private boolean refreshSession() {
        String loginUrl = prefs.getString(CampusBridgePlugin.KEY_MONITOR_LOGIN_URL, "");
        String loginName = prefs.getString(CampusBridgePlugin.KEY_MONITOR_LOGIN_NAME, "");
        if (isBlank(loginUrl) || isBlank(loginName)) return false;

        String url = withQuery(
            loginUrl,
            "password",
            "",
            "phone",
            loginName,
            "userLevel",
            "1",
            "verificationType",
            "2",
            "verificationUrl",
            ""
        );
        JSONObject payload = requestJson(url, "GET", null, null, null);
        if (payload == null || !isSuccess(payload)) return false;
        JSONObject result = payload.optJSONObject("result");
        String userId = result == null ? "" : String.valueOf(result.opt("id"));
        String sessionId = result == null ? "" : String.valueOf(result.opt("sessionId"));
        if (isBlank(userId) || "null".equals(userId) || isBlank(sessionId) || "null".equals(sessionId)) {
            return false;
        }
        prefs
            .edit()
            .putString(CampusBridgePlugin.KEY_MONITOR_USER_ID, userId)
            .putString(CampusBridgePlugin.KEY_MONITOR_SESSION_ID, sessionId)
            .apply();
        return true;
    }

    private JSONObject requestJson(
        String rawUrl,
        String method,
        String body,
        String sessionId,
        String contentType
    ) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(rawUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod(method);
            connection.setConnectTimeout(10_000);
            connection.setReadTimeout(10_000);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("Accept", "application/json, text/javascript, */*; q=0.01");
            connection.setRequestProperty("Accept-Language", "zh-CN,zh;q=0.9");
            connection.setRequestProperty("X-Requested-With", "XMLHttpRequest");
            connection.setRequestProperty(
                "User-Agent",
                "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 " +
                    "(KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36 BUAA-Timetable-Signin/0.2.0"
            );
            if (!isBlank(sessionId)) {
                connection.setRequestProperty("sessionId", sessionId);
            }
            String cookie = CookieManager.getInstance().getCookie(rawUrl);
            if (!isBlank(cookie)) {
                connection.setRequestProperty("Cookie", cookie);
            }
            if (body != null) {
                byte[] payload = body.getBytes(StandardCharsets.UTF_8);
                connection.setDoOutput(true);
                connection.setFixedLengthStreamingMode(payload.length);
                if (!isBlank(contentType)) {
                    connection.setRequestProperty("Content-Type", contentType);
                }
                connection.getOutputStream().write(payload);
            }

            int status = connection.getResponseCode();
            captureCookies(rawUrl, connection);
            if (status < 200 || status >= 300) return null;
            InputStream stream = connection.getInputStream();
            String text = readAll(stream).replaceFirst("^\\)\\]\\}',?\\s*", "");
            return new JSONObject(text);
        } catch (Exception ignored) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void captureCookies(String url, HttpURLConnection connection) {
        CookieManager manager = CookieManager.getInstance();
        for (Map.Entry<String, List<String>> entry : connection.getHeaderFields().entrySet()) {
            if (entry.getKey() == null || !"set-cookie".equalsIgnoreCase(entry.getKey())) continue;
            for (String cookie : entry.getValue()) {
                manager.setCookie(url, cookie);
            }
        }
        manager.flush();
    }

    private boolean isSuccess(JSONObject payload) {
        String status = String.valueOf(payload.opt("STATUS")).toLowerCase(Locale.ROOT);
        return status.equals("0") || status.equals("200") || status.equals("success");
    }

    private String withQuery(String endpoint, String... values) {
        Uri.Builder builder = Uri.parse(endpoint).buildUpon();
        for (int index = 0; index + 1 < values.length; index += 2) {
            builder.appendQueryParameter(values[index], values[index + 1]);
        }
        return builder.build().toString();
    }

    private Notification buildMonitorNotification() {
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            1001,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        return new NotificationCompat.Builder(this, CHANNEL_MONITOR)
            .setSmallIcon(android.R.drawable.ic_menu_recent_history)
            .setContentTitle(
                prefs.getString(
                    CampusBridgePlugin.KEY_OPEN_LABEL,
                    "BUAA Timetable & Sign-in"
                )
            )
            .setContentText(
                prefs.getString(
                    CampusBridgePlugin.KEY_MONITOR_TEXT,
                    "Background auto sign-in is running"
                )
            )
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(
            new NotificationChannel(CHANNEL_MONITOR, "Background sign-in", NotificationManager.IMPORTANCE_LOW)
        );
    }

    private String readAll(InputStream input) throws Exception {
        try (InputStream stream = input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = stream.read(buffer)) >= 0) output.write(buffer, 0, read);
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    @Override
    public void onDestroy() {
        if (worker != null) worker.removeCallbacksAndMessages(null);
        if (workerThread != null) workerThread.quitSafely();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
