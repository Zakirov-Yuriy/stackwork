package com.stackworkjobs.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createNotificationChannels()
    }

    /**
     * Канал «Отклики» для push из Firebase (channel_id = applications, его же шлёт сервер).
     * Без канала Android 8+ показал бы уведомления в безымянном канале «Разное».
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java) ?: return
        val channel = NotificationChannel("applications", "Отклики", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Ответы работодателей на отклики и новые отклики на ваши вакансии"
            enableVibration(true)
        }
        manager.createNotificationChannel(channel)
    }
}
