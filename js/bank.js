/**
 * Created by jesse on 2018-10-29.
 */
// bank.js

// from assignment 01
var jsonStream = require('duplex-json-stream');
var net = require('net');
var fs = require('fs');
var sodium = require('sodium-native');

//logger config
var log4js = require('log4js');
log4js.configure({
    appenders: { out: { type: 'stdout', layout: { type: 'colored' } } },
    categories: { default: { appenders: ['out'], level: 'info' } }
});
var log = log4js.getLogger("bank");
log.level = 'info'; // default level is OFF - which means no logs at all.

//web3 config
var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider());
var Web3Accounts = require('web3-eth-accounts');
var accounts = new Web3Accounts(new web3.providers.HttpProvider());

//globals
const transactionLogFilepath = "./bank_transactionLogs.encrypted";
const privateKeystoreFilepath = "./bank_keystore.encrypted.json"; //used to sign transaction hashes
const privateKeystorePassword = "password";
//used for encrypting files before writing to disk
const symmetricKeyFilepath = "./bank_symmetric.encryption.key.base64";
//const nonceFilepath = "./bank_transactionLogs.nonceBuf.base64.txt";

var transactionLog = [];
var customerIds = [];
var myAccount = null;
//var symmetricKey = null;
var symmetricKeyBuf = null;
//var nonceBuf = null;

//functions below=
function reduceCustomer(someArray, customerIdFilter) {
    var totalBalance = 0;
    var customerExists = false;
    log.debug("reduceCustomer() customerId: ", customerIdFilter);
    log.debug("reduceCustomer() someArray: ", someArray);
    for(let transaction of someArray) {
        if (transaction.value.customerId === customerIdFilter) {
            if (transaction.value.cmd == 'deposit') {
                totalBalance += parseInt(transaction.value.amount, 10);
            }
            else if (transaction.value.cmd == 'withdraw') {
                totalBalance -= parseInt(transaction.value.amount, 10);
                if (totalBalance < 0) {
                    log.warn("customerId '%s' withdrew too much money. " +
                        "In real world they would owe bank overdraft-fee", customerIdFilter);
                }
            }
        }
    }
    return totalBalance;
}

function hashText(valueToHash) {
    "use strict";
    return web3.utils.sha3(valueToHash);
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

function readLocalFile(filepath, encoding="utf8") {
    try {
        return fs.readFileSync(filepath, encoding)
    } catch (exception) {
        log.info("'%s' file was NOT FOUND, starting from scratch", filepath);
        log.debug(exception);
        return null;
    }
};

function readLocalFileIntoBuffer(filepath) {
    try {
        return fs.readFileSync(filepath)
    } catch (exception) {
        log.info("'%s' file was NOT FOUND, starting from scratch", filepath);
        log.debug(exception);
        return null;
    }
};

function verifyLog() {
    verificationLog = [];
    //var equal = require('deep-equal');
    for(let entry of transactionLog) {
        appendToTransactionLog(verificationLog, entry.value);
    }
    log.debug("verificationLog = %s", JSON.stringify(verificationLog));
    log.debug("transactionLog = %s", JSON.stringify(transactionLog));

    return JSON.stringify(verificationLog) === JSON.stringify(transactionLog);
    //return equal(newLog, transactionLog);
}

function writeLocalEncryptedFile(filepath, fileContents, keyBuf) {
    "use strict";
    //TODO: update this so everything is saved as JSON. makes it so you can read it using require(...) instead of fs.()
    var messageBuf = Buffer.from(fileContents);
    var nonceBuf = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES);
    sodium.randombytes_buf(nonceBuf); // insert random data into nonceBuf
    var cipherTextBuf = Buffer.alloc(messageBuf.length + sodium.crypto_secretbox_MACBYTES);
    sodium.crypto_secretbox_easy(cipherTextBuf, messageBuf, nonceBuf, keyBuf);

    fs.writeFile(filepath, cipherTextBuf.toString("base64"), (err) => {
        if (err) {
            log.error("saving encrypted '%s' failed", filepath);
            throw err;
        }
        log.info("File saved & encrypted successfully to: ", filepath);
    });
    fs.writeFile(filepath + ".nonce", nonceBuf.toString('base64'), (err) => {
        if (err) {
            log.error("saving '%s' failed", filepath + ".nonce");
            throw err;
        }
        log.info("Nonce file saved successfully to: ", filepath + ".nonce");
    });
};


function decryptLocalFile(encryptedTextFilepath, nonceFilepath, symmetricKeyFilepath) {
    "use strict";

     var cipherText = readLocalFile(encryptedTextFilepath);
     var symmetricKey = readLocalFile(symmetricKeyFilepath);
     var nonce = readLocalFile(nonceFilepath);

    var cipherTextBuf = Buffer.from(cipherText, "base64");
    var symmetricKeyBuf = Buffer.from(symmetricKey, "base64");
    var nonceBuf = Buffer.from(nonce, "base64");

    var plainTextBuf = Buffer.alloc(cipherTextBuf.length - sodium.crypto_secretbox_MACBYTES);
    log.debug("cipherText:", cipherText);
    log.debug("cipherTextBuf:", cipherTextBuf.toString());
    log.debug("nonce:", nonce);
    log.debug("nonceBuf:", nonceBuf.toString());
    log.debug("symmetricKey:", symmetricKey);
    log.debug("symmetricKeyBuf:", symmetricKeyBuf.toString());

    //var cipherTextBuf = Buffer.from(cypherText, 'hex');

    if (!sodium.crypto_secretbox_open_easy(plainTextBuf,
            cipherTextBuf, nonceBuf, symmetricKeyBuf)) {
        log.error('Decryption failed!');
        //return null;
        plainTextBuf.toString("base64")
    } else {
        log.info("decryption of contents completed");
        return plainTextBuf.toString("utf8");
    }
}


//'main' method related commands below

var server = net.createServer(function (socket) {
    socket = jsonStream(socket);
    socket.on('data', function (msg) {
        log.info('Bank received:', msg);

        switch (msg['cmd']) {
            case 'balance':
                if(msg.customerId) {
                    if (customerIds.includes(msg.customerId)) {
                        socket.write({cmd: 'balance', customerId: msg.customerId, balance: reduceCustomer(transactionLog, msg.customerId)});
                    } else {
                        socket.write('customerId is not registered. Please call register cmd first', msg);
                    }
                } else {
                    socket.write('missing customerId', msg);
                }
                break;

            case 'deposit':
                if(msg.customerId) {
                    if (customerIds.includes(msg.customerId)) {
                        appendToTransactionLog(transactionLog, msg);
                        writeLocalEncryptedFile(transactionLogFilepath, JSON.stringify(transactionLog, null, 2), symmetricKeyBuf);
                        socket.write({cmd: 'deposit', customerId: msg.customerId, balance: reduceCustomer(transactionLog, msg.customerId)});
                    } else {
                        socket.write('customerId is not registered. Please call register cmd first', msg);
                    }
                } else {
                    socket.write('missing customerId', msg);
                }
                break;

            case 'withdraw':
                if(msg.customerId) {
                    if (customerIds.includes(msg.customerId)) {
                        appendToTransactionLog(transactionLog, msg);
                        //writeLocalFile(transactionLogFilepath, JSON.stringify(transactionLog, null, 2));
                        writeLocalEncryptedFile(transactionLogFilepath, JSON.stringify(transactionLog, null, 2), symmetricKeyBuf);
                        socket.write({cmd: 'withdraw', customerId: msg.customerId, balance: reduceCustomer(transactionLog, msg.customerId)});
                    } else {
                        socket.write('customerId is not registered. Please call register cmd first', msg);
                    }
                } else {
                    socket.write('missing customerId', msg);
                }
                break;

            case 'register':

                if(msg.customerId) {
                    appendToTransactionLog(transactionLog, msg);
                    customerIds.push(msg.customerId);
                    //writeLocalFile(transactionLogFilepath, JSON.stringify(transactionLog, null, 2));
                    writeLocalEncryptedFile(transactionLogFilepath, JSON.stringify(transactionLog, null, 2), symmetricKeyBuf);
                    socket.write({cmd: 'register', customerId: msg.customerId});
                } else {
                    socket.write('missing customerId: ', msg);
                }
                break;

            default:
                // Unknown command
                socket.write("unknown cmd: ", msg);
                break;
        }

    })
});

log.info("Starting Bank server...");

symmetricKeyBuf = readLocalFileIntoBuffer(symmetricKeyFilepath);
if(!symmetricKeyBuf){
    log.debug(symmetricKeyBuf);
    log.warn("Failed to find '%s'. Generating new symmetric encryption key", symmetricKeyFilepath);

    symmetricKeyBuf = sodium.sodium_malloc(sodium.crypto_secretbox_KEYBYTES);
    sodium.randombytes_buf(symmetricKeyBuf);
    writeLocalFile(symmetricKeyFilepath, Buffer.from(symmetricKeyBuf).toString('base64'));
    log.info("Generated new symmetric key '%s'", symmetricKeyFilepath)
} else {
    log.info("Found '%s' file", symmetricKeyFilepath);
}

var nonceBuf = readLocalFileIntoBuffer(transactionLogFilepath + ".nonce");
if(!nonceBuf) {
    log.debug("nonceBuf: ", nonceBuf);
    log.warn("Failed to find '%s'. Generating new nonceBuf", transactionLogFilepath + ".nonce");

    nonceBuf = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES);
    sodium.randombytes_buf(nonceBuf); // insert random data into nonceBuf

    writeLocalFile(transactionLogFilepath + ".nonce", Buffer.from(nonceBuf).toString('base64'));
    log.info("Generated new nonceBuf");
    log.debug("New nonceBuf: ", nonceBuf);
} else {
    log.info("Found '%s' file", transactionLogFilepath + ".nonce");
}

var privateKeystore = readLocalFile(privateKeystoreFilepath);
if(privateKeystore) {
    log.info("Found '%s' file", privateKeystoreFilepath);
    myAccount = accounts.decrypt(privateKeystore, privateKeystorePassword);
} else {
    log.debug(privateKeystore);
    log.warn("Failed to find '%s'. Generating new key-pair", privateKeystoreFilepath);

    myAccount = accounts.create();
    privateKeystore = myAccount.privateKey;
    writeLocalFile(privateKeystoreFilepath, JSON.stringify(myAccount.encrypt(privateKeystorePassword), null, 2));
    log.info("Generated new key-pair, public key: '%s'", myAccount.address);
    log.debug("myAccount: ", myAccount);
}


var transactionLogFileContentsEncrypted = readLocalFile(transactionLogFilepath, "base64");
if(transactionLogFileContentsEncrypted) {
    log.info("Found '%s' file", transactionLogFilepath);
    log.debug("transactionLogFileContentsEncrypted: ", transactionLogFileContentsEncrypted);
    var transactionLogFileContents = decryptLocalFile(transactionLogFilepath, transactionLogFilepath + ".nonce", symmetricKeyFilepath);
    log.debug("transactionLogFileContents: ", transactionLogFileContents);

    if (transactionLogFileContents) {
        log.debug("parsing transactionLog into JSON");
        transactionLog = JSON.parse(JSON.stringify(transactionLogFileContents, null, 2));
    } else {
        log.warn("Something seems wrong with transactionLog contents. Creating an empty transactionLog");
        transactionLog = [];
    }

} else {
    log.debug("transactionLogFileContentsEncrypted: ", transactionLogFileContentsEncrypted);
    log.warn("Failed to find '%s'. Generating new transactionLog", transactionLogFilepath);

    writeLocalFile(transactionLogFilepath, JSON.stringify(transactionLog, null, 2));
    log.info("Generated new transactionLogFile to '%s'", transactionLogFilepath);
}


if(transactionLog.length > 0 && !verifyLog()) {
    log.warn("'%s' file has been modified, throwing away file contents.", transactionLogFilepath);
    log.debug("transactionLog: ", transactionLog);
    fs.truncate(transactionLogFilepath, 0,() => log.info("Done emptying '%s' contents", transactionLogFilepath));
    transactionLog = [];
} else if (transactionLog.length > 0) {
    log.info("Found '%s' file. Verified transactions and all looks good", transactionLogFilepath)
}


server.listen(3876);