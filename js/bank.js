/**
 * Created by jesse on 2018-10-29.
 */

// bank.js
var jsonStream = require('duplex-json-stream');
var net = require('net');
var fs = require('fs');
var log4js = require('log4js');

log4js.configure({
    appenders: { out: { type: 'stdout', layout: { type: 'colored' } } },
    categories: { default: { appenders: ['out'], level: 'info' } }
});
var log = log4js.getLogger();
log.level = 'info'; // default level is OFF - which means no logs at all.


var transactionLogFilename = "./bank_transactionLogs.json";
var transactionLog = [];

function reduce(someArray) {
    var totalBalance = 0;
    log.debug("",someArray);
    for(let transaction of someArray) {
        if (transaction.value.cmd == 'deposit') {
            totalBalance += parseInt(transaction.value.amount, 10);
        } else {
            var tempBalance = totalBalance;
            tempBalance -= parseInt(transaction.value.amount, 10);

            if(tempBalance >= 0) {
                totalBalance = tempBalance;
            } else {
                console.log("Withdrew too much money, cannot process transaction")
            }
        }
    }
    //transactionLog.forEach(function(x) { x['cmd'] == 'deposit' ? totalBalance += x['amount'] : totalBalance -= x['amount']});
    return totalBalance;
}

var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider());
function hashToHex(valueToHash) {
    "use strict";
    return web3.eth.accounts.hashMessage(valueToHash);
}

// One edge-case with referring to the previous hash is that you need a
// "genesis" hash for the first entry in the log
var genesisHash = "0x" + Buffer.alloc(32).toString('hex');

function appendToTransactionLog (transLog, entry) {
    var prevHash = transLog.length ? transLog[transLog.length - 1].hash : genesisHash;
    log.debug("prevHash: " + prevHash);
    transLog.push({
        value: entry,
        hash: hashToHex(prevHash + JSON.stringify(entry))
    })
}

function writeTransactionLogFile() {
    "use strict";

    fs.writeFile(transactionLogFilename, JSON.stringify(transactionLog, null, 2), function (err) {
        if (err) {
            log.error('saving file failed');
            throw err;
        }
        log.info('Transaction logs saved to: ' + transactionLogFilename);
    });
};

function verifyLog() {
    newLog = [];

    for(let entry of transactionLog) {
        appendToTransactionLog(newLog, entry.value);
    }
    return JSON.stringify(newLog) == JSON.stringify(transactionLog);
}

function readTransactionLogFile() {
    "use strict";

    try {
        return require(transactionLogFilename);
        log.info(transactionLogFilename + " was FOUND, reading transaction logs from file");
    } catch (exception) {
        log.info(transactionLogFilename + " file was NOT FOUND, starting from scratch");

        return [];
    }
};

var server = net.createServer(function (socket) {
    socket = jsonStream(socket);
    socket.on('data', function (msg) {
        log.info('Bank received:', msg);

        switch (msg['cmd']) {
            case 'balance':
                //console.log(transactionLog);
                socket.write({cmd: 'balance', balance: reduce(transactionLog)});
                break;

            case 'deposit':
                appendToTransactionLog(transactionLog, msg);
                writeTransactionLogFile();
                socket.write({cmd: 'deposit', balance: reduce(transactionLog)});
                break;

            case 'withdraw':
                appendToTransactionLog(transactionLog, msg);
                writeTransactionLogFile();
                socket.write({cmd: 'withdraw', balance: reduce(transactionLog)});
                break;

            default:
                // Unknown command
                socket.write("unknown cmd: ", msg);
                break;
        }

    })
});

transactionLog = readTransactionLogFile();
if(transactionLog.length > 0 && !verifyLog()) {
    log.warn("transaction log file has been modified, ignoring file ");
    log.debug(transactionLog);
    transactionLog = []
}

server.listen(3876);