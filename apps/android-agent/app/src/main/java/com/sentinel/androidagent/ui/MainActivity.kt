package com.sentinel.androidagent.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import com.sentinel.androidagent.security.SecurityPostureAuditor

class MainActivity : ComponentActivity() {
    private val securityAuditor = SecurityPostureAuditor()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val rootCheck = securityAuditor.checkRootStatus(this)
        val isEncrypted = securityAuditor.checkEncryptionStatus(this)
        val adbEnabled = securityAuditor.checkAdbStatus(this)

        setContent {
            MaterialTheme {
                Surface {
                    MainScreen(
                        deviceStatus = "ACTIVE",
                        isRooted = rootCheck.isRooted,
                        isEncrypted = isEncrypted,
                        adbEnabled = adbEnabled,
                        organizationName = "Sentinel Enterprise Lab",
                        isRemoteSupportActive = false,
                        onPairClick = { /* Scan QR */ },
                        onTerminateSupportClick = { /* Stop support */ }
                    )
                }
            }
        }
    }
}
