/**
 * Created by jesse on 2018-11-04.
 */

var fs = require('fs');

//web3 config
var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider());

const symKeyFilepath = "./symmetricKeyBuf"

function writeLocalFile(filepath, fileContents) {
    "use strict";

    fs.writeFile(filepath, fileContents, (err) => {
        if (err) {
            console.error("saving '%s' failed", filepath);
            throw err;
        }
        console.log("File saved successfully to: ", filepath);
    });
};

//I couldn't find a way to make web3 expose the symmetric key, switching to sodium
/*
const symKeyId = web3.shh.newSymKey();
if(web3.shh.hasSymKey(symKeyId)) {
    console.log("symKey exists")
} else {
    console.log("symmKey doesn't exist")
}
console.log(web3.shh)
writeLocalFile("web3.ssh.json", JSON.stringify(web3.shh, null, 2));
writeLocalFile("web3.json", JSON.stringify(web3, null, 2));
web3.shh.getSymKey(symKeyId).then(console.log);

*/

var sodium = require('sodium-native');

var key = sodium.sodium_malloc(sodium.crypto_secretbox_KEYBYTES); // secure buffer
/*
var nonceBuf = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES);
var message = Buffer.from('Hello, World!');
var ciphertext = Buffer.alloc(message.length + sodium.crypto_secretbox_MACBYTES);

sodium.randombytes_buf(nonceBuf); // insert random data into nonceBuf
*/
sodium.randombytes_buf(key);  // insert random data into key

writeLocalFile(symKeyFilepath, key.toString('base64'));

//sodium.crypto_secretbox_easy(cipherMsgBuf, Buffer.from(message), nonceBuf, secretKey);