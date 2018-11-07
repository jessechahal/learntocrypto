/**
 * Created by jesse on 2018-10-29.
 */

// teller.js
if (process.argv.length >= 4) {
    //logger config
    var log4js = require('log4js');
    log4js.configure({
        appenders: { out: { type: 'stdout', layout: { type: 'colored' } } },
        categories: { default: { appenders: ['out'], level: 'info' } }
    });
    var log = log4js.getLogger("bank");
    log.level = 'debug'; // default level is OFF - which means no logs at all.

    var jsonStream = require('duplex-json-stream');
    var net = require('net');

    var client = jsonStream(net.connect(3876));

    client.on('data', function (msg) {
        log.info('Teller received:', msg);

    });

    log.debug(process.argv);

    var command = process.argv[2];
    switch (command) {
        case 'register':
            if (process.argv.length == 4) {
                var custId = process.argv[3];
                client.end({cmd: command, customerId: custId});
            } else {
                log.error("ERROR: called 'register' cmd but missing customerId")
            }
            break;
        case 'balance':
            if (process.argv.length == 4) {
                var custId = process.argv[3];
                client.end({cmd: 'balance', customerId: custId});
            } else {
                log.error("ERROR: called 'balance' cmd but missing customerId")
            }
            break;

        case 'deposit':
            if (process.argv.length == 5) {
                var numDeposit = process.argv[3];
                var custId = process.argv[4];
                client.end({cmd: command, amount: numDeposit, customerId: custId});
            } else {
                log.error("ERROR: called 'deposit' cmd but no value entered to deposit or missing customerId")
            }
            break;
        case 'withdraw':
            if (process.argv.length == 5) {
                var numDeposit = process.argv[3];
                var custId = process.argv[4];
                client.end({cmd: command, amount: numDeposit, customerId: custId});
            } else {
                log.error("ERROR: called withdraw cmd but no value entered to withdraw or missing customerId")
            }
            break;

        default:
            // Unknown command
            log.error("unknown command: " + command);
            client.end("unknown command: ", command);
            break;
    }

    //client.write({cmd: 'deposit', amount: 130});
    //client.write({cmd: 'deposit', amount: 0});
    //client.write({cmd: 'deposit', amount: 120});

    //client.end({cmd: 'balance'}); //can be used to send a request and close the socket

} else {
    log.error("ERROR: pass in 'register', 'balance', 'withdraw' or 'deposit' command")
}