package __PACKAGE__

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * DNS-only VPN.
 * Only two fake addresses (IPv4 + IPv6) are routed into the tunnel and announced
 * as the system DNS servers. Every DNS query that arrives there is forwarded to the
 * user's chosen DNS servers (IPv4 and/or IPv6) through a protected socket and the
 * answer is written back. All other traffic (game traffic) bypasses the tunnel,
 * so it is not slowed down.
 */
class DnsVpnService : VpnService() {

    companion object {
        const val ACTION_STOP = "__PACKAGE__.STOP"
        const val EXTRA_DNS = "dns"
        const val FAKE_V4 = "10.111.222.1"
        const val CLIENT_V4 = "10.111.222.2"
        const val FAKE_V6 = "fd00:111:222::1"
        const val CLIENT_V6 = "fd00:111:222::2"

        @Volatile
        var running = false
    }

    private var tun: ParcelFileDescriptor? = null
    private var worker: Thread? = null

    @Volatile
    private var stopped = false
    private var upstreams: List<InetAddress> = emptyList()
    private val pool: ExecutorService = Executors.newFixedThreadPool(16)

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopVpn()
            stopSelf()
            return START_NOT_STICKY
        }
        val list = intent?.getStringArrayListExtra(EXTRA_DNS) ?: arrayListOf()
        upstreams = list.mapNotNull { runCatching { InetAddress.getByName(it) }.getOrNull() }
        if (upstreams.isEmpty()) {
            stopSelf()
            return START_NOT_STICKY
        }
        startVpn()
        return START_NOT_STICKY
    }

    private fun startVpn() {
        stopVpn()
        val builder = Builder()
            .setSession("Game DNS")
            .setMtu(1500)
            .addAddress(CLIENT_V4, 32)
            .addDnsServer(FAKE_V4)
            .addRoute(FAKE_V4, 32)
        try {
            builder.addAddress(CLIENT_V6, 128)
                .addDnsServer(FAKE_V6)
                .addRoute(FAKE_V6, 128)
        } catch (_: Exception) {
        }
        val fd = try {
            builder.establish()
        } catch (_: Exception) {
            null
        }
        if (fd == null) {
            stopSelf()
            return
        }
        tun = fd
        stopped = false
        running = true
        worker = Thread({ loop(fd) }, "game-dns-vpn").also { it.start() }
    }

    private fun loop(fd: ParcelFileDescriptor) {
        val input = FileInputStream(fd.fileDescriptor)
        val output = FileOutputStream(fd.fileDescriptor)
        val buf = ByteArray(32767)
        try {
            while (!stopped) {
                val n = input.read(buf)
                if (n < 0) break
                if (n == 0) continue
                val pkt = buf.copyOf(n)
                pool.execute {
                    try {
                        handle(pkt, output)
                    } catch (_: Exception) {
                    }
                }
            }
        } catch (_: Exception) {
        }
        running = false
    }

    private fun handle(p: ByteArray, out: FileOutputStream) {
        if (p.isEmpty()) return
        val ver = (p[0].toInt() shr 4) and 0xF
        val ipLen: Int
        val srcOff: Int
        val addrLen: Int
        if (ver == 4) {
            ipLen = (p[0].toInt() and 0xF) * 4
            if (p.size < ipLen + 8 || (p[9].toInt() and 0xFF) != 17) return
            srcOff = 12
            addrLen = 4
        } else if (ver == 6) {
            ipLen = 40
            if (p.size < 48 || (p[6].toInt() and 0xFF) != 17) return
            srcOff = 8
            addrLen = 16
        } else {
            return
        }
        val dstOff = srcOff + addrLen
        val srcPort = u16(p, ipLen)
        val dstPort = u16(p, ipLen + 2)
        if (dstPort != 53) return
        val udpLen = u16(p, ipLen + 4)
        val end = minOf(p.size, ipLen + udpLen)
        if (end <= ipLen + 8) return
        val query = p.copyOfRange(ipLen + 8, end)
        val answer = forward(query) ?: return
        val src = p.copyOfRange(srcOff, srcOff + addrLen)
        val dst = p.copyOfRange(dstOff, dstOff + addrLen)
        val resp = if (ver == 4) {
            build4(dst, src, dstPort, srcPort, answer)
        } else {
            build6(dst, src, dstPort, srcPort, answer)
        }
        synchronized(out) { out.write(resp) }
    }

    /** Sends the query to each upstream DNS in order until one answers. */
    private fun forward(q: ByteArray): ByteArray? {
        for (addr in upstreams) {
            try {
                DatagramSocket().use { s ->
                    protect(s)
                    s.soTimeout = 2500
                    s.send(DatagramPacket(q, q.size, InetSocketAddress(addr, 53)))
                    val buf = ByteArray(4096)
                    val rp = DatagramPacket(buf, buf.size)
                    s.receive(rp)
                    return buf.copyOf(rp.length)
                }
            } catch (_: Exception) {
            }
        }
        return null
    }

    private fun build4(src: ByteArray, dst: ByteArray, sp: Int, dp: Int, data: ByteArray): ByteArray {
        val total = 20 + 8 + data.size
        val r = ByteArray(total)
        r[0] = 0x45
        putU16(r, 2, total)
        r[8] = 64
        r[9] = 17
        System.arraycopy(src, 0, r, 12, 4)
        System.arraycopy(dst, 0, r, 16, 4)
        putU16(r, 10, checksum(r, 0, 20))
        putU16(r, 20, sp)
        putU16(r, 22, dp)
        putU16(r, 24, 8 + data.size)
        System.arraycopy(data, 0, r, 28, data.size)
        return r
    }

    private fun build6(src: ByteArray, dst: ByteArray, sp: Int, dp: Int, data: ByteArray): ByteArray {
        val udpLen = 8 + data.size
        val r = ByteArray(40 + udpLen)
        r[0] = 0x60
        putU16(r, 4, udpLen)
        r[6] = 17
        r[7] = 64
        System.arraycopy(src, 0, r, 8, 16)
        System.arraycopy(dst, 0, r, 24, 16)
        putU16(r, 40, sp)
        putU16(r, 42, dp)
        putU16(r, 44, udpLen)
        System.arraycopy(data, 0, r, 48, data.size)
        // UDP checksum is mandatory over IPv6: pseudo header + UDP segment
        val pseudo = ByteArray(40 + udpLen)
        System.arraycopy(src, 0, pseudo, 0, 16)
        System.arraycopy(dst, 0, pseudo, 16, 16)
        putU16(pseudo, 34, udpLen)
        pseudo[39] = 17
        System.arraycopy(r, 40, pseudo, 40, udpLen)
        var ck = checksum(pseudo, 0, pseudo.size)
        if (ck == 0) ck = 0xFFFF
        putU16(r, 46, ck)
        return r
    }

    private fun u16(b: ByteArray, o: Int): Int =
        ((b[o].toInt() and 0xFF) shl 8) or (b[o + 1].toInt() and 0xFF)

    private fun putU16(b: ByteArray, o: Int, v: Int) {
        b[o] = (v shr 8).toByte()
        b[o + 1] = v.toByte()
    }

    private fun checksum(b: ByteArray, off: Int, len: Int): Int {
        var sum = 0L
        var i = off
        val e = off + len
        while (i + 1 < e) {
            sum += ((b[i].toInt() and 0xFF) shl 8) or (b[i + 1].toInt() and 0xFF)
            i += 2
        }
        if (i < e) sum += (b[i].toInt() and 0xFF) shl 8
        while ((sum shr 16) != 0L) sum = (sum and 0xFFFF) + (sum shr 16)
        return (sum.inv() and 0xFFFF).toInt()
    }

    private fun stopVpn() {
        stopped = true
        running = false
        try {
            tun?.close()
        } catch (_: Exception) {
        }
        tun = null
        worker?.interrupt()
        worker = null
    }

    override fun onRevoke() {
        stopVpn()
        stopSelf()
    }

    override fun onDestroy() {
        stopVpn()
        pool.shutdownNow()
        super.onDestroy()
    }
}
