package com.sentinel.androidagent.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class RemoteSupportForegroundService : Service() {

    private var mediaProjection: MediaProjection? = null
    private var isStreaming = false

    companion object {
        const val CHANNEL_ID = "RemoteSupportChannel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START_SUPPORT = "ACTION_START_SUPPORT"
        const val ACTION_STOP_SUPPORT = "ACTION_STOP_SUPPORT"
        const val EXTRA_RESULT_CODE = "EXTRA_RESULT_CODE"
        const val EXTRA_RESULT_DATA = "EXTRA_RESULT_DATA"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_SUPPORT -> {
                val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0)
                val resultData: Intent? = intent.getParcelableExtra(EXTRA_RESULT_DATA)
                if (resultCode != 0 && resultData != null) {
                    startSupportSession(resultCode, resultData)
                }
            }
            ACTION_STOP_SUPPORT -> stopSupportSession()
        }
        return START_NOT_STICKY
    }

    private fun startSupportSession(resultCode: Int, resultData: Intent) {
        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)

        val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        mediaProjection = projectionManager.getMediaProjection(resultCode, resultData)

        isStreaming = true
        // Initialize WebSocket stream with compressed screen frames and visual watermark
        startStreaming()
    }

    private fun startStreaming() {
        // Implementation for starting frame capture and WebSocket streaming
        // Appends visual watermark to frames before compression
    }

    private fun stopSupportSession() {
        isStreaming = false
        mediaProjection?.stop()
        mediaProjection = null
        
        // Terminate WebSocket session
        stopForeground(true)
        stopSelf()
    }

    private fun createNotification(): Notification {
        val stopIntent = Intent(this, RemoteSupportForegroundService::class.java).apply {
            action = ACTION_STOP_SUPPORT
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SentinelLab Remote Support Active")
            .setContentText("Visual Watermark Enabled")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .addAction(android.R.drawable.ic_delete, "Kill Switch (Stop Support)", stopPendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Remote Support Service",
                NotificationManager.IMPORTANCE_HIGH
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}
