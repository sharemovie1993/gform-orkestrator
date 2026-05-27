export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Ambil token dari environment variable di Vercel
  const EXPO_ACCESS_TOKEN = process.env.EXPO_ACCESS_TOKEN;
  if (!EXPO_ACCESS_TOKEN) {
    return new Response('Konfigurasi token API Expo (EXPO_ACCESS_TOKEN) tidak ditemukan di Vercel.', { status: 500 });
  }

  // EAS Project ID dari app.json
  const projectId = '5e1ad67a-a833-4b34-9f25-124dd382a1c9';

  const query = `
    query GetLatestApkBuild {
      app {
        byId(appId: "${projectId}") {
          builds(
            filter: { platform: ANDROID, status: FINISHED }
            offset: 0
            limit: 1
          ) {
            id
            artifacts { buildUrl }
            createdAt
          }
        }
      }
    }
  `;

  try {
    // 1. Ambil URL build APK terakhir yang sukses dari Expo GraphQL API
    const expoResponse = await fetch('https://api.expo.dev/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EXPO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    if (!expoResponse.ok) {
      return new Response(`Gagal mengambil data dari Expo API (HTTP ${expoResponse.status}).`, { status: 502 });
    }

    const result = await expoResponse.json();
    const build = result?.data?.app?.byId?.builds?.[0];

    if (!build || !build.artifacts?.buildUrl) {
      return new Response('Tidak ada file APK hasil build yang ditemukan di Expo. Silakan lakukan EAS Build terlebih dahulu.', { status: 404 });
    }

    const downloadUrl = build.artifacts.buildUrl;
    console.log(`[Download APK] ✓ Edge Streaming dari: ${downloadUrl}`);

    // 2. Fetch file APK dari CDN Expo menggunakan Fetch API
    const apkRes = await fetch(downloadUrl);
    if (!apkRes.ok) {
      const errBody = await apkRes.text().catch(() => '');
      return new Response(`Gagal mengunduh berkas APK dari CDN Expo (HTTP ${apkRes.status} ${apkRes.statusText}). Detail: ${errBody.substring(0, 200)}`, { status: 502 });
    }

    // 3. Set header agar didownload dengan nama Orkestrator Ujian.apk
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.android.package-archive');
    headers.set('Content-Disposition', 'attachment; filename="Orkestrator Ujian.apk"');

    const contentLength = apkRes.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // 4. Kembalikan Stream data secara real-time (sangat cepat & hemat memori)
    return new Response(apkRes.body, {
      status: 200,
      headers
    });
  } catch (err) {
    console.error('[Download APK Error]', err.message);
    return new Response('Terjadi kesalahan koneksi saat mengambil tautan unduhan dari Expo: ' + err.message, { status: 500 });
  }
}
