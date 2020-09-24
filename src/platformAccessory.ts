import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
  
} from 'homebridge';
// import {
//   HomeKitTypes
// } from './node_modules/homebridge/lib';

// AirConditionerAPI
// AirConditioner

// import { AirConditionerAPI, AirConditioner, State, Mode, Fixation, Fanspeed } from './AirConditionerAPI';
import { AirConditionerAPI, AirConditioner, State, Mode, Fixation, Fanspeed } from 'broadlink-aircon-api';

export class AirCondionerAccessory implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly api: API;
  private readonly name: string;
  private airConditionerAPI: AirConditionerAPI;

  private readonly service: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.api = api;
    const ip: string = config['ip'] as string;
    const mac: string = config['mac'] as string;
    // console.log('ip', ip);
    // console.log('mac', mac);

    // this.Service = this.api.hap.Service;
    // this.Characteristic = this.api.hap.Characteristic;


    this.airConditionerAPI = new AirConditionerAPI(ip, mac);

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

    this.service.getCharacteristic(api.hap.Characteristic.CoolingThresholdTemperature).props.minValue = 16;
    this.service.getCharacteristic(api.hap.Characteristic.CoolingThresholdTemperature).props.maxValue = 32;
    this.service.getCharacteristic(api.hap.Characteristic.HeatingThresholdTemperature).props.minValue = 16;
    this.service.getCharacteristic(api.hap.Characteristic.HeatingThresholdTemperature).props.maxValue = 32;
    
    this.informationService = new api.hap.Service.AccessoryInformation()
      .setCharacteristic(api.hap.Characteristic.Manufacturer, 'Custom Manufacturer')
      .setCharacteristic(api.hap.Characteristic.Model, 'Custom Model');

    api.on('didFinishLaunching', () => {
      this.airConditionerAPI.connect();
    });

    setInterval(() => {
      this.airConditionerAPI.getState();
    }, 5000);

    this.airConditionerAPI.on('updateState', () => {
      // console.log('updateState');
      this.service.getCharacteristic(api.hap.Characteristic.CoolingThresholdTemperature).updateValue(this.thresholdTemperature());
      this.service.getCharacteristic(api.hap.Characteristic.HeatingThresholdTemperature).updateValue(this.thresholdTemperature());
      this.service.getCharacteristic(api.hap.Characteristic.CurrentHeaterCoolerState).updateValue(this.currentHeaterCoolerState());
      this.service.getCharacteristic(api.hap.Characteristic.TargetHeaterCoolerState).updateValue(this.targetHeaterCoolerState());
      this.service.getCharacteristic(api.hap.Characteristic.Active).updateValue(this.active());
      this.service.getCharacteristic(api.hap.Characteristic.CurrentTemperature).updateValue(this.currentTemperature());
      // this.service.getCharacteristic(api.hap.Characteristic.HeatingThresholdTemperature).value = this.thresholdTemperature();
  
    });

  }

  getServices(): Service[] {
    return [
      this.informationService,
      this.service,
    ];
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

  /**
   * Handle requests to set the "Active" characteristic
   */
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

  /**
   * Handle requests to get the current value of the "Current Heater Cooler State" characteristic
   */
  handleCurrentHeaterCoolerStateGet(callback) {
    this.log.debug('Triggered GET CurrentHeaterCoolerState');

    // set this to a valid value for CurrentHeaterCoolerState
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

  /**
   * Handle requests to get the current value of the "Target Heater Cooler State" characteristic
   */
  handleTargetHeaterCoolerStateGet(callback) {
    this.log.debug('Triggered GET TargetHeaterCoolerState');

    const currentValue = this.targetHeaterCoolerState();

    callback(null, currentValue);
  }

  /**
   * Handle requests to set the "Target Heater Cooler State" characteristic
   */
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

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  handleCurrentTemperatureGet(callback) {
    this.log.debug('Triggered GET CurrentTemperature');

    // set this to a valid value for CurrentTemperature
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

    // set this to a valid value for CurrentTemperature
    const currentValue = this.thresholdTemperature();

    callback(null, currentValue);
  }
}