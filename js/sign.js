/**
 * Created by jesse on 2018-11-03.
 */

var log4js = require('log4js');
log4js.configure({
    appenders: { out: { type: 'stdout', layout: { type: 'colored' } } },
    categories: { default: { appenders: ['out'], level: 'info' } }
});
var log = log4js.getLogger();
log.level = 'debug';


if (process.argv.length >= 3) {
    log.debug(process.argv);

    var Web3 = require('web3');
    var web3 = new Web3();
    web3.setProvider(new web3.providers.HttpProvider());

    var Web3Accounts = require('web3-eth-accounts');
    var accounts = new Web3Accounts(new web3.providers.HttpProvider());


    var myAccount = web3.eth.accounts.create();

    log.debug(myAccount);

    var message = process.argv[2];

    //message, public key and signature
    log.info("Message: '%s'", message);
    log.info("Public Key: '%s'", myAccount.address);
    log.info("signature: '%s'", myAccount.sign(message).signature);
} else {
    log.error("pass in a message")
}