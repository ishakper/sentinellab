package com.sentinel.androidagent.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun MainScreen(
    deviceStatus: String,
    isRooted: Boolean,
    isEncrypted: Boolean,
    adbEnabled: Boolean,
    organizationName: String,
    isRemoteSupportActive: Boolean,
    onPairClick: () -> Unit,
    onTerminateSupportClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Device Status Header
        Text(
            text = "Status: $deviceStatus",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 24.dp)
        )

        // Organization Identity Badge
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = "Managed by", style = MaterialTheme.typography.labelMedium)
                Text(text = organizationName, style = MaterialTheme.typography.titleLarge)
            }
        }

        // Security Posture Cards
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = "Security Posture", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(bottom = 8.dp))
                
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Root Status:")
                    Text(text = if (isRooted) "RISK" else "SECURE", color = if (isRooted) Color.Red else Color.Green)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Encryption:")
                    Text(text = if (isEncrypted) "ON" else "OFF")
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("ADB:")
                    Text(text = if (adbEnabled) "ENABLED" else "DISABLED", color = if (adbEnabled) Color.Red else Color.Green)
                }
            }
        }

        // QR Scanner / Pair Button
        Button(
            onClick = onPairClick,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
        ) {
            Text("Scan QR to Pair")
        }

        Spacer(modifier = Modifier.weight(1f))

        // Active Remote Support Banner
        if (isRemoteSupportActive) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Remote Support is Active",
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    Button(
                        onClick = onTerminateSupportClick,
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                    ) {
                        Text("TERMINATE SUPPORT")
                    }
                }
            }
        }
    }
}
