# 2n-helios-client

`2n-helios-client` is a node-style API for interfacing with 2n door access control panels.

To use:
```js
const credentials = {
    ip: '10.1.10.123',                  // your 2n unit's IP address
    user: 'admin',                      // your 2n API username (not necessarily the same as the web interface login)
    pass: 'password'                    // your 2n API password
}

const helios = new Helios(credentials); // create new instance

const res = await helios.status();       // make sure to use await as we're dealing with promises
console.log(res)                        // do something with the response

```