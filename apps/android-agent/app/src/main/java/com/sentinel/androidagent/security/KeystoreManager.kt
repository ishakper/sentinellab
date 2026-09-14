package com.sentinel.androidagent.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import android.util.Base64

class KeystoreManager {
    private val keyAlias = "sentinel_device_key"
    private val provider = "AndroidKeyStore"

    fun getOrCreateKeyPair(): KeyPair {
        val keyStore = KeyStore.getInstance(provider).apply { load(null) }
        if (keyStore.containsAlias(keyAlias)) {
            val privateKey = keyStore.getKey(keyAlias, null) as java.security.PrivateKey
            val publicKey = keyStore.getCertificate(keyAlias).publicKey
            return KeyPair(publicKey, privateKey)
        }

        val keyPairGenerator = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_EC, provider
        )
        
        val parameterSpec = KeyGenParameterSpec.Builder(
            keyAlias,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
        ).run {
            setDigests(KeyProperties.DIGEST_SHA256)
            setUserAuthenticationRequired(false)
            build()
        }

        keyPairGenerator.initialize(parameterSpec)
        return keyPairGenerator.generateKeyPair()
    }

    fun getPublicKeyPem(): String {
        val keyPair = getOrCreateKeyPair()
        val publicKeyDer = keyPair.public.encoded
        val base64Key = Base64.encodeToString(publicKeyDer, Base64.NO_WRAP)
        return "-----BEGIN PUBLIC KEY-----\n$base64Key\n-----END PUBLIC KEY-----"
    }

    fun signPayload(payload: String): String {
        val keyPair = getOrCreateKeyPair()
        val signature = Signature.getInstance("SHA256withECDSA").apply {
            initSign(keyPair.private)
            update(payload.toByteArray(Charsets.UTF_8))
        }
        val signedBytes = signature.sign()
        return Base64.encodeToString(signedBytes, Base64.NO_WRAP)
    }
}
