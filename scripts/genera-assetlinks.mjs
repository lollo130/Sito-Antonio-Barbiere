// Genera public/.well-known/assetlinks.json, il file che collega l'app
// Android al sito. Senza, la TWA si apre ma mostra la barra degli indirizzi
// di Chrome in cima: sembra un browser, non un'app.
//
// Uso:
//   node scripts/genera-assetlinks.mjs <impronta SHA-256> [nome pacchetto]
//
// L'impronta la ottieni dalla chiave di firma:
//   keytool -list -v -keystore android/firma.keystore -alias antonio
// e copi la riga "SHA256:" (i due punti tra le coppie di cifre servono).

import { mkdirSync, writeFileSync } from 'node:fs';

const impronta = process.argv[2];
const pacchetto = process.argv[3] ?? 'it.solarino.barbiereantonio';

if (!impronta || !/^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/.test(impronta)) {
  console.error('Serve l\'impronta SHA-256 della chiave, nel formato AA:BB:CC:... (32 coppie).');
  console.error('Esempio: node scripts/genera-assetlinks.mjs 14:6D:E9:83:...:C7 it.solarino.barbiereantonio');
  process.exit(1);
}

const contenuto = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: pacchetto,
      sha256_cert_fingerprints: [impronta.toUpperCase()],
    },
  },
];

mkdirSync('public/.well-known', { recursive: true });
writeFileSync('public/.well-known/assetlinks.json', JSON.stringify(contenuto, null, 2) + '\n');
console.log('Scritto public/.well-known/assetlinks.json per il pacchetto', pacchetto);
console.log('Ricordati di ripubblicare il sito: il file deve essere online PRIMA di provare l\'app.');
