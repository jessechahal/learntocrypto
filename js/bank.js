/**
 * Created by jesse on 2018-10-29.
 */
// bank.js

// from assignment 01
var jsonStream = require('duplex-json-stream');
var net = require('net');
var fs = require('fs');

//logger config
var log4js = require('log4js');
log4js.configure({
    appenders: { out: { type: 'stdout', layout: { type: 'colored' } } },
    categories: { default: { appenders: ['out'], level: 'info' } }
});
var log = log4js.getLogger("bank");
log.level = 'debug'; // default level is OFF - which means no logs at all.

//web3 config
var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider());
var Web3Accounts = require('web3-eth-accounts');
var accounts = new Web3Accounts(new web3.providers.HttpProvider());

//globals
const transactionLogFilepath = "./bank_transactionLogs.json";
const privateKeystoreFilepath = "./bank_keystore.encrypted.json";
const privateKeystorePassword = "password";

var transactionLog = [];
var myAccount = null;

//functions below
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
    //transactionLog.forEach(function(x) { x['cmd'] == 'deposit' ?
    //   totalBalance += x['amount'] : totalBalance -= x['amount']});
    return totalBalance;
}

function hashText(valueToHash) {
    "use strict";
    return web3.eth.accounts.hashMessage(valueToHash);
}

// One edge-case with referring to the previous hash is that you need a
// "genesis" hash for the first entry in the log
var genesisHash = "0x" + Buffer.alloc(32).toString('hex');

function appendToTransactionLog (transLog, entry) {
    var prevHash = transLog.length ? transLog[transLog.length - 1].hash : genesisHash;
    currentHash = hashText(prevHash + JSON.stringify(entry));
    log.debug("prevHash: " + prevHash);
    transLog.push({
        value: entry,
        hash: currentHash,
        signature: myAccount.sign(currentHash).signature
    })
}

function writeLocalFile(filepath, fileContents) {
    "use strict";

    fs.writeFile(filepath, fileContents, (err) => {
        if (err) {
            log.error("saving '%s' failed", filepath);
            throw err;
        }
        log.info("File saved successfully to: ", filepath);
    });
};

function readLocalFile(filepath) {
    try {
        return fs.readFileSync(filepath, 'utf8')
    } catch (exception) {
        log.info("'%s' file was NOT FOUND, starting from scratch", filepath);
        log.debug(exception);
        return null;
    }
};

function verifyLog() {
    newLog = [];
    var equal = require('deep-equal');
    for(let entry of transactionLog) {
        appendToTransactionLog(newLog, entry.value);
    }
    //log.debug("newLog = %s", JSON.stringify(newLog));
    //log.debug("transactionLog = %s", JSON.stringify(transactionLog));

    return JSON.stringify(newLog) === JSON.stringify(transactionLog);
    //return equal(newLog, transactionLog);
}

//'main' method related commands below

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
                writeLocalFile(transactionLogFilepath, JSON.stringify(transactionLog, null, 2));
                socket.write({cmd: 'deposit', balance: reduce(transactionLog)});
                break;

            case 'withdraw':
                appendToTransactionLog(transactionLog, msg);
                writeLocalFile(transactionLogFilepath, JSON.stringify(transactionLog, null, 2));
                socket.write({cmd: 'withdraw', balance: reduce(transactionLog)});
                break;

            default:
                // Unknown command
                socket.write("unknown cmd: ", msg);
                break;
        }

    })
});

log.info("Starting Bank server...");

var privateKeystore = readLocalFile(privateKeystoreFilepath);

if(privateKeystore == null) {
    log.debug(privateKeystore);
    log.warn("Failed to find '%s'. Generating new key-pair", privateKeystoreFilepath);

    myAccount = accounts.create();
    privateKeystore = myAccount.privateKey;
    //writeLocalFile(privateKeystoreFilepath, privateKeystore.toString());
    writeLocalFile(privateKeystoreFilepath, JSON.stringify(myAccount.encrypt(privateKeystorePassword), null, 2));
    log.info("Generated new key-pair, public key: '%s'", myAccount.address);
    log.debug(myAccount);

    //garabageTransactionFile = JSON.parse(readLocalFile(transactionLogFilepath));
    garabageTransactionFile = readLocalFile(transactionLogFilepath);
    if(garabageTransactionFile) {
        log.warn("Found '%s' but since we had to regenerate key-pair need to throwaway file contents",
            transactionLogFilepath);
        fs.truncate(transactionLogFilepath, 0,() => log.info("Done emptying '%s' contents", transactionLogFilepath));
    }

//only load transactionLog if both private & public key could be loaded. Else we cannot validate or extend the log
} else {
    log.info("Found '%s' file", privateKeystoreFilepath);
    //myAccount = accounts.privateKeyToAccount(privateKeystore);
    myAccount = accounts.decrypt(JSON.parse(privateKeystore), privateKeystorePassword);

    transactionLogFileContents = readLocalFile(transactionLogFilepath);
    if (transactionLogFileContents)
        transactionLog = JSON.parse(transactionLogFileContents);
    else
        transactionLog = [];

    if(transactionLog.length > 0 && !verifyLog()) {
        log.warn("'%s' file has been modified, throwing away file contents.", transactionLogFilepath);
        log.debug("transactionLog: ", transactionLog);
        fs.truncate(transactionLogFilepath, 0,() => log.info("Done emptying '%s' contents", transactionLogFilepath));
        transactionLog = [];
    } else if (transactionLog.length > 0) {
        log.info("Found '%s' file. Verified transactions and all looks good", transactionLogFilepath)
    }
}


server.listen(3876);