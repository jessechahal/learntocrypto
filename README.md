
# learntocrypto

## Author
github.com/jessechahal


The goal of this project is to complete the assignments in [https://github.com/sodium-friends/learntocrypto](https://github.com/sodium-friends/learntocrypto)
while replacing the usage of libsodium with Ethereum's Web3js library where ever possible.



## How to Run
Make sure to run the appropriate commands to install npm modules from the package.json file

```node js/bank.js```

- the above command will bring up the bank server. It will generate a few files on disc
  - all the files usually begin with the word bank and are located wherever you ran the program
    - hopefully you ran from the root of this project
- make sure you aren't already running a bank server if you get errors during startup

```node js/teller.js <cmd> <cmd_parameters>```
- will send commands 1 at a time to the bank server
    - i.e.
        ```
        node js/teller.js register abc
        node js/teller.js deposit 5 abc

        ```


### Notes
- if you want to see older versions of the project (specific assignments) checkout older commits
  - i didn't commit after each assignment because I init'd the git repo a bit late :S
- ????