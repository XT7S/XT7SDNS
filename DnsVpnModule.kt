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
import com.wireguard.android.backend.GoBackend
import com.wireguard.android.backend.Tunnel
import com.wireguard.config.Config
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress

class DnsVpnModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx), ActivityEventListener {

    private var pending: Promise? = null
    private var pendingDns: ArrayList<String>? = null
    private var pendingWg: String? = null

    // ---- WireGuard (embedded wireguard-go through com.wireguard.android:tunnel) ----
    private var wgBackend: GoBackend? = null
    @Volatile private var wgUp = false
    private val wgTunnel = object : Tunnel {
        override fun getName() = "abrino"
        override fun onStateChange(newState: Tunnel.State) {
            wgUp = newState == Tunnel.State.UP
        }
    }

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

    /** Starts a WireGuard tunnel from the text of a .conf file ([Interface] + [Peer]). */
    @ReactMethod
    fun startWireGuard(config: String, promise: Promise) {
        val cfg = config.trim()
        if (cfg.isEmpty()) {
            promise.reject("NO_CONFIG", "Empty WireGuard config")
            return
        }
        val act = ctx.currentActivity
        if (act == null) {
            promise.reject("NO_ACTIVITY", "No foreground activity")
            return
        }
        val prep = VpnService.prepare(act)
        if (prep == null) {
            runWireGuard(cfg, promise)
        } else {
            pending = promise
            pendingWg = cfg
            act.startActivityForResult(prep, REQ_VPN)
        }
    }

    private fun runWireGuard(cfg: String, promise: Promise) {
        Thread {
            try {
                stopDnsService()
                val parsed = Config.parse(ByteArrayInputStream(cfg.toByteArray(Charsets.UTF_8)))
                val be = wgBackend ?: GoBackend(ctx.applicationContext).also { wgBackend = it }
                be.setState(wgTunnel, Tunnel.State.UP, parsed)
                wgUp = true
                promise.resolve(true)
            } catch (ex: Exception) {
                wgUp = false
                promise.reject("WG_FAIL", ex.message ?: "WireGuard failed")
            }
        }.start()
    }

    private fun stopDnsService() {
        ctx.startService(Intent(ctx, DnsVpnService::class.java).setAction(DnsVpnService.ACTION_STOP))
    }

    @ReactMethod
    fun stop(promise: Promise) {
        stopDnsService()
        if (wgUp) {
            Thread {
                try {
                    wgBackend?.setState(wgTunnel, Tunnel.State.DOWN, null)
                } catch (ex: Exception) {
                }
                wgUp = false
                promise.resolve(true)
            }.start()
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        promise.resolve(DnsVpnService.running || wgUp)
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
            } catch (ex: Exception) {
            }
            promise.resolve(ms)
        }.start()
    }

    /** DNS lookup time (ms) of [domain] asked from [host]:53. -1 on timeout, error or empty answer. */
    @ReactMethod
    fun pingDomain(host: String, domain: String, promise: Promise) {
        Thread {
            var ms = -1.0
            try {
                val q = buildQuery(domain)
                val addr = InetAddress.getByName(host)
                DatagramSocket().use { s ->
                    s.soTimeout = 2000
                    val t0 = System.nanoTime()
                    s.send(DatagramPacket(q, q.size, InetSocketAddress(addr, 53)))
                    val b = ByteArray(1024)
                    val rp = DatagramPacket(b, b.size)
                    s.receive(rp)
                    if (rp.length >= 12 && b[0] == q[0] && b[1] == q[1]) {
                        val rcode = b[3].toInt() and 0x0F
                        val answers = ((b[6].toInt() and 0xFF) shl 8) or (b[7].toInt() and 0xFF)
                        if (rcode == 0 && answers > 0) {
                            ms = (System.nanoTime() - t0) / 1_000_000.0
                        }
                    }
                }
            } catch (ex: Exception) {
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

    private fun buildQuery(domain: String = "google.com"): ByteArray {
        val bo = ByteArrayOutputStream()
        bo.write(byteArrayOf(0x4A, 0x21, 0x01, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0))
        for (label in domain.split(".")) {
            bo.write(label.length)
            bo.write(label.toByteArray())
        }
        bo.write(0)
        bo.write(byteArrayOf(0, 1, 0, 1))
        return bo.toByteArray()
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQ_VPN) return
        val p = pending
        val l = pendingDns
        val w = pendingWg
        pending = null
        pendingDns = null
        pendingWg = null
        if (resultCode == Activity.RESULT_OK && l != null) {
            launch(l)
            p?.resolve(true)
        } else if (resultCode == Activity.RESULT_OK && w != null && p != null) {
            runWireGuard(w, p)
        } else {
            p?.reject("DENIED", "VPN permission denied")
        }
    }

    override fun onNewIntent(intent: Intent) {}

    companion object {
        private const val REQ_VPN = 7001
    }
}
