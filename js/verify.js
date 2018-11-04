/**
 * Created by jesse on 2018-11-03.
 */

//public key, message and signature

var log4js = require('log4js');
log4js.configure({
    appenders: { out: { type: 'stdout', layout: { type: 'colored' } } },
    categories: { default: { appenders: ['out'], level: 'info' } }
});
var log = log4js.getLogger();
log.level = 'info';


// teller.js
if (process.argv.length >= 5) {
    log.debug(process.argv);

    var Web3 = require('web3');
    var web3 = new Web3();
    web3.setProvider(new web3.providers.HttpProvider());

    var Web3Accounts = require('web3-eth-accounts');
    var accounts = new Web3Accounts(new web3.providers.HttpProvider());

    var message = process.argv[2];
    var publicKey = process.argv[3];
    var signature = process.argv[4];

    var publicKeyInSignature = accounts.recover(message, signature);

    if(publicKey == publicKeyInSignature) {
        log.info("Public key matches Signature")
    } else {
        log.error("Public key '%s' doesn't match key in signature '%s'", publicKey, publicKeyInSignature)
    }
} else {
    log.error("pass in a public key, message and signature")
}