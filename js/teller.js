/**
 * Created by jesse on 2018-10-29.
 */

// teller.js
if (process.argv.length >= 3) {
    //console.log(process.argv);

    var jsonStream = require('duplex-json-stream');
    var net = require('net');

    var client = jsonStream(net.connect(3876));

    client.on('data', function (msg) {
        console.log('Teller received:', msg);

    });


    var command = process.argv[2];
    switch (command) {
        case 'balance':
            client.end({cmd: 'balance'});
            break;

        case 'deposit':
            if (process.argv.length == 4) {
                var numDeposit = process.argv[3];
                client.end({cmd: command, amount: numDeposit});
            } else {
                console.log("ERROR: called deposit cmd but no value entered to deposit")
            }
            break;
        case 'withdraw':
            if (process.argv.length == 4) {
                var numDeposit = process.argv[3];
                client.end({cmd: command, amount: numDeposit});
            } else {
                console.log("ERROR: called withdraw cmd but no value entered to withdraw")
            }
            break;

        default:
            // Unknown command
            console.log("unknown command: " + command)
            client.end("unknown command: ", command);
            break;
    }

    //client.write({cmd: 'deposit', amount: 130});
    //client.write({cmd: 'deposit', amount: 0});
    //client.write({cmd: 'deposit', amount: 120});

    //client.end({cmd: 'balance'}); //can be used to send a request and close the socket

} else {
    console.log("ERROR: pass in either balance or deposit command")
}