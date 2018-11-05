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

if (process.argv.length >= 4) {
    log.debug(process.argv);

    //secretKey is in base64 format when passed in
    var secretKeyBuf = new Buffer(process.argv[2], 'base64');

    var messageBuf = Buffer.from(process.argv[3]);

    var nonceBuf = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES);
    sodium.randombytes_buf(nonceBuf); // insert random data into nonce
    var cipherTextBuf = Buffer.alloc(messageBuf.length + sodium.crypto_secretbox_MACBYTES);


    sodium.crypto_secretbox_easy(cipherTextBuf, messageBuf, nonceBuf, secretKeyBuf);

    log.info("Message: '%s'", messageBuf.toString());
    log.info("secretKey: '%s'", secretKeyBuf.toString("base64"));
    log.info("Nonce: '%s'", nonceBuf.toString("base64"));
    log.info("CypherText: %s", cipherTextBuf.toString("base64"))

} else {
    log.error("Pass in a 'secretKey' and 'message'")
}