[![GitHub last commit](https://img.shields.io/github/last-commit/makleso6/homebridge-broadlink-heater-cooler.svg)](https://github.com/makleso6/homebridge-broadlink-heater-cooler)



example config.json

```
{
    "bridge": {
        "name": "Homebridge 9184",
        "username": "0E:8A:24:4B:91:84",
        "port": 51451,
        "pin": "419-60-112"
    },
    "accessories": [
        {
            "accessory": "AirCondionerAccessory",
            "ip": "192.168.1.76",
            "mac": "34:ea:34:96:e7:05",
            "name": "AirCon",
            "increments": 1, // step for set temperature , default 0,5
            "display": true, // display display button, default false
            "health": true, // display health button, default false
            "clean": true, // display clean button, default false
            "mildew": true, // display mildew button, default false
            "sleep": true // display sleep button, default false
            "swing": 3 // 1 - only horizontal, 2 - only vertical, 3 - both, default 3
        }
    ],
    "platforms": [
        {
            "name": "Config",
            "port": 8581,
            "platform": "config"
        }
    ]
}
```


Fanspeed | AC equivalent
--- | --- 
1 - 19 | mute
20 - 39 | low
40 - 59 | medium
60 - 79 | high
80 - 100 | turbo
