/**
 * Created by jesse on 2018-10-30.
 */

const hello = "Hello, World!";



//NOTE: solidity hash uses sha3 - keccak 256
var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider());

//console.log("web3 - keccak 256 hash, current SHA-3 implementation")
//console.log("hash : " + web3.eth.accounts.hashMessage(hello));


console.log("web3.eth.accounts.hashMessage: " + web3.eth.accounts.hashMessage("transfer(address,uint256)"));
console.log("web3.utils.sha3: " + web3.utils.sha3("transfer(address,uint256)"));

//NOTE: sodium hash uses BLAKE2b, its an older hashing algorithm. It was an improvement over BLAKE
//     BLAKE2 is faster then Keccak in software, slower when both using ASICS hardware
//     It was also a SHA-3 finalist, in the end Keccak won.
var sodium = require('sodium-native');

var buf1 = Buffer.alloc(sodium.crypto_generichash_BYTES); //== 32 BYTES
sodium.crypto_generichash(buf1, Buffer.from(hello));
//console.log("\nsodium - BLAKE2b hash algo, it was a SHA-3 finalist");
//console.log("hash : 0x" + buf1.toString('hex'));