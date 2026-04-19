const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
  try {
    const originalUri = process.env.MONGO_URI || '';

    const buildNonSrvUri = async (srvUri) => {
      const u = new URL(srvUri);
      const username = decodeURIComponent(u.username || '');
      const password = decodeURIComponent(u.password || '');
      const host = u.hostname; // e.g. cluster0.xxxxx.mongodb.net
      const dbName = (u.pathname || '/').replace(/^\//, '') || 'leasetogether';

      const resolver = new dns.promises.Resolver();
      resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

      const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
      if (!srvRecords?.length) throw new Error('Could not resolve MongoDB SRV records');

      const hosts = srvRecords
        .map((r) => `${r.name}:${r.port || 27017}`)
        .sort()
        .join(',');

      // Atlas supplies extra options via TXT record; merge with existing query params.
      const merged = new URLSearchParams(u.searchParams);
      try {
        const txtRecords = await resolver.resolveTxt(host);
        const txt = (txtRecords || []).flat().join('&');
        if (txt) {
          const txtParams = new URLSearchParams(txt);
          for (const [k, v] of txtParams.entries()) {
            if (!merged.has(k)) merged.set(k, v);
          }
        }
      } catch {
        // ignore TXT failures; we'll use whatever was in the original URI
      }

      // Ensure TLS when connecting to Atlas.
      if (!merged.has('tls') && !merged.has('ssl')) merged.set('tls', 'true');

      const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
      const qs = merged.toString();
      return `mongodb://${auth}${hosts}/${dbName}${qs ? `?${qs}` : ''}`;
    };

    const uriToUse = originalUri.startsWith('mongodb+srv://') ? await buildNonSrvUri(originalUri) : originalUri;

    const conn = await mongoose.connect(uriToUse);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
