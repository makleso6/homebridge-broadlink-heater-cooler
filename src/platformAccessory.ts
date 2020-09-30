import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  Logging,
  Service,
} from 'homebridge';


import { AirConditionerAPI, State, Mode, Fixation, Fanspeed } from 'broadlink-aircon-api';

export class AirCondionerAccessory implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly api: API;
  private readonly name: string;
  private airConditionerAPI: AirConditionerAPI;
  private lastRotationSpeed = Fanspeed.medium;
  private lastTurbo = State.off;
  private lastMute = State.off;

  private readonly service: Service;
  private readonly informationService: Service;
  private readonly display: Service | undefined;
  private readonly health: Service | undefined;
  private readonly clean: Service | undefined;
  private readonly mildew: Service | undefined;
  private readonly sleep: Service | undefined;
  private readonly auto: Service | undefined;

  private showDisplay = false;
  private showHealth = false;
  private showClean = false;
  private showMildew = false;
  private showSleep = false;
  private showAuto = false;

  services: Service[]
  private swing = 3;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.api = api;
    this.services = [];
    let ip = '0.0.0.0';
    let mac = 'ff:ff:ff:ff:ff:ff';
    if (('ip' in config) && ('mac' in config)) {
      ip = config['ip'] as string;
      mac = config['mac'] as string;
    } else {
      log.error('ip or mac is not provided');
    }
    
    this.airConditionerAPI = new AirConditionerAPI(ip, mac);

    let increments = 0.5;
    if ('increments' in config) {
      increments = config['increments'] as number;
    }

    if ('swing' in config) {
      this.swing = config['swing'] as number;
    }

    if ('display' in config) {
      this.showDisplay = config['display'] as boolean;
    }

    if ('health' in config) {
      this.showHealth = config['health'] as boolean;
    }

    if ('clean' in config) {
      this.showClean = config['clean'] as boolean;
    }

    if ('mildew' in config) {
      this.showMildew = config['mildew'] as boolean;
    }

    if ('sleep' in config) {
      this.showSleep = config['sleep'] as boolean;
    }

    if ('auto' in config) {
      this.showAuto = config['auto'] as boolean;
    }

    this.service = new this.api.hap.Service.HeaterCooler;
    this.service.getCharacteristic(api.hap.Characteristic.Active)
      .on('get', this.handleActiveGet.bind(this))
      .on('set', this.handleActiveSet.bind(this));

    this.service.getCharacteristic(api.hap.Characteristic.CurrentHeaterCoolerState)
      .on('get', this.handleCurrentHeaterCoolerStateGet.bind(this));

    this.service.getCharacteristic(api.hap.Characteristic.TargetHeaterCoolerState)
      .on('get', this.handleTargetHeaterCoolerStateGet.bind(this))
      .on('set', this.handleTargetHeaterCoolerStateSet.bind(this));

    this.service.getCharacteristic(api.hap.Characteristic.CurrentTemperature)
      .on('get', this.handleCurrentTemperatureGet.bind(this));
      
    this.service.getCharacteristic(api.hap.Characteristic.CoolingThresholdTemperature)
      .on('get', this.handleThresholdTemperatureGet.bind(this))
      .on('set', this.handleThresholdTemperatureSet.bind(this));

    this.service.getCharacteristic(api.hap.Characteristic.HeatingThresholdTemperature)
      .on('get', this.handleThresholdTemperatureGet.bind(this))
      .on('set', this.handleThresholdTemperatureSet.bind(this));

    this.service.getCharacteristic(api.hap.Characteristic.RotationSpeed)
      .on('get', this.handleRotationSpeedGet.bind(this))
      .on('set', this.handleRotationSpeedSet.bind(this));

    this.service.getCharacteristic(api.hap.Characteristic.SwingMode)
      .on('get', this.handleSwingGet.bind(this))
      .on('set', this.handleSwingSet.bind(this));

    this.service.getCharacteristic(api.hap.Characteristic.CoolingThresholdTemperature).props.minValue = 16;
    this.service.getCharacteristic(api.hap.Characteristic.CoolingThresholdTemperature).props.maxValue = 32;
    this.service.getCharacteristic(api.hap.Characteristic.HeatingThresholdTemperature).props.minValue = 16;
    this.service.getCharacteristic(api.hap.Characteristic.HeatingThresholdTemperature).props.maxValue = 32;

    this.service.getCharacteristic(api.hap.Characteristic.CoolingThresholdTemperature).props.minStep = increments;
    this.service.getCharacteristic(api.hap.Characteristic.HeatingThresholdTemperature).props.minStep = increments;
    this.services.push(this.service);

    this.informationService = new api.hap.Service.AccessoryInformation()
      .setCharacteristic(api.hap.Characteristic.Manufacturer, 'AUX')
      .setCharacteristic(api.hap.Characteristic.Model, 'Broadlink');
    this.services.push(this.informationService);

    if (this.showDisplay) {
      this.display = new api.hap.Service.Switch('Display', 'Display');
      this.display.getCharacteristic(api.hap.Characteristic.On)
        .on('get', this.handleDisplayGet.bind(this))
        .on('set', this.handleDisplaySet.bind(this));
      this.services.push(this.display);
    }

    if (this.showHealth) {
      this.health = new api.hap.Service.Switch('Health', 'Health');
      this.health.getCharacteristic(api.hap.Characteristic.On)
        .on('get', this.handleHealthGet.bind(this))
        .on('set', this.handleHealthSet.bind(this));
      this.services.push(this.health);
    }

    if (this.showClean) {
      this.clean = new api.hap.Service.Switch('Clean', 'Clean');
      this.clean.getCharacteristic(api.hap.Characteristic.On)
        .on('get', this.handleCleanGet.bind(this))
        .on('set', this.handleCleanSet.bind(this));
      this.services.push(this.clean);
    }

    if (this.showMildew) {
      this.mildew = new api.hap.Service.Switch('Mildew', 'Mildew');
      this.mildew.getCharacteristic(api.hap.Characteristic.On)
        .on('get', this.handleMildewGet.bind(this))
        .on('set', this.handleMildewSet.bind(this));
      this.services.push(this.mildew);
    }

    if (this.showSleep) {
      this.sleep = new api.hap.Service.Switch('Sleep', 'Sleep');
      this.sleep.getCharacteristic(api.hap.Characteristic.On)
        .on('get', this.handleSleepGet.bind(this))
        .on('set', this.handleSleepSet.bind(this));
      this.services.push(this.sleep);
    }

    if (this.showAuto) {
      this.auto = new api.hap.Service.Switch('Auto', 'Auto');
      this.auto.getCharacteristic(api.hap.Characteristic.On)
        .on('get', this.handleAutoGet.bind(this))
        .on('set', this.handleAutoSet.bind(this));
      this.services.push(this.auto);
    }

    api.on('didFinishLaunching', () => {
      this.airConditionerAPI.connect();
    });

    setInterval(() => {
      this.airConditionerAPI.getState();
    }, 5000);

    this.airConditionerAPI.on('updateState', () => {
      this.service.getCharacteristic(api.hap.Characteristic.CoolingThresholdTemperature).updateValue(this.thresholdTemperature());
      this.service.getCharacteristic(api.hap.Characteristic.HeatingThresholdTemperature).updateValue(this.thresholdTemperature());
      this.service.getCharacteristic(api.hap.Characteristic.CurrentHeaterCoolerState).updateValue(this.currentHeaterCoolerState());
      this.service.getCharacteristic(api.hap.Characteristic.TargetHeaterCoolerState).updateValue(this.targetHeaterCoolerState());
      this.service.getCharacteristic(api.hap.Characteristic.Active).updateValue(this.active());
      this.service.getCharacteristic(api.hap.Characteristic.CurrentTemperature).updateValue(this.currentTemperature());
      this.service.getCharacteristic(api.hap.Characteristic.SwingMode).updateValue(this.swingValue());
      this.updateRotationSpeed();

      if (this.showDisplay) {
        this.display!.getCharacteristic(api.hap.Characteristic.On).updateValue(this.displayValue());
      }

      if (this.showHealth) {
        this.health!.getCharacteristic(api.hap.Characteristic.On).updateValue(this.healthValue());
      }

      if (this.showClean) {
        this.clean!.getCharacteristic(api.hap.Characteristic.On).updateValue(this.cleanValue());
      }

      if (this.showMildew) {
        this.mildew!.getCharacteristic(api.hap.Characteristic.On).updateValue(this.mildewValue());
      }

      if (this.showSleep) {
        this.sleep!.getCharacteristic(api.hap.Characteristic.On).updateValue(this.sleepValue());
      }
  
      this.updateAuto();
    });

  }

  updateRotationSpeed() {
    this.service.getCharacteristic(this.api.hap.Characteristic.RotationSpeed).updateValue(this.rotationSpeed());
  }

  updateAuto() {
    if (this.showAuto) {
      this.auto!.getCharacteristic(this.api.hap.Characteristic.On).updateValue(this.autoValue());
    }
  }

  getServices(): Service[] {
    return this.services;
  }

  active(): number {
    let currentValue = 0;
    if (this.airConditionerAPI.model.power === State.on) {
      currentValue = 1;
    } 

    return currentValue;
  }

  handleActiveGet(callback) {
    this.log.debug('Triggered GET Active');

    const currentValue = this.active();

    callback(null, currentValue);
  }


  handleActiveSet(value, callback) {
    this.log.debug('Triggered SET Active:', value);
    if (value === 1) {
      this.airConditionerAPI.setPower(State.on);
    } else {
      this.airConditionerAPI.setPower(State.off);
    }
    callback(null);

  }

  private currentHeaterCoolerState(): number {
    let currentValue = this.api.hap.Characteristic.CurrentHeaterCoolerState.INACTIVE;
    if (this.airConditionerAPI.model.mode === Mode.cooling) {
      currentValue = this.api.hap.Characteristic.CurrentHeaterCoolerState.COOLING;
    } else if (this.airConditionerAPI.model.mode === Mode.heating) {
      currentValue = this.api.hap.Characteristic.CurrentHeaterCoolerState.HEATING;
    } else {
      currentValue = this.api.hap.Characteristic.CurrentHeaterCoolerState.IDLE;
    }

    return currentValue;
  }

  handleCurrentHeaterCoolerStateGet(callback) {
    this.log.debug('Triggered GET CurrentHeaterCoolerState');

    const currentValue = this.currentHeaterCoolerState();

    callback(null, currentValue);
  }

  private targetHeaterCoolerState(): number {
    let currentValue = this.api.hap.Characteristic.TargetHeaterCoolerState.AUTO;
    if (this.airConditionerAPI.model.mode === Mode.cooling) {
      currentValue = this.api.hap.Characteristic.TargetHeaterCoolerState.COOL;
    } else if (this.airConditionerAPI.model.mode === Mode.heating) {
      currentValue = this.api.hap.Characteristic.TargetHeaterCoolerState.HEAT;
    } else if (this.airConditionerAPI.model.mode === Mode.auto) {
      currentValue = this.api.hap.Characteristic.TargetHeaterCoolerState.AUTO;
    }

    return currentValue;
  }

  handleTargetHeaterCoolerStateGet(callback) {
    this.log.debug('Triggered GET TargetHeaterCoolerState');

    const currentValue = this.targetHeaterCoolerState();

    callback(null, currentValue);
  }

  handleTargetHeaterCoolerStateSet(value, callback) {
    this.log.debug('Triggered SET TargetHeaterCoolerState:', value);

    if (value === this.api.hap.Characteristic.TargetHeaterCoolerState.AUTO) {
      this.airConditionerAPI.setMode(Mode.auto);
    } else if (value === this.api.hap.Characteristic.TargetHeaterCoolerState.COOL) {
      this.airConditionerAPI.setMode(Mode.cooling);
    } else if (value === this.api.hap.Characteristic.TargetHeaterCoolerState.HEAT) {
      this.airConditionerAPI.setMode(Mode.heating);
    } 

    callback(null);
  }

  private currentTemperature(): number {
    return this.airConditionerAPI.model.ambientTemp;
  }

  handleCurrentTemperatureGet(callback) {
    this.log.debug('Triggered GET CurrentTemperature');
    const currentValue = this.currentTemperature();
    callback(null, currentValue);
  }

  handleThresholdTemperatureSet(value, callback) {
    this.log.debug('Triggered SET ThresholdTemperature:', value);
    this.airConditionerAPI.setTemp(value);
    callback(null);
  }

  private thresholdTemperature(): number {
    return this.airConditionerAPI.model.temp;
  }

  handleThresholdTemperatureGet(callback) {
    this.log.debug('Triggered GET ThresholdTemperature');

    const currentValue = this.thresholdTemperature();

    callback(null, currentValue);
  }
  
  private rotationSpeed(): number {
    let currentValue = 1;
     
    if (this.airConditionerAPI.model.turbo === State.on) {
      currentValue = 100;
    } else if (this.airConditionerAPI.model.mute === State.on) {
      currentValue = 10;
    } else if (this.airConditionerAPI.model.fanspeed === Fanspeed.high) {
      currentValue = 60;
    } else if (this.airConditionerAPI.model.fanspeed === Fanspeed.medium) {
      currentValue = 40;
    } else if (this.airConditionerAPI.model.fanspeed === Fanspeed.low) {
      currentValue = 20;
    }
    return currentValue;
  }

  handleRotationSpeedGet(callback) {
    this.log.debug('Triggered GET RotationSpeed');
    const currentValue = this.rotationSpeed();
    callback(null, currentValue);
  }

  handleRotationSpeedSet(value, callback) {
    this.log.debug('Triggered SET RotationSpeed:', value);
    if (value > 1 && value <= 19) {
      this.airConditionerAPI.setSpeed(this.lastRotationSpeed, State.off, State.on);
      this.lastTurbo = State.off;
      this.lastMute = State.on;
    } else if (value > 19 && value <= 39) {
      this.airConditionerAPI.setSpeed(Fanspeed.low, State.off, State.off);
      this.lastRotationSpeed = Fanspeed.low;
      this.lastTurbo = State.off;
      this.lastMute = State.off;
    } else if (value > 39 && value <= 59) {
      this.airConditionerAPI.setSpeed(Fanspeed.medium, State.off, State.off);
      this.lastRotationSpeed = Fanspeed.medium;
      this.lastTurbo = State.off;
      this.lastMute = State.off;
    } else if (value > 59 && value <= 79) {
      this.airConditionerAPI.setSpeed(Fanspeed.high, State.off, State.off);
      this.lastRotationSpeed = Fanspeed.high;
      this.lastTurbo = State.off;
      this.lastMute = State.off;
    } else if (value > 79) {
      this.airConditionerAPI.setSpeed(this.lastRotationSpeed, State.on, State.off);
      this.lastTurbo = State.on;
      this.lastMute = State.off;
    }
    this.updateAuto();

    callback(null);
  }

  handleDisplaySet(value, callback) {
    this.log.debug('Triggered SET Display:', value);
    if (value === true) {
      this.airConditionerAPI.setDisplay(State.on);
    } else {
      this.airConditionerAPI.setDisplay(State.off);
    }
    callback(null);
  }

  private displayValue(): boolean {
    return this.airConditionerAPI.model.display === State.on;
  }

  handleDisplayGet(callback) {
    this.log.debug('Triggered GET Display');

    const currentValue = this.displayValue();

    callback(null, currentValue);
  }

  handleSwingSet(value, callback) {
    this.log.debug('Triggered SET Swing:', value);
    if (value === 1) {
      if (this.swing === 1) {
        this.airConditionerAPI.setSwing(Fixation.off, Fixation.on);
      } else if (this.swing === 2) {
        this.airConditionerAPI.setSwing(Fixation.on, Fixation.off);
      } else if (this.swing === 3) {
        this.airConditionerAPI.setSwing(Fixation.on, Fixation.on);
      }
    } else {
      this.airConditionerAPI.setSwing(Fixation.off, Fixation.off);
    }
    callback(null);
  }

  private swingValue(): number {
    if (this.swing === 1) {
      if (this.airConditionerAPI.model.horizontalFixation === Fixation.on) {
        return 1;
      } else {
        return 0;
      }
    } else if (this.swing === 2) {
      if (this.airConditionerAPI.model.verticalFixation === Fixation.on) {
        return 1;
      } else {
        return 0;
      }
    } else if (this.swing === 3) {
      // eslint-disable-next-line max-len
      if (this.airConditionerAPI.model.verticalFixation === Fixation.on && this.airConditionerAPI.model.horizontalFixation === Fixation.on) {
        return 1;
      } else {
        return 0;
      }
    }
    return 0;

  }

  handleSwingGet(callback) {
    this.log.debug('Triggered GET Swing');

    const currentValue = this.swingValue();

    callback(null, currentValue);
  }

  handleHealthSet(value, callback) {
    this.log.debug('Triggered SET Health:', value);
    if (value === true) {
      this.airConditionerAPI.setHealth(State.on);
    } else {
      this.airConditionerAPI.setHealth(State.off);
    }
    callback(null);
  }

  private healthValue(): boolean {
    return this.airConditionerAPI.model.health === State.on;
  }

  handleHealthGet(callback) {
    this.log.debug('Triggered GET Health');

    const currentValue = this.healthValue();

    callback(null, currentValue);
  }

  handleCleanSet(value, callback) {
    this.log.debug('Triggered SET Clean:', value);
    if (value === true) {
      this.airConditionerAPI.setClean(State.on);
    } else {
      this.airConditionerAPI.setClean(State.off);
    }
    callback(null);
  }

  private cleanValue(): boolean {
    return this.airConditionerAPI.model.clean === State.on;
  }

  handleCleanGet(callback) {
    this.log.debug('Triggered GET Clean');

    const currentValue = this.cleanValue();

    callback(null, currentValue);
  }

  handleMildewSet(value, callback) {
    this.log.debug('Triggered SET Mildew:', value);
    if (value === true) {
      this.airConditionerAPI.setMildew(State.on);
    } else {
      this.airConditionerAPI.setMildew(State.off);
    }
    callback(null);
  }

  private mildewValue(): boolean {
    return this.airConditionerAPI.model.mildew === State.on;
  }

  handleMildewGet(callback) {
    this.log.debug('Triggered GET Mildew');

    const currentValue = this.mildewValue();

    callback(null, currentValue);
  }

  handleSleepSet(value, callback) {
    this.log.debug('Triggered SET Sleep:', value);
    if (value === true) {
      this.airConditionerAPI.setSleep(State.on);
    } else {
      this.airConditionerAPI.setSleep(State.off);
    }
    callback(null);
  }

  private sleepValue(): boolean {
    return this.airConditionerAPI.model.sleep === State.on;
  }

  handleSleepGet(callback) {
    this.log.debug('Triggered GET Sleep');

    const currentValue = this.sleepValue();

    callback(null, currentValue);
  }

  handleAutoSet(value, callback) {
    this.log.debug('Triggered SET Auto:', value);
    if (value === true) {
      this.airConditionerAPI.setSpeed(Fanspeed.auto, State.off, State.off);
    } else {
      this.airConditionerAPI.setSpeed(this.lastRotationSpeed, this.lastTurbo, this.lastMute);
    }
    this.updateRotationSpeed();
    callback(null);
  }

  private autoValue(): boolean {
    return this.airConditionerAPI.model.fanspeed === Fanspeed.auto;
  }

  handleAutoGet(callback) {
    this.log.debug('Triggered GET Auto');

    const currentValue = this.autoValue();

    callback(null, currentValue);
  }
}