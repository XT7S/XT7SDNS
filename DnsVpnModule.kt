package __PACKAGE__

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.io.ByteArrayOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress

class DnsVpnModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx), ActivityEventListener {

    private var pending: Promise? = null
    private var pendingDns: ArrayList<String>? = null

    init {
        ctx.addActivityEventListener(this)
    }

    override fun getName() = "DnsVpn"

    @ReactMethod
    fun start(dns: ReadableArray, promise: Promise) {
        val list = ArrayList<String>()
        for (i in 0 until dns.size()) {
            dns.getString(i)?.trim()?.let { if (it.isNotEmpty()) list.add(it) }
        }
        if (list.isEmpty()) {
            promise.reject("NO_DNS", "No DNS address given")
            return
        }
        val act = ctx.currentActivity
        if (act == null) {
            promise.reject("NO_ACTIVITY", "No foreground activity")
            return
        }
        val prep = VpnService.prepare(act)
        if (prep == null) {
            launch(list)
            promise.resolve(true)
        } else {
            pending = promise
            pendingDns = list
            act.startActivityForResult(prep, REQ_VPN)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        val i = Intent(ctx, DnsVpnService::class.java).setAction(DnsVpnService.ACTION_STOP)
        ctx.startService(i)
        promise.resolve(true)
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        promise.resolve(DnsVpnService.running)
    }

    /** Measures one DNS round trip (ms) to [host]:53, or -1 on timeout. */
    @ReactMethod
    fun ping(host: String, promise: Promise) {
        Thread {
            var ms = -1.0
            try {
                val q = buildQuery()
                val addr = InetAddress.getByName(host)
                DatagramSocket().use { s ->
                    s.soTimeout = 2000
                    val t0 = System.nanoTime()
                    s.send(DatagramPacket(q, q.size, InetSocketAddress(addr, 53)))
                    val b = ByteArray(1024)
                    val rp = DatagramPacket(b, b.size)
                    s.receive(rp)
                    if (rp.length >= 12 && b[0] == q[0] && b[1] == q[1]) {
                        ms = (System.nanoTime() - t0) / 1_000_000.0
                    }
                }
            } catch (_: Exception) {
            }
            promise.resolve(ms)
        }.start()
    }

    @ReactMethod
    fun loadPrefs(promise: Promise) {
        promise.resolve(ctx.getSharedPreferences("gamedns", 0).getString("cfg", null))
    }

    @ReactMethod
    fun savePrefs(json: String) {
        ctx.getSharedPreferences("gamedns", 0).edit().putString("cfg", json).apply()
    }

    private fun launch(list: ArrayList<String>) {
        val i = Intent(ctx, DnsVpnService::class.java)
            .putStringArrayListExtra(DnsVpnService.EXTRA_DNS, list)
        ctx.startService(i)
    }

    private fun buildQuery(): ByteArray {
        val bo = ByteArrayOutputStream()
        bo.write(byteArrayOf(0x4A, 0x21, 0x01, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0))
        for (label in "google.com".split(".")) {
            bo.write(label.length)
            bo.write(label.toByteArray())
        }
        bo.write(0)
        bo.write(byteArrayOf(0, 1, 0, 1))
        return bo.toByteArray()
    }

    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQ_VPN) return
        val p = pending
        val l = pendingDns
        pending = null
        pendingDns = null
        if (resultCode == Activity.RESULT_OK && l != null) {
            launch(l)
            p?.resolve(true)
        } else {
            p?.reject("DENIED", "VPN permission denied")
        }
    }

    override fun onNewIntent(intent: Intent?) {}

    companion object {
        private const val REQ_VPN = 7001
    }
}
