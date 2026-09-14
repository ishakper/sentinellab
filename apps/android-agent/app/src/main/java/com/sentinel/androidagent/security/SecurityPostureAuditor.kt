package com.sentinel.androidagent.security

import android.app.KeyguardManager
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import java.io.File

data class RootCheckResult(val isRooted: Boolean, val details: List<String>)
data class AppAuditInfo(val packageName: String, val appName: String, val hasRiskyPermissions: Boolean, val isDebuggable: Boolean)

class SecurityPostureAuditor {

    fun checkRootStatus(context: Context): RootCheckResult {
        val details = mutableListOf<String>()
        var isRooted = false

        // Check common su binaries
        val suPaths = listOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su"
        )
        
        for (path in suPaths) {
            if (File(path).exists()) {
                isRooted = true
                details.add("Found su binary at $path")
            }
        }

        // Check test-keys
        val tags = Build.TAGS
        if (tags != null && tags.contains("test-keys")) {
            isRooted = true
            details.add("Build.TAGS contains test-keys")
        }

        // Check root managers
        val rootPackages = listOf("com.topjohnwu.magisk", "eu.chainfire.supersu")
        val pm = context.packageManager
        for (pkg in rootPackages) {
            try {
                pm.getPackageInfo(pkg, 0)
                isRooted = true
                details.add("Found root manager: $pkg")
            } catch (e: PackageManager.NameNotFoundException) {
                // Not found
            }
        }

        return RootCheckResult(isRooted, details)
    }

    fun checkAdbStatus(context: Context): Boolean {
        return Settings.Global.getInt(context.contentResolver, Settings.Global.ADB_ENABLED, 0) != 0
    }

    fun checkEncryptionStatus(context: Context): Boolean {
        val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        return keyguardManager.isDeviceSecure
    }

    fun auditInstalledApps(context: Context): List<AppAuditInfo> {
        val pm = context.packageManager
        val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
        val riskyPermissions = listOf(
            android.Manifest.permission.READ_SMS,
            android.Manifest.permission.ACCESS_FINE_LOCATION,
            android.Manifest.permission.CAMERA
        )

        return apps.filter { (it.flags and ApplicationInfo.FLAG_SYSTEM) == 0 }
            .map { appInfo ->
                var hasRiskyPermissions = false
                try {
                    val packageInfo = pm.getPackageInfo(appInfo.packageName, PackageManager.GET_PERMISSIONS)
                    packageInfo.requestedPermissions?.forEach { perm ->
                        if (riskyPermissions.contains(perm)) {
                            hasRiskyPermissions = true
                        }
                    }
                } catch (e: Exception) {
                    // Ignore
                }
                
                val isDebuggable = (appInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
                AppAuditInfo(
                    packageName = appInfo.packageName,
                    appName = pm.getApplicationLabel(appInfo).toString(),
                    hasRiskyPermissions = hasRiskyPermissions,
                    isDebuggable = isDebuggable
                )
            }
    }
}
