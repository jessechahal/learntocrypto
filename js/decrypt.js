/**
 * Created by jesse on 2018-11-04.
 */

//logger config
var log4js = require('log4js');
log4js.configure({
    appenders: { out: { type: 'stdout', layout: { type: 'colored' } } },
    categories: { default: { appenders: ['out'], level: 'info' } }
});
var log = log4js.getLogger("bank");
log.level = 'debug'; // default level is OFF - which means no logs at all.

var sodium = require('sodium-native');

if (process.argv.length >= 5) {
    log.debug(process.argv);

    //in base64 format when passed in
    var cipherTextBuf = Buffer.from(process.argv[2], 'base64');
    var secretKeyBuf = Buffer.from(process.argv[3], 'base64');
    var nonceBuf = Buffer.from(process.argv[4], 'base64');

    var plainTextBuf = Buffer.alloc(cipherTextBuf.length - sodium.crypto_secretbox_MACBYTES);

    if (!sodium.crypto_secretbox_open_easy(plainTextBuf, cipherTextBuf, nonceBuf, secretKeyBuf)) {
        console.log('Decryption failed!')
    } else {
        console.log('Decrypted message as hex: ', plainTextBuf);
        console.log("Decrypted message as string: ");
        console.log(plainTextBuf.toString());
    }

} else {
    log.error("Pass in a 'encryptedMessage', 'secretKey', and 'nonceBuf")
}