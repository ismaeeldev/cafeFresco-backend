const axios = require('axios');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

const vpnDetect = async (req, res, next) => {
    try {
        // Get IP address
        const userIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.ip;

        console.log("User IP:", userIp);

        // Handle local development IPs
        const isLocalhost = userIp === '::1' || userIp === '127.0.0.1' || userIp.startsWith('::ffff:127.');
        if (process.env.NODE_ENV !== 'production' || isLocalhost) {
            console.log("Local IP detected. Skipping VPN check.");
            return next();
        }

        // IPv4 and IPv6 patterns
        const ipv4Regex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

        const isValidIp = ipv4Regex.test(userIp) || ipv6Regex.test(userIp);
        if (!isValidIp) {
            return res.status(400).json({ vpnSuccess: 'true', message: "Invalid IP address" });
        }

        // Check cache first
        const cachedResult = cache.get(userIp);
        if (cachedResult) {
            if (cachedResult.isVpn) {
                return res.status(403).json({ vpnSuccess: 'true', message: "Access denied. VPN usage detected." });
            }
            return next();
        }

        // Call VPN API
        const apiKey = 'ccd07473a23b463badce4cc8216be83c';
        const apiUrl = `https://vpnapi.io/api/${userIp}?key=${apiKey}`;

        const response = await axios.get(apiUrl);
        const isVpn = response.data?.security?.vpn || response.data?.security?.proxy || response.data?.security?.tor;

        // Cache result
        cache.set(userIp, { isVpn }, 3600); // Cache for 1 hour

        if (isVpn) {
            return res.status(403).json({ vpnSuccess: 'true', message: "Access denied. VPN usage detected." });
        }

        next();
    } catch (error) {
        console.error("Error in VPN detection:", error.message);
        return res.status(500).json({ vpnSuccess: 'false', message: "VPN detection failed", error: error.message });
    }
};

module.exports = vpnDetect;