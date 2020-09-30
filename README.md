# homebridge-broadlink-heater-cooler
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/makleso6/homebridge-broadlink-heater-cooler/Build%20and%20Lint)
[![GitHub last commit](https://img.shields.io/github/last-commit/makleso6/homebridge-broadlink-heater-cooler.svg)](https://github.com/makleso6/homebridge-broadlink-heater-cooler)
[![npm](https://img.shields.io/npm/dt/homebridge-broadlink-heater-cooler.svg)](https://www.npmjs.com/package/homebridge-broadlink-heater-cooler)
[![npm version](https://badge.fury.io/js/homebridge-broadlink-heater-cooler.svg)](https://badge.fury.io/js/homebridge-broadlink-heater-cooler)

Homebridge Plugin for the control AUX-family Air Conditioners based on Broadlink [Wi-Fi module](https://aliexpress.ru/item/4000287184204.html) (AC Freedom app).

## Features

* Most of the original app's methods are supported.
* Works via LAN, no need internet connection.
* Very fast operation speed.
* Feedback is supported.

## Installation

1. Install Homebridge using the [official instructions](https://github.com/homebridge/homebridge/wiki).
2. Install this plugin using `sudo npm install -g homebridge-broadlink-heater-cooler --unsafe-perm`.
3. Update your configuration file. See configuration sample below.

### Configuration

Edit your `config.json` accordingly. Configuration sample:

```json
{
    "bridge": {
        "name": "Homebridge 9184",
        "username": "00:00:00:00:00:00",
        "port": 99999,
        "pin": "111-111-111"
    },
    "accessories": [
        {
            "accessory": "AirCondionerAccessory",
            "ip": "192.168.1.1",
            "mac": "AA:BB:CC:DD:EE:FF",
            "name": "AirCon",
            "increments": 1,
            "display": true,
            "health": true,
            "clean": true,
            "mildew": true,
            "sleep": true,
            "auto": true,
            "swing": 3
        }
    ],
    "platforms": []
}
```

| Fields               | Description                                                                     | Required | Default value |
|----------------------|---------------------------------------------------------------------------------|----------|-------------- |
| ip                   | Air Conditioner IP address in IPv4. Make sure it is static.                     | Yes      |               |
| mac                  | Air Conditioner MAC address.                                                    | Yes      |               |
| increments           | Temperature set step.                                                           | No       | 0,5           |
| display              | Show *Display* button for turn on/off display                                   | No       | false         |
| health               | Show *Health* button for turn on/off health mode.                               | No       | false         |
| clean                | Show *Clean* button for turn on/off clean mode.                                 | No       | false         |
| mildew               | Show *Mildew* button for turn on/off mildew mode.                               | No       | false         |
| sleep                | Show *Sleep* button for turn on/off sleep mode.                                 | No       | false         |
| auto                 | Show *Auto* button for set Air Conditioner auto fan speed.                      | No       | false         |
| swing                | Swing 1 - only horizontal, 2 - only vertical, 3 - both.                         | No       | 3             |


| Fanspeed | AC equivalent |
|--------- | --------------|
| 1 - 19   | mute          |
| 20 - 39  | low           |
| 40 - 59  | medium        |
| 60 - 79  | high          |
| 80 - 100 | turbo         |

## Communication

Remember that this is not a commercial product, but the result of free labor.

- If you need help using this plugin, open an issue here on GitHub. The more detail the better!
- If you found a bug, open an issue here on GitHub. The more detail the better!
- If you want to contribute, submit a pull request.
- If you have suggestions for improvement, you are welcome.
