/**
 * Created by jesse on 2018-10-29.
 */

// bank.js
var jsonStream = require('duplex-json-stream');
var net = require('net');
var fs = require('fs');

var transactionLogFilename = "./bank_transactionLogs.json";
var transactionLog = [];

function reduce(someArray) {
    var totalBalance = 0;
    console.log(someArray);
    for(let transaction of someArray) {
        if (transaction.cmd == 'deposit') {
            totalBalance += parseInt(transaction.amount, 10);
        } else {
            totalBalance -= parseInt(transaction.amount, 10);
        }
    }
    //transactionLog.forEach(function(x) { x['cmd'] == 'deposit' ? totalBalance += x['amount'] : totalBalance -= x['amount']});
    return totalBalance;
};

function writeTransactionLog() {
    "use strict";

    fs.writeFile(transactionLogFilename, JSON.stringify(transactionLog, null, 2), function (err) {
        if (err) {
            console.log('saving file failed');
            throw err;
        }
        console.log('Transaction logs saved to: ' + transactionLogFilename);
    });
};

try {
    transactionLog = require(transactionLogFilename);
    console.log(transactionLogFilename + " was FOUND, loading transaction log from file")
} catch (exception) {
    console.log(transactionLogFilename + " file was NOT FOUND, starting from scratch")
}

var server = net.createServer(function (socket) {
    socket = jsonStream(socket);
    socket.on('data', function (msg) {
        console.log('Bank received:', msg);

        switch (msg['cmd']) {
            case 'balance':
                //console.log(transactionLog);
                socket.write({cmd: 'balance', balance: reduce(transactionLog)});
                break;

            case 'deposit':
                transactionLog.push(msg);
                writeTransactionLog();
                socket.write({cmd: 'deposit', balance: reduce(transactionLog)});
                break;

            case 'withdraw':
                transactionLog.push(msg);
                writeTransactionLog();
                socket.write({cmd: 'withdraw', balance: reduce(transactionLog)});
                break;

            default:
                // Unknown command
                socket.write("unknown cmd: ", msg);
                break;
        }


    })
});

server.listen(3876);